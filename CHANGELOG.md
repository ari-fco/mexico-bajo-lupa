# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **ML investigation pipeline** (`ml/`): 18 reproducible Python scripts
  applying Isolation Forest, LOF, MAD, DBSCAN, KMeans, TF-IDF, HHI and
  Benford to the canonical parquets. Outputs 11 JSONs to
  `web/src/data/ml/` for static frontend consumption.
- **`/ml` section** in the web app: landing + 6 sub-routes
  (`/ml/anomalias`, `/ml/historico`, `/ml/oneshots`, `/ml/estados`,
  `/ml/efos`, `/ml/temporal`). Includes a choropleth map of risk
  index per state, interactive filterable tables, and a dedicated
  OpenGraph image. ML routes added to sitemap (48 total URLs).
- **Content-Security-Policy** header in `next.config.ts` with
  origin-specific allowances for maplibre tile glyphs and blob:
  worker URIs. Defense in depth against XSS and data exfiltration.
- **Tooltips on ML method abbreviations** (`MAD`, `IF`, `LOF`,
  `DBSCAN`, `EFOS`, etc.) via a centralized `FlagBadge` component
  with `FLAG_DESCRIPTIONS` dictionary, so hover discovery is
  consistent across pages.
- **Editorial-relevance split on `/ml/anomalias` Tier 3 cards**:
  contracts ≥ \$100M MXN shown as "Mayor relevancia"; smaller ones
  in a separate "Outliers estadísticos · monto menor" section with
  a disclaimer.
- **Visible data-quality caveat on `/fuentes`**: the 57% missing
  fecha_firma in ComprasMX is now a dedicated callout instead of
  fine print buried inside the source description.
- **Three new architecture docs**:
  `docs/performance-baseline.md` (bundle sizes + how to re-measure
  Lighthouse), `docs/etl-refresh.md` (when and how to re-run the
  ETL), `docs/duckdb-wasm-migration.md` (migration plan for when
  the JSON bridge stops scaling).
- **Diagrama 5 · Pipeline ML** in `docs/ARQUITECTURA.md` documenting
  the parquets → ml scripts → JSON bridge → /ml pages flow.

### Changed

- **`incidencia_categorias.json` split from 2.3 MB monolith into 7
  per-subtipo files** (~60 KB each) using a columnar format
  (parallel arrays). The frontend chunk that ships incidencia data
  dropped from ~2.3 MB to **41 KB**.
- `lib/queries.ts` `realIncidencia()` rewritten to iterate columnar
  arrays directly instead of filtering an array of objects.
- `Timestamp.utcnow()` replaced with `Timestamp.now(tz='UTC')` in
  `etl/export_json.py` and `ml/scripts/18_export_ml_json.py` to
  silence the Pandas 4 deprecation warning.
- Sexenio detection in `ml/scripts/14_validacion_contextual.py`
  now returns "Sin fecha" instead of misclassifying `ano=0`
  (records with NaT `fecha_firma`) as Calderón.

- `Comparar` route in the main nav.
- "Comparar con otro estado" CTA on every state dossier that deep-links
  to `/compara?a=<slug>` pre-selecting the current state.
- "Ver dossier completo" link on each side of `/compara` pointing at
  the corresponding `/estado/[slug]` route.
- Per-route OpenGraph descriptions on `/mapa`, `/anomalias`,
  `/metodologia`, `/fuentes`, `/efos`, `/historico`, `/compara` and
  `/estado/[slug]`.
- Dynamic OpenGraph image per state dossier (32 routes) showing the
  state name, abbreviation, CVE_ENT and four color-coded headline
  metrics. Pre-rendered at build via `generateStaticParams`.
- "Lo que sí existe" route suggestions on the 404 page.
- Print stylesheet that flips the dark theme to white and hides
  nav/footer/buttons so state dossiers print to paper cleanly.
- Hero secondary nav row on the home page surfacing `/efos`,
  `/historico` and `/compara` as inline text links.
- Search bar on the `/anomalias` 200+ dependencies table.
- Interactive search, AD-high and 10+-years filters, and column
  sort on the `/historico` top-50 providers table.
- Security headers (X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) and React strict mode in
  `next.config.ts`.
- `npm run typecheck` and `npm run check` scripts in
  `web/package.json` for pre-commit verification.
- Enriched PWA manifest (dir, categories, orientation, icon
  purpose).
- SAT 69-B and CompraNet 5.0 mentions in `docs/ARQUITECTURA.md`
  intro and diagram 1.
- `/compara` route in the sitemap.

### Changed

- Hero badge updated from "MVP V1 · SESNSP + CONAPO + ComprasMX" to
  "V1-V4 en vivo · 7 fuentes oficiales · 2.36M contratos
  analizados".
- Footer "Fuentes" column lists SAT and turns the INAI/IMCO entry
  into a link to `/transparencia` (with the correct V5 tag).
- Roadmap on the home reflects the shipped state — V7 EFOS dropped
  from "next" since `/efos` is live; new `done` status on the
  `Phase` component labels live work as "En vivo".
