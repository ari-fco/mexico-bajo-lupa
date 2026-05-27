"""Fase 2.2 — ComprasMX reciente 2024-2025 (235K contratos).

Más rico que el histórico: tiene RFC e institución pobladas. Permite análisis
por proveedor identificable y por institución.
"""
from __future__ import annotations

from pathlib import Path
import json
import warnings

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.cluster import DBSCAN
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


def log(msg: str):
    print(msg, flush=True)


BENFORD = np.log10(1 + 1 / np.arange(1, 10))


def benford_chi2(digits: pd.Series) -> tuple[float, float, dict]:
    d = digits.dropna().astype(int)
    d = d[(d >= 1) & (d <= 9)]
    if len(d) < 100:
        return float("nan"), float("nan"), {}
    obs = d.value_counts().reindex(range(1, 10), fill_value=0).sort_index()
    expected = BENFORD * len(d)
    chi2 = ((obs.values - expected) ** 2 / expected).sum()
    p = 1 - stats.chi2.cdf(chi2, df=8)
    freq = {int(k): float(v / len(d)) for k, v in obs.items()}
    return float(chi2), float(p), freq


def mad_score(values: np.ndarray) -> np.ndarray:
    med = np.median(values)
    mad = np.median(np.abs(values - med))
    if mad == 0:
        return np.zeros_like(values, dtype=float)
    return 0.6745 * (values - med) / mad


