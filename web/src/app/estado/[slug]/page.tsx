import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ESTADOS_BY_SLUG } from "@/lib/estados";
import { qEstadoMetrics, qIncidenciaSerieMensual } from "@/lib/queries";
import type { DelitoCategoria } from "@/lib/types";
import { DELITOS } from "@/lib/types";
import type { SerieRow } from "@/components/estado-serie-chart";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { fmtDec, fmtInt, fmtCompact, fmtMxn } from "@/lib/format";
import { EstadoSerieChart } from "@/components/estado-serie-chart";
import { EstadoBenfordChart } from "@/components/estado-benford-chart";
import {
  SESNSP_FIRST_YEAR,
  SESNSP_LAST_PERIOD_LABEL,
} from "@/lib/data-meta";

export function generateStaticParams() {
  return Object.keys(ESTADOS_BY_SLUG).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = ESTADOS_BY_SLUG[slug];
  if (!e) return { title: "Estado no encontrado" };
  const description = `Dossier completo de ${e.nombre}: serie mensual de homicidios y otros delitos, PIB per cápita, pobreza multidimensional, gasto federalizado y posición en el ranking nacional sobre datos oficiales.`;
  return {
    title: `${e.nombre} · Dossier`,
    description,
    openGraph: {
      title: `${e.nombre} bajo lupa`,
      description,
    },
  };
}

