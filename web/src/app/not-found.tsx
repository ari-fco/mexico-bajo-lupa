import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

const SUGGESTIONS = [
  { href: "/mapa", label: "Mapa interactivo", hint: "7 métricas sobre 32 estados" },
  { href: "/anomalias", label: "Anomalías Benford", hint: "200+ dependencias federales" },
  { href: "/efos", label: "EFOS · SAT × ComprasMX", hint: "Empresas señaladas con contratos públicos" },
  { href: "/historico", label: "Histórico CompraNet", hint: "2.36M contratos · 12 años" },
  { href: "/compara", label: "Comparar estados", hint: "Lectura A vs B" },
  { href: "/fuentes", label: "Fuentes", hint: "De dónde viene cada cifra" },
];

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 md:py-32">
      <div className="max-w-2xl px-6 w-full">
        <div className="text-center">
          <div className="eyebrow mb-4">404</div>
          <h1
            className="display-xl leading-[0.95] mb-6 text-balance"
            style={{ fontSize: "clamp(2.5rem, 9vw, 6rem)" }}
          >
            Sin registro.
          </h1>
          <p className="text-light-ash text-[15px] mb-10 leading-relaxed max-w-md mx-auto">
            La ruta que buscás no existe. Puede ser un estado mal escrito, un
            dossier que todavía no construimos, o un enlace roto.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-16">
            <ButtonLink href="/" variant="primary" size="lg">
              Volver al inicio
            </ButtonLink>
            <ButtonLink href="/mapa" variant="ghost" size="lg">
              Ir al mapa
            </ButtonLink>
          </div>
        </div>

        <div className="border-t border-cloud-whisper/8 pt-10">
          <div className="eyebrow mb-5 text-center">Lo que sí existe</div>
          <ul className="grid sm:grid-cols-2 gap-px bg-cloud-whisper/8 rounded-card overflow-hidden border border-cloud-whisper/10">
            {SUGGESTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="block bg-midnight-void p-4 hover:bg-cloud-whisper/3 transition-colors"
                >
                  <div className="text-cloud-whisper text-[14px] font-medium">
                    {s.label}
                    <span className="text-ash-accent ml-1">→</span>
                  </div>
                  <div className="text-[11px] text-ash-accent mt-1">
                    {s.hint}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
