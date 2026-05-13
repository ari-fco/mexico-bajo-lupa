# Flujo · ComprasMX estatal (V3-A)

> El subset de ComprasMX que **sí permite analizar por entidad
> federativa** — 12,377 contratos con institución estatal
> claramente identificable. Esto alimenta dos métricas del mapa:
> "% adjudicación directa estatal" y "Benford MAD estatal".

## Diagrama end-to-end

```mermaid
flowchart TD
    A[comprasmx_contratos.parquet<br/>235,392 contratos totales]
    B[Filtro<br/>ambito = ESTATAL<br/>12,377 contratos]
    C[Resolver cve_ent<br/>desde nombre institucion<br/>p.ej. SECRETARIA DE SALUD DE COLIMA<br/>→ 06]
    D[Agregar por cve_ent]
    D1[% adjudicacion directa<br/>filtrar muestra >= 30 contratos]
    D2[Benford MAD primer digito<br/>requiere >= 300 contratos]
    E[(estado_metrics agregado V3-A<br/>columnas: adjudicacion_directa_pct<br/>benford_mad contratos_estatales)]
    F[/mapa Gobierno - 2 metricas<br/>/estado/&lsqb;slug&rsqb; KPIs<br/>banner home]

    A --> B
    B --> C
    C --> D
    D --> D1
    D --> D2
    D1 --> E
    D2 --> E
    E --> F
```

## Por qué este flujo es V3-A y no V1

ComprasMX **federal** ya estaba integrado en V1. El estatal **no
se desagregaba** porque la unidad geográfica del CSV federal es
la dependencia federal, no el estado.

Los contratos estatales que **sí aparecen en ComprasMX** son los
de las entidades públicas estatales que decidieron publicar
voluntariamente en la plataforma federal. No es exhaustivo —
muchos estados publican sus compras en sus propios portales
(compranetestado.*). Eso es V4 del roadmap.

Por eso este corte tiene **12,377 contratos** distribuidos en
32 estados, con muestras chicas (Tlaxcala 135 contratos, Hidalgo
1,040, etc.).

## Decisiones clave del ETL

1. **Filtro `ambito = ESTATAL`** sobre el Parquet federal+estatal
   ya producido por `etl/comprasmx.py`.
2. **Resolver `cve_ent` desde el nombre de la institución**: a
   diferencia del corte federal, acá el estado es identificable
   por el nombre (ej. "Secretaría de Salud del Estado de Colima"
   → `06`). Usamos `common.to_cve_ent()` con un parser fuzzy.
3. **Umbral editorial ≥30 contratos para AD%**: con menos
   contratos el ratio es ruidoso. Estados con muestra menor
   aparecen como "—" en el mapa.
4. **Umbral estadístico ≥300 contratos para Benford**: requisito
   forense de Nigrini. Muchos estados quedan abajo del umbral y
   su MAD se reporta como `null`.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **Tlaxcala 91.1% AD** (sobre 135 contratos) | banner home, `/mapa` AD%, dossier |
| **Spread vs mediana nacional 38%** | banner home |
| **Hidalgo 66.1% AD** | `/mapa`, dossier Hidalgo |
| **San Luis Potosí 70.5% AD** | `/mapa`, dossier |
| **Patrón Benford-no-AD (Guerrero, CDMX, BC)** | banner home, `/mapa` |

## Cómo verificar

```python
import pandas as pd

# Reproducir Tlaxcala 91.1%
em = pd.read_parquet("data/processed/estado_metrics.parquet")
tlax = em[em["estado"] == "Tlaxcala"].iloc[0]
print(f"Tlaxcala AD: {tlax['adjudicacion_directa_pct']:.1f}%")
print(f"Tlaxcala contratos: {tlax['contratos_estatales']}")
print(f"Tlaxcala Benford MAD: {tlax['benford_mad']:.4f}")

# Top 5 estatal con muestra suficiente
print(em[em["contratos_estatales"] >= 30].nlargest(5, "adjudicacion_directa_pct")[
    ["estado", "adjudicacion_directa_pct", "contratos_estatales"]
])

# Patron Benford-no-AD
suspect = em[
    (em["benford_mad"] >= 0.025) &
    (em["adjudicacion_directa_pct"] < 55) &
    (em["contratos_estatales"] >= 30)
]
print(suspect[["estado", "benford_mad", "adjudicacion_directa_pct"]])
```

## Fallos conocidos

- **Muestra chica**: Tlaxcala tiene solo 135 contratos. La cifra
  es estadísticamente válida para AD% pero NO para Benford.
- **Cobertura incompleta**: muchos estados publican sus compras
  fuera de ComprasMX. Hidalgo (1,040 contratos) tiene mayor
  cobertura que Tlaxcala porque más entidades estatales suyas
  reportan acá.
- **No es comparable estado-a-estado de forma simple**: dado que
  cada estado tiene tasas diferentes de adopción de ComprasMX,
  comparar % AD entre estados es indicativo, no concluyente. El
  sitio documenta esto en `/metodologia` y `/anomalias-destacadas`.

## Próximos pasos

- **V4 · CompraNet estatal**: integrar los portales propios de
  cada estado (compranetestado.*). Eso sí permitiría una cobertura
  exhaustiva.
- **Filtros adicionales**: separar contratos de obra pública vs
  servicios vs adquisiciones. Cada categoría tiene un baseline
  Benford propio.
