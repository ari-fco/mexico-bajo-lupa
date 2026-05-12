"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { fmtInt, fmtCompact, fmtMxn, fmtDec } from "@/lib/format";
import efosKpis from "@/data/efos_kpis.json";
import efosTopProveedores from "@/data/efos_top_proveedores.json";
import efosTopDependencias from "@/data/efos_top_dependencias.json";
import efosLeads from "@/data/efos_leads.json";
import efosBreakdown from "@/data/efos_estatus_breakdown.json";

type Kpis = typeof efosKpis;
type Proveedor = (typeof efosTopProveedores)[number];
type Dependencia = (typeof efosTopDependencias)[number];
type Lead = (typeof efosLeads)[number];
type Breakdown = (typeof efosBreakdown)[number];

const ESTATUS_LABEL: Record<string, string> = {
  DEFINITIVO: "Definitivo",
  PRESUNTO: "Presunto",
  DESVIRTUADO: "Desvirtuado",
  SENTENCIA_FAVORABLE: "Sentencia favorable",
};

function estatusBadge(estatus: string) {
  if (estatus === "DEFINITIVO") return <Badge variant="alert">Definitivo</Badge>;
  if (estatus === "PRESUNTO") return <Badge variant="warn">Presunto</Badge>;
  if (estatus === "DESVIRTUADO") return <Badge variant="lozenge">Desvirtuado</Badge>;
  if (estatus === "SENTENCIA_FAVORABLE") return <Badge variant="good">Sent. favorable</Badge>;
  return <Badge variant="lozenge">{estatus}</Badge>;
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Trim "YYYY-MM-DD" component if there's a time
  const d = iso.slice(0, 10);
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const [y, m, dd] = parts;
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const mi = Number(m) - 1;
  if (mi < 0 || mi > 11) return d;
  return `${Number(dd)} ${meses[mi]} ${y}`;
}

