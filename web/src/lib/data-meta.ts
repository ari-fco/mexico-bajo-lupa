/**
 * Single source of truth for "what period does our data cover?"
 *
 * Backed by web/src/data/meta.json which the ETL emits at the end of
 * etl/export_json.py. All UI labels that mention dates should derive from
 * here so they stay in sync with the actual ingested files.
 */

import metaJson from "@/data/meta.json";

type SesnspMeta = {
  first_year: number;
  last_year: number;
  last_month: number; // 1..12
  last_period: string; // "YYYY-MM"
  source: string;
};

type ComprasMxMeta = {
  years: number[];
  first_year: number | null;
  last_year: number | null;
  n_contratos: number;
};

type Meta = {
  generated_at: string;
  sesnsp: SesnspMeta | null;
  comprasmx: ComprasMxMeta | null;
  conapo: unknown | null;
};

const META = metaJson as Meta;

const MES_ABBR = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "ene 2025" — short label for a specific (year, 1..12) pair. */
export function fmtMesAno(year: number, month: number): string {
  const m = MES_ABBR[(month - 1 + 12) % 12];
  return `${m} ${year}`;
}

/** "ene 2025 – dic 2025" — period label spanning two (year, month) ends. */
export function fmtPeriodo(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number,
): string {
  return `${fmtMesAno(fromYear, fromMonth)} – ${fmtMesAno(toYear, toMonth)}`;
}

// === SESNSP-derived constants (use these in UI) ===

export const SESNSP_FIRST_YEAR = META.sesnsp?.first_year ?? 2015;
export const SESNSP_LAST_YEAR = META.sesnsp?.last_year ?? 2025;
export const SESNSP_LAST_MONTH = META.sesnsp?.last_month ?? 12;
export const SESNSP_LAST_PERIOD = META.sesnsp?.last_period ?? "2025-12";
export const SESNSP_LAST_PERIOD_LABEL = fmtMesAno(
  SESNSP_LAST_YEAR,
  SESNSP_LAST_MONTH,
);

/** "ene 2018 → dic 2025" — used by long monthly series charts. */
export const SESNSP_SERIE_LABEL = `${SESNSP_FIRST_YEAR} → ${SESNSP_LAST_YEAR}`;

/** Window covered by the "últimos 12 meses" SESNSP metric. */
export function ult12mLabel(): string {
  // last_month inclusive, last_month - 11 months ago.
  let y = SESNSP_LAST_YEAR;
  let m = SESNSP_LAST_MONTH - 11;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return fmtPeriodo(y, m, SESNSP_LAST_YEAR, SESNSP_LAST_MONTH);
}

// === ComprasMX-derived constants ===

export const COMPRASMX_YEARS = META.comprasmx?.years ?? [2024, 2025];
export const COMPRASMX_FIRST_YEAR = META.comprasmx?.first_year ?? 2024;
export const COMPRASMX_LAST_YEAR = META.comprasmx?.last_year ?? 2025;
export const COMPRASMX_N = META.comprasmx?.n_contratos ?? 0;

/** "2024-2025" — short range label for ComprasMX coverage. */
export const COMPRASMX_RANGE_LABEL =
  COMPRASMX_FIRST_YEAR === COMPRASMX_LAST_YEAR
    ? String(COMPRASMX_FIRST_YEAR)
    : `${COMPRASMX_FIRST_YEAR}-${COMPRASMX_LAST_YEAR}`;

export { META as DATA_META };
