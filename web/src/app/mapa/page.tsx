import type { Metadata } from "next";
import { MapaExplorer } from "@/components/mapa-explorer";

export const metadata: Metadata = {
  title: "Mapa interactivo",
  description:
    "Explorador choropleth de México con 7 métricas activas: homicidios por 100k, Δ interanual, PIB per cápita, pobreza multidimensional, gasto federalizado per cápita y adjudicación directa estatal sobre las 32 entidades.",
  openGraph: {
    title: "Mapa interactivo · México Bajo Lupa",
    description:
      "32 estados, 7 métricas oficiales cruzadas. Pasá el cursor por cualquier entidad para ver su lectura forense completa.",
  },
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
