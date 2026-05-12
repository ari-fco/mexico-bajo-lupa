"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";

const NAV = [
  { href: "/mapa", label: "Mapa" },
  { href: "/anomalias", label: "Anomalías" },
  { href: "/efos", label: "EFOS" },
  { href: "/historico", label: "Histórico" },
  { href: "/compara", label: "Comparar" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/fuentes", label: "Fuentes" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onMapa = pathname === "/mapa";
  const [open, setOpen] = React.useState(false);
  const [lastPath, setLastPath] = React.useState(pathname);

  // Close drawer when route changes — adjust state during render
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Bloquear scroll del body cuando el drawer está abierto
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Cerrar con tecla Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-pill focus:bg-cloud-whisper focus:text-midnight-void focus:text-[12px]"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-midnight-void/70 border-b border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group"
            aria-label="México Bajo Lupa — inicio"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-cloud-whisper group-hover:scale-125 transition-transform" />
            <span className="display text-[16px] sm:text-[18px] tracking-tight">
              México Bajo Lupa
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-[13px] transition-colors ${
                    active
                      ? "text-cloud-whisper"
                      : "text-light-ash hover:text-cloud-whisper"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              {onMapa ? (
                <ButtonLink href="/anomalias" variant="primary" size="sm">
                  Ver anomalías
                </ButtonLink>
              ) : (
                <ButtonLink href="/mapa" variant="primary" size="sm">
                  Abrir mapa
                </ButtonLink>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-pill border border-cloud-whisper/15 text-cloud-whisper hover:bg-cloud-whisper/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30"
            >
              <span className="sr-only">{open ? "Cerrar" : "Menú"}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                {open ? (
                  <>
                    <path d="M6 6L18 18" />
                    <path d="M6 18L18 6" />
                  </>
                ) : (
                  <>
                    <path d="M4 7H20" />
                    <path d="M4 12H20" />
                    <path d="M4 17H20" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-midnight-void/70 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navegación principal"
            className="fixed top-16 left-0 right-0 z-40 md:hidden bg-midnight-void border-b border-cloud-whisper/10 fade-in"
          >
            <nav className="mx-auto max-w-[1400px] px-6 py-6 flex flex-col">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between py-4 border-b border-cloud-whisper/8 text-[18px] tracking-tight transition-colors ${
                      active
                        ? "text-cloud-whisper"
                        : "text-light-ash hover:text-cloud-whisper"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-ash-accent text-[14px]" aria-hidden>
                      →
                    </span>
                  </Link>
                );
              })}
              <div className="pt-6 flex flex-col gap-3">
                {onMapa ? (
                  <ButtonLink href="/anomalias" variant="primary" size="md">
                    Ver anomalías
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/mapa" variant="primary" size="md">
                    Abrir mapa
                  </ButtonLink>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
