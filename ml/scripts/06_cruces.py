"""Fase 2.5 — Cruces entre datasets.

Donde la información se vuelve oro:
- Proveedores EFOS con contratos públicos → ranking gravedad
- Estados con anomalías ComprasMX Y SESNSP → correlación
- Concentración estatal: ¿hay estados que reciben más recursos federales y tienen patrones raros?
"""
from __future__ import annotations

from pathlib import Path
import json
import sys
import warnings

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")


def log(msg): print(msg, flush=True)


def main():
    log("=== Fase 2.5 — Cruces entre datasets ===\n")
    findings: dict = {}

    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    historico = pd.read_parquet(DATA / "comprasmx_historico.parquet")
    efos = pd.read_parquet(DATA / "sat_efos.parquet")
    efos = efos[efos["rfc"] != "XXXXXXXXXXXX"]
    sesnsp = pd.read_parquet(DATA / "sesnsp_estatal.parquet")

    # ── 1. EFOS × ComprasMX completo (federal + histórico) ─────────────────────
    log("[1] Cruce EFOS × TODO ComprasMX (reciente + histórico)...")
    efos_rfcs = set(efos["rfc"].dropna().unique())

    # Reciente tiene RFC; histórico NO tiene RFC pero tiene nombre
    rec_efos = contratos[contratos["rfc_proveedor"].isin(efos_rfcs)].copy()
    rec_efos["fuente"] = "reciente"
    log(f"  Contratos reciente con EFOS (por RFC): {len(rec_efos):,} | monto {rec_efos['monto'].sum():,.0f}")

    # Histórico: cruce por NOMBRE (más débil, pero útil)
    efos_nombres = set(efos["contribuyente"].dropna().str.upper().str.strip().unique())
    hist_efos = historico[historico["proveedor"].str.upper().str.strip().isin(efos_nombres)].copy()
    hist_efos["fuente"] = "historico"
    log(f"  Contratos histórico con EFOS (por nombre): {len(hist_efos):,} | monto {hist_efos['monto'].sum():,.0f}")

    cruce_all = pd.concat([
        rec_efos[["contrato_id", "ramo", "modalidad", "monto", "fecha_firma", "proveedor", "rfc_proveedor", "ano", "fuente"]],
        hist_efos.assign(rfc_proveedor=None)[["contrato_id", "ramo", "modalidad", "monto", "fecha_firma", "proveedor", "rfc_proveedor", "ano", "fuente"]],
    ], ignore_index=True)
    cruce_all = cruce_all.sort_values("monto", ascending=False)
    cruce_all.to_parquet(OUT / "cruce_efos_contratos_all.parquet", index=False)
    findings["efos_x_contratos"] = {
        "n_reciente": int(len(rec_efos)),
        "monto_reciente": float(rec_efos["monto"].sum()),
        "n_historico": int(len(hist_efos)),
        "monto_historico": float(hist_efos["monto"].sum()),
        "top_5": cruce_all.head(5).to_dict("records"),
    }

    # ── 2. ¿Antes/después de presunción? ────────────────────────────────────────
    log("\n[2] ¿Cuántos contratos a EFOS son posteriores a su presunción?")
    if len(rec_efos):
        rec_efos_dated = rec_efos.merge(
            efos[["rfc", "fecha_presuncion", "fecha_publicacion", "estatus"]],
            left_on="rfc_proveedor", right_on="rfc", how="left"
        )
        rec_efos_dated["fecha_firma_dt"] = pd.to_datetime(rec_efos_dated["fecha_firma"])
        rec_efos_dated["posterior_presuncion"] = rec_efos_dated["fecha_firma_dt"] > rec_efos_dated["fecha_presuncion"]
        post = rec_efos_dated[rec_efos_dated["posterior_presuncion"] == True]
        log(f"  Contratos firmados DESPUÉS de presunción EFOS: {len(post)} | monto {post['monto'].sum():,.0f}")
        if len(post):
            log(f"  Top: {post.sort_values('monto', ascending=False).iloc[0]['proveedor']}")
        post.to_parquet(OUT / "cruce_efos_post_presuncion.parquet", index=False)
        findings["efos_post_presuncion"] = {
            "n": int(len(post)),
            "monto_total": float(post["monto"].sum()) if len(post) else 0,
            "top_5": post.sort_values("monto", ascending=False).head(5)[
                ["proveedor", "rfc_proveedor", "monto", "fecha_firma", "fecha_presuncion", "estatus"]
            ].to_dict("records") if len(post) else [],
        }

    # ── 3. Estados: anomalía ComprasMX (gasto reciente) × SESNSP (crimen) ───────
    log("\n[3] Cruce estados: gasto federal × delitos...")
    # comprasmx_contratos tiene cve_ent (estados), pero 94% null
    # Mejor: contratos por estado en el dataset reciente (donde cve_ent existe)
    gasto_estatal = contratos.dropna(subset=["cve_ent"]).groupby("cve_ent").agg(
        n_contratos=("contrato_id", "count"),
        monto_total=("monto", "sum"),
        pct_AD=("modalidad", lambda x: (x == "AD").mean()),
    ).reset_index()
    delitos_estatal = sesnsp.groupby("cve_ent")["total"].sum().reset_index()
    delitos_estatal.columns = ["cve_ent", "delitos_total"]
    merge_estatal = gasto_estatal.merge(delitos_estatal, on="cve_ent", how="outer")
    # Hay un mapeo cve_ent → estado; lo recuperamos de sesnsp
    cve_to_estado = sesnsp.drop_duplicates("cve_ent").set_index("cve_ent")["estado"].to_dict()
    merge_estatal["estado"] = merge_estatal["cve_ent"].map(cve_to_estado)
    merge_estatal.to_parquet(OUT / "cruce_estados_gasto_delitos.parquet", index=False)
    findings["estados_gasto_delitos"] = {
        "n_estados_con_gasto": int(gasto_estatal["cve_ent"].nunique()),
        "n_estados_con_delitos": int(delitos_estatal["cve_ent"].nunique()),
    }

    # ── 4. Top dependencias por riesgo combinado ───────────────────────────────
    log("\n[4] Top dependencias con patrones de riesgo combinados...")
    # Para cada institución: gasto total, % AD, n proveedores, anomalías IF si las hay
    # Usamos los anomalías IF guardadas
    iso_reciente = pd.read_parquet(OUT / "reciente_top_isoforest.parquet")
    inst_riesgo = contratos.groupby("institucion").agg(
        n_contratos=("contrato_id", "count"),
        monto_total=("monto", "sum"),
        pct_AD=("modalidad", lambda x: (x == "AD").mean()),
        n_proveedores=("rfc_proveedor", "nunique"),
        concentracion=("rfc_proveedor", lambda x: x.value_counts().iloc[0] / len(x) if len(x) else 0),
    ).reset_index()
    inst_riesgo["score_concentracion"] = inst_riesgo["concentracion"]
    # Cuántas anomalías IF caen en cada institución
    anom_per_inst = iso_reciente.groupby("institucion").size().reset_index(name="n_anomalias_if")
    inst_riesgo = inst_riesgo.merge(anom_per_inst, on="institucion", how="left").fillna(0)
    inst_riesgo["score_riesgo"] = (
        np.log10(inst_riesgo["monto_total"].clip(lower=1)) * 0.3
        + inst_riesgo["pct_AD"] * 2.0
        + inst_riesgo["concentracion"] * 2.0
        + np.log10(inst_riesgo["n_anomalias_if"].clip(lower=0) + 1) * 1.0
    )
    inst_riesgo_sorted = inst_riesgo.sort_values("score_riesgo", ascending=False)
    inst_riesgo_sorted.head(50).to_parquet(OUT / "cruce_dependencias_riesgo.parquet", index=False)
    log(f"  Top dependencia riesgo: {inst_riesgo_sorted.iloc[0]['institucion']}")
    findings["dependencias_riesgo"] = {
        "n_total": int(len(inst_riesgo)),
        "top_10": inst_riesgo_sorted.head(10)[
            ["institucion", "n_contratos", "monto_total", "pct_AD", "concentracion", "n_anomalias_if", "score_riesgo"]
        ].to_dict("records"),
    }

    # ── 5. Proveedores en MÚLTIPLES señales: IF + alto score proveedor + EFOS ──
    log("\n[5] Proveedores marcados por MÚLTIPLES señales...")
    top_iso = pd.read_parquet(OUT / "reciente_top_isoforest.parquet")
    top_prov = pd.read_parquet(OUT / "reciente_top_proveedores_sospechosos.parquet")
    # Set de RFCs en cada señal
    rfc_isoforest = set(top_iso["rfc_proveedor"].dropna().unique())
    rfc_top_prov = set(top_prov["rfc_proveedor"].dropna().unique())
    rfc_efos = efos_rfcs

    # Tabla de cruces
    rfc_all = rfc_isoforest | rfc_top_prov | rfc_efos
    cruces = []
    for rfc in rfc_all:
        signals = []
        if rfc in rfc_isoforest: signals.append("isoforest")
        if rfc in rfc_top_prov: signals.append("top_proveedor")
        if rfc in rfc_efos: signals.append("efos")
        if len(signals) >= 2:
            cruces.append({"rfc": rfc, "n_señales": len(signals), "señales": "|".join(signals)})
    crosses_df = pd.DataFrame(cruces).sort_values("n_señales", ascending=False) if cruces else pd.DataFrame()
    log(f"  Proveedores en >=2 señales: {len(crosses_df)}")
    if len(crosses_df):
        # Enriquecer con info
        info = contratos.groupby("rfc_proveedor").agg(
            nombre=("proveedor", "first"),
            n_contratos=("contrato_id", "count"),
            monto_total=("monto", "sum"),
        ).reset_index()
        crosses_df = crosses_df.merge(info, left_on="rfc", right_on="rfc_proveedor", how="left")
        crosses_df.sort_values(["n_señales", "monto_total"], ascending=[False, False]).head(100).to_parquet(
            OUT / "cruce_proveedores_multi_senal.parquet", index=False
        )
        findings["multi_senal"] = {
            "n_total": int(len(crosses_df)),
            "top_10": crosses_df.head(10).to_dict("records"),
        }

    with open(REPORTS / "06-cruces-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\nFase 2.5 completa.")


if __name__ == "__main__":
    main()
