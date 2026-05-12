"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { type EstadoMetrics } from "@/lib/types";
import { qEstadoMetrics } from "@/lib/queries";
import { ESTADOS_BY_CVE, slugForEstado } from "@/lib/estados";
import { fmtDec, fmtInt, fmtCompact, fmtMxn } from "@/lib/format";
import { ult12mLabel, SESNSP_LAST_PERIOD_LABEL } from "@/lib/data-meta";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

const MexicoMap = dynamic(
  () => import("./mexico-map").then((m) => m.MexicoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[640px] w-full bg-midnight-void grid place-items-center">
        <div className="shimmer h-2 w-32 rounded-pill" />
      </div>
    ),
  },
);

type MetricKey =
  | "homicidios_100k_ult12m"
  | "riesgo"
  | "cambio_yoy"
  | "homicidios_total_ult12m"
  | "pib_per_capita"
  | "pobreza_pct"
  | "gasto_federalizado_per_capita"
  | "adjudicacion_directa_pct"
  | "benford_mad";

type MetricDef = {
  key: MetricKey;
  label: string;
  short: string;
  group: "Seguridad" | "Economía" | "Gobierno";
  format: (n: number) => string;
  legendUnit: string;
  invert?: boolean; // higher = better
};

const METRICS: MetricDef[] = [
  {
    key: "homicidios_100k_ult12m",
    label: "Homicidios dolosos · por 100k hab.",
    short: "Homicidios / 100k",
    group: "Seguridad",
    format: (n) => fmtDec(n),
    legendUnit: "/100k",
  },
  {
    key: "riesgo",
    label: "Percentil de riesgo · 0-100",
    short: "Percentil riesgo",
    group: "Seguridad",
    format: (n) => fmtDec(n),
    legendUnit: "pct",
  },
  {
    key: "cambio_yoy",
    label: "Cambio interanual · % homicidios",
    short: "Δ YoY %",
    group: "Seguridad",
    format: (n) => `${n > 0 ? "+" : ""}${fmtDec(n)}%`,
    legendUnit: "%",
  },
  {
    key: "homicidios_total_ult12m",
    label: "Homicidios dolosos · total absoluto",
    short: "Total absoluto",
    group: "Seguridad",
    format: (n) => fmtInt(n),
    legendUnit: "casos",
  },
  {
    key: "pib_per_capita",
    label: "PIB per cápita · INEGI 2024 (precios 2018)",
    short: "PIB / cápita",
    group: "Economía",
    format: (n) => fmtMxn(n),
    legendUnit: "MXN",
    invert: true, // higher = better
  },
  {
    key: "pobreza_pct",
    label: "Población en pobreza · CONEVAL 2022 (%)",
    short: "Pobreza %",
    group: "Economía",
    format: (n) => `${fmtDec(n)}%`,
    legendUnit: "%",
  },
  {
    key: "gasto_federalizado_per_capita",
    label: "Gasto federalizado per cápita · SHCP 2025 (MXN)",
    short: "Gasto fed. / cápita",
    group: "Gobierno",
    format: (n) => fmtMxn(n),
    legendUnit: "MXN",
    invert: true, // más recurso transferido = oscuro→claro
  },
  {
    key: "adjudicacion_directa_pct",
    label: "Adjudicación directa · % de contratos estatales (ComprasMX)",
    short: "Adj. directa %",
    group: "Gobierno",
    format: (n) => `${fmtDec(n)}%`,
    legendUnit: "%",
    // más AD = peor (menos competencia) → escala estándar oscuro→rojo
  },
  {
    key: "benford_mad",
    label: "Benford MAD · contratos estatales (mayor = más desviación)",
    short: "Benford MAD estatal",
    group: "Gobierno",
    format: (n) => n.toFixed(4),
    legendUnit: "MAD",
    // más MAD = más desviación de la curva esperada
  },
];

// V5 metrics — pendientes de fuente integrable (ver /transparencia)
const ROADMAP_METRICS = [
  { label: "Transparencia %", group: "Gobierno", v: "V5" },
] as const;

