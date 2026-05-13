# Flujo · Métricas por estado (`build_metrics.py`)

> El crossroads del proyecto. Cruza SESNSP, CONAPO, INEGI PIB,
> CONEVAL, SHCP y ComprasMX estatal por `cve_ent` y produce la
> tabla maestra `estado_metrics.parquet` que alimenta casi toda
> la UI.

## Diagrama del cruce

```mermaid
flowchart TD
    A1[(sesnsp_estatal<br/>413,952 filas)]
    A2[(conapo_poblacion<br/>1,632 filas)]
    A3[(inegi_pib<br/>64 filas)]
    A4[(coneval_pobreza<br/>32 filas)]
    A5[(shcp_gasto<br/>512 filas)]
    A6[(comprasmx_contratos<br/>235,392 filas)]

    B1[Agregar SESNSP<br/>filtrar Homicidio doloso<br/>últ 12 meses por cve_ent]
    B2[Filtrar CONAPO<br/>ano = SESNSP_LAST_YEAR]
    B3[Filtrar PIB<br/>último año disponible]
    B4[Filtrar CONEVAL<br/>ano = 2022]
    B5[Filtrar SHCP<br/>último año completo]
    B6[Filtrar ComprasMX<br/>ambito = ESTATAL<br/>agregar por cve_ent]

    C[merge sucesivo<br/>todos sobre cve_ent]
    D[Calcular derivadas<br/>homicidios_100k pib_per_capita<br/>gasto_federalizado_per_capita<br/>cambio_yoy riesgo percentil]
    E[(estado_metrics.parquet<br/>32 filas x 24 columnas)]
    F[/mapa /estado/&lsqb;slug&rsqb;<br/>/compara /anomalias-destacadas]

    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5
    A6 --> B6

    B1 --> C
    B2 --> C
    B3 --> C
    B4 --> C
    B5 --> C
    B6 --> C

    C --> D
    D --> E
    E --> F
```

## Schema final (`estado_metrics.parquet`)

24 columnas, 32 filas (una por estado):

### Identidad

| Columna | Tipo | Descripción |
|---|---|---|
| `cve_ent` | str | clave INEGI |
| `estado` | str | nombre canónico |
| `ano_corte` | int | año del corte SESNSP |
| `poblacion` | int | proyección CONAPO al `ano_corte` |

### Seguridad (SESNSP × CONAPO)

| Columna | Tipo | Descripción |
|---|---|---|
| `homicidios_total_ult12m` | int | total últimos 12 meses |
| `homicidios_total_prev12m` | int | total 12 meses previos |
| `homicidios_100k_ult12m` | float | tasa por 100k |
| `cambio_yoy` | float | % cambio interanual |
| `riesgo` | float | percentil 0-100 |

### Economía (INEGI PIB × CONAPO + CONEVAL)

| Columna | Tipo |
|---|---|
| `pib_total` | float |
| `pib_per_capita` | float |
| `ano_pib` | int |
| `pobreza_pct` | float |
| `pobreza_extrema_pct` | float |
| `vulnerables_carencias_pct` | float |
| `ano_pobreza` | int |

### Gobierno (SHCP + ComprasMX estatal)

| Columna | Tipo |
|---|---|
| `gasto_federalizado_total` | float |
| `gasto_federalizado_per_capita` | float |
| `ano_gasto` | int |
| `transparencia_pct` | float (V5 placeholder, hoy null) |
| `adjudicacion_directa_pct` | float |
| `benford_mad` | float |
| `contratos_estatales` | int |
| `ano_compras_estatal` | int |

## Decisiones clave del builder

1. **Cruce por `cve_ent`**: clave canónica del INEGI. Resuelta
   por `common.to_cve_ent()` en cada fuente.
2. **Cada fuente trae su año propio**: SESNSP=2025, CONAPO=2025,
   PIB=2024, CONEVAL=2022, SHCP=2025, ComprasMX=2025. Cada
   columna acompaña su `ano_*` para que el sitio pueda
   etiquetar fechas reales (`PIB · 2024`, `Pobreza · 2022`).
3. **Tasa por 100k siempre desde CONAPO**: para que las
   métricas demográficas sean comparables.
4. **Percentil de riesgo nacional**: 0..100 donde 100 = peor.
   Es lineal sobre el ranking, no z-score, para que el sitio
   pueda colorear el mapa sin valores fuera de rango.
5. **`null` cuando no hay muestra suficiente**: ComprasMX
   estatal requiere ≥30 contratos para AD% y ≥300 para Benford.
   Si no, el estado queda con `null` y el frontend muestra `—`.

## Cómo se calcula `cambio_yoy`

```
cambio_yoy = (homicidios_ult12m - homicidios_prev12m) / homicidios_prev12m * 100
```

Donde `ult12m` cubre 12 meses rodantes hasta `SESNSP_LAST_PERIOD`
y `prev12m` cubre los 12 meses anteriores.

Para Sinaloa 2025:
- ult12m: 1,500 homicidios (ene-dic 2025, ejemplo)
- prev12m: 891 homicidios (ene-dic 2024)
- yoy = (1500 - 891) / 891 * 100 ≈ +68.3%

## Cifras del sitio que salen de este builder

Casi todas. Listadas por categoría:

| Categoría | Métricas en UI |
|---|---|
| Seguridad | `/mapa` Homicidios/100k, `/mapa` Δ YoY, `/mapa` Total absoluto, `/mapa` Percentil riesgo |
| Economía | `/mapa` PIB per cápita, `/mapa` Pobreza |
| Gobierno | `/mapa` Gasto fed/cápita, `/mapa` Adj. directa %, `/mapa` Benford MAD |
| Cruces | `/estado/[slug]` KPIs + cruces socioeconómicos, `/compara` tabla |

## Cómo verificar

```python
import pandas as pd

em = pd.read_parquet("data/processed/estado_metrics.parquet")

# Vista por estado
print(em[em["estado"] == "Colima"].T)

# Top 5 por homicidios/100k
print(em.nlargest(5, "homicidios_100k_ult12m")[
    ["estado", "homicidios_100k_ult12m", "cambio_yoy"]
])

# Cluster captura: AD alto + pobreza alta
cluster = em[
    (em["adjudicacion_directa_pct"] >= 60) &
    (em["pobreza_pct"] >= 40) &
    (em["contratos_estatales"] >= 30)
]
print(cluster[["estado", "adjudicacion_directa_pct", "pobreza_pct"]])
```

## Fallos conocidos

- **Año de PIB desfasado**: el sitio usa 2024 mientras CONAPO,
  SHCP usan 2025. El `pib_per_capita` calculado usa la población
  del año del PIB (2024). Es lo más conservador disponible
  hasta que INEGI publique PIBE 2025.
- **Si una fuente falla, no se completa la fila**: pero ninguna
  columna se "inventa". `null` es válido y el frontend lo
  maneja.
