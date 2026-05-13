# Flujos de datos · México Bajo Lupa

Cómo viaja cada cifra desde la fuente oficial mexicana hasta el
pixel que ves en la web. Un archivo por flujo, con diagrama
end-to-end, columnas de entrada y salida, decisiones clave del ETL,
y el snippet pandas que reproduce cualquier número que aparezca en
la UI.

> Si querés verificar una cifra puntual del sitio, abrí el flujo
> correspondiente, copiá el snippet, y reprodúcelo localmente
> contra `data/processed/*.parquet`. La trazabilidad estricta es
> la regla del proyecto.

## Índice

### Fuentes primarias (un script por fuente)

| Flujo | Fuente oficial | Script ETL | Output Parquet |
|---|---|---|---|
| [SESNSP](sesnsp.md) | Secretariado Ejecutivo · incidencia delictiva | `etl/sesnsp.py` | `sesnsp_estatal.parquet` |
| [CONAPO](conapo.md) | Consejo Nacional de Población · proyecciones | `etl/inegi_poblacion.py` | `conapo_poblacion.parquet` |
| [INEGI PIB](inegi-pib.md) | INEGI · PIB por entidad federativa | `etl/inegi_pib.py` | `inegi_pib.parquet` |
| [CONEVAL](coneval.md) | CONEVAL · pobreza multidimensional | `etl/coneval_pobreza.py` | `coneval_pobreza.parquet` |
| [SHCP](shcp.md) | SHCP · transferencias federales | `etl/shcp_gasto.py` | `shcp_gasto.parquet` |
| [ComprasMX federal](comprasmx-federal.md) | ComprasMX · contratos APF 2024-25 | `etl/comprasmx.py` | `comprasmx_contratos.parquet` (FEDERAL) |
| [ComprasMX estatal](comprasmx-estatal.md) | ComprasMX · contratos estatales 2024-25 | `etl/comprasmx.py` | `comprasmx_contratos.parquet` (ESTATAL) |
| [CompraNet 5.0 histórico](comprasmx-historico.md) | CompraNet 5.0 · archivo 2010-2022 | `etl/comprasmx_historico.py` | `comprasmx_historico.parquet` |
| [SAT 69-B EFOS](sat-efos.md) | SAT · Empresas Facturadoras Operaciones Simuladas | `etl/sat_efos.py` | `sat_efos.parquet` |

### Métricas derivadas (cruces y agregados)

| Flujo | Qué hace | Script ETL | Outputs |
|---|---|---|---|
| [Métricas por estado](metricas-estado.md) | Cruza fuentes por `cve_ent`, calcula percentiles y derivadas | `etl/build_metrics.py` | `estado_metrics.parquet`, `benford_nacional.parquet`, `dependencias_riesgo.parquet` |
| [Benford · MAD de Nigrini](benford.md) | Cómo se calcula la desviación Benford paso por paso | `etl/build_metrics.py` (subset) | columnas `benford_mad` |
| [EFOS × ComprasMX](efos-cruce.md) | Cruce SAT 69-B con proveedores federales | `etl/build_efos_metrics.py` | `efos_cruce.parquet`, `efos_top_*.parquet` |
| [Histórico CompraNet anual](historico-anual.md) | Agregados por año y sexenio + Benford anual | `etl/build_historico_metrics.py` | `historico_anual.parquet`, `historico_*.parquet` |
| [Continuidad proveedores](continuidad.md) | Match histórico → moderno por nombre normalizado | `etl/build_continuidad.py` | `continuidad.parquet` |

### Bridge frontend

| Flujo | Qué hace | Script ETL | Outputs |
|---|---|---|---|
| [Export JSON](export-json.md) | Convierte Parquet a JSON sincrono con sanitización NaN/Inf | `etl/export_json.py` | `web/src/data/*.json` |

## Convenciones compartidas

- **`cve_ent`** es la clave canónica del INEGI (`"01"` a `"32"`).
  Toda fuente se normaliza a esta clave antes de cruzar.
  Resolución en `etl/common.py::to_cve_ent()`.
- **Latin-1** es el encoding por default de los CSV oficiales
  mexicanos. UTF-8 es la excepción (ej. CompraNet 5.0 archivo).
- **Fallo ruidoso**: si una fuente cambia esquema o URL, el
  script se cae con mensaje claro. No se silencian errores.
- **Parquet con zstd**: salida canónica comprimida, dos copias
  (una en `data/processed/` para inspección, otra en
  `web/public/data/` para DuckDB-WASM cuando se active).

## Cómo reproducir cualquier cifra

```powershell
cd C:\Users\AriFr\dev\PROYECTO-MEXICO
python -m venv .venv
.venv\Scripts\activate
pip install -r etl/requirements.txt

# Después, en Python:
python -c "
import pandas as pd
df = pd.read_parquet('data/processed/estado_metrics.parquet')
print(df.head())
"
```

Cada flujo individual incluye el snippet exacto que reproduce su
cifra principal.

## Arquitectura general

Para la vista de pájaro del proyecto completo (no este detalle por
flujo) ver [`../ARQUITECTURA.md`](../ARQUITECTURA.md).
