# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
