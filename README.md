# México Bajo Lupa

> Auditoría ciudadana de México — mapa interactivo + análisis estadístico crítico sobre datos oficiales.

**No es otro dashboard descriptivo.** Cruzamos seguridad, gasto público y compras del gobierno con estadística forense (Ley de Benford, MAD de Nigrini) para exponer lo que las cifras oficiales no dicen por sí solas.

```
PROYECTO-MEXICO/
├── web/                Next.js 16 + Tailwind v4 + MapLibre + Recharts
│   └── src/
│       ├── app/        Rutas (/, /mapa, /estado/[slug], /anomalias, /metodologia, /fuentes)
│       ├── components/ UI: mapa, charts, header, footer
│       ├── data/       JSON build-bridge (canónico = Parquet)
│       └── lib/        queries, types, geo, format, data-meta
├── etl/                Scripts Python — descargan y normalizan datos oficiales
│   ├── sesnsp.py · inegi_poblacion.py · inegi_pib.py
│   ├── coneval_pobreza.py · shcp_gasto.py · comprasmx.py
│   ├── build_metrics.py · export_json.py
│   ├── ocr_transparencia.py · imco_transparencia.py  (V3 stubs honestos)
│   └── run_all.py
├── data/               (gitignored) raw/ processed/
├── analysis/           Notebooks y demos (Benford)
├── docs/
│   └── ARQUITECTURA.md  Diagramas Mermaid + tabla de fuentes
├── DESIGN.md           Tokens del sistema Sequel
└── README.md           Este archivo
```

