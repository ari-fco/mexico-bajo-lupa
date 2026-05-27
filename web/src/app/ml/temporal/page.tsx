import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/card";
import {
  MlPersistentesTable,
  MlTransitoriosTable,
  MlElectoralesTable,
} from "@/components/ml-temporal-tables";
import {
  qMlContinuidad,
  qMlContinuidadPatrones,
  qMlMeta,
} from "@/lib/ml-queries";
import { fmtInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Continuidad temporal · ML",
  description:
    "Patrones políticos de continuidad: proveedores activos solo en años electorales, transitorios (un sexenio) y persistentes (3+ sexenios). Hallazgo contraintuitivo: %AD baja 10pp en años electorales.",
};

export default function MlTemporalPage() {
  const proveedores = qMlContinuidad();
  const patrones = qMlContinuidadPatrones();
  const meta = qMlMeta();

  const persistentes = proveedores.filter((p) => p.patron_temporal === "persistente");
  const transitorios = proveedores.filter((p) => p.patron_temporal === "transitorio");
  const electorales = proveedores.filter((p) => p.patron_temporal === "solo_electorales");

  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Link href="/ml" className="text-[13px] text-ash-accent hover:text-cloud-whisper">
            ← ML investigación
          </Link>
          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <Badge variant="lozenge">Calderón → Sheinbaum</Badge>
            <Badge variant="lozenge">2010-2024</Badge>
          </div>
          <h1 className="display-xl leading-[0.95] tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Continuidad temporal
          </h1>
          <p className="text-light-ash text-[15px] mt-4 max-w-3xl leading-relaxed">
            Tres clases naturales de proveedores: <strong className="text-cloud-whisper">persistentes</strong>
            {" "}(oligopolios que sobreviven gobiernos), <strong className="text-cloud-whisper">transitorios</strong> (un
            solo sexenio), y <strong className="text-cloud-whisper">los que aparecen solo en años electorales</strong>.
            Hallazgo contraintuitivo: el porcentaje de Adjudicación Directa baja 10 puntos en años
            electorales, no sube.
          </p>
        </div>
      </section>

      <section className="py-8 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Solo años electorales" value={fmtInt(meta.continuidad.n_solo_electorales)} hint="2012/15/18/21/24" />
            <StatCard label="Transitorios" value={fmtInt(meta.continuidad.n_transitorios)} hint="1 solo sexenio" />
            <StatCard label="Persistentes" value={fmtInt(meta.continuidad.n_persistentes)} hint="3+ sexenios" />
            <StatCard label="Patrones detectados" value={patrones.length.toString()} hint="Clases naturales" />
          </div>
        </div>
      </section>

      <section className="py-10 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Patrón A — Persistentes</div>
          <h2 className="text-[22px] font-semibold mb-2">
            Oligopolios que cruzan gobiernos
          </h2>
          <p className="text-[13px] text-light-ash mb-6 max-w-3xl">
            Activos en 3+ sexenios, 10+ contratos. Los pilares del gasto público: farmacéuticas,
            seguros, vales, mantenimiento.
          </p>
          <MlPersistentesTable rows={persistentes} />
        </div>
      </section>

      <section className="py-10 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Patrón B — Transitorios</div>
          <h2 className="text-[22px] font-semibold mb-2">
            Proveedores de UN solo sexenio
          </h2>
          <p className="text-[13px] text-light-ash mb-6 max-w-3xl">
            ≥90% de su monto en un solo sexenio + alta intensidad. Aparecen con el gobierno,
            mueren con el gobierno. <span className="text-ash-accent">Filtrá por sexenio para verlo.</span>
          </p>
          <MlTransitoriosTable rows={transitorios} />
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Patrón C — Solo años electorales</div>
          <h2 className="text-[22px] font-semibold mb-2">
            Los {electorales.length} proveedores que se activan SOLO en elecciones
          </h2>
          <p className="text-[13px] text-light-ash mb-6 max-w-3xl">
            Toda su actividad cae exclusivamente dentro de 2012, 2015, 2018, 2021 o 2024.
          </p>
          <MlElectoralesTable rows={electorales} />
        </div>
      </section>
    </div>
  );
}
