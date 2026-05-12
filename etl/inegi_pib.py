"""INEGI · PIB por Entidad Federativa (PIBE).

Source: comunicado de prensa anual del INEGI (formato PDF tabular). El INEGI
publica cada diciembre el PIBE del año previo (a año base 2018). El PDF contiene
una tabla con dos años consecutivos: el año T y T-1. Esto nos da los datos más
recientes (incluyendo el año T sin tener que esperar a la zip de datos abiertos
que INEGI suele tardar más en publicar).

URL canónica (la que se actualiza cada diciembre):
  https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/pibent/PIBE2024_CP.pdf

Estrategia:
  1. Bajar el PDF (cacheable en data/raw).
  2. Extraer texto con pypdf y parsear el cuadro 1 con regex sobre nombres
     canónicos de estado (los conocemos: ESTADOS).
  3. Producir parquet con `pib_total` en pesos (convirtiendo de "miles de
     millones de pesos a precios de 2018"), por estado, por año.

Salida:
  data/processed/inegi_pib.parquet
  web/public/data/inegi_pib.parquet

Schema:
  cve_ent  str
  estado   str
  ano      int
  pib_total float   (pesos a precios de 2018, valor real)

Notas:
  - "miles de millones de pesos" → multiplicar por 1e9.
  - Si en años futuros el INEGI cambia URL, basta editar `URLS` con el PDF
    nuevo. Si no podés bajarlo automáticamente, descargalo manualmente a
    data/raw/inegi_pibe_<ano>_cp.pdf y volvé a correr el script.

Run:
  python etl/inegi_pib.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    DATA_RAW,
    DownloadSpec,
    ESTADOS,
    http_download,
    setup_logging,
    to_cve_ent,
    write_parquet,
)

log = setup_logging("inegi-pib")

# Mantener este array ordenado: el primero es el más reciente (lo usamos primero).
# Cada año se publica un PDF nuevo en diciembre.
URLS = [
    DownloadSpec(
        url="https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/pibent/PIBE2024_CP.pdf",
        filename="inegi_pibe_2024_cp.pdf",
    ),
    # Si querés sumar histórico 2022/2023, descomentá:
    # DownloadSpec(
    #     url="https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2024/PIBEF/PIBEF2023.pdf",
    #     filename="inegi_pibe_2023_cp.pdf",
    # ),
]

# Lista canónica con variantes que aparecen en el PDF
# (con/sin "de Zaragoza", "de Ocampo", "de Ignacio de la Llave", etc.)
ESTADO_PATTERNS = [
    ("01", "Aguascalientes", r"Aguascalientes"),
    ("02", "Baja California", r"Baja California(?! Sur)"),
    ("03", "Baja California Sur", r"Baja California Sur"),
    ("04", "Campeche", r"Campeche"),
    ("05", "Coahuila de Zaragoza", r"Coahuila(?: de Zaragoza)?"),
    ("06", "Colima", r"Colima"),
    ("07", "Chiapas", r"Chiapas"),
    ("08", "Chihuahua", r"Chihuahua"),
    ("09", "Ciudad de México", r"Ciudad de M[ée]xico"),
    ("10", "Durango", r"Durango"),
    ("11", "Guanajuato", r"Guanajuato"),
    ("12", "Guerrero", r"Guerrero"),
    ("13", "Hidalgo", r"Hidalgo"),
    ("14", "Jalisco", r"Jalisco"),
    # 'México' (estado) aparece al inicio de línea, después del renglón de Jalisco.
    # Para no chocar con 'Ciudad de México' o 'Estados Unidos Mexicanos', exigimos
    # que el match esté precedido por inicio-de-línea o newline.
    ("15", "México", r"(?:^|\n)M[ée]xico"),
    ("16", "Michoacán de Ocampo", r"Michoac[áa]n(?: de Ocampo)?"),
    ("17", "Morelos", r"Morelos"),
    ("18", "Nayarit", r"Nayarit"),
    ("19", "Nuevo León", r"Nuevo Le[óo]n"),
    ("20", "Oaxaca", r"Oaxaca"),
    ("21", "Puebla", r"Puebla"),
    ("22", "Querétaro", r"Quer[ée]taro(?: de Arteaga)?"),
    ("23", "Quintana Roo", r"Quintana Roo"),
    ("24", "San Luis Potosí", r"San Luis Potos[íi]"),
    ("25", "Sinaloa", r"Sinaloa"),
    ("26", "Sonora", r"Sonora"),
    ("27", "Tabasco", r"Tabasco"),
    ("28", "Tamaulipas", r"Tamaulipas"),
    ("29", "Tlaxcala", r"Tlaxcala"),
    ("30", "Veracruz de Ignacio de la Llave", r"Veracruz(?: de Ignacio de la Llave)?"),
    ("31", "Yucatán", r"Yucat[áa]n"),
    ("32", "Zacatecas", r"Zacatecas"),
]


def parse_pibe_pdf(pdf_path: Path) -> pd.DataFrame:
    """Extrae la tabla 'PIB a precios de mercado' del comunicado del INEGI.

    El cuadro tiene este shape (por estado):
        <Entidad>  <PIB t-1>  <PIB t>  <Var%>  <ISPN t-1>  <ISPN t>  <Var%>  <VAB t-1>  <VAB t>  <Var%>

    Los valores de PIB están en miles de millones de pesos (precios 2018).
    Tomamos los dos primeros números numéricos después del nombre del estado
    como el PIB del año anterior y el año actual.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        raise SystemExit(
            "Falta pypdf. Instalá: pip install pypdf"
        )

    text = ""
    reader = PdfReader(str(pdf_path))
    for p in reader.pages:
        text += "\n" + p.extract_text()

    # Detectar los dos años de la tabla (e.g. "2023 2024 Variación")
    year_match = re.search(r"\b(20\d{2})\s+(20\d{2})\s+Variaci", text)
    if not year_match:
        # fallback: tomar del nombre del archivo (ej. inegi_pibe_2024_cp.pdf → 2024)
        m = re.search(r"(20\d{2})", pdf_path.name)
        if not m:
            raise RuntimeError(f"No pude detectar años en {pdf_path}")
        ano_curr = int(m.group(1))
        ano_prev = ano_curr - 1
    else:
        ano_prev = int(year_match.group(1))
        ano_curr = int(year_match.group(2))

    log.info("Años detectados: prev=%d curr=%d", ano_prev, ano_curr)

    # Token de número con posible separador de miles (espacio)
    # Ej: "334", "1 992", "12 345" (no captura decimales en columnas de PIB)
    NUM = r"\d{1,3}(?:\s\d{3})*"

    rows = []
    for cve, nombre, pat in ESTADO_PATTERNS:
        # Línea esperada (PIB t-1, PIB t, var, ISPN t-1, ISPN t, var, VAB t-1, VAB t, var):
        #   "Aguascalientes    334    328 -1.9    22    21 -1.5    313    307 -1.9"
        # Tomamos los dos primeros enteros (PIB).
        regex = rf"{pat}\s+({NUM})\s+({NUM})\s+(-?\d+\.\d+)"
        m = re.search(regex, text)
        if not m:
            log.warning("No encontré PIB para %s (%s)", nombre, cve)
            continue
        pib_prev_raw = m.group(1).replace(" ", "")
        pib_curr_raw = m.group(2).replace(" ", "")
        try:
            pib_prev = float(pib_prev_raw)
            pib_curr = float(pib_curr_raw)
        except ValueError:
            log.warning("Parse fallido %s: '%s' '%s'", nombre, pib_prev_raw, pib_curr_raw)
            continue

        # PIB en miles de millones de pesos → pesos
        # 1 mil millón = 1e9; "X miles de millones" = X * 1e9
        rows.append(
            {
                "cve_ent": cve,
                "estado": nombre,
                "ano": ano_prev,
                "pib_total": pib_prev * 1e9,
            }
        )
        rows.append(
            {
                "cve_ent": cve,
                "estado": nombre,
                "ano": ano_curr,
                "pib_total": pib_curr * 1e9,
            }
        )

    if not rows:
        raise RuntimeError(f"No se extrajo ninguna fila de {pdf_path}")
    df = pd.DataFrame(rows)
    log.info(
        "Parseadas %d filas de %d estados desde %s",
        len(df),
        df["cve_ent"].nunique(),
        pdf_path.name,
    )
    return df


