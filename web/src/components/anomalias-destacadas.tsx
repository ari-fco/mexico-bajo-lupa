"use client";

import * as React from "react";
import { HALLAZGOS, type Hallazgo } from "@/lib/anomalias-destacadas";
import { Badge } from "@/components/ui/badge";

const ROTATE_MS = 8000;

function badgeVariant(intensidad: Hallazgo["intensidad"]) {
  return intensidad;
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

function subscribeReducedMotion(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function subscribeDailyIndex(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  cb();
  return () => {};
}

function getDailySnapshot(total: number): number {
  if (total <= 0) return 0;
  if (typeof window === "undefined") return 0;
  return new Date().getDay() % total;
}

function useDailySeed(total: number): number {
  return React.useSyncExternalStore(
    subscribeDailyIndex,
    () => getDailySnapshot(total),
    () => 0,
  );
}

export function AnomaliasDestacadas() {
  const total = HALLAZGOS.length;
  const reducedMotion = usePrefersReducedMotion();
  const dailySeed = useDailySeed(total);

  const [manualIdx, setManualIdx] = React.useState<number | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (paused || reducedMotion || total <= 1 || manualIdx !== null) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, total, manualIdx]);

  if (total === 0) return null;

  const idx =
    manualIdx !== null ? manualIdx : (dailySeed + tick) % total;

  const h = HALLAZGOS[idx];

  const goPrev = () => setManualIdx((idx - 1 + total) % total);
  const goNext = () => setManualIdx((idx + 1) % total);

  return (
    <section
      aria-label="Anomalías destacadas"
      className="relative rounded-card border border-cloud-whisper/10 bg-cloud-whisper/3 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
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

      <div
        key={idx}
        className={reducedMotion ? "" : "fade-in"}
        aria-live="polite"
      >
        <div className="grid md:grid-cols-12 gap-6 md:gap-10 px-6 md:px-8 py-6 md:py-8">
          <div className="md:col-span-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-cloud-whisper/8 pb-6 md:pb-0 md:pr-8">
            <div
              className={`display tabular leading-none ${cifraColor(h.intensidad)}`}
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              {h.cifra}
            </div>
            <div className="eyebrow mt-3">{h.cifra_label}</div>
          </div>

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

      <div className="flex items-center justify-between gap-4 border-t border-cloud-whisper/8 px-6 md:px-8 py-4">
        <div className="flex items-center gap-2" role="tablist" aria-label="Navegar hallazgos">
          {HALLAZGOS.map((d, i) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Hallazgo ${i + 1}: ${d.titular}`}
              onClick={() => setManualIdx(i)}
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
