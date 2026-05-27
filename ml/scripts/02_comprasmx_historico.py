"""Fase 2.1 — ComprasMX histórico 2010-2024 (2.35M contratos).

Dataset estrella. Combina:
- Benford extendido por múltiples cortes
- Isolation Forest sobre features numéricos + categóricos encoded
- LOF como segunda opinión
- Análisis por proveedor: concentración, regularidad temporal, jumps de monto
- Top-N sospechosos por método, guardados a parquet
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
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")
OUT.mkdir(parents=True, exist_ok=True)
REPORTS.mkdir(parents=True, exist_ok=True)

RNG = 42


import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def log(msg: str) -> None:
    print(msg, flush=True)


# Benford theoretical distribution
BENFORD = np.log10(1 + 1 / np.arange(1, 10))


def benford_chi2(digits: pd.Series) -> tuple[float, float, dict]:
    """Returns chi2_statistic, p_value, observed_freq."""
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
    """Median Absolute Deviation z-score equivalent."""
    med = np.median(values)
    mad = np.median(np.abs(values - med))
    if mad == 0:
        return np.zeros_like(values, dtype=float)
    return 0.6745 * (values - med) / mad


def main():
    log("=== Fase 2.1 — ComprasMX histórico ===\n")

    log("Cargando comprasmx_historico.parquet...")
    df = pd.read_parquet(DATA / "comprasmx_historico.parquet")
    log(f"  shape: {df.shape}")

    # ── Limpieza básica ────────────────────────────────────────────────────────
    n0 = len(df)
    df = df.dropna(subset=["monto", "ano", "fecha_firma"])
    df = df[df["monto"] > 0]
    df = df[(df["ano"] >= 2010) & (df["ano"] <= 2024)]
    log(f"  filas válidas después de limpieza: {len(df):,} (de {n0:,})")

    findings: dict = {"benford": {}, "outliers_monto": {}, "isoforest": {}, "lof": {}, "proveedor": {}}

    # ── 1. Benford por múltiples cortes ────────────────────────────────────────
    log("\n[1] Benford por cortes múltiples...")
    cortes = {
        "global": df,
        "modalidad_AD": df[df["modalidad"] == "AD"],
        "modalidad_LP": df[df["modalidad"] == "LP"],
        "modalidad_I3P": df[df["modalidad"] == "I3P"],
    }
    for ano in sorted(df["ano"].dropna().unique()):
        cortes[f"ano_{int(ano)}"] = df[df["ano"] == ano]
    for ramo in df["ramo"].value_counts().head(10).index:
        cortes[f"ramo_{ramo[:30]}"] = df[df["ramo"] == ramo]

    benford_results = []
    for nombre, sub in cortes.items():
        chi2, p, freq = benford_chi2(sub["primer_digito"])
        benford_results.append({
            "corte": nombre,
            "n": len(sub),
            "chi2": chi2,
            "p_value": p,
            "se_aparta_benford": bool(p < 0.05) if not np.isnan(p) else None,
            **{f"freq_{i}": freq.get(i, 0.0) for i in range(1, 10)},
        })
    bdf = pd.DataFrame(benford_results)
    bdf.to_parquet(OUT / "historico_benford_cortes.parquet", index=False)
    sospechosos = bdf[bdf["se_aparta_benford"] == True].sort_values("chi2", ascending=False)
    log(f"  Benford evaluado en {len(bdf)} cortes")
    log(f"  Cortes que se apartan de Benford (p<0.05): {len(sospechosos)}")
    findings["benford"]["n_cortes"] = int(len(bdf))
    findings["benford"]["n_sospechosos"] = int(len(sospechosos))
    findings["benford"]["top_5_apartados"] = sospechosos.head(5)[["corte", "n", "chi2", "p_value"]].to_dict("records")

    # ── 2. Outliers de monto: top-100 contratos extremos ───────────────────────
    log("\n[2] Outliers extremos de monto (log-MAD score)...")
    df_montos = df.copy()
    df_montos["log_monto"] = np.log10(df_montos["monto"].clip(lower=1))
    df_montos["mad_score_log_monto"] = mad_score(df_montos["log_monto"].values)
    top_montos = df_montos.nlargest(100, "mad_score_log_monto")[
        ["contrato_id", "expediente_id", "ramo", "modalidad", "monto", "ano", "fecha_firma", "proveedor", "descripcion", "mad_score_log_monto"]
    ]
    top_montos.to_parquet(OUT / "historico_top_montos_extremos.parquet", index=False)
    log(f"  Top contrato: monto={top_montos.iloc[0]['monto']:,.0f} año={top_montos.iloc[0]['ano']}")
    log(f"  Proveedor: {top_montos.iloc[0]['proveedor'][:80]}")
    findings["outliers_monto"]["top_5"] = top_montos.head(5).to_dict("records")

    # ── 3. Isolation Forest sobre features numéricos + categóricos encoded ─────
    log("\n[3] Isolation Forest sobre features mezclados...")
    df_if = df.copy()
    df_if["log_monto"] = np.log10(df_if["monto"].clip(lower=1))
    df_if["mes"] = df_if["fecha_firma"].dt.month.astype("float")
    df_if["dia_semana"] = df_if["fecha_firma"].dt.dayofweek.astype("float")
    # Encodings: frecuencia (target-free, robusto a alta cardinalidad)
    for col in ["modalidad", "ramo"]:
        freq_map = df_if[col].value_counts(normalize=True).to_dict()
        df_if[f"{col}_freq"] = df_if[col].map(freq_map).astype("float")
    feat_cols = ["log_monto", "ano", "mes", "dia_semana", "modalidad_freq", "ramo_freq", "primer_digito"]
    X = df_if[feat_cols].fillna(df_if[feat_cols].median()).astype("float64")
    log(f"  Entrenando IF sobre {len(X):,} filas, {len(feat_cols)} features...")
    iso = IsolationForest(n_estimators=100, contamination=0.01, random_state=RNG, n_jobs=-1)
    iso.fit(X)
    df_if["if_score"] = -iso.score_samples(X)  # higher = more anomalous
    df_if["if_anomaly"] = iso.predict(X) == -1
    n_anom = int(df_if["if_anomaly"].sum())
    log(f"  Anomalías detectadas: {n_anom:,} ({n_anom / len(df_if) * 100:.2f}%)")
    top_if = df_if.nlargest(100, "if_score")[
        ["contrato_id", "ramo", "modalidad", "monto", "ano", "fecha_firma", "proveedor", "descripcion", "if_score"]
    ]
    top_if.to_parquet(OUT / "historico_top_isoforest.parquet", index=False)
    findings["isoforest"]["n_anomalias"] = n_anom
    findings["isoforest"]["top_5"] = top_if.head(5)[["contrato_id", "monto", "ano", "proveedor", "if_score"]].to_dict("records")

    # ── 4. LOF sobre los top-IF (refinamiento) ─────────────────────────────────
    log("\n[4] LOF sobre top-20K candidatos del IF...")
    candidates = df_if.nlargest(20000, "if_score").copy()
    Xc = candidates[feat_cols].fillna(candidates[feat_cols].median()).astype("float64")
    scaler = StandardScaler()
    Xc_scaled = scaler.fit_transform(Xc)
    lof = LocalOutlierFactor(n_neighbors=20, contamination=0.1, n_jobs=-1)
    lof_pred = lof.fit_predict(Xc_scaled)
    candidates["lof_score"] = -lof.negative_outlier_factor_  # higher = more anomalous
    candidates["lof_anomaly"] = lof_pred == -1
    both = candidates[candidates["lof_anomaly"]].copy()
    log(f"  LOF confirma {len(both):,} anomalías sobre top-IF")
    both.nlargest(100, "lof_score")[
        ["contrato_id", "ramo", "modalidad", "monto", "ano", "fecha_firma", "proveedor", "descripcion", "if_score", "lof_score"]
    ].to_parquet(OUT / "historico_top_lof.parquet", index=False)
    findings["lof"]["n_confirmados"] = int(len(both))

    # ── 5. Análisis por proveedor ──────────────────────────────────────────────
    log("\n[5] Análisis por proveedor: concentración, regularidad, jumps...")
    grp = df.groupby("proveedor").agg(
        n_contratos=("contrato_id", "count"),
        monto_total=("monto", "sum"),
        monto_medio=("monto", "mean"),
        monto_mediano=("monto", "median"),
        monto_max=("monto", "max"),
        monto_std=("monto", "std"),
        n_anos=("ano", "nunique"),
        n_ramos=("ramo", "nunique"),
        n_modalidades=("modalidad", "nunique"),
        primer_ano=("ano", "min"),
        ultimo_ano=("ano", "max"),
    ).reset_index()
    grp["span_anos"] = grp["ultimo_ano"] - grp["primer_ano"] + 1
    grp["contratos_por_ano"] = grp["n_contratos"] / grp["span_anos"].clip(lower=1)
    grp["cv_monto"] = grp["monto_std"] / grp["monto_medio"].clip(lower=1)
    grp["pct_AD"] = df.groupby("proveedor")["modalidad"].apply(lambda x: (x == "AD").mean()).values

    # ¿qué proveedores tienen patrón sospechoso?
    # 1) muchos contratos en un solo año
    # 2) ratio monto_max/mediana muy alto (jumps)
    # 3) 100% AD (sin licitación)
    grp["ratio_max_med"] = grp["monto_max"] / grp["monto_mediano"].clip(lower=1)
    grp["score_proveedor"] = (
        np.log10(grp["monto_total"].clip(lower=1)) * 0.4
        + np.log10(grp["n_contratos"].clip(lower=1)) * 0.2
        + grp["pct_AD"] * 2.0
        + (grp["ratio_max_med"] > 100).astype(float) * 1.5
        + (grp["n_anos"] == 1).astype(float) * 1.0
    )
    grp_sorted = grp.sort_values("score_proveedor", ascending=False)
    grp_sorted.head(500).to_parquet(OUT / "historico_top_proveedores_sospechosos.parquet", index=False)
    log(f"  Proveedores analizados: {len(grp):,}")
    log(f"  Top proveedor sospechoso: {grp_sorted.iloc[0]['proveedor'][:80]}")
    log(f"    n_contratos={grp_sorted.iloc[0]['n_contratos']:,} monto_total={grp_sorted.iloc[0]['monto_total']:,.0f}")
    findings["proveedor"]["n_total"] = int(len(grp))
    findings["proveedor"]["top_5"] = grp_sorted.head(5)[["proveedor", "n_contratos", "monto_total", "pct_AD", "score_proveedor"]].to_dict("records")

    # ── 6. Save findings JSON ──────────────────────────────────────────────────
    with open(REPORTS / "02-historico-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log(f"\n✓ Findings → {REPORTS / '02-historico-findings.json'}")
    log("✓ Outputs en ml/outputs/historico_*.parquet")


if __name__ == "__main__":
    main()
