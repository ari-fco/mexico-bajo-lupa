"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { fmtDec, fmtInt, fmtMxn, fmtCompact } from "@/lib/format";
import { ult12mLabel } from "@/lib/data-meta";
import type { Estado } from "@/lib/estados";
import type { EstadoMetrics } from "@/lib/types";

export type EstadoOption = {
  slug: string;
  nombre: string;
  abrev: string;
};

export type CompPoint = {
  ano: number;
  mes: number;
  total: number;
};

type SideData = {
  slug: string;
  estado: Estado;
  metrics: EstadoMetrics;
  rank: number;
  series: CompPoint[];
};

type Range = { min: number; max: number };

type Props = {
  options: EstadoOption[];
  a: SideData;
  b: SideData;
  ranges: Record<string, Range>;
  totalEstados: number;
};

const MES_ABBR = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function ComparaView({ options, a, b, ranges, totalEstados }: Props) {
  const router = useRouter();

  const onChangeA = React.useCallback(
    (slug: string) => {
      if (slug === b.slug) return; // can't compare a state with itself
      router.replace(`/compara?a=${slug}&b=${b.slug}`);
    },
    [router, b.slug],
  );
  const onChangeB = React.useCallback(
    (slug: string) => {
      if (slug === a.slug) return;
      router.replace(`/compara?a=${a.slug}&b=${slug}`);
    },
    [router, a.slug],
  );

  // Combined chart series: one row per month with two values.
  const chartData = React.useMemo(() => {
    const len = Math.min(a.series.length, b.series.length);
    const out: Array<{
      label: string;
      [k: string]: string | number;
    }> = [];
    for (let i = 0; i < len; i++) {
      const p = a.series[i];
      const label = `${MES_ABBR[p.mes - 1]} ${String(p.ano).slice(2)}`;
      out.push({
        label,
        [a.estado.abrev]: a.series[i].total,
        [b.estado.abrev]: b.series[i].total,
      });
    }
    return out;
  }, [a.series, b.series, a.estado.abrev, b.estado.abrev]);

  const sumA = a.series.reduce((acc, r) => acc + r.total, 0);
  const sumB = b.series.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="border-b border-cloud-whisper/8 py-10 md:py-14">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Badge variant="lozenge" className="mb-5">
            Comparador estatal
          </Badge>
          <h1
            className="display-xl leading-[0.95] tracking-tight text-balance"
            style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}
          >
            Dos estados, lado a lado.
          </h1>
          <p className="text-light-ash text-[15px] mt-5 max-w-3xl leading-relaxed">
            Cifras comparables de seguridad, economía y transparencia. Cada
            métrica trae su contexto nacional: la barra muestra dónde cae cada
            estado entre el mínimo y el máximo del país.
          </p>
        </div>
      </section>

      {/* Selectors */}
      <section className="border-b border-cloud-whisper/8 py-8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <SelectorBlock
            label="Estado A"
            value={a.slug}
            options={options}
            disabled={b.slug}
            onChange={onChangeA}
          />
          <SelectorBlock
            label="Estado B"
            value={b.slug}
            options={options}
            disabled={a.slug}
            onChange={onChangeB}
          />
        </div>
      </section>

      {/* Hero columns */}
      <section className="border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] grid grid-cols-1 md:grid-cols-2 gap-px bg-cloud-whisper/8">
          <HeroSide side={a} totalEstados={totalEstados} />
          <HeroSide side={b} totalEstados={totalEstados} />
        </div>
      </section>

      {/* Comparative metrics */}
      <section className="py-12 md:py-16 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-3">Métricas comparadas</div>
              <h2
                className="display tracking-tight"
                style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
              >
                Lo concreto: cifras lado a lado
              </h2>
            </div>
            <p className="text-[12px] text-ash-accent max-w-md">
              La barra horizontal posiciona cada estado entre el mínimo y el
              máximo nacional. Mismo extremo no significa mismo valor.
            </p>
          </div>

          <div className="flex flex-col gap-px bg-cloud-whisper/8">
            <MetricRow
              label="Homicidios / 100k habitantes"
              source={ult12mLabel()}
              valueA={a.metrics.homicidios_100k_ult12m}
              valueB={b.metrics.homicidios_100k_ult12m}
              fmt={(v) => fmtDec(v)}
              range={ranges.homicidios_100k}
              higherIsWorse
              deltaText={ratioDelta(
                a.metrics.homicidios_100k_ult12m,
                b.metrics.homicidios_100k_ult12m,
                a.estado.abrev,
                b.estado.abrev,
              )}
            />
            <MetricRow
              label="PIB per cápita"
              source={`INEGI · ${a.metrics.ano_pib ?? b.metrics.ano_pib ?? 2024}`}
              valueA={a.metrics.pib_per_capita}
              valueB={b.metrics.pib_per_capita}
              fmt={(v) => (v > 0 ? fmtMxn(v) : "—")}
              range={ranges.pib_per_capita}
              higherIsWorse={false}
              deltaText={absDelta(
                a.metrics.pib_per_capita,
                b.metrics.pib_per_capita,
                a.estado.abrev,
                b.estado.abrev,
                (v) => fmtMxn(Math.abs(v)),
              )}
            />
            <MetricRow
              label="Pobreza"
              source={`CONEVAL · ${a.metrics.ano_pobreza ?? b.metrics.ano_pobreza ?? 2022}`}
              valueA={a.metrics.pobreza_pct}
              valueB={b.metrics.pobreza_pct}
              fmt={(v) => (v > 0 ? `${fmtDec(v)}%` : "—")}
              range={ranges.pobreza_pct}
              higherIsWorse
              deltaText={ptsDelta(
                a.metrics.pobreza_pct,
                b.metrics.pobreza_pct,
                a.estado.abrev,
                b.estado.abrev,
              )}
            />
            <MetricRow
              label="Gasto federalizado / cápita"
              source={`SHCP · ${a.metrics.ano_gasto ?? b.metrics.ano_gasto ?? 2025}`}
              valueA={a.metrics.gasto_federalizado_per_capita}
              valueB={b.metrics.gasto_federalizado_per_capita}
              fmt={(v) => (v > 0 ? fmtMxn(v) : "—")}
              range={ranges.gasto_pc}
              higherIsWorse={false}
              deltaText={absDelta(
                a.metrics.gasto_federalizado_per_capita,
                b.metrics.gasto_federalizado_per_capita,
                a.estado.abrev,
                b.estado.abrev,
                (v) => fmtMxn(Math.abs(v)),
              )}
            />
            <MetricRow
              label="Cambio interanual · homicidios"
              source="SESNSP"
              valueA={a.metrics.cambio_yoy}
              valueB={b.metrics.cambio_yoy}
              fmt={(v) => `${v > 0 ? "+" : ""}${fmtDec(v)}%`}
              range={ranges.cambio_yoy}
              higherIsWorse
              deltaText={ptsDelta(
                a.metrics.cambio_yoy,
                b.metrics.cambio_yoy,
                a.estado.abrev,
                b.estado.abrev,
                "pts",
              )}
            />
            <MetricRow
              label="Adjudicación directa · estatal"
              source="ComprasMX"
              valueA={
                hasAdjSample(a.metrics) ? a.metrics.adjudicacion_directa_pct : null
              }
              valueB={
                hasAdjSample(b.metrics) ? b.metrics.adjudicacion_directa_pct : null
              }
              fmt={(v) => `${fmtDec(v)}%`}
              range={ranges.adj_directa}
              higherIsWorse
              deltaText={
                hasAdjSample(a.metrics) && hasAdjSample(b.metrics)
                  ? ptsDelta(
                      a.metrics.adjudicacion_directa_pct,
                      b.metrics.adjudicacion_directa_pct,
                      a.estado.abrev,
                      b.estado.abrev,
                      "pts",
                    )
                  : "Muestra insuficiente en al menos un estado."
              }
            />
          </div>
        </div>
      </section>

      {/* Time series */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-3">Serie comparativa · homicidios</div>
              <h2
                className="display tracking-tight"
                style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)" }}
              >
                {a.estado.nombre} vs {b.estado.nombre}, últimos 12 meses
              </h2>
              <p className="text-[13px] text-light-ash mt-3 max-w-2xl">
                Total acumulado · {a.estado.abrev}: {fmtInt(sumA)} · {b.estado.abrev}: {fmtInt(sumB)}.
              </p>
            </div>
          </div>
          <div className="rounded-card border border-cloud-whisper/10 p-6 bg-cloud-whisper/2">
            <div className="h-[360px]">
              <ClientOnly
                fallback={<div className="h-full w-full shimmer rounded-card" />}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: "#999", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: "#999", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      width={50}
                      tickFormatter={(v: number) => fmtInt(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 10,
                        fontSize: 12,
                        padding: "10px 12px",
                      }}
                      labelStyle={{ color: "#cccccc", marginBottom: 4 }}
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value, name) => [
                        fmtInt(Number(value)),
                        String(name),
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 8 }}
                      iconType="plainline"
                      formatter={(value) => (
                        <span style={{ color: "#cccccc", fontSize: 12 }}>
                          {value}
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey={a.estado.abrev}
                      stroke="#ffffff"
                      strokeWidth={1.6}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey={b.estado.abrev}
                      stroke="#e8a8a8"
                      strokeWidth={1.6}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-cloud-whisper/8 py-12">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <p className="text-[12px] text-ash-accent max-w-3xl leading-relaxed">
            <strong className="text-cloud-whisper">Lectura comparativa.</strong>{" "}
            Las diferencias entre estados deben leerse a la luz del contexto
            socioeconómico. Mayor PIB per cápita o menor pobreza no implican
            menor violencia mecánicamente — son señales para investigar.
          </p>
        </div>
      </section>
    </div>
  );
}