export function MapaExplorer() {
  const metrics = React.useMemo(() => qEstadoMetrics(), []);
  const [metricKey, setMetricKey] = React.useState<MetricKey>(
    "homicidios_100k_ult12m",
  );
  const [selected, setSelected] = React.useState<string | null>(null);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [showAll, setShowAll] = React.useState(false);

  const def = METRICS.find((m) => m.key === metricKey)!;

  const values = React.useMemo(
    () =>
      metrics.map((m) => ({
        cve_ent: m.cve_ent,
        value: Number(m[metricKey]),
      })),
    [metrics, metricKey],
  );

  // Editorial single-hue ramp (estilo Economist/FT/NYT mapas de criminalidad).
  // Negro casi puro → rojo profundo saturado. Comunica gravedad sin gritar.
  // Para métricas "más es peor" (homicidios, pobreza): oscuro→rojo intenso.
  // Para métricas "más es mejor" (PIB): la rampa se invierte — bajo es rojo.
  const stops = React.useMemo<Array<[number, string]>>(() => {
    const palette: Array<[number, string]> = [
      [0, "#1a1a1a"],   // ceniza casi negra
      [20, "#3a1a1a"],  // marrón quemado
      [40, "#5e1f1f"],  // borgoña
      [60, "#8a2828"],  // sangre
      [80, "#b4332f"],  // rojo cálido
      [100, "#d8443a"], // rojo terracota saturado
    ];
    if (!def.invert) return palette;
    // Invertir: stop 0 obtiene el color de stop 100, etc.
    return palette.map(([p], i) => [
      p,
      palette[palette.length - 1 - i][1],
    ]) as Array<[number, string]>;
  }, [def.invert]);

  const ranking = React.useMemo(() => {
    const sorted = [...metrics].sort((a, b) => {
      const va = Number(a[metricKey]);
      const vb = Number(b[metricKey]);
      return def.invert ? va - vb : vb - va;
    });
    return sorted;
  }, [metrics, metricKey, def.invert]);

  const focused = selected ?? hovered;
  const focusedMetric = focused
    ? metrics.find((m) => m.cve_ent === focused)
    : null;

  // Coverage label depends on the active metric: "ult12m" metrics use the
  // rolling 12-month window; YoY uses the same window vs the previous period;
  // total uses the most recent reported month.
  const coverageLabel = React.useMemo(() => {
    if (metricKey === "homicidios_100k_ult12m" || metricKey === "homicidios_total_ult12m") {
      return `Ventana: ${ult12mLabel()}`;
    }
    if (metricKey === "cambio_yoy") {
      return `Comparativa anual · cierre ${SESNSP_LAST_PERIOD_LABEL}`;
    }
    if (
      metricKey === "adjudicacion_directa_pct" ||
      metricKey === "benford_mad"
    ) {
      return "ComprasMX · contratos estatales 2024-2025";
    }
    return `Cierre: ${SESNSP_LAST_PERIOD_LABEL}`;
  }, [metricKey]);

  return (
    <section className="py-8">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Metric pills */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <div className="eyebrow">Métrica</div>
            <div className="text-[11px] text-ash-accent tabular">
              {coverageLabel}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetricKey(m.key)}
                aria-pressed={m.key === metricKey}
                className={`rounded-pill px-4 py-1.5 text-[12px] transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void ${
                  m.key === metricKey
                    ? "bg-slate-dust text-midnight-void border-slate-dust"
                    : "bg-transparent text-light-ash border-cloud-whisper/15 hover:border-cloud-whisper/40 hover:text-cloud-whisper"
                }`}
              >
                <span
                  className={`mr-2 uppercase tracking-wider text-[9px] ${
                    m.key === metricKey
                      ? "text-midnight-void/55"
                      : "text-ash-accent"
                  }`}
                >
                  {m.group}
                </span>
                {m.short}
              </button>
            ))}
            {ROADMAP_METRICS.map((r) => (
              <a
                key={r.label}
                href="/transparencia"
                title={`Disponible en ${r.v} — ver por qué`}
                className="rounded-pill px-4 py-1.5 text-[12px] border border-dashed border-cloud-whisper/15 text-ash-accent/60 hover:text-cloud-whisper hover:border-cloud-whisper/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void"
              >
                <span className="mr-2 uppercase tracking-wider text-[9px]">
                  {r.group}
                </span>
                {r.label}
                <span className="ml-2 text-[9px] tracking-wider">{r.v}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Map */}
          <div className="lg:col-span-8 rounded-card overflow-hidden border border-cloud-whisper/10 bg-steel-gray relative">
            <MexicoMap
              values={values}
              metricLabel={def.label}
              formatValue={def.format}
              colorStops={stops}
              className="h-[420px] sm:h-[520px] lg:h-[640px]"
              selectedCve={selected}
              onSelect={(cve) =>
                setSelected((prev) => (prev === cve ? null : cve))
              }
              onHover={setHovered}
            />
          </div>
          <p
            id="mapa-help-text"
            className="lg:hidden text-[11px] text-ash-accent text-center -mt-3"
          >
            Tocá un estado para ver su detalle abajo.
          </p>

          {/* Sidebar — focused estado dossier */}
          <aside className="lg:col-span-4 flex flex-col gap-5">
            {focused && focusedMetric ? (
              <FocusedDossier metric={focusedMetric} highlightKey={metricKey} />
            ) : (
              <EmptyDossier />
            )}

            <div>
              <div className="eyebrow mb-3">
                Ranking · {def.short} {def.invert ? "(menor primero)" : "(mayor primero)"}
              </div>
              <div className="border-t border-cloud-whisper/10">
                {ranking.slice(0, showAll ? ranking.length : 10).map((row, idx) => {
                  const isFocused = focused === row.cve_ent;
                  return (
                    <button
                      key={row.cve_ent}
                      onClick={() =>
                        setSelected((prev) =>
                          prev === row.cve_ent ? null : row.cve_ent,
                        )
                      }
                      onMouseEnter={() => setHovered(row.cve_ent)}
                      onMouseLeave={() => setHovered(null)}
                      className={`w-full flex items-center justify-between border-b border-cloud-whisper/8 py-2.5 px-1 text-[13px] transition-colors ${
                        isFocused
                          ? "bg-cloud-whisper/8 text-cloud-whisper"
                          : "text-light-ash hover:bg-cloud-whisper/4 hover:text-cloud-whisper"
                      }`}
                    >
                      <span className="flex items-center gap-3 truncate">
                        <span className="tabular text-[11px] text-ash-accent w-5 text-right">
                          {idx + 1}
                        </span>
                        <span className="truncate">{row.estado.nombre}</span>
                      </span>
                      <span className="tabular text-[12px]">
                        {def.format(Number(row[metricKey]))}
                      </span>
                    </button>
                  );
                })}
              </div>
              {ranking.length > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-3 text-[11px] text-ash-accent hover:text-cloud-whisper underline decoration-1 underline-offset-4"
                >
                  {showAll
                    ? "Mostrar solo top 10 ↑"
                    : `Mostrar los ${ranking.length} estados ↓`}
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function EmptyDossier() {
  return (
    <div className="rounded-card border border-cloud-whisper/10 p-6 bg-cloud-whisper/2">
      <div className="eyebrow mb-3">Dossier</div>
      <div className="display text-[24px] mb-2">Selecciona un estado</div>
      <p className="text-[12px] text-ash-accent leading-relaxed">
        Pasa el cursor sobre el mapa o el ranking para vista rápida. Da click
        para fijar y abrir el dossier completo de la entidad.
      </p>
    </div>
  );
}

function FocusedDossier({
  metric,
  highlightKey,
}: {
  metric: EstadoMetrics;
  highlightKey: MetricKey;
}) {
  const e = ESTADOS_BY_CVE[metric.cve_ent];
  return (
    <div className="rounded-card border border-cloud-whisper/10 p-6 bg-cloud-whisper/2 fade-in">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="lozenge">{e.abrev}</Badge>
        <span className="text-[10px] text-ash-accent tabular">
          CVE_ENT · {metric.cve_ent}
        </span>
      </div>
      <div className="display text-[28px] leading-tight mb-1">{e.nombre}</div>
      <div className="text-[12px] text-ash-accent mb-5">
        {fmtCompact(e.poblacion2020)} habitantes · censo INEGI 2020 ·
        normalización con CONAPO {metric.ano_pib ?? 2025}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-[12px]">
        <DossierStat
          label="Hom. / 100k"
          value={fmtDec(metric.homicidios_100k_ult12m)}
          highlighted={highlightKey === "homicidios_100k_ult12m"}
        />
        <DossierStat
          label="Total ult. 12m"
          value={fmtInt(metric.homicidios_total_ult12m)}
          highlighted={highlightKey === "homicidios_total_ult12m"}
        />
        <DossierStat
          label="Δ YoY"
          value={`${metric.cambio_yoy > 0 ? "+" : ""}${fmtDec(
            metric.cambio_yoy,
          )}%`}
          highlighted={highlightKey === "cambio_yoy"}
          tone={
            metric.cambio_yoy > 5
              ? "alert"
              : metric.cambio_yoy < -5
                ? "good"
                : undefined
          }
        />
        <DossierStat
          label="Percentil riesgo"
          value={fmtDec(metric.riesgo)}
          highlighted={highlightKey === "riesgo"}
        />
        <DossierStat
          label="PIB / cápita"
          value={
            metric.pib_per_capita > 0 ? fmtMxn(metric.pib_per_capita) : "—"
          }
          highlighted={highlightKey === "pib_per_capita"}
        />
        <DossierStat
          label="Pobreza"
          value={metric.pobreza_pct > 0 ? `${fmtDec(metric.pobreza_pct)}%` : "—"}
          highlighted={highlightKey === "pobreza_pct"}
          tone={metric.pobreza_pct >= 50 ? "alert" : undefined}
        />
        <DossierStat
          label="Gasto fed. / cápita"
          value={
            metric.gasto_federalizado_per_capita &&
            metric.gasto_federalizado_per_capita > 0
              ? fmtMxn(metric.gasto_federalizado_per_capita)
              : "—"
          }
          highlighted={highlightKey === "gasto_federalizado_per_capita"}
        />
        <DossierStat
          label="Adj. directa estatal"
          value={
            (metric.contratos_estatales ?? 0) >= 30 &&
            metric.adjudicacion_directa_pct > 0
              ? `${fmtDec(metric.adjudicacion_directa_pct)}%`
              : "—"
          }
          highlighted={highlightKey === "adjudicacion_directa_pct"}
          tone={metric.adjudicacion_directa_pct >= 60 ? "alert" : undefined}
        />
        <DossierStat
          label="Benford MAD estatal"
          value={
            (metric.contratos_estatales ?? 0) >= 30 && metric.benford_mad > 0
              ? metric.benford_mad.toFixed(4)
              : "—"
          }
          highlighted={highlightKey === "benford_mad"}
          tone={metric.benford_mad >= 0.025 ? "alert" : undefined}
        />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <ButtonLink
          href={`/estado/${slugForEstado(e)}`}
          variant="primary"
          size="sm"
        >
          Ver dossier completo →
        </ButtonLink>
      </div>
    </div>
  );
}

function DossierStat({
  label,
  value,
  highlighted,
  tone,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
  tone?: "alert" | "warn" | "good";
}) {
  const toneColor =
    tone === "alert"
      ? "text-signal-alert"
      : tone === "warn"
        ? "text-signal-warn"
        : tone === "good"
          ? "text-signal-good"
          : "text-cloud-whisper";
  return (
    <div
      className={`flex flex-col gap-0.5 border-l-2 pl-3 ${
        highlighted ? "border-cloud-whisper" : "border-cloud-whisper/10"
      }`}
    >
      <span className="text-[10px] uppercase tracking-wider text-ash-accent">
        {label}
      </span>
      <span className={`tabular text-[15px] ${toneColor}`}>{value}</span>
    </div>
  );
}
