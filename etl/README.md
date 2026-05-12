# ETL · México Bajo Lupa

Scripts Python que descargan datos oficiales mexicanos, los normalizan, y
producen Parquet listos para que el frontend (Next.js + DuckDB-WASM) los lea.

## Filosofía

- **Cada fuente, un script.** Si SESNSP rompe su esquema, sólo `sesnsp.py` se cae.
- **Normalización canónica** de claves de estado (`CVE_ENT` 01-32 del INEGI).
- **Parquet doble salida**: `data/processed/` para inspección + `web/public/data/` para que el navegador lea con range requests.
- **Falla ruidosamente.** Si una fuente cambia su CSV, el script se detiene con un mensaje claro. No silenciar errores.

## Requisitos

- Python 3.11+
- 2 GB libres en disco (los CSV crudos pesan)

## Setup

```bash
cd PROYECTO-MEXICO
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell
# source .venv/bin/activate     # macOS/Linux
pip install -r etl/requirements.txt
```

## Correr todo

```bash
python etl/run_all.py
```

Esto ejecuta en orden: `sesnsp.py` → `inegi_poblacion.py` → `comprasmx.py` → `build_metrics.py`.

## Correr un paso individual

```bash
python etl/sesnsp.py
python etl/inegi_poblacion.py
python etl/comprasmx.py
python etl/build_metrics.py
```

## Cuando una fuente rompe

Las URLs de descarga rotan. Si un script falla con HTTP 404:

1. Abre la landing oficial (cada script tiene la URL en su docstring).
2. Descarga el CSV vigente manualmente a `data/raw/<filename>.csv`.
3. Vuelve a correr el script — usa el archivo local si existe.

## Salida esperada (al terminar `run_all.py`)

```
data/processed/
  sesnsp_estatal.parquet
  conapo_poblacion.parquet
  comprasmx_contratos.parquet
  estado_metrics.parquet

web/public/data/
  sesnsp_estatal.parquet      ← navegador
  conapo_poblacion.parquet
  comprasmx_contratos.parquet
  estado_metrics.parquet
```

Una vez generados, el frontend los detecta automáticamente (cuando se
edita `web/src/lib/queries.ts` para usar DuckDB-WASM en lugar de mock).
