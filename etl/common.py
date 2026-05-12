"""Shared helpers for the México Bajo Lupa ETL.

Each fuente script imports from here. Goal: keep the ETL boring, traceable,
and easy to debug when a source changes its schema.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd
import requests
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
WEB_DATA = ROOT / "web" / "public" / "data"

for d in (DATA_RAW, DATA_PROCESSED, WEB_DATA):
    d.mkdir(parents=True, exist_ok=True)


def setup_logging(name: str) -> logging.Logger:
    logging.basicConfig(
        level=os.getenv("ETL_LOG_LEVEL", "INFO"),
        format="%(asctime)s · %(name)s · %(levelname)s · %(message)s",
    )
    return logging.getLogger(name)


# === Estado canonical map ===
# Single source of truth: INEGI 2-digit code (CVE_ENT) + canonical name.
# Other variants (case, accents, abbreviations) all collapse here.

ESTADOS = [
    ("01", "Aguascalientes"),
    ("02", "Baja California"),
    ("03", "Baja California Sur"),
    ("04", "Campeche"),
    ("05", "Coahuila de Zaragoza"),
    ("06", "Colima"),
    ("07", "Chiapas"),
    ("08", "Chihuahua"),
    ("09", "Ciudad de México"),
    ("10", "Durango"),
    ("11", "Guanajuato"),
    ("12", "Guerrero"),
    ("13", "Hidalgo"),
    ("14", "Jalisco"),
    ("15", "México"),
    ("16", "Michoacán de Ocampo"),
    ("17", "Morelos"),
    ("18", "Nayarit"),
    ("19", "Nuevo León"),
    ("20", "Oaxaca"),
    ("21", "Puebla"),
    ("22", "Querétaro"),
    ("23", "Quintana Roo"),
    ("24", "San Luis Potosí"),
    ("25", "Sinaloa"),
    ("26", "Sonora"),
    ("27", "Tabasco"),
    ("28", "Tamaulipas"),
    ("29", "Tlaxcala"),
    ("30", "Veracruz de Ignacio de la Llave"),
    ("31", "Yucatán"),
    ("32", "Zacatecas"),
]


def _normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", unidecode(str(s)).lower())


_ALIASES: dict[str, str] = {}


def _build_aliases() -> None:
    if _ALIASES:
        return
    extras = {
        "01": ["aguascalientes", "ags"],
        "02": ["bajacalifornia", "bc", "bajacalifornianorte"],
        "03": ["bajacaliforniasur", "bcs"],
        "04": ["campeche", "camp"],
        "05": ["coahuila", "coahuiladezaragoza", "coah"],
        "06": ["colima", "col"],
        "07": ["chiapas", "chis"],
        "08": ["chihuahua", "chih"],
        "09": [
            "ciudaddemexico",
            "cdmx",
            "df",
            "distritofederal",
        ],
        "10": ["durango", "dgo"],
        "11": ["guanajuato", "gto"],
        "12": ["guerrero", "gro"],
        "13": ["hidalgo", "hgo"],
        "14": ["jalisco", "jal"],
        "15": [
            "mexico",
            "edomex",
            "estadodemexico",
            "edodemexico",
            "edomexico",
            "mex",
        ],
        "16": ["michoacan", "michoacandeocampo", "mich"],
        "17": ["morelos", "mor"],
        "18": ["nayarit", "nay"],
        "19": ["nuevoleon", "nl"],
        "20": ["oaxaca", "oax"],
        "21": ["puebla", "pue"],
        "22": ["queretaro", "queretarodearteaga", "qro"],
        "23": ["quintanaroo", "qroo"],
        "24": ["sanluispotosi", "slp"],
        "25": ["sinaloa", "sin"],
        "26": ["sonora", "son"],
        "27": ["tabasco", "tab"],
        "28": ["tamaulipas", "tamps", "tams"],
        "29": ["tlaxcala", "tlax"],
        "30": ["veracruz", "veracruzdeignaciodelallave", "ver"],
        "31": ["yucatan", "yuc"],
        "32": ["zacatecas", "zac"],
    }
    for cve, name in ESTADOS:
        _ALIASES[_normalize(name)] = cve
        for a in extras.get(cve, []):
            _ALIASES[_normalize(a)] = cve
        _ALIASES[cve] = cve
        _ALIASES[str(int(cve))] = cve


def to_cve_ent(value: object) -> str | None:
    """Resolve any state spelling/code into a padded INEGI CVE_ENT or None."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    _build_aliases()
    raw = str(value).strip()
    # If numeric, pad to 2 digits
    if raw.isdigit():
        n = int(raw)
        if 1 <= n <= 32:
            return f"{n:02d}"
        return None
    return _ALIASES.get(_normalize(raw))


# === HTTP download with cache ===

@dataclass
class DownloadSpec:
    url: str
    filename: str
    sha_hint: str | None = None


def http_download(spec: DownloadSpec, *, force: bool = False) -> Path:
    target = DATA_RAW / spec.filename
    if target.exists() and not force:
        return target
    log = setup_logging("http")
    log.info("Descargando %s → %s", spec.url, target)
    with requests.get(spec.url, stream=True, timeout=120) as r:
        r.raise_for_status()
        target.write_bytes(r.content)
    return target


# === Parquet writer ===

def write_parquet(df: pd.DataFrame, name: str) -> Path:
    """Write a Parquet file in BOTH /data/processed (for inspection) and
    /web/public/data (for browser DuckDB-WASM consumption)."""
    p1 = DATA_PROCESSED / f"{name}.parquet"
    p2 = WEB_DATA / f"{name}.parquet"
    df.to_parquet(p1, index=False, compression="zstd")
    df.to_parquet(p2, index=False, compression="zstd")
    log = setup_logging("parquet")
    log.info("Escrito %s (%d filas) → %s · %s", name, len(df), p1, p2)
    return p2


# === Generic helpers ===

def coalesce_columns(df: pd.DataFrame, candidates: Iterable[str]) -> str | None:
    """Return the first column from `candidates` that exists in df.columns."""
    norm_cols = {_normalize(c): c for c in df.columns}
    for c in candidates:
        n = _normalize(c)
        if n in norm_cols:
            return norm_cols[n]
    return None
