/**
 * Single source of truth for data access.
 *
 * V1 reads pre-built JSON exported by etl/export_json.py from Parquet.
 * Same shape as mock-data so frontend doesn't change.
 *
 * V2+ will swap in DuckDB-WASM reading Parquet directly via lib/duckdb.ts.
 */

import estadoMetricsJson from "@/data/estado_metrics.json";
import incidenciaHomicidiosJson from "@/data/incidencia_homicidios.json";
import incidenciaCategoriasJson from "@/data/incidencia_categorias.json";
import benfordNacionalJson from "@/data/benford_nacional.json";
import dependenciasRiesgoJson from "@/data/dependencias_riesgo.json";

import { ESTADOS_BY_CVE, type Estado } from "./estados";
import {
  type IncidenciaRow,
  type EstadoMetrics,
  type BenfordRow,
  type DependenciaRiesgo,
  type DelitoCategoria,
} from "./mock-data";

// === Real data shapes (from JSON files) ===
type EstadoMetricsRaw = {
  cve_ent: string;
  estado: string;
  ano_corte: number;
  poblacion: number;
  homicidios_total_ult12m: number;
  homicidios_total_prev12m: number;
  homicidios_100k_ult12m: number;
  cambio_yoy: number;
  riesgo: number;
  pib_total?: number | null;
  pib_per_capita: number | null;
  ano_pib?: number | null;
  pobreza_pct: number | null;
  pobreza_extrema_pct?: number | null;
  vulnerables_carencias_pct?: number | null;
  ano_pobreza?: number | null;
  gasto_federalizado_total?: number | null;
  gasto_federalizado_per_capita?: number | null;
  ano_gasto?: number | null;
  transparencia_pct: number | null;
  adjudicacion_directa_pct: number | null;
  benford_mad: number | null;
  contratos_estatales?: number | null;
  ano_compras_estatal?: number | null;
};

type IncidenciaCategoriaRaw = {
  cve_ent: string;
  ano: number;
  mes: number;
  subtipo: string;
  total: number;
};

type DependenciaRaw = {
  institucion: string;
  ramo?: string | null;
  contratos: number;
  monto_total: number;
  adj_directa_pct: number | null;
  benford_mad: number | null;
  riesgo_score: number | null;
};

// === Transform: real → frontend types ===

function realEstadoMetrics(): EstadoMetrics[] {
  const rows = estadoMetricsJson as EstadoMetricsRaw[];
  return rows.map((r) => {
    const e: Estado | undefined = ESTADOS_BY_CVE[r.cve_ent];
    if (!e) {
      throw new Error(`Estado desconocido en metrics: ${r.cve_ent}`);
    }
    return {
      cve_ent: r.cve_ent,
      estado: e,
      homicidios_100k_ult12m: r.homicidios_100k_ult12m,
      homicidios_total_ult12m: r.homicidios_total_ult12m,
      riesgo: r.riesgo,
      cambio_yoy: r.cambio_yoy,
      // V2: economy (real)
      pib_per_capita: r.pib_per_capita ?? 0,
      pobreza_pct: r.pobreza_pct ?? 0,
      pobreza_extrema_pct: r.pobreza_extrema_pct ?? 0,
      ano_pib: r.ano_pib ?? undefined,
      ano_pobreza: r.ano_pobreza ?? undefined,
      // V2: SHCP gasto federalizado (real)
      gasto_federalizado_total: r.gasto_federalizado_total ?? 0,
      gasto_federalizado_per_capita: r.gasto_federalizado_per_capita ?? 0,
      ano_gasto: r.ano_gasto ?? undefined,
      // V3+ placeholders — 0 means "no data"
      transparencia_pct: r.transparencia_pct ?? 0,
      // V3-A: ComprasMX ESTATAL real (a nivel estado, no nacional)
      adjudicacion_directa_pct: r.adjudicacion_directa_pct ?? 0,
      benford_mad: r.benford_mad ?? 0,
      contratos_estatales: r.contratos_estatales ?? 0,
      ano_compras_estatal: r.ano_compras_estatal ?? undefined,
    };
  });
}

