"""Profundización 5 — Proveedores huérfanos (one-shot wonders).

El patrón clásico de empresas fachada:
- Aparecen UNA sola vez
- Cobran (a veces mucho)
- Desaparecen

Análisis:
1. Cuantificar one-shots en histórico (1 contrato total) y "near-one-shot" (≤2 contratos)
2. Distribución de monto: ¿hay one-shots millonarios?
3. ¿Se concentran en alguna dependencia, año, sexenio?
4. Cruzar con EFOS — ¿qué % de one-shots terminó en lista negra?
5. Comparativa con persistentes
6. Top dependencias receptoras de one-shots
"""
from __future__ import annotations

from pathlib import Path
import json
import sys
import warnings
import re

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

warnings.filterwarnings("ignore")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")


def log(msg): print(msg, flush=True)


def normaliza_nombre(s: str) -> str:
    if not isinstance(s, str):
        return ""
    s = s.upper().strip()
    s = s.translate(str.maketrans("ÁÉÍÓÚÑ", "AEIOUN"))
    s = re.sub(r"[,\.\(\)\-/]", " ", s)
    s = re.sub(r"\bS\s*A\s+DE\s+C\s*V\b", "SADECV", s)
    s = re.sub(r"\bS\s+DE\s+R\s*L\s+DE\s+C\s*V\b", "SDERLDECV", s)
    s = re.sub(r"\bS\s+A\s+P\s+I\s+DE\s+C\s*V\b", "SAPIDECV", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def sexenio_de_ano(ano: int) -> str:
    if ano <= 2012: return "Calderón"
    if ano <= 2018: return "EPN"
    if ano <= 2024: return "AMLO"
    return "Sheinbaum"


def main():
    log("=== Profundización 5: huérfanos one-shot ===\n")

    log("[1] Cargando histórico + EFOS...")
    df = pd.read_parquet(DATA / "comprasmx_historico.parquet")
    df = df.dropna(subset=["monto", "ano", "proveedor"]).copy()
    df = df[df["monto"] > 0]
    df = df[(df["ano"] >= 2010) & (df["ano"] <= 2024)]
    df["ano"] = df["ano"].astype(int)
    df["sexenio"] = df["ano"].apply(sexenio_de_ano)
    df["proveedor_norm"] = df["proveedor"].apply(normaliza_nombre)

    efos = pd.read_parquet(DATA / "sat_efos.parquet")
    efos = efos[efos["rfc"] != "XXXXXXXXXXXX"]
    efos["nombre_norm"] = efos["contribuyente"].apply(normaliza_nombre)
    efos_nombres = set(efos["nombre_norm"].dropna()) - {""}
    log(f"  contratos válidos: {len(df):,}")
    log(f"  proveedores únicos: {df['proveedor_norm'].nunique():,}")
    log(f"  EFOS nombres normalizados: {len(efos_nombres):,}")

    # ── Counts por proveedor ───────────────────────────────────────────────────
    log("\n[2] Conteo por proveedor (proveedor_norm como identidad)...")
    counts = df.groupby("proveedor_norm").agg(
        n_contratos=("contrato_id", "count"),
        proveedor_orig=("proveedor", "first"),
        monto_total=("monto", "sum"),
        monto_unico=("monto", "max"),
        ano_unico=("ano", "first"),
        sexenio_unico=("sexenio", "first"),
        ramo_unico=("ramo", "first"),
        modalidad_unico=("modalidad", "first"),
        descripcion_unico=("descripcion", "first"),
    ).reset_index()

    # ── One-shots vs persistentes ──────────────────────────────────────────────
    log("\n[3] Clasificación...")
    one_shots = counts[counts["n_contratos"] == 1].copy()
    near_one_shots = counts[counts["n_contratos"] == 2].copy()
    log(f"  One-shots (1 contrato): {len(one_shots):,} ({len(one_shots)/len(counts)*100:.1f}% de proveedores)")
    log(f"  Near-one-shots (2 contratos): {len(near_one_shots):,}")
    log(f"  Monto agregado de one-shots: {one_shots['monto_total'].sum():,.0f} MXN")
    log(f"  Como % del gasto total: {one_shots['monto_total'].sum() / df['monto'].sum() * 100:.2f}%")

    # ── Distribución de monto de one-shots ─────────────────────────────────────
    log("\n[4] Distribución de monto de one-shots:")
    log(f"  min: {one_shots['monto_unico'].min():,.0f}")
    log(f"  p25: {one_shots['monto_unico'].quantile(0.25):,.0f}")
    log(f"  median: {one_shots['monto_unico'].median():,.0f}")
    log(f"  mean: {one_shots['monto_unico'].mean():,.0f}")
    log(f"  p75: {one_shots['monto_unico'].quantile(0.75):,.0f}")
    log(f"  p95: {one_shots['monto_unico'].quantile(0.95):,.0f}")
    log(f"  p99: {one_shots['monto_unico'].quantile(0.99):,.0f}")
    log(f"  max: {one_shots['monto_unico'].max():,.0f}")
    log(f"\n  One-shots con monto > 100M MXN: {(one_shots['monto_unico'] > 100_000_000).sum():,}")
    log(f"  One-shots con monto > 500M MXN: {(one_shots['monto_unico'] > 500_000_000).sum():,}")
    log(f"  One-shots con monto > 1,000M MXN: {(one_shots['monto_unico'] > 1_000_000_000).sum():,}")

    # ── Top one-shots millonarios ──────────────────────────────────────────────
    log("\n[5] TOP 20 ONE-SHOTS MILLONARIOS:")
    top_one_shots = one_shots.sort_values("monto_unico", ascending=False).head(20)
    for _, r in top_one_shots.iterrows():
        log(f"  {r['monto_unico']:>14,.0f} | {r['ano_unico']} ({r['sexenio_unico']}) | {r['modalidad_unico']:<4} | {r['proveedor_orig'][:55]}")
        log(f"                     ramo: {r['ramo_unico'][:50]}")
        log(f"                     desc: {r['descripcion_unico'][:100]}")
        log("")

    # ── Por sexenio ────────────────────────────────────────────────────────────
    log("\n[6] One-shots por sexenio:")
    por_sex = one_shots.groupby("sexenio_unico").agg(
        n=("proveedor_norm", "count"),
        monto=("monto_unico", "sum"),
        monto_medio=("monto_unico", "mean"),
    ).reset_index()
    for _, r in por_sex.iterrows():
        log(f"  {r['sexenio_unico']:<12} | {r['n']:>7,} one-shots | {r['monto']:>16,.0f} | medio {r['monto_medio']:>10,.0f}")

    # ── Por año ────────────────────────────────────────────────────────────────
    log("\n[7] One-shots por año:")
    por_ano = one_shots.groupby("ano_unico").agg(
        n=("proveedor_norm", "count"),
        monto=("monto_unico", "sum"),
        monto_medio=("monto_unico", "mean"),
        monto_max=("monto_unico", "max"),
    ).reset_index().sort_values("ano_unico")
    log(f"  Año  | n_oneshots | monto              | monto medio    | monto max")
    log(f"  -----|------------|--------------------|----------------|-----------")
    for _, r in por_ano.iterrows():
        log(f"  {int(r['ano_unico'])} |  {r['n']:>8,}   | {r['monto']:>16,.0f}   | {r['monto_medio']:>12,.0f}   | {r['monto_max']:>12,.0f}")

    # ── Por modalidad ──────────────────────────────────────────────────────────
    log("\n[8] One-shots por modalidad:")
    por_mod = one_shots.groupby("modalidad_unico").agg(
        n=("proveedor_norm", "count"),
        monto=("monto_unico", "sum"),
    ).reset_index().sort_values("n", ascending=False)
    for _, r in por_mod.iterrows():
        pct_n = r["n"] / len(one_shots) * 100
        log(f"  {r['modalidad_unico']:<6} | {r['n']:>7,} ({pct_n:>4.1f}%) | monto {r['monto']:>16,.0f}")

    # ── Por ramo ───────────────────────────────────────────────────────────────
    log("\n[9] TOP 10 ramos receptores de one-shots:")
    por_ramo = one_shots.groupby("ramo_unico").agg(
        n=("proveedor_norm", "count"),
        monto=("monto_unico", "sum"),
        monto_medio=("monto_unico", "mean"),
    ).reset_index().sort_values("monto", ascending=False)
    for _, r in por_ramo.head(10).iterrows():
        log(f"  {r['ramo_unico'][:40]:<40} | {r['n']:>6,} one-shots | {r['monto']:>14,.0f} | medio {r['monto_medio']:>10,.0f}")

    # ── Cruce EFOS ─────────────────────────────────────────────────────────────
    log("\n[10] Cruce ONE-SHOTS × EFOS...")
    one_shots["es_efos"] = one_shots["proveedor_norm"].isin(efos_nombres)
    n_efos_oneshot = one_shots["es_efos"].sum()
    log(f"  One-shots que SON EFOS: {n_efos_oneshot:,} ({n_efos_oneshot/len(one_shots)*100:.2f}%)")

    persistentes = counts[counts["n_contratos"] >= 10].copy()
    persistentes["es_efos"] = persistentes["proveedor_norm"].isin(efos_nombres)
    log(f"  Persistentes que SON EFOS: {persistentes['es_efos'].sum():,} ({persistentes['es_efos'].sum()/len(persistentes)*100:.2f}%)")
    log(f"\n  -> Tasa de EFOS en one-shots vs persistentes:")
    tasa_oneshot = n_efos_oneshot / len(one_shots)
    tasa_pers = persistentes['es_efos'].sum() / len(persistentes)
    log(f"     one-shots: {tasa_oneshot*100:.3f}% | persistentes: {tasa_pers*100:.3f}%")
    log(f"     ratio: {tasa_oneshot/max(tasa_pers, 1e-9):.2f}x más probable EFOS en one-shots")

    # Top one-shots EFOS
    oneshots_efos = one_shots[one_shots["es_efos"]].sort_values("monto_unico", ascending=False)
    log(f"\n  Top 10 ONE-SHOTS que son EFOS:")
    for _, r in oneshots_efos.head(10).iterrows():
        log(f"    {r['monto_unico']:>14,.0f} | {int(r['ano_unico'])} | {r['proveedor_orig'][:55]}")

    # ── Comparativa con cluster "marginal" del análisis previo ────────────────
    log("\n[11] Comparativa con cluster 'marginal' del análisis tipológico previo...")
    try:
        cluster_prov = pd.read_parquet(OUT / "deep_clusters_proveedores.parquet")
        marginal = cluster_prov[cluster_prov["etiqueta_cluster"] == "marginal"]
        log(f"  Cluster 'marginal' (proveedores con >=5 contratos pero baja diversidad): {len(marginal):,}")
        log(f"  Monto total cluster marginal: {marginal['monto_total'].sum():,.0f} MXN")
        log(f"  Monto total one-shots histórico: {one_shots['monto_total'].sum():,.0f} MXN")
        log(f"  -> Los one-shots son ~{one_shots['monto_total'].sum()/marginal['monto_total'].sum():.1f}x más grandes en monto agregado")
    except Exception as e:
        log(f"  (no se pudo cargar deep_clusters_proveedores: {e})")

    # ── Output ─────────────────────────────────────────────────────────────────
    log("\n[12] Guardando outputs...")
    one_shots_save = one_shots.rename(columns={"proveedor_orig": "proveedor"})
    one_shots_save.to_parquet(OUT / "deep_huerfanos_oneshots.parquet", index=False)

    findings = {
        "n_proveedores_total": int(len(counts)),
        "n_one_shots": int(len(one_shots)),
        "pct_one_shots": round(len(one_shots) / len(counts) * 100, 2),
        "monto_agregado_one_shots_mxn": float(one_shots["monto_total"].sum()),
        "pct_gasto_total": round(one_shots["monto_total"].sum() / df["monto"].sum() * 100, 2),
        "distribucion_monto": {
            "median": float(one_shots["monto_unico"].median()),
            "p95": float(one_shots["monto_unico"].quantile(0.95)),
            "p99": float(one_shots["monto_unico"].quantile(0.99)),
            "max": float(one_shots["monto_unico"].max()),
        },
        "one_shots_grandes": {
            ">100M": int((one_shots["monto_unico"] > 100_000_000).sum()),
            ">500M": int((one_shots["monto_unico"] > 500_000_000).sum()),
            ">1000M": int((one_shots["monto_unico"] > 1_000_000_000).sum()),
        },
        "top_20_oneshots": top_one_shots[
            ["proveedor_orig", "ano_unico", "sexenio_unico", "modalidad_unico", "ramo_unico", "monto_unico", "descripcion_unico"]
        ].to_dict("records"),
        "por_sexenio": por_sex.to_dict("records"),
        "por_modalidad": por_mod.to_dict("records"),
        "por_ramo_top": por_ramo.head(10).to_dict("records"),
        "cruce_efos": {
            "n_oneshots_que_son_efos": int(n_efos_oneshot),
            "pct_oneshots_efos": round(float(tasa_oneshot * 100), 3),
            "pct_persistentes_efos": round(float(tasa_pers * 100), 3),
            "ratio_oneshot_vs_persistente": round(float(tasa_oneshot/max(tasa_pers, 1e-9)), 2),
            "top_10_oneshots_efos": oneshots_efos.head(10)[
                ["proveedor_orig", "ano_unico", "monto_unico"]
            ].to_dict("records"),
        },
    }
    with open(REPORTS / "17-huerfanos-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str, ensure_ascii=False)
    log("Guardado: ml/reports/17-huerfanos-findings.json")
    log("Guardado: ml/outputs/deep_huerfanos_oneshots.parquet")
    log("\n=== PROFUNDIZACIÓN 5 COMPLETA ===")


if __name__ == "__main__":
    main()
