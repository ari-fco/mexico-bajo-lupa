"""CONAPO · Proyecciones de población por entidad (anuales).

Source mirror (mantained, syncs CONAPO official):
  https://raw.githubusercontent.com/lapanquecita/incidencia-delictiva/main/assets/poblacion.csv

Original (often broken):
  https://conapo.segob.gob.mx/es/CONAPO/Datos_abiertos

Output:
  data/processed/conapo_poblacion.parquet
  web/public/data/conapo_poblacion.parquet

Schema (out):
  cve_ent str
  estado  str
  ano     int
  poblacion int

Run:
  python etl/inegi_poblacion.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    DownloadSpec,
    http_download,
    setup_logging,
    write_parquet,
    ESTADOS,
)

log = setup_logging("conapo")

# Mirror: 1990-2040 monthly population estimates per municipality.
# Format: CVE (5-digit municipal), Entidad, Municipio, then one column per year.
URL = (
    "https://raw.githubusercontent.com/lapanquecita/incidencia-delictiva/"
    "main/assets/poblacion.csv"
)


def main() -> None:
    path = http_download(DownloadSpec(url=URL, filename="conapo_pob.csv"))
    df = pd.read_csv(path, encoding="utf-8", low_memory=False)
    log.info("Filas raw: %d · cols: %d", len(df), len(df.columns))

    # Fixed columns vs year columns
    fixed = {"CVE", "Entidad", "Municipio"}
    year_cols = [c for c in df.columns if c not in fixed and c.isdigit()]
    if not year_cols:
        raise RuntimeError(f"No detecté columnas de año en {list(df.columns)[:10]}")

    # Aggregate municipal → state by extracting first 2 digits of CVE
    df["cve_ent"] = df["CVE"].astype(str).str.zfill(5).str[:2]

    long = df.melt(
        id_vars=["cve_ent"],
        value_vars=year_cols,
        var_name="ano",
        value_name="poblacion",
    )
    long["ano"] = pd.to_numeric(long["ano"], errors="coerce").astype("Int64")
    long["poblacion"] = pd.to_numeric(long["poblacion"], errors="coerce").fillna(0)

    out = (
        long.groupby(["cve_ent", "ano"], as_index=False)["poblacion"]
        .sum()
        .astype({"poblacion": int})
    )
    out["estado"] = out["cve_ent"].map({cve: name for cve, name in ESTADOS})
    # Drop rows where cve_ent didn't match (shouldn't happen with valid CVE)
    out = out.dropna(subset=["estado"])

    write_parquet(out[["cve_ent", "estado", "ano", "poblacion"]], "conapo_poblacion")
    log.info(
        "Estados: %d · años: %d-%d",
        out["cve_ent"].nunique(),
        out["ano"].min(),
        out["ano"].max(),
    )


if __name__ == "__main__":
    main()
