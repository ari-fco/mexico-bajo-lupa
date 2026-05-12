import { ESTADOS, type Estado } from "./estados";

/**
 * Mock dataset generator. Deterministic (seeded) so the dashboard looks
 * the same on every reload. When the real ETL runs, this file is dropped
 * in favor of Parquet loaded via DuckDB-WASM.
 */

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

export type IncidenciaRow = {
  cve_ent: string;
  estado: string;
  ano: number;
  mes: number; // 1-12
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

// "Risk profile" multipliers per estado — purely illustrative.
// (When real ETL replaces this, these vanish.)
const RISK_PROFILE: Record<string, number> = {
  "01": 0.7, "02": 1.4, "03": 0.6, "04": 0.5, "05": 0.85, "06": 1.05,
  "07": 0.9, "08": 1.4, "09": 1.6, "10": 0.8, "11": 1.7, "12": 1.55,
  "13": 0.7, "14": 1.5, "15": 1.6, "16": 1.6, "17": 1.4, "18": 0.85,
  "19": 1.35, "20": 0.7, "21": 0.95, "22": 0.6, "23": 0.95, "24": 0.7,
  "25": 1.25, "26": 0.95, "27": 1.0, "28": 1.5, "29": 0.55, "30": 1.1,
  "31": 0.4, "32": 0.85,
};

const DELITO_BASE_PER_100K: Record<DelitoCategoria, number> = {
  "Homicidio doloso": 22,
  "Robo a transeúnte": 95,
  "Robo de vehículo": 130,
  Extorsión: 7,
  "Violencia familiar": 250,
  Feminicidio: 1.4,
  Secuestro: 0.6,
};

function noisedSeasonal(year: number, month: number, base: number, r: number) {
  const seasonal = 1 + 0.06 * Math.sin(((month - 1) / 12) * Math.PI * 2);
  const trend = 1 + (year - 2018) * 0.015 * (r - 0.5) * 2;
  const noise = 0.85 + r * 0.3;
  return base * seasonal * trend * noise;
}

let cache: IncidenciaRow[] | null = null;

export function getMockIncidencia(): IncidenciaRow[] {
  if (cache) return cache;
  const rows: IncidenciaRow[] = [];
  const yearStart = 2018;
  const yearEnd = 2025;

  for (const e of ESTADOS) {
    const risk = RISK_PROFILE[e.cve] ?? 1;
    for (let y = yearStart; y <= yearEnd; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of DELITOS) {
          const base = DELITO_BASE_PER_100K[d] * risk;
          const por100k = noisedSeasonal(y, m, base, rand());
          const total = Math.max(
            0,
            Math.round((por100k * e.poblacion2020) / 100_000 / 12),
          );
          rows.push({
            cve_ent: e.cve,
            estado: e.nombre,
            ano: y,
            mes: m,
            delito: d,
            total,
            por_100k: +por100k.toFixed(2),
          });
        }
      }
    }
  }

  cache = rows;
  return rows;
}

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
  pib_per_capita: number; // MXN, precios constantes 2018
  pobreza_pct: number;
  pobreza_extrema_pct?: number;
  ano_pib?: number;
  ano_pobreza?: number;
  // V2: SHCP gasto federalizado (transferencias federales a la entidad)
  gasto_federalizado_total: number; // pesos absolutos del último año completo
  gasto_federalizado_per_capita: number; // pesos por habitante (CONAPO mismo año)
  ano_gasto?: number;
  // V3+: governance — populated as null until integrated
  transparencia_pct: number; // INAI compliance proxy (V3)
  // V3-A: ComprasMX ESTATAL — calculados sobre contratos del propio estado
  adjudicacion_directa_pct: number; // % AD del gasto estatal del estado
  benford_mad: number; // MAD Benford de los contratos estatales
  contratos_estatales?: number; // muestra disponible (umbral editorial: ≥30)
  ano_compras_estatal?: number; // último año con contratos firmados
};

let metricsCache: EstadoMetrics[] | null = null;

