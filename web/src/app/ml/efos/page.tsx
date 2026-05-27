import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  qMlEfosPostPresuncion,
  qMlEfosContratosTop,
  qMlMeta,
} from "@/lib/ml-queries";
import { fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)} K`;
  return `$${fmtInt(n)}`;
}

export const metadata: Metadata = {
  title: "EFOS post-presunción · ML",
  description:
    "Empresas que el SAT marcó como EFOS y, aún así, siguieron firmando contratos públicos. Cruce temporal: contratos firmados DESPUÉS de la fecha de presunción del proveedor.",
};

export default function MlEfosPage() {
  const post = qMlEfosPostPresuncion();
  const top = qMlEfosContratosTop();
  const meta = qMlMeta();

  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Link href="/ml" className="text-[13px] text-ash-accent hover:text-cloud-whisper">
            ← ML investigación
          </Link>
          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <Badge variant="lozenge">SAT 69-B CFF</Badge>
            <Badge variant="lozenge">Cruce temporal</Badge>
            <Badge variant="lozenge">{fmtInt(meta.efos_post_presuncion.n)} casos detectados</Badge>
          </div>
          <h1 className="display-xl leading-[0.95] tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            EFOS post-presunción
          </h1>
          <p className="text-light-ash text-[15px] mt-4 max-w-3xl leading-relaxed">
            Empresas que el SAT publicó como{" "}
            <strong className="text-cloud-whisper">EFOS bajo el Art. 69-B</strong> del Código Fiscal de la
            Federación y que, aún así, siguieron firmando contratos públicos.{" "}
            <em>Monto bajo en los casos detectados, pero documenta un gap del sistema:</em> no hay
            bloqueo automático de contratación a EFOS conocidos.
          </p>
        </div>
      </section>

      <section className="py-10 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Contratos POST-presunción · reciente 2024-2025</div>
          <h2 className="text-[22px] font-semibold mb-6">
            {post.length} contratos firmados DESPUÉS de que el SAT marcó al proveedor
          </h2>
          <div className="space-y-3">
            {post.map((e, i) => (
              <div
                key={`${e.rfc_proveedor}-${i}`}
                className="border border-cloud-whisper/10 rounded-card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-[13px] text-light-ash">
                    Firma: {e.fecha_firma?.slice(0, 10)} · Presunto desde: {e.fecha_presuncion?.slice(0, 10)}
                  </div>
                  <Badge variant="lozenge">{e.estatus}</Badge>
                </div>
                <div className="text-[17px] font-semibold leading-tight mb-2">
                  {e.proveedor}
                </div>
                <div className="display text-[22px] tabular leading-none mb-2">
                  {fmtMonto(e.monto)} <span className="text-[14px] text-light-ash font-normal">MXN</span>
                </div>
                <div className="text-[12px] text-light-ash">
                  RFC: <span className="text-cloud-whisper">{e.rfc_proveedor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Top contratos a empresas EFOS (histórico + reciente)</div>
          <h2 className="text-[22px] font-semibold mb-6">
            {top.length} contratos con mayor monto al cruzar SAT × ComprasMX
          </h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-[13px] min-w-[800px]">
              <thead className="border-b border-cloud-whisper/15 text-light-ash">
                <tr>
                  <th className="text-left py-3 pr-3">Proveedor</th>
                  <th className="text-right py-3 pr-3">Monto</th>
                  <th className="text-left py-3 pr-3">Año</th>
                  <th className="text-left py-3 pr-3">Mod.</th>
                  <th className="text-left py-3 pr-3">Ramo</th>
                  <th className="text-left py-3">Fuente</th>
                </tr>
              </thead>
              <tbody className="text-cloud-whisper">
                {top.map((c, i) => (
                  <tr
                    key={`${c.contrato_id}-${i}`}
                    className="border-b border-cloud-whisper/8 hover:bg-cloud-whisper/[0.03]"
                  >
                    <td className="py-3 pr-3 max-w-[260px] truncate" title={c.proveedor}>
                      {c.proveedor}
                    </td>
                    <td className="py-3 pr-3 text-right tabular">
                      {fmtMonto(c.monto)}
                    </td>
                    <td className="py-3 pr-3 tabular text-light-ash">{c.ano}</td>
                    <td className="py-3 pr-3 text-light-ash">{c.modalidad}</td>
                    <td
                      className="py-3 pr-3 text-light-ash text-[12px] max-w-[180px] truncate"
                      title={c.ramo}
                    >
                      {c.ramo}
                    </td>
                    <td className="py-3 text-[11px] text-ash-accent">{c.fuente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
