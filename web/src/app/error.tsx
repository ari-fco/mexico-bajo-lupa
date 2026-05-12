"use client";

import * as React from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // En producción, esto debería enviar a un servicio de error tracking.
    // En dev solo lo logueamos para inspección.
    console.error("Error boundary capturó:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-24 md:py-32">
      <div className="text-center max-w-xl px-6">
        <div className="eyebrow mb-4">Error</div>
        <h1
          className="display-xl leading-[0.95] mb-6 text-balance"
          style={{ fontSize: "clamp(2.25rem, 8vw, 5rem)" }}
        >
          Algo se rompió.
        </h1>
        <p className="text-light-ash text-[15px] mb-3 leading-relaxed">
          Pasó algo inesperado renderizando esta vista. No es tu culpa.
        </p>
        {error.digest && (
          <p className="text-[11px] text-ash-accent mb-10 font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button onClick={() => reset()} variant="primary" size="lg">
            Reintentar
          </Button>
          <ButtonLink href="/" variant="ghost" size="lg">
            Volver al inicio
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
