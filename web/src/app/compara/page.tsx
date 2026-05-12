import type { Metadata } from "next";
import {
  ESTADOS,
  ESTADOS_BY_SLUG,
  slugForEstado,
  type Estado,
} from "@/lib/estados";
import { qEstadoMetrics, qIncidenciaSerieMensual } from "@/lib/queries";
import {
  SESNSP_LAST_MONTH,
  SESNSP_LAST_YEAR,
} from "@/lib/data-meta";
import { ComparaView, type CompPoint, type EstadoOption } from "@/components/compara-view";

const DEFAULT_A = "colima";
const DEFAULT_B = "yucatan";

function resolveSlug(input: string | undefined, fallback: string): Estado {
  if (input && ESTADOS_BY_SLUG[input]) return ESTADOS_BY_SLUG[input];
  return ESTADOS_BY_SLUG[fallback];
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}): Promise<Metadata> {
  const { a, b } = await searchParams;
  const eA = resolveSlug(a, DEFAULT_A);
  const eB = resolveSlug(b, DEFAULT_B);
  const title = `${eA.nombre} vs ${eB.nombre} · Comparador`;
  const description = `Lectura comparada entre ${eA.nombre} y ${eB.nombre}: homicidios por 100k, PIB per cápita, pobreza multidimensional, gasto federalizado y adjudicación directa estatal sobre datos oficiales.`;
  return {
    title,
    description,
    openGraph: {
      title: `${eA.nombre} vs ${eB.nombre}`,
      description,
    },
  };
}

// Build the (year, month) pairs covered by the "últimos 12 meses" window
// the rest of the dashboard uses, so this page agrees with the headline KPIs.
function ult12mWindow(): Array<{ ano: number; mes: number }> {
  const out: Array<{ ano: number; mes: number }> = [];
  let y = SESNSP_LAST_YEAR;
  let m = SESNSP_LAST_MONTH;
  for (let i = 0; i < 12; i++) {
    out.unshift({ ano: y, mes: m });
    m -= 1;
    if (m <= 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

function homicidesLast12(cve: string): CompPoint[] {
  const window = ult12mWindow();
  const rows = qIncidenciaSerieMensual({
    cve_ent: cve,
    delito: "Homicidio doloso",
  });
  // index by "YYYY-MM" for O(1) lookup
  const idx = new Map<string, number>();
  for (const r of rows) {
    idx.set(`${r.ano}-${r.mes}`, r.total);
  }
  return window.map(({ ano, mes }) => ({
    ano,
    mes,
    total: idx.get(`${ano}-${mes}`) ?? 0,
  }));
}

export default async function ComparaPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const estadoA = resolveSlug(a, DEFAULT_A);
  const estadoB = resolveSlug(b, DEFAULT_B);

  const metrics = qEstadoMetrics();
  const mA = metrics.find((x) => x.cve_ent === estadoA.cve);
  const mB = metrics.find((x) => x.cve_ent === estadoB.cve);

  // Defensive — should never happen with our defaults
  if (!mA || !mB) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24">
        <p className="text-light-ash">Datos no disponibles.</p>
      </div>
    );
  }

  // Pre-compute national min/max for each metric so the client can render
  // mini-bars positioning A and B inside the national distribution.
  type Range = { min: number; max: number };
  const ranges: Record<string, Range> = {
    homicidios_100k: rangeOf(metrics, (m) => m.homicidios_100k_ult12m),
    pib_per_capita: rangeOf(
      metrics.filter((m) => m.pib_per_capita > 0),
      (m) => m.pib_per_capita,
    ),
    pobreza_pct: rangeOf(
      metrics.filter((m) => m.pobreza_pct > 0),
      (m) => m.pobreza_pct,
    ),
    gasto_pc: rangeOf(
      metrics.filter((m) => m.gasto_federalizado_per_capita > 0),
      (m) => m.gasto_federalizado_per_capita,
    ),
    cambio_yoy: rangeOf(metrics, (m) => m.cambio_yoy),
    adj_directa: rangeOf(
      metrics.filter(
        (m) => (m.contratos_estatales ?? 0) >= 30 && m.adjudicacion_directa_pct > 0,
      ),
      (m) => m.adjudicacion_directa_pct,
    ),
  };

  // National rank by homicidios/100k (1 = peor). Used in hero subtitle.
  const ranked = [...metrics].sort(
    (a, b) => b.homicidios_100k_ult12m - a.homicidios_100k_ult12m,
  );
  const rankA = ranked.findIndex((x) => x.cve_ent === estadoA.cve) + 1;
  const rankB = ranked.findIndex((x) => x.cve_ent === estadoB.cve) + 1;

  const seriesA = homicidesLast12(estadoA.cve);
  const seriesB = homicidesLast12(estadoB.cve);

  // Selector options — all 32 states sorted alphabetically for a well-known UX.
  const options: EstadoOption[] = ESTADOS
    .map((e) => ({
      slug: slugForEstado(e),
      nombre: e.nombre,
      abrev: e.abrev,
    }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));

  return (
    <ComparaView
      options={options}
      a={{
        slug: slugForEstado(estadoA),
        estado: estadoA,
        metrics: mA,
        rank: rankA,
        series: seriesA,
      }}
      b={{
        slug: slugForEstado(estadoB),
        estado: estadoB,
        metrics: mB,
        rank: rankB,
        series: seriesB,
      }}
      ranges={ranges}
      totalEstados={metrics.length}
    />
  );
}

function rangeOf<T>(
  rows: T[],
  pick: (r: T) => number,
): { min: number; max: number } {
  if (rows.length === 0) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    const v = pick(r);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 0 };
  return { min, max };
}
