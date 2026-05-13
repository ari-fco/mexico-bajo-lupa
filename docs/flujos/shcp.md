# Flujo · SHCP (gasto federalizado)

> Toda la cifra de "gasto federalizado per cápita" del sitio
> viene de aquí. Es el dinero que la federación transfiere a
> cada estado por Participaciones (Ramo 28), Aportaciones (Ramo
> 33), Convenios y Subsidios.

## Diagrama end-to-end

```mermaid
flowchart TD
    A[SHCP · Transparencia<br/>Presupuestaria<br/>transparenciapresupuestaria.gob.mx]
    A1[Mirror community datos.gob.mx<br/>id transferencias_federales]
    B[(shcp_transferencias.csv<br/>~30 MB · latin-1<br/>2011-2026 mensual)]
    C[etl/shcp_gasto.py]
    D[Filtros<br/>solo transferencias<br/>Ramo 28, 33, Convenios, Subsidios<br/>excluir auto-flujos]
    E[Agregar por cve_ent x ano<br/>sumar montos mensuales]
    F[(data/processed/<br/>shcp_gasto.parquet<br/>512 filas · 32 x 16 años)]
    G[etl/build_metrics.py<br/>tomar ano más reciente<br/>dividir por población CONAPO]
    H[estado_metrics<br/>gasto_federalizado_total<br/>gasto_federalizado_per_capita]
    I[/mapa Gobierno<br/>/estado/&lsqb;slug&rsqb; cruces<br/>/compara]

    A -->|CSV mensual| B
    A1 -.alternativa.-> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
```

## Fuente

- **Oficial**: [SHCP · Transparencia Presupuestaria](https://www.transparenciapresupuestaria.gob.mx/)
- **Cobertura**: 2011 a 2026 (publicación adelantada del PEF
  2026). ~250 mil filas mensuales.

## Componentes del "gasto federalizado"

El gasto federalizado **NO es** todo el gasto federal — es el
subset que se transfiere a estados/municipios:

| Componente | Qué es |
|---|---|
| **Ramo 28 · Participaciones** | parte de impuestos federales que regresa a estados sin condicionar uso |
| **Ramo 33 · Aportaciones** | transferencias condicionadas (educación, salud, infraestructura) |
| **Convenios** | acuerdos bilaterales federación-estado |
| **Subsidios** | transferencias específicas (FONDEN, programas) |

El total 2025: **2.65 billones MXN** (verificado contra
`shcp_gasto.parquet`).

## Schema del CSV

CSV largo, una fila por (estado × año × mes × componente):

| Columna CSV | Tipo |
|---|---|
| `CICLO`, `MES` | int |
| `ENTIDAD` | str |
| `RAMO`, `CONCEPTO` | str |
| `MONTO_EJERCIDO` | float |

## Schema del Parquet (`shcp_gasto.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `cve_ent` | str | clave INEGI |
| `estado` | str | nombre canónico |
| `ano` | int | 2011-2026 |
| `gasto_federalizado_total` | float | suma anual en pesos |
| `meses_reportados` | int | cuántos meses del año tienen datos (`12` = año completo) |

**Volumen**: 512 filas = 32 estados × 16 años (2011-2026).

## Decisiones clave del ETL

1. **Solo transferencias hacia estados**: el dataset SHCP
   contiene todo el ejercicio federal; el ETL filtra solo los
   conceptos que efectivamente llegan a entidades.
2. **`meses_reportados` como bandera**: si SHCP solo publicó 8
   meses (típico de años en curso), `meses_reportados=8`. El
   frontend muestra el total absoluto pero la métrica
   "per cápita" usa solo años completos para evitar errores de
   subestimación.
3. **Per cápita en `build_metrics.py`**: la división por
   población CONAPO se hace al construir las métricas, no aquí.

## Cómo se construye `gasto_federalizado_per_capita`

```
gasto_per_capita = gasto_federalizado_total[ano=2025] / poblacion_conapo[ano=2025]
```

Con números reales (Colima):

```
gasto_per_capita = 18,679,000,000 / 731,391 ≈ 25,549 pesos/persona
```

Coincide con el "$25,549" que aparece en `/mapa` y banner home.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **2.65 billones MXN gasto 2025** | README, `/fuentes` |
| **Colima $25,549 per cápita** (top 3) | banner home, `/mapa`, dossier |
| **Edomex $16,587 per cápita** (último) | dossier Edomex, README |
| **Edomex 294 mil mdp absolutos** (mayor) | README hallazgos |

## Cómo verificar

```python
import pandas as pd

df = pd.read_parquet("data/processed/shcp_gasto.parquet")

# Total 2025 nacional
total_2025 = df[df["ano"] == 2025]["gasto_federalizado_total"].sum()
print(f"Total 2025: {total_2025/1e12:.2f} billones MXN")

# Top per cápita (cruzado con CONAPO)
em = pd.read_parquet("data/processed/estado_metrics.parquet")
print(em[["estado", "gasto_federalizado_per_capita", "ano_gasto"]].sort_values(
    "gasto_federalizado_per_capita", ascending=False
).head(5))
```

## Fallos conocidos

- **2026 incompleto**: SHCP publica el PEF 2026 adelantado, pero
  el ejercicio real aún no ocurrió. El ETL marca
  `meses_reportados < 12` y el sitio prefiere 2025 como cierre.
- **Cambio de clasificación SHCP**: si SHCP reorganiza ramos o
  conceptos, el filtro inicial puede quedar desactualizado. El
  ETL falla con conteo extraño de filas y reporta los conceptos
  sin clasificar.
