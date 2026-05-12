import type { Metadata } from "next";
import { EfosView } from "@/components/efos-view";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "EFOS · Empresas señaladas que reciben contratos federales",
  description:
    "Cruce de la lista oficial del SAT (Art. 69-B CFF, 14,234 contribuyentes) con los proveedores reales de ComprasMX federal. Empresas que facturan operaciones simuladas y aún así firman con el Estado mexicano — incluyendo contratos posteriores a la presunción.",
  openGraph: {
    title: "EFOS · SAT × ComprasMX · México Bajo Lupa",
    description:
      "Empresas señaladas por el SAT que mantienen contratos federales. El cruce que ni el SAT ni la SFP publican lado a lado.",
  },
};

export default function EfosPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <Badge variant="lozenge">Cruce SAT × ComprasMX</Badge>
            <Badge variant="lozenge">Art. 69-B CFF</Badge>
            <Badge variant="lozenge">ComprasMX 2024–2025</Badge>
          </div>
          <h1
            className="display-xl leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            Empresas señaladas
            <br />
            <span className="text-ash-accent">
              que siguen recibiendo contratos.
            </span>
          </h1>
          <p className="text-light-ash text-[16px] mt-6 max-w-3xl leading-relaxed">
            El SAT publica trimestralmente la lista de{" "}
            <strong className="text-cloud-whisper">EFOS</strong> — Empresas
            que Facturan Operaciones Simuladas — bajo el Art. 69-B del CFF.
            Cruzamos esa lista con los proveedores reales de ComprasMX
            federal. La pregunta editorial:{" "}
            <em>¿qué dependencias contratan, y por qué, con RFCs que el SAT ya señaló?</em>
          </p>
        </div>
      </section>

      <EfosView />
    </div>
  );
}
