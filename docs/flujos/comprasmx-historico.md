# Flujo · CompraNet 5.0 histórico (2010-2022)

> El archivo legacy de CompraNet 5.0 con **2,356,609 contratos**
> de 12 años. Alimenta la ruta `/historico`, los proveedores top,
> y la evolución de adjudicación directa por sexenio.

## Diagrama end-to-end

```mermaid
flowchart TD
    A[CompraNet 5.0 · sistema archivado<br/>en 2022 reemplazado por<br/>ComprasMX moderno]
    B[(compranet_historico.csv<br/>~1.5 GB · UTF-8<br/>2010-2024 con cola incompleta)]
    C[etl/comprasmx_historico.py<br/>read_csv UTF-8 NO latin-1<br/>schema legacy distinto]
    D[Mapear schema legacy<br/>al canónico del proyecto<br/>etiquetar FEDERAL_HIST]
    E[(data/processed/<br/>comprasmx_historico.parquet<br/>2.36M filas)]
    F[etl/build_historico_metrics.py]
    F1[Agregar por año<br/>contratos · monto<br/>pct AD pct LP pct I3P]
    F2[Benford por año<br/>MAD anual]
    F3[Top 50 proveedores<br/>por monto acumulado<br/>años activos · % AD]
    G[(historico_anual.parquet)]
    G2[(historico_proveedores_top.parquet)]
    G3[etl/build_continuidad.py<br/>match historico ↔ moderno<br/>por nombre normalizado]
    H[(continuidad.parquet)]
    I[/historico]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> F1
    F --> F2
    F --> F3
    F1 --> G
    F3 --> G2
    G --> I
    G2 --> I
    E --> G3
    G3 --> H
    H --> I
```

## Fuente

- **Sistema**: CompraNet 5.0 (URL ya no disponible, fue
  archivado al lanzarse ComprasMX en 2024).
- **Archivo**: ~1.5 GB CSV con 2.36 millones de contratos
  2010-2024 (cobertura sólida 2011-2022; 2010, 2023 y 2024 son
  tails parciales).
- **NOTA importante**: este archivo legacy **NO incluye RFC del
  proveedor** ni el ramo presupuestal. Por eso el cruce con SAT
  69-B (que requiere RFC) solo se hace sobre el corte moderno.

## Schema legacy vs canónico

El CompraNet 5.0 usa nombres de columnas distintos al ComprasMX
moderno. El ETL los mapea:

| Schema legacy | Mapeo a canónico |
|---|---|
| `Importe del contrato` | `importe` |
| `Tipo de procedimiento` | `tipo_procedimiento` (AD, LP, I3P, OS) |
| `Dependencia` | `institucion` |
| `Proveedor o contratista` | `proveedor` |
| **(no existe)** | `rfc` queda en `null` |
| **(no existe)** | `ramo` queda en `null` |
| `Fecha de inicio del contrato` | `fecha_firma` |

## Schema del Parquet (`comprasmx_historico.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `codigo` | str | identificador legacy |
| `tipo_procedimiento` | str | AD, LP, I3P, OS, otros |
| `institucion` | str | dependencia federal |
| `importe` | float | pesos |
| `fecha_firma` | date | nullable |
| `proveedor` | str | razón social, **sin normalizar a RFC** |
| `ambito` | str | siempre `"FEDERAL_HIST"` |
| `ano` | int | 2010-2024 |

**Volumen**: 2,356,609 contratos.

## Métricas derivadas (`historico_anual.parquet`)

`build_historico_metrics.py` produce un agregado por año:

| Columna | Descripción |
|---|---|
| `ano` | 2010..2024 |
| `contratos` | count |
| `monto_total` | suma de importes |
| `pct_ad` | % adjudicación directa |
| `pct_lp` | % licitación pública |
| `pct_i3p` | % invitación 3 personas |
| `benford_mad` | MAD anual sobre primer dígito |

El frontend filtra `contratos >= 20_000` para excluir cola
estadísticamente débil (2010, 2023, 2024).

## Decisiones clave del ETL

1. **UTF-8 acá, NO latin-1**: el archivo CompraNet 5.0 viene en
   UTF-8 a diferencia del CSV moderno. El ETL tiene encoding
   distinto a propósito.
2. **Etiquetar `FEDERAL_HIST`**: para que no se mezcle por error
   con el corte 2024-25 al hacer queries.
3. **Sin RFC: no se cruza con SAT**: las EFOS requieren RFC; este
   corte no lo tiene. El sitio lo documenta en `/historico`.
4. **Top 50 proveedores por monto acumulado**: ranking estable y
   editorialmente significativo. Incluye `anos_activos` para
   detectar persistencia entre sexenios.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **2.36M contratos analizados** | hero badge home, README |
| **2021 = 79.6% AD** (récord) | banner home, `/historico` |
| **Promedios por sexenio: Calderón 70.5%, Peña 73.1%, AMLO 78.2%** | `/historico`, banner home |
| **Maypo 13,890 contratos · 87.9% AD · 15 años** | banner home, `/historico` |
| **Top 50 proveedores** | `/historico` tabla |

## Cómo verificar

```python
import pandas as pd

# Volumen total
hist = pd.read_parquet("data/processed/comprasmx_historico.parquet")
print(f"Total contratos: {len(hist):,}")

# Año récord AD
anual = pd.read_parquet("data/processed/historico_anual.parquet")
top = anual[anual["contratos"] >= 20_000].nlargest(3, "pct_ad")
print(top[["ano", "contratos", "pct_ad"]])

# Top 5 proveedores
prov = pd.read_parquet("data/processed/historico_proveedores_top.parquet")
print(prov.nlargest(5, "monto_total")[
    ["proveedor", "contratos", "monto_total", "anos_activos", "pct_ad"]
])

# Maypo específico
maypo = prov[prov["proveedor"].str.contains("MAYPO", case=False)]
print(maypo)
```

## Fallos conocidos

- **Tail 2023-2024 incompleto**: el archivo CompraNet 5.0 fue
  archivado en 2022 pero algunos contratos modificatorios
  llegaron hasta 2024. La cobertura sólida es 2011-2022.
- **Nombres de proveedor con variaciones**: el archivo no tiene
  RFC, así que dos filas con "Maypo SA de CV" y "FARMACEUTICOS
  MAYPO" pueden ser la misma entidad. El builder usa
  normalización (uppercase, sin acentos, sin sufijos legales)
  para agregarlos.
- **CFE y Pemex separados**: estas empresas tienen volúmenes
  enormes propios; el sitio los muestra con su nombre legacy
  exacto.

## Próximos pasos

- **Continuidad histórico→moderno**: ver el flujo
  [continuidad.md](continuidad.md). Cruza los Top 50 históricos
  con el ComprasMX moderno por nombre normalizado para detectar
  proveedores que sostuvieron relación atravesando sexenios.
- **Sub-categoría obra pública**: separar obra de servicios y
  adquisiciones permitiría análisis sectorial. Schema simple,
  filtro adicional sobre `tipo_contratacion`.
