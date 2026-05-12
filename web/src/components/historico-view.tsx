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
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import historicoAnualJson from "@/data/historico_anual.json";
import historicoProveedoresJson from "@/data/historico_proveedores_top.json";
import continuidadJson from "@/data/continuidad.json";
import { fmtDec, fmtInt, fmtCompact } from "@/lib/format";
import { ClientOnly } from "./client-only";

type AnualRow = {
  ano: number;
  contratos: number;
  monto_total: number | null;
  pct_ad: number | null;
  pct_lp: number | null;
  pct_i3p: number | null;
  benford_mad: number | null;
};

type ProveedorRow = {
  proveedor: string;
  contratos: number;
  monto_total: number | null;
  anos_activos: number | null;
  primera_fecha: string | null;
  ultima_fecha: string | null;
  pct_ad: number | null;
};

type ContinuidadRow = {
  proveedor_historico: string;
  proveedor_moderno_match: string | null;
  rfc_proveedor_moderno: string | null;
  contratos_historico: number;
  monto_historico_mxn: number | null;
  contratos_moderno: number;
  monto_moderno_mxn: number | null;
  ad_pct_historico: number | null;
  ad_pct_moderno: number | null;
  estatus: "CONTINÚA" | "PAUSADO";
  match_confidence: "EXACTO" | "FUZZY" | "NULO";
  match_score: number | null;
};

const SEXENIOS = [
  { from: 2007, to: 2012, name: "Calderón", color: "#5e1f1f" },
  { from: 2013, to: 2018, name: "Peña Nieto", color: "#8a2828" },
  { from: 2019, to: 2024, name: "AMLO", color: "#b4332f" },
  { from: 2025, to: 2030, name: "Sheinbaum", color: "#d8443a" },
];

function sexenioOf(year: number): typeof SEXENIOS[number] | null {
  return SEXENIOS.find((s) => year >= s.from && year <= s.to) ?? null;
}

