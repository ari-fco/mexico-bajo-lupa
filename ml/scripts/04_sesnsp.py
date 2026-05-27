"""Fase 2.3 — SESNSP delitos estatales (413K filas).

Series mensuales por estado × delito. Buscamos:
- Anomalías temporales: cambios bruscos mes-a-mes (z-score robusto)
- Series con varianza anómala (sub-reporte vs picos)
- Isolation Forest sobre features agregados por estado×ano×delito
"""
from __future__ import annotations

from pathlib import Path
import json
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

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


def mad_score(values: np.ndarray) -> np.ndarray:
    med = np.median(values)
    mad = np.median(np.abs(values - med))
    if mad == 0:
        return np.zeros_like(values, dtype=float)
    return 0.6745 * (values - med) / mad


def main():
    log("=== Fase 2.3 — SESNSP ===\n")
    df = pd.read_parquet(DATA / "sesnsp_estatal.parquet")
    log(f"shape: {df.shape}")
    log(f"años: {sorted(df['ano'].unique())}")

    findings: dict = {}

    # ── 1. Series mensuales agregadas por estado × tipo_delito ─────────────────
    log("\n[1] Construyendo series mensuales por estado × tipo_delito...")
    df["fecha"] = pd.to_datetime(df[["ano", "mes"]].assign(day=1).rename(columns={"ano": "year", "mes": "month"}))
    serie = df.groupby(["estado", "tipo_delito", "fecha"])["total"].sum().reset_index()
    log(f"  Series construidas: {serie.groupby(['estado', 'tipo_delito']).ngroups}")

    # ── 2. Anomalías temporales: cambios bruscos mes-a-mes ─────────────────────
    log("\n[2] Cambios bruscos mes-a-mes (z-score robusto por serie)...")
    anomalias_mensuales = []
    for (estado, delito), grp in serie.groupby(["estado", "tipo_delito"]):
        if len(grp) < 12:
            continue
        g = grp.sort_values("fecha").copy()
        g["delta"] = g["total"].diff()
        if g["delta"].dropna().std() == 0:
            continue
        g["mad_delta"] = mad_score(g["delta"].fillna(0).values)
        extremos = g[np.abs(g["mad_delta"]) > 5].copy()
        if len(extremos):
            extremos["estado"] = estado
            extremos["tipo_delito"] = delito
            anomalias_mensuales.append(extremos[["estado", "tipo_delito", "fecha", "total", "delta", "mad_delta"]])
    if anomalias_mensuales:
        anom_df = pd.concat(anomalias_mensuales, ignore_index=True)
        anom_df = anom_df.reindex(anom_df["mad_delta"].abs().sort_values(ascending=False).index)
        anom_df.to_parquet(OUT / "sesnsp_anomalias_temporales.parquet", index=False)
        log(f"  Eventos anómalos (|MAD| > 5): {len(anom_df):,}")
        findings["temporales"] = {
            "n_eventos": int(len(anom_df)),
            "top_5": anom_df.head(5).to_dict("records"),
        }
    else:
        findings["temporales"] = {"n_eventos": 0}

    # ── 3. Estados con varianza anómala ────────────────────────────────────────
    log("\n[3] Varianza por estado × tipo_delito...")
    var_estado = serie.groupby(["estado", "tipo_delito"]).agg(
        media=("total", "mean"),
        std=("total", "std"),
        cv=("total", lambda x: x.std() / max(x.mean(), 1)),
        max_val=("total", "max"),
        min_val=("total", "min"),
        n_meses=("total", "count"),
        n_meses_cero=("total", lambda x: (x == 0).sum()),
    ).reset_index()
    var_estado["pct_meses_cero"] = var_estado["n_meses_cero"] / var_estado["n_meses"]
    var_estado["ratio_max_med"] = var_estado["max_val"] / var_estado["media"].clip(lower=1)
    # Series sospechosas:
    # - cv muy alto (mucha variabilidad)
    # - alto % meses en cero (sub-reporte?)
    # - ratio_max_med extremo
    var_estado["score_anomalia"] = (
        np.log1p(var_estado["cv"].clip(lower=0)) * 1.0
        + (var_estado["pct_meses_cero"] > 0.5).astype(float) * 1.5
        + (var_estado["ratio_max_med"] > 20).astype(float) * 1.5
    )
    var_estado.sort_values("score_anomalia", ascending=False).head(200).to_parquet(
        OUT / "sesnsp_series_sospechosas.parquet", index=False
    )
    log(f"  Top serie sospechosa: {var_estado.sort_values('score_anomalia', ascending=False).iloc[0]['estado']} | {var_estado.sort_values('score_anomalia', ascending=False).iloc[0]['tipo_delito']}")
    findings["varianza"] = {
        "n_series": int(len(var_estado)),
        "top_5": var_estado.sort_values("score_anomalia", ascending=False).head(5)[
            ["estado", "tipo_delito", "cv", "pct_meses_cero", "ratio_max_med", "score_anomalia"]
        ].to_dict("records"),
    }

    # ── 4. Isolation Forest sobre features agregados estado × año ──────────────
    log("\n[4] Isolation Forest sobre agregados estado × año × bien_juridico...")
    agg = df.groupby(["estado", "ano", "bien_juridico"]).agg(
        total=("total", "sum"),
        n_tipos=("tipo_delito", "nunique"),
        media_mensual=("total", "mean"),
        std_mensual=("total", "std"),
    ).reset_index().fillna(0)
    feats = ["total", "n_tipos", "media_mensual", "std_mensual"]
    X = agg[feats].astype("float64")
    iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=RNG, n_jobs=-1)
    iso.fit(X)
    agg["if_score"] = -iso.score_samples(X)
    agg["if_anomaly"] = iso.predict(X) == -1
    n_anom = int(agg["if_anomaly"].sum())
    log(f"  Agregados anómalos: {n_anom}")
    agg.nlargest(100, "if_score").to_parquet(OUT / "sesnsp_isoforest_agregados.parquet", index=False)
    findings["isoforest"] = {
        "n_anomalias": n_anom,
        "top_5": agg.nlargest(5, "if_score")[["estado", "ano", "bien_juridico", "total", "if_score"]].to_dict("records"),
    }

    # ── 5. Cobertura por estado: ¿qué estado reporta menos? ────────────────────
    log("\n[5] Cobertura por estado (volumen total reportado)...")
    cobertura = df.groupby("estado")["total"].agg(["sum", "mean", "count"]).reset_index()
    cobertura.columns = ["estado", "total_acumulado", "media_registro", "n_registros"]
    cobertura["per_capita_proxy"] = cobertura["total_acumulado"] / cobertura["n_registros"]
    cobertura.sort_values("total_acumulado").to_parquet(OUT / "sesnsp_cobertura_estados.parquet", index=False)
    findings["cobertura"] = {
        "estado_min_volumen": cobertura.sort_values("total_acumulado").iloc[0].to_dict(),
        "estado_max_volumen": cobertura.sort_values("total_acumulado").iloc[-1].to_dict(),
    }

    with open(REPORTS / "04-sesnsp-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\n✓ Fase 2.3 completa")


if __name__ == "__main__":
    main()
