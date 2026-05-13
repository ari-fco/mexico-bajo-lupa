# Flujo · Histórico anual (`build_historico_metrics.py`)

> Las agregaciones por año, por sexenio, y por proveedor que
> alimentan toda la ruta `/historico`. Convierte 2.36 millones
> de contratos individuales en una narrativa de 12 años.

## Diagrama

```mermaid
flowchart TD
    A[(comprasmx_historico<br/>2,356,609 contratos<br/>2010-2024)]
    B[etl/build_historico_metrics.py]
    B1[Filtro por año<br/>>= 20k contratos<br/>excluye 2010 2023 2024 colas]
    B2[Agregar por año]
    B3[Calcular Benford anual<br/>MAD sobre primer dígito]
    B4[Calcular split por modalidad<br/>pct_ad pct_lp pct_i3p]
    B5[Top 50 proveedores por monto<br/>group by proveedor<br/>computar años activos]
    C[(historico_anual.parquet<br/>15 filas · 1/año)]
    C2[(historico_benford_anual.parquet)]
    C3[(historico_proveedores_top.parquet<br/>50 filas)]
    D[/historico]

    A --> B
    B --> B1
    B1 --> B2
    B2 --> B3
    B2 --> B4
    A --> B5
    B3 --> C
    B4 --> C
    B3 --> C2
    B5 --> C3
    C --> D
    C2 --> D
    C3 --> D
```

## Schema (`historico_anual.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `ano` | int | 2010-2024 |
| `contratos` | int | count |
| `monto_total` | float | suma de importes |
| `pct_ad` | float | % adjudicación directa |
| `pct_lp` | float | % licitación pública |
| `pct_i3p` | float | % invitación 3 personas |
| `benford_mad` | float | MAD del año (sobre primer dígito) |

## Schema (`historico_proveedores_top.parquet`)

| Columna | Tipo |
|---|---|
| `proveedor` | str (nombre canónico) |
| `contratos` | int |
| `monto_total` | float |
| `primera_fecha` | date |
| `ultima_fecha` | date |
| `anos_activos` | int (años distintos con ≥1 contrato) |
| `pct_ad` | float |

## Decisiones clave

1. **Filtro `>= 20k contratos/año`**: excluye 2010 (4.9k), 2023
   (16.8k) y 2024 (1.8k) del análisis principal porque tienen
   muestra estadísticamente débil. El frontend lo etiqueta como
   "cobertura sólida 2011-2022".
2. **Sexenios computados en frontend**: el Parquet trae el dato
   anual; el agrupamiento por presidente se hace en
   `historico-view.tsx` con `SEXENIOS`.
3. **Persistencia como métrica de captura**: `anos_activos`
   cuenta años distintos con contratos. Un proveedor con 12+
   años activos atravesó al menos 2 sexenios. Es proxy de
   captura institucional sin imputar nada.
4. **Top 50 por monto acumulado**: ranking estable, filtra a
   los actores con presencia significativa.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **2021 = 79.6% AD** (récord) | `/historico` KPI + chart, banner home |
| **Promedios sexenales (FCH 70.5%, EPN 73.1%, AMLO 78.2%)** | `/historico` cards sexenio, banner home |
| **Maypo 13,890 contratos · 87.9% AD · 15 años** | `/historico` tabla, banner home |
| **Top 50 proveedores con sort/filter** | `/historico` tabla interactiva |
| **Benford anual** | `/historico` chart |
| **2.36M contratos analizados** | `/historico` KPI |

## Cómo verificar

```python
import pandas as pd

# Top 3 años por AD
anual = pd.read_parquet("data/processed/historico_anual.parquet")
top = anual[anual["contratos"] >= 20_000].nlargest(3, "pct_ad")
print(top[["ano", "pct_ad", "contratos"]])

# Promedios sexenales
def sexenio_avg(df, ini, fin):
    sub = df[(df["ano"] >= ini) & (df["ano"] <= fin) & (df["contratos"] >= 20_000)]
    return sub["pct_ad"].mean()

print(f"Calderón 2010-12: {sexenio_avg(anual, 2010, 2012):.1f}%")
print(f"Peña 2013-18:     {sexenio_avg(anual, 2013, 2018):.1f}%")
print(f"AMLO 2019-22:     {sexenio_avg(anual, 2019, 2022):.1f}%")

# Top 5 proveedores
prov = pd.read_parquet("data/processed/historico_proveedores_top.parquet")
print(prov.nlargest(5, "monto_total")[
    ["proveedor", "contratos", "monto_total", "anos_activos", "pct_ad"]
])
```

## Fallos conocidos

- **Nombres de proveedor con variantes**: ya documentado en
  [comprasmx-historico.md](comprasmx-historico.md). El builder
  normaliza (uppercase, sin acentos, sin sufijos) antes de
  agregar.
- **CFE y Pemex como dependencias enormes**: aparecen con sus
  nombres legacy exactos.
