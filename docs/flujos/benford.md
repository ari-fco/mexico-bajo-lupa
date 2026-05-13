# Flujo · Benford y MAD de Nigrini

> Cómo se calcula la "desviación Benford" que aparece como
> indicador forense en `/anomalias`, `/mapa` Benford estatal, los
> dossiers, y el banner de hallazgos. Este es el corazón
> estadístico del proyecto.

## Diagrama del cálculo

```mermaid
flowchart TD
    A[Conjunto de montos contractuales<br/>p.ej. todos los contratos federales<br/>de FONACOT en ComprasMX 2024-25]
    B[Filtrar monto > 0]
    C[Para cada monto<br/>extraer primer dígito significativo<br/>str(monto).lstrip0,.][0]]
    D[Contar ocurrencias por dígito 1-9<br/>histograma observado]
    E[Calcular % observado<br/>obs_d = count_d / total]
    F[Calcular % esperado Benford<br/>exp_d = log10 1 + 1/d]
    G[Calcular MAD<br/>MAD = 1/9 · Σ |obs_d - exp_d|]
    H[Umbrales Nigrini<br/>&lt; 0.006 cercana<br/>0.006-0.012 aceptable<br/>0.012-0.015 marginal<br/>≥ 0.015 NO conforme]
    I[Asignar tono UI<br/>good warn alert]

    A --> B
    B --> C
    C --> D
    D --> E
    F --> G
    E --> G
    G --> H
    H --> I
```

## La Ley de Benford

En conjuntos numéricos de origen natural (facturas, poblaciones,
transacciones financieras genuinas), el **primer dígito
significativo** NO se distribuye uniformemente. El 1 aparece
~30.1% del tiempo; el 9, solo 4.6%. La fórmula:

```
P(d) = log10(1 + 1/d)
```

Distribución esperada:

| Dígito | % esperado |
|---|---|
| 1 | 30.103% |
| 2 | 17.609% |
| 3 | 12.494% |
| 4 | 9.691% |
| 5 | 7.918% |
| 6 | 6.695% |
| 7 | 5.799% |
| 8 | 5.115% |
| 9 | 4.576% |

Esta distribución aparece **porque** los datos abarcan varios
órdenes de magnitud y son "naturalmente generados". Si una
serie financiera **no** se ajusta, es bandera estadística para
auditar — no prueba de fraude, pero señal forense estándar.

## MAD de Nigrini

La **Mean Absolute Deviation** sobre los nueve dígitos. Mide
cuánto se aleja la distribución observada de la esperada:

```
MAD = (1/9) · Σ |observado(d) - esperado(d)|
```

Donde el `observado` y `esperado` están expresados como
**proporciones** (0..1) o **porcentajes** (0..100), según
convención. En el proyecto usamos la convención de proporciones:
los umbrales de Nigrini abajo asumen esa escala.

## Umbrales Nigrini (forenses estándar)

| Rango MAD | Interpretación |
|---|---|
| `< 0.006` | Conformidad cercana |
| `0.006 – 0.012` | Conformidad aceptable |
| `0.012 – 0.015` | Conformidad marginal |
| `≥ 0.015` | **No conformidad** — bandera para auditoría |

Son los thresholds de **Nigrini (2012)** para el primer dígito
significativo, citados en literatura forense moderna.

## Requisitos estadísticos

Benford **NO aplica** cuando:

1. **Muestra pequeña** (`< 300 observaciones`): el ruido domina.
   El sitio reporta `n/d` cuando una dependencia tiene menos
   de 300 contratos.
2. **Rango limitado**: si todos los montos están entre $1,000 y
   $9,999, no hay suficientes órdenes de magnitud.
3. **Datos asignados, no medidos**: identificadores, números de
   póliza, códigos postales — no son magnitudes naturales.

Estos límites están documentados en `metodologia/page.tsx` block
04 y se publican junto con cualquier número Benford del sitio.

## Implementación en el proyecto

### Por dependencia federal (`dependencias_riesgo.parquet`)

```python
import pandas as pd
import numpy as np

contratos = pd.read_parquet("data/processed/comprasmx_contratos.parquet")
fed = contratos[contratos["ambito"] == "FEDERAL"]

# Esperado Benford
exp = np.array([np.log10(1 + 1/d) for d in range(1, 10)])

def mad_benford(montos):
    montos = montos[montos > 0]
    if len(montos) < 300:
        return None  # umbral estadístico
    # Primer dígito significativo
    first = montos.apply(lambda x: int(f"{x:.10f}".lstrip("0.")[0]))
    obs = first.value_counts(normalize=True).reindex(range(1, 10), fill_value=0)
    return float(np.abs(obs.values - exp).mean())

# Por institución
result = (
    fed.groupby("institucion")["importe"]
    .apply(mad_benford)
    .dropna()
    .sort_values(ascending=False)
)
print(result.head(10))
```

### Nacional (`benford_nacional.parquet`)

Mismo cálculo pero sobre **todos** los contratos federales
agregados. Sirve para el gráfico "Primer dígito · observado vs
esperado" en `/anomalias`.

### Estatal (`estado_metrics.benford_mad`)

Mismo cálculo pero sobre el subset `ambito = ESTATAL` agrupado
por `cve_ent`. Filtrado por `contratos_estatales >= 300` (la
mayoría de los estados queda abajo del umbral; aparece como
`null`).

### Anual histórico (`historico_benford_anual.parquet`)

Mismo cálculo agrupado por `ano` sobre el archivo CompraNet 5.0.
Sirve para el chart de evolución temporal en `/historico`.

## Cifras del sitio que salen de Benford

| Cifra | Origen |
|---|---|
| **Sistema Público de Radiodifusión MAD 0.0842** | dependencias_riesgo (federal) |
| **Top 5 federal** (SPR, IABN, IMIPESA, CONADE, CONAFOR) | dependencias_riesgo (federal) |
| **Patrón Benford-no-AD: Guerrero 0.0356, CDMX 0.0308, BC 0.0269** | estado_metrics (estatal) |
| **2021 MAD anual** | historico_benford_anual |

## Cómo verificar

```python
import pandas as pd
import numpy as np

dr = pd.read_parquet("data/processed/dependencias_riesgo.parquet")
top = dr[dr["contratos"] >= 300].nlargest(5, "benford_mad")
print(top[["institucion", "contratos", "benford_mad", "adj_directa_pct"]])

# Distribución nacional
bn = pd.read_parquet("data/processed/benford_nacional.parquet")
print(bn)  # Esperado, Observado, dígitos 1-9
```

## Qué Benford **NO dice**

Recurrente en `/metodologia` y `/anomalias`:

- ❌ Que la dependencia comete fraude.
- ❌ Que los contratos son ilegales.
- ✅ Que la distribución estadística no es la esperada.
- ✅ Que vale la pena que una autoridad auditara el caso a fondo.

La metodología pública es transparente sobre este límite y
todos los hallazgos del banner usan lenguaje correspondiente
("desviación", "patrón sospechoso", "bandera para auditoría",
nunca "fraude").

## Referencias

- Nigrini, M. J. (2012). *Benford's Law: Applications for
  Forensic Accounting, Auditing, and Fraud Detection*. Wiley.
- Hill, T. P. (1995). "A statistical derivation of the
  significant-digit law". *Statistical Science*, 10(4),
  354-363.
