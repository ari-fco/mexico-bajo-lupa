import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Transparencia · Pendiente de fuente integrable",
  description:
    "Por qué la sección de transparencia estatal no está activa todavía y qué se necesita para abrirla con datos oficiales.",
};

export default function TransparenciaPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <Badge variant="lozenge">V5 · Roadmap</Badge>
            <Badge variant="lozenge">Sin fuente integrable hoy</Badge>
          </div>
          <h1
            className="display-xl leading-[0.95] tracking-tight max-w-4xl"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            Transparencia estatal.
            <br />
            <span className="text-ash-accent">
              Pendiente de fuente integrable.
            </span>
          </h1>
          <p className="text-light-ash text-[16px] mt-6 max-w-3xl leading-relaxed">
            Esta página existe vacía a propósito. Preferimos un blanco honesto
            a un gráfico inventado. Acá explicamos qué iba a contener, por qué
            no está, y qué exactamente activaría su construcción.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 space-y-14">
          <div className="space-y-4">
            <div className="eyebrow">Qué iba aquí</div>
            <h2 className="display text-[28px] md:text-[36px] tracking-tight">
              Un índice de transparencia y calidad presupuestal por entidad.
            </h2>
            <p className="text-light-ash text-[15px] leading-relaxed max-w-3xl">
              La idea era cruzar tres dimensiones por estado: (1) cumplimiento
              de obligaciones publicadas en la Plataforma Nacional de
              Transparencia, (2) calidad de la información presupuestal según
              el índice IMCO BIPE / sucesor, y (3) tiempo promedio de respuesta
              a solicitudes de información pública. Tres pilares medibles, un
              ranking por entidad federativa, comparable año contra año.
            </p>
          </div>

          <div className="space-y-4">
            <div className="eyebrow">Por qué no está activa</div>
            <p className="text-light-ash text-[15px] leading-relaxed max-w-3xl">
              El{" "}
              <strong className="text-cloud-whisper">INAI fue disuelto</strong>{" "}
              en 2025 como parte de la reforma constitucional que extinguió
              órganos autónomos. La Plataforma Nacional de Transparencia sigue
              en línea bajo administración transitoria, pero los datasets
              históricos quedaron fragmentados y la API pública dejó de
              recibir mantenimiento. El{" "}
              <strong className="text-cloud-whisper">IMCO BIPE</strong>{" "}
              (Barómetro de Información Presupuestal Estatal) tiene la última
              edición publicada disponible en PDF, sin dataset abierto
              estructurado.
            </p>
            <p className="text-light-ash text-[15px] leading-relaxed max-w-3xl">
              La filosofía del proyecto es{" "}
              <strong className="text-cloud-whisper">
                trazabilidad estricta a fuente oficial
              </strong>
              . No vamos a scrappear sitios sin autorización, no vamos a
              inferir indicadores donde no existen, y no vamos a publicar
              tabulados que no podamos reproducir desde un CSV oficial. El
              costo de hacerlo mal acá es alto: si el ranking sale equivocado,
              le pegamos a estados por la razón equivocada, y le damos un
              regalo barato a los estados que efectivamente publican mal.
            </p>
          </div>

          <div className="space-y-4">
            <div className="eyebrow">Qué activaría su construcción</div>
            <ul className="text-light-ash text-[15px] leading-relaxed space-y-3 max-w-3xl">
              <li>
                ·{" "}
                <strong className="text-cloud-whisper">
                  IMCO BIPE 2026
                </strong>{" "}
                publicado como dataset estructurado (Excel o CSV) con
                puntuaciones por entidad y sub-indicador. Hay precedente: las
                ediciones 2019-2023 sí tuvieron descarga abierta. Si vuelve a
                publicarse así, el ETL se construye en horas.
              </li>
              <li>
                ·{" "}
                <strong className="text-cloud-whisper">
                  Plataforma Nacional de Transparencia
                </strong>{" "}
                con API estable bajo el órgano sucesor del INAI. Hoy la
                infraestructura técnica existe pero el endpoint de
                solicitudes-por-estado es inestable.
              </li>
              <li>
                ·{" "}
                <strong className="text-cloud-whisper">
                  Cuenta Pública SHCP
                </strong>{" "}
                con desagregado por entidad federativa en formato consistente.
                Ya está en V3 del roadmap general.
              </li>
            </ul>
          </div>

          <div className="space-y-4 border-t border-cloud-whisper/8 pt-10">
            <div className="eyebrow">Mientras tanto</div>
            <p className="text-light-ash text-[15px] leading-relaxed max-w-3xl">
              Las otras dos rutas que sí tocan el espacio &ldquo;qué tan
              limpio compra el estado&rdquo; están activas:{" "}
              <a
                href="/anomalias"
                className="text-cloud-whisper underline decoration-1 underline-offset-4 hover:text-ash-accent"
              >
                /anomalias
              </a>{" "}
              cruza Benford sobre compras federales (200+ dependencias),
              y{" "}
              <a
                href="/efos"
                className="text-cloud-whisper underline decoration-1 underline-offset-4 hover:text-ash-accent"
              >
                /efos
              </a>{" "}
              cruza la lista oficial del SAT contra ComprasMX para identificar
              proveedores señalados que todavía firman con el estado. Son
              señales forenses, no son un sustituto del índice integrado de
              transparencia — pero son evidencia reproducible disponible hoy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