**Documentación técnica completa**: ver [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — 4 diagramas Mermaid + tabla de refresh por fuente.

---

## Estado actual del MVP (V1+V2)

✅ **Frontend funcional al 100% con DATOS OFICIALES REALES**:
- Landing con sistema visual Sequel completo + OG cards + sitemap + robots.txt + manifest PWA
- Mapa interactivo MapLibre con 7 métricas reales (Seguridad: homicidios/100k, total absoluto, percentil riesgo, Δ YoY · Economía: PIB per cápita, pobreza · Gobierno: gasto federalizado per cápita) + 3 métricas roadmap (transparencia, adj. directa estatal, Benford estatal)
- Dossier por estado con serie mensual de 7 categorías de delito + cruces socioeconómicos reales (PIB, pobreza, gasto federalizado)
- Página de Anomalías con análisis Benford nacional + ranking de 200+ dependencias federales filtrable por Ramo, paginación, scroll horizontal mobile
- Páginas de Metodología y Fuentes
- Mobile completo: hamburger drawer, hero clamp() responsive, touch handlers en mapa, tabla con scroll horizontal, skip-to-content, prefers-reduced-motion

✅ **ETL ejecutado** (6 fuentes integradas):
- **SESNSP**: 413,952 registros incidencia delictiva 2015-2025
- **CONAPO**: proyecciones poblacionales 1990-2040 por entidad
- **INEGI**: PIB por entidad federativa 2024 (precios constantes 2018)
- **CONEVAL**: pobreza multidimensional 2022 (32 entidades × 4 mediciones)
- **ComprasMX**: 235,392 contratos federales 2024-2025 (filtrados FEDERAL=223k, ESTATAL=12k para V4)
- **SHCP**: 250k filas mensuales 2011-2026 de gasto federalizado, 2.65 billones MXN total 2025

🟡 **Pendiente V3+**:
- Transparencia (IMCO BIPE / sucesor INAI) — sin fuente integrable hoy
- ComprasMX estatal — fuentes locales por estado
- Anomalía de la semana — pipeline automático

⚪ **GitHub + Vercel** — pendiente. Lo subiremos cuando vuelvas.

### Hallazgos clave de los datos reales

- **Colima** tiene la tasa más alta de homicidios per cápita (72.6/100k) — pero -25.6% YoY · Y es 3er lugar en gasto federalizado per cápita (25,549 MXN/persona). El recurso fluye, la violencia no cede.
- **Sinaloa** subió +68.3% YoY en homicidios (efecto guerra Mayos vs Chapitos)
- **Yucatán** es la entidad más segura (1.39/100k)
- **Edomex paradoja**: recibe el mayor monto absoluto (294 mil mdp federalizados, más que BCS+BC+Sonora juntos) pero el menor per cápita (16,587 MXN/persona) por su volumen poblacional. 42.9% de pobreza.
- **Combo "alto gasto + alta pobreza"** (banderas para análisis): Guerrero, Oaxaca, Chiapas, Tabasco — reciben más que media nacional pero pobreza no cede.
- **72.3% del gasto federal APF** se ejecuta por adjudicación directa (vs 20.2% licitación pública abierta)
- Top dependencias por riesgo Benford: FONACOT, Sistema Público de Radiodifusión, IABN (98%+ AD)
- **Top 3 PIB/cápita**: Campeche 495k (outlier petrolero), CDMX 422k, NL 326k MXN
- **Top 3 pobreza**: Chiapas 67.4%, Guerrero 60.4%, Oaxaca 58.4%

### Hallazgos V3 — Compras estatales

- **Tlaxcala 91.1% adjudicación directa estatal** — outlier brutal, 9 de cada 10 contratos sin licitación pública
- **Cluster "captura institucional + pobreza alta"**: Tlaxcala, Hidalgo (66.1% AD), San Luis Potosí (70.5%), Colima (64%) — todos con AD% alta y pobreza alta
- **Patrón "Benford-no-AD"** (formalmente competitivo, numéricamente sospechoso): Guerrero (MAD 0.0356, AD 16.4%), CDMX (MAD 0.0308, AD 51.8%), Baja California (MAD 0.0269, AD 14.7%). Hipótesis: fragmentación de contratos para evadir umbrales de licitación.

---

## Cómo correr el frontend

```powershell
cd web
npm install        # ya hecho, pero por si
npm run dev
```

Abre http://localhost:3000.

Rutas disponibles:
- `/` — Landing
- `/mapa` — Explorador interactivo
- `/estado/[slug]` — Dossier por estado (ej. `/estado/jalisco`, `/estado/ciudad-de-mexico`)
- `/anomalias` — Análisis Benford nacional
- `/metodologia`
- `/fuentes`

---

## Cómo correr el ETL (cuando vuelvas)

```powershell
# Desde la raíz del proyecto
python -m venv .venv
.venv\Scripts\activate
pip install -r etl/requirements.txt

# Todo el pipeline
python etl/run_all.py

# O paso por paso
python etl/sesnsp.py
python etl/inegi_poblacion.py
python etl/comprasmx.py
python etl/build_metrics.py
```

Esto produce:
- `data/processed/*.parquet` (para inspección)
- `web/public/data/*.parquet` (consumido por DuckDB-WASM en el navegador)

Si una fuente cambió su URL/esquema, los scripts fallan **ruidosamente** con un mensaje claro de qué archivo descargar manualmente y dónde colocarlo. Esto es deliberado.

---

## Migración de mock → datos reales

Cuando los Parquet existan en `web/public/data/`, hay que cambiar `web/src/lib/queries.ts` para usar `runSql` de `web/src/lib/duckdb.ts` en lugar de las funciones mock. Cada función ya tiene comentado el SQL exacto que debe correr.

Diff aproximado:
```ts
// antes
import { getMockIncidencia } from "./mock-data";
export function qIncidenciaSerieMensual(opts) {
  return getMockIncidencia().filter(...);
}

// después
import { runSql, registerParquet } from "./duckdb";
await registerParquet("sesnsp", "/data/sesnsp_estatal.parquet");
export async function qIncidenciaSerieMensual(opts) {
  return runSql(`SELECT ... FROM sesnsp.parquet WHERE ...`);
}
```

Como las funciones se vuelven async, las páginas de servidor (`/estado/[slug]`) ya no necesitan cambios (ya son async). Las clientes (mapa, charts) sí: hay que envolver con `useEffect` + estado o React Suspense.

---

## Checklist para cuando vuelvas

### Inmediato (antes de tocar nada)
- [ ] Levantar dev server (`cd web && npm run dev`) y revisar todas las rutas
- [ ] Validar que el diseño se ve bien (es subjetivo y son tus tokens — vos decidís)
- [ ] Decidir si las fuentes Fraunces/Inter te convencen como sustitutos de Bradford/VisueltPro o querés ajustar

### Datos reales (1-2 horas)
- [ ] `pip install -r etl/requirements.txt`
- [ ] Correr `python etl/sesnsp.py` — si falla, descargar manual el CSV vigente desde la landing y reintentar
- [ ] Correr `python etl/inegi_poblacion.py`
- [ ] Correr `python etl/comprasmx.py`
- [ ] Correr `python etl/build_metrics.py`
- [ ] Migrar `web/src/lib/queries.ts` a usar DuckDB-WASM (ver sección anterior)
- [ ] Validar que los números coinciden con los reportes oficiales (sanity check)

### Publicación (30 min)
- [ ] `git init && git add . && git commit -m "feat: MVP V1"` en la raíz
- [ ] Crear repo público en GitHub: `mexico-bajo-lupa`
- [ ] `git remote add origin ... && git push -u origin main`
- [ ] Conectar a Vercel (importar el subdir `/web` como root)
- [ ] Configurar dominio (sugerencia: `mexicobajolupa.mx` o `.com`)

### Roadmap V2-V4 (semanas)
- **V2**: integrar PIB estatal y CONEVAL pobreza desde INEGI
- **V3**: SHCP gasto federalizado + INAI cumplimiento de transparencia
- **V4**: ComprasMX completo (histórico CompraNet 5.0) + página "anomalía de la semana"

---

## Decisiones de diseño tomadas en este turno

1. **Sin servidor de aplicación.** ETL produce Parquet → CDN estático → DuckDB-WASM en el navegador. Costo de hosting cercano a cero.
2. **Tipografía sustituta.** Bradford y VisueltPro son licenciadas/de pago. Usé Fraunces (display) e Inter (sans) que son las mejores opciones libres. Cambialo cuando licencies las originales.
3. **GeoJSON.** TopoJSON de `diegovalle/5129746` (770KB). Tiene `state_code` numérico que normalizo a `cve_ent` padded.
4. **Datos mock deterministas.** Mismas cifras en cada reload (seed fijo). El "feel" del producto es realista pero las cifras no son evidencia.
5. **Páginas estado prerenderizadas.** `generateStaticParams` produce las 32 al build. Cero overhead en runtime.
6. **MAD Nigrini** como umbral forense, no chi-cuadrada — porque es lo que se cita en literatura forense moderna.

---

## Filosofía

> "DataMéxico te dice cuánto produce Nuevo León. Esto te dice cuáles dependencias del gobierno de Nuevo León tienen patrones de compra estadísticamente sospechosos."

- **CONCEPTOS > CÓDIGO**: cada gráfico explica qué mide y por qué.
- **POSTURA, NO DESCRIPCIÓN**: cuando dos oficinas dicen cosas distintas del mismo estado, lo decimos.
- **NO ACUSAMOS**: levantamos banderas estadísticas. Las acusaciones son trabajo de fiscales.
- **OPEN SOURCE**: cualquiera puede correr el ETL y reproducir los Parquet.

---

## Stack

| Capa | Herramienta |
|------|-------------|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Estilos | Tailwind v4 (CSS-first, `@theme`) |
| Mapa | MapLibre GL JS 5 |
| Charts | Recharts 3 |
| Datos en navegador | DuckDB-WASM 1.33 + Apache Arrow |
| ETL | Python 3.11 + pandas + pyarrow |
| Datos | Parquet (zstd) particionado |
| Hosting | Vercel (estático) |

---

Construido con cariño para México, en paz con los límites del MVP.
