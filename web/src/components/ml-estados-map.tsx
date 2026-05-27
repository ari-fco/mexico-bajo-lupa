"use client";

import * as React from "react";
import { MexicoMap, type ChoroplethValue } from "@/components/mexico-map";
import type { MlEstadoRiesgo } from "@/lib/types";

type Props = {
  estados: MlEstadoRiesgo[];
};

// Escala roja editorial — riesgo es 0..1, lo mapeamos a 0..100 para los stops.
const RISK_STOPS: Array<[number, string]> = [
  [0, "#1a1a1a"],
  [20, "#2d1a1a"],
  [40, "#5e1f1f"],
  [60, "#8a2828"],
  [80, "#b4332f"],
  [100, "#d8443a"],
];

export function MlEstadosMap({ estados }: Props) {
  const [hoverCve, setHoverCve] = React.useState<string | null>(null);
  const [selectedCve, setSelectedCve] = React.useState<string | null>(null);

  const values: ChoroplethValue[] = React.useMemo(
    () =>
      estados.map((e) => ({
        cve_ent: e.cve_ent,
        // indice_riesgo está en 0..1; lo mapeamos a 0..100 para que la rampa
        // de color trabaje en la escala que espera MexicoMap.
        value: e.indice_riesgo * 100,
      })),
    [estados],
  );

  const activeCve = hoverCve ?? selectedCve;
  const active = activeCve
    ? estados.find((e) => e.cve_ent === activeCve)
    : null;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <MexicoMap
        values={values}
        metricLabel="Índice de riesgo ML (0–100)"
        formatValue={(n) => n.toFixed(0)}
        selectedCve={selectedCve}
        onSelect={(cve) =>
          setSelectedCve((curr) => (curr === cve ? null : cve))
        }
        onHover={setHoverCve}
        colorStops={RISK_STOPS}
        height={520}
        className="rounded-card overflow-hidden border border-cloud-whisper/10"
      />

      <aside className="rounded-card border border-cloud-whisper/10 p-5">
        {active ? (
          <div className="flex flex-col gap-3">
            <div className="eyebrow text-ash-accent">Estado seleccionado</div>
            <div className="display text-[22px] leading-tight">
              {active.estado}
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px] mt-2">
              <div>
                <div className="text-ash-accent eyebrow text-[10px] mb-1">
                  Riesgo
                </div>
                <div className="display text-[18px] tabular">
                  {active.indice_riesgo.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-ash-accent eyebrow text-[10px] mb-1">
                  %AD
                </div>
                <div className="display text-[18px] tabular">
                  {(active.pct_AD * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-ash-accent eyebrow text-[10px] mb-1">
                  HHI prov.
                </div>
                <div className="display text-[18px] tabular">
                  {active.hhi_proveedores.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-ash-accent eyebrow text-[10px] mb-1">
                  Top share
                </div>
                <div className="display text-[18px] tabular">
                  {(active.top_proveedor_share * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-ash-accent eyebrow text-[10px] mb-1">
                  Datos null
                </div>
                <div
                  className={`display text-[18px] tabular ${
                    active.pct_fecha_null >= 0.99 ? "text-ash-accent" : ""
                  }`}
                >
                  {(active.pct_fecha_null * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-ash-accent eyebrow text-[10px] mb-1">
                  Contratos
                </div>
                <div className="display text-[18px] tabular">
                  {active.n_contratos.toLocaleString("es-MX")}
                </div>
              </div>
            </div>
            {active.top_proveedor_nombre && (
              <div className="mt-3 pt-3 border-t border-cloud-whisper/10">
                <div className="text-ash-accent eyebrow text-[10px] mb-1">
                  Top proveedor
                </div>
                <div className="text-[12px] text-cloud-whisper leading-snug">
                  {active.top_proveedor_nombre}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[13px] text-light-ash leading-relaxed">
            <div className="eyebrow text-ash-accent mb-3">
              Cómo leer el mapa
            </div>
            <p className="mb-3">
              Más oscuro = menor riesgo. Más rojo = mayor índice compuesto
              (combina %AD, HHI de proveedores, concentración, calidad de
              datos).
            </p>
            <p className="text-light-ash text-[12px]">
              <strong className="text-cloud-whisper">Pasá el cursor</strong> o{" "}
              <strong className="text-cloud-whisper">hacé tap</strong> sobre un
              estado para ver el detalle.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
