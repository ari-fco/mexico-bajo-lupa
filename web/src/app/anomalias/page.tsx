import type { Metadata } from "next";
import { AnomaliasView } from "@/components/anomalias-view";
import { Badge } from "@/components/ui/badge";
import { qDependenciasRiesgo } from "@/lib/queries";
import { COMPRASMX_N } from "@/lib/data-meta";
import { fmtCompact } from "@/lib/format";

// Short alias para no romper el SEO description si una institución
// se llama "INSTITUTO NACIONAL DE BELLAS ARTES Y LITERATURA" entera.
const SHORT_ALIAS: Record<string, string> = {
  "FONDO NACIONAL PARA EL FOMENTO DE LAS ARTESANÍAS": "FONART",
  "SISTEMA PUBLICO DE RADIODIFUSION DEL ESTADO MEXICANO":
    "Sistema Público de Radiodifusión",
  "INSTITUTO DE ADMINISTRACION Y AVALUOS DE BIENES NACIONALES":
    "INDAABIN",
};

function shortName(s: string): string {
  return SHORT_ALIAS[s] ?? s;
}

export function generateMetadata(): Metadata {
  const top3 = qDependenciasRiesgo()
    .slice(0, 3)
    .map((d) => shortName(d.dependencia))
    .join(", ");
  const n = fmtCompact(COMPRASMX_N);
  return {
    title: "Anomalías · Análisis Benford",
    description: `Test forense de Benford sobre ${n} contratos federales mexicanos. 200+ dependencias APF rankeadas por MAD de Nigrini, filtrables por ramo. Las que más se alejan del corredor estadístico esperado.`,
    openGraph: {
      title: "Anomalías Benford · México Bajo Lupa",
      description: `200+ dependencias federales rankeadas por desviación de Benford. ${top3} encabezan el riesgo.`,
    },
  };
}

export default function AnomaliasPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-center gap-3 mb-5">
            <Badge variant="lozenge">Forense</Badge>
            <Badge variant="lozenge">ComprasMX 2024–2025</Badge>
          </div>
          <h1
            className="display-xl leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            Anomalías
            <br />
            <span className="text-ash-accent">en compras públicas.</span>
          </h1>
          <p className="text-light-ash text-[16px] mt-6 max-w-3xl leading-relaxed">
            Aplicamos la <strong className="text-cloud-whisper">Ley de Benford</strong> sobre el
            primer dígito de los montos contractuales. Donde la distribución observada se
            aleja de la esperada, levantamos una bandera. <em>No es prueba de fraude</em> —
            es señal para que alguien con autoridad investigue.
          </p>
        </div>
      </section>

      <AnomaliasView />

      <section className="border-t border-cloud-whisper/8 py-12">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid md:grid-cols-2 gap-10">
          <div>
            <div className="eyebrow mb-3">Lo que la ley dice</div>
            <p className="text-[14px] text-light-ash leading-relaxed">
              En conjuntos numéricos de origen natural — facturas, poblaciones,
              transacciones — el primer dígito no se distribuye uniformemente.
              El 1 aparece ~30% del tiempo; el 9, solo 4.6%. La fórmula:{" "}
              <code className="text-cloud-whisper bg-cloud-whisper/8 px-2 py-0.5 rounded">
                P(d) = log₁₀(1 + 1/d)
              </code>
              .
            </p>
          </div>
          <div>
            <div className="eyebrow mb-3">Lo que la ley NO dice</div>
            <p className="text-[14px] text-light-ash leading-relaxed">
              Que la desviación = fraude. Hay datos que no cumplen Benford:
              cuando el rango es limitado, cuando son identificadores
              asignados, o cuando el dataset es demasiado pequeño (&lt;300).
              El indicador aquí es la{" "}
              <strong className="text-cloud-whisper">MAD de Nigrini</strong> —
              estándar forense — no la prueba chi-cuadrada cruda.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
