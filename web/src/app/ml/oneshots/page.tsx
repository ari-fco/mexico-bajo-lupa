import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/card";
import { MlOneshotsTable } from "@/components/ml-oneshots-table";
import { qMlOneShots, qMlMeta } from "@/lib/ml-queries";
import { fmtCompact } from "@/lib/format";

export const metadata: Metadata = {
  title: "One-shot wonders · ML",
  description:
    "106,927 proveedores aparecen UNA sola vez y desaparecen — 40.4% del padrón total. $354.9 mil M MXN agregados. 1.53× más probable que terminen en lista negra del SAT vs proveedores persistentes.",
};

export default function MlOneshotsPage() {
  const oneshots = qMlOneShots();
  const meta = qMlMeta();

  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Link href="/ml" className="text-[13px] text-ash-accent hover:text-cloud-whisper">
            ← ML investigación
          </Link>
          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <Badge variant="lozenge">Histórico</Badge>
            <Badge variant="lozenge">Empresas fachada</Badge>
            <Badge variant="lozenge">{fmtCompact(meta.oneshots.n_total)} proveedores</Badge>
          </div>
          <h1 className="display-xl leading-[0.95] tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            One-shot wonders
          </h1>
          <p className="text-light-ash text-[15px] mt-4 max-w-3xl leading-relaxed">
            Proveedores que aparecen <strong className="text-cloud-whisper">UNA sola vez</strong> en
            toda la historia de contratos públicos federales y desaparecen.
            El patrón clásico de empresas fachada: se constituyen, cobran un contrato,
            disuelven. <strong className="text-cloud-whisper">{meta.oneshots.pct_de_proveedores}%</strong> del padrón
            total de proveedores cumple este perfil.
          </p>
        </div>
      </section>

      <section className="py-8 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total one-shots" value={fmtCompact(meta.oneshots.n_total)} hint="40.4% del padrón" />
            <StatCard label="Monto agregado" value={`$${(meta.oneshots.monto_total_mxn / 1e9).toFixed(0)} mil M`} hint="6.12% del gasto total histórico" />
            <StatCard label="Con contratos > $1,000M" value={meta.oneshots.n_mayor_1000M.toString()} hint="One-shots mega" />
            <StatCard label="Con contratos > $100M" value={meta.oneshots.n_mayor_100M.toString()} hint="Significativos" />
          </div>
        </div>
      </section>

      <section className="py-10 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Validación con EFOS</div>
          <h2 className="text-[22px] font-semibold mb-3">
            1.53× más probable que terminen en lista negra del SAT
          </h2>
          <p className="text-light-ash text-[14px] max-w-3xl leading-relaxed">
            Los one-shots tienen una tasa de presencia en la lista EFOS de <strong className="text-cloud-whisper">0.354%</strong>{" "}
            vs <strong className="text-cloud-whisper">0.232%</strong> en proveedores persistentes (3+ sexenios).
            La diferencia valida la hipótesis: un proveedor que aparece UNA vez y desaparece tiene
            mayor probabilidad de ser una empresa diseñada para defraudar al fisco.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Top {oneshots.length} one-shots millonarios</div>
          <h2 className="text-[22px] font-semibold mb-6">Un contrato. Mucho dinero. Después, nada.</h2>
          <MlOneshotsTable rows={oneshots} />
        </div>
      </section>
    </div>
  );
}