def main() -> None:
    frames: list[pd.DataFrame] = []
    for spec in URLS:
        target = DATA_RAW / spec.filename
        if not target.exists():
            try:
                http_download(spec)
            except Exception as e:
                log.error("Falló descarga de %s: %s", spec.url, e)
                log.error(
                    "Descargá manualmente a %s y volvé a correr el script.",
                    target,
                )
                continue
        try:
            frames.append(parse_pibe_pdf(target))
        except Exception as e:
            log.error("Falló parseo de %s: %s", target, e)
            continue

    if not frames:
        raise SystemExit("No se pudo procesar ningún PDF de PIBE.")

    df = pd.concat(frames, ignore_index=True)
    # Si hay duplicados (mismo estado/año en dos PDFs) nos quedamos con el más reciente.
    df = df.drop_duplicates(subset=["cve_ent", "ano"], keep="last")

    # PIB per cápita placeholder (build_metrics lo recalcula con CONAPO real).
    df["pib_per_capita"] = pd.NA

    df = df.sort_values(["ano", "cve_ent"]).reset_index(drop=True)
    write_parquet(df[["cve_ent", "estado", "ano", "pib_total", "pib_per_capita"]], "inegi_pib")
    log.info(
        "PIB · estados=%d · años=%s · último=%d",
        df["cve_ent"].nunique(),
        sorted(df["ano"].unique().tolist()),
        int(df["ano"].max()),
    )


if __name__ == "__main__":
    main()
