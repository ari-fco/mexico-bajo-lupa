# Flujo · EFOS × ComprasMX (cruce SAT × federal)

> El cruce que ni el SAT ni la SFP publican lado a lado:
> empresas que el SAT señaló como facturadoras de operaciones
> simuladas (69-B CFF) que **aún así mantienen contratos
> federales**.

## Diagrama end-to-end

```mermaid
flowchart TD
    A[(sat_efos.parquet<br/>14,234 RFCs señalados<br/>con estatus y fecha presunción)]
    B[(comprasmx_contratos.parquet<br/>235,392 contratos<br/>filtrar ambito=FEDERAL)]
    C[etl/build_efos_metrics.py<br/>join inner por rfc]
    D[(efos_cruce.parquet<br/>14 contratos matched)]
    E[Para cada contrato cruzado<br/>comparar fecha_firma vs fecha_presuncion<br/>marcar posterior_a_presuncion<br/>también marcar posterior_por_ano]
    F[Agregaciones]
    F1[KPIs<br/>n_contratos_cruce<br/>monto_total<br/>posteriores]
    F2[Top proveedores<br/>n contratos por RFC<br/>+ último contrato]
    F3[Top dependencias<br/>n contratos por institución<br/>+ definitivos contratados]
    F4[Leads<br/>top 15 por monto<br/>descripción contrato]
    G[(efos_kpis.parquet<br/>efos_top_proveedores.parquet<br/>efos_top_dependencias.parquet<br/>efos_leads.parquet<br/>efos_estatus_breakdown.parquet)]
    H[/efos]

    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    F --> F1
    F --> F2
    F --> F3
    F --> F4
    F1 --> G
    F2 --> G
    F3 --> G
    F4 --> G
    G --> H
```

## Por qué este cruce importa editorialmente

La lista 69-B del SAT existe para que **terceros no contraten**
con esas empresas. La ley fiscal mexicana es explícita: las
operaciones con un EFOS Definitivo **no pueden deducir
impuestos**. Y aún así, el cruce mecánico contra los contratos
federales 2024-25 muestra **14 contratos por $111 millones MXN**
otorgados a esas empresas — incluyendo **3 que se firmaron
DESPUÉS de que el SAT publicara la presunción**.

Eso es el "find" político del proyecto.

## Las dos definiciones de "posterior"

ComprasMX no publica fecha de firma para ~57% de sus contratos.
Por eso el cruce tiene **dos modos**:

| Indicador | Cuándo aplica | Cómo se calcula |
|---|---|---|
| `posterior_a_presuncion` | hay `fecha_firma` exacta del contrato | `fecha_firma > fecha_presuncion_SAT` |
| `posterior_por_ano` | NO hay fecha exacta, solo `ano` del contrato | `ano > año_presuncion_SAT` (señal débil) |

El sitio diferencia los dos en la tabla y en los KPIs. El
hallazgo del banner cita el **3 contratos posteriores** que
combinó ambos modos ("amplio").

## Schema del Parquet (`efos_cruce.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `rfc` | str | RFC EFOS |
| `contribuyente` | str | razón social SAT |
| `estatus` | str | DEFINITIVO/PRESUNTO/DESVIRTUADO/SENTENCIA_FAVORABLE |
| `fecha_presuncion` | date | fecha del oficio SAT |
| `codigo_contrato` | str | identificador en ComprasMX |
| `institucion` | str | dependencia que firmó |
| `ramo` | str | si está resuelto |
| `monto` | float | importe ejercido |
| `modalidad` | str | AD/LP/I3P |
| `fecha_firma` | date | nullable |
| `ano` | int | derivado |
| `posterior_a_presuncion` | bool | señal fuerte |
| `posterior_por_ano` | bool | señal débil |
| `descripcion` | str | título del contrato |

## Decisiones clave del ETL

1. **Inner join por RFC normalizado**: requiere RFC en
   **ambas tablas**. Por eso este cruce no funciona contra
   CompraNet 5.0 histórico (no tiene RFC).
2. **Conservar todos los estatus SAT, no solo DEFINITIVO**: el
   sitio etiqueta cada match con su estatus para que el lector
   pondere ("Definitivo" = SAT con resolución firme;
   "Desvirtuado" = la empresa demostró que sí existían las
   operaciones).
3. **Snapshot temporal**: tanto la lista SAT como el archivo
   ComprasMX son snapshots en el tiempo. El sitio publica la
   fecha del snapshot SAT explícitamente en `/efos`.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **14 contratos federales cruzados** | banner home, `/efos` KPI |
| **$111M MXN monto total** | `/efos` KPI |
| **3 posteriores a presunción** | banner home, `/efos` KPI |
| **% RFCs únicos: depende del corte** | `/efos` KPI |
| **Top proveedores (RFC × razón social)** | `/efos` tabla interactiva |
| **Top dependencias** | `/efos` tabla interactiva |
| **Casos para revisar** (top 15 por monto) | `/efos` lista |

## Cómo verificar

```python
import pandas as pd

cruce = pd.read_parquet("data/processed/efos_cruce.parquet")
print(f"Contratos cruzados: {len(cruce)}")
print(f"Monto total: ${cruce['monto'].sum():,.0f}")
print(f"Posteriores estrictos: {cruce['posterior_a_presuncion'].sum()}")
print(f"Posteriores por año: {cruce['posterior_por_ano'].sum()}")

# Definitivos solamente
defs = cruce[cruce["estatus"] == "DEFINITIVO"]
print(f"\nDefinitivos cruzados: {len(defs)}")
print(defs[["rfc", "contribuyente", "institucion", "monto"]].head())
```

## Cómo se interpretan los hallazgos

`/efos` es explícito sobre los matices:

- **Lo que el cruce dice**: que ese proveedor está en la lista
  SAT bajo 69-B y aparece como contraparte de un contrato
  federal. Si la firma es posterior a la presunción SAT, el
  riesgo reputacional para la dependencia es alto.
- **Lo que NO dice**: que el contrato sea fraudulento. EFOS no
  es prueba penal — es resolución administrativa SAT. Algunas
  empresas se defienden y obtienen sentencia favorable; el
  sitio marca el estatus actual.

## Fallos conocidos

- **RFC con typos en ComprasMX**: si un RFC se reportó mal en
  ComprasMX (ej. falta un dígito), el join falla. No es común
  pero pasa.
- **Empresas que cambian de RFC**: si la empresa cierra y abre
  con RFC nuevo, el cruce no las detecta.
- **CompraNet 5.0 no se incluye**: el archivo histórico no tiene
  RFC. Para ampliar el cruce al histórico habría que reconciliar
  por nombre normalizado, con riesgo de falsos positivos.

## Próximos pasos

- **Cruce con compras estatales**: cuando se integren los
  portales estatales propios (V4), el cruce se podría extender.
  El SAT publica EFOS a nivel nacional, así que aplicaría.
- **Tracking longitudinal del padrón SAT**: si guardamos
  snapshots semanales del 69-B, podríamos detectar empresas
  recién agregadas a la lista que siguen recibiendo contratos.
- **Alerta automática**: cuando un contrato nuevo aparezca en
  ComprasMX a un RFC en lista SAT, dispararla. Esto es parte
  del V6 roadmap (anomalía de la semana).
