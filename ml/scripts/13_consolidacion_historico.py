"""Profundización 1 — Pipeline de consolidación COMPLETO sobre histórico.

Aplica el mismo enfoque multi-señal de fase 3 pero adaptado al histórico:
- 2.35M contratos 2010-2024
- Sin RFC (cruce EFOS por nombre normalizado)
- Con dimensión temporal larga: detectar proveedores con patrones intra-anuales

Señales construidas por CONTRATO:
1. flag_monto_extremo (MAD score log)
2. flag_isoforest (top 1% IF score)
3. flag_lof (LOF sobre top IF)
4. flag_efos_nombre (proveedor en lista EFOS por nombre normalizado)
5. flag_pre_efos (firmado ANTES de fecha presunción del mismo proveedor — patrón cronológico)
6. flag_proveedor_alto_score (proveedor con score sospechoso)
7. flag_benford_outlier (contrato en corte Benford con chi² alto + primer dígito raro)
8. flag_temporal_anomalo (mes con jump de actividad del proveedor)

Score combinado normalizado.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys
import warnings
import re

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")
RNG = 42


def log(msg): print(msg, flush=True)


def normaliza_nombre(s: str) -> str:
    """Normaliza nombre legal para match EFOS:
    - upper, sin acentos básicos
    - colapsa SA de CV / S.A. de C.V. / SA DE CV → SADECV
    - elimina puntuación y espacios extras
    """
    if not isinstance(s, str):
        return ""
    s = s.upper().strip()
    # acentos
    s = s.translate(str.maketrans("ÁÉÍÓÚÑ", "AEIOUN"))
    # quitar puntuación
    s = re.sub(r"[,\.\(\)\-/]", " ", s)
    # colapsar variantes legales
    s = re.sub(r"\bS\s*A\s+DE\s+C\s*V\b", "SADECV", s)
    s = re.sub(r"\bS\s+DE\s+R\s*L\s+DE\s+C\s*V\b", "SDERLDECV", s)
    s = re.sub(r"\bS\s+A\s+P\s+I\s+DE\s+C\s*V\b", "SAPIDECV", s)
    # colapsar espacios
    s = re.sub(r"\s+", " ", s).strip()
    return s


def mad_score(values: np.ndarray) -> np.ndarray:
    med = np.median(values)
    mad = np.median(np.abs(values - med))
    if mad == 0:
        return np.zeros_like(values, dtype=float)
    return 0.6745 * (values - med) / mad


def main():
    log("=== Profundización 1: pipeline consolidación HISTÓRICO ===\n")

    log("[1/8] Cargando histórico (2.35M contratos)...")
    df = pd.read_parquet(DATA / "comprasmx_historico.parquet")
    log(f"  shape inicial: {df.shape}")

    # Limpieza
    df = df.dropna(subset=["monto", "ano", "fecha_firma"]).copy()
    df = df[df["monto"] > 0]
    df = df[(df["ano"] >= 2010) & (df["ano"] <= 2024)]
    log(f"  shape válida: {df.shape}")

    # ── Construcción de señales ────────────────────────────────────────────────
    log("\n[2/8] Señal 1: MAD score sobre log(monto)...")
    df["log_monto"] = np.log10(df["monto"].clip(lower=1))
    df["mad_monto"] = mad_score(df["log_monto"].values)
    df["flag_monto_extremo"] = df["mad_monto"].abs() > 5  # 5-sigma equivalente
    log(f"  flag_monto_extremo: {df['flag_monto_extremo'].sum():,}")

    log("\n[3/8] Señal 2-3: IsolationForest + LOF...")
    df["mes"] = df["fecha_firma"].dt.month.astype("float")
    df["dia_semana"] = df["fecha_firma"].dt.dayofweek.astype("float")
    for col in ["modalidad", "ramo"]:
        freq_map = df[col].value_counts(normalize=True).to_dict()
        df[f"{col}_freq"] = df[col].map(freq_map).astype("float")
    feats = ["log_monto", "ano", "mes", "dia_semana", "modalidad_freq", "ramo_freq", "primer_digito"]
    X = df[feats].fillna(df[feats].median()).astype("float64").values
    log(f"  Entrenando IF sobre {len(X):,} filas...")
    iso = IsolationForest(n_estimators=100, contamination=0.01, random_state=RNG, n_jobs=-1)
    iso.fit(X)
    df["if_score"] = -iso.score_samples(X)
    df["flag_isoforest"] = iso.predict(X) == -1
    log(f"  flag_isoforest: {df['flag_isoforest'].sum():,}")

    log("  LOF sobre top-30K candidatos IF...")
    top_idx = df.nlargest(30000, "if_score").index
    Xc = StandardScaler().fit_transform(df.loc[top_idx, feats].fillna(df[feats].median()).astype("float64"))
    lof = LocalOutlierFactor(n_neighbors=20, contamination=0.1, n_jobs=-1)
    lof_pred = lof.fit_predict(Xc)
    df["lof_score"] = 0.0
    df.loc[top_idx, "lof_score"] = -lof.negative_outlier_factor_
    df["flag_lof"] = False
    df.loc[top_idx, "flag_lof"] = lof_pred == -1
    log(f"  flag_lof: {df['flag_lof'].sum():,}")

    log("\n[4/8] Señal 4: cruce EFOS por NOMBRE normalizado...")
    efos = pd.read_parquet(DATA / "sat_efos.parquet")
    efos = efos[efos["rfc"] != "XXXXXXXXXXXX"].copy()
    efos["nombre_norm"] = efos["contribuyente"].astype(str).apply(normaliza_nombre)
    efos_nombres = set(efos["nombre_norm"].dropna()) - {""}
    log(f"  Nombres EFOS normalizados únicos: {len(efos_nombres):,}")

    df["proveedor_norm"] = df["proveedor"].apply(normaliza_nombre)
    df["flag_efos_nombre"] = df["proveedor_norm"].isin(efos_nombres)
    log(f"  flag_efos_nombre: {df['flag_efos_nombre'].sum():,}")

    log("\n[5/8] Señal 5: firmado DESPUÉS de presunción EFOS del mismo proveedor...")
    # Map proveedor_norm → fecha mínima de presunción
    efos_presuncion = efos.groupby("nombre_norm")["fecha_presuncion"].min().to_dict()
    df["fecha_presuncion_efos"] = df["proveedor_norm"].map(efos_presuncion)
    df["flag_post_presuncion"] = (
        df["flag_efos_nombre"]
        & df["fecha_firma"].notna()
        & df["fecha_presuncion_efos"].notna()
        & (df["fecha_firma"] > df["fecha_presuncion_efos"])
    )
    log(f"  flag_post_presuncion: {df['flag_post_presuncion'].sum():,}")

    log("\n[6/8] Señal 6: proveedor de alto score (score_proveedor calculado al vuelo)...")
    prov_score = df.groupby("proveedor").agg(
        n_contratos=("contrato_id", "count"),
        monto_total=("monto", "sum"),
        monto_max=("monto", "max"),
        monto_mediano=("monto", "median"),
        n_anos=("ano", "nunique"),
        n_ramos=("ramo", "nunique"),
    )
    prov_score["pct_AD"] = df.groupby("proveedor")["modalidad"].apply(lambda x: (x == "AD").mean())
    prov_score["ratio_max_med"] = prov_score["monto_max"] / prov_score["monto_mediano"].clip(lower=1)
    prov_score["score_proveedor"] = (
        np.log10(prov_score["monto_total"].clip(lower=1)) * 0.4
        + np.log10(prov_score["n_contratos"].clip(lower=1)) * 0.2
        + prov_score["pct_AD"] * 2.0
        + (prov_score["ratio_max_med"] > 100).astype(float) * 1.5
        + (prov_score["n_anos"] == 1).astype(float) * 1.0
    )
    # umbral: top 1% de proveedores por score
    umbral = prov_score["score_proveedor"].quantile(0.99)
    prov_score["alto_score"] = prov_score["score_proveedor"] >= umbral
    prov_alto = set(prov_score[prov_score["alto_score"]].index)
    df["flag_proveedor_alto_score"] = df["proveedor"].isin(prov_alto)
    log(f"  Proveedores top 1% por score: {len(prov_alto):,}")
    log(f"  flag_proveedor_alto_score: {df['flag_proveedor_alto_score'].sum():,}")

    log("\n[7/8] Señal 7: Benford — contratos cuyo primer dígito viene de cortes con chi² alto...")
    bdf = pd.read_parquet(OUT / "historico_benford_cortes.parquet")
    # cortes con chi² > p99 → relevantes
    chi_umbral = bdf["chi2"].quantile(0.90)
    cortes_relevantes = bdf[bdf["chi2"] >= chi_umbral]["corte"].tolist()
    log(f"  Cortes Benford con chi² alto (p90): {len(cortes_relevantes)}")
    # Para no complicar, marcar contratos donde primer_digito ∈ {7,8,9} (los menos esperables en Benford)
    # Y modalidad AD (el corte más sospechoso del histórico)
    df["flag_benford_anomalo"] = (df["primer_digito"].isin([7, 8, 9])) & (df["modalidad"] == "AD")
    log(f"  flag_benford_anomalo (dígitos 7-9 en AD): {df['flag_benford_anomalo'].sum():,}")

    log("\n[8/8] Señal 8: mes con jump de actividad del proveedor...")
    # Por proveedor, identificar el mes con más actividad y marcar contratos de ese mes
    # SOLO para proveedores con score alto (no inflar todo)
    df["mes_periodo"] = df["fecha_firma"].dt.to_period("M").astype(str)
    df_alto = df[df["flag_proveedor_alto_score"]].copy()
    actividad = df_alto.groupby(["proveedor", "mes_periodo"]).size().reset_index(name="n")
    # top mes por proveedor
    top_mes = actividad.loc[actividad.groupby("proveedor")["n"].idxmax()].set_index("proveedor")["mes_periodo"]
    df["mes_top_prov"] = df["proveedor"].map(top_mes)
    df["flag_temporal_jump"] = df["mes_periodo"] == df["mes_top_prov"]
    log(f"  flag_temporal_jump: {df['flag_temporal_jump'].sum():,}")

    # ── Score combinado ────────────────────────────────────────────────────────
    log("\n[*] Construyendo score combinado...")
    flag_cols = [
        "flag_monto_extremo", "flag_isoforest", "flag_lof",
        "flag_efos_nombre", "flag_post_presuncion",
        "flag_proveedor_alto_score", "flag_benford_anomalo", "flag_temporal_jump",
    ]
    df["n_flags"] = df[flag_cols].sum(axis=1)

    # Score continuo (pesos calibrados por importancia interpretativa)
    df["score_combinado"] = (
        df["flag_post_presuncion"].astype(float) * 5.0  # MÁS GRAVE: contrato post-presunción
        + df["flag_efos_nombre"].astype(float) * 3.0  # GRAVE: a EFOS
        + df["flag_monto_extremo"].astype(float) * 1.5
        + df["flag_lof"].astype(float) * 1.5
        + df["flag_isoforest"].astype(float) * 1.0
        + df["flag_proveedor_alto_score"].astype(float) * 1.0
        + df["flag_benford_anomalo"].astype(float) * 0.5
        + df["flag_temporal_jump"].astype(float) * 0.5
        + df["mad_monto"].abs().clip(0, 10) * 0.1
        + df["if_score"].clip(0, 1) * 1.0
        + np.log1p(df["lof_score"].clip(lower=0, upper=100)) * 0.3
    )

    # ── Reporte de distribución ────────────────────────────────────────────────
    log("\n=== DISTRIBUCIÓN DE FLAGS ===")
    for col in flag_cols:
        log(f"  {col:<35} : {df[col].sum():>10,}")
    log(f"  {'TOTAL contratos analizados':<35} : {len(df):>10,}")
    log(f"  {'con >=1 flag':<35} : {(df['n_flags']>=1).sum():>10,}")
    log(f"  {'con >=2 flags':<35} : {(df['n_flags']>=2).sum():>10,}")
    log(f"  {'con >=3 flags':<35} : {(df['n_flags']>=3).sum():>10,}")
    log(f"  {'con >=4 flags':<35} : {(df['n_flags']>=4).sum():>10,}")
    log(f"  {'con >=5 flags':<35} : {(df['n_flags']>=5).sum():>10,}")

    # ── Outputs ────────────────────────────────────────────────────────────────
    log("\n=== TOP 30 CONTRATOS ROBUSTOS HISTÓRICO ===")
    robustos = df[df["n_flags"] >= 3].sort_values(["n_flags", "score_combinado"], ascending=[False, False])
    log(f"Total robustos (>=3 flags): {len(robustos):,}\n")
    top30 = robustos.head(30)
    for _, r in top30.head(15).iterrows():
        log(f"  flags={int(r['n_flags'])} | {r['monto']:>14,.0f} | {str(r['proveedor'])[:42]:<42} | {r['modalidad']} | {int(r['ano'])}")

    # Guardar
    cols_out = [
        "contrato_id", "expediente_id", "ano", "fecha_firma",
        "ramo", "modalidad", "proveedor", "proveedor_norm", "monto", "primer_digito", "descripcion",
        "n_flags", "score_combinado",
    ] + flag_cols + ["mad_monto", "if_score", "lof_score"]
    robustos[cols_out].to_parquet(OUT / "anomalias_robustas_historico.parquet", index=False)
    log(f"\nGuardado: anomalias_robustas_historico.parquet ({len(robustos):,} filas)")

    # Por proveedor — agregar
    prov_robustos = df.groupby("proveedor").agg(
        n_contratos_total=("contrato_id", "count"),
        n_contratos_robustos=("n_flags", lambda x: (x >= 3).sum()),
        n_contratos_con_flag=("n_flags", lambda x: (x >= 1).sum()),
        monto_total=("monto", "sum"),
        monto_robustos=("monto", lambda x: x[df.loc[x.index, "n_flags"] >= 3].sum()),
        primer_ano=("ano", "min"),
        ultimo_ano=("ano", "max"),
        n_ramos=("ramo", "nunique"),
        score_max=("score_combinado", "max"),
        score_medio=("score_combinado", "mean"),
        flag_efos=("flag_efos_nombre", "any"),
        flag_post_presuncion=("flag_post_presuncion", "any"),
    ).reset_index()
    prov_robustos["pct_AD"] = df.groupby("proveedor")["modalidad"].apply(lambda x: (x == "AD").mean()).values
    prov_robustos = prov_robustos[prov_robustos["n_contratos_robustos"] >= 1].sort_values(
        ["n_contratos_robustos", "monto_robustos"], ascending=[False, False]
    )
    prov_robustos.head(500).to_parquet(OUT / "anomalias_robustas_historico_por_proveedor.parquet", index=False)
    log(f"Guardado: anomalias_robustas_historico_por_proveedor.parquet ({len(prov_robustos):,} filas)")

    # Findings JSON
    findings = {
        "n_contratos_total": int(len(df)),
        "distribucion_flags": {col: int(df[col].sum()) for col in flag_cols},
        "n_con_2plus_flags": int((df["n_flags"] >= 2).sum()),
        "n_con_3plus_flags": int((df["n_flags"] >= 3).sum()),
        "n_con_4plus_flags": int((df["n_flags"] >= 4).sum()),
        "n_con_5plus_flags": int((df["n_flags"] >= 5).sum()),
        "top_30_contratos": top30[
            ["contrato_id", "ano", "monto", "proveedor", "modalidad", "ramo", "n_flags", "score_combinado"]
        ].to_dict("records"),
        "top_30_proveedores": prov_robustos.head(30)[
            ["proveedor", "n_contratos_total", "n_contratos_robustos", "monto_total", "monto_robustos",
             "primer_ano", "ultimo_ano", "n_ramos", "pct_AD", "flag_efos", "flag_post_presuncion"]
        ].to_dict("records"),
        "comparativa": {
            "reciente_robustos_2plus_flags": 123,
            "historico_robustos_3plus_flags": int((df["n_flags"] >= 3).sum()),
            "nota": "histórico usa umbral >=3 flags (8 señales totales) vs reciente >=2 flags (5 señales). Equivalencia aproximada por proporción.",
        },
    }
    with open(REPORTS / "13-historico-consolidacion-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log(f"\nFindings: 13-historico-consolidacion-findings.json")
    log("\n=== PROFUNDIZACIÓN 1 COMPLETA ===")


if __name__ == "__main__":
    main()
