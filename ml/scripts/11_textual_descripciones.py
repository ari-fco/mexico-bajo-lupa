"""Profundización: análisis textual de descripciones de contratos.

TF-IDF + KMeans/DBSCAN sobre descripciones. Buscar:
- Descripciones idénticas o casi idénticas en distintos proveedores
- Clusters semánticos de contratos
- Descripciones anómalamente cortas o largas
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")
RNG = 42


def log(msg): print(msg, flush=True)


def main():
    log("=== Profundización: análisis textual de descripciones ===\n")
    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    log(f"contratos: {len(contratos):,}")

    desc = contratos["descripcion"].fillna("").astype(str)
    desc_clean = desc.str.upper().str.strip()

    # ── 1. Detectar duplicados exactos ─────────────────────────────────────────
    log("\n[1] Duplicados exactos de descripción...")
    dup_counts = desc_clean.value_counts()
    dups = dup_counts[dup_counts > 1].head(20)
    log(f"  Descripciones únicas: {len(dup_counts):,}")
    log(f"  Descripciones duplicadas (>1 ocurrencia): {(dup_counts > 1).sum():,}")
    log(f"\n  Top descripción repetida ({dups.iloc[0]} veces):")
    log(f"  '{dups.index[0][:120]}'")

    # ── 2. Descripciones muy cortas o muy largas ───────────────────────────────
    log("\n[2] Anomalías de longitud...")
    contratos["desc_len"] = desc_clean.str.len()
    desc_corta = contratos[contratos["desc_len"] < 20].copy()
    log(f"  Contratos con descripción <20 chars: {len(desc_corta):,}")
    if len(desc_corta):
        log(f"  Ejemplo: '{desc_corta.iloc[0]['descripcion'][:80]}' | monto {desc_corta.iloc[0]['monto']:,.0f}")
        desc_corta.sort_values("monto", ascending=False).head(50).to_parquet(OUT / "deep_descripciones_cortas.parquet", index=False)

    # ── 3. TF-IDF + KMeans sobre muestra ───────────────────────────────────────
    log("\n[3] TF-IDF + KMeans (muestra 50K para que sea tratable)...")
    sample = contratos.sample(min(50000, len(contratos)), random_state=RNG)
    desc_sample = sample["descripcion"].fillna("").astype(str).str.upper().tolist()

    vect = TfidfVectorizer(
        max_features=2000,
        ngram_range=(1, 2),
        min_df=10,
        max_df=0.5,
        stop_words=None,
    )
    X = vect.fit_transform(desc_sample)
    log(f"  TF-IDF matrix: {X.shape}")

    # Reducir dim con SVD para KMeans más rápido
    svd = TruncatedSVD(n_components=50, random_state=RNG)
    X_red = svd.fit_transform(X)
    log(f"  Varianza explicada (50 dims): {svd.explained_variance_ratio_.sum():.2%}")

    km = KMeans(n_clusters=20, random_state=RNG, n_init=10)
    sample = sample.copy()
    sample["cluster_texto"] = km.fit_predict(X_red)

    # Caracterizar clusters por términos top
    log("\n[4] Términos característicos por cluster:")
    feature_names = np.array(vect.get_feature_names_out())
    # Centroides en espacio original (aprox)
    # Mejor: usar terms por proximidad al centroide en X
    cluster_terms = {}
    for c in range(20):
        cluster_mask = sample["cluster_texto"] == c
        if cluster_mask.sum() == 0:
            continue
        sub_X = X[cluster_mask.values]
        mean_tfidf = np.asarray(sub_X.mean(axis=0)).ravel()
        top_idx = mean_tfidf.argsort()[::-1][:8]
        terms = feature_names[top_idx].tolist()
        cluster_terms[int(c)] = {
            "n": int(cluster_mask.sum()),
            "monto_total": float(sample.loc[cluster_mask, "monto"].sum()),
            "monto_medio": float(sample.loc[cluster_mask, "monto"].mean()),
            "terminos": terms,
        }
        log(f"  Cluster {c} (n={cluster_mask.sum():,}): {', '.join(terms[:5])}")

    # ── 5. Buscar descripciones idénticas en DISTINTOS proveedores ─────────────
    log("\n[5] Descripciones idénticas en proveedores distintos (copy-paste)...")
    # Para cada descripción repetida, ¿usa más de un proveedor?
    desc_prov = contratos.groupby("descripcion").agg(
        n=("contrato_id", "count"),
        n_proveedores=("rfc_proveedor", "nunique"),
        monto_total=("monto", "sum"),
        ejemplo_prov=("proveedor", "first"),
    ).reset_index()
    cross_prov = desc_prov[(desc_prov["n_proveedores"] > 3) & (desc_prov["n"] > 5)].copy()
    cross_prov = cross_prov.sort_values("monto_total", ascending=False)
    log(f"  Descripciones con >3 proveedores diferentes: {len(cross_prov):,}")
    cross_prov.head(100).to_parquet(OUT / "deep_descripciones_cross_proveedor.parquet", index=False)
    if len(cross_prov):
        log(f"  Top: '{cross_prov.iloc[0]['descripcion'][:80]}'")
        log(f"    {cross_prov.iloc[0]['n_proveedores']} proveedores | monto total {cross_prov.iloc[0]['monto_total']:,.0f}")

    findings = {
        "descripciones_unicas": int(len(dup_counts)),
        "descripciones_duplicadas": int((dup_counts > 1).sum()),
        "top_duplicada": {"texto": str(dups.index[0])[:200], "n": int(dups.iloc[0])} if len(dups) else None,
        "n_corta_lt20": int(len(desc_corta)),
        "cluster_terms": cluster_terms,
        "cross_proveedor": {
            "n": int(len(cross_prov)),
            "top_5": cross_prov.head(5).to_dict("records"),
        },
    }
    with open(REPORTS / "11-textual-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\nListo.")


if __name__ == "__main__":
    main()
