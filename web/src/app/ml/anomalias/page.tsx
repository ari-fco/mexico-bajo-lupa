import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FlagBadge } from "@/components/ui/flag-badge";
import { MlAnomaliasTable } from "@/components/ml-anomalias-table";
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

      {/* Tier 3: separamos por relevancia editorial. Los outliers
          estadísticos sobre contratos chicos (<100M) son válidos como
          señal técnica pero no como hallazgo editorial. */}
      {(() => {
        const UMBRAL_RELEVANCIA = 100_000_000;
        const tier3Grandes = con3
          .filter((c) => c.monto >= UMBRAL_RELEVANCIA)
          .sort((a, b) => b.monto - a.monto);
        const tier3Chicos = con3
          .filter((c) => c.monto < UMBRAL_RELEVANCIA)
          .sort((a, b) => b.monto - a.monto);

        const renderCard = (c: typeof con3[number]) => (
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
              {fmtMonto(c.monto)}{" "}
              <span className="text-[14px] text-light-ash font-normal">MXN</span>
            </div>
            <div className="text-[12px] text-light-ash mt-2">
              {c.descripcion?.slice(0, 140)}
              {c.descripcion && c.descripcion.length > 140 ? "…" : ""}
            </div>
            <div className="flex flex-wrap gap-1 mt-4">
              {c.flag_monto_extremo && <FlagBadge flag="monto extremo" />}
              {c.flag_isoforest && <FlagBadge flag="isoforest" />}
              {c.flag_lof && <FlagBadge flag="LOF" />}
              {c.flag_dbscan_noise && <FlagBadge flag="DBSCAN noise" />}
              {c.flag_efos && <FlagBadge flag="EFOS" />}
            </div>
          </div>
        );

        return (
          <section className="py-10 border-b border-cloud-whisper/8">
            <div className="mx-auto max-w-[1400px] px-6 md:px-10">
              <div className="eyebrow mb-2">Tier crítico — 3 señales simultáneas</div>
              <h2 className="text-[22px] font-semibold mb-2">
                {con3.length} contratos con la triple convergencia
              </h2>
              <p className="text-[13px] text-light-ash mb-6 max-w-3xl">
                Detectados por Isolation Forest <em>y</em> LOF <em>y</em> una
                tercera técnica (MAD, DBSCAN o EFOS). Los separamos por
                relevancia editorial: el monto importa para priorizar la
                investigación.
              </p>

              {tier3Grandes.length > 0 && (
                <>
                  <div className="eyebrow text-ash-accent mb-3 text-[10px]">
                    Mayor relevancia (monto ≥ $100M MXN)
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {tier3Grandes.map(renderCard)}
                  </div>
                </>
              )}

              {tier3Chicos.length > 0 && (
                <>
                  <div className="eyebrow text-ash-accent mb-3 text-[10px]">
                    Outliers estadísticos · monto menor
                  </div>
                  <div className="bg-cloud-whisper/[0.03] border border-cloud-whisper/8 rounded-card p-4 mb-4">
                    <p className="text-[12px] text-light-ash leading-relaxed">
                      Los siguientes contratos también disparan tres señales,
                      pero son <strong className="text-cloud-whisper">pequeños en monto</strong>.
                      El ML los detecta como atípicos estadísticamente
                      (descripción, modalidad o frecuencia poco común), no
                      necesariamente como hallazgo editorial. Quedan acá para
                      no esconder data.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {tier3Chicos.map(renderCard)}
                  </div>
                </>
              )}
            </div>
          </section>
        );
      })()}

      {/* Top con 2 flags por monto */}
      <section className="py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-2">2 señales — buscador y filtros</div>
          <h2 className="text-[22px] font-semibold mb-6">
            {con2.length} contratos adicionales con doble convergencia
          </h2>
          <MlAnomaliasTable rows={con2} />
        </div>
      </section>
    </div>
  );
}
