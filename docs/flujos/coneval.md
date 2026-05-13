# Flujo · CONEVAL (pobreza multidimensional)

> La cifra de "pobreza" que aparece en el mapa, en cada dossier
> estatal y en el comparador sale de este pipeline. Es la
> medición oficial de CONEVAL — la metodología que distingue
> pobreza de pobreza extrema con seis indicadores de carencias.

## Diagrama end-to-end

```mermaid
flowchart TD
    A[CONEVAL · medición<br/>multidimensional<br/>página oficial 2022]
    B[(coneval_ae_estatal_2022.zip<br/>~4 MB contiene xlsx)]
    C[etl/coneval_pobreza.py<br/>unzip · openpyxl]
    D[Parser Excel<br/>anexo estadístico estatal<br/>32 filas x 4 mediciones]
    E[Normalizar nombres estado<br/>→ cve_ent<br/>filtrar 2022]
    F[(data/processed/<br/>coneval_pobreza.parquet<br/>32 filas)]
    G[etl/build_metrics.py<br/>join por cve_ent]
    H[estado_metrics.pobreza_pct<br/>pobreza_extrema_pct<br/>vulnerables_carencias_pct]
    I[/mapa métrica Economía<br/>/estado/&lsqb;slug&rsqb; cruces<br/>/compara]

    A -->|HTTP zip| B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
```

## Fuente

- **Oficial**: [coneval.org.mx · Medición multidimensional de la pobreza](https://www.coneval.org.mx/Medicion/Paginas/PobrezaInicio.aspx)
- **Año del dato**: **2022** (la medición se publica cada 2 años;
  2024 aún no está disponible al cierre de este flujo).
- **Cobertura**: 32 entidades federativas. Cuatro mediciones
  principales: pobreza, pobreza extrema, vulnerables por
  carencias, vulnerables por ingreso.

## Metodología CONEVAL (resumen)

CONEVAL define "pobreza" con seis indicadores de carencias
sociales (rezago educativo, acceso a servicios de salud, acceso
a seguridad social, calidad/espacios de vivienda, servicios
básicos en vivienda, acceso a alimentación) **+ ingreso por
debajo de la línea de bienestar**.

- **Pobreza**: 1+ carencias **Y** ingreso bajo línea bienestar.
- **Pobreza extrema**: 3+ carencias **Y** ingreso bajo línea
  bienestar mínimo (necesidad alimentaria).
- **Vulnerable por carencias**: 1+ carencias pero ingreso OK.
- **Vulnerable por ingreso**: 0 carencias pero ingreso bajo.

El sitio publica los porcentajes que CONEVAL reporta —
**no recalculamos las carencias**, eso requeriría procesar la
ENIGH cruda.

## Schema del Parquet (`coneval_pobreza.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `cve_ent` | str | clave INEGI |
| `estado` | str | nombre canónico |
| `ano` | int | 2022 |
| `pobreza_pct` | float | % de la población en situación de pobreza |
| `pobreza_extrema_pct` | float | % en pobreza extrema |
| `vulnerables_carencias_pct` | float | % vulnerables por carencias |

## Decisiones clave del ETL

1. **2022 fijo**: la medición es bienal y por ahora 2022 es lo
   último publicado. Cuando salga 2024, el ETL trae los dos años
   y el frontend usa el más reciente.
2. **Filtramos hogares con ingreso ≤ línea de bienestar**: este
   es el dato consolidado que CONEVAL ya publica, no
   recalculamos.
3. **Aprovechamos `openpyxl`**: el xlsx tiene celdas con merge y
   anotaciones; el parser apunta a las filas que sí tienen
   nombre de entidad federativa canónico.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **Chiapas 67.4% pobreza** (#1) | `/mapa` Economía, dossier Chiapas, `/compara` |
| **Guerrero 60.4%** (#2) | `/mapa`, dossier |
| **Oaxaca 58.4%** (#3) | `/mapa`, dossier |
| **Edomex 42.9%** | dossier Edomex (contraste con su gasto absoluto alto) |

## Cómo verificar

```python
import pandas as pd

df = pd.read_parquet("data/processed/coneval_pobreza.parquet")
print(df.sort_values("pobreza_pct", ascending=False).head(5))

# Ya cruzado a estado_metrics
em = pd.read_parquet("data/processed/estado_metrics.parquet")
print(em[["estado", "pobreza_pct", "ano_pobreza"]].sort_values(
    "pobreza_pct", ascending=False
).head(5))
```

## Fallos conocidos

- **2024 no disponible todavía**: la próxima medición saldrá
  probablemente en 2025. Cuando salga, el ETL traerá 2024 y el
  frontend usará el último disponible automáticamente.
- **Cambio de metodología 2018**: CONEVAL ajustó la línea de
  bienestar en 2016/2018; los datos anteriores no son
  estrictamente comparables. Por eso el sitio solo muestra 2022.

## Próximos pasos

- **Series 2008-2022**: agregar la historia desde 2008 permite
  trayectorias. Schema simple: solo agregar más años al mismo
  Parquet.
- **Desagregación urbano/rural**: CONEVAL publica el desglose;
  útil para narrativas tipo "Yucatán urbano vs Yucatán rural".
