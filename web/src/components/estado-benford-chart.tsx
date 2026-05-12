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
} from "recharts";
import { qBenfordPorDependencia } from "@/lib/queries";
import { ClientOnly } from "./client-only";

export function EstadoBenfordChart() {
  const data = React.useMemo(() => qBenfordPorDependencia({}), []);
  return (
    <div className="h-[260px]">
      <ClientOnly fallback={<div className="h-full w-full shimmer rounded-card" />}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="digito"
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
            tickFormatter={(v: number) => `${v}%`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              fontSize: 12,
              padding: "10px 12px",
            }}
            labelStyle={{ color: "#cccccc" }}
            formatter={(v: number, name) => [
              `${v.toFixed(2)}%`,
              name === "observado" ? "Observado" : "Esperado (Benford)",
            ]}
          />
          <Bar dataKey="observado" fill="#cccccc" radius={[3, 3, 0, 0]} />
          <Line
            type="monotone"
            dataKey="esperado"
            stroke="#ffffff"
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: "#ffffff" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}
