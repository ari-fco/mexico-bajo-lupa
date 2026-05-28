import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FlagBadge } from "@/components/ui/flag-badge";
import { qMlAnomaliasHistorico, qMlMeta } from "@/lib/ml-queries";
import { fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)} K`;
  return `$${fmtInt(n)}`;
}

export const metadata: Metadata = {
  title: "Anomalías históricas · 8 señales · ML",
  description:
    "Pipeline ML completo sobre 2.35M contratos federales 2010-2024. 8 señales independientes incluyendo cruce EFOS por nombre normalizado y patrones post-presunción.",
};

export default function MlHistoricoPage() {
  const anomalias = qMlAnomaliasHistorico();
  const meta = qMlMeta();
  const con5 = anomalias.filter((a) => a.n_flags >= 5);
  const con4 = anomalias.filter((a) => a.n_flags === 4);

  const flagLabels: Record<string, string> = {
    flag_monto_extremo: "monto",
    flag_isoforest: "IF",
    flag_lof: "LOF",
    flag_efos_nombre: "EFOS",
    flag_post_presuncion: "post-EFOS",
    flag_proveedor_alto_score: "score prov.",
    flag_benford_anomalo: "Benford",
    flag_temporal_jump: "jump temporal",
  };

  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Link href="/ml" className="text-[13px] text-ash-accent hover:text-cloud-whisper">
            ← ML investigación
          </Link>
          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <Badge variant="lozenge">Histórico 2010-2024</Badge>
            <Badge variant="lozenge">8 señales</Badge>
            <Badge variant="lozenge">2.35M contratos</Badge>
          </div>
          <h1 className="display-xl leading-[0.95] tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Anomalías históricas
          </h1>
          <p className="text-light-ash text-[15px] mt-4 max-w-3xl leading-relaxed">
            Pipeline ampliado al histórico: 8 señales independientes incluyendo cruce EFOS
            por nombre normalizado y patrones post-presunción. <strong className="text-cloud-whisper">{fmtInt(meta.anomalias_robustas_historico.n_5_flags)} contratos</strong> tienen <em>cinco señales encendidas</em>.
          </p>
        </div>
      </section>

      <section className="py-10 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">Tier máximo — 5 señales</div>
          <h2 className="text-[22px] font-semibold mb-6">
            Los {con5.length} contratos con todas las banderas encendidas
          </h2>
          <div className="space-y-3">
            {con5.map((c) => (
              <div
                key={c.contrato_id}
                className="border border-cloud-whisper/10 rounded-card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-[13px] text-light-ash">
                    {c.ano} · {c.ramo} · {c.modalidad}
                  </div>
                  <div className="display text-[22px] tabular">
                    {fmtMonto(c.monto)}
                  </div>
                </div>
                <div className="text-[17px] font-semibold leading-tight mb-2">
                  {c.proveedor}
                </div>
                <div className="text-[12px] text-light-ash mb-3">
                  {c.descripcion?.slice(0, 160)}
                  {c.descripcion && c.descripcion.length > 160 ? "…" : ""}
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(flagLabels).map(([key, lbl]) =>
                    (c as unknown as Record<string, boolean>)[key] ? (
                      <FlagBadge key={key} flag={lbl} />
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">4 señales</div>
          <h2 className="text-[22px] font-semibold mb-6">
            {con4.length} contratos con 4 señales — top por monto
          </h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-[13px] min-w-[800px]">
              <thead className="border-b border-cloud-whisper/15 text-light-ash">
                <tr>
                  <th className="text-left py-3 pr-3">Proveedor</th>
                  <th className="text-left py-3 pr-3">Año</th>
                  <th className="text-left py-3 pr-3">Mod.</th>
                  <th className="text-right py-3 pr-3">Monto</th>
                  <th className="text-left py-3">Señales</th>
                </tr>
              </thead>
              <tbody className="text-cloud-whisper">
                {con4.slice(0, 30).map((c) => (
                  <tr
                    key={c.contrato_id}
                    className="border-b border-cloud-whisper/8 hover:bg-cloud-whisper/[0.03]"
                  >
                    <td className="py-3 pr-3 max-w-[260px] truncate" title={c.proveedor}>
                      {c.proveedor}
                    </td>
                    <td className="py-3 pr-3 tabular">{c.ano}</td>
                    <td className="py-3 pr-3 text-light-ash">{c.modalidad}</td>
                    <td className="py-3 pr-3 text-right tabular">
                      {fmtMonto(c.monto)}
                    </td>
                    <td className="py-3 text-[11px] text-ash-accent">
                      {Object.entries(flagLabels)
                        .filter(([key]) =>
                          (c as unknown as Record<string, boolean>)[key],
                        )
                        .map(([, lbl]) => lbl)
                        .join(" · ")}
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
