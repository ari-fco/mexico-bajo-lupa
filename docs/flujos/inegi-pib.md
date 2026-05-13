# Flujo · INEGI PIB por entidad federativa

> Determina el PIB per cápita que aparece en el mapa, el dossier
> estatal y el comparador. Es la métrica económica más importante
> del proyecto.

## Diagrama end-to-end

```mermaid
flowchart TD
    A[INEGI · comunicado de prensa<br/>diciembre cada año<br/>PIBE precios constantes 2018]
    B[(PIBE2024_CP.pdf<br/>~80 KB · contiene año T y T-1)]
    C[etl/inegi_pib.py<br/>pypdf extract text]
    D[Parser tabular<br/>regex sobre nombres canónicos<br/>de los 32 estados]
    E[Convertir miles de millones<br/>a pesos · *1e9]
    F[(data/processed/<br/>inegi_pib.parquet<br/>64 filas · 32 estados x 2 años)]
    G[etl/build_metrics.py<br/>último año disponible<br/>dividir por población CONAPO]
    H[estado_metrics.pib_per_capita]
    I[/mapa · métrica Economía<br/>/estado/&lsqb;slug&rsqb; · KPI cabecera<br/>/compara]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
```

## Fuente

- **Oficial**: comunicado de prensa anual INEGI
  [pibent · PIBE 2024](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/pibent/PIBE2024_CP.pdf)
- **Año base**: 2018 (valores constantes / reales, comparables
  entre años).
- **Por qué el PDF y no la API**: el INEGI publica el dataset
  abierto del PIBE con varios meses de retraso. El comunicado de
  prensa anual sale en diciembre con el dato del año previo, así
  que extraemos del PDF para tener la cifra más fresca posible.
- **Cobertura**: el PDF de cada año contiene `T` y `T-1`. El
  Parquet acumula años: 2023 (del PDF anterior) + 2024 (del PDF
  actual).

## Schema del PDF original

El PDF es un **comunicado de prensa**, no un dataset puro. Lo
relevante está en el **Cuadro 1** que tiene la tabla:

| Estado | Año T-1 | Año T |
|---|---|---|
| Aguascalientes | xxx,xxx | xxx,xxx |
| ... | ... | ... |

Valores en **"miles de millones de pesos constantes 2018"**.

## Schema del Parquet (`inegi_pib.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `cve_ent` | str | clave INEGI |
| `estado` | str | nombre canónico |
| `ano` | int | 2023 o 2024 |
| `pib_total` | float | pesos a precios de 2018 (ya multiplicado por 1e9) |

**Volumen**: 64 filas = 32 estados × 2 años.

## Decisiones clave del ETL

1. **Extraer del PDF directamente**: `pypdf` lee texto, regex
   sobre nombres conocidos de estado lo separa en filas. Es
   frágil pero más actualizado que el zip oficial.
2. **Multiplicar por 1e9**: el PDF reporta en "miles de millones".
   En el Parquet quedan en pesos absolutos.
3. **Precios constantes 2018**: NO es el PIB nominal. Es valor
   real comparable entre años. Cuando el frontend dice "PIB",
   significa "PIB real base 2018".
4. **Fallar ruidoso si cambia el PDF**: si el INEGI cambia
   formato (ej. agrega una columna, cambia el orden), el regex
   falla. Mejor que silenciosamente producir cifras erróneas.
5. **Computar per cápita en `build_metrics.py`**: el ETL solo
   guarda `pib_total`. La división por población vive en el
   builder de métricas, para que cuando CONAPO actualice no
   tengamos que re-correr el ETL del PIB.

## Cómo se usa en la app

Pipeline conceptual:

```
pib_per_capita = pib_total[ano=2024] / poblacion_conapo[ano=2024]
```

Con números reales (Campeche 2024):

```
pib_per_capita = 491,000,000,000 / 1,001,000 ≈ 490,510 pesos/persona
```

Esto coincide con el "Campeche $495,465" que se ve en el sitio
(la pequeña diferencia es por el redondeo del PDF y los
decimales de la población).

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **Campeche $495,465 PIB/cápita** (#1) | `/mapa` métrica Economía, dossier Campeche |
| **CDMX $422,207** (#2) | `/mapa`, dossier |
| **Nuevo León $326,559** (#3) | `/mapa`, dossier |
| **Chiapas $98,xxx** (último) | `/mapa`, dossier |

## Cómo verificar

```python
import pandas as pd

# PIB absoluto
df = pd.read_parquet("data/processed/inegi_pib.parquet")
print(df[df["ano"] == 2024].nlargest(5, "pib_total"))

# PIB per cápita (ya cruzado con CONAPO)
em = pd.read_parquet("data/processed/estado_metrics.parquet")
print(em[["estado", "pib_per_capita", "ano_pib"]].sort_values(
    "pib_per_capita", ascending=False
).head(5))
```

## Fallos conocidos

- **INEGI cambia URL del PDF**: cada diciembre el comunicado sale
  con URL nueva (incluye el año). El ETL trae una lista de
  candidatas y, si todas fallan, pide descarga manual al
  `data/raw/inegi_pibe_<año>_cp.pdf`.
- **PDF cambia layout**: si INEGI rediseña el comunicado, el
  parser regex se rompe. Resolverlo manualmente actualizando el
  regex en `etl/inegi_pib.py`.
- **Campeche es outlier petrolero**: el PIB de Campeche está
  dominado por la actividad petrolera de Pemex offshore. El
  sitio lo muestra como dato real pero el body de los hallazgos
  reconoce que es un caso especial.

## Próximos pasos

- **PIB sectorial** (V2 roadmap): el INEGI publica desagregación
  por sector. Permitiría cruces tipo "estados con mayor peso
  manufactura tienen menos violencia". Schema más complejo (un
  row por estado × año × sector).
- **Series largas**: agregar PIBE histórico desde el INEGI banco
  de datos. Hoy solo tenemos los últimos dos años; con series
  largas se puede medir crecimiento real.