def main():
    log("=== Fase 2.2 — ComprasMX reciente ===\n")
    df = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    log(f"shape: {df.shape}")

    n0 = len(df)
    df = df[df["monto"] > 0].dropna(subset=["monto"])
    log(f"filas válidas (monto>0): {len(df):,} (de {n0:,})")

    findings: dict = {}

    # ── 1. Benford por institución y por modalidad ─────────────────────────────
    log("\n[1] Benford por institución (top-30 por volumen) y modalidad...")
    benford_results = []
    cortes = {"global": df}
    for mod in df["modalidad"].unique():
        cortes[f"modalidad_{mod}"] = df[df["modalidad"] == mod]
    top_inst = df["institucion"].value_counts().head(30).index
    for inst in top_inst:
        cortes[f"institucion_{inst[:40]}"] = df[df["institucion"] == inst]
    for nombre, sub in cortes.items():
        chi2, p, freq = benford_chi2(sub["primer_digito"])
        benford_results.append({
            "corte": nombre, "n": len(sub), "chi2": chi2, "p_value": p,
            "se_aparta_benford": bool(p < 0.05) if not np.isnan(p) else None,
            **{f"freq_{i}": freq.get(i, 0.0) for i in range(1, 10)},
        })
    bdf = pd.DataFrame(benford_results)
    bdf.to_parquet(OUT / "reciente_benford_cortes.parquet", index=False)
    sosp = bdf[bdf["se_aparta_benford"] == True].sort_values("chi2", ascending=False)
    log(f"  Cortes Benford apartados: {len(sosp)} de {len(bdf)}")
    findings["benford"] = {
        "n_cortes": int(len(bdf)),
        "n_sospechosos": int(len(sosp)),
        "top_5": sosp.head(5)[["corte", "n", "chi2", "p_value"]].to_dict("records"),
    }

    # ── 2. Outliers extremos de monto ──────────────────────────────────────────
    log("\n[2] Outliers de monto (log-MAD)...")
    df["log_monto"] = np.log10(df["monto"].clip(lower=1))
    df["mad_score_monto"] = mad_score(df["log_monto"].values)
    top_montos = df.nlargest(100, "mad_score_monto")[
        ["contrato_id", "institucion", "ramo", "modalidad", "monto", "proveedor", "rfc_proveedor", "descripcion", "mad_score_monto"]
    ]
    top_montos.to_parquet(OUT / "reciente_top_montos_extremos.parquet", index=False)
    findings["outliers_monto"] = {"top_5": top_montos.head(5).to_dict("records")}

    # ── 3. Isolation Forest ────────────────────────────────────────────────────
    log("\n[3] Isolation Forest...")
    df_if = df.copy()
    for col in ["modalidad", "ramo", "institucion"]:
        fm = df_if[col].value_counts(normalize=True).to_dict()
        df_if[f"{col}_freq"] = df_if[col].map(fm).astype("float")
    df_if["mes"] = pd.to_datetime(df_if["fecha_firma"]).dt.month.astype("float")
    df_if["dia_semana"] = pd.to_datetime(df_if["fecha_firma"]).dt.dayofweek.astype("float")
    df_if["tiene_fecha"] = df_if["fecha_firma"].notna().astype("float")
    feat_cols = ["log_monto", "modalidad_freq", "ramo_freq", "institucion_freq", "mes", "dia_semana", "tiene_fecha", "primer_digito"]
    X = df_if[feat_cols].fillna(df_if[feat_cols].median()).astype("float64")
    iso = IsolationForest(n_estimators=150, contamination=0.01, random_state=RNG, n_jobs=-1)
    iso.fit(X)
    df_if["if_score"] = -iso.score_samples(X)
    df_if["if_anomaly"] = iso.predict(X) == -1
    n_anom = int(df_if["if_anomaly"].sum())
    log(f"  Anomalías IF: {n_anom:,}")
    top_if = df_if.nlargest(200, "if_score")[
        ["contrato_id", "institucion", "ramo", "modalidad", "monto", "fecha_firma", "proveedor", "rfc_proveedor", "descripcion", "if_score"]
    ]
    top_if.to_parquet(OUT / "reciente_top_isoforest.parquet", index=False)
    findings["isoforest"] = {"n_anomalias": n_anom, "top_5": top_if.head(5)[["contrato_id", "monto", "proveedor", "if_score"]].to_dict("records")}

    # ── 4. LOF sobre top-IF ────────────────────────────────────────────────────
    log("\n[4] LOF sobre top-10K del IF...")
    candidates = df_if.nlargest(10000, "if_score").copy()
    Xc = StandardScaler().fit_transform(
        candidates[feat_cols].fillna(candidates[feat_cols].median()).astype("float64")
    )
    lof = LocalOutlierFactor(n_neighbors=20, contamination=0.1, n_jobs=-1)
    lof_pred = lof.fit_predict(Xc)
    candidates["lof_score"] = -lof.negative_outlier_factor_
    candidates["lof_anomaly"] = lof_pred == -1
    confirmed = candidates[candidates["lof_anomaly"]].nlargest(200, "lof_score")
    confirmed.to_parquet(OUT / "reciente_top_lof.parquet", index=False)
    log(f"  LOF confirma {len(confirmed):,}")
    findings["lof"] = {"n_confirmados": int(len(confirmed))}

    # ── 5. Análisis por proveedor (RFC) ────────────────────────────────────────
    log("\n[5] Análisis por RFC proveedor...")
    grp = df.groupby("rfc_proveedor").agg(
        nombre=("proveedor", "first"),
        n_contratos=("contrato_id", "count"),
        n_expedientes=("expediente_id", "nunique"),
        monto_total=("monto", "sum"),
        monto_medio=("monto", "mean"),
        monto_mediano=("monto", "median"),
        monto_max=("monto", "max"),
        monto_std=("monto", "std"),
        n_instituciones=("institucion", "nunique"),
        n_ramos=("ramo", "nunique"),
        n_modalidades=("modalidad", "nunique"),
    ).reset_index()
    grp["pct_AD"] = df.groupby("rfc_proveedor")["modalidad"].apply(lambda x: (x == "AD").mean()).values
    grp["ratio_max_med"] = grp["monto_max"] / grp["monto_mediano"].clip(lower=1)
    grp["concentracion_inst"] = 1.0 / grp["n_instituciones"].clip(lower=1)  # 1.0 = solo 1 institución
    grp["score_proveedor"] = (
        np.log10(grp["monto_total"].clip(lower=1)) * 0.4
        + np.log10(grp["n_contratos"].clip(lower=1)) * 0.2
        + grp["pct_AD"] * 2.0
        + (grp["ratio_max_med"] > 50).astype(float) * 1.5
        + grp["concentracion_inst"] * 1.0
    )
    grp_sorted = grp.sort_values("score_proveedor", ascending=False)
    grp_sorted.head(500).to_parquet(OUT / "reciente_top_proveedores_sospechosos.parquet", index=False)
    log(f"  Proveedores: {len(grp):,}")
    findings["proveedor"] = {
        "n_total": int(len(grp)),
        "top_5": grp_sorted.head(5)[["rfc_proveedor", "nombre", "n_contratos", "monto_total", "pct_AD", "score_proveedor"]].to_dict("records"),
    }

    # ── 6. DBSCAN para descubrir clusters anómalos ─────────────────────────────
    log("\n[6] DBSCAN sobre muestra de 50K (tarda)...")
    sample = df_if.sample(min(50000, len(df_if)), random_state=RNG)
    Xs = StandardScaler().fit_transform(
        sample[feat_cols].fillna(sample[feat_cols].median()).astype("float64")
    )
    dbs = DBSCAN(eps=0.5, min_samples=10, n_jobs=-1).fit(Xs)
    sample["cluster"] = dbs.labels_
    n_noise = int((dbs.labels_ == -1).sum())
    n_clusters = int(len(set(dbs.labels_)) - (1 if -1 in dbs.labels_ else 0))
    log(f"  DBSCAN: {n_clusters} clusters, {n_noise} puntos noise ({n_noise/len(sample)*100:.1f}%)")
    sample[sample["cluster"] == -1][
        ["contrato_id", "institucion", "ramo", "modalidad", "monto", "proveedor", "if_score"]
    ].to_parquet(OUT / "reciente_dbscan_noise.parquet", index=False)
    findings["dbscan"] = {"n_clusters": n_clusters, "n_noise": n_noise, "pct_noise": round(n_noise/len(sample)*100, 2)}

    with open(REPORTS / "03-reciente-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\n✓ Fase 2.2 completa")


if __name__ == "__main__":
    main()
