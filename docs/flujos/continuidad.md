# Flujo · Continuidad histórico → moderno

> Detecta qué proveedores que dominaban CompraNet 5.0 entre 2010
> y 2022 **siguen contratando hoy** en el ComprasMX moderno
> (2024-25). Pivot editorial: persistencia que atraviesa sexenios
> = señal clásica de captura institucional.

## Diagrama

```mermaid
flowchart TD
    A[(historico_proveedores_top<br/>50 proveedores 2010-2022)]
    B[(comprasmx_contratos<br/>moderno 2024-25)]
    C[etl/build_continuidad.py]
    D[Normalizar nombres<br/>uppercase sin acentos<br/>sin sufijos legales SA de CV]
    E[Match exacto<br/>nombre normalizado en ambos]
    F[Match fuzzy<br/>rapidfuzz score >= 90/100<br/>solo si no hay exacto]
    G[Para cada proveedor histórico<br/>buscar en moderno]
    H[Etiquetar estatus<br/>CONTINUA si encontrado<br/>PAUSADO si no]
    I[Computar metrics<br/>contratos histórico vs moderno<br/>AD% histórico vs moderno]
    J[(continuidad.parquet<br/>50 filas - una por histórico)]
    K[/historico sección Continuidad]

    A --> C
    B --> C
    C --> D
    D --> E
    D --> F
    E --> G
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
```

## El problema del nombre sin RFC

CompraNet 5.0 **no incluye RFC**. ComprasMX moderno **sí**.
Entonces el cruce entre los dos no se puede hacer por RFC; hay
que hacerlo por **nombre del proveedor**, que en CompraNet 5.0
viene con todas las variantes humanamente posibles:

- `Farmaceuticos Maypo, S.A. de C.V.`
- `FARMACEUTICOS MAYPO SA DE CV`
- `Farmaceuticos Maypo S A de C V`
- `FARMACEUTICOS MAYPO`

Todas son la misma empresa. El builder normaliza:

```python
def normalize(name):
    s = name.upper()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    # Quitar sufijos legales típicos
    for suffix in ["S.A. DE C.V.", "SA DE CV", "S.C.", "S DE RL", ...]:
        s = s.replace(suffix, "")
    s = re.sub(r"[^A-Z0-9 ]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s
```

## Schema del Parquet (`continuidad.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `proveedor_historico` | str | nombre tal cual en CompraNet 5.0 |
| `proveedor_moderno_match` | str | nombre encontrado en ComprasMX moderno (o `null`) |
| `rfc_proveedor_moderno` | str | RFC encontrado (cuando match) |
| `contratos_historico` | int | total en 2010-2022 |
| `monto_historico_mxn` | float | suma en histórico |
| `contratos_moderno` | int | total en 2024-25 (0 si no match) |
| `monto_moderno_mxn` | float | suma en moderno (0 si no match) |
| `ad_pct_historico` | float | % AD en histórico |
| `ad_pct_moderno` | float | % AD en moderno (null si no match) |
| `estatus` | str | `"CONTINÚA"` o `"PAUSADO"` |
| `match_confidence` | str | `"EXACTO"`, `"FUZZY"`, o `"NULO"` |
| `match_score` | float | score fuzzy (null si exacto o nulo) |

## Decisiones clave

1. **Solo top 50 históricos**: el universo de proveedores
   completos es enorme (cientos de miles). Limitamos al top 50
   por monto acumulado porque son los actores con peso real.
2. **Fuzzy threshold 90/100 conservador**: rapidfuzz score. Por
   debajo de 90 el riesgo de falso positivo crece y preferimos
   marcar `PAUSADO` que reportar continuidad inexistente.
3. **Distinguir confianza del match**: el sitio etiqueta cada
   row con `EXACTO`, `FUZZY` o `NULO` para que el lector pueda
   ponderar la conclusión.
4. **No imputar continuidad legal**: dos nombres que matchean
   pueden ser razones sociales distintas que compraron, se
   fusionaron, o cambiaron de dueño. El builder reporta el
   match estadístico; la verificación final requiere RFC y
   eso solo lo da auditoría caso por caso.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **N proveedores que CONTINÚAN** | `/historico` Continuidad KPI |
| **N PAUSADOS** | `/historico` Continuidad KPI |
| **% match EXACTO** | `/historico` confidencia |
| **% match FUZZY** | `/historico` confidencia |
| **Tabla per-proveedor**: histórico vs moderno | `/historico` Continuidad |

## Cómo verificar

```python
import pandas as pd

cont = pd.read_parquet("data/processed/continuidad.parquet")

# Distribución de estatus
print(cont["estatus"].value_counts())

# Distribución de confianza
print(cont["match_confidence"].value_counts())

# Proveedores que continúan con mayor monto histórico
top = cont[cont["estatus"] == "CONTINÚA"].nlargest(
    5, "monto_historico_mxn"
)
print(top[
    ["proveedor_historico", "contratos_historico", "monto_historico_mxn",
     "contratos_moderno", "match_confidence"]
])

# Buscar Maypo
maypo = cont[cont["proveedor_historico"].str.contains("MAYPO", case=False)]
print(maypo[["proveedor_historico", "proveedor_moderno_match",
             "estatus", "match_confidence", "match_score"]])
```

## Fallos conocidos

- **Falsos positivos fuzzy**: "Construcciones Mexicanas" y
  "Construcciones Mexicanas del Norte" podrían matchear con
  score alto sin ser la misma empresa. El umbral 90 reduce esto
  pero no lo elimina.
- **Falsos negativos por sufijos**: si una variante tiene un
  sufijo legal que el normalizador no quitó, no matchea aunque
  sea la misma empresa.
- **Empresas que cambiaron de razón social**: si "Maypo SA" se
  convirtió en "Grupo Maypo Holdings SA", el match no las
  reconoce como continuas.

## Cómo se interpreta

`/historico` es explícito:

> CONTINÚA = proveedor con match positivo en el moderno.
> PAUSADO = no aparece en el moderno (puede haber cerrado,
> cambiado de razón social, o simplemente no haber contratado
> en 2024-25).

El propio sitio aclara que la "continuidad real" requiere
verificación por RFC que el archivo histórico no permite. La
señal es estadística, no jurídica.
