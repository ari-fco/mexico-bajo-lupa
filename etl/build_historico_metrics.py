"""Construye métricas derivadas del histórico CompraNet 5.0 (2011-2022).

Reads:  data/processed/comprasmx_historico.parquet
Writes:
  data/processed/historico_anual.parquet
  data/processed/historico_proveedores_top.parquet
  data/processed/historico_benford_anual.parquet
  web/src/data/historico_anual.json
  web/src/data/historico_proveedores_top.json
  web/src/data/historico_benford_anual.json

Output schemas:

historico_anual:
  ano int
  contratos int
  monto_total float
  pct_ad float            % adjudicación directa del año
  pct_lp float            % licitación pública
  pct_i3p float           % invitación a 3 personas
  benford_mad float       MAD nacional sobre primer dígito del año

proveedores_top (top 50 por monto total):
  proveedor str
  contratos int
  monto_total float
  primera_fecha date
  ultima_fecha date
  pct_ad float            % de sus contratos por adjudicación directa
  pct_amparado float      % de contratos del proveedor en años contiguos (heurístico de "captura")

benford_anual:
  ano int
  digito 1..9
  esperado float
  observado float
  contratos int
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_PROCESSED, setup_logging

log = setup_logging("historico-metrics")

WEB_DATA = Path(__file__).resolve().parent.parent / "web" / "src" / "data"
WEB_DATA.mkdir(parents=True, exist_ok=True)

BENFORD_EXPECTED = {d: math.log10(1 + 1 / d) * 100 for d in range(1, 10)}


def benford_mad(series: pd.Series) -> float:
    s = series.dropna()
    s = s[s >= 1]
    if len(s) < 100:
        return float("nan")
    digits = s.map(lambda x: int(str(int(abs(x)))[0]))
    counts = digits.value_counts(normalize=True).reindex(range(1, 10), fill_value=0)
    expected = pd.Series({d: math.log10(1 + 1 / d) for d in range(1, 10)})
    return float((counts - expected).abs().mean())


def write_json(name: str, payload: object, *, pretty: bool = False) -> Path:
    out = WEB_DATA / f"{name}.json"
    with out.open("w", encoding="utf-8") as f:
        if pretty:
            json.dump(payload, f, ensure_ascii=False, indent=2, allow_nan=False)
        else:
            json.dump(
                payload, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False,
            )
    size_kb = out.stat().st_size / 1024
    log.info("JSON escrito %s · %.1f KB", out.name, size_kb)
    return out


def _clean_float(v) -> float | None:
    if v is None or pd.isna(v):
        return None
    f = float(v)
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def main() -> None:
    src = DATA_PROCESSED / "comprasmx_historico.parquet"
    if not src.exists():
        raise SystemExit(f"Falta {src}. Corre etl/comprasmx_historico.py primero.")

    log.info("Cargando %s…", src)
    df = pd.read_parquet(src)
    log.info("Cargado · %d filas", len(df))

    # Universo válido: con año entre 2010 y 2024, monto positivo
    valid = df[
        df["ano"].between(2010, 2024) & df["monto"].notna() & (df["monto"] > 0)
    ].copy()
    log.info("Universo limpio: %d filas (descartadas %d)", len(valid), len(df) - len(valid))

    # === 1. Histórico anual ===
    grp = valid.groupby("ano")
    anual = pd.DataFrame(
        {
            "ano": sorted(valid["ano"].unique()),
        }
    )
    anual["contratos"] = anual["ano"].map(grp.size())
    anual["monto_total"] = anual["ano"].map(grp["monto"].sum().round(0))
    anual["pct_ad"] = anual["ano"].map(
        grp["modalidad"].apply(lambda s: (s == "AD").mean() * 100).round(2)
    )
    anual["pct_lp"] = anual["ano"].map(
        grp["modalidad"].apply(lambda s: (s == "LP").mean() * 100).round(2)
    )
    anual["pct_i3p"] = anual["ano"].map(
        grp["modalidad"].apply(lambda s: (s == "I3P").mean() * 100).round(2)
    )
    anual["benford_mad"] = anual["ano"].map(
        grp["monto"].apply(benford_mad).round(4)
    )

    # Sólo años con masa estadística significativa (>500 contratos)
    anual = anual[anual["contratos"] >= 500].reset_index(drop=True)

    anual.to_parquet(DATA_PROCESSED / "historico_anual.parquet", index=False, compression="zstd")
    log.info("historico_anual: %d años (%d → %d)",
             len(anual), int(anual["ano"].min()), int(anual["ano"].max()))

    write_json(
        "historico_anual",
        [
            {
                "ano": int(r["ano"]),
                "contratos": int(r["contratos"]),
                "monto_total": _clean_float(r["monto_total"]),
                "pct_ad": _clean_float(r["pct_ad"]),
                "pct_lp": _clean_float(r["pct_lp"]),
                "pct_i3p": _clean_float(r["pct_i3p"]),
                "benford_mad": _clean_float(r["benford_mad"]),
            }
            for _, r in anual.iterrows()
        ],
        pretty=True,
    )

    # === 2. Top 50 proveedores recurrentes ===
    prov = (
        valid.dropna(subset=["proveedor"])
        .groupby("proveedor")
        .agg(
            contratos=("contrato_id", "count"),
            monto_total=("monto", "sum"),
            primera_fecha=("fecha_firma", "min"),
            ultima_fecha=("fecha_firma", "max"),
            pct_ad=("modalidad", lambda s: (s == "AD").mean() * 100),
        )
        .reset_index()
    )
    # Span de actividad en años distintos
    span_years = (
        valid.dropna(subset=["proveedor", "ano"])
        .groupby("proveedor")["ano"]
        .nunique()
        .rename("anos_activos")
    )
    prov = prov.merge(span_years, on="proveedor", how="left")
    prov["pct_ad"] = prov["pct_ad"].round(1)
    prov["monto_total"] = prov["monto_total"].round(0)
    # Top 50 por monto total
    prov_top = prov.sort_values("monto_total", ascending=False).head(50).reset_index(drop=True)

    prov_top.to_parquet(
        DATA_PROCESSED / "historico_proveedores_top.parquet", index=False, compression="zstd"
    )
    log.info("Top 50 proveedores: monto total acumulado: %.1f mil mdp",
             prov_top["monto_total"].sum() / 1e9)

    write_json(
        "historico_proveedores_top",
        [
            {
                "proveedor": r["proveedor"],
                "contratos": int(r["contratos"]),
                "monto_total": _clean_float(r["monto_total"]),
                "anos_activos": int(r["anos_activos"]) if pd.notna(r["anos_activos"]) else None,
                "primera_fecha": r["primera_fecha"].strftime("%Y-%m-%d") if pd.notna(r["primera_fecha"]) else None,
                "ultima_fecha": r["ultima_fecha"].strftime("%Y-%m-%d") if pd.notna(r["ultima_fecha"]) else None,
                "pct_ad": _clean_float(r["pct_ad"]),
            }
            for _, r in prov_top.iterrows()
        ],
        pretty=True,
    )

    # === 3. Benford anual desagregado ===
    rows = []
    for ano, sub in valid.groupby("ano"):
        if len(sub) < 500:
            continue
        digits = sub["primer_digito"].dropna().astype(int)
        if len(digits) < 100:
            continue
        counts = digits.value_counts(normalize=True).reindex(range(1, 10), fill_value=0).mul(100)
        for d in range(1, 10):
            rows.append({
                "ano": int(ano),
                "digito": d,
                "esperado": round(BENFORD_EXPECTED[d], 3),
                "observado": round(float(counts[d]), 3),
                "contratos": int(len(sub)),
            })
    benford_anual = pd.DataFrame(rows)
    benford_anual.to_parquet(
        DATA_PROCESSED / "historico_benford_anual.parquet", index=False, compression="zstd"
    )
    write_json(
        "historico_benford_anual",
        rows,
        pretty=True,
    )

    log.info("=== HALLAZGOS RÁPIDOS ===")
    log.info("AD%% por año:")
    for _, r in anual.iterrows():
        log.info("  %d · AD %.1f%% · LP %.1f%% · I3P %.1f%% · MAD %.4f · n=%d",
                 int(r["ano"]), r["pct_ad"], r["pct_lp"], r["pct_i3p"],
                 r["benford_mad"] if pd.notna(r["benford_mad"]) else 0.0,
                 int(r["contratos"]))
    log.info("Top 5 proveedores históricos por monto:")
    for _, r in prov_top.head(5).iterrows():
        log.info("  %s · %d contratos · %.1f mdp · AD %.1f%% · activo %d años",
                 r["proveedor"][:60], int(r["contratos"]),
                 r["monto_total"] / 1e6, r["pct_ad"], int(r["anos_activos"]))


if __name__ == "__main__":
    main()