// ---- subcomponents ----------------------------------------------------------

function SelectorBlock({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: EstadoOption[];
  disabled: string;
  onChange: (slug: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-steel-gray text-cloud-whisper border border-cloud-whisper/15 rounded-pill px-5 h-11 text-[14px] tracking-tight focus:outline-none focus:border-cloud-whisper/50 hover:border-cloud-whisper/30 transition-colors appearance-none cursor-pointer"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23cccccc' stroke-width='1.5'><path d='M2.5 4.5L6 8l3.5-3.5'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 18px center",
          backgroundSize: "12px",
          paddingRight: "44px",
        }}
      >
        {options.map((o) => (
          <option
            key={o.slug}
            value={o.slug}
            disabled={o.slug === disabled}
            className="bg-steel-gray text-cloud-whisper"
          >
            {o.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

function HeroSide({
  side,
  totalEstados,
}: {
  side: SideData;
  totalEstados: number;
}) {
  return (
    <div className="bg-midnight-void p-6 md:p-10 flex flex-col gap-4">
      <Badge variant="lozenge" className="self-start">
        {side.estado.abrev} · CVE_ENT {side.estado.cve}
      </Badge>
      <h2
        className="display leading-[0.95] tracking-tight text-balance break-words"
        style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}
        lang="es-MX"
      >
        {side.estado.nombre}
      </h2>
      <div className="text-[13px] text-light-ash">
        {fmtCompact(side.estado.poblacion2020)} habitantes · INEGI 2020
      </div>
      <div className="text-[12px] text-ash-accent">
        Posición nacional violencia: #{side.rank}/{totalEstados}
      </div>
      <a
        href={`/estado/${side.slug}`}
        className="self-start text-[12px] text-cloud-whisper hover:text-ash-accent underline decoration-1 underline-offset-4 mt-2"
      >
        Ver dossier completo →
      </a>
    </div>
  );
}

function MetricRow({
  label,
  source,
  valueA,
  valueB,
  fmt,
  range,
  higherIsWorse,
  deltaText,
}: {
  label: string;
  source: string;
  valueA: number | null;
  valueB: number | null;
  fmt: (v: number) => string;
  range: Range;
  higherIsWorse: boolean;
  deltaText: string;
}) {
  return (
    <div className="bg-midnight-void p-6 md:p-7 grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-start">
      <div className="md:col-span-3">
        <div className="eyebrow">{label}</div>
        <div className="text-[10px] text-ash-accent uppercase tracking-wider mt-2">
          {source}
        </div>
      </div>
      <SideValue
        valueA={valueA}
        valueB={valueB}
        fmt={fmt}
        range={range}
        higherIsWorse={higherIsWorse}
      />
      <div className="md:col-span-3 text-[12px] text-light-ash leading-relaxed self-center">
        {deltaText}
      </div>
    </div>
  );
}

function SideValue({
  valueA,
  valueB,
  fmt,
  range,
  higherIsWorse,
}: {
  valueA: number | null;
  valueB: number | null;
  fmt: (v: number) => string;
  range: Range;
  higherIsWorse: boolean;
}) {
  const better =
    valueA == null || valueB == null
      ? null
      : higherIsWorse
        ? valueA < valueB
          ? "A"
          : valueA > valueB
            ? "B"
            : null
        : valueA > valueB
          ? "A"
          : valueA < valueB
            ? "B"
            : null;

  return (
    <div className="md:col-span-6 grid grid-cols-2 gap-6">
      <ValueCell
        value={valueA}
        fmt={fmt}
        range={range}
        tone={better === "A" ? "good" : better === "B" ? "alert" : "neutral"}
      />
      <ValueCell
        value={valueB}
        fmt={fmt}
        range={range}
        tone={better === "B" ? "good" : better === "A" ? "alert" : "neutral"}
      />
    </div>
  );
}

function ValueCell({
  value,
  fmt,
  range,
  tone,
}: {
  value: number | null;
  fmt: (v: number) => string;
  range: Range;
  tone: "good" | "alert" | "neutral";
}) {
  const toneCls =
    tone === "good"
      ? "text-signal-good"
      : tone === "alert"
        ? "text-signal-alert"
        : "text-cloud-whisper";

  // Position in [0, 1] within national min..max. NaN → 0 if no range.
  let pct = 0;
  if (value != null && range.max > range.min) {
    pct = (value - range.min) / (range.max - range.min);
    pct = Math.max(0, Math.min(1, pct));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={`display tabular leading-none ${toneCls}`}
        style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
      >
        {value == null ? "—" : fmt(value)}
      </div>
      <div className="relative h-[3px] w-full bg-cloud-whisper/10 rounded-pill overflow-hidden">
        {value != null && (
          <div
            className={`absolute inset-y-0 left-0 ${
              tone === "good"
                ? "bg-signal-good"
                : tone === "alert"
                  ? "bg-signal-alert"
                  : "bg-cloud-whisper/60"
            }`}
            style={{ width: `${Math.max(2, pct * 100)}%` }}
          />
        )}
      </div>
      {value != null && range.max > range.min && (
        <div className="flex justify-between text-[10px] text-ash-accent tabular">
          <span>{fmt(range.min)}</span>
          <span>{fmt(range.max)}</span>
        </div>
      )}
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function hasAdjSample(m: EstadoMetrics): boolean {
  return (m.contratos_estatales ?? 0) >= 30 && m.adjudicacion_directa_pct > 0;
}

function ratioDelta(a: number, b: number, abrA: string, abrB: string): string {
  if (a <= 0 || b <= 0) return "Sin base para comparar.";
  if (a === b) return `${abrA} y ${abrB} están parejos.`;
  const ratio = a > b ? a / b : b / a;
  const high = a > b ? abrA : abrB;
  const low = a > b ? abrB : abrA;
  if (ratio >= 2)
    return `${high} es ${ratio.toFixed(1)}× ${low} en esta métrica.`;
  return `${high} supera a ${low} por ${((ratio - 1) * 100).toFixed(0)}%.`;
}

function absDelta(
  a: number,
  b: number,
  abrA: string,
  abrB: string,
  fmt: (v: number) => string,
): string {
  if (a <= 0 || b <= 0) return "Sin base para comparar.";
  if (a === b) return `${abrA} y ${abrB} están parejos.`;
  const diff = Math.abs(a - b);
  const high = a > b ? abrA : abrB;
  return `${high} +${fmt(diff)}.`;
}

function ptsDelta(
  a: number,
  b: number,
  abrA: string,
  abrB: string,
  unit: string = "pts",
): string {
  if (Number.isNaN(a) || Number.isNaN(b)) return "Sin base para comparar.";
  if (a === b) return `${abrA} y ${abrB} están parejos.`;
  const diff = Math.abs(a - b);
  const high = a > b ? abrA : abrB;
  return `${high} +${diff.toFixed(1)} ${unit}.`;
}
