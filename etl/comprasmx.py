"""ComprasMX · Contratos federales (APF).

Source:
  https://comprasmx.buengobierno.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/
  - Contratos_CompraNet2024.csv
  - Contratos_CompraNet2025.csv

Output:
  data/processed/comprasmx_contratos.parquet
  web/public/data/comprasmx_contratos.parquet

Schema (out):
  contrato_id     str   "Código del contrato" original
  expediente_id   str   "Código del expediente"
  ramo            str   "Descripción Ramo" (e.g. DEFENSA NACIONAL)
  institucion     str   nombre de la dependencia (UC)
  modalidad       str   normalizado: LP / I3P / AD / OTRA
  modalidad_raw   str   string original
  monto           float MXN — usa "Importe DRC" si existe, else "Monto sin imp./máximo"
  moneda          str
  fecha_firma     date
  proveedor       str
  rfc_proveedor   str
  descripcion     str
  primer_digito   int   1..9 — para Benford
  ano             int

Notes:
- ComprasMX federal NO desagrega por entidad federativa — es gasto federal
  centralizado. Para cruzar con mapas estatales, V3+ debe agregar fuentes
  estatales (compranetestado.* o portales locales).
- Encoding latin-1 confirmado.

Run:
  python etl/comprasmx.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    DownloadSpec,
    coalesce_columns,
    http_download,
    setup_logging,
    to_cve_ent,
    write_parquet,
)

log = setup_logging("comprasmx")

# Coverage status (verified 2026-05-06):
#   - 2024 and 2025 CSVs are live (each ~120MB).
#   - 2026 URL returned HTTP 404 as of 2026-05-06. ComprasMX usually publishes
#     the full year aggregate after Q1 close — keep it in the list so the
#     downloader picks it up automatically once the file appears (a 404 is
#     logged as a warning, never breaks the pipeline).
URLS = [
    (
        "Contratos_CompraNet2024.csv",
        "https://comprasmx.buengobierno.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet2024.csv",
    ),
    (
        "Contratos_CompraNet2025.csv",
        "https://comprasmx.buengobierno.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet2025.csv",
    ),
    (
        "Contratos_CompraNet2026.csv",
        "https://comprasmx.buengobierno.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet2026.csv",
    ),
]


def _read(path: Path) -> pd.DataFrame:
    # ComprasMX uses latin-1
    return pd.read_csv(path, encoding="latin-1", low_memory=False, dtype=str)


def _normalize_modalidad(raw: str | None) -> str:
    if not raw or pd.isna(raw):
        return "OTRA"
    s = raw.upper()
    if "LICITACI" in s and "P" in s:
        return "LP"  # Licitación Pública
    if "INVITACI" in s and "3" in s:
        return "I3P"  # Invitación a 3 personas
    if "ADJUDICACI" in s:
        return "AD"  # Adjudicación Directa
    return "OTRA"


def _normalize_one(df: pd.DataFrame, year_hint: int | None) -> pd.DataFrame:
    col_id = coalesce_columns(df, ["Codigo del contrato", "Código del contrato"])
    col_exp = coalesce_columns(df, ["Codigo del expediente", "Código del expediente"])
    col_ramo = coalesce_columns(df, ["Descripcion Ramo", "Descripción Ramo"])
    col_inst = coalesce_columns(df, ["Institucion", "Institución", "Nombre de la UC"])
    col_modalidad = coalesce_columns(df, ["Tipo Procedimiento", "TIPO_PROCEDIMIENTO"])
    col_imp_drc = coalesce_columns(df, ["Importe DRC"])
    col_imp_max = coalesce_columns(
        df,
        ["Monto sin imp./maximo", "Monto sin imp./máximo", "IMPORTE_CONTRATO"],
    )
    col_imp_min = coalesce_columns(
        df,
        ["Monto sin imp./minimo", "Monto sin imp./mínimo"],
    )
    col_moneda = coalesce_columns(df, ["Moneda"])
    col_fecha = coalesce_columns(
        df,
        ["Fecha firma contrato", "Fecha de firma del contrato"],
    )
    col_prov = coalesce_columns(df, ["Proveedor o contratista", "PROVEEDOR"])
    col_rfc = coalesce_columns(df, ["rfc", "RFC"])
    col_desc = coalesce_columns(df, ["Descripcion del contrato", "Descripción del contrato"])

    if not (col_modalidad and (col_imp_drc or col_imp_max or col_imp_min)):
        raise RuntimeError(
            f"Esquema inesperado en CSV. Columnas: {list(df.columns)[:20]}..."
        )

    out = pd.DataFrame()
    out["contrato_id"] = df[col_id] if col_id else None
    out["expediente_id"] = df[col_exp] if col_exp else None
    out["ramo"] = df[col_ramo] if col_ramo else None
    out["institucion"] = df[col_inst] if col_inst else None
    out["modalidad_raw"] = df[col_modalidad]
    out["modalidad"] = df[col_modalidad].map(_normalize_modalidad)

    # Classify orden de gobierno: if the ramo resolves to a CVE_ENT (i.e., the
    # ramo name *is* a state), the contract is estatal. Otherwise federal/APF.
    # This catches the ~12k estatal contracts that the CSV bundles in.
    if col_ramo is not None:
        ramo_cve = df[col_ramo].map(to_cve_ent)
        out["cve_ent"] = ramo_cve
        out["orden_gobierno"] = ramo_cve.where(
            ramo_cve.isna(), "ESTATAL"
        ).fillna("FEDERAL")
    else:
        out["cve_ent"] = None
        out["orden_gobierno"] = "FEDERAL"

    # Pick best monto column: Importe DRC > Monto sin imp./máximo > min
    monto_str = None
    for c in (col_imp_drc, col_imp_max, col_imp_min):
        if c is not None:
            s = df[c].astype("string").fillna("")
            if monto_str is None:
                monto_str = s
            else:
                monto_str = monto_str.where(monto_str.str.len() > 0, s)
    out["monto"] = pd.to_numeric(
        monto_str.str.replace(r"[^\d.\-]", "", regex=True),
        errors="coerce",
    )

    out["moneda"] = df[col_moneda] if col_moneda else "MXN"
    out["fecha_firma"] = (
        pd.to_datetime(df[col_fecha], errors="coerce") if col_fecha else pd.NaT
    )
    out["proveedor"] = df[col_prov] if col_prov else None
    out["rfc_proveedor"] = df[col_rfc] if col_rfc else None
    out["descripcion"] = df[col_desc] if col_desc else None

    # Año: prefer fecha_firma, else hint from filename
    out["ano"] = (
        out["fecha_firma"].dt.year.astype("Int64").fillna(year_hint or 0).astype("Int64")
    )

    return out


def main() -> None:
    pieces: list[pd.DataFrame] = []
    for fname, url in URLS:
        try:
            path = http_download(DownloadSpec(url=url, filename=fname))
        except Exception as e:  # noqa: BLE001
            log.warning("Saltando %s (%s)", url, e)
            continue
        df = _read(path)
        log.info("Leídas %d filas de %s", len(df), fname)
        # Year hint from filename
        yh = None
        for tok in fname.replace(".", " ").split():
            if tok.isdigit() and len(tok) == 4:
                yh = int(tok)
                break
        pieces.append(_normalize_one(df, yh))

    if not pieces:
        log.error(
            "No pude descargar ningún CSV. Visita "
            "https://comprasmx.buengobierno.gob.mx/ y descarga "
            "manualmente a data/raw/."
        )
        return

    combined = pd.concat(pieces, ignore_index=True)

    # Primer dígito significativo para Benford
    def _first_digit(x: float) -> int | None:
        if pd.isna(x) or x < 1:
            return None
        s = str(int(abs(x)))
        return int(s[0]) if s and s[0].isdigit() and s[0] != "0" else None

    combined["primer_digito"] = combined["monto"].map(_first_digit).astype("Int64")

    # Stats for log
    n_total = len(combined)
    n_with_monto = combined["monto"].notna().sum()
    n_with_dig = combined["primer_digito"].notna().sum()
    n_estatal = (combined["orden_gobierno"] == "ESTATAL").sum()
    n_federal = (combined["orden_gobierno"] == "FEDERAL").sum()
    pct_ad = (combined["modalidad"] == "AD").sum() / n_total * 100
    pct_lp = (combined["modalidad"] == "LP").sum() / n_total * 100
    log.info(
        "Filas combinadas: %d · con monto: %d · con primer_digito: %d",
        n_total, n_with_monto, n_with_dig,
    )
    log.info(
        "Orden de gobierno: FEDERAL=%d · ESTATAL=%d (estos últimos se reservan para V4)",
        n_federal, n_estatal,
    )
    log.info(
        "Mix modalidades: AD=%.1f%% · LP=%.1f%% · I3P=%.1f%%",
        pct_ad, pct_lp,
        (combined["modalidad"] == "I3P").sum() / n_total * 100,
    )
    write_parquet(combined, "comprasmx_contratos")


if __name__ == "__main__":
    main()
