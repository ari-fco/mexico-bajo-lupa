"""Fase 1 — Reconocimiento profundo de los datasets granulares.

Perfila los 4 datasets candidatos para ML no supervisado y escribe un reporte
markdown con distribuciones, nulls, cardinalidad y candidatos a features.
"""
from __future__ import annotations

from pathlib import Path
import json

import numpy as np
import pandas as pd

DATA = Path("data/processed")
OUT = Path("ml/reports")
OUT.mkdir(parents=True, exist_ok=True)

DATASETS = {
    "comprasmx_historico": "Contratos federales históricos 2010-2024",
    "comprasmx_contratos": "Contratos federales/estatales recientes 2024-2025",
    "sesnsp_estatal": "Delitos estatales mensuales (SESNSP)",
    "sat_efos": "Contribuyentes en lista negra SAT (EFOS)",
}


def profile_df(name: str, df: pd.DataFrame) -> dict:
    n_rows, n_cols = df.shape
    profile = {
        "name": name,
        "n_rows": int(n_rows),
        "n_cols": int(n_cols),
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
        "columns": [],
    }
    for col in df.columns:
        s = df[col]
        n_null = int(s.isna().sum())
        pct_null = round(n_null / n_rows * 100, 2) if n_rows else 0.0
        col_info = {
            "name": col,
            "dtype": str(s.dtype),
            "n_null": n_null,
            "pct_null": pct_null,
            "n_unique": int(s.nunique(dropna=True)),
        }
        if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            non_null = s.dropna()
            if len(non_null):
                col_info["min"] = float(non_null.min())
                col_info["p01"] = float(non_null.quantile(0.01))
                col_info["p25"] = float(non_null.quantile(0.25))
                col_info["median"] = float(non_null.median())
                col_info["mean"] = float(non_null.mean())
                col_info["p75"] = float(non_null.quantile(0.75))
                col_info["p99"] = float(non_null.quantile(0.99))
                col_info["max"] = float(non_null.max())
                col_info["std"] = float(non_null.std())
                col_info["n_zero"] = int((non_null == 0).sum())
                col_info["n_negative"] = int((non_null < 0).sum())
        elif pd.api.types.is_datetime64_any_dtype(s):
            non_null = s.dropna()
            if len(non_null):
                col_info["min"] = str(non_null.min())
                col_info["max"] = str(non_null.max())
        else:
            top = s.value_counts(dropna=True).head(5)
            col_info["top_values"] = {str(k): int(v) for k, v in top.items()}
        profile["columns"].append(col_info)
    return profile


def render_md(profiles: dict[str, dict]) -> str:
    lines = ["# Fase 1 — Reconocimiento de datasets\n",
             "Perfilado de los 4 datasets granulares candidatos para ML no supervisado.\n"]
    for name, p in profiles.items():
        desc = DATASETS.get(name, "")
        lines.append(f"## `{name}` — {desc}\n")
        lines.append(f"- **Filas:** {p['n_rows']:,}")
        lines.append(f"- **Columnas:** {p['n_cols']}")
        lines.append(f"- **Memoria:** {p['memory_mb']} MB\n")
        lines.append("### Columnas\n")
        lines.append("| Columna | dtype | nulls | % null | unique | resumen |")
        lines.append("|---|---|---|---|---|---|")
        for c in p["columns"]:
            summary = ""
            if "median" in c:
                summary = f"min={c['min']:.2g} p25={c['p25']:.2g} med={c['median']:.2g} p75={c['p75']:.2g} max={c['max']:.2g} | zeros={c['n_zero']} neg={c['n_negative']}"
            elif "min" in c and isinstance(c["min"], str):
                summary = f"rango: {c['min']} → {c['max']}"
            elif "top_values" in c:
                tv = c["top_values"]
                summary = " | ".join([f"{k}: {v}" for k, v in list(tv.items())[:3]])
            lines.append(f"| `{c['name']}` | {c['dtype']} | {c['n_null']:,} | {c['pct_null']}% | {c['n_unique']:,} | {summary} |")
        lines.append("")
    return "\n".join(lines)


def main():
    profiles = {}
    for name in DATASETS:
        path = DATA / f"{name}.parquet"
        print(f"Loading {name}...", flush=True)
        df = pd.read_parquet(path)
        profiles[name] = profile_df(name, df)
        print(f"  shape={df.shape} memory={profiles[name]['memory_mb']}MB", flush=True)

    md = render_md(profiles)
    (OUT / "01-reconocimiento.md").write_text(md, encoding="utf-8")
    (OUT / "01-reconocimiento.json").write_text(json.dumps(profiles, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {OUT / '01-reconocimiento.md'}")


if __name__ == "__main__":
    main()
