"""CONEVAL · Medición multidimensional de pobreza por entidad federativa.

Source: anexo estadístico nacional/estatal del CONEVAL para la última medición
disponible. CONEVAL publica la medición cada 2 años. La última al 2026-05 es
la de 2022 (ENIGH 2022, publicada agosto 2023).

URL canónica:
  https://www.coneval.org.mx/Medicion/MP/Documents/MMP_2022/AE_nacional_estatal_2022.zip

El zip contiene un xlsx ('Anexo estadístico 2022.xlsx') con varios cuadros.
Los cuadros relevantes:
  - Cuadro 4A: % población en pobreza, pobreza moderada, pobreza extrema
    por entidad federativa, años 2016, 2018, 2020, 2022.
  - Cuadro 4B: vulnerable por carencias sociales, vulnerable por ingresos,
    no pobre y no vulnerable.

Estructura de Cuadro 4A (después de saltar 8 filas de header):
  col 2 = nombre estado
  cols 3-6 = pobreza % para 2016, 2018, 2020, 2022
  cols 18-21 = pobreza moderada % para 2016, 2018, 2020, 2022
  cols 33-36 = pobreza extrema % para 2016, 2018, 2020, 2022

Estructura de Cuadro 4B:
  col 2 = nombre estado
  cols 3-6 = vulnerable por carencias %

Salida:
  data/processed/coneval_pobreza.parquet
  web/public/data/coneval_pobreza.parquet

Schema:
  cve_ent str
  estado  str
  ano     int
  pobreza_pct float
  pobreza_extrema_pct float
  vulnerables_carencias_pct float

Run:
  python etl/coneval_pobreza.py
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    DATA_RAW,
    DownloadSpec,
    http_download,
    setup_logging,
    to_cve_ent,
    write_parquet,
)

log = setup_logging("coneval")

URL = DownloadSpec(
    url="https://www.coneval.org.mx/Medicion/MP/Documents/MMP_2022/AE_nacional_estatal_2022.zip",
    filename="coneval_ae_estatal_2022.zip",
)
XLSX_LOCAL = "coneval_anexo_2022.xlsx"
ANIOS = [2016, 2018, 2020, 2022]


def ensure_xlsx() -> Path:
    """Asegura que el archivo Excel del anexo está en data/raw/.

    Si el zip no se pudo bajar y el xlsx tampoco existe, instruye descarga manual.
    """
    target = DATA_RAW / XLSX_LOCAL
    if target.exists():
        return target

    # Bajar zip
    try:
        zip_path = http_download(URL)
    except Exception as e:
        raise SystemExit(
            f"No pude descargar {URL.url}: {e}\n"
            f"Bajalo manualmente y poné el xlsx en {target}."
        )

    # Extraer
    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()
        # El zip oficial trae 'Anexo estadístico 2022.xlsx' (con espacios y acentos)
        xlsx_name = next((n for n in names if n.lower().endswith(".xlsx")), None)
        if not xlsx_name:
            raise RuntimeError(f"No hay xlsx en {zip_path}: {names}")
        zf.extract(xlsx_name, DATA_RAW)
        extracted = DATA_RAW / xlsx_name
        extracted.rename(target)
    log.info("Extraído xlsx → %s", target)
    return target


def parse_cuadro_4a(xlsx: Path) -> pd.DataFrame:
    """Cuadro 4A: pobreza %, pobreza moderada %, pobreza extrema %.

    Layout real (descubierto leyendo headers):
      col 2  = entidad
      cols 3,4,5,6   = pobreza %        2016, 2018, 2020, 2022
      cols 18,19,20,21 = pobreza moderada %
      cols 34,35,36,37 = pobreza extrema %
    """
    df = pd.read_excel(xlsx, sheet_name="Cuadro 4A", header=None)
    rows = []
    # Buscar filas con nombre de estado en col 2 (saltando header rows)
    for idx in range(8, len(df)):
        nombre = df.iat[idx, 2]
        if not isinstance(nombre, str) or not nombre.strip():
            continue
        cve = to_cve_ent(nombre)
        if not cve:
            continue
        for k, ano in enumerate(ANIOS):
            pobreza = df.iat[idx, 3 + k]
            pobreza_ext = df.iat[idx, 34 + k]
            if pd.isna(pobreza):
                continue
            rows.append(
                {
                    "cve_ent": cve,
                    "estado": nombre.strip(),
                    "ano": ano,
                    "pobreza_pct": float(pobreza),
                    "pobreza_extrema_pct": float(pobreza_ext)
                    if not pd.isna(pobreza_ext)
                    else None,
                }
            )
    if not rows:
        raise RuntimeError("Cuadro 4A no produjo filas.")
    return pd.DataFrame(rows)


def parse_cuadro_4b(xlsx: Path) -> pd.DataFrame:
    """Cuadro 4B: % vulnerable por carencias sociales (cols 3-6)."""
    df = pd.read_excel(xlsx, sheet_name="Cuadro 4B", header=None)
    rows = []
    for idx in range(8, len(df)):
        nombre = df.iat[idx, 2]
        if not isinstance(nombre, str) or not nombre.strip():
            continue
        cve = to_cve_ent(nombre)
        if not cve:
            continue
        for k, ano in enumerate(ANIOS):
            v = df.iat[idx, 3 + k]
            if pd.isna(v):
                continue
            rows.append(
                {
                    "cve_ent": cve,
                    "ano": ano,
                    "vulnerables_carencias_pct": float(v),
                }
            )
    return pd.DataFrame(rows)


def main() -> None:
    xlsx = ensure_xlsx()

    pobreza = parse_cuadro_4a(xlsx)
    log.info(
        "Cuadro 4A: %d filas · estados=%d · años=%s",
        len(pobreza),
        pobreza["cve_ent"].nunique(),
        sorted(pobreza["ano"].unique().tolist()),
    )

    vuln = parse_cuadro_4b(xlsx)
    log.info("Cuadro 4B (vulnerables): %d filas", len(vuln))

    df = pobreza.merge(vuln, on=["cve_ent", "ano"], how="left")

    # Redondear a 2 decimales (CONEVAL ya viene con muchos decimales)
    df["pobreza_pct"] = df["pobreza_pct"].round(2)
    df["pobreza_extrema_pct"] = df["pobreza_extrema_pct"].round(2)
    df["vulnerables_carencias_pct"] = df["vulnerables_carencias_pct"].round(2)

    df = df.sort_values(["ano", "cve_ent"]).reset_index(drop=True)
    write_parquet(
        df[
            [
                "cve_ent",
                "estado",
                "ano",
                "pobreza_pct",
                "pobreza_extrema_pct",
                "vulnerables_carencias_pct",
            ]
        ],
        "coneval_pobreza",
    )
    last = int(df["ano"].max())
    log.info(
        "Último año=%d · estados=%d · pobreza_avg=%.1f%% · ext_avg=%.1f%%",
        last,
        df[df.ano == last]["cve_ent"].nunique(),
        df[df.ano == last]["pobreza_pct"].mean(),
        df[df.ano == last]["pobreza_extrema_pct"].mean(),
    )


if __name__ == "__main__":
    main()
