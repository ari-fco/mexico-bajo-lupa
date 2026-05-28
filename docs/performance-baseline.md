# Performance baseline · México Bajo Lupa

> Línea base medida 2026-05-28 después de los refactors A-F. Re-medir
> tras cada cambio mayor.

## Tamaños de bundle (producción local, `next build`)

| Métrica | Valor |
|---|---|
| `web/.next/static/chunks/` total | **4.1 MB** |
| Chunk más grande (maplibre-gl) | 1.04 MB |
| Chunk de datos estados+dependencias | 515 KB |
| Chunk de incidencia (post-split) | 41 KB |

**Mejora clave del refactor B (split de `incidencia_categorias`):**

```
ANTES: incidencia_categorias.json     = 2.3 MB monolítico, en cualquier import
DESPUÉS: 7 archivos por subtipo + manifest
  - incidencia_cat__homicidio_doloso.json     63.2 KB
  - incidencia_cat__feminicidio.json          58.9 KB
  - incidencia_cat__secuestro.json            59.0 KB
  - incidencia_cat__extorsion.json            61.0 KB
  - incidencia_cat__robo_vehiculo.json        66.5 KB
  - incidencia_cat__robo_transeunte.json      63.6 KB
  - incidencia_cat__violencia_familiar.json   67.0 KB
  - incidencia_categorias_manifest.json        0.5 KB
                                          ───────────
                                    TOTAL: 440 KB
```

El chunk final que carga estas data es **41 KB** (formato columnar + tree-shaking).

## Security headers (producción)

Medido contra `https://mexico-bajo-lupa.vercel.app`:

| Header | Status | Notas |
|---|---|---|
| `Strict-Transport-Security` | ✓ | `max-age=63072000; includeSubDomains; preload` (2 años, listo para preload) |
| `Content-Security-Policy` | ✓ | Agregada en refactor A (default-src 'self', script/style 'unsafe-inline' por SSG, blob: para maplibre workers) |
| `X-Frame-Options` | ✓ | DENY |
| `X-Content-Type-Options` | ✓ | nosniff |
| `Referrer-Policy` | ✓ | strict-origin-when-cross-origin |
| `Permissions-Policy` | ✓ | camera/microphone/geolocation/interest-cohort denied |

## Cómo re-medir Lighthouse

Lighthouse en local requiere un build + servidor + Chrome. Comando rápido:

```bash
cd web
npm run build
npx -p lighthouse lighthouse https://mexico-bajo-lupa.vercel.app \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output-path=./lighthouse-report.html \
  --chrome-flags="--headless --no-sandbox"
```

Alternativa sin instalar: [PageSpeed Insights](https://pagespeed.web.dev/) con la URL de producción.

## Cómo se mide bundle size

```bash
cd web
npm run build
du -sk .next/static/chunks/        # total
find .next/static/chunks -name "*.js" | xargs ls -la | sort -k5 -rn | head -5  # top 5
```

## Próximas optimizaciones identificadas

1. **Migración a DuckDB-WASM** (refactor H): los JSONs grandes
   (`incidencia_homicidios.json` 195 KB, `dependencias_riesgo.json` 41 KB)
   podrían migrarse a parquet servidos vía DuckDB-WASM, queries SQL
   del lado cliente.

2. **maplibre-gl lazy import**: el chunk de 1 MB sólo es necesario en
   `/mapa` y `/ml/estados`. Hoy ya se carga como chunk separado por
   Next.js (no entra al bundle inicial), pero confirmar comportamiento.

3. **OG image cache**: las OG images se renderizan en runtime (ƒ en el
   build output). Para alto tráfico, considerar el flag de Next.js
   para hacerlas estáticas a build-time.
