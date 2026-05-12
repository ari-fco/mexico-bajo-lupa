import type { Metadata } from "next";
import { HistoricoView } from "@/components/historico-view";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Histórico CompraNet 2010-2022",
  description:
    "Doce años de compras públicas federales: 2.36 millones de contratos del archivo CompraNet 5.0, evolución del % adjudicación directa por sexenio (FCH, EPN, AMLO), top 50 proveedores recurrentes y Benford anual.",
  openGraph: {
    title: "Histórico CompraNet · México Bajo Lupa",
    description:
      "12 años de compras públicas federales. Cómo evolucionó la adjudicación directa entre sexenios y qué proveedores se sostuvieron a través del tiempo.",
  },
};

export default function HistoricoPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-center gap-3 mb-5">
            <Badge variant="lozenge">V4 · Histórico</Badge>
            <Badge variant="lozenge">CompraNet 5.0 · 2010-2022</Badge>
          </div>
          <h1
            className="display-xl leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            12 años bajo lupa.
          </h1>
          <p className="text-light-ash text-[16px] mt-6 max-w-3xl leading-relaxed">
            <strong className="text-cloud-whisper">2,356,609 contratos</strong>{" "}
            del sistema histórico CompraNet 5.0, hoy archivado. Permite
            comparar cómo evolucionó el % de adjudicación directa entre
            sexenios y qué proveedores se sostuvieron a lo largo de la
            transición política.
          </p>
        </div>
      </section>

      <HistoricoView />

      <section className="border-t border-cloud-whisper/8 py-12">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid md:grid-cols-2 gap-10">
          <div>
            <div className="eyebrow mb-3">Limitaciones del histórico</div>
            <p className="text-[14px] text-light-ash leading-relaxed">
              CompraNet 5.0 (legacy) tiene menos campos que el sistema
              moderno: <strong className="text-cloud-whisper">no incluye</strong>{" "}
              el ramo presupuestal ni el RFC del proveedor, así que no
              podemos cruzar con ramos federales ni con la lista EFOS del SAT
              en este dataset. La cobertura sólida va de 2011 a 2022.
            </p>
          </div>
          <div>
            <div className="eyebrow mb-3">Continuidad con el actual</div>
            <p className="text-[14px] text-light-ash leading-relaxed">
              Para datos 2024-2025 con ramo, RFC y desglose Federal/Estatal,
              ver{" "}
              <a
                href="/anomalias"
                className="text-cloud-whisper underline decoration-1 underline-offset-4"
              >
                /anomalias
              </a>
              . El histórico complementa con perspectiva temporal lo que el
              dataset moderno ofrece con granularidad.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
