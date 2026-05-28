# ETL refresh · cuándo y cómo

## Estado al 2026-05-28

- Snapshot de fuentes (parquets en `data/processed/`): **2026-05-08**
- Bridge JSONs en `web/src/data/`: regenerados 2026-05-28 (post-refactor B)
- Bridge JSONs ML en `web/src/data/ml/`: regenerados 2026-05-28

Los parquets crudos siguen siendo del 08 de mayo. Las fuentes oficiales
(SAT EFOS, SESNSP, ComprasMX) publican mensual o continuo, así que
hay datos más nuevos disponibles en cada fuente.

## Qué hacer para refresh completo

```bash
# 1. Instalar deps (la primera vez)
.venv\Scripts\activate
pip install -r etl/requirements.txt

# 2. Correr todo el ETL (descarga raw → genera parquets)
python etl/run_all.py

# 3. Regenerar el pipeline ML sobre parquets nuevos
python ml/scripts/01_reconocimiento.py
python ml/scripts/02_comprasmx_historico.py
python ml/scripts/03_comprasmx_reciente.py
python ml/scripts/04_sesnsp.py
python ml/scripts/05_sat_efos.py
python ml/scripts/06_cruces.py
python ml/scripts/07_consolidacion.py
python ml/scripts/08_reporte_ejecutivo.py
python ml/scripts/09_series_proveedores_top.py
python ml/scripts/10_clustering_proveedores.py
python ml/scripts/11_textual_descripciones.py
python ml/scripts/12_red_proveedor_institucion.py
python ml/scripts/13_consolidacion_historico.py
python ml/scripts/14_validacion_contextual.py
python ml/scripts/15_pipeline_por_estado.py
python ml/scripts/16_continuidad_temporal.py
python ml/scripts/17_huerfanos_oneshot.py

# 4. Regenerar JSONs del bridge
python ml/scripts/18_export_ml_json.py
# (export_json.py ya se corre como último paso de run_all.py)

# 5. Verificar
cd web && npm run check && npm run build
```

## Por qué NO se hizo automáticamente en esta sesión

El ETL ingesta de fuentes externas y puede:
- Tardar horas según conectividad y volumen
- Fallar a media corrida si una fuente está caída
- Cambiar el shape de datos si una fuente publicó esquema nuevo

Decidir cuándo refrescar es un acto editorial, no técnico.

## Refresh parcial

Si sólo querés actualizar UN dataset (ejemplo: SAT EFOS, que se publica
trimestralmente):

```bash
python etl/sat_efos.py
python etl/build_efos_metrics.py
python etl/export_json.py        # regenera JSONs del bridge
# si querés que los hallazgos ML se actualicen:
python ml/scripts/05_sat_efos.py
python ml/scripts/06_cruces.py
python ml/scripts/07_consolidacion.py
python ml/scripts/13_consolidacion_historico.py
python ml/scripts/18_export_ml_json.py
```

## Cómo verificar si una fuente tiene data nueva sin re-ingestar

Cada source script en `etl/*.py` tiene una función de descarga con URL.
Hacer un `curl -I` a la URL muestra el `Last-Modified`:

```bash
# Ejemplo: SAT EFOS publica un CSV
curl -I http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv
# Comparar el Last-Modified con la fecha del parquet actual
```
