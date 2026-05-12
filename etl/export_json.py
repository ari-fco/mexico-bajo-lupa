"""Export the processed Parquet files into compact JSON the frontend imports
directly. This is the bridge step between ETL and Next.js.

Strategy:
- Parquet stays as the canonical store (queriable, columnar, future DuckDB-WASM).
- For the V1 MVP, we ship JSON for synchronous TS imports — keeps the codebase
  simple and avoids making every component async.
- When data scales past ~5MB JSON or we need filtering nuances, switch to
  DuckDB-WASM reading the Parquet directly.

Outputs (under web/src/data/):
  estado_metrics.json
  incidencia_serie.json     (only homicidio doloso, monthly per state)
  benford_nacional.json
  dependencias_riesgo.json  (top 200)

Run:
  python etl/export_json.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_PROCESSED, setup_logging

log = setup_logging("export-json")

WEB_DATA_TS = Path(__file__).resolve().parent.parent / "web" / "src" / "data"
WEB_DATA_TS.mkdir(parents=True, exist_ok=True)


def write_json(name: str, payload: object, *, pretty: bool = False) -> Path:
    out = WEB_DATA_TS / f"{name}.json"
    # allow_nan=False forces ValueError instead of writing NaN/Infinity
    # (which are invalid JSON). We pre-sanitize so this should always pass.
    with out.open("w", encoding="utf-8") as f:
        if pretty:
            json.dump(payload, f, ensure_ascii=False, indent=2, allow_nan=False)
        else:
            json.dump(
                payload, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False,
            )
    size_kb = out.stat().st_size / 1024
    log.info("Escrito %s · %.1f KB", out.name, size_kb)
    return out


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
    return v


def main() -> None:
    # Tracker for the meta JSON the frontend uses to label coverage.
    meta: dict = {
        "generated_at": pd.Timestamp.utcnow().isoformat(timespec="seconds"),
        "sesnsp": None,  # filled below
        "comprasmx": None,
        "conapo": None,
        "inegi_pib": None,
        "coneval": None,
        "shcp": None,
    }

    # === Estado metrics ===
    p = DATA_PROCESSED / "estado_metrics.parquet"
    if p.exists():
        df = pd.read_parquet(p)
        # Replace pandas NA with None for valid JSON
        df = df.where(pd.notnull(df), None)
        records = df.to_dict(orient="records")
        # Convert numpy ints/floats to native types
        records = [{k: _norm(v) for k, v in r.items()} for r in records]
        write_json("estado_metrics", records)

    # === Incidencia serie mensual: homicidio doloso por estado ===
    p = DATA_PROCESSED / "sesnsp_estatal.parquet"
    if p.exists():
        df = pd.read_parquet(p)

        # Coverage detection: SESNSP fills 12 monthly columns even when the
        # latest months are still 0 (no data published yet). To find the real
        # last month with data, look at the latest year and walk backwards
        # until we hit a month with non-zero totals across the country.
        latest_year = int(df["ano"].max())
        last_year_df = df[df["ano"] == latest_year]
        last_month = 0
        for m in range(12, 0, -1):
            month_total = int(last_year_df[last_year_df["mes"] == m]["total"].sum())
            if month_total > 0:
                last_month = m
                break
        first_year = int(df["ano"].min())
        meta["sesnsp"] = {
            "first_year": first_year,
            "last_year": latest_year,
            "last_month": last_month,  # 1..12
            # ISO-style "YYYY-MM" key for easy comparisons in the frontend.
            "last_period": f"{latest_year:04d}-{last_month:02d}",
            "source": "lapanquecita/incidencia-delictiva (mirror SESNSP)",
        }

        # Filter homicidio doloso, aggregate by cve_ent/ano/mes
        h = df[df["subtipo"].str.contains("Homicidio doloso", case=False, na=False)]
        agg = (
            h.groupby(["cve_ent", "ano", "mes"], as_index=False)["total"].sum()
        )
        agg = agg.sort_values(["cve_ent", "ano", "mes"])
        records = [
            {
                "cve_ent": r["cve_ent"],
                "ano": int(r["ano"]),
                "mes": int(r["mes"]),
                "total": int(r["total"]),
            }
            for _, r in agg.iterrows()
        ]
        write_json("incidencia_homicidios", records)

        # Series por categoría de delito (subtipos principales)
        SUBTIPOS = [
            "Homicidio doloso",
            "Feminicidio",
            "Secuestro",
            "Extorsión",
            "Robo de vehículo",
            "Robo a transeúnte en vía pública",
            "Violencia familiar",
        ]
        cats = []
        for sub in SUBTIPOS:
            sub_df = df[df["subtipo"].str.contains(sub, case=False, na=False)]
            if len(sub_df) == 0:
                continue
            agg = sub_df.groupby(
                ["cve_ent", "ano", "mes"], as_index=False
            )["total"].sum()
            for _, r in agg.iterrows():
                cats.append(
                    {
                        "cve_ent": r["cve_ent"],
                        "ano": int(r["ano"]),
                        "mes": int(r["mes"]),
                        "subtipo": sub,
                        "total": int(r["total"]),
                    }
                )
        write_json("incidencia_categorias", cats)

    # === Benford nacional ===
    p = DATA_PROCESSED / "benford_nacional.parquet"
    if p.exists():
        df = pd.read_parquet(p)
        records = [
            {
                "digito": int(r["digito"]),
                "esperado": round(float(r["esperado"]), 3),
                "observado": round(float(r["observado"]), 3),
            }
            for _, r in df.iterrows()
        ]
        write_json("benford_nacional", records, pretty=True)

    # === ComprasMX coverage (años cubiertos) ===
    p_cmx = DATA_PROCESSED / "comprasmx_contratos.parquet"
    if p_cmx.exists():
        cmx_df = pd.read_parquet(p_cmx, columns=["ano"])
        # Year is sourced primarily from "fecha_firma"; the CSV occasionally
        # includes outlier dates (data entry typos, far-past or future).
        # We only treat as "covered" the years that contain a meaningful
        # share of contracts (>= 1% of the total). This is what we surface
        # in the UI as the dataset's effective coverage.
        n_total = int(len(cmx_df))
        counts = cmx_df["ano"].dropna().astype(int).value_counts()
        threshold = max(int(n_total * 0.01), 100)
        major_years = sorted(
            int(y) for y, c in counts.items() if c >= threshold and y >= 1900
        )
        meta["comprasmx"] = {
            "years": major_years,
            "first_year": major_years[0] if major_years else None,
            "last_year": major_years[-1] if major_years else None,
            "n_contratos": n_total,
        }

    # === Dependencias riesgo (top 200) ===
    p = DATA_PROCESSED / "dependencias_riesgo.parquet"
    if p.exists():
        df = pd.read_parquet(p).head(200)
        records = []
        for _, r in df.iterrows():
            ramo = r.get("ramo")
            if hasattr(ramo, "item"):
                ramo = ramo.item()
            records.append(
                {
                    "institucion": r["institucion"],
                    "ramo": ramo if isinstance(ramo, str) else None,
                    "contratos": int(r["contratos"]),
                    "monto_total": float(r["monto_total"]),
                    "adj_directa_pct": _round_or_none(r.get("adj_directa_pct"), 1),
                    "benford_mad": _round_or_none(r.get("benford_mad"), 4),
                    "riesgo_score": _round_or_none(r.get("riesgo_score"), 1),
                }
            )
        write_json("dependencias_riesgo", records)


    # === INEGI PIB coverage ===
    p_pib = DATA_PROCESSED / "inegi_pib.parquet"
    if p_pib.exists():
        pib_df = pd.read_parquet(p_pib, columns=["ano"])
        years = sorted(int(y) for y in pib_df["ano"].dropna().unique().tolist())
        meta["inegi_pib"] = {
            "first_year": years[0] if years else None,
            "last_year": years[-1] if years else None,
            "source": "INEGI · PIBE comunicado de prensa (precios 2018)",
        }

    # === CONEVAL pobreza coverage ===
    p_pobr = DATA_PROCESSED / "coneval_pobreza.parquet"
    if p_pobr.exists():
        pobr_df = pd.read_parquet(p_pobr, columns=["ano"])
        years = sorted(int(y) for y in pobr_df["ano"].dropna().unique().tolist())
        meta["coneval"] = {
            "first_year": years[0] if years else None,
            "last_year": years[-1] if years else None,
            "source": "CONEVAL · Anexo estadístico medición multidimensional",
        }

    # === SHCP gasto federalizado coverage ===
    p_shcp = DATA_PROCESSED / "shcp_gasto.parquet"
    if p_shcp.exists():
        shcp_df = pd.read_parquet(p_shcp)
        full_years = sorted(
            int(y)
            for y in shcp_df[shcp_df.get("meses_reportados", 12) >= 12]["ano"]
            .dropna()
            .unique()
            .tolist()
        )
        meta["shcp"] = {
            "first_year": full_years[0] if full_years else None,
            "last_year": full_years[-1] if full_years else None,
            "source": "SHCP · Transferencias federales a entidades federativas (datos.gob.mx)",
        }

    # === Meta JSON (always last so it has the most up-to-date info) ===
    write_json("meta", meta, pretty=True)


def _round_or_none(v, ndigits: int):
    cleaned = _clean(v)
    if cleaned is None:
        return None
    return round(float(cleaned), ndigits)


def _norm(v):
    return _clean(v)


if __name__ == "__main__":
    main()
