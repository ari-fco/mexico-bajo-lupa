"""ComprasMX · Histórico CompraNet 5.0 (2010-2022).

Source:
  https://www.datos.gob.mx/dataset/contratos_expedientes_sistema_historico_compranet

Direct CSV (verificado 2026-05-08):
  https://repodatos.atdt.gob.mx/api_update/sabg/
    contratos_expedientes_sistema_historico_compranet/compranet_historico.csv
  Tamaño: 951 MB · 2.2M procedimientos según comunicación oficial.

Schema legacy (NO igual al CompraNet 2024+):
  codigo_contrato, codigo_expediente, proveedor, titulo_contrato,
  descripcion_contrato, contract_type, work_category_id, tipo_contratacion,
  tipo_expediente, importe, moneda, fecha_inicio, fecha_fin, project_code,
  ff_fecha_inicio, ff_fecha_fin

Mapeo a nuestro shape canónico:
  codigo_contrato → contrato_id
  codigo_expediente → expediente_id
  proveedor → proveedor (no hay RFC)
  titulo_contrato + descripcion_contrato → descripcion
  tipo_expediente → modalidad_raw + modalidad (parsear "05. Adjudicación Directa…")
  importe → monto
  moneda → moneda
  ff_fecha_inicio → fecha_firma (fallback fecha_inicio)
  contract_type → ramo (best-effort, no es exactamente lo mismo)

Ojo: el histórico NO tiene columna de Institución/Dependencia ni Ramo
explícito. Esto significa que NO podemos derivar orden_gobierno
(FEDERAL/ESTATAL) por ramo == nombre de estado como en el CSV moderno.
Se etiqueta TODO como FEDERAL_HIST y se documenta la limitación.

Output:
  data/processed/comprasmx_historico.parquet
  (NO se escribe a web/public/data — el archivo sería >100MB y no se usa
  desde el frontend directamente; queda como store canónico para análisis)

Run:
  python etl/comprasmx_historico.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    DATA_PROCESSED,
    setup_logging,
)

log = setup_logging("comprasmx-hist")

# Modalidad parser para tipo_expediente legacy:
# Ejemplos del CSV: "05. Adjudicación Directa LAASSP",
# "01. Licitación Pública LAASSP", "03. Invitación a Cuando Menos Tres Personas"
def _parse_modalidad(raw: str | None) -> str:
    if not raw or pd.isna(raw):
        return "OTRA"
    s = str(raw).upper()
    # Orden importa: chequear adjudicación primero (más específico)
    if "ADJUDICACI" in s:
        return "AD"
    # Licitación pública (con o sin acento, con espacio o sin)
    if "LICITACI" in s and "PUBLIC" in s.replace("Ú", "U"):
        return "LP"
    if "INVITACI" in s and ("3" in s or "TRES" in s):
        return "I3P"
    return "OTRA"


def _first_digit(x: float) -> int | None:
    if pd.isna(x) or x < 1:
        return None
    s = str(int(abs(x)))
    return int(s[0]) if s and s[0].isdigit() and s[0] != "0" else None


def _read_csv_resilient(path: Path, **kwargs) -> pd.DataFrame:
    last_err = None
    for enc in ("latin-1", "utf-8", "cp1252"):
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False, dtype=str, **kwargs)
        except Exception as e:  # noqa: BLE001
            last_err = e
    raise RuntimeError(f"No pude leer {path}: {last_err}")


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Mapea schema legacy CompraNet 5.0 al shape canónico del proyecto."""
    log.info("Filas raw: %d · cols: %d", len(df), len(df.columns))

    out = pd.DataFrame()
    out["contrato_id"] = df.get("codigo_contrato")
    out["expediente_id"] = df.get("codigo_expediente")
    # ramo: el legacy no tiene ramo/dependencia. Usamos contract_type como
    # categoría aproximada (Servicios / Obras / Bienes) — distinto al ramo
    # actual. Se documenta en metadata.
    out["ramo"] = df.get("contract_type")
    out["institucion"] = None  # NO disponible en legacy
    out["modalidad_raw"] = df.get("tipo_expediente")
    out["modalidad"] = df.get("tipo_expediente").map(_parse_modalidad)

    # Monto
    importe = df.get("importe")
    if importe is not None:
        out["monto"] = pd.to_numeric(
            importe.astype("string").str.replace(r"[^\d.\-]", "", regex=True),
            errors="coerce",
        )
    else:
        out["monto"] = pd.NA

    out["moneda"] = df.get("moneda")

    # Fecha firma: preferir ff_fecha_inicio (más limpio) sobre fecha_inicio
    ff = df.get("ff_fecha_inicio")
    fi = df.get("fecha_inicio")
    out["fecha_firma"] = pd.to_datetime(ff, errors="coerce")
    fallback_mask = out["fecha_firma"].isna() & fi.notna() if fi is not None else None
    if fallback_mask is not None and fallback_mask.any():
        out.loc[fallback_mask, "fecha_firma"] = pd.to_datetime(
            fi[fallback_mask], errors="coerce", utc=True,
        ).dt.tz_localize(None)

    out["proveedor"] = df.get("proveedor")
    out["rfc_proveedor"] = None  # NO disponible en legacy

    # Descripcion combinada
    titulo = df.get("titulo_contrato")
    desc = df.get("descripcion_contrato")
    if titulo is not None and desc is not None:
        out["descripcion"] = titulo.fillna("") + " — " + desc.fillna("")
        out["descripcion"] = out["descripcion"].str.strip(" —")
    elif titulo is not None:
        out["descripcion"] = titulo
    else:
        out["descripcion"] = desc

    out["cve_ent"] = None  # legacy no permite inferir
    out["orden_gobierno"] = "FEDERAL_HIST"  # marca explícita
    out["ano"] = out["fecha_firma"].dt.year.astype("Int64")
    out["primer_digito"] = out["monto"].map(_first_digit).astype("Int64")

    return out


