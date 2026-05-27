"""Profundización: clustering tipológico de proveedores.

KMeans + GMM sobre features de comportamiento. Descubrir tipos naturales:
- Oligopolio (pocos, mucho monto, varias instituciones)
- Captura (1 institución, alto monto, 100% AD)
- Dispersión (muchos contratos chicos, varias modalidades)
- Anomalía pura (jumps extremos)
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")
RNG = 42


def log(msg): print(msg, flush=True)


def main():
    log("=== Profundización: clustering tipológico de proveedores ===\n")

    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    log(f"contratos: {len(contratos):,}")

    # Features por RFC
    log("\n[1] Construyendo features por proveedor...")
    grp = contratos.groupby("rfc_proveedor").agg(
        nombre=("proveedor", "first"),
        n_contratos=("contrato_id", "count"),
        monto_total=("monto", "sum"),
        monto_medio=("monto", "mean"),
        monto_max=("monto", "max"),
        monto_std=("monto", "std"),
        n_instituciones=("institucion", "nunique"),
        n_ramos=("ramo", "nunique"),
        pct_AD=("modalidad", lambda x: (x == "AD").mean()),
        pct_LP=("modalidad", lambda x: (x == "LP").mean()),
    ).reset_index().fillna(0)

    # Solo proveedores con >= 5 contratos (relevantes)
    grp = grp[grp["n_contratos"] >= 5].copy()
    log(f"  proveedores con >=5 contratos: {len(grp):,}")

    grp["log_n"] = np.log1p(grp["n_contratos"])
    grp["log_monto"] = np.log1p(grp["monto_total"])
    grp["cv_monto"] = grp["monto_std"] / grp["monto_medio"].clip(lower=1)
    grp["concentracion_inst"] = 1.0 / grp["n_instituciones"].clip(lower=1)
    grp["jump_ratio"] = grp["monto_max"] / grp["monto_medio"].clip(lower=1)
    grp["log_jump"] = np.log1p(grp["jump_ratio"])

    feats = ["log_n", "log_monto", "n_instituciones", "n_ramos", "pct_AD", "concentracion_inst", "log_jump"]
    X = StandardScaler().fit_transform(grp[feats].astype("float64"))

    # ── KMeans con análisis de k ───────────────────────────────────────────────
    log("\n[2] KMeans evaluando k=3..8...")
    best_k = None
    best_score = -1
    for k in range(3, 9):
        km = KMeans(n_clusters=k, random_state=RNG, n_init=10)
        labels = km.fit_predict(X)
        sil = silhouette_score(X, labels, sample_size=10000, random_state=RNG)
        log(f"  k={k}: silhouette={sil:.3f}")
        if sil > best_score:
            best_score = sil
            best_k = k
    log(f"\n  Mejor k: {best_k} (silhouette={best_score:.3f})")

    km = KMeans(n_clusters=best_k, random_state=RNG, n_init=10).fit(X)
    grp["cluster_km"] = km.labels_

    # Caracterización de clusters
    log("\n[3] Caracterización de clusters:")
    cluster_summary = grp.groupby("cluster_km").agg(
        n=("rfc_proveedor", "count"),
        n_contratos_medio=("n_contratos", "mean"),
        monto_total_medio=("monto_total", "mean"),
        n_inst_medio=("n_instituciones", "mean"),
        pct_AD_medio=("pct_AD", "mean"),
        jump_ratio_medio=("jump_ratio", "mean"),
    ).reset_index()
    log(cluster_summary.to_string())
    cluster_summary.to_parquet(OUT / "deep_clusters_proveedores_summary.parquet", index=False)

    # ── Etiquetar clusters interpretativamente ─────────────────────────────────
    log("\n[4] Asignando etiquetas heurísticas a clusters...")
    def etiqueta(row):
        if row["n_contratos_medio"] > 200 and row["n_inst_medio"] >= 4:
            return "oligopolio"
        if row["pct_AD_medio"] > 0.9 and row["n_inst_medio"] <= 2:
            return "captura"
        if row["jump_ratio_medio"] > 10:
            return "anomalia_jumps"
        if row["n_contratos_medio"] < 20 and row["n_inst_medio"] <= 2:
            return "marginal"
        return "estandar"
    cluster_summary["etiqueta"] = cluster_summary.apply(etiqueta, axis=1)
    log(cluster_summary[["cluster_km", "n", "etiqueta"]].to_string())

    # Anexar etiqueta a cada proveedor
    label_map = cluster_summary.set_index("cluster_km")["etiqueta"].to_dict()
    grp["etiqueta_cluster"] = grp["cluster_km"].map(label_map)
    grp.to_parquet(OUT / "deep_clusters_proveedores.parquet", index=False)

    # Top de cada etiqueta
    log("\n[5] Top 3 proveedores por etiqueta:")
    findings = {"best_k": int(best_k), "silhouette": float(best_score), "clusters": cluster_summary.to_dict("records"), "ejemplos_por_etiqueta": {}}
    for etq in grp["etiqueta_cluster"].unique():
        top3 = grp[grp["etiqueta_cluster"] == etq].sort_values("monto_total", ascending=False).head(3)
        log(f"\n  === {etq} ===")
        for _, r in top3.iterrows():
            log(f"    {r['nombre'][:50]:<50} | {int(r['n_contratos']):>5} contratos | {r['monto_total']:>15,.0f} | %AD={r['pct_AD']*100:.0f}% | n_inst={int(r['n_instituciones'])}")
        findings["ejemplos_por_etiqueta"][etq] = top3[["rfc_proveedor", "nombre", "n_contratos", "monto_total", "pct_AD", "n_instituciones"]].to_dict("records")

    with open(REPORTS / "10-clusters-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\nListo.")


if __name__ == "__main__":
    main()