export function EfosView() {
  const k = efosKpis as Kpis;
  const proveedores = efosTopProveedores as Proveedor[];
  const dependencias = efosTopDependencias as Dependencia[];
  const leads = efosLeads as Lead[];
  const breakdown = efosBreakdown as Breakdown[];

  // Derive friendly snapshot date
  const snapshotIso = k.snapshot_fecha
    ? String(k.snapshot_fecha).slice(0, 10)
    : null;

  const pctPosterior =
    k.n_contratos_cruce > 0
      ? (k.n_contratos_posteriores_amplio / k.n_contratos_cruce) * 100
      : 0;

  return (
    <>
      {/* Coverage strip */}
      <section className="border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-8 flex items-center gap-3 flex-wrap text-[12px] text-ash-accent">
          <span className="eyebrow">Snapshot</span>
          <span className="tabular text-light-ash">
            SAT EFOS al {fmtFecha(snapshotIso)}
          </span>
          <span className="text-cloud-whisper/30">·</span>
          <span className="tabular">
            {fmtInt(k.efos_total_listado)} contribuyentes 69-B
          </span>
          <span className="text-cloud-whisper/30">·</span>
          <span>Cruce con ComprasMX federal 2024–2025</span>
        </div>

        {/* KPIs */}
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-cloud-whisper/8">
          <KPI
            label="Definitivos en lista SAT"
            value={fmtInt(k.efos_definitivos_listado)}
            unit={`/ ${fmtInt(k.efos_total_listado)}`}
            tone="alert"
            hint="Resolución firme: SAT confirma operaciones simuladas."
          />
          <KPI
            label="Contratos federales cruzados"
            value={fmtInt(k.n_contratos_cruce)}
            unit="contratos"
            tone={k.n_contratos_cruce > 0 ? "warn" : "neutral"}
            hint={`${k.rfc_unicos_cruce} RFCs únicos · ${k.dependencias_unicas} dependencias`}
          />
          <KPI
            label="Monto total expuesto"
            value={fmtCompact(k.monto_total_cruce)}
            unit="MXN"
            tone="warn"
            hint="Suma de contratos firmados con RFCs en lista 69-B (cualquier estatus)."
          />
          <KPI
            label="Posteriores a presunción"
            value={fmtInt(k.n_contratos_posteriores_amplio)}
            unit={`${fmtDec(pctPosterior)}%`}
            tone={k.n_contratos_posteriores_amplio > 0 ? "alert" : "neutral"}
            hint="Contratos firmados después de que el SAT publicara la presunción."
          />
        </div>

        {/* Methodological note */}
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 mt-6">
          <p className="text-[11px] text-ash-accent leading-relaxed max-w-3xl">
            <strong className="text-light-ash">Hallazgo honesto:</strong>{" "}
            de los {fmtInt(k.efos_definitivos_listado)} EFOS Definitivos del
            SAT, sólo {fmtInt(k.rfc_unicos_definitivos)} aparecen como
            proveedor en ComprasMX federal 2024–25. La intersección es chica
            porque las EFOS suelen ser shells pequeñas, no grandes
            contratistas APF. Pero los casos que cruzan importan: están a la
            vista del SAT y el Estado les firma contratos.
          </p>
        </div>
      </section>

      {/* Estatus breakdown */}
      {breakdown.length > 0 && (
        <section className="py-12 md:py-16 border-b border-cloud-whisper/8">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="eyebrow mb-3">Cruce por estatus SAT</div>
            <h2 className="display text-[28px] md:text-[36px] tracking-tight mb-6">
              Cómo se reparten los matches
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-cloud-whisper/8 rounded-card overflow-hidden border border-cloud-whisper/10">
              {breakdown.map((b) => (
                <div
                  key={b.estatus}
                  className="bg-midnight-void p-6 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    {estatusBadge(b.estatus)}
                    <span className="tabular text-[11px] text-ash-accent">
                      {fmtInt(b.n_rfcs)} RFC
                    </span>
                  </div>
                  <div className="display text-[36px] tabular leading-none">
                    {fmtInt(b.n_contratos)}
                  </div>
                  <div className="text-[11px] text-ash-accent">
                    contratos · {fmtCompact(b.monto_total)} MXN ·{" "}
                    {fmtInt(b.posteriores)} posteriores
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top proveedores */}
      <section className="py-16 md:py-20 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="eyebrow mb-3">Proveedores señalados</div>
              <h2 className="display text-[36px] md:text-[48px] tracking-tight">
                {proveedores.length > 0
                  ? "Quién recibe contratos del Estado"
                  : "Sin coincidencias"}
              </h2>
              <p className="text-[13px] text-light-ash mt-3 max-w-2xl">
                RFCs que aparecen tanto en la lista SAT 69-B como en
                ComprasMX federal. Ordenados por número de contratos. La fecha
                de presunción es cuando el SAT publicó la primera resolución
                contra ese RFC.
              </p>
            </div>
          </div>

          {proveedores.length === 0 ? (
            <EmptyTable msg="No hay coincidencias en este corte." />
          ) : (
            <>
              <div className="md:hidden text-[10px] text-ash-accent mb-2 flex items-center gap-1.5">
                <span aria-hidden>↔</span>
                <span>Desliza horizontalmente para ver todas las columnas</span>
              </div>
              <div className="rounded-card border border-cloud-whisper/10 overflow-x-auto">
                <table className="w-full min-w-[820px] text-[13px]">
                  <thead className="bg-cloud-whisper/3 border-b border-cloud-whisper/8">
                    <tr className="text-left text-ash-accent">
                      <th className="px-5 py-3 font-medium">RFC</th>
                      <th className="px-5 py-3 font-medium">Contribuyente</th>
                      <th className="px-5 py-3 font-medium">Estatus SAT</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Contratos
                      </th>
                      <th className="px-5 py-3 font-medium text-right">
                        Monto total
                      </th>
                      <th className="px-5 py-3 font-medium">Presunción</th>
                      <th className="px-5 py-3 font-medium">Último contrato</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Posteriores
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedores.map((p, i) => (
                      <tr
                        key={`${p.rfc}-${p.estatus}-${i}`}
                        className="border-b border-cloud-whisper/5 hover:bg-cloud-whisper/3 align-top"
                      >
                        <td className="px-5 py-3 tabular text-cloud-whisper">
                          {p.rfc}
                        </td>
                        <td className="px-5 py-3 max-w-[280px]">
                          <span className="block truncate" title={p.contribuyente}>
                            {p.contribuyente}
                          </span>
                        </td>
                        <td className="px-5 py-3">{estatusBadge(p.estatus)}</td>
                        <td className="px-5 py-3 text-right tabular">
                          {fmtInt(p.n_contratos)}
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          {fmtCompact(p.monto_total)}
                        </td>
                        <td className="px-5 py-3 text-light-ash">
                          {fmtFecha(p.fecha_presuncion)}
                        </td>
                        <td className="px-5 py-3 text-light-ash">
                          {fmtFecha(p.ultimo_contrato)}
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          {p.n_posteriores_amplio > 0 ? (
                            <span className="text-signal-alert">
                              {fmtInt(p.n_posteriores_amplio)}
                            </span>
                          ) : (
                            <span className="text-ash-accent">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-ash-accent mt-4 max-w-2xl">
                <strong className="text-light-ash">&ldquo;Posteriores&rdquo;:</strong>{" "}
                contratos firmados después de que el SAT publicara la
                presunción. La señal más fuerte. Cuando la fecha de firma del
                contrato no fue publicada por ComprasMX (~57% del corpus
                federal), usamos el año del contrato como señal débil — la
                tabla cuenta ambos casos.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Top dependencias */}
      <section className="py-16 md:py-20 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="eyebrow mb-3">Dependencias expuestas</div>
              <h2 className="display text-[36px] md:text-[48px] tracking-tight">
                Quién firma con presuntos EFOS
              </h2>
              <p className="text-[13px] text-light-ash mt-3 max-w-2xl">
                Instituciones del gobierno federal con contratos a RFCs
                listados por SAT bajo Art. 69-B CFF. Ordenadas por número de
                contratos.
              </p>
            </div>
          </div>

          {dependencias.length === 0 ? (
            <EmptyTable msg="No hay dependencias con cruce en este corte." />
          ) : (
            <div className="rounded-card border border-cloud-whisper/10 overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="bg-cloud-whisper/3 border-b border-cloud-whisper/8">
                  <tr className="text-left text-ash-accent">
                    <th className="px-5 py-3 font-medium">Dependencia</th>
                    <th className="px-5 py-3 font-medium">Ramo</th>
                    <th className="px-5 py-3 font-medium text-right">
                      Contratos
                    </th>
                    <th className="px-5 py-3 font-medium text-right">
                      Definitivos
                    </th>
                    <th className="px-5 py-3 font-medium text-right">
                      RFCs únicos
                    </th>
                    <th className="px-5 py-3 font-medium text-right">
                      Monto total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dependencias.map((d, i) => (
                    <tr
                      key={`${d.institucion}-${i}`}
                      className="border-b border-cloud-whisper/5 hover:bg-cloud-whisper/3"
                    >
                      <td className="px-5 py-3 max-w-[340px]">
                        <span className="block truncate" title={d.institucion}>
                          {d.institucion}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-light-ash truncate max-w-[200px]">
                        {d.ramo ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {fmtInt(d.n_contratos)}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {d.n_definitivos > 0 ? (
                          <span className="text-signal-alert">
                            {fmtInt(d.n_definitivos)}
                          </span>
                        ) : (
                          <span className="text-ash-accent">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {fmtInt(d.n_rfcs_efos)}
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        {fmtCompact(d.monto_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Headline cases */}
      {leads.length > 0 && (
        <section className="py-16 md:py-20 border-b border-cloud-whisper/8">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="eyebrow mb-3">Casos para revisar</div>
            <h2 className="display text-[36px] md:text-[48px] tracking-tight">
              Los contratos más grandes
            </h2>
            <p className="text-[13px] text-light-ash mt-3 max-w-2xl mb-8">
              Top 15 por monto. Los marcados en rojo son contratos firmados
              <em> después</em> de la presunción SAT — la señal más fuerte
              para auditoría.
            </p>
            <ul className="grid gap-3">
              {leads.map((l, i) => {
                const isPost = l.posterior_a_presuncion || l.posterior_por_ano;
                return (
                  <li
                    key={i}
                    className={`rounded-card border p-5 bg-cloud-whisper/2 ${
                      isPost
                        ? "border-signal-alert/30"
                        : "border-cloud-whisper/10"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {estatusBadge(l.estatus)}
                          {isPost && (
                            <Badge variant="alert">
                              {l.posterior_a_presuncion
                                ? "Posterior a presunción"
                                : `Año del contrato posterior (${l.ano ?? "?"})`}
                            </Badge>
                          )}
                          <span className="text-[11px] text-ash-accent">
                            {l.modalidad}
                          </span>
                        </div>
                        <div className="text-[15px] font-medium tracking-tight text-cloud-whisper">
                          {l.contribuyente}
                        </div>
                        <div className="text-[12px] text-light-ash mt-0.5 tabular">
                          {l.rfc} · {l.institucion}
                        </div>
                        {l.descripcion && (
                          <div className="text-[12px] text-ash-accent mt-2 line-clamp-2">
                            {l.descripcion}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-row md:flex-col items-baseline md:items-end gap-3 md:gap-1 shrink-0">
                        <div className="display text-[24px] md:text-[28px] tabular leading-none">
                          {fmtMxn(l.monto)}
                        </div>
                        <div className="text-[11px] text-ash-accent">
                          {l.fecha_firma
                            ? `firmado ${fmtFecha(l.fecha_firma)}`
                            : l.ano
                              ? `año ${l.ano} · sin fecha exacta`
                              : "sin fecha"}
                        </div>
                        {l.fecha_presuncion && (
                          <div className="text-[11px] text-ash-accent">
                            presunción SAT {fmtFecha(l.fecha_presuncion)}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <section className="py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid md:grid-cols-2 gap-10">
          <div>
            <div className="eyebrow mb-3">Lo que el cruce dice</div>
            <p className="text-[14px] text-light-ash leading-relaxed">
              Que un proveedor del gobierno federal aparece en la lista del
              SAT bajo el Art. 69-B del CFF. Si el contrato es{" "}
              <strong className="text-cloud-whisper">posterior</strong> a la
              fecha de presunción, el riesgo reputacional para la dependencia
              que firmó es alto: el SAT había publicado la sospecha. La
              pregunta editorial: ¿por qué siguieron contratando sin
              documentar el descargo?
            </p>
          </div>
          <div>
            <div className="eyebrow mb-3">Lo que el cruce NO dice</div>
            <p className="text-[14px] text-light-ash leading-relaxed">
              Que el contrato es necesariamente fraudulento.{" "}
              <strong className="text-cloud-whisper">EFOS no es prueba penal</strong>
              {" "}— es resolución administrativa SAT. Algunas empresas se
              defienden y obtienen sentencia favorable o desvirtúan la
              presunción. Marcamos el estatus actual de cada RFC en la lista
              SAT al snapshot de la fecha indicada.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 mt-8 text-[11px] text-ash-accent">
          Fuente:{" "}
          <a
            href={k.fuente_url}
            target="_blank"
            rel="noreferrer"
            className="text-light-ash underline decoration-1 underline-offset-4 hover:text-cloud-whisper"
          >
            SAT · Listado completo Art. 69-B CFF (CSV oficial)
          </a>
          {snapshotIso && <> · Snapshot {fmtFecha(snapshotIso)}</>}
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

function EmptyTable({ msg }: { msg: string }) {
  return (
    <div className="rounded-card border border-cloud-whisper/10 p-8 text-center text-[13px] text-ash-accent">
      {msg}
    </div>
  );
}
