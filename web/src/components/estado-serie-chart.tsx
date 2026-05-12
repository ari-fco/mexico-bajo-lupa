"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { DELITOS, type DelitoCategoria } from "@/lib/types";
import { fmtDec, fmtInt } from "@/lib/format";
import { ClientOnly } from "./client-only";

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export type SerieRow = {
  ano: number;
  mes: number;
  delito: DelitoCategoria;
  total: number;
  por_100k: number;
};

// Receives ALL series for the focused state (one row per month × delito).
// The server component pre-filters by cve_ent so we never ship 2.2MB to the
// client. The client picks the active delito locally.
export function EstadoSerieChart({ series }: { series: SerieRow[] }) {
  const [delito, setDelito] = React.useState<DelitoCategoria>("Homicidio doloso");

  const data = React.useMemo(() => {
    return series
      .filter((r) => r.delito === delito)
      .map((r) => ({
        label: `${MESES[r.mes - 1]} ${String(r.ano).slice(2)}`,
        total: r.total,
        por_100k: r.por_100k,
        ano: r.ano,
        mes: r.mes,
      }));
  }, [series, delito]);

  // Tick strategy: with ~96 monthly points the X axis collapses into
  // unreadable repeats of "ene". We thin ticks so the user sees ~10 labels
  // spaced evenly across the series. For long series we collapse to
  // "year only" to maximise legibility; for shorter ones we keep "mmm yy".
  const targetTicks = 10;
  const tickFormatter = React.useCallback(
    (label: string): string => {
      if (data.length > 36) {
        // long series: show "20YY" only on January ticks, blank otherwise
        return label.startsWith("ene ") ? `20${label.slice(4)}` : "";
      }
      return label;
    },
    [data.length],
  );
  const xInterval = Math.max(0, Math.floor(data.length / targetTicks) - 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {DELITOS.map((d) => (
          <button
            key={d}
            onClick={() => setDelito(d)}
            className={`rounded-pill px-3.5 py-1 text-[11px] transition-colors border ${
              d === delito
                ? "bg-cloud-whisper text-midnight-void border-cloud-whisper"
                : "bg-transparent text-light-ash border-cloud-whisper/15 hover:border-cloud-whisper/40 hover:text-cloud-whisper"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="h-[380px]">
        <ClientOnly fallback={<div className="h-full w-full shimmer rounded-card" />}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="serieGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: "#999", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              interval={xInterval}
              tickFormatter={tickFormatter}
              minTickGap={12}
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
              formatter={(value, name) => {
                const v = Number(value);
                if (name === "total") return [fmtInt(v), "Casos"];
                if (name === "por_100k") return [fmtDec(v), "/100k"];
                return [String(value), String(name)];
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#ffffff"
              strokeWidth={1.4}
              fill="url(#serieGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
        </ClientOnly>
      </div>
    </div>
  );
}
