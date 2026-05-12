"""SESNSP · Incidencia delictiva (estatal, fuero común).

Source:
  https://www.gob.mx/sesnsp/acciones-y-programas/datos-abiertos-de-incidencia-delictiva

Output:
  data/processed/sesnsp_estatal.parquet
  web/public/data/sesnsp_estatal.parquet

Schema (out):
  cve_ent      str    INEGI 2-digit code "01".."32"
  estado       str    canonical name
  ano          int
  mes          int    1..12
  bien_juridico str
  tipo_delito  str    e.g. "Homicidio doloso"
  subtipo      str
  modalidad    str
  total        int

Notes:
  - The file the SESNSP exposes is wide (one column per month per year).
    We unpivot it into a long table.
  - Column names occasionally change. Resolution uses canonical patterns
    via common.coalesce_columns; if the script crashes it's because the
    SESNSP shipped a breaking schema change — the right move is to
    update column candidates here, not to silently work around it.

Run:
  python etl/sesnsp.py
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pandas as pd

# Allow running as a script (python etl/sesnsp.py)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    DownloadSpec,
    coalesce_columns,
    http_download,
    setup_logging,
    to_cve_ent,
    write_parquet,
)

log = setup_logging("sesnsp")

# SESNSP migrated to SharePoint URLs that rotate. We use a community-maintained
# mirror that tracks the official CSV with monthly updates.
# Source: https://github.com/lapanquecita/incidencia-delictiva
#
# Coverage status (verified 2026-05-06):
#   - Mirror lapanquecita: last commit 2026-04-18 — still capped at Dec 2025.
#     Same coverage as the official datos.gob.mx package
#     (id=incidencia_delictiva, modified 2026-03-03): "hechos delictivos
#     ocurridos entre 2015 y diciembre de 2025".
#   - SESNSP has NOT published 2026 monthly figures yet (typical lag: ~5 months
#     after period end). When the mirror updates, no code change needed —
#     re-run this script.
#   - Direct gob.mx legacy URL (secretariadoejecutivo.gob.mx/docs/datos_abiertos/
#     IDEFC__1.csv) now returns a stub redirecting to a SharePoint download
#     button; not scrapable.
#
# If you need 2026 data before the mirror catches up, manually save the latest
# IDEFC CSV from the SharePoint page into data/raw/sesnsp_estatal.csv and the
# fetch() helper will pick it up.
PRIMARY_URL = (
    "https://raw.githubusercontent.com/lapanquecita/incidencia-delictiva/"
    "main/data/estatal.csv"
)
FALLBACK_URLS: list[str] = [
    # If the mirror goes stale, drop the latest IDEFC CSV manually into
    # data/raw/sesnsp_estatal.csv and the script will pick it up.
]

MES_COLS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
MES_NUM = {m: i + 1 for i, m in enumerate(MES_COLS)}


def _read_csv_resilient(path: Path) -> pd.DataFrame:
    last_err = None
    for enc in ("latin-1", "utf-8", "cp1252"):
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False)
        except Exception as e:  # noqa: BLE001
            last_err = e
    raise RuntimeError(f"No pude leer {path}: {last_err}")


def fetch() -> Path:
    for i, url in enumerate([PRIMARY_URL, *FALLBACK_URLS]):
        try:
            return http_download(
                DownloadSpec(url=url, filename=f"sesnsp_estatal_v{i}.csv"),
            )
        except Exception as e:  # noqa: BLE001
            log.warning("Fallo URL %s: %s", url, e)
    raise RuntimeError(
        "No se pudo descargar SESNSP. Visita "
        "https://www.gob.mx/sesnsp/acciones-y-programas/datos-abiertos-de-incidencia-delictiva "
        "y guarda el CSV vigente en data/raw/sesnsp_estatal.csv manualmente, "
        "luego vuelve a correr este script."
    )


def transform(df: pd.DataFrame) -> pd.DataFrame:
    log.info("Filas raw: %d · cols: %d", len(df), len(df.columns))

    col_year = coalesce_columns(df, ["Año", "Ano", "Year"])
    col_estado = coalesce_columns(df, ["Entidad", "Estado", "EntFed"])
    col_bien = coalesce_columns(df, ["Bien jurídico afectado", "BienJuridico"])
    col_tipo = coalesce_columns(df, ["Tipo de delito", "TipoDelito"])
    col_subtipo = coalesce_columns(df, ["Subtipo de delito", "Subtipo"])
    col_modalidad = coalesce_columns(df, ["Modalidad"])
    if not col_year or not col_estado or not col_tipo:
        raise RuntimeError(
            "Esquema inesperado en SESNSP CSV. Columnas detectadas: "
            f"{list(df.columns)}"
        )

    # Resolve month columns (some CSVs use abbreviations)
    mes_cols_present: list[str] = []
    for m in MES_COLS:
        for c in df.columns:
            if c.strip().lower().startswith(m.lower()[:3]):
                mes_cols_present.append(c)
                break

    if len(mes_cols_present) != 12:
        raise RuntimeError(
            f"Esperaba 12 columnas mensuales, encontré {len(mes_cols_present)}: "
            f"{mes_cols_present}"
        )

    long = df.melt(
        id_vars=[
            c
            for c in [col_year, col_estado, col_bien, col_tipo, col_subtipo, col_modalidad]
            if c
        ],
        value_vars=mes_cols_present,
        var_name="mes_nombre",
        value_name="total",
    )
    long["mes"] = long["mes_nombre"].map(
        lambda x: MES_NUM[next((m for m in MES_COLS if x.lower().startswith(m.lower()[:3])), "Enero")]
    )
    long["total"] = pd.to_numeric(long["total"], errors="coerce").fillna(0).astype(int)
    long["cve_ent"] = long[col_estado].map(to_cve_ent)
    unresolved = long[long["cve_ent"].isna()][col_estado].dropna().unique()
    if len(unresolved):
        log.warning("Estados no resueltos: %s", list(unresolved)[:10])
    long = long.dropna(subset=["cve_ent"])

    out = long.rename(
        columns={
            col_year: "ano",
            col_tipo: "tipo_delito",
            **({col_bien: "bien_juridico"} if col_bien else {}),
            **({col_subtipo: "subtipo"} if col_subtipo else {}),
            **({col_modalidad: "modalidad"} if col_modalidad else {}),
        }
    )
    out["ano"] = pd.to_numeric(out["ano"], errors="coerce").astype("Int64")
    out["estado"] = out["cve_ent"].map(
        {cve: name for cve, name in __import__("common").ESTADOS}
    )

    cols = [
        "cve_ent",
        "estado",
        "ano",
        "mes",
        *(["bien_juridico"] if "bien_juridico" in out.columns else []),
        "tipo_delito",
        *(["subtipo"] if "subtipo" in out.columns else []),
        *(["modalidad"] if "modalidad" in out.columns else []),
        "total",
    ]
    return out[cols].reset_index(drop=True)


def main() -> None:
    raw_path = fetch()
    log.info("CSV en %s (%d KB)", raw_path, raw_path.stat().st_size // 1024)
    df = _read_csv_resilient(raw_path)
    out = transform(df)
    log.info("Filas finales: %d", len(out))
    write_parquet(out, "sesnsp_estatal")
    # quick sanity sample
    sample = out.head(3).to_dict("records")
    log.info("Muestra: %s", sample)


if __name__ == "__main__":
    main()
