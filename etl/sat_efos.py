"""SAT · Listado completo Art. 69-B CFF (EFOS — Empresas que Facturan Operaciones Simuladas).

Source (verificado 2026-05-08):
  http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv

  El SAT publica un único CSV con TODAS las categorías del 69-B (Definitivo,
  Presunto, Desvirtuado, Sentencia Favorable). El listado se actualiza en
  forma continua; el archivo descargado el 2026-05-08 reportaba "Información
  actualizada al 31 de diciembre de 2025".

Schema entrada (encoding latin-1, separador coma con quotes embebidos):
  No
  RFC
  Nombre del Contribuyente
  Situación del contribuyente   (Definitivo / Presunto / Desvirtuado / Sentencia Favorable)
  Número y fecha de oficio global de presunción SAT
  Publicación página SAT presuntos        (dd/mm/yyyy)
  Número y fecha de oficio global de presunción DOF
  Publicación DOF presuntos               (dd/mm/yyyy)
  Número y fecha de oficio global de contribuyentes que desvirtuaron SAT
  Publicación SAT desvirtuados            (dd/mm/yyyy)
  Número y fecha de oficio global de contribuyentes que desvirtuaron DOF
  Publicación DOF desvirtuados            (dd/mm/yyyy)
  Número y fecha de oficio global definitivo SAT
  Publicación SAT definitivos             (dd/mm/yyyy)
  Número y fecha de oficio global definitivo DOF
  Publicación DOF definitivos             (dd/mm/yyyy)
  ...sentencia favorable SAT/DOF

Output:
  data/processed/sat_efos.parquet
  web/public/data/sat_efos.parquet

Schema salida:
  rfc                  str   uppercase, sin espacios
  contribuyente        str
  estatus              str   "DEFINITIVO" | "PRESUNTO" | "DESVIRTUADO" | "SENTENCIA_FAVORABLE"
  fecha_presuncion     date  primera publicación oficial como presunto (DOF o SAT, lo que esté)
  fecha_publicacion    date  para Definitivos: fecha de publicación como definitivo;
                              para los demás: misma que fecha_presuncion (mejor disponible)
  fuente_url           str   URL del CSV original
  snapshot_fecha       date  fecha en que se descargó la lista (hoy)

Run:
  python etl/sat_efos.py
"""

from __future__ import annotations

import re
import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DownloadSpec, http_download, setup_logging, write_parquet  # noqa: E402

log = setup_logging("sat-efos")

URL = "http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv"
FILENAME = "Listado_Completo_69-B.csv"


def _norm_estatus(raw: str | None) -> str | None:
    if raw is None or pd.isna(raw):
        return None
    s = str(raw).strip().upper()
    # ASCII fold for accents
    s = (
        s.replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
        .replace("Ñ", "N")
    )
    if s.startswith("DEFINITIV"):
        return "DEFINITIVO"
    if s.startswith("PRESUNT"):
        return "PRESUNTO"
    if s.startswith("DESVIRTUA"):
        return "DESVIRTUADO"
    if "SENTENCIA" in s:
        return "SENTENCIA_FAVORABLE"
    return None


_DATE_RX = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")


def _parse_date(raw: str | None) -> date | None:
    if raw is None or pd.isna(raw):
        return None
    s = str(raw).strip()
    if not s:
        return None
    m = _DATE_RX.search(s)
    if not m:
        # last-resort generic parser
        try:
            return pd.to_datetime(s, dayfirst=True, errors="coerce").date()
        except Exception:  # noqa: BLE001
            return None
    d, mo, y = (int(x) for x in m.groups())
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def _normalize_rfc(raw: str | None) -> str | None:
    if raw is None or pd.isna(raw):
        return None
    s = str(raw).strip().upper().replace(" ", "")
    # RFCs are 12 (PM) or 13 (PF) chars — drop anything else as junk
    if len(s) not in (12, 13):
        return None
    return s


def _coalesce(*values) -> object:
    """Return the first non-null/non-empty value."""
    for v in values:
        if v is None:
            continue
        if isinstance(v, float) and pd.isna(v):
            continue
        if isinstance(v, str) and not v.strip():
            continue
        return v
    return None


