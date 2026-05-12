# etl · data pipeline

Python scripts that download Mexican official datasets, normalize them,
and emit Parquet plus a sanitized JSON bridge that the frontend
imports synchronously.

For the project overview see the [main README](../README.md). This
file documents only the pipeline.

## Philosophy

- **One script per source.** If SESNSP changes its schema, only
  `sesnsp.py` breaks.
- **Canonical geographic key.** Every dataset is reduced to INEGI's
  `cve_ent` (01-32) before joins.
- **Fail loud.** If a source URL or schema changes, the script halts
  with a clear message naming the file to download manually. Never
  silently report wrong numbers.
- **Latin-1 everywhere.** All official Mexican CSVs are latin-1, not
  UTF-8. `common.py` enforces that.
- **NaN-safe JSON.** `export_json.py` strips NaN / Infinity so the
  TypeScript side never has to handle them.

## Setup

```bash
cd PROYECTO-MEXICO
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell
# source .venv/bin/activate     # macOS/Linux
pip install -r etl/requirements.txt
```

## Run the full pipeline

```bash
python etl/run_all.py
```

This runs every source script and then `build_metrics.py` to compute
derived metrics that depend on joins across sources.

## Run a single source

```bash
python etl/sesnsp.py             # SESNSP incidencia delictiva
python etl/inegi_poblacion.py    # CONAPO population
python etl/inegi_pib.py          # INEGI state GDP
python etl/coneval_pobreza.py    # CONEVAL multidimensional poverty
python etl/comprasmx.py          # ComprasMX federal + estatal 2024-2025
python etl/comprasmx_historico.py # CompraNet 5.0 archive 2010-2022
python etl/shcp_gasto.py         # SHCP federalized transfers
python etl/sat_efos.py           # SAT Art. 69-B EFOS list
```

## Compute derived metrics

After the source scripts have produced `data/processed/*.parquet`:

```bash
python etl/build_metrics.py            # estado_metrics, benford_nacional, dependencias_riesgo
python etl/build_efos_metrics.py       # SAT × ComprasMX cross-reference for /efos
python etl/build_historico_metrics.py  # per-year, per-sexenio, Benford anual for /historico
python etl/build_continuidad.py        # provider persistence across sexenios
python etl/export_json.py              # bridge parquet → web/src/data/*.json
```

## When a source breaks

Upstream URLs rotate. If a script fails with HTTP 404 or an unexpected
column:

1. Open the source landing page (each script's docstring has the URL).
2. Download the current CSV manually to `data/raw/<filename>.csv`.
3. Rerun the script — it reuses the local file if present.

## Outputs

```
data/processed/
  sesnsp_estatal.parquet         # 413,952 rows, 2015-2025
  conapo_poblacion.parquet       # 1,632 rows, 1990-2040
  inegi_pib.parquet              # PIB per entity, 2023-2024
  coneval_pobreza.parquet        # multidimensional poverty, 2022
  comprasmx_contratos.parquet    # 235k federal + state contracts, 2024-25
  comprasmx_historico.parquet    # 2.36M contracts, 2010-2022
  shcp_gasto.parquet             # 250k monthly rows, 2011-2026
  sat_efos.parquet               # 14,234 contributors, 11,270 Definitivos
  estado_metrics.parquet         # derived per-entity panel
  benford_nacional.parquet       # national first-digit distribution
  dependencias_riesgo.parquet    # 200+ federal dependencias, MAD + flag
  efos_cruce.parquet             # SAT × ComprasMX joined records
  efos_top_proveedores.parquet   # top providers cross-listed
  efos_top_dependencias.parquet  # dependencies signing with EFOS
  historico_anual.parquet        # per-year aggregates 2010-2022
  historico_benford_anual.parquet # Benford MAD per year
  historico_proveedores_top.parquet # top recurring providers
  continuidad.parquet            # provider sexenio persistence

web/src/data/
  *.json                         # sanitized bridge for synchronous TS imports

web/public/data/
  *.parquet                      # served for DuckDB-WASM (currently unused)
```

The first set is canonical. The second set is the build bridge — the
frontend imports those JSON files synchronously, so a checkout without
Python toolchain still builds and runs the site.

## Common pitfalls

- **Python on Windows lives in `WindowsApps\python.exe`**, not the
  Programs directory. Use absolute paths inside venv.
- **SESNSP source rotated to SharePoint** with ephemeral URLs — the
  pipeline reads from the `lapanquecita/incidencia-delictiva` mirror
  which syncs the official CSV monthly.
- **ComprasMX federal does not split by state.** Its geographic unit
  is the federal dependency. State-level Benford on `comprasmx_contratos`
  uses the `ESTATAL` subset only.
