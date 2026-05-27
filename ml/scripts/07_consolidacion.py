"""Fase 3 — Consolidación de anomalías robustas.

Junta señales de TODAS las fases:
- Outliers de monto (MAD score)
- Isolation Forest
- LOF (refinamiento)
- Top proveedores sospechosos (score compuesto)
- DBSCAN noise
- EFOS cruzado
- Multi-señal

Salida: un parquet con cada CONTRATO marcado por cuántos métodos lo flaggearon
y un score combinado interpretable.
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
    log("=== Fase 3 — Consolidación de anomalías robustas ===\n")
    findings: dict = {}

    # ── Cargar señales por contrato (reciente) ─────────────────────────────────
    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    log(f"Universo contratos reciente: {len(contratos):,}")

    base = contratos[["contrato_id", "institucion", "ramo", "modalidad", "monto",
                      "fecha_firma", "proveedor", "rfc_proveedor", "descripcion"]].copy()
    base["flag_monto_extremo"] = False
    base["flag_isoforest"] = False
    base["flag_lof"] = False
    base["flag_dbscan_noise"] = False
    base["flag_efos"] = False
    base["score_if"] = 0.0
    base["score_lof"] = 0.0
    base["mad_monto"] = 0.0

    # 1. Outliers extremos de monto
    montos = pd.read_parquet(OUT / "reciente_top_montos_extremos.parquet")
    base.loc[base["contrato_id"].isin(montos["contrato_id"]), "flag_monto_extremo"] = True
    base = base.merge(
        montos[["contrato_id", "mad_score_monto"]].rename(columns={"mad_score_monto": "_mad"}),
        on="contrato_id", how="left",
    )
    base["mad_monto"] = base["_mad"].fillna(0)
    base = base.drop(columns=["_mad"])

    # 2. Isolation Forest
    iso = pd.read_parquet(OUT / "reciente_top_isoforest.parquet")
    base.loc[base["contrato_id"].isin(iso["contrato_id"]), "flag_isoforest"] = True
    base = base.merge(
        iso[["contrato_id", "if_score"]].rename(columns={"if_score": "_ifs"}),
        on="contrato_id", how="left",
    )
    base["score_if"] = base["_ifs"].fillna(0)
    base = base.drop(columns=["_ifs"])

    # 3. LOF
    lof = pd.read_parquet(OUT / "reciente_top_lof.parquet")
    base.loc[base["contrato_id"].isin(lof["contrato_id"]), "flag_lof"] = True
    base = base.merge(
        lof[["contrato_id", "lof_score"]].rename(columns={"lof_score": "_lofs"}),
        on="contrato_id", how="left",
    )
    base["score_lof"] = base["_lofs"].fillna(0)
    base = base.drop(columns=["_lofs"])

    # 4. DBSCAN noise
    dbs = pd.read_parquet(OUT / "reciente_dbscan_noise.parquet")
    base.loc[base["contrato_id"].isin(dbs["contrato_id"]), "flag_dbscan_noise"] = True

    # 5. EFOS
    efos = pd.read_parquet(DATA / "sat_efos.parquet")
    efos = efos[efos["rfc"] != "XXXXXXXXXXXX"]
    efos_rfcs = set(efos["rfc"].dropna())
    base.loc[base["rfc_proveedor"].isin(efos_rfcs), "flag_efos"] = True

    # ── Score combinado ────────────────────────────────────────────────────────
    base["n_flags"] = (
        base["flag_monto_extremo"].astype(int)
        + base["flag_isoforest"].astype(int)
        + base["flag_lof"].astype(int)
        + base["flag_dbscan_noise"].astype(int)
        + base["flag_efos"].astype(int) * 2  # EFOS pesa doble (es la única señal externa supervisada)
    )

    # Score continuo — clipear scores extremos para que no dominen
    score_if_norm = base["score_if"].fillna(0).clip(0, 1.0)
    score_lof_norm = np.log1p(base["score_lof"].fillna(0).clip(lower=0, upper=100))
    mad_norm = base["mad_monto"].fillna(0).clip(-10, 10)
    base["score_combinado"] = (
        base["flag_efos"].astype(float) * 3.0
        + base["flag_monto_extremo"].astype(float) * 1.5
        + base["flag_isoforest"].astype(float) * 1.0
        + base["flag_lof"].astype(float) * 1.5
        + base["flag_dbscan_noise"].astype(float) * 0.5
        + mad_norm * 0.2
        + score_if_norm * 1.0
        + score_lof_norm * 0.3
    )

    # ── Resumen por flags ──────────────────────────────────────────────────────
    log("\n[1] Distribución de flags:")
    log(f"  monto_extremo: {base['flag_monto_extremo'].sum()}")
    log(f"  isoforest: {base['flag_isoforest'].sum()}")
    log(f"  lof: {base['flag_lof'].sum()}")
    log(f"  dbscan_noise: {base['flag_dbscan_noise'].sum()}")
    log(f"  efos: {base['flag_efos'].sum()}")
    log(f"  con AL MENOS 1 flag: {(base['n_flags']>0).sum()}")
    log(f"  con >=2 flags: {(base['n_flags']>=2).sum()}")
    log(f"  con >=3 flags: {(base['n_flags']>=3).sum()}")

    findings["distribucion_flags"] = {
        "monto_extremo": int(base["flag_monto_extremo"].sum()),
        "isoforest": int(base["flag_isoforest"].sum()),
        "lof": int(base["flag_lof"].sum()),
        "dbscan_noise": int(base["flag_dbscan_noise"].sum()),
        "efos": int(base["flag_efos"].sum()),
        "al_menos_1_flag": int((base["n_flags"] > 0).sum()),
        "al_menos_2_flags": int((base["n_flags"] >= 2).sum()),
        "al_menos_3_flags": int((base["n_flags"] >= 3).sum()),
    }

    # ── Top contratos robustos (>=2 señales) ───────────────────────────────────
    robustos = base[base["n_flags"] >= 2].sort_values("score_combinado", ascending=False)
    log(f"\n[2] Contratos robustos (>=2 señales): {len(robustos)}")
    robustos.to_parquet(OUT / "anomalias_robustas.parquet", index=False)

    # ── Top contratos finales ──────────────────────────────────────────────────
    top_100 = robustos.head(100)
    log(f"\n[3] Top contrato robusto:")
    if len(top_100):
        log(f"  {top_100.iloc[0]['proveedor']}")
        log(f"  monto: {top_100.iloc[0]['monto']:,.0f}")
        log(f"  flags: monto={top_100.iloc[0]['flag_monto_extremo']} if={top_100.iloc[0]['flag_isoforest']} lof={top_100.iloc[0]['flag_lof']} efos={top_100.iloc[0]['flag_efos']}")
        log(f"  score: {top_100.iloc[0]['score_combinado']:.2f}")
    findings["top_robustos"] = top_100.head(20)[
        ["contrato_id", "institucion", "monto", "proveedor", "rfc_proveedor", "n_flags", "score_combinado"]
    ].to_dict("records")

    # ── Score por proveedor (RFC) ──────────────────────────────────────────────
    log("\n[4] Agregado por RFC: cuántos contratos sospechosos tiene cada uno...")
    prov_score = base.groupby("rfc_proveedor").agg(
        nombre=("proveedor", "first"),
        n_contratos_total=("contrato_id", "count"),
        n_contratos_con_flag=("n_flags", lambda x: (x > 0).sum()),
        n_contratos_robustos=("n_flags", lambda x: (x >= 2).sum()),
        monto_total=("monto", "sum"),
        monto_con_flag=("monto", lambda x: x[base.loc[x.index, "n_flags"] > 0].sum()),
        flag_efos=("flag_efos", "any"),
        score_max=("score_combinado", "max"),
        score_medio=("score_combinado", "mean"),
    ).reset_index()
    prov_score["pct_contratos_con_flag"] = prov_score["n_contratos_con_flag"] / prov_score["n_contratos_total"]
    prov_score = prov_score.sort_values(["n_contratos_robustos", "monto_con_flag"], ascending=[False, False])
    prov_score.head(200).to_parquet(OUT / "anomalias_robustas_por_proveedor.parquet", index=False)

    findings["top_proveedores_robustos"] = prov_score.head(15)[
        ["rfc_proveedor", "nombre", "n_contratos_total", "n_contratos_robustos", "monto_total", "monto_con_flag", "flag_efos"]
    ].to_dict("records")

    with open(REPORTS / "07-consolidacion-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\nFase 3 completa. Output principal: anomalias_robustas.parquet")


if __name__ == "__main__":
    main()