export default async function EstadoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const estado = ESTADOS_BY_SLUG[slug];
  if (!estado) return notFound();

  const metrics = qEstadoMetrics();
  const m = metrics.find((x) => x.cve_ent === estado.cve);
  if (!m) return notFound();

  // Media nacional PIB per cápita — solo entidades con dato (>0).
  const pibValues = metrics
    .map((x) => x.pib_per_capita)
    .filter((v): v is number => v > 0);
  const mediaPibNacional =
    pibValues.length > 0
      ? pibValues.reduce((a, b) => a + b, 0) / pibValues.length
      : 0;

  const ranked = [...metrics].sort(
    (a, b) => b.homicidios_100k_ult12m - a.homicidios_100k_ult12m,
  );
  const rank =
    ranked.findIndex((x) => x.cve_ent === estado.cve) + 1;

  // Pre-filter the monthly series for this state at request time so the
  // 2.2MB JSON never reaches the client bundle. The chart receives only
  // the rows for this slug.
  const series: SerieRow[] = [];
  for (const d of DELITOS) {
    const rows = qIncidenciaSerieMensual({
      cve_ent: estado.cve,
      delito: d as string,
    });
    for (const r of rows) {
      series.push({
        ano: r.ano,
        mes: r.mes,
        delito: r.delito as DelitoCategoria,
        total: r.total,
        por_100k: r.por_100k,
      });
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-center gap-3 text-[12px] text-ash-accent mb-6">
            <Link href="/mapa" className="hover:text-cloud-whisper">
              ← Mapa
            </Link>
            <span>·</span>
            <span>Dossier estatal</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <Badge variant="lozenge" className="mb-5">
                {estado.abrev} · CVE_ENT {estado.cve}
              </Badge>
              <h1
                className="display-xl leading-[0.95] tracking-tight text-balance break-words [overflow-wrap:anywhere] hyphens-auto"
                style={{
                  fontSize: "clamp(2rem, 7.5vw, 6rem)",
                }}
                lang="es-MX"
              >
                {estado.nombre}
              </h1>
              <div className="text-light-ash text-[15px] mt-4">
                {fmtCompact(estado.poblacion2020)} habitantes · censo INEGI 2020
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href={`/compara?a=${slug}`}
                variant="ghost"
                size="md"
              >
                Comparar con otro estado
              </ButtonLink>
              <ButtonLink href="/anomalias" variant="primary" size="md">
                Ver anomalías nacionales
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Headline KPIs */}
      <section className="border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-cloud-whisper/8">
          <KPI
            label="Homicidios / 100k"
            value={fmtDec(m.homicidios_100k_ult12m)}
            hint={`#${rank}/32 nacional · violencia`}
          />
          <KPI
            label="Cambio interanual"
            value={`${m.cambio_yoy > 0 ? "+" : ""}${fmtDec(m.cambio_yoy)}%`}
            tone={
              m.cambio_yoy > 5 ? "alert" : m.cambio_yoy < -5 ? "good" : "neutral"
            }
          />
          <KPI
            label="Riesgo compuesto"
            value={fmtDec(m.riesgo)}
            hint="Score 0-100"
          />
          <KPI
            label="Total ult. 12m"
            value={fmtInt(m.homicidios_total_ult12m)}
            hint="Homicidios dolosos"
          />
        </div>
      </section>

      {/* Serie temporal */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-3">
                Serie mensual · {SESNSP_FIRST_YEAR} → {SESNSP_LAST_PERIOD_LABEL}
              </div>
              <h2 className="display text-[36px] md:text-[48px] tracking-tight">
                Cómo evolucionó la incidencia
              </h2>
            </div>
          </div>
          <div className="rounded-card border border-cloud-whisper/10 p-6 bg-cloud-whisper/2">
            <EstadoSerieChart series={series} />
          </div>
        </div>
      </section>

      {/* Cruces socioeconómicos: PIB + Pobreza reales */}
      <section className="border-t border-cloud-whisper/8 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">Cruces socioeconómicos</div>
          <h2
            className="display tracking-tight mb-3 max-w-3xl"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
          >
            Lo que el mapa no dice por sí solo
          </h2>
          <p className="text-[14px] text-light-ash leading-relaxed mb-10 max-w-3xl">
            El número de homicidios por sí solo no explica nada. Cruzado con
            economía y pobreza, la lectura cambia.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-cloud-whisper/8 mb-12">
            <CrossStat
              label="PIB per cápita"
              source={`INEGI · ${m.ano_pib ?? 2024}`}
              value={
                m.pib_per_capita > 0
                  ? fmtMxn(m.pib_per_capita)
                  : "—"
              }
              comment={`Pesos a precios constantes 2018. La media nacional ronda los ${fmtCompact(mediaPibNacional)} MXN.`}
            />
            <CrossStat
              label="Pobreza"
              source={`CONEVAL · ${m.ano_pobreza ?? 2022}`}
              value={
                m.pobreza_pct > 0 ? `${fmtDec(m.pobreza_pct)}%` : "—"
              }
              comment={
                m.pobreza_extrema_pct && m.pobreza_extrema_pct > 0
                  ? `Pobreza extrema: ${fmtDec(m.pobreza_extrema_pct)}%. Medición multidimensional.`
                  : "Medición multidimensional de pobreza."
              }
              alert={m.pobreza_pct >= 50}
            />
            <CrossStat
              label="Gasto federalizado / cápita"
              source={`SHCP · ${m.ano_gasto ?? 2025}`}
              value={
                m.gasto_federalizado_per_capita > 0
                  ? fmtMxn(m.gasto_federalizado_per_capita)
                  : "—"
              }
              comment={
                m.gasto_federalizado_total > 0
                  ? `Total ${fmtMxn(m.gasto_federalizado_total / 1e9)} mil mdp transferidos: Ramo 28 + Ramo 33 + convenios + subsidios.`
                  : "Transferencias federales: Participaciones, Aportaciones, Convenios y Subsidios."
              }
            />
            <CrossStat
              label="Adj. directa · estatal"
              source={`ComprasMX · ${m.ano_compras_estatal ?? 2025}`}
              value={
                (m.contratos_estatales ?? 0) >= 30 &&
                m.adjudicacion_directa_pct > 0
                  ? `${fmtDec(m.adjudicacion_directa_pct)}%`
                  : "—"
              }
              comment={
                (m.contratos_estatales ?? 0) >= 30
                  ? `Sobre ${fmtInt(m.contratos_estatales ?? 0)} contratos estatales. AD = sin licitación pública.`
                  : `Muestra insuficiente (${fmtInt(m.contratos_estatales ?? 0)} contratos · umbral editorial ≥30).`
              }
              alert={
                (m.contratos_estatales ?? 0) >= 30 &&
                m.adjudicacion_directa_pct >= 60
              }
            />
            <CrossStat
              label="Benford MAD · estatal"
              source={`ComprasMX · ${m.ano_compras_estatal ?? 2025}`}
              value={
                (m.contratos_estatales ?? 0) >= 30 && m.benford_mad > 0
                  ? m.benford_mad.toFixed(4)
                  : "—"
              }
              comment={
                (m.contratos_estatales ?? 0) >= 30
                  ? "MAD del primer dígito vs Benford. Mayor = más desviación. Bandera para auditar, no veredicto."
                  : `Muestra insuficiente (${fmtInt(m.contratos_estatales ?? 0)} contratos · umbral editorial ≥30).`
              }
              alert={
                (m.contratos_estatales ?? 0) >= 30 && m.benford_mad >= 0.025
              }
            />
          </div>

          <div className="eyebrow mb-3">Próximamente</div>
          <p className="text-[13px] text-light-ash leading-relaxed mb-6 max-w-3xl">
            La siguiente capa — transparencia estatal — entra en V5. Pendiente
            de fuente integrable;{" "}
            <Link
              href="/transparencia"
              className="text-cloud-whisper underline decoration-1 underline-offset-4 hover:text-ash-accent"
            >
              ver detalle
            </Link>
            .
          </p>
          <div className="grid sm:grid-cols-2 gap-px bg-cloud-whisper/8">
            <RoadmapCard
              tag="V5"
              label="Transparencia"
              source="IMCO BIPE · sucesor INAI"
              comment="Cumplimiento de obligaciones por sujeto obligado y calidad de información presupuestal."
            />
          </div>
        </div>
      </section>

      {/* Benford nacional (no estatal — ComprasMX federal no desagrega) */}
      <section className="border-t border-cloud-whisper/8 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="eyebrow mb-3">Análisis forense · contexto</div>
            <h3 className="display text-[28px] md:text-[36px] tracking-tight mb-3">
              Benford a nivel nacional
            </h3>
            <p className="text-[13px] text-light-ash leading-relaxed mb-6 max-w-md">
              Los datos de ComprasMX federal no desagregan por entidad
              federativa, así que el análisis Benford aplica a la totalidad
              del gasto APF. La página{" "}
              <a
                href="/anomalias"
                className="text-cloud-whisper underline decoration-1 underline-offset-4"
              >
                /anomalias
              </a>{" "}
              muestra la distribución completa y el ranking de dependencias
              federales bajo lupa.
            </p>
          </div>
          <div className="lg:col-span-7">
            <EstadoBenfordChart />
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-cloud-whisper/8 py-12">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <p className="text-[12px] text-ash-accent max-w-3xl leading-relaxed">
            <strong className="text-cloud-whisper">
              Datos oficiales · MVP V1.
            </strong>{" "}
            Incidencia delictiva: SESNSP (mirror lapanquecita/incidencia-delictiva,
            sincronizado con la fuente oficial). Población: CONAPO,
            proyección 2020-2070. Cifras cubren {SESNSP_FIRST_YEAR} al último
            mes publicado por SESNSP ({SESNSP_LAST_PERIOD_LABEL}).
            Las observaciones estadísticas son banderas para
            investigar, no veredictos.
          </p>
        </div>
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "alert" | "good" | "warn";
}) {
  const toneCls =
    tone === "alert"
      ? "text-signal-alert"
      : tone === "good"
        ? "text-signal-good"
        : tone === "warn"
          ? "text-signal-warn"
          : "text-cloud-whisper";
  return (
    <div className="bg-midnight-void px-6 py-7 flex flex-col gap-3">
      <div className="eyebrow">{label}</div>
      <div className={`display text-[42px] tabular leading-none ${toneCls}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-ash-accent">{hint}</div>}
    </div>
  );
}

function CrossStat({
  label,
  source,
  value,
  comment,
  alert,
}: {
  label: string;
  source: string;
  value: string;
  comment: string;
  alert?: boolean;
}) {
  return (
    <div className="bg-midnight-void p-7 flex flex-col gap-3 min-h-[200px]">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        <span className="text-[10px] text-ash-accent uppercase tracking-wider">
          {source}
        </span>
      </div>
      <div
        className={`display tabular leading-none mt-auto ${
          alert ? "text-signal-alert" : "text-cloud-whisper"
        }`}
        style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)" }}
      >
        {value}
      </div>
      <p className="text-[12px] text-light-ash leading-relaxed">{comment}</p>
    </div>
  );
}

function RoadmapCard({
  tag,
  label,
  source,
  comment,
}: {
  tag: string;
  label: string;
  source: string;
  comment: string;
}) {
  return (
    <div className="bg-midnight-void p-7 flex flex-col gap-3 min-h-[180px]">
      <div className="flex items-center justify-between">
        <span className="display text-[28px]">{tag}</span>
        <span className="text-[10px] text-ash-accent uppercase tracking-wider">
          {source}
        </span>
      </div>
      <div className="text-[16px] font-medium text-cloud-whisper mt-auto">
        {label}
      </div>
      <p className="text-[12px] text-light-ash leading-relaxed">{comment}</p>
    </div>
  );
}

