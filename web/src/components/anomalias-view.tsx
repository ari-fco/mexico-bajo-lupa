"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import { qBenfordPorDependencia, qDependenciasRiesgo } from "@/lib/queries";
import { fmtDec, fmtCompact, fmtInt } from "@/lib/format";
import { COMPRASMX_RANGE_LABEL, COMPRASMX_N } from "@/lib/data-meta";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "./client-only";

type Filter = "all" | "alert" | "warn" | "good" | "nodata";

type Tone = "alert" | "warn" | "good" | "nodata";

/**
 * Classify a dependency by its Benford MAD and adjudicación-directa share.
 * Centralized so filter, counts, and table stay in sync — and so a missing
 * MAD (null = <300 contratos, Benford no aplica) becomes "nodata", not "good".
 */
function classifyDep(d: {
  benford_mad: number | null;
  adj_directa_pct: number | null;
}): Tone {
  const mad = d.benford_mad;
  const ad = d.adj_directa_pct ?? 0;
  if (mad === null) return "nodata";
  if (mad >= 0.015 || ad >= 70) return "alert";
  if ((mad >= 0.012 && mad < 0.015) || (ad >= 50 && ad < 70)) return "warn";
  return "good";
}

const PAGE_SIZE = 30;

export function AnomaliasView() {
  const benford = React.useMemo(() => qBenfordPorDependencia({}), []);
  const deps = React.useMemo(() => qDependenciasRiesgo(), []);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [ramo, setRamo] = React.useState<string>("Todos");
  const [query, setQuery] = React.useState<string>("");
  const [visible, setVisible] = React.useState<number>(PAGE_SIZE);
  const [lastReset, setLastReset] = React.useState<string>(
    `${filter}|${ramo}|${query}`,
  );

  // Reset pagination when any filter or query changes — adjust state during
  // render pattern instead of useEffect + setState.
  const currentKey = `${filter}|${ramo}|${query}`;
  if (currentKey !== lastReset) {
    setLastReset(currentKey);
    setVisible(PAGE_SIZE);
  }

  const allRamos = React.useMemo(() => {
    const s = new Set<string>();
    deps.forEach((d) => {
      if (d.ramo) s.add(d.ramo);
    });
    return ["Todos", ...Array.from(s).sort()];
  }, [deps]);

  const filteredDeps = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return deps
      .filter((d) => ramo === "Todos" || d.ramo === ramo)
      .filter((d) => {
        if (filter === "all") return true;
        return classifyDep(d) === filter;
      })
      .filter((d) => {
        if (q.length === 0) return true;
        return (
          d.dependencia.toLowerCase().includes(q) ||
          (d.ramo ?? "").toLowerCase().includes(q)
        );
      });
  }, [deps, filter, ramo, query]);

  // National MAD: average of |obs - exp| in pp
  const nationalMad = React.useMemo(() => {
    if (benford.length === 0) return 0;
    return (
      benford.reduce((acc, r) => acc + Math.abs(r.observado - r.esperado), 0) /
      benford.length
    );
  }, [benford]);

  // Counts by tone (always over full deps, ignoring filter so the counts are stable)
  const counts = React.useMemo(() => {
    const c = { alert: 0, warn: 0, good: 0, nodata: 0, total: deps.length };
    for (const d of deps) c[classifyDep(d)]++;
    return c;
  }, [deps]);

  return (
    <>
      {/* Headline KPIs */}
      <section className="border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-8 flex items-center gap-3 flex-wrap text-[12px] text-ash-accent">
          <span className="eyebrow">Cobertura</span>
          <span className="tabular text-light-ash">
            Contratos APF {COMPRASMX_RANGE_LABEL}
          </span>
          <span className="text-cloud-whisper/30">·</span>
          <span className="tabular">{fmtInt(COMPRASMX_N)} registros</span>
          <span className="text-cloud-whisper/30">·</span>
          <span>Fuente: ComprasMX (datos abiertos)</span>
        </div>
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-cloud-whisper/8">
          <KPI
            label="Desviación nacional"
            value={fmtDec(nationalMad)}
            unit="pp/dígito"
            tone={nationalMad > 1.5 ? "warn" : "neutral"}
            hint="Promedio absoluto observado vs Benford. Distinto del MAD por dependencia (escala 0-1)."
          />
          <KPI
            label="Dependencias en alerta"
            value={`${counts.alert}`}
            unit={`/ ${counts.total}`}
            tone="alert"
            hint="MAD ≥ 0.015 o adj. dir. ≥ 70%"
          />
          <KPI
            label="En vigilancia"
            value={`${counts.warn}`}
            unit={`/ ${counts.total}`}
            tone="warn"
            hint="Banderas moderadas"
          />
          <KPI
            label="Sin banderas"
            value={`${counts.good}`}
            unit={`/ ${counts.total}`}
            tone="good"
            hint={
              counts.nodata > 0
                ? `Conformidad aceptable · ${counts.nodata} sin datos suficientes`
                : "Conformidad estadística aceptable"
            }
          />
        </div>
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 mt-6">
          <p className="text-[11px] text-ash-accent leading-relaxed max-w-3xl">
            <strong className="text-light-ash">Nota sobre el baseline:</strong>{" "}
            la mayoría de dependencias APF mexicanas adjudican directa por
            encima del 50% (mediana ~70%), así que la categoría &ldquo;alerta&rdquo; es
            mayoritaria. El rojo aquí significa &ldquo;alto dentro del baseline
            mexicano&rdquo;, no &ldquo;extremo en términos absolutos&rdquo;. La metodología
            usa los thresholds estándar de Nigrini sin ajuste por país.
          </p>
        </div>
      </section>

      {/* Benford national chart */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <div className="eyebrow mb-3">Distribución nacional</div>
            <h2 className="display text-[36px] md:text-[48px] tracking-tight mb-2">
              Primer dígito · observado vs esperado
            </h2>
            <p className="text-[13px] text-light-ash mb-8 max-w-2xl">
              Barras: distribución observada en montos contractuales. Línea:
              curva esperada por la Ley de Benford.
            </p>
            <div className="rounded-card border border-cloud-whisper/10 p-6 bg-cloud-whisper/2 h-[420px]">
              <ClientOnly fallback={<div className="h-full w-full shimmer rounded-card" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={benford}
                    margin={{ top: 8, right: 16, bottom: 0, left: -8 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="digito"
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: "#999", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: "#999", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      tickFormatter={(v: number) => `${v}%`}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#cccccc" }}
                      formatter={(value, name) => [
                        `${Number(value).toFixed(2)}%`,
                        name === "observado" ? "Observado" : "Esperado",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: "#999", paddingTop: 8 }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="observado"
                      name="Observado"
                      radius={[3, 3, 0, 0]}
                    >
                      {benford.map((b, i) => {
                        const dev = Math.abs(b.observado - b.esperado);
                        const color =
                          dev > 2.5 ? "#e8a8a8" : dev > 1.5 ? "#e8d49e" : "#cccccc";
                        return <Cell key={i} fill={color} />;
                      })}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="esperado"
                      name="Esperado (Benford)"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: "#ffffff" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="eyebrow mb-3">Cómo se lee</div>
            <h3 className="display text-[24px] tracking-tight mb-5">
              Verde, ámbar, rojo
            </h3>
            <ul className="space-y-4 text-[13px]">
              <li className="border-l-2 border-signal-good/60 pl-4">
                <strong className="text-signal-good">Conformidad cercana</strong>
                <span className="block text-light-ash mt-1">
                  Desviación &lt; 1.5 pp por dígito. La distribución se
                  comporta como un dataset natural. No hay banderas.
                </span>
              </li>
              <li className="border-l-2 border-signal-warn/60 pl-4">
                <strong className="text-signal-warn">Vigilancia</strong>
                <span className="block text-light-ash mt-1">
                  Desviación entre 1.5 y 2.5 pp. Puede ser efecto de un cambio
                  presupuestal o un patrón sectorial. Vale la pena monitorear.
                </span>
              </li>
              <li className="border-l-2 border-signal-alert/60 pl-4">
                <strong className="text-signal-alert">Alerta</strong>
                <span className="block text-light-ash mt-1">
                  Desviación &gt; 2.5 pp en uno o más dígitos. La distribución
                  se aleja significativamente de lo esperado. Pendiente de
                  análisis forense detallado.
                </span>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* Dependencies table */}
      <section className="border-t border-cloud-whisper/8 py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="eyebrow mb-3">Dependencias bajo lupa</div>
              <h2 className="display text-[36px] md:text-[48px] tracking-tight">
                Ordenadas por riesgo compuesto
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="relative flex items-center w-full sm:w-[240px]">
                <span className="sr-only">Buscar dependencia o ramo</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar dependencia…"
                  className="w-full bg-cloud-whisper/5 border border-cloud-whisper/10 rounded-pill px-4 py-2 text-[12px] text-cloud-whisper placeholder:text-ash-accent focus:outline-none focus:border-cloud-whisper/30"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3 text-ash-accent hover:text-cloud-whisper text-[14px] leading-none"
                  >
                    ×
                  </button>
                )}
              </label>
              <select
                value={ramo}
                onChange={(e) => setRamo(e.target.value)}
                aria-label="Filtrar dependencias por ramo"
                className="rounded-pill bg-cloud-whisper/5 border border-cloud-whisper/15 text-cloud-whisper px-4 py-2 text-[12px] hover:border-cloud-whisper/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus:border-cloud-whisper/60 max-w-[260px] truncate"
              >
                {allRamos.map((r) => (
                  <option key={r} value={r} className="bg-midnight-void">
                    {r === "Todos" ? "Todos los ramos" : r}
                  </option>
                ))}
              </select>
              {(["all", "alert", "warn", "good", "nodata"] as Filter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={f === filter}
                    className={`rounded-pill px-4 py-2 text-[12px] transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void ${
                      f === filter
                        ? "bg-slate-dust text-midnight-void border-slate-dust"
                        : "bg-transparent text-light-ash border-cloud-whisper/15 hover:border-cloud-whisper/40 hover:text-cloud-whisper"
                    }`}
                  >
                    {f === "all"
                      ? "Todos"
                      : f === "alert"
                        ? "Alerta"
                        : f === "warn"
                          ? "Vigilancia"
                          : f === "good"
                            ? "Sin banderas"
                            : "Sin datos suficientes"}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="md:hidden text-[10px] text-ash-accent mb-2 flex items-center gap-1.5">
            <span aria-hidden>↔</span>
            <span>Desliza horizontalmente para ver todas las columnas</span>
          </div>
          <div className="rounded-card border border-cloud-whisper/10 overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="bg-cloud-whisper/3 border-b border-cloud-whisper/8">
                <tr className="text-left text-ash-accent">
                  <th className="px-5 py-3 font-medium">Dependencia</th>
                  <th className="px-5 py-3 font-medium">Ramo</th>
                  <th className="px-5 py-3 font-medium text-right">Contratos</th>
                  <th className="px-5 py-3 font-medium text-right">Monto total</th>
                  <th className="px-5 py-3 font-medium text-right">Adj. directa</th>
                  <th className="px-5 py-3 font-medium text-right">MAD</th>
                  <th className="px-5 py-3 font-medium text-right">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeps.slice(0, visible).map((d, i) => {
                  const tone = classifyDep(d);
                  const dotCls =
                    tone === "alert"
                      ? "bg-signal-alert"
                      : tone === "warn"
                        ? "bg-signal-warn"
                        : tone === "good"
                          ? "bg-signal-good"
                          : "bg-cloud-whisper/30";
                  return (
                    <tr
                      key={`${d.dependencia}-${i}`}
                      className="border-b border-cloud-whisper/5 hover:bg-cloud-whisper/3"
                    >
                      <td className="px-5 py-3 max-w-[340px]">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`}
                          />
                          <span
                            className="truncate"
                            title={d.dependencia}
                          >
                            {d.dependencia}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-light-ash truncate max-w-[200px]">
                        {d.ramo ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {fmtInt(d.contratos)}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {fmtCompact(d.monto_total)}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {d.adj_directa_pct === null
                          ? "—"
                          : `${fmtDec(d.adj_directa_pct)}%`}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {d.benford_mad === null
                          ? <span className="text-ash-accent" title="Datos insuficientes (<300 contratos)">n/d</span>
                          : d.benford_mad.toFixed(4)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {tone === "nodata" ? (
                          <Badge variant="lozenge">n/d</Badge>
                        ) : (
                          <Badge
                            variant={
                              tone === "alert"
                                ? "alert"
                                : tone === "warn"
                                  ? "warn"
                                  : "good"
                            }
                          >
                            {d.riesgo_score === null
                              ? "—"
                              : fmtDec(d.riesgo_score)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-[11px] text-ash-accent">
              Mostrando{" "}
              <span className="text-cloud-whisper tabular">
                {Math.min(visible, filteredDeps.length)}
              </span>{" "}
              de{" "}
              <span className="text-cloud-whisper tabular">
                {filteredDeps.length}
              </span>{" "}
              dependencias en filtro · {deps.length} total federales.
            </div>
            {visible < filteredDeps.length && (
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-pill px-5 py-2 text-[12px] bg-cloud-whisper/5 border border-cloud-whisper/15 text-cloud-whisper hover:bg-cloud-whisper/10 hover:border-cloud-whisper/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void"
              >
                Ver {Math.min(PAGE_SIZE, filteredDeps.length - visible)} más
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function KPI({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
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
      <div className={`display text-[42px] tabular leading-none ${toneCls} flex items-baseline gap-2`}>
        {value}
        {unit && (
          <span className="text-[14px] text-ash-accent font-normal">
            {unit}
          </span>
        )}
      </div>
      {hint && <div className="text-[11px] text-ash-accent">{hint}</div>}
    </div>
  );
}