def main() -> None:
    path = http_download(DownloadSpec(url=URL, filename=FILENAME))
    log.info("Leyendo %s", path)

    # The CSV has TWO non-data rows before the header:
    #   row 0 → disclaimer prose ("Información actualizada al ...")
    #   row 1 → secondary title ("Listado completo de contribuyentes (Artículo 69-B del CFF)")
    #   row 2 → real header (No, RFC, Nombre del Contribuyente, ...)
    df = pd.read_csv(
        path,
        encoding="latin-1",
        skiprows=2,
        header=0,
        dtype=str,
        keep_default_na=False,
        na_values=[""],
    )
    log.info("Filas leídas: %d · columnas: %d", len(df), len(df.columns))

    # Map columns by position-tolerant name matching (the SAT changes header
    # capitalization sometimes). Build a normalized lookup.
    def _nk(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", s.lower())

    cols = {_nk(c): c for c in df.columns}

    def _pick(*candidates: str) -> str | None:
        for cand in candidates:
            k = _nk(cand)
            if k in cols:
                return cols[k]
        # also do "starts with" fallback
        for cand in candidates:
            k = _nk(cand)
            for nk, real in cols.items():
                if nk.startswith(k):
                    return real
        return None

    col_rfc = _pick("RFC")
    col_nombre = _pick("Nombre del Contribuyente", "Nombre")
    col_estatus = _pick("Situación del contribuyente", "Situacion del contribuyente")

    col_pres_sat = _pick(
        "Publicación página SAT presuntos",
        "Publicacion pagina SAT presuntos",
    )
    col_pres_dof = _pick("Publicación DOF presuntos", "Publicacion DOF presuntos")
    col_def_sat = _pick(
        "Publicación página SAT definitivos",
        "Publicacion pagina SAT definitivos",
        "Publicación SAT definitivos",
    )
    col_def_dof = _pick("Publicación DOF definitivos", "Publicacion DOF definitivos")

    if not (col_rfc and col_nombre and col_estatus):
        raise RuntimeError(
            f"Esquema inesperado en CSV. Columnas detectadas: {list(df.columns)}"
        )

    log.info(
        "Columnas mapeadas: rfc=%r · nombre=%r · estatus=%r · pres_sat=%r · pres_dof=%r · def_sat=%r · def_dof=%r",
        col_rfc, col_nombre, col_estatus, col_pres_sat, col_pres_dof, col_def_sat, col_def_dof,
    )

    out = pd.DataFrame()
    out["rfc"] = df[col_rfc].map(_normalize_rfc)
    out["contribuyente"] = df[col_nombre].astype("string").str.strip()
    out["estatus"] = df[col_estatus].map(_norm_estatus)

    # Fecha presunción: lo más temprano disponible (preferentemente DOF, sino SAT)
    pres_dof = df[col_pres_dof].map(_parse_date) if col_pres_dof else pd.Series([None] * len(df))
    pres_sat = df[col_pres_sat].map(_parse_date) if col_pres_sat else pd.Series([None] * len(df))
    out["fecha_presuncion"] = [
        _coalesce(a, b) for a, b in zip(pres_sat, pres_dof, strict=False)
    ]

    # Fecha publicación: para definitivos, fecha de definitivo; sino misma que presunción
    def_dof = df[col_def_dof].map(_parse_date) if col_def_dof else pd.Series([None] * len(df))
    def_sat = df[col_def_sat].map(_parse_date) if col_def_sat else pd.Series([None] * len(df))
    out["fecha_publicacion"] = [
        _coalesce(d_dof, d_sat, p) for d_dof, d_sat, p in zip(def_dof, def_sat, out["fecha_presuncion"], strict=False)
    ]

    # Trace metadata
    out["fuente_url"] = URL
    out["snapshot_fecha"] = datetime.now().date()

    # Drop rows without RFC or estatus (junk)
    before = len(out)
    out = out.dropna(subset=["rfc", "estatus"]).reset_index(drop=True)
    log.info("Filas válidas tras filtro: %d (descartadas %d sin RFC/estatus)", len(out), before - len(out))

    # Cast date columns properly
    out["fecha_presuncion"] = pd.to_datetime(out["fecha_presuncion"], errors="coerce")
    out["fecha_publicacion"] = pd.to_datetime(out["fecha_publicacion"], errors="coerce")
    out["snapshot_fecha"] = pd.to_datetime(out["snapshot_fecha"], errors="coerce")

    # Stats
    counts = out["estatus"].value_counts()
    log.info("Mix de estatus:")
    for k, v in counts.items():
        log.info("  %-22s %6d", k, v)
    log.info("Total registros: %d · RFCs únicos: %d", len(out), out["rfc"].nunique())

    write_parquet(out, "sat_efos")


if __name__ == "__main__":
    main()
