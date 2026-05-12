"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { qEstadoMetrics } from "@/lib/queries";
import { ESTADOS_BY_CVE } from "@/lib/estados";
import { fmtDec } from "@/lib/format";

const MexicoMap = dynamic(
  () => import("./mexico-map").then((m) => m.MexicoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full bg-midnight-void grid place-items-center text-ash-accent text-[12px]">
        <div className="shimmer h-2 w-32 rounded-pill" />
      </div>
    ),
  },
);

export function HomeMapPreview() {
  const metrics = React.useMemo(() => qEstadoMetrics(), []);
  const values = React.useMemo(
    () =>
      metrics.map((m) => ({
        cve_ent: m.cve_ent,
        value: m.homicidios_100k_ult12m,
      })),
    [metrics],
  );
  const [hovered, setHovered] = React.useState<string | null>(null);
  const hoveredEstado = hovered ? ESTADOS_BY_CVE[hovered] : null;
  const hoveredMetric = hovered
    ? metrics.find((m) => m.cve_ent === hovered)
    : null;

  return (
    <div className="relative">
      <MexicoMap
        values={values}
        metricLabel="Homicidios dolosos · por 100k hab. (últ. 12m)"
        formatValue={(n) => fmtDec(n)}
        className="h-[360px] sm:h-[440px] md:h-[520px]"
        onHover={setHovered}
        colorStops={[
          [0, "#1a1a1a"],
          [20, "#3a1a1a"],
          [40, "#5e1f1f"],
          [60, "#8a2828"],
          [80, "#b4332f"],
          [100, "#d8443a"],
        ]}
      />
      <div className="hidden sm:block absolute top-4 right-4 z-10 rounded-card bg-midnight-void/90 backdrop-blur border border-cloud-whisper/10 px-5 py-4 min-w-[230px] max-w-[260px] text-[12px]">
        {hoveredEstado && hoveredMetric ? (
          <>
            <div className="eyebrow mb-2 text-[9px]">Hover</div>
            <div className="display text-[20px] mb-1 leading-tight">
              {hoveredEstado.nombre}
            </div>
            <div className="text-cloud-whisper tabular text-[18px] mt-1">
              {fmtDec(hoveredMetric.homicidios_100k_ult12m)}
              <span className="text-ash-accent text-[11px] ml-1">
                hom./100k hab.
              </span>
            </div>
            <div className="text-ash-accent text-[11px] mt-2">
              Percentil nacional:{" "}
              <span className="text-cloud-whisper tabular">
                {fmtDec(hoveredMetric.riesgo)}/100
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow mb-2 text-[9px]">Lectura</div>
            <div className="display text-[16px] mb-1">
              Pasa el cursor sobre un estado
            </div>
            <div className="text-ash-accent">
              Homicidios dolosos · últimos 12 meses publicados por SESNSP,
              normalizados por habitantes (CONAPO).
            </div>
          </>
        )}
      </div>
    </div>
  );
}
