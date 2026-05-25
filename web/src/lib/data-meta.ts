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
  n_rows: number;
  n_subtipos: number;
  source: string;
};

type ComprasMxMeta = {
  years: number[];
  first_year: number | null;
  last_year: number | null;
  n_contratos: number;
  n_federal: number;
  n_estatal: number;
  n_sin_fecha_firma: number;
  pct_sin_fecha_firma: number | null;
};

type ComprasMxHistoricoMeta = {
  n_contratos: number;
  first_year: number;
  last_year: number;
  source: string;
};

type ConapoMeta = {
  n_rows: number;
  source: string;
};

type ShcpMeta = {
  first_year: number | null;
  last_year: number | null;
  n_rows: number;
  total_last_year_mxn: number | null;
  source: string;
};

type SatEfosMeta = {
  n_total: number;
  n_definitivos: number;
  n_presuntos: number;
  n_desvirtuados: number;
  n_sentencia_favorable: number;
  source: string;
};

type Meta = {
  generated_at: string;
  sesnsp: SesnspMeta | null;
  comprasmx: ComprasMxMeta | null;
  comprasmx_historico: ComprasMxHistoricoMeta | null;
  conapo: ConapoMeta | null;
  shcp: ShcpMeta | null;
  sat_efos: SatEfosMeta | null;
};

const META = metaJson as Meta;

/** Short Spanish month names indexed 0..11 (ene..dic).
 *
 * Exported so the rest of the app shares one canonical list — avoids
 * the four near-identical copies the codebase used to carry. */
export const MES_ABBR = [
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
export const COMPRASMX_N_FEDERAL = META.comprasmx?.n_federal ?? 0;
export const COMPRASMX_N_ESTATAL = META.comprasmx?.n_estatal ?? 0;
export const COMPRASMX_PCT_SIN_FECHA =
  META.comprasmx?.pct_sin_fecha_firma ?? null;

/** "2024-2025" — short range label for ComprasMX coverage. */
export const COMPRASMX_RANGE_LABEL =
  COMPRASMX_FIRST_YEAR === COMPRASMX_LAST_YEAR
    ? String(COMPRASMX_FIRST_YEAR)
    : `${COMPRASMX_FIRST_YEAR}-${COMPRASMX_LAST_YEAR}`;

// === ComprasMX histórico (CompraNet 5.0) ===

export const HISTORICO_N = META.comprasmx_historico?.n_contratos ?? 0;
export const HISTORICO_FIRST_YEAR =
  META.comprasmx_historico?.first_year ?? 2010;
export const HISTORICO_LAST_YEAR = META.comprasmx_historico?.last_year ?? 2024;
export const HISTORICO_RANGE_LABEL = `${HISTORICO_FIRST_YEAR}-${HISTORICO_LAST_YEAR}`;

// === Otras fuentes — counts ===

export const SESNSP_N_ROWS = META.sesnsp?.n_rows ?? 0;
export const CONAPO_N_ROWS = META.conapo?.n_rows ?? 0;
export const SHCP_N_ROWS = META.shcp?.n_rows ?? 0;
export const SHCP_LAST_YEAR = META.shcp?.last_year ?? null;
export const SHCP_TOTAL_LAST_YEAR_MXN = META.shcp?.total_last_year_mxn ?? null;

export const SAT_EFOS_N_TOTAL = META.sat_efos?.n_total ?? 0;
export const SAT_EFOS_N_DEFINITIVOS = META.sat_efos?.n_definitivos ?? 0;

// === Helpers de formato editorial específicos de data-meta ===
// Para enteros y compactos, usar fmtInt y fmtCompact de lib/format.

/** "2.35 millones" — long form en español. */
export function fmtMillones(n: number, decimals: number = 2): string {
  return `${(n / 1_000_000).toFixed(decimals)} millones`;
}

/** "2.65 billones MXN" — para gasto público (escala larga ES = 1e12). */
export function fmtBillonesMxn(n: number, decimals: number = 2): string {
  return `${(n / 1_000_000_000_000).toFixed(decimals)} billones MXN`;
}

export { META as DATA_META };
