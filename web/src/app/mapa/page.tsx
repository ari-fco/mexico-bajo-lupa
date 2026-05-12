import type { Metadata } from "next";
import { MapaExplorer } from "@/components/mapa-explorer";

export const metadata: Metadata = {
  title: "Mapa interactivo",
  description:
    "Explorador de México: incidencia delictiva, riesgo compuesto, PIB per cápita, pobreza y gasto federalizado por estado. 7 métricas reales sobre 32 entidades.",
};

export default function MapaPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">Explorador</div>
          <h1
            className="display tracking-tight max-w-3xl"
            style={{ fontSize: "clamp(2rem, 5.5vw, 3.625rem)" }}
          >
            32 estados. Múltiples lecturas.
          </h1>
          <p className="text-light-ash text-[15px] mt-4 max-w-2xl leading-relaxed">
            Cambia la métrica para reescribir el mapa. Pasa el cursor sobre un
            estado (o tocá en mobile) para ver los números. Da click para
            abrir el dossier completo.
          </p>
        </div>
      </section>
      <MapaExplorer />
    </div>
  );
}