- V5 transparency pill on `/mapa` is now a clickable link to
  `/transparencia` with corrected version tag.
- `lib/types.ts` is the single source of truth for domain types;
  `lib/mock-data.ts` deleted along with its unused mock generators.
- Module docstrings on `lib/queries.ts` and `lib/duckdb.ts` describe
  the real architecture instead of the obsolete mock layer.
- All `target="_blank"` external links carry `rel="noopener
  noreferrer"` (was just `noreferrer`).

### Fixed

- **`sitemap.xml` and `robots.txt` were advertising `localhost:3000`
  to crawlers.** Centralised the site URL resolver in
  `lib/site-url.ts` with Vercel-aware precedence
  (`NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` →
  `VERCEL_URL` → localhost), so production now serves
  `https://mexico-bajo-lupa.vercel.app` everywhere without any env
  var configuration.
- `etl/run_all.py` was missing four steps: `sat_efos`,
  `build_efos_metrics`, `build_continuidad` and the explicit
  grouping. Running it against a clean checkout will now produce
  every JSON the frontend imports.
- Removed six unreferenced files from `web/public/`: five default
  starter SVGs and a 1KB `mexico-estados.geojson` that contained
  the literal text "404: Not Found".
- Sync'd stale version tags across `/fuentes`, `/transparencia` and
  `/estado/[slug]`: V3 → V5 for transparency-related entries; V4
  "pendiente" → "integrado" for the CompraNet 5.0 historical archive
  now that `/historico` is live; V2 tags for not-on-roadmap files
  changed to `próximo`. Removed the unused v2 branch from the
  `/fuentes` badge rendering.
- `/historico` KPI hint said "2010 → 2024" but the rest of the
  project consistently calls CompraNet 5.0 a 2010-2022 archive.
  Aligned to "2010 → 2022".

## [0.1.0] — 2026-05-12

First public release. The project goes from a local prototype to a
public repository and a live URL at
[mexico-bajo-lupa.vercel.app](https://mexico-bajo-lupa.vercel.app).

### Added

- Six official sources fully integrated: SESNSP (413,952 records),
  CONAPO, INEGI PIB, CONEVAL, ComprasMX (235k federal + state) and
  SHCP (250k monthly rows).
- SAT Art. 69-B EFOS list integrated and cross-referenced against
  ComprasMX federal — surfaces contracts to companies the SAT has
  flagged for simulated invoicing.
- Historical CompraNet 5.0 archive integrated: 2.36M federal contracts
  2010-2022 with per-sexenio aggregates and annual Benford.
- Twelve routes live: `/`, `/mapa`, `/estado/[slug]` (32 states),
  `/anomalias`, `/efos`, `/compara`, `/historico`, `/metodologia`,
  `/fuentes`, `/transparencia`, plus `sitemap.xml` and `robots.txt`.
- Interactive search, status filter and column sort on `/efos`
  providers table and `/efos` dependencies table.
- Interactive segmented filters and sort on `/efos` "casos para
  revisar" headline list.
- Rotating editorial findings banner (`AnomaliasDestacadas`) on the
  landing page, daily-seeded and pausable.
- Honest V5 stub at `/transparencia` explaining why the transparency
  ranking is not active yet and what would unblock it.
- Custom OG image with the headline 72.3% federal AD stat.
- MIT license, project-aware READMEs at root, `web/` and `etl/`.

### Changed

- Replaced the `create-next-app` boilerplate `web/README.md` with a
  frontend-package README that documents stack, layout, and commands.
- Rewrote root `README.md` around the shipped state instead of the
  pre-deploy checklist.
- Normalized line endings via `.gitattributes` so the repo behaves
  identically across Windows, macOS and Linux contributors.

### Fixed

- Recharts 3 `formatter` callback typings on five tooltip
  implementations (was hard-typed as `number`, must coerce from
  `ValueType | undefined`).
- MapLibre 5 layer event typings on three `map.on` handlers — must
  use `MapLayerMouseEvent` and `MapLayerTouchEvent` when a layer id
  is passed, not `MapMouseEvent`.
- Five `setState`-inside-`useEffect` violations flagged by the
  React 19 / Next 16 hooks rule. Two refactored to
  `useSyncExternalStore`, three to the "adjust state during render"
  pattern from the React docs.
- `button.tsx` duplicate-`href` warning in the `Link` spread.
- Assorted strict-mode TypeScript fixes (`null` in `sort`,
  unused `@ts-expect-error`).
- Removed unused imports flagged by lint; configured the rule to
  honour the `_` prefix for intentional unused parameters.

### Infrastructure

- Private git repository moved to `github.com/ari-fco/mexico-bajo-lupa`,
  public.
- Continuous deploy via Vercel — push to `main` triggers a build.
- GitHub App scoped to a single repository; no broader access.
- Six topic tags applied to the GitHub repository
  (`mexico`, `data-journalism`, `nextjs`, `benford-analysis`,
  `public-data`, `forensic-statistics`, `open-data`,
  `transparencia`).