const SUBTIPO_TO_DELITO: Record<string, DelitoCategoria> = {
  "Homicidio doloso": "Homicidio doloso",
  Feminicidio: "Feminicidio",
  Secuestro: "Secuestro",
  Extorsión: "Extorsión",
  Extorsion: "Extorsión",
  "Robo de vehículo": "Robo de vehículo",
  "Robo de vehiculo": "Robo de vehículo",
  "Robo a transeúnte en vía pública": "Robo a transeúnte",
  "Robo a transeunte en via publica": "Robo a transeúnte",
  "Violencia familiar": "Violencia familiar",
};

function realIncidencia(opts: {
  cve_ent?: string;
  delito?: DelitoCategoria | string;
}): IncidenciaRow[] {
  const target = opts.delito ?? "Homicidio doloso";
  // Pick from categorías if available, else fall back to homicidios-only file
  const useCategorias = (incidenciaCategoriasJson as IncidenciaCategoriaRaw[])
    .length > 0;
  const rows: IncidenciaRow[] = [];
  if (useCategorias) {
    const matched = (incidenciaCategoriasJson as IncidenciaCategoriaRaw[]).filter(
      (r) => {
        if (opts.cve_ent && r.cve_ent !== opts.cve_ent) return false;
        const mapped = SUBTIPO_TO_DELITO[r.subtipo];
        if (!mapped) return false;
        return mapped === target;
      },
    );
    for (const r of matched) {
      const e = ESTADOS_BY_CVE[r.cve_ent];
      if (!e) continue;
      const por100k = (r.total / e.poblacion2020) * 100_000;
      rows.push({
        cve_ent: r.cve_ent,
        estado: e.nombre,
        ano: r.ano,
        mes: r.mes,
        delito: target as DelitoCategoria,
        total: r.total,
        por_100k: +por100k.toFixed(2),
      });
    }
  } else {
    // Homicidios only
    const matched = (incidenciaHomicidiosJson as Array<{
      cve_ent: string;
      ano: number;
      mes: number;
      total: number;
    }>).filter((r) => !opts.cve_ent || r.cve_ent === opts.cve_ent);
    for (const r of matched) {
      const e = ESTADOS_BY_CVE[r.cve_ent];
      if (!e) continue;
      const por100k = (r.total / e.poblacion2020) * 100_000;
      rows.push({
        cve_ent: r.cve_ent,
        estado: e.nombre,
        ano: r.ano,
        mes: r.mes,
        delito: "Homicidio doloso",
        total: r.total,
        por_100k: +por100k.toFixed(2),
      });
    }
  }
  return rows;
}

function realBenford(): BenfordRow[] {
  return (benfordNacionalJson as Array<{
    digito: number;
    esperado: number;
    observado: number;
  }>).map((r) => ({
    digito: r.digito,
    esperado: r.esperado,
    observado: r.observado,
  }));
}

function realDependencias(): DependenciaRiesgo[] {
  // Federal data — institución is the unit, no estado/cve_ent.
  // We expose them as "Federal · APF" so the UI can still render them.
  const rows = dependenciasRiesgoJson as DependenciaRaw[];
  return rows.map((r) => ({
    dependencia: r.institucion,
    estado: "Federal",
    cve_ent: "",
    ramo: r.ramo ?? null,
    contratos: r.contratos,
    monto_total: r.monto_total,
    adj_directa_pct: r.adj_directa_pct,
    benford_mad: r.benford_mad,
    riesgo_score: r.riesgo_score,
  }));
}

// === Public API (same signatures as before) ===

export function qIncidenciaSerieMensual(opts: {
  cve_ent?: string;
  delito?: string;
}): IncidenciaRow[] {
  return realIncidencia(opts);
}

export function qEstadoMetrics(): EstadoMetrics[] {
  return realEstadoMetrics();
}

export function qBenfordPorDependencia(_opts: {
  estado?: string;
  dependencia?: string;
}): BenfordRow[] {
  // The Benford JSON is national-level. Per-dependency Benford is in the
  // institucion records (each has its own `benford_mad` scalar). When the UI
  // wants a full distribution per dependency, we'd need to compute it from
  // the raw ComprasMX Parquet — for V1, we return the national curve.
  return realBenford();
}

export function qDependenciasRiesgo(): DependenciaRiesgo[] {
  return realDependencias();
}
