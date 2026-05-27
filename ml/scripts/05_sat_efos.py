"""Fase 2.4 — SAT EFOS (14K contribuyentes).

EFOS = Empresas que Facturan Operaciones Simuladas. Lista negra del SAT.
Análisis:
- Patrones temporales de presunción/publicación
- Clustering por rachas de aparición
- Enriquecer cruce con ComprasMX (efos_cruce ya existe)
"""
from __future__ import annotations

from pathlib import Path
import json
import warnings

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")
RNG = 42


import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def log(msg): print(msg, flush=True)


def main():
    log("=== Fase 2.4 — SAT EFOS ===\n")
    efos = pd.read_parquet(DATA / "sat_efos.parquet")
    log(f"EFOS shape: {efos.shape}")

    # Excluir RFCs suprimidos por sentencia
    efos = efos[efos["rfc"] != "XXXXXXXXXXXX"].copy()
    log(f"Después de excluir suprimidos: {len(efos):,}")

    findings: dict = {}

    # ── 1. Distribución por estatus ────────────────────────────────────────────
    log("\n[1] Distribución por estatus...")
    est_dist = efos["estatus"].value_counts().to_dict()
    log(f"  {est_dist}")
    findings["estatus"] = {k: int(v) for k, v in est_dist.items()}

    # ── 2. Patrones temporales: presunción vs publicación ──────────────────────
    log("\n[2] Lag presunción → publicación...")
    efos["lag_dias"] = (efos["fecha_publicacion"] - efos["fecha_presuncion"]).dt.days
    log(f"  Lag mediano: {efos['lag_dias'].median():.0f} días")
    log(f"  Lag max: {efos['lag_dias'].max():.0f} días")
    findings["lag"] = {
        "mediano": float(efos["lag_dias"].median()),
        "p25": float(efos["lag_dias"].quantile(0.25)),
        "p75": float(efos["lag_dias"].quantile(0.75)),
        "max": float(efos["lag_dias"].max()),
        "min": float(efos["lag_dias"].min()),
    }

    # ── 3. Rachas de aparición ─────────────────────────────────────────────────
    log("\n[3] Rachas de aparición (presunciones por mes)...")
    efos["mes_presuncion"] = efos["fecha_presuncion"].dt.to_period("M")
    rachas = efos.groupby("mes_presuncion").size().reset_index(name="n_presunciones")
    rachas["mes_presuncion"] = rachas["mes_presuncion"].astype(str)
    log(f"  Meses con presunciones: {len(rachas)}")
    log(f"  Mes con MÁS presunciones: {rachas.sort_values('n_presunciones', ascending=False).iloc[0].to_dict()}")
    log(f"  Media: {rachas['n_presunciones'].mean():.1f}")
    rachas.sort_values("n_presunciones", ascending=False).to_parquet(
        OUT / "efos_rachas_mensuales.parquet", index=False
    )
    findings["rachas"] = {
        "mes_max": rachas.sort_values("n_presunciones", ascending=False).iloc[0].to_dict(),
        "n_meses": int(len(rachas)),
        "media_mensual": float(rachas["n_presunciones"].mean()),
    }

    # ── 4. Cluster por patrón de aparición (cuándo y cómo) ─────────────────────
    log("\n[4] KMeans clustering de EFOS por patrón temporal...")
    feats = efos[["lag_dias"]].copy()
    feats["ano_presuncion"] = efos["fecha_presuncion"].dt.year
    feats["estatus_definitivo"] = (efos["estatus"] == "DEFINITIVO").astype(int)
    feats["estatus_favorable"] = (efos["estatus"] == "SENTENCIA_FAVORABLE").astype(int)
    X = StandardScaler().fit_transform(feats.fillna(0).astype("float64"))
    km = KMeans(n_clusters=5, random_state=RNG, n_init=10).fit(X)
    efos["cluster"] = km.labels_
    cluster_summary = efos.groupby("cluster").agg(
        n=("rfc", "count"),
        lag_medio=("lag_dias", "mean"),
        ano_medio=("fecha_presuncion", lambda x: x.dt.year.mean()),
        pct_definitivo=("estatus", lambda x: (x == "DEFINITIVO").mean()),
        pct_favorable=("estatus", lambda x: (x == "SENTENCIA_FAVORABLE").mean()),
    ).reset_index()
    log(f"  Clusters:\n{cluster_summary.to_string()}")
    cluster_summary.to_parquet(OUT / "efos_clusters.parquet", index=False)
    efos.to_parquet(OUT / "efos_con_cluster.parquet", index=False)
    findings["clusters"] = cluster_summary.to_dict("records")

    # ── 5. Enriquecer cruce existente con ComprasMX ────────────────────────────
    log("\n[5] Cruce EFOS × ComprasMX...")
    # Hay dos posibles fuentes:
    # - data/processed/efos_cruce.parquet (ya cruzado)
    # - comprasmx_contratos con rfc_proveedor
    try:
        cruce_existente = pd.read_parquet(DATA / "efos_cruce.parquet")
        log(f"  efos_cruce existente: shape={cruce_existente.shape}")
        log(f"  columnas: {list(cruce_existente.columns)}")
        findings["cruce_existente"] = {
            "shape": list(cruce_existente.shape),
            "columnas": list(cruce_existente.columns),
        }
    except Exception as e:
        log(f"  efos_cruce no disponible: {e}")

    # Cruce directo sobre comprasmx_contratos
    log("\n[6] Cruce DIRECTO efos ∩ comprasmx_contratos (por RFC)...")
    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    efos_rfcs = set(efos["rfc"].dropna().unique())
    contratos_efos = contratos[contratos["rfc_proveedor"].isin(efos_rfcs)].copy()
    log(f"  Contratos con proveedor EFOS: {len(contratos_efos):,}")
    log(f"  Monto total a EFOS: {contratos_efos['monto'].sum():,.0f} MXN")

    # Enrich: para cada proveedor EFOS, sumar contratos
    if len(contratos_efos):
        prov_efos = contratos_efos.groupby("rfc_proveedor").agg(
            nombre=("proveedor", "first"),
            n_contratos=("contrato_id", "count"),
            monto_total=("monto", "sum"),
            monto_max=("monto", "max"),
            n_instituciones=("institucion", "nunique"),
            instituciones=("institucion", lambda x: " | ".join(x.unique()[:3])),
            pct_AD=("modalidad", lambda x: (x == "AD").mean()),
            primer_contrato=("fecha_firma", "min"),
            ultimo_contrato=("fecha_firma", "max"),
        ).reset_index()
        # Join estatus EFOS
        prov_efos = prov_efos.merge(
            efos[["rfc", "estatus", "fecha_presuncion", "fecha_publicacion"]],
            left_on="rfc_proveedor", right_on="rfc", how="left",
        )
        prov_efos = prov_efos.sort_values("monto_total", ascending=False)
        prov_efos.to_parquet(OUT / "efos_contratos_enriquecido.parquet", index=False)
        log(f"  Top EFOS con contratos: {prov_efos.iloc[0]['nombre']}")
        log(f"    monto: {prov_efos.iloc[0]['monto_total']:,.0f}")
        log(f"    estatus: {prov_efos.iloc[0]['estatus']}")
        findings["cruce_directo"] = {
            "n_contratos": int(len(contratos_efos)),
            "monto_total": float(contratos_efos["monto"].sum()),
            "n_proveedores_efos_con_contratos": int(len(prov_efos)),
            "top_10": prov_efos.head(10)[
                ["rfc_proveedor", "nombre", "estatus", "n_contratos", "monto_total"]
            ].to_dict("records"),
        }

    with open(REPORTS / "05-efos-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\n✓ Fase 2.4 completa")


if __name__ == "__main__":
    main()
