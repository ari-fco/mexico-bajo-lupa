/**
 * Consolidated domain types — REFERENCE COPY (V1.5 cleanup).
 *
 * STATUS: this file is currently a *reference* copy of the types defined
 * inside `lib/mock-data.ts`. The plan is to:
 *   1. Land this file (done).
 *   2. After all parallel agents merge their work, flip imports throughout
 *      the codebase to point at `@/lib/types` instead of `@/lib/mock-data`.
 *   3. Delete the legacy `getMock*()` mock generators from `mock-data.ts`
 *      (they are no longer called — `lib/queries.ts` reads real JSON).
 *   4. Either re-export from `mock-data.ts` for back-compat or remove it.
 *
 * IMPORTANT: do NOT touch `lib/mock-data.ts` directly until the parallel
 * agents (EFOS / continuidad / anomalías destacadas) finish, because they
 * may still be reading `IncidenciaRow`, `EstadoMetrics`, `BenfordRow`,
 * `DependenciaRiesgo`, `DelitoCategoria`, or `DELITOS` from there.
 *
 * The exports below are a verbatim copy of the types in mock-data.ts at
 * the time this file was created. If you update one, update the other —
 * or finish step 2 above and delete the duplicate.
 */

import type { Estado } from "./estados";

// === Incidencia (SESNSP) ===

export type IncidenciaRow = {
  cve_ent: string;
  estado: string;
  ano: number;
  /** 1..12 */
  mes: number;
  delito: string;
  total: number;
  por_100k: number;
};

export type DelitoCategoria =
  | "Homicidio doloso"
  | "Robo a transeúnte"
  | "Robo de vehículo"
  | "Extorsión"
  | "Violencia familiar"
  | "Feminicidio"
  | "Secuestro";

export const DELITOS: DelitoCategoria[] = [
  "Homicidio doloso",
  "Robo a transeúnte",
  "Robo de vehículo",
  "Extorsión",
  "Violencia familiar",
  "Feminicidio",
  "Secuestro",
];

// === Estado-level composite metrics ===

export type EstadoMetrics = {
  cve_ent: string;
  estado: Estado;
  // Headline
  homicidios_100k_ult12m: number;
  homicidios_total_ult12m: number;
  // Composite percentile-based score 0..100
  riesgo: number;
  // % cambio interanual
  cambio_yoy: number;
  // V2: Economy (INEGI PIB + CONEVAL pobreza)
  pib_per_capita: number;
  pobreza_pct: number;
  pobreza_extrema_pct?: number;
  ano_pib?: number;
  ano_pobreza?: number;
  // V2: SHCP gasto federalizado
  gasto_federalizado_total: number;
  gasto_federalizado_per_capita: number;
  ano_gasto?: number;
  // V3: governance
  transparencia_pct: number;
  // V3-A: ComprasMX ESTATAL
  adjudicacion_directa_pct: number;
  benford_mad: number;
  contratos_estatales?: number;
  ano_compras_estatal?: number;
};

// === Benford (Nigrini MAD on first significant digit) ===

export type BenfordRow = {
  digito: number;
  /** % esperado por la ley de Benford */
  esperado: number;
  /** % observado en el dataset */
  observado: number;
};

/** Distribución teórica de Benford para el primer dígito significativo (%) */
export const BENFORD_EXPECTED: number[] = [
  30.103, 17.609, 12.494, 9.691, 7.918, 6.695, 5.799, 5.115, 4.576,
];

// === Dependencias (compras estatales) ===

export type DependenciaRiesgo = {
  dependencia: string;
  estado: string;
  cve_ent: string;
  ramo?: string | null;
  contratos: number;
  /** MXN */
  monto_total: number;
  adj_directa_pct: number | null;
  /** null = insufficient data for Benford (<300 obs) */
  benford_mad: number | null;
  /** 0..100; null cuando no se puede calcular */
  riesgo_score: number | null;
};
