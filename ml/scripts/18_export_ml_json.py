"""Exporta los hallazgos ML a JSON para consumo del frontend.

Sigue la misma convención que etl/export_json.py:
- Lee parquets de ml/outputs/
- Escribe JSON compactos en web/src/data/ml/
- Convierte NaN/Inf a None
- Mantiene esquemas estables para queries TypeScript

Outputs (web/src/data/ml/):
  ml_anomalias_robustas.json          (top 100 contratos reciente, n_flags>=2)
  ml_anomalias_robustas_historico.json (top 100 contratos histórico, n_flags>=3)
  ml_top_proveedores_robustos.json    (top 50 proveedores por monto sospechoso)
  ml_oneshots_grandes.json            (top 50 one-shots > 100M MXN)
  ml_estados_riesgo.json              (32 estados con índice compuesto)
  ml_efos_post_presuncion.json        (contratos firmados POST-presunción EFOS)
  ml_continuidad_proveedores.json     (proveedores por patrón temporal)
  ml_hhi_dependencias.json            (top 30 dependencias con HHI alto)
  ml_meta.json                        (metadatos: fechas, contadores agregados)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "ml" / "outputs"
WEB_DATA = ROOT / "web" / "src" / "data" / "ml"
WEB_DATA.mkdir(parents=True, exist_ok=True)


def log(msg): print(msg, flush=True)


def _clean(v):
    """Convert NaN/Inf/numpy types to JSON-safe values."""
    if v is None:
        return None
    if hasattr(v, "item"):
        v = v.item()
    if isinstance(v, float):
        import math as _m
        if _m.isnan(v) or _m.isinf(v):
            return None
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    return v


def write_json(name: str, payload, pretty=False):
    out = WEB_DATA / f"{name}.json"
    with out.open("w", encoding="utf-8") as f:
        if pretty:
            json.dump(payload, f, ensure_ascii=False, indent=2, allow_nan=False, default=str)
        else:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False, default=str)
    size_kb = out.stat().st_size / 1024
    log(f"  -> {out.name}  ({size_kb:.1f} KB)")
    return out


def df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convierte df a records limpiando NaN/Inf y tipos numpy."""
    df = df.where(pd.notnull(df), None)
    records = df.to_dict(orient="records")
    return [{k: _clean(v) for k, v in r.items()} for r in records]


