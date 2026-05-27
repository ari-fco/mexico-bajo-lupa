"""Profundización: análisis temporal de proveedores top.

Para los top 50 proveedores robustos (multi-señal o EFOS o alto monto):
- Serie temporal mensual de contratos
- Cambios bruscos de actividad
- Concentración por año
- Año más activo
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")


def log(msg): print(msg, flush=True)


def main():
    log("=== Profundización: series temporales de proveedores top ===\n")

    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    contratos["fecha_firma"] = pd.to_datetime(contratos["fecha_firma"])

    # Proveedores objetivo: combinar las listas
    top_robustos_prov = pd.read_parquet(OUT / "anomalias_robustas_por_proveedor.parquet")
    multi_senal = pd.read_parquet(OUT / "cruce_proveedores_multi_senal.parquet")

    target_rfcs = set(top_robustos_prov.head(30)["rfc_proveedor"].dropna()) | set(multi_senal["rfc"].dropna())
    log(f"RFCs objetivo: {len(target_rfcs)}")

    # Subset contratos
    sub = contratos[contratos["rfc_proveedor"].isin(target_rfcs)].copy()
    sub = sub.dropna(subset=["fecha_firma"])
    sub["mes"] = sub["fecha_firma"].dt.to_period("M").astype(str)
    log(f"Contratos con fecha de target proveedores: {len(sub):,}")

    # Serie mensual por proveedor
    serie = sub.groupby(["rfc_proveedor", "proveedor", "mes"]).agg(
        n_contratos=("contrato_id", "count"),
        monto=("monto", "sum"),
        instituciones=("institucion", "nunique"),
    ).reset_index()
    serie.to_parquet(OUT / "deep_series_proveedores_top.parquet", index=False)

    # Resumen por proveedor: cuándo aparecieron, cuándo picos
    resumen = []
    for rfc, grp in serie.groupby("rfc_proveedor"):
        nombre = grp["proveedor"].iloc[0]
        mes_pico_monto = grp.loc[grp["monto"].idxmax()]
        mes_pico_n = grp.loc[grp["n_contratos"].idxmax()]
        # Concentración temporal: % monto en top-3 meses
        top3_share = grp.nlargest(3, "monto")["monto"].sum() / grp["monto"].sum() if grp["monto"].sum() > 0 else 0
        resumen.append({
            "rfc": rfc, "nombre": nombre,
            "primer_mes": grp["mes"].min(),
            "ultimo_mes": grp["mes"].max(),
            "n_meses_activos": int(len(grp)),
            "mes_pico_monto": mes_pico_monto["mes"],
            "monto_pico": float(mes_pico_monto["monto"]),
            "mes_pico_n": mes_pico_n["mes"],
            "n_contratos_pico": int(mes_pico_n["n_contratos"]),
            "top3_meses_share_monto": float(top3_share),
            "monto_total_periodo": float(grp["monto"].sum()),
        })
    resumen_df = pd.DataFrame(resumen).sort_values("monto_total_periodo", ascending=False)
    resumen_df.to_parquet(OUT / "deep_resumen_temporal_proveedores.parquet", index=False)

    log(f"\nTop 5 por concentración temporal (>=80% monto en top-3 meses):")
    high_conc = resumen_df[resumen_df["top3_meses_share_monto"] >= 0.8].head(10)
    for _, r in high_conc.iterrows():
        log(f"  {r['nombre'][:50]:<50} | {r['top3_meses_share_monto']*100:.0f}% en top-3 meses | total {r['monto_total_periodo']:,.0f}")

    findings = {
        "n_proveedores_analizados": int(resumen_df.shape[0]),
        "n_alta_concentracion_temporal": int((resumen_df["top3_meses_share_monto"] >= 0.8).sum()),
        "top_concentracion": high_conc.head(10).to_dict("records"),
    }
    with open(REPORTS / "09-temporal-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\nListo.")


if __name__ == "__main__":
    main()