export function getEstadoMetrics(): EstadoMetrics[] {
  if (metricsCache) return metricsCache;
  const rows = getMockIncidencia();
  const r = mulberry32(7);
  const out: EstadoMetrics[] = ESTADOS.map((e) => {
    const filtered = rows.filter(
      (row) =>
        row.cve_ent === e.cve &&
        row.delito === "Homicidio doloso" &&
        ((row.ano === 2025) || (row.ano === 2024 && row.mes >= 1)),
    );
    const last12 = filtered.slice(-12);
    const total = last12.reduce((a, b) => a + b.total, 0);
    const por100k = (total / e.poblacion2020) * 100_000;
    const prev12 = filtered.slice(-24, -12);
    const totalPrev = prev12.reduce((a, b) => a + b.total, 0);
    const yoy = totalPrev === 0 ? 0 : (total - totalPrev) / totalPrev;

    const riesgo = Math.min(
      100,
      Math.max(0, por100k * 1.6 + r() * 12 - 5),
    );

    return {
      cve_ent: e.cve,
      estado: e,
      homicidios_100k_ult12m: +por100k.toFixed(2),
      homicidios_total_ult12m: total,
      riesgo: +riesgo.toFixed(1),
      cambio_yoy: +(yoy * 100).toFixed(1),
      pib_per_capita: Math.round(120_000 + r() * 380_000),
      pobreza_pct: +(8 + r() * 60).toFixed(1),
      gasto_federalizado_total: Math.round(2e10 + r() * 2.8e11),
      gasto_federalizado_per_capita: Math.round(15_000 + r() * 14_000),
      transparencia_pct: +(50 + r() * 48).toFixed(1),
      adjudicacion_directa_pct: +(15 + r() * 70).toFixed(1),
      benford_mad: +(0.004 + r() * 0.022).toFixed(4),
      contratos_estatales: 100 + Math.floor(r() * 1500),
      ano_compras_estatal: 2025,
    };
  });
  metricsCache = out;
  return out;
}

// === Benford mock ===
export type BenfordRow = {
  digito: number;
  esperado: number; // %
  observado: number; // %
};

export const BENFORD_EXPECTED: number[] = [
  30.103, 17.609, 12.494, 9.691, 7.918, 6.695, 5.799, 5.115, 4.576,
];

export function getMockBenford(seed = 17): BenfordRow[] {
  const r = mulberry32(seed);
  // Inject deviation that resembles a slightly suspicious dataset
  const noise = [0, 0, 0, 0, 0, 0, 0, 0, 0].map(() => (r() - 0.5) * 5);
  const observed = BENFORD_EXPECTED.map((v, i) => Math.max(0, v + noise[i]));
  const sum = observed.reduce((a, b) => a + b, 0);
  const normalized = observed.map((v) => (v / sum) * 100);
  return BENFORD_EXPECTED.map((esperado, i) => ({
    digito: i + 1,
    esperado,
    observado: +normalized[i].toFixed(2),
  }));
}

export type DependenciaRiesgo = {
  dependencia: string;
  estado: string;
  cve_ent: string;
  ramo?: string | null;
  contratos: number;
  monto_total: number; // MXN
  adj_directa_pct: number | null;
  benford_mad: number | null; // null = insufficient data for Benford (<300 obs)
  riesgo_score: number | null; // 0..100
};

export function getMockDependenciasRiesgo(): DependenciaRiesgo[] {
  const r = mulberry32(99);
  const sample = [
    "Secretaría de Seguridad Pública",
    "Sistema DIF Estatal",
    "Secretaría de Salud",
    "Comisión Estatal del Agua",
    "Secretaría de Obras Públicas",
    "Instituto de la Vivienda",
    "Procuraduría General de Justicia",
    "Secretaría de Educación",
    "Sistema de Transporte Colectivo",
    "Comisión Estatal de Vivienda",
    "Junta de Caminos",
    "Instituto del Deporte",
  ];
  const out: DependenciaRiesgo[] = [];
  for (const e of ESTADOS) {
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const dep = sample[Math.floor(r() * sample.length)];
      const adj = +(20 + r() * 70).toFixed(1);
      const mad = +(0.003 + r() * 0.025).toFixed(4);
      const score = Math.min(
        100,
        Math.max(0, adj * 0.6 + mad * 1500 + r() * 12),
      );
      out.push({
        dependencia: dep,
        estado: e.nombre,
        cve_ent: e.cve,
        contratos: 30 + Math.floor(r() * 480),
        monto_total: Math.round(2_000_000 + r() * 800_000_000),
        adj_directa_pct: adj,
        benford_mad: mad,
        riesgo_score: +score.toFixed(1),
      });
    }
  }
  return out.sort((a, b) => b.riesgo_score - a.riesgo_score);
}
