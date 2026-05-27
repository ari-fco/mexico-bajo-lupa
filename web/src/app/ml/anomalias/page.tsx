import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { qMlAnomalias, qMlMeta } from "@/lib/ml-queries";
import { fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)} K`;
  return `$${fmtInt(n)}`;
}

export const metadata: Metadata = {
  title: "Anomalías robustas · ML",
  description:
    "Contratos detectados por múltiples métodos de ML no supervisado: Isolation Forest, LOF, MAD, DBSCAN, EFOS. 123 contratos con ≥2 señales en el dataset reciente (2024-2025).",
};

export default function MlAnomaliasPage() {
  const anomalias = qMlAnomalias();
  const meta = qMlMeta();

  const con3 = anomalias.filter((a) => a.n_flags >= 3);
  const con2 = anomalias.filter((a) => a.n_flags === 2);

  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Link href="/ml" className="text-[13px] text-ash-accent hover:text-cloud-whisper">
            ← ML investigación
          </Link>
          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <Badge variant="lozenge">Reciente 2024-25</Badge>
            <Badge variant="lozenge">Multi-señal</Badge>
            <Badge variant="lozenge">{fmtInt(meta.anomalias_robustas_reciente.n_total)} contratos</Badge>
          </div>
          <h1 className="display-xl leading-[0.95] tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Anomalías robustas
          </h1>
          <p className="text-light-ash text-[15px] mt-4 max-w-3xl leading-relaxed">
            Contratos marcados por <strong className="text-cloud-whisper">al menos 2 técnicas de ML independientes</strong>
            : Isolation Forest, Local Outlier Factor, MAD sobre log(monto), DBSCAN, y cruce con
            EFOS. Cuantas más señales convergen, mayor el indicio.{" "}
            <em>No es prueba de fraude</em> — es señal para investigar.
          </p>
        </div>
      </section>

      {/* Top con 3 flags */}
      <section className="py-10 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Tier crítico — 3 señales simultáneas</div>
          <h2 className="text-[22px] font-semibold mb-6">
            {con3.length} contratos con la triple convergencia
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {con3.map((c) => (
              <div
                key={c.contrato_id}
                className="border border-cloud-whisper/10 rounded-card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-[13px] text-light-ash">{c.institucion}</div>
                  <Badge variant="lozenge">{c.modalidad}</Badge>
                </div>
                <div className="text-[18px] font-semibold leading-tight mb-1">
                  {c.proveedor}
                </div>
                <div className="display text-[28px] tabular leading-none mt-3">
                  {fmtMonto(c.monto)} <span className="text-[14px] text-light-ash font-normal">MXN</span>
                </div>
                <div className="text-[12px] text-light-ash mt-2">
                  {c.descripcion?.slice(0, 140)}
                  {c.descripcion && c.descripcion.length > 140 ? "…" : ""}
                </div>
                <div className="flex flex-wrap gap-1 mt-4">
                  {c.flag_monto_extremo && <Badge variant="lozenge">monto extremo</Badge>}
                  {c.flag_isoforest && <Badge variant="lozenge">isoforest</Badge>}
                  {c.flag_lof && <Badge variant="lozenge">LOF</Badge>}
                  {c.flag_dbscan_noise && <Badge variant="lozenge">DBSCAN noise</Badge>}
                  {c.flag_efos && <Badge variant="lozenge">EFOS</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top con 2 flags por monto */}
      <section className="py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">2 señales — top por monto</div>
          <h2 className="text-[22px] font-semibold mb-6">
            {con2.length} contratos adicionales con doble convergencia
          </h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-[13px] min-w-[800px]">
              <thead className="border-b border-cloud-whisper/15 text-light-ash">
                <tr>
                  <th className="text-left py-3 pr-3">Proveedor</th>
                  <th className="text-left py-3 pr-3">Institución</th>
                  <th className="text-right py-3 pr-3">Monto MXN</th>
                  <th className="text-left py-3 pr-3">Mod.</th>
                  <th className="text-left py-3">Señales</th>
                </tr>
              </thead>
              <tbody className="text-cloud-whisper">
                {con2.slice(0, 50).map((c) => (
                  <tr
                    key={c.contrato_id}
                    className="border-b border-cloud-whisper/8 hover:bg-cloud-whisper/[0.03]"
                  >
                    <td className="py-3 pr-3 max-w-[240px] truncate" title={c.proveedor}>
                      {c.proveedor}
                    </td>
                    <td className="py-3 pr-3 text-light-ash text-[12px] max-w-[200px] truncate" title={c.institucion ?? ""}>
                      {c.institucion}
                    </td>
                    <td className="py-3 pr-3 text-right tabular">
                      {fmtMonto(c.monto)}
                    </td>
                    <td className="py-3 pr-3 text-light-ash">{c.modalidad}</td>
                    <td className="py-3 text-[11px] text-ash-accent">
                      {[
                        c.flag_monto_extremo && "MAD",
                        c.flag_isoforest && "IF",
                        c.flag_lof && "LOF",
                        c.flag_dbscan_noise && "DBSCAN",
                        c.flag_efos && "EFOS",
                      ].filter(Boolean).join(" · ")}
                    </td>
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