def main() -> None:
    target = DATA_PROCESSED.parent / "raw" / "compranet_historico.csv"
    if not target.exists():
        raise SystemExit(
            f"Falta {target}. Bajalo manual de "
            "https://repodatos.atdt.gob.mx/api_update/sabg/"
            "contratos_expedientes_sistema_historico_compranet/compranet_historico.csv"
        )

    log.info("Cargando CSV (%.1f MB) en chunks…",
             target.stat().st_size / 1024 / 1024)

    # Pandas read_csv full puede consumir demasiada RAM. Chunkeamos.
    # Encoding: este CSV es UTF-8 (NO latin-1 como el comprasmx 2024+).
    chunks: list[pd.DataFrame] = []
    chunk_size = 500_000
    total_rows = 0
    for i, chunk in enumerate(
        pd.read_csv(
            target,
            encoding="utf-8",
            low_memory=False,
            dtype=str,
            chunksize=chunk_size,
        )
    ):
        norm = _normalize(chunk)
        chunks.append(norm)
        total_rows += len(chunk)
        log.info("Chunk %d procesado · acumulado %d filas", i + 1, total_rows)

    log.info("Concatenando %d chunks…", len(chunks))
    out = pd.concat(chunks, ignore_index=True)

    log.info(
        "Total filas=%d · con monto=%d · años %s → %s",
        len(out),
        out["monto"].notna().sum(),
        int(out["ano"].min()) if out["ano"].notna().any() else "?",
        int(out["ano"].max()) if out["ano"].notna().any() else "?",
    )
    log.info(
        "Mix modalidades: AD=%.1f%% · LP=%.1f%% · I3P=%.1f%% · OTRA=%.1f%%",
        (out["modalidad"] == "AD").mean() * 100,
        (out["modalidad"] == "LP").mean() * 100,
        (out["modalidad"] == "I3P").mean() * 100,
        (out["modalidad"] == "OTRA").mean() * 100,
    )

    # Solo a data/processed (NO a web/public — pesa demasiado para el navegador).
    out_path = DATA_PROCESSED / "comprasmx_historico.parquet"
    out.to_parquet(out_path, index=False, compression="zstd")
    log.info("Escrito %s (%.1f MB)",
             out_path, out_path.stat().st_size / 1024 / 1024)


if __name__ == "__main__":
    main()
