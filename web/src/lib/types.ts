/**
 * Consolidated domain types.
 *
 * Single source of truth for the shapes consumed across the app.
 * lib/queries.ts reads real JSON exports from the ETL and casts them
 * to these types; UI components import the types from here.
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

// === ML — Investigación no supervisada (2026-05) ===

/** Contrato con múltiples señales de anomalía. */
export type MlAnomaliaContrato = {
  contrato_id: string;
  institucion?: string | null;
  ramo?: string | null;
  modalidad: string;
  monto: number;
  fecha_firma?: string | null;
  proveedor: string;
  rfc_proveedor?: string | null;
  descripcion: string;
  n_flags: number;
  score_combinado: number;
  flag_monto_extremo?: boolean;
  flag_isoforest?: boolean;
  flag_lof?: boolean;
  flag_dbscan_noise?: boolean;
  flag_efos?: boolean;
};

/** Contrato histórico con señales de anomalía (8 señales). */
export type MlAnomaliaContratoHistorico = {
  contrato_id: string;
  ano: number;
  fecha_firma?: string | null;
  ramo: string;
  modalidad: string;
  proveedor: string;
  monto: number;
  descripcion: string;
  n_flags: number;
  score_combinado: number;
  flag_monto_extremo: boolean;
  flag_isoforest: boolean;
  flag_lof: boolean;
  flag_efos_nombre: boolean;
  flag_post_presuncion: boolean;
  flag_proveedor_alto_score: boolean;
  flag_benford_anomalo: boolean;
  flag_temporal_jump: boolean;
};

/** One-shot wonder: proveedor con un solo contrato. */
export type MlOneShot = {
  proveedor: string;
  proveedor_norm: string;
  ano_unico: number;
  sexenio_unico: string;
  modalidad_unico: string;
  ramo_unico: string;
  monto_unico: number;
  descripcion_unico: string;
  es_efos: boolean;
};

/** Métricas por estado (32) con índice compuesto de riesgo. */
export type MlEstadoRiesgo = {
  cve_ent: string;
  estado: string;
  n_contratos: number;
  monto_total_mxn: number;
  pct_AD: number;
  pct_LP: number;
  n_proveedores: number;
  n_instituciones: number;
  top_proveedor_nombre: string | null;
  top_proveedor_share: number;
  top_institucion: string | null;
  top_institucion_share: number;
  hhi_proveedores: number;
  hhi_instituciones: number;
  pct_fecha_null: number;
  delitos_total: number;
  indice_riesgo: number;
};

/** Contrato a un proveedor EFOS, firmado DESPUÉS de su presunción. */
export type MlEfosPostPresuncion = {
  proveedor: string;
  rfc_proveedor: string;
  monto: number;
  fecha_firma: string;
  fecha_presuncion: string;
  fecha_publicacion: string;
  estatus: string;
  modalidad?: string | null;
  ramo?: string | null;
  institucion?: string | null;
};

/** Proveedor por patrón de continuidad temporal. */
export type MlContinuidadProveedor = {
  proveedor: string;
  n_contratos: number;
  monto_total: number;
  monto_max: number;
  n_anos: number;
  primer_ano: number;
  ultimo_ano: number;
  n_sexenios: number;
  intensidad: number;
  sexenio_dominante: string;
  pct_dominante: number;
  pct_Calderón: number;
  pct_EPN: number;
  pct_AMLO: number;
  pct_Sheinbaum: number;
  solo_electorales: boolean;
  patron_temporal: "estandar" | "solo_electorales" | "transitorio" | "persistente";
};

/** Dependencia con concentración alta de gasto en pocos proveedores. */
export type MlHhiDependencia = {
  institucion: string;
  monto_total: number;
  n_contratos: number;
  n_proveedores: number;
  hhi: number;
  top_share: number;
  top_proveedor: string;
  nombre_top_proveedor: string;
};

/** Contrato a empresa EFOS (cruce SAT × ComprasMX). */
export type MlEfosContrato = {
  contrato_id: string;
  ramo: string;
  modalidad: string;
  monto: number;
  fecha_firma?: string | null;
  proveedor: string;
  rfc_proveedor?: string | null;
  ano: number;
  fuente: "reciente" | "historico";
};

/** Metadatos del export ML (contadores agregados, fechas). */
export type MlMeta = {
  generated_at: string;
  anomalias_robustas_reciente: {
    n_total: number;
    n_export: number;
    n_flags_max: number;
    monto_total_mxn: number;
  };
  anomalias_robustas_historico: {
    n_total: number;
    n_export: number;
    n_5_flags: number;
    n_4_flags: number;
  };
  oneshots: {
    n_total: number;
    pct_de_proveedores: number;
    monto_total_mxn: number;
    n_mayor_100M: number;
    n_mayor_500M: number;
    n_mayor_1000M: number;
  };
  efos_post_presuncion: { n: number };
  estados: { n_estados: number };
  continuidad: {
    n_solo_electorales: number;
    n_transitorios: number;
    n_persistentes: number;
  };
};
