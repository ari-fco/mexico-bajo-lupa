import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 md:py-32">
      <div className="text-center max-w-xl px-6">
        <div className="eyebrow mb-4">404</div>
        <h1
          className="display-xl leading-[0.95] mb-6 text-balance"
          style={{ fontSize: "clamp(2.5rem, 9vw, 6rem)" }}
        >
          Sin registro.
        </h1>
        <p className="text-light-ash text-[15px] mb-10 leading-relaxed">
          La ruta que buscas no existe en este universo. Puede ser un estado
          mal escrito, un dossier que aún no construimos, o simplemente un
          enlace roto.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <ButtonLink href="/" variant="primary" size="lg">
            Volver al inicio
          </ButtonLink>
          <ButtonLink href="/mapa" variant="ghost" size="lg">
            Ir al mapa
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
