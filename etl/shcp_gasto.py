"""SHCP · Gasto federalizado por entidad federativa.

Source: Transferencias del Gobierno Federal a Entidades Federativas (Ramo 28
Participaciones, Ramo 33 Aportaciones, Convenios y Subsidios). Es el recurso
"federalizado" que la SHCP transfiere mensualmente a cada estado.

URL canónica (datos.gob.mx · publicación SHCP, mensual):
  https://repodatos.atdt.gob.mx/api_update/secretaria_hacienda/transferencias_entidades_federativas_2011_actual/transferencias_entidades_fed_012026.csv

Schema fuente:
  ciclo (año), mes (Enero..Diciembre), clave_concepto, nombre, tema, subtema,
  sector, ambito, tipo_informacion, base_registro, unidad_medida (Miles de
  Pesos), periodo_inicio, periodo_final, frecuencia, difusion, monto

Estrategia:
  1. Bajar CSV (~75 MB · 250k filas · 2011 → mes en curso).
  2. Filtrar `nombre` que empieza con "<Entidad>: Total Gasto Federalizado" —
     fila pre-agregada por SHCP que contiene la suma del mes para cada estado.
  3. Excluir filas "No distribuible" y "Total" (nacionales · no son entidad).
  4. Sumar mensual → anual y producir parquet.

Salida:
  data/processed/shcp_gasto.parquet  (anual · 32 estados · 2011..ciclo actual)

Schema:
  cve_ent str
  estado  str
  ano     int
  gasto_federalizado_total float  (pesos · Miles de Pesos × 1000)

Notas:
  - Unidad fuente: "Miles de Pesos". Multiplicamos por 1000 → pesos.
  - El gasto per cápita lo recalcula `build_metrics.py` con CONAPO.
  - Si SHCP cambia URL, basta editar URLS o descargar manualmente a
    data/raw/shcp_transferencias.csv y volver a correr.

Run:
  python etl/shcp_gasto.py
"""

from __future__ import annotations

import sys
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

log = setup_logging("shcp-gasto")

URL = DownloadSpec(
    url=(
        "https://repodatos.atdt.gob.mx/api_update/secretaria_hacienda/"
        "transferencias_entidades_federativas_2011_actual/"
        "transferencias_entidades_fed_012026.csv"
    ),
    filename="shcp_transferencias.csv",
)

# Filas que NO son una entidad federativa real:
EXCLUDE_PREFIXES = {"No distribuible", "Total"}


def parse(csv_path: Path) -> pd.DataFrame:
    log.info("Leyendo %s …", csv_path)
    df = pd.read_csv(csv_path)
    log.info(
        "Cargado · filas=%d · ciclos=%s",
        len(df),
        sorted(df["ciclo"].unique().tolist()),
    )

    # Quedarse SOLO con la fila "<Entidad>: Total Gasto Federalizado" — la
    # SHCP la publica pre-agregada por estado, mes y año. Suma todos los
    # subtemas (Participaciones + Aportaciones + Convenios + Subsidios + RPSS).
    mask = df["nombre"].str.contains("Total Gasto Federalizado", na=False)
    tot = df[mask].copy()
    log.info("Filas Total Gasto Federalizado: %d", len(tot))

    # El nombre tiene formato "Entidad: Total Gasto Federalizado".
    tot["entidad_raw"] = tot["nombre"].str.split(":").str[0].str.strip()

    # Excluir nacionales/no-distribuibles
    tot = tot[~tot["entidad_raw"].isin(EXCLUDE_PREFIXES)].copy()
    log.info("Tras excluir No distribuible/Total: %d filas", len(tot))

    # Mapear a CVE_ENT canónico (común aliases: 'Distrito Federal' → 09;
    # 'México' → 15; abreviaciones como 'Coahuila', 'Michoacán', etc.).
    tot["cve_ent"] = tot["entidad_raw"].map(to_cve_ent)
    no_match = tot[tot["cve_ent"].isna()]
    if len(no_match):
        log.warning(
            "Entidades sin match a CVE_ENT (%d filas) — primeras únicas: %s",
            len(no_match),
            no_match["entidad_raw"].drop_duplicates().head(10).tolist(),
        )
    tot = tot.dropna(subset=["cve_ent"]).copy()

    # `monto` viene en MILES DE PESOS → convertir a pesos.
    tot["monto_pesos"] = pd.to_numeric(tot["monto"], errors="coerce").fillna(0) * 1000.0

    # Agregar por estado y año.
    annual = (
        tot.groupby(["cve_ent", "ciclo"], as_index=False)["monto_pesos"]
        .sum()
        .rename(columns={"ciclo": "ano", "monto_pesos": "gasto_federalizado_total"})
    )

    # Marcar año "completo": para 2026 sólo tenemos hasta el mes publicado.
    # Calculamos n_meses por (cve_ent, ano) para que build_metrics pueda usar
    # un criterio claro (sólo años con 12 meses para el ranking nacional).
    months_per_year = (
        tot.groupby(["cve_ent", "ciclo"])["mes"].nunique().reset_index()
        .rename(columns={"ciclo": "ano", "mes": "meses_reportados"})
    )
    annual = annual.merge(months_per_year, on=["cve_ent", "ano"], how="left")

    # Nombre canónico
    from common import ESTADOS

    nombre_map = dict(ESTADOS)
    annual["estado"] = annual["cve_ent"].map(nombre_map)

    annual = annual.sort_values(["ano", "cve_ent"]).reset_index(drop=True)
    return annual[["cve_ent", "estado", "ano", "gasto_federalizado_total", "meses_reportados"]]


def main() -> None:
    target = DATA_RAW / URL.filename
    if not target.exists():
        try:
            http_download(URL)
        except Exception as e:
            log.error("Falló descarga: %s", e)
            log.error(
                "Descargá manualmente desde:\n  %s\ny poné el archivo en %s",
                URL.url,
                target,
            )
            raise SystemExit(1) from e

    df = parse(target)

    last_full_year = int(df[df["meses_reportados"] >= 12]["ano"].max())
    log.info(
        "SHCP · estados=%d · años=%s · último completo=%d",
        df["cve_ent"].nunique(),
        sorted(df["ano"].unique().tolist()),
        last_full_year,
    )

    # Sanity check: 2024 nacional debería ser ~2.5 billones MXN
    snapshot = df[df["ano"] == last_full_year]
    nacional = snapshot["gasto_federalizado_total"].sum() / 1e12
    log.info(
        "Total nacional %d: %.3f billones MXN (%d estados)",
        last_full_year,
        nacional,
        len(snapshot),
    )

    write_parquet(df, "shcp_gasto")


if __name__ == "__main__":
    main()
