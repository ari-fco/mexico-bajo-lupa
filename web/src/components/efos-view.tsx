"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { fmtInt, fmtCompact, fmtMxn, fmtDec } from "@/lib/format";
import { MES_ABBR } from "@/lib/data-meta";
import efosKpis from "@/data/efos_kpis.json";
import efosTopProveedores from "@/data/efos_top_proveedores.json";
import efosTopDependencias from "@/data/efos_top_dependencias.json";
import efosLeads from "@/data/efos_leads.json";
import efosBreakdown from "@/data/efos_estatus_breakdown.json";

type Kpis = typeof efosKpis;
type Proveedor = (typeof efosTopProveedores)[number];
type Dependencia = (typeof efosTopDependencias)[number];
type Breakdown = (typeof efosBreakdown)[number];

type Lead = {
  rfc: string;
  contribuyente: string;
  institucion: string;
  ramo: string | null;
  monto: number;
  modalidad: string;
  fecha_firma: string | null;
  fecha_presuncion: string | null;
  ano: number | null;
  dias_despues_de_presuncion: number | null;
  posterior_a_presuncion: boolean;
  posterior_por_ano: boolean;
  estatus: string;
  descripcion: string | null;
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
  const mi = Number(m) - 1;
  if (mi < 0 || mi > 11) return d;
  return `${Number(dd)} ${MES_ABBR[mi]} ${y}`;
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
      <ProveedoresSection proveedores={proveedores} />

      {/* /Top proveedores */}

      {/* Top dependencias */}
      <DependenciasSection dependencias={dependencias} />

      {/* Headline cases */}
      <LeadsSection leads={leads} />

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
            rel="noopener noreferrer"
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

type ProvSortKey =
  | "contratos"
  | "monto"
  | "posteriores"
  | "rfc"
  | "presuncion"
  | "ultimo";

type ProvEstatusFilter = "ALL" | "DEFINITIVO" | "PRESUNTO" | "DESVIRTUADO" | "SENTENCIA_FAVORABLE";

function ProveedoresSection({ proveedores }: { proveedores: Proveedor[] }) {
  const [query, setQuery] = React.useState("");
  const [estatusFilter, setEstatusFilter] = React.useState<ProvEstatusFilter>("ALL");
  const [onlyPosteriores, setOnlyPosteriores] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<ProvSortKey>("contratos");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const totalRaw = proveedores.length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = proveedores;
    if (estatusFilter !== "ALL") {
      arr = arr.filter((p) => p.estatus === estatusFilter);
    }
    if (onlyPosteriores) {
      arr = arr.filter((p) => p.n_posteriores_amplio > 0);
    }
    if (q.length > 0) {
      arr = arr.filter(
        (p) =>
          p.rfc.toLowerCase().includes(q) ||
          p.contribuyente.toLowerCase().includes(q),
      );
    }
    const sorted = [...arr].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "rfc":
          return a.rfc.localeCompare(b.rfc) * dir;
        case "monto":
          return (a.monto_total - b.monto_total) * dir;
        case "posteriores":
          return (a.n_posteriores_amplio - b.n_posteriores_amplio) * dir;
        case "presuncion": {
          const av = a.fecha_presuncion ?? "";
          const bv = b.fecha_presuncion ?? "";
          return av.localeCompare(bv) * dir;
        }
        case "ultimo": {
          const av = a.ultimo_contrato ?? "";
          const bv = b.ultimo_contrato ?? "";
          return av.localeCompare(bv) * dir;
        }
        case "contratos":
        default:
          return (a.n_contratos - b.n_contratos) * dir;
      }
    });
    return sorted;
  }, [proveedores, query, estatusFilter, onlyPosteriores, sortKey, sortDir]);

  function toggleSort(key: ProvSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "rfc" || key === "presuncion" || key === "ultimo" ? "asc" : "desc",
      );
    }
  }

  function arrow(key: ProvSortKey) {
    if (sortKey !== key) {
      return <span className="text-cloud-whisper/20 ml-1">↕</span>;
    }
    return (
      <span className="text-cloud-whisper ml-1">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <section className="py-16 md:py-20 border-b border-cloud-whisper/8">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="eyebrow mb-3">Proveedores señalados</div>
            <h2 className="display text-[36px] md:text-[48px] tracking-tight">
              {totalRaw > 0
                ? "Quién recibe contratos del Estado"
                : "Sin coincidencias"}
            </h2>
            <p className="text-[13px] text-light-ash mt-3 max-w-2xl">
              RFCs que aparecen tanto en la lista SAT 69-B como en ComprasMX
              federal. Buscá por RFC o razón social, filtrá por estatus, y
              ordená cualquier columna. La fecha de presunción es cuando el
              SAT publicó la primera resolución contra ese RFC.
            </p>
          </div>
        </div>

        {totalRaw === 0 ? (
          <EmptyTable msg="No hay coincidencias en este corte." />
        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4 flex-wrap">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center">
                <label className="relative flex items-center w-full sm:w-[280px]">
                  <span className="sr-only">Buscar por RFC o contribuyente</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="RFC o razón social…"
                    className="w-full bg-cloud-whisper/5 border border-cloud-whisper/10 rounded-pill px-4 py-2 text-[13px] text-cloud-whisper placeholder:text-ash-accent focus:outline-none focus:border-cloud-whisper/30"
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

                <div className="flex items-center gap-1 text-[12px] bg-cloud-whisper/3 border border-cloud-whisper/8 rounded-pill p-1">
                  {(
                    [
                      ["ALL", "Todos"],
                      ["DEFINITIVO", "Definitivos"],
                      ["PRESUNTO", "Presuntos"],
                      ["DESVIRTUADO", "Desvirtuados"],
                      ["SENTENCIA_FAVORABLE", "S. favorable"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEstatusFilter(key)}
                      className={`px-3 py-1 rounded-pill transition-colors ${
                        estatusFilter === key
                          ? "bg-cloud-whisper text-midnight-void"
                          : "text-light-ash hover:text-cloud-whisper"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-[12px] text-light-ash cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyPosteriores}
                    onChange={(e) => setOnlyPosteriores(e.target.checked)}
                    className="accent-signal-alert"
                  />
                  Solo con contratos posteriores
                </label>
              </div>

              <div className="text-[11px] text-ash-accent tabular">
                {filtered.length === totalRaw
                  ? `${fmtInt(totalRaw)} proveedores`
                  : `${fmtInt(filtered.length)} de ${fmtInt(totalRaw)} proveedores`}
              </div>
            </div>

            <div className="md:hidden text-[10px] text-ash-accent mb-2 flex items-center gap-1.5">
              <span aria-hidden>↔</span>
              <span>Desliza horizontalmente para ver todas las columnas</span>
            </div>

            <div className="rounded-card border border-cloud-whisper/10 overflow-x-auto">
              <table className="w-full min-w-[820px] text-[13px]">
                <thead className="bg-cloud-whisper/3 border-b border-cloud-whisper/8">
                  <tr className="text-left text-ash-accent">
                    <SortableTh
                      label="RFC"
                      active={sortKey === "rfc"}
                      onClick={() => toggleSort("rfc")}
                    >
                      RFC{arrow("rfc")}
                    </SortableTh>
                    <th className="px-5 py-3 font-medium">Contribuyente</th>
                    <th className="px-5 py-3 font-medium">Estatus SAT</th>
                    <SortableTh
                      label="Contratos"
                      align="right"
                      active={sortKey === "contratos"}
                      onClick={() => toggleSort("contratos")}
                    >
                      Contratos{arrow("contratos")}
                    </SortableTh>
                    <SortableTh
                      label="Monto total"
                      align="right"
                      active={sortKey === "monto"}
                      onClick={() => toggleSort("monto")}
                    >
                      Monto total{arrow("monto")}
                    </SortableTh>
                    <SortableTh
                      label="Presunción"
                      active={sortKey === "presuncion"}
                      onClick={() => toggleSort("presuncion")}
                    >
                      Presunción{arrow("presuncion")}
                    </SortableTh>
                    <SortableTh
                      label="Último contrato"
                      active={sortKey === "ultimo"}
                      onClick={() => toggleSort("ultimo")}
                    >
                      Último contrato{arrow("ultimo")}
                    </SortableTh>
                    <SortableTh
                      label="Posteriores"
                      align="right"
                      active={sortKey === "posteriores"}
                      onClick={() => toggleSort("posteriores")}
                    >
                      Posteriores{arrow("posteriores")}
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-[13px] text-ash-accent"
                      >
                        Sin resultados con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p, i) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-ash-accent mt-4 max-w-2xl">
              <strong className="text-light-ash">&ldquo;Posteriores&rdquo;:</strong>{" "}
              contratos firmados después de que el SAT publicara la presunción.
              La señal más fuerte. Cuando la fecha de firma del contrato no fue
              publicada por ComprasMX (~57% del corpus federal), usamos el año
              del contrato como señal débil — la tabla cuenta ambos casos.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

type DepSortKey = "contratos" | "monto" | "definitivos" | "rfcs" | "institucion";

function DependenciasSection({ dependencias }: { dependencias: Dependencia[] }) {
  const [query, setQuery] = React.useState("");
  const [onlyDefinitivos, setOnlyDefinitivos] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<DepSortKey>("contratos");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const totalRaw = dependencias.length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = dependencias;
    if (onlyDefinitivos) {
      arr = arr.filter((d) => d.n_definitivos > 0);
    }
    if (q.length > 0) {
      arr = arr.filter(
        (d) =>
          d.institucion.toLowerCase().includes(q) ||
          (d.ramo ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...arr].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "institucion":
          return a.institucion.localeCompare(b.institucion) * dir;
        case "monto":
          return (a.monto_total - b.monto_total) * dir;
        case "definitivos":
          return (a.n_definitivos - b.n_definitivos) * dir;
        case "rfcs":
          return (a.n_rfcs_efos - b.n_rfcs_efos) * dir;
        case "contratos":
        default:
          return (a.n_contratos - b.n_contratos) * dir;
      }
    });
    return sorted;
  }, [dependencias, query, onlyDefinitivos, sortKey, sortDir]);

  function toggleSort(key: DepSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "institucion" ? "asc" : "desc");
    }
  }

  function arrow(key: DepSortKey) {
    if (sortKey !== key) {
      return <span className="text-cloud-whisper/20 ml-1">↕</span>;
    }
    return (
      <span className="text-cloud-whisper ml-1">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <section className="py-16 md:py-20 border-b border-cloud-whisper/8">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="eyebrow mb-3">Dependencias expuestas</div>
            <h2 className="display text-[36px] md:text-[48px] tracking-tight">
              Quién firma con presuntos EFOS
            </h2>
            <p className="text-[13px] text-light-ash mt-3 max-w-2xl">
              Instituciones del gobierno federal con contratos a RFCs listados
              por SAT bajo Art. 69-B CFF. Buscá por nombre o ramo, filtrá las
              que firmaron con Definitivos, y ordená por cualquier columna.
            </p>
          </div>
        </div>

        {totalRaw === 0 ? (
          <EmptyTable msg="No hay dependencias con cruce en este corte." />
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4 flex-wrap">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center">
                <label className="relative flex items-center w-full sm:w-[320px]">
                  <span className="sr-only">Buscar dependencia o ramo</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Dependencia o ramo…"
                    className="w-full bg-cloud-whisper/5 border border-cloud-whisper/10 rounded-pill px-4 py-2 text-[13px] text-cloud-whisper placeholder:text-ash-accent focus:outline-none focus:border-cloud-whisper/30"
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

                <label className="flex items-center gap-2 text-[12px] text-light-ash cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyDefinitivos}
                    onChange={(e) => setOnlyDefinitivos(e.target.checked)}
                    className="accent-signal-alert"
                  />
                  Solo con EFOS Definitivos
                </label>
              </div>

              <div className="text-[11px] text-ash-accent tabular">
                {filtered.length === totalRaw
                  ? `${fmtInt(totalRaw)} dependencias`
                  : `${fmtInt(filtered.length)} de ${fmtInt(totalRaw)} dependencias`}
              </div>
            </div>

            <div className="rounded-card border border-cloud-whisper/10 overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="bg-cloud-whisper/3 border-b border-cloud-whisper/8">
                  <tr className="text-left text-ash-accent">
                    <SortableTh
                      label="Dependencia"
                      active={sortKey === "institucion"}
                      onClick={() => toggleSort("institucion")}
                    >
                      Dependencia{arrow("institucion")}
                    </SortableTh>
                    <th className="px-5 py-3 font-medium">Ramo</th>
                    <SortableTh
                      label="Contratos"
                      align="right"
                      active={sortKey === "contratos"}
                      onClick={() => toggleSort("contratos")}
                    >
                      Contratos{arrow("contratos")}
                    </SortableTh>
                    <SortableTh
                      label="Definitivos"
                      align="right"
                      active={sortKey === "definitivos"}
                      onClick={() => toggleSort("definitivos")}
                    >
                      Definitivos{arrow("definitivos")}
                    </SortableTh>
                    <SortableTh
                      label="RFCs únicos"
                      align="right"
                      active={sortKey === "rfcs"}
                      onClick={() => toggleSort("rfcs")}
                    >
                      RFCs únicos{arrow("rfcs")}
                    </SortableTh>
                    <SortableTh
                      label="Monto total"
                      align="right"
                      active={sortKey === "monto"}
                      onClick={() => toggleSort("monto")}
                    >
                      Monto total{arrow("monto")}
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-[13px] text-ash-accent"
                      >
                        Sin resultados con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d, i) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

type LeadSortKey = "monto" | "fecha";

function LeadsSection({ leads }: { leads: Lead[] }) {
  const [sortKey, setSortKey] = React.useState<LeadSortKey>("monto");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [onlyPosteriores, setOnlyPosteriores] = React.useState(false);
  const [estatusFilter, setEstatusFilter] = React.useState<"ALL" | "DEFINITIVO">("ALL");

  const totalRaw = leads.length;

  const filtered = React.useMemo<Lead[]>(() => {
    let arr: Lead[] = leads;
    if (onlyPosteriores) {
      arr = arr.filter((l) => l.posterior_a_presuncion || l.posterior_por_ano);
    }
    if (estatusFilter === "DEFINITIVO") {
      arr = arr.filter((l) => l.estatus === "DEFINITIVO");
    }
    const sorted = [...arr].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "fecha") {
        const av = a.fecha_firma ?? (a.ano ? `${a.ano}-01-01` : "");
        const bv = b.fecha_firma ?? (b.ano ? `${b.ano}-01-01` : "");
        return av.localeCompare(bv) * dir;
      }
      return (a.monto - b.monto) * dir;
    });
    return sorted;
  }, [leads, sortKey, sortDir, onlyPosteriores, estatusFilter]);

  if (totalRaw === 0) return null;

  return (
    <section className="py-16 md:py-20 border-b border-cloud-whisper/8">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <div className="eyebrow mb-3">Casos para revisar</div>
            <h2 className="display text-[36px] md:text-[48px] tracking-tight">
              Los contratos más grandes
            </h2>
            <p className="text-[13px] text-light-ash mt-3 max-w-2xl">
              Los marcados en rojo son contratos firmados <em>después</em> de la
              presunción SAT — la señal más fuerte para auditoría. Filtrá por
              estatus o solo posteriores, y ordená por monto o fecha.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-6 flex-wrap">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center">
            <div className="flex items-center gap-1 text-[12px] bg-cloud-whisper/3 border border-cloud-whisper/8 rounded-pill p-1">
              {(
                [
                  ["ALL", "Todos"],
                  ["DEFINITIVO", "Solo Definitivos"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEstatusFilter(key)}
                  className={`px-3 py-1 rounded-pill transition-colors ${
                    estatusFilter === key
                      ? "bg-cloud-whisper text-midnight-void"
                      : "text-light-ash hover:text-cloud-whisper"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-[12px] text-light-ash cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyPosteriores}
                onChange={(e) => setOnlyPosteriores(e.target.checked)}
                className="accent-signal-alert"
              />
              Solo posteriores a presunción
            </label>

            <div className="flex items-center gap-1 text-[12px] bg-cloud-whisper/3 border border-cloud-whisper/8 rounded-pill p-1">
              {(
                [
                  ["monto", "Monto"],
                  ["fecha", "Fecha"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (sortKey === key) {
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setSortKey(key);
                      setSortDir("desc");
                    }
                  }}
                  className={`px-3 py-1 rounded-pill transition-colors ${
                    sortKey === key
                      ? "bg-cloud-whisper text-midnight-void"
                      : "text-light-ash hover:text-cloud-whisper"
                  }`}
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-ash-accent tabular">
            {filtered.length === totalRaw
              ? `${fmtInt(totalRaw)} casos`
              : `${fmtInt(filtered.length)} de ${fmtInt(totalRaw)} casos`}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-card border border-cloud-whisper/10 p-8 text-center text-[13px] text-ash-accent">
            Sin casos con los filtros actuales.
          </div>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((l, i) => {
              const isPost = l.posterior_a_presuncion || l.posterior_por_ano;
              return (
                <li
                  key={`${l.rfc}-${i}`}
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
        )}
      </div>
    </section>
  );
}

function SortableTh({
  children,
  onClick,
  active,
  align = "left",
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  align?: "left" | "right";
  label: string;
}) {
  return (
    <th
      className={`px-5 py-3 font-medium ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ordenar por ${label}`}
        className={`inline-flex items-center gap-0 hover:text-cloud-whisper transition-colors ${
          active ? "text-cloud-whisper" : ""
        }`}
      >
        {children}
      </button>
    </th>
  );
}
