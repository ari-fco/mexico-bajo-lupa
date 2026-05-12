"use client";

// Lista para integrar en /, /anomalias o /historico cuando los otros agentes terminen.
// Usage: <AnomaliasDestacadas />
//
// Banda editorial rotativa de hallazgos verificados de México Bajo Lupa.
// - Índice inicial determinístico por día (new Date().getDay()) → cambia solo.
// - Auto-rotación cada 8s, pausable on hover/focus.
// - Navegación manual con prev/next y dots.
// - Respeta prefers-reduced-motion: sin auto-rotate, sin transition.

import * as React from "react";
import { HALLAZGOS, type Hallazgo } from "@/lib/anomalias-destacadas";
import { Badge } from "@/components/ui/badge";

const ROTATE_MS = 8000;

function badgeVariant(intensidad: Hallazgo["intensidad"]) {
  return intensidad; // "alert" | "warn" | "good" — ya son variantes válidas del Badge
}

function dotClass(intensidad: Hallazgo["intensidad"], active: boolean) {
  if (!active) return "bg-cloud-whisper/20 hover:bg-cloud-whisper/40";
  if (intensidad === "alert") return "bg-signal-alert";
  if (intensidad === "warn") return "bg-signal-warn";
  return "bg-signal-good";
}

function cifraColor(intensidad: Hallazgo["intensidad"]) {
  if (intensidad === "alert") return "text-signal-alert";
  if (intensidad === "warn") return "text-signal-warn";
  return "text-signal-good";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

export function AnomaliasDestacadas() {
  const total = HALLAZGOS.length;

  // Empezamos en 0 para evitar hydration mismatch (server/cliente pueden estar
  // en distinto día por timezone). En el primer effect saltamos al índice del
  // día — la rotación diaria sigue siendo automática y "gratis".
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [fadeKey, setFadeKey] = React.useState(0);
  const reducedMotion = usePrefersReducedMotion();

  // Sembrado diario, post-mount (hydration-safe).
  React.useEffect(() => {
    if (total === 0) return;
    setIdx(new Date().getDay() % total);
    // sólo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-rotate
  React.useEffect(() => {
    if (paused || reducedMotion || total <= 1) return;
    const id = window.setInterval(() => {
      setIdx((cur) => (cur + 1) % total);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, total]);

  // Trigger fade when idx changes
  React.useEffect(() => {
    setFadeKey(idx);
  }, [idx]);

  if (total === 0) return null;

  const h = HALLAZGOS[idx];

  const goPrev = () => setIdx((cur) => (cur - 1 + total) % total);
  const goNext = () => setIdx((cur) => (cur + 1) % total);

  return (
    <section
      aria-label="Anomalías destacadas"
      className="relative rounded-card border border-cloud-whisper/10 bg-cloud-whisper/3 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Header band */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <Badge variant={badgeVariant(h.intensidad)}>{h.tag}</Badge>
          <span className="eyebrow">Anomalía destacada</span>
        </div>
        <div className="text-[11px] text-ash-accent tabular">
          {String(idx + 1).padStart(2, "0")}
          <span className="text-cloud-whisper/30"> / </span>
          {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Body — fade-in keyed by idx so each rotation animates */}
      <div
        key={fadeKey}
        className={reducedMotion ? "" : "fade-in"}
        aria-live="polite"
      >
        <div className="grid md:grid-cols-12 gap-6 md:gap-10 px-6 md:px-8 py-6 md:py-8">
          {/* Cifra */}
          <div className="md:col-span-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-cloud-whisper/8 pb-6 md:pb-0 md:pr-8">
            <div
              className={`display tabular leading-none ${cifraColor(h.intensidad)}`}
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              {h.cifra}
            </div>
            <div className="eyebrow mt-3">{h.cifra_label}</div>
          </div>

          {/* Texto */}
          <div className="md:col-span-8 flex flex-col justify-center">
            <h3
              className="display tracking-tight text-cloud-whisper"
              style={{ fontSize: "clamp(1.5rem, 2.6vw, 2rem)" }}
            >
              {h.titular}
            </h3>
            <p className="mt-4 text-[14px] leading-relaxed text-light-ash max-w-2xl">
              {h.body}
            </p>
            <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-[11px] text-ash-accent">
                Fuente: <span className="text-light-ash">{h.fuente}</span>
              </span>
              {h.link && (
                <a
                  href={h.link}
                  className="text-[12px] text-cloud-whisper hover:text-slate-dust underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void rounded"
                >
                  Ver detalle →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 border-t border-cloud-whisper/8 px-6 md:px-8 py-4">
        <div className="flex items-center gap-2" role="tablist" aria-label="Navegar hallazgos">
          {HALLAZGOS.map((d, i) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Hallazgo ${i + 1}: ${d.titular}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-pill transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void ${
                i === idx ? "w-6" : "w-1.5"
              } ${dotClass(d.intensidad, i === idx)}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Hallazgo anterior"
            className="h-8 w-8 inline-flex items-center justify-center rounded-pill border border-cloud-whisper/15 text-light-ash hover:text-cloud-whisper hover:border-cloud-whisper/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Hallazgo siguiente"
            className="h-8 w-8 inline-flex items-center justify-center rounded-pill border border-cloud-whisper/15 text-light-ash hover:text-cloud-whisper hover:border-cloud-whisper/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void"
          >
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