export function HistoricoView() {
  const anual = historicoAnualJson as AnualRow[];
  const proveedores = historicoProveedoresJson as ProveedorRow[];
  const continuidad = continuidadJson as ContinuidadRow[];

  // Solo años con masa estadística (>=20k contratos = excluye 2010 muy chico, 2023+ corte)
  const anualMain = anual.filter((r) => r.contratos >= 20_000);

  const totalContratos = anual.reduce((a, b) => a + b.contratos, 0);
  const totalMonto = anual.reduce((a, b) => a + (b.monto_total ?? 0), 0);
  const adAvg =
    anualMain.reduce((a, b) => a + (b.pct_ad ?? 0), 0) / anualMain.length;
  const adMax = anualMain.reduce(
    (a, b) => (b.pct_ad ?? 0) > (a.pct_ad ?? 0) ? b : a,
    anualMain[0],
  );

  return (
    <>
      {/* Headline KPIs */}
      <section className="border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-cloud-whisper/8">
          <KPI
            label="Contratos analizados"
            value={fmtCompact(totalContratos)}
            hint="2010 → 2024 · CompraNet 5.0"
          />
          <KPI
            label="Monto acumulado"
            value={`${fmtDec(totalMonto / 1e12)}`}
            unit="B MXN"
            hint="Billones acumulados 12 años"
          />
          <KPI
            label="% AD promedio"
            value={`${fmtDec(adAvg)}%`}
            unit="por año"
            tone="warn"
            hint="Mediana de adjudicación directa anual"
          />
          <KPI
            label="Récord histórico AD"
            value={`${fmtDec(adMax.pct_ad ?? 0)}%`}
            unit={String(adMax.ano)}
            tone="alert"
            hint={`Año más alto en adjudicación directa`}
          />
        </div>
      </section>

      {/* AD% por año stacked area */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">Mix de modalidades por año</div>
          <h2
            className="display tracking-tight mb-2"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
          >
            12 años de adjudicación directa
          </h2>
          <p className="text-[13px] text-light-ash mb-8 max-w-3xl">
            Cada barra es un año. Más rojo = mayor proporción de contratos sin
            licitación pública (adjudicación directa). La línea blanca es el
            % de licitaciones públicas: cuanto más alta, más competitivo el
            mercado de compras.
          </p>
          <div className="rounded-card border border-cloud-whisper/10 p-6 bg-cloud-whisper/2 h-[440px]">
            <ClientOnly fallback={<div className="h-full w-full shimmer rounded-card" />}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={anualMain}
                  margin={{ top: 8, right: 16, bottom: 0, left: -8 }}
                >
                  <defs>
                    <linearGradient id="adGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d8443a" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#5e1f1f" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="ano"
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
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#cccccc" }}
                    formatter={(v: number, name) => {
                      const label =
                        name === "pct_ad"
                          ? "Adj. directa"
                          : name === "pct_lp"
                            ? "Licitación pública"
                            : "Invitación 3";
                      return [`${fmtDec(v)}%`, label];
                    }}
                    labelFormatter={(label) => {
                      const sx = sexenioOf(label as number);
                      return `${label} · ${sx?.name ?? ""}`;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#999", paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="pct_ad"
                    name="Adj. directa"
                    stroke="#d8443a"
                    strokeWidth={1.5}
                    fill="url(#adGrad)"
                  />
                  <Line
                    type="monotone"
                    dataKey="pct_lp"
                    name="Licitación pública"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    dot={{ r: 2.5, fill: "#ffffff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct_i3p"
                    name="Invitación a 3"
                    stroke="#9bb86a"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={{ r: 2, fill: "#9bb86a" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ClientOnly>
          </div>

          {/* Sexenio markers */}
          <div className="mt-5 grid grid-cols-3 gap-px bg-cloud-whisper/8 rounded-card overflow-hidden">
            {[
              { name: "Calderón (07-12)", years: anualMain.filter((r) => r.ano <= 2012) },
              { name: "Peña (13-18)", years: anualMain.filter((r) => r.ano >= 2013 && r.ano <= 2018) },
              { name: "AMLO (19-24)", years: anualMain.filter((r) => r.ano >= 2019 && r.ano <= 2024) },
            ].map((sx) => {
              const adAvg = sx.years.length
                ? sx.years.reduce((a, b) => a + (b.pct_ad ?? 0), 0) / sx.years.length
                : 0;
              return (
                <div key={sx.name} className="bg-midnight-void p-5">
                  <div className="eyebrow mb-2">{sx.name}</div>
                  <div className="display tabular text-[28px] leading-none">
                    {fmtDec(adAvg)}%
                  </div>
                  <div className="text-[11px] text-ash-accent mt-2">
                    Adj. directa promedio · {sx.years.length} años
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top proveedores */}
      <section className="border-t border-cloud-whisper/8 py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">Captura institucional</div>
          <h2
            className="display tracking-tight mb-2"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
          >
            Los 50 proveedores que más recibieron
          </h2>
          <p className="text-[13px] text-light-ash mb-8 max-w-3xl">
            Ordenados por monto acumulado en 12 años. La columna{" "}
            <strong className="text-cloud-whisper">Años activos</strong> mide
            persistencia: un proveedor con 12+ años activos ha sostenido
            relación con el Estado a lo largo de tres sexenios.
          </p>

          <div className="md:hidden text-[10px] text-ash-accent mb-2 flex items-center gap-1.5">
            <span aria-hidden>↔</span>
            <span>Desliza horizontalmente para ver todas las columnas</span>
          </div>
          <div className="rounded-card border border-cloud-whisper/10 overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="bg-cloud-whisper/3 border-b border-cloud-whisper/8">
                <tr className="text-left text-ash-accent">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Proveedor</th>
                  <th className="px-5 py-3 font-medium text-right">Contratos</th>
                  <th className="px-5 py-3 font-medium text-right">Monto total</th>
                  <th className="px-5 py-3 font-medium text-right">Años</th>
                  <th className="px-5 py-3 font-medium text-right">% Adj. directa</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p, i) => {
                  const adHigh = (p.pct_ad ?? 0) >= 75;
                  const persistente = (p.anos_activos ?? 0) >= 10;
                  return (
                    <tr
                      key={`${p.proveedor}-${i}`}
                      className="border-b border-cloud-whisper/5 hover:bg-cloud-whisper/3"
                    >
                      <td className="px-5 py-3 tabular text-ash-accent">{i + 1}</td>
                      <td
                        className="px-5 py-3 max-w-[300px] truncate"
                        title={p.proveedor}
                      >
                        {p.proveedor}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {fmtInt(p.contratos)}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {p.monto_total
                          ? `$${fmtDec(p.monto_total / 1e9)}B`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        <span
                          className={
                            persistente ? "text-signal-warn" : ""
                          }
                        >
                          {p.anos_activos ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        <span
                          className={
                            adHigh ? "text-signal-alert" : ""
                          }
                        >
                          {p.pct_ad !== null
                            ? `${fmtDec(p.pct_ad)}%`
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-ash-accent mt-4 max-w-3xl leading-relaxed">
            <strong className="text-light-ash">Ámbar</strong> = 10+ años activos
            (atravesando 2-3 sexenios). <strong className="text-light-ash">Rojo</strong> = ≥75% por adjudicación directa. Este ranking{" "}
            <em>no</em> imputa irregularidad — sólo mide concentración y
            persistencia, dos indicadores clásicos de captura institucional
            que requieren auditoría caso por caso.
          </p>
        </div>
      </section>

      <ContinuidadSection rows={continuidad} />
    </>
  );
}

function ContinuidadSection({ rows }: { rows: ContinuidadRow[] }) {
  const continuan = rows.filter((r) => r.estatus === "CONTINÚA");
  const pausados = rows.filter((r) => r.estatus === "PAUSADO");
  const totalRows = rows.length;
  const exacto = rows.filter((r) => r.match_confidence === "EXACTO").length;
  const fuzzy = rows.filter((r) => r.match_confidence === "FUZZY").length;

  // Para las barras: escala compartida en mil-millones (mdp).
  const maxMonto = Math.max(
    ...rows.map((r) =>
      Math.max(r.monto_historico_mxn ?? 0, r.monto_moderno_mxn ?? 0),
    ),
    1,
  );

  // Ordenar para narrativa: primero los que continúan (por monto histórico),
  // después los pausados.
  const continuanSorted = [...continuan].sort(
    (a, b) => (b.monto_historico_mxn ?? 0) - (a.monto_historico_mxn ?? 0),
  );

  return (
    <section className="border-t border-cloud-whisper/8 py-16 md:py-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="eyebrow mb-3">Continuidad histórico → moderno</div>
        <h2
          className="display tracking-tight mb-2"
          style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
        >
          ¿Quiénes siguen contratando hoy?
        </h2>
        <p className="text-[13px] text-light-ash mb-8 max-w-3xl leading-relaxed">
          Los Top 50 proveedores que dominaban CompraNet 2010-2022 cruzados
          contra ComprasMX 2024-2025. El histórico no tiene RFC, así que el
          cruce se hace por <strong className="text-cloud-whisper">nombre normalizado</strong>{" "}
          (uppercase, sin acentos ni sufijos legales) y, cuando el match no es
          exacto, por <em>fuzzy matching</em> con umbral conservador de 90/100.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-cloud-whisper/8 rounded-card overflow-hidden mb-10">
          <div className="bg-midnight-void p-5">
            <div className="eyebrow mb-2">Top 50 históricos</div>
            <div className="display tabular text-[28px] leading-none">
              {totalRows}
            </div>
            <div className="text-[11px] text-ash-accent mt-2">
              Universo cruzado
            </div>
          </div>
          <div className="bg-midnight-void p-5">
            <div className="eyebrow mb-2">Continúan</div>
            <div className="display tabular text-[28px] leading-none text-signal-warn">
              {continuan.length}
            </div>
            <div className="text-[11px] text-ash-accent mt-2">
              Aparecen en 2024-2025
            </div>
          </div>
          <div className="bg-midnight-void p-5">
            <div className="eyebrow mb-2">Pausados</div>
            <div className="display tabular text-[28px] leading-none text-cloud-whisper">
              {pausados.length}
            </div>
            <div className="text-[11px] text-ash-accent mt-2">
              Sin contratos modernos
            </div>
          </div>
          <div className="bg-midnight-void p-5">
            <div className="eyebrow mb-2">Confianza match</div>
            <div className="display tabular text-[28px] leading-none">
              {exacto}
              <span className="text-[14px] text-ash-accent font-normal">
                {" "}
                / {fuzzy}
              </span>
            </div>
            <div className="text-[11px] text-ash-accent mt-2">
              Exacto / Fuzzy
            </div>
          </div>
        </div>

        <div className="rounded-card border border-cloud-whisper/10 overflow-hidden">
          <div className="bg-cloud-whisper/3 border-b border-cloud-whisper/8 px-5 py-3 grid grid-cols-12 gap-3 text-[11px] uppercase tracking-wider text-ash-accent">
            <div className="col-span-4">Proveedor histórico</div>
            <div className="col-span-6">Histórico (12 años) vs Moderno (2024-25)</div>
            <div className="col-span-2 text-right">Estatus</div>
          </div>
          <div className="divide-y divide-cloud-whisper/5">
            {continuanSorted.map((r, i) => (
              <ContinuidadRowItem key={`c-${i}`} row={r} maxMonto={maxMonto} />
            ))}
            {pausados.map((r, i) => (
              <ContinuidadRowItem key={`p-${i}`} row={r} maxMonto={maxMonto} />
            ))}
          </div>
        </div>

        <p className="text-[11px] text-ash-accent mt-4 max-w-3xl leading-relaxed">
          <strong className="text-light-ash">CONTINÚA</strong> = proveedor con
          contratos en 2024-25 según match por nombre normalizado.{" "}
          <strong className="text-light-ash">PAUSADO</strong> = no aparece en el
          universo moderno (puede haber cambiado razón social, fusionado, o
          dejado de contratar). Los matches{" "}
          <strong className="text-signal-warn">FUZZY</strong> tienen score
          rapidfuzz ≥ 90 sobre token_set_ratio — el resto son coincidencias
          exactas tras normalización. No imputamos identidad jurídica: para
          confirmar continuidad real hay que verificar RFC, lo cual es
          imposible en el lado histórico.
        </p>
      </div>
    </section>
  );
}

function ContinuidadRowItem({
  row,
  maxMonto,
}: {
  row: ContinuidadRow;
  maxMonto: number;
}) {
  const histPct = ((row.monto_historico_mxn ?? 0) / maxMonto) * 100;
  const modPct = ((row.monto_moderno_mxn ?? 0) / maxMonto) * 100;
  const continua = row.estatus === "CONTINÚA";

  return (
    <div className="px-5 py-4 grid grid-cols-12 gap-3 items-center hover:bg-cloud-whisper/3">
      <div className="col-span-4 min-w-0">
        <div
          className="text-[13px] truncate"
          title={row.proveedor_historico}
        >
          {row.proveedor_historico}
        </div>
        {row.proveedor_moderno_match && (
          <div
            className="text-[11px] text-ash-accent truncate"
            title={row.proveedor_moderno_match}
          >
            ↳ {row.proveedor_moderno_match}
            {row.rfc_proveedor_moderno && (
              <span className="ml-2 tabular text-[10px] text-light-ash/60">
                {row.rfc_proveedor_moderno}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="col-span-6 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-2 bg-cloud-whisper/10 flex-1 rounded-sm overflow-hidden">
            <div
              className="h-full bg-cloud-whisper/40"
              style={{ width: `${Math.max(histPct, 0.3)}%` }}
            />
          </div>
          <div className="tabular text-[11px] text-light-ash w-32 text-right">
            {fmtCompact((row.monto_historico_mxn ?? 0) / 1)}
            <span className="text-[10px] text-ash-accent ml-1">
              · {fmtInt(row.contratos_historico)} contratos
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 bg-cloud-whisper/10 flex-1 rounded-sm overflow-hidden">
            <div
              className="h-full bg-signal-alert"
              style={{ width: `${Math.max(modPct, 0)}%` }}
            />
          </div>
          <div className="tabular text-[11px] text-light-ash w-32 text-right">
            {row.contratos_moderno > 0
              ? fmtCompact((row.monto_moderno_mxn ?? 0) / 1)
              : "—"}
            <span className="text-[10px] text-ash-accent ml-1">
              {row.contratos_moderno > 0
                ? `· ${fmtInt(row.contratos_moderno)} contratos`
                : "· sin actividad"}
            </span>
          </div>
        </div>
      </div>
      <div className="col-span-2 text-right">
        <div
          className={`text-[11px] font-medium ${
            continua ? "text-signal-warn" : "text-ash-accent"
          }`}
        >
          {row.estatus}
        </div>
        <div className="text-[10px] text-ash-accent mt-1">
          {row.match_confidence === "EXACTO"
            ? "match exacto"
            : row.match_confidence === "FUZZY"
              ? `fuzzy ${fmtDec(row.match_score ?? 0)}`
              : "sin match"}
        </div>
        {row.estatus === "CONTINÚA" && (
          <div className="text-[10px] text-ash-accent mt-0.5">
            AD {fmtDec(row.ad_pct_moderno ?? 0)}%
          </div>
        )}
      </div>
    </div>
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
      <div
        className={`display text-[42px] tabular leading-none ${toneCls} flex items-baseline gap-2`}
      >
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
