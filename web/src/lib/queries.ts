/**
 * Single source of truth for data access.
 *
 * Reads pre-built JSON exported by etl/export_json.py from Parquet.
 * Synchronous imports keep the bridge simple — once the bundle approaches
 * the JSON size limit, swap in DuckDB-WASM reading Parquet directly via
 * lib/duckdb.ts without changing the function signatures consumed by
 * the UI.
 */

import estadoMetricsJson from "@/data/estado_metrics.json";
import incidenciaHomicidiosJson from "@/data/incidencia_homicidios.json";
// Incidencia categorías: hasta 2026-05 era UN solo JSON de 2.3 MB. Ahora
// está dividido por subtipo (~60 KB c/u). Importamos los 7 directamente —
// Next.js/Turbopack tree-shake los no usados por cada chunk de página,
// pero la red transfiere solo los necesarios porque cada uno es un módulo
// separado. (Si el bundle vuelve a crecer, migrar a `import()` dinámico.)
import incidenciaCatHomicidioJson from "@/data/incidencia_cat__homicidio_doloso.json";
import incidenciaCatFeminicidioJson from "@/data/incidencia_cat__feminicidio.json";
import incidenciaCatSecuestroJson from "@/data/incidencia_cat__secuestro.json";
import incidenciaCatExtorsionJson from "@/data/incidencia_cat__extorsion.json";
import incidenciaCatRoboVehiculoJson from "@/data/incidencia_cat__robo_vehiculo.json";
import incidenciaCatRoboTranseunteJson from "@/data/incidencia_cat__robo_transeunte.json";
import incidenciaCatViolenciaFamiliarJson from "@/data/incidencia_cat__violencia_familiar.json";
import benfordNacionalJson from "@/data/benford_nacional.json";
import dependenciasRiesgoJson from "@/data/dependencias_riesgo.json";

import { ESTADOS_BY_CVE, type Estado } from "./estados";
import {
  type IncidenciaRow,
  type EstadoMetrics,
  type BenfordRow,
  type DependenciaRiesgo,
  type DelitoCategoria,
} from "./types";

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

/** Formato columnar — arrays paralelos, ~40% más chico que array-of-objects. */
type IncidenciaCategoriaColumnar = {
  subtipo: string;
  cve_ent: string[];
  ano: number[];
  mes: number[];
  total: number[];
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

// Mapeo de DelitoCategoria (lo que pide el UI) al JSON columnar del subtipo.
const DELITO_TO_COLUMNAR: Record<DelitoCategoria, IncidenciaCategoriaColumnar> = {
  "Homicidio doloso": incidenciaCatHomicidioJson as IncidenciaCategoriaColumnar,
  Feminicidio: incidenciaCatFeminicidioJson as IncidenciaCategoriaColumnar,
  Secuestro: incidenciaCatSecuestroJson as IncidenciaCategoriaColumnar,
  Extorsión: incidenciaCatExtorsionJson as IncidenciaCategoriaColumnar,
  "Robo de vehículo": incidenciaCatRoboVehiculoJson as IncidenciaCategoriaColumnar,
  "Robo a transeúnte": incidenciaCatRoboTranseunteJson as IncidenciaCategoriaColumnar,
  "Violencia familiar": incidenciaCatViolenciaFamiliarJson as IncidenciaCategoriaColumnar,
};

function realIncidencia(opts: {
  cve_ent?: string;
  delito?: DelitoCategoria | string;
}): IncidenciaRow[] {
  const target = (opts.delito ?? "Homicidio doloso") as DelitoCategoria;
  const columnar = DELITO_TO_COLUMNAR[target];
  if (columnar) {
    const n = columnar.cve_ent.length;
    const rows: IncidenciaRow[] = [];
    for (let i = 0; i < n; i++) {
      const cve = columnar.cve_ent[i];
      if (opts.cve_ent && cve !== opts.cve_ent) continue;
      const e = ESTADOS_BY_CVE[cve];
      if (!e) continue;
      const total = columnar.total[i];
      const por100k = (total / e.poblacion2020) * 100_000;
      rows.push({
        cve_ent: cve,
        estado: e.nombre,
        ano: columnar.ano[i],
        mes: columnar.mes[i],
        delito: target,
        total,
        por_100k: +por100k.toFixed(2),
      });
    }
    return rows;
  }
  // Fallback: homicidios-only (formato legacy array-of-objects)
  const matched = (incidenciaHomicidiosJson as Array<{
    cve_ent: string;
    ano: number;
    mes: number;
    total: number;
  }>).filter((r) => !opts.cve_ent || r.cve_ent === opts.cve_ent);
  const rows: IncidenciaRow[] = [];
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