def main():
    log("=== Exportando hallazgos ML a JSON para el frontend ===\n")
    meta = {"generated_at": pd.Timestamp.utcnow().isoformat(timespec="seconds")}

    # ── 1. Anomalías robustas RECIENTE (top 100, n_flags>=2) ──────────────────
    log("[1] Anomalías robustas — reciente...")
    df = pd.read_parquet(OUT / "anomalias_robustas.parquet")
    df = df.sort_values(["n_flags", "score_combinado", "monto"], ascending=[False, False, False])
    top = df.head(100).copy()
    # Sanitizar y reducir columnas
    cols = ["contrato_id", "institucion", "ramo", "modalidad", "monto",
            "fecha_firma", "proveedor", "rfc_proveedor", "descripcion",
            "n_flags", "score_combinado",
            "flag_monto_extremo", "flag_isoforest", "flag_lof", "flag_dbscan_noise", "flag_efos"]
    top = top[[c for c in cols if c in top.columns]]
    top["descripcion"] = top["descripcion"].astype(str).str.slice(0, 300)
    top["score_combinado"] = top["score_combinado"].round(2)
    top["monto"] = top["monto"].astype(float)
    records = df_to_records(top)
    write_json("ml_anomalias_robustas", records)
    meta["anomalias_robustas_reciente"] = {
        "n_total": int(len(df)),
        "n_export": len(records),
        "n_flags_max": int(df["n_flags"].max()) if len(df) else 0,
        "monto_total_mxn": float(df["monto"].sum()),
    }

    # ── 2. Anomalías robustas HISTÓRICO (top 100, n_flags>=3) ─────────────────
    log("\n[2] Anomalías robustas — histórico...")
    df = pd.read_parquet(OUT / "anomalias_robustas_historico.parquet")
    df = df.sort_values(["n_flags", "score_combinado", "monto"], ascending=[False, False, False])
    top = df.head(100).copy()
    cols_hist = ["contrato_id", "ano", "fecha_firma", "ramo", "modalidad",
                 "proveedor", "monto", "descripcion", "n_flags", "score_combinado",
                 "flag_monto_extremo", "flag_isoforest", "flag_lof",
                 "flag_efos_nombre", "flag_post_presuncion",
                 "flag_proveedor_alto_score", "flag_benford_anomalo", "flag_temporal_jump"]
    top = top[[c for c in cols_hist if c in top.columns]]
    top["descripcion"] = top["descripcion"].astype(str).str.slice(0, 300)
    top["score_combinado"] = top["score_combinado"].round(2)
    top["monto"] = top["monto"].astype(float)
    records = df_to_records(top)
    write_json("ml_anomalias_robustas_historico", records)
    meta["anomalias_robustas_historico"] = {
        "n_total": int(len(df)),
        "n_export": len(records),
        "n_5_flags": int((df["n_flags"] >= 5).sum()),
        "n_4_flags": int((df["n_flags"] >= 4).sum()),
    }

    # ── 3. Top proveedores robustos ───────────────────────────────────────────
    log("\n[3] Top proveedores robustos...")
    df = pd.read_parquet(OUT / "anomalias_robustas_por_proveedor.parquet")
    df = df.head(50).copy()
    df["monto_total"] = df["monto_total"].astype(float)
    df["monto_con_flag"] = df["monto_con_flag"].astype(float)
    df["score_max"] = df["score_max"].round(2)
    df["score_medio"] = df["score_medio"].round(2)
    df["pct_contratos_con_flag"] = df["pct_contratos_con_flag"].round(3)
    records = df_to_records(df)
    write_json("ml_top_proveedores_robustos", records)
    meta["top_proveedores"] = {"n_export": len(records)}

    # ── 4. One-shots grandes ──────────────────────────────────────────────────
    log("\n[4] One-shot wonders grandes (>100M MXN)...")
    df = pd.read_parquet(OUT / "deep_huerfanos_oneshots.parquet")
    df_big = df[df["monto_unico"] > 100_000_000].copy()
    df_big = df_big.sort_values("monto_unico", ascending=False).head(50)
    df_big["monto_unico"] = df_big["monto_unico"].astype(float)
    df_big["monto_total"] = df_big["monto_total"].astype(float)
    df_big["ano_unico"] = df_big["ano_unico"].astype(int)
    df_big["descripcion_unico"] = df_big["descripcion_unico"].astype(str).str.slice(0, 250)
    cols_one = ["proveedor", "proveedor_norm", "ano_unico", "sexenio_unico",
                "modalidad_unico", "ramo_unico", "monto_unico", "descripcion_unico", "es_efos"]
    df_big = df_big[[c for c in cols_one if c in df_big.columns]]
    records = df_to_records(df_big)
    write_json("ml_oneshots_grandes", records)
    meta["oneshots"] = {
        "n_total": int(len(df)),
        "pct_de_proveedores": round(float(len(df) / 264759 * 100), 1),
        "monto_total_mxn": float(df["monto_total"].sum()),
        "n_mayor_100M": int((df["monto_unico"] > 100_000_000).sum()),
        "n_mayor_500M": int((df["monto_unico"] > 500_000_000).sum()),
        "n_mayor_1000M": int((df["monto_unico"] > 1_000_000_000).sum()),
    }

    # ── 5. Estados con índice de riesgo ───────────────────────────────────────
    log("\n[5] Estados con índice compuesto...")
    df = pd.read_parquet(OUT / "deep_pipeline_por_estado.parquet")
    df = df.sort_values("indice_riesgo", ascending=False)
    # Reducir cols
    cols_est = ["cve_ent", "estado", "n_contratos", "monto_total_mxn",
                "pct_AD", "pct_LP", "n_proveedores", "n_instituciones",
                "top_proveedor_nombre", "top_proveedor_share",
                "top_institucion", "top_institucion_share",
                "hhi_proveedores", "hhi_instituciones",
                "pct_fecha_null", "delitos_total",
                "indice_riesgo"]
    df = df[[c for c in cols_est if c in df.columns]]
    df["monto_total_mxn"] = df["monto_total_mxn"].astype(float)
    df["indice_riesgo"] = df["indice_riesgo"].round(3)
    records = df_to_records(df)
    write_json("ml_estados_riesgo", records)
    meta["estados"] = {"n_estados": len(records)}

    # ── 6. EFOS post-presunción ───────────────────────────────────────────────
    log("\n[6] Contratos EFOS post-presunción (reciente)...")
    p_rec = OUT / "cruce_efos_post_presuncion.parquet"
    rows = []
    if p_rec.exists():
        df = pd.read_parquet(p_rec)
        cols_efos = ["proveedor", "rfc_proveedor", "monto", "fecha_firma",
                     "fecha_presuncion", "fecha_publicacion", "estatus",
                     "modalidad", "ramo", "institucion"]
        df = df[[c for c in cols_efos if c in df.columns]]
        df["monto"] = df["monto"].astype(float)
        rows = df_to_records(df)
    write_json("ml_efos_post_presuncion", rows)
    meta["efos_post_presuncion"] = {"n": len(rows)}

    # ── 7. Continuidad temporal: proveedores por patrón ───────────────────────
    log("\n[7] Continuidad temporal proveedores...")
    df = pd.read_parquet(OUT / "deep_continuidad_temporal_proveedores.parquet")

    # Solo activos y montos significativos para no inflar JSON
    df_sig = df[df["monto_total"] >= 100_000_000].copy()
    df_sig["monto_total"] = df_sig["monto_total"].astype(float)
    df_sig["monto_max"] = df_sig["monto_max"].astype(float)
    df_sig = df_sig.sort_values("monto_total", ascending=False)

    cols_cont = ["proveedor", "n_contratos", "monto_total", "monto_max", "n_anos",
                 "primer_ano", "ultimo_ano", "n_sexenios", "intensidad",
                 "sexenio_dominante", "pct_dominante",
                 "pct_Calderón", "pct_EPN", "pct_AMLO", "pct_Sheinbaum",
                 "solo_electorales", "patron_temporal"]
    df_sig = df_sig[[c for c in cols_cont if c in df_sig.columns]]
    for c in ["pct_dominante", "intensidad", "pct_Calderón", "pct_EPN", "pct_AMLO", "pct_Sheinbaum"]:
        if c in df_sig.columns:
            df_sig[c] = df_sig[c].round(3)
    records = df_to_records(df_sig.head(200))
    write_json("ml_continuidad_proveedores", records)

    # Agregados por patrón
    patrones = df.groupby("patron_temporal").agg(
        n_proveedores=("proveedor", "count"),
        monto_total=("monto_total", "sum"),
        monto_medio=("monto_total", "mean"),
    ).reset_index()
    patrones["monto_total"] = patrones["monto_total"].astype(float)
    patrones["monto_medio"] = patrones["monto_medio"].astype(float).round(0)
    write_json("ml_continuidad_patrones", df_to_records(patrones))
    meta["continuidad"] = {
        "n_solo_electorales": int((df["patron_temporal"] == "solo_electorales").sum()),
        "n_transitorios": int((df["patron_temporal"] == "transitorio").sum()),
        "n_persistentes": int((df["patron_temporal"] == "persistente").sum()),
    }

    # ── 8. HHI dependencias ───────────────────────────────────────────────────
    log("\n[8] Top dependencias por HHI...")
    df = pd.read_parquet(OUT / "deep_red_hhi_instituciones.parquet")
    df = df.sort_values("hhi", ascending=False).head(30)
    df["monto_total"] = df["monto_total"].astype(float)
    df["hhi"] = df["hhi"].round(4)
    df["top_share"] = df["top_share"].round(3)
    cols_hhi = ["institucion", "monto_total", "n_contratos", "n_proveedores",
                "hhi", "top_share", "top_proveedor", "nombre_top_proveedor"]
    df = df[[c for c in cols_hhi if c in df.columns]]
    records = df_to_records(df)
    write_json("ml_hhi_dependencias", records)

    # ── 9. Cruce contratos a EFOS (totales) ───────────────────────────────────
    log("\n[9] Cruce EFOS — totales históricos + recientes...")
    df = pd.read_parquet(OUT / "cruce_efos_contratos_all.parquet")
    df = df.sort_values("monto", ascending=False).head(50)
    df["monto"] = df["monto"].astype(float)
    cols_cruce = ["contrato_id", "ramo", "modalidad", "monto", "fecha_firma",
                  "proveedor", "rfc_proveedor", "ano", "fuente"]
    df = df[[c for c in cols_cruce if c in df.columns]]
    records = df_to_records(df)
    write_json("ml_efos_contratos_top", records)

    # ── Meta final ────────────────────────────────────────────────────────────
    log("\n[META] Escribiendo metadatos...")
    write_json("ml_meta", meta, pretty=True)

    log("\n=== Export ML COMPLETO ===")
    log(f"Archivos en: {WEB_DATA}")


if __name__ == "__main__":
    main()
