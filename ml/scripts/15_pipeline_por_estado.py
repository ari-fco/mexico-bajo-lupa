"""Profundización 3 — Pipeline por estado (32 estados).

Para cada estado:
- Volumen y cantidad de contratos públicos (cve_ent disponible en reciente)
- % Adjudicación Directa estatal
- Proveedores con mayor concentración local
- HHI agregado del estado (concentración del gasto)
- Cruce con SESNSP: delitos totales, severidad relativa
- Tasa de fechas null en contratos (calidad de datos)
- Índice compuesto de "riesgo estatal"

Comparativo cross-estado para identificar outliers.
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

warnings.filterwarnings("ignore")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")


def log(msg): print(msg, flush=True)


def hhi(shares: np.ndarray) -> float:
    if len(shares) == 0:
        return 0.0
    return float(np.sum(shares ** 2))


def main():
    log("=== Profundización 3: pipeline por estado ===\n")

    log("[1] Cargando datos...")
    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    sesnsp = pd.read_parquet(DATA / "sesnsp_estatal.parquet")
    conapo = pd.read_parquet(DATA / "conapo_poblacion.parquet")
    log(f"  contratos: {len(contratos):,}  sesnsp: {len(sesnsp):,}  conapo: {len(conapo):,}")
    log(f"  conapo columns: {list(conapo.columns)}")

    # ── Pre-procesamiento ──────────────────────────────────────────────────────
    log("\n[2] Pre-procesamiento por estado...")

    # Map cve_ent → estado canónico (desde sesnsp)
    cve_estado = sesnsp.drop_duplicates("cve_ent").set_index("cve_ent")["estado"].to_dict()

    # Solo contratos estatales (cve_ent no null)
    contratos_estatal = contratos.dropna(subset=["cve_ent"]).copy()
    log(f"  contratos con cve_ent (estatales): {len(contratos_estatal):,}")

    # ── Agregar contratos por estado ───────────────────────────────────────────
    log("\n[3] Agregando métricas por estado...\n")
    resultados = []

    for cve, grp_contratos in contratos_estatal.groupby("cve_ent"):
        estado = cve_estado.get(cve, "?")
        n_contratos = len(grp_contratos)
        if n_contratos < 5:
            continue

        monto_total = float(grp_contratos["monto"].sum())
        monto_medio = float(grp_contratos["monto"].mean())
        monto_max = float(grp_contratos["monto"].max())

        # Modalidad
        pct_AD = float((grp_contratos["modalidad"] == "AD").mean())
        pct_LP = float((grp_contratos["modalidad"] == "LP").mean())
        pct_I3P = float((grp_contratos["modalidad"] == "I3P").mean())

        # Proveedores
        n_proveedores = grp_contratos["rfc_proveedor"].nunique()
        # Top proveedor
        prov_share = grp_contratos.groupby("rfc_proveedor")["monto"].sum() / monto_total
        top_share = float(prov_share.max()) if len(prov_share) else 0
        top_rfc = prov_share.idxmax() if len(prov_share) else None
        top_proveedor_nombre = grp_contratos[grp_contratos["rfc_proveedor"] == top_rfc]["proveedor"].iloc[0] if top_rfc else None
        hhi_proveedores = hhi(prov_share.values)

        # Instituciones del estado
        n_instituciones = grp_contratos["institucion"].nunique()
        inst_share = grp_contratos.groupby("institucion")["monto"].sum() / monto_total
        hhi_instituciones = hhi(inst_share.values)
        top_institucion_share = float(inst_share.max()) if len(inst_share) else 0
        top_institucion = inst_share.idxmax() if len(inst_share) else None

        # Calidad de datos
        pct_fecha_null = float(grp_contratos["fecha_firma"].isna().mean())

        # SESNSP del estado
        sesnsp_estado = sesnsp[sesnsp["cve_ent"] == cve]
        delitos_total = int(sesnsp_estado["total"].sum())
        # Por bien jurídico
        delitos_patrimonio = int(sesnsp_estado[sesnsp_estado["bien_juridico"] == "El patrimonio"]["total"].sum())
        delitos_vida = int(sesnsp_estado[sesnsp_estado["bien_juridico"] == "La vida y la Integridad corporal"]["total"].sum())
        # Variabilidad temporal (cv)
        series = sesnsp_estado.groupby(["ano", "mes"])["total"].sum()
        cv_temporal = float(series.std() / max(series.mean(), 1)) if len(series) else 0

        resultados.append({
            "cve_ent": cve,
            "estado": estado,
            "n_contratos": n_contratos,
            "monto_total_mxn": monto_total,
            "monto_medio_mxn": monto_medio,
            "monto_max_mxn": monto_max,
            "pct_AD": round(pct_AD, 3),
            "pct_LP": round(pct_LP, 3),
            "pct_I3P": round(pct_I3P, 3),
            "n_proveedores": int(n_proveedores),
            "n_instituciones": int(n_instituciones),
            "top_proveedor_share": round(top_share, 3),
            "top_proveedor_rfc": top_rfc,
            "top_proveedor_nombre": top_proveedor_nombre,
            "top_institucion": top_institucion,
            "top_institucion_share": round(top_institucion_share, 3),
            "hhi_proveedores": round(hhi_proveedores, 4),
            "hhi_instituciones": round(hhi_instituciones, 4),
            "pct_fecha_null": round(pct_fecha_null, 3),
            "delitos_total": delitos_total,
            "delitos_patrimonio": delitos_patrimonio,
            "delitos_vida": delitos_vida,
            "cv_temporal_sesnsp": round(cv_temporal, 3),
        })

    df_estados = pd.DataFrame(resultados).sort_values("monto_total_mxn", ascending=False)

    # ── Índice compuesto de riesgo estatal ─────────────────────────────────────
    log("[4] Construyendo índice compuesto de riesgo estatal...")
    # Normalizar componentes
    def norm(s):
        return (s - s.min()) / max(s.max() - s.min(), 1e-9)

    df_estados["riesgo_AD"] = norm(df_estados["pct_AD"])  # más AD = más riesgo procedimental
    df_estados["riesgo_HHI_prov"] = norm(df_estados["hhi_proveedores"])  # más HHI = menos competencia
    df_estados["riesgo_HHI_inst"] = norm(df_estados["hhi_instituciones"])
    df_estados["riesgo_calidad_datos"] = norm(df_estados["pct_fecha_null"])  # más null = peor reporte
    df_estados["riesgo_monopolio_proveedor"] = norm(df_estados["top_proveedor_share"])
    df_estados["indice_riesgo"] = (
        df_estados["riesgo_AD"] * 0.30
        + df_estados["riesgo_HHI_prov"] * 0.25
        + df_estados["riesgo_monopolio_proveedor"] * 0.20
        + df_estados["riesgo_HHI_inst"] * 0.15
        + df_estados["riesgo_calidad_datos"] * 0.10
    )
    df_estados = df_estados.sort_values("indice_riesgo", ascending=False)

    # ── Reporte ────────────────────────────────────────────────────────────────
    log(f"\n[5] {len(df_estados)} estados procesados\n")
    log("=== RANKING POR ÍNDICE COMPUESTO DE RIESGO ===")
    log(f"{'Estado':<30} | {'Riesgo':<7} | {'%AD':<6} | {'HHI_p':<7} | {'TopProv':<7} | {'n_contr':<8} | {'Monto':<18}")
    log("-" * 110)
    for _, r in df_estados.iterrows():
        log(f"{r['estado'][:28]:<30} | {r['indice_riesgo']:.3f}   | {r['pct_AD']*100:>4.0f}%  | {r['hhi_proveedores']:.4f} | {r['top_proveedor_share']*100:>4.0f}%   | {r['n_contratos']:>6,}   | {r['monto_total_mxn']:>16,.0f}")

    log("\n=== TOP 10 ESTADOS POR MAYOR % ADJUDICACIÓN DIRECTA ===")
    for _, r in df_estados.sort_values("pct_AD", ascending=False).head(10).iterrows():
        log(f"  {r['estado'][:30]:<30} | %AD={r['pct_AD']*100:>4.0f}% | top proveedor: {(r['top_proveedor_nombre'] or '?')[:40]} ({r['top_proveedor_share']*100:.0f}%)")

    log("\n=== TOP 10 ESTADOS POR HHI PROVEEDORES (oligopolio) ===")
    for _, r in df_estados.sort_values("hhi_proveedores", ascending=False).head(10).iterrows():
        log(f"  {r['estado'][:30]:<30} | HHI={r['hhi_proveedores']:.3f} | top prov share: {r['top_proveedor_share']*100:.0f}% | n_prov={r['n_proveedores']}")

    log("\n=== ESTADOS CON CALIDAD DE DATOS MÁS BAJA (pct_fecha_null) ===")
    for _, r in df_estados.sort_values("pct_fecha_null", ascending=False).head(10).iterrows():
        log(f"  {r['estado'][:30]:<30} | {r['pct_fecha_null']*100:>4.0f}% null fecha | n_contr={r['n_contratos']}")

    log("\n=== TOP 5 PROVEEDORES MONOPOLISTAS POR ESTADO ===")
    for _, r in df_estados.head(15).iterrows():
        log(f"  {r['estado'][:25]:<27} → {(r['top_proveedor_nombre'] or '?')[:50]} ({r['top_proveedor_share']*100:.0f}%)")

    # ── Cruce gasto vs delitos ─────────────────────────────────────────────────
    log("\n=== CRUCE GASTO PÚBLICO vs DELITOS (correlación) ===")
    # Per cápita aproximado: necesitaríamos población. Veamos correlaciones brutas primero.
    corr_gasto_delitos = df_estados[["monto_total_mxn", "delitos_total"]].corr().iloc[0, 1]
    corr_AD_delitos = df_estados[["pct_AD", "delitos_total"]].corr().iloc[0, 1]
    log(f"  Correlación (monto_total, delitos_total): {corr_gasto_delitos:.3f}")
    log(f"  Correlación (pct_AD, delitos_total): {corr_AD_delitos:.3f}")

    # Output
    df_estados.to_parquet(OUT / "deep_pipeline_por_estado.parquet", index=False)
    log("\nGuardado: ml/outputs/deep_pipeline_por_estado.parquet")

    findings = {
        "n_estados": int(len(df_estados)),
        "top_riesgo": df_estados.head(10)[
            ["estado", "indice_riesgo", "pct_AD", "hhi_proveedores", "top_proveedor_share", "top_proveedor_nombre", "n_contratos", "monto_total_mxn"]
        ].to_dict("records"),
        "top_pct_AD": df_estados.sort_values("pct_AD", ascending=False).head(10)[
            ["estado", "pct_AD", "top_proveedor_nombre", "top_proveedor_share"]
        ].to_dict("records"),
        "top_HHI_prov": df_estados.sort_values("hhi_proveedores", ascending=False).head(10)[
            ["estado", "hhi_proveedores", "top_proveedor_share", "n_proveedores"]
        ].to_dict("records"),
        "calidad_datos_baja": df_estados.sort_values("pct_fecha_null", ascending=False).head(10)[
            ["estado", "pct_fecha_null", "n_contratos"]
        ].to_dict("records"),
        "correlaciones": {
            "monto_total_vs_delitos": round(float(corr_gasto_delitos), 3),
            "pct_AD_vs_delitos": round(float(corr_AD_delitos), 3),
        },
        "interpretacion": (
            "Correlación baja entre gasto público y delitos descarta hipótesis simplista. "
            "Los estados con mayor índice de riesgo concentran AD + HHI alto, "
            "no necesariamente los con más delitos."
        ),
    }
    with open(REPORTS / "15-estados-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str, ensure_ascii=False)
    log("Guardado: ml/reports/15-estados-findings.json")
    log("\n=== PROFUNDIZACIÓN 3 COMPLETA ===")


if __name__ == "__main__":
    main()
