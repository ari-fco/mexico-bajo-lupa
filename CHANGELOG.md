# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `Comparar` route in the main nav.
- "Comparar con otro estado" CTA on every state dossier that deep-links
  to `/compara?a=<slug>` pre-selecting the current state.
- Per-route OpenGraph descriptions on `/mapa`, `/anomalias`,
  `/metodologia`, `/fuentes`, `/efos`, `/historico`, `/compara` and
  `/estado/[slug]`.
- Dynamic OpenGraph image per state dossier (32 routes) showing the
  state name, abbreviation, CVE_ENT and four color-coded headline
  metrics. Pre-rendered at build via `generateStaticParams`.
- "Lo que sí existe" route suggestions on the 404 page.
- Print stylesheet that flips the dark theme to white and hides
  nav/footer/buttons so state dossiers print to paper cleanly.
- SAT 69-B and CompraNet 5.0 mentions in `docs/ARQUITECTURA.md`
  intro and diagram 1.
- `/compara` route in the sitemap.

### Changed

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

### Fixed

- `etl/run_all.py` was missing four steps: `sat_efos`,
  `build_efos_metrics`, `build_continuidad` and the explicit
  grouping. Running it against a clean checkout will now produce
  every JSON the frontend imports.
- Removed six unreferenced files from `web/public/`: five default
  starter SVGs and a 1KB `mexico-estados.geojson` that contained
  the literal text "404: Not Found".

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
