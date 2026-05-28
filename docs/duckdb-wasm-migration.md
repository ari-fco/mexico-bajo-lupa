# DuckDB-WASM migration · plan

> Status: **investigado, no implementado**. La infra está lista en
> `web/src/lib/duckdb.ts` pero no se conectó al pipeline porque el
> refactor B (split de `incidencia_categorias`) redujo el bundle de
> 2.3 MB → 41 KB y la migración deja de ser urgente.

## Cuándo retomar

Activar DuckDB-WASM tiene sentido si:

- El bundle de `web/src/data/*.json` vuelve a pasar **1 MB** combinado.
- Aparecen filtros complejos en el UI (JOIN, GROUP BY arbitrario) que
  son incómodos de codificar con `.filter()` en TypeScript.
- Se quiere permitir que los usuarios escriban SQL directamente
  contra los parquets.

## Estado de la infra (lo que ya existe)

`web/src/lib/duckdb.ts` ya tiene:

- `getDuckDB()`: singleton del runtime, carga bundle de `getJsDelivrBundles()` (jsDelivr CDN).
- `registerParquet(name, url)`: registra un parquet remoto vía HTTP range requests.
- `runSql<T>(sql)`: helper para queries tipadas.

Componentes que usan DuckDB deben ser **`"use client"`** porque el
runtime sólo corre en el browser.

## Qué falta para activarlo

### 1. Publicar los parquets en `/web/public/data/`

Los parquets ya están en `data/processed/`. Hay que copiarlos a
`web/public/data/` durante el deploy. Opciones:

- **Hardcodeado en el ETL**: agregar al final de `etl/export_json.py`
  un paso `cp data/processed/*.parquet web/public/data/`.
- **Build script**: `package.json` con `"build": "node scripts/copy-data.js && next build"`.
- **Symlink en dev**: para no duplicar 138 MB de comprasmx_historico.

Hay que tener cuidado con `comprasmx_historico.parquet` (138 MB). Si
se hace bundle estático lo va a empacar entero. Mejor servir desde
una CDN externa (R2, S3) o usar la fragmentación por año.

### 2. Actualizar el CSP

El CSP actual restringe `script-src 'self' 'unsafe-inline'`. DuckDB-WASM
necesita:

- `script-src ... 'wasm-unsafe-eval' https://cdn.jsdelivr.net`
- `worker-src 'self' blob: https://cdn.jsdelivr.net`
- `connect-src ... https://cdn.jsdelivr.net`

Alternativa más segura: self-hostear el bundle de DuckDB-WASM
(`@duckdb/duckdb-wasm/dist/`) en `/public/duckdb/` y reemplazar
`getJsDelivrBundles()` por bundle paths locales. Eso evita expandir
el CSP al CDN externo.

### 3. Refactor de las queries

Las funciones en `lib/queries.ts` son síncronas (`qIncidenciaSerieMensual`,
`qDependenciasRiesgo`). DuckDB es async. Hay 2 caminos:

- **Migrar todas a async** (rompe los componentes que las consumen).
- **Capa híbrida**: leer parquets una sola vez en un `useEffect` al
  montar el componente, cachear el resultado en state, y mantener el
  resto del código síncrono. Esto es lo que recomienda el comentario
  inicial de `duckdb.ts`.

### 4. Verificación

- Bundle de cliente debería bajar (los JSON estáticos ya no son
  necesarios).
- Lighthouse: el FCP/LCP no debería degradar porque DuckDB-WASM se
  carga lazy.
- TTI puede aumentar levemente por el costo de inicialización del
  runtime (~200-500ms en hardware típico).

## Estimación

- 2-3 días de trabajo enfocado.
- Tests manuales en cada página que consume queries.
- Riesgo: bug raro al pasar de filtro JS a SQL si los strings tienen
  caracteres especiales (escape de quoting). DuckDB tiene parámetros
  preparados (`?`), conviene usarlos en lugar de string interpolation.
