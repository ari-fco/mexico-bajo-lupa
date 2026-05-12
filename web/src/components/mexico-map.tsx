"use client";

import * as React from "react";
import maplibregl, {
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type MapLayerTouchEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadEstadosGeo, type EstadosFC } from "@/lib/geo";

export type ChoroplethValue = {
  cve_ent: string;
  value: number;
};

type Props = {
  values: ChoroplethValue[];
  metricLabel: string;
  formatValue?: (n: number) => string;
  selectedCve?: string | null;
  onSelect?: (cve: string | null) => void;
  onHover?: (cve: string | null) => void;
  className?: string;
  interactive?: boolean;
  showLegend?: boolean;
  height?: number | string;
  colorStops?: Array<[number, string]>;
};

// Editorial single-hue ramp (negro→rojo profundo, estilo Economist/FT).
// Override per-metric desde mapa-explorer.
const DEFAULT_STOPS: Array<[number, string]> = [
  [0, "#1a1a1a"],
  [20, "#3a1a1a"],
  [40, "#5e1f1f"],
  [60, "#8a2828"],
  [80, "#b4332f"],
  [100, "#d8443a"],
];

const EMPTY_STYLE: StyleSpecification = {
  version: 8,
  glyphs:
    "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#000000" },
    },
  ],
};

export function MexicoMap({
  values,
  metricLabel,
  formatValue,
  selectedCve,
  onSelect,
  onHover,
  className,
  interactive = true,
  showLegend = true,
  height = 560,
  colorStops = DEFAULT_STOPS,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<MapLibreMap | null>(null);
  const [ready, setReady] = React.useState(false);
  const hoveredRef = React.useRef<string | null>(null);

  // Build value lookup
  const valueByCve = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v.cve_ent, v.value);
    return m;
  }, [values]);

  const [min, max] = React.useMemo(() => {
    if (values.length === 0) return [0, 100] as const;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
      if (v.value < lo) lo = v.value;
      if (v.value > hi) hi = v.value;
    }
    if (lo === hi) return [lo, lo + 1] as const;
    return [lo, hi] as const;
  }, [values]);

  // Initialize map once
  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: EMPTY_STYLE,
      center: [-102.5, 23.6],
      zoom: 4.2,
      minZoom: 3.5,
      maxZoom: 8,
      attributionControl: false,
      interactive,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    if (interactive) {
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            "Geometría: INEGI / diegovalle · Datos: SESNSP, INEGI",
        }),
        "bottom-right",
      );
    }

    let cancelled = false;

    map.on("load", async () => {
      let fc;
      try {
        fc = await loadEstadosGeo();
      } catch (err) {
        console.error("No se pudo cargar la geometría de México:", err);
        return;
      }
      // Guard: el componente puede haberse desmontado antes de que termine
      // el fetch del TopoJSON (navegación rápida, hot reload, etc.).
      if (cancelled || mapRef.current !== map) return;
      try {
        if (!map.getStyle()) return; // map.remove() ya disparó
      } catch {
        return;
      }
      injectFeatureValues(fc, valueByCve);

      map.addSource("estados", {
        type: "geojson",
        data: fc,
        promoteId: "cve_ent",
      });

      map.addLayer({
        id: "estados-fill",
        type: "fill",
        source: "estados",
        paint: {
          "fill-color": buildColorExpression(min, max, colorStops),
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.95,
            ["boolean", ["feature-state", "selected"], false],
            1,
            0.78,
          ],
        },
      });

      map.addLayer({
        id: "estados-line",
        type: "line",
        source: "estados",
        paint: {
          "line-color": "#000000",
          "line-width": 0.6,
          "line-opacity": 0.9,
        },
      });

      // Highlight outline for hover/selected
      map.addLayer({
        id: "estados-line-hl",
        type: "line",
        source: "estados",
        paint: {
          "line-color": "#ffffff",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2,
            ["boolean", ["feature-state", "hover"], false],
            1.4,
            0,
          ],
          "line-opacity": 1,
        },
      });

      if (interactive) {
        map.on("mousemove", "estados-fill", (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const cve = String(f.id);
          if (hoveredRef.current && hoveredRef.current !== cve) {
            map.setFeatureState(
              { source: "estados", id: hoveredRef.current },
              { hover: false },
            );
          }
          hoveredRef.current = cve;
          map.setFeatureState(
            { source: "estados", id: cve },
            { hover: true },
          );
          onHover?.(cve);
        });

        map.on("mouseleave", "estados-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredRef.current) {
            map.setFeatureState(
              { source: "estados", id: hoveredRef.current },
              { hover: false },
            );
            hoveredRef.current = null;
          }
          onHover?.(null);
        });

        map.on("click", "estados-fill", (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          const cve = String(f.id);
          onSelect?.(cve);
        });

        // Touch: en mobile sin mouse, un tap fija el estado y dispara hover
        // simultáneamente para que el dossier lateral se llene al primer toque.
        map.on("touchstart", "estados-fill", (e: MapLayerTouchEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          const cve = String(f.id);
          if (hoveredRef.current && hoveredRef.current !== cve) {
            map.setFeatureState(
              { source: "estados", id: hoveredRef.current },
              { hover: false },
            );
          }
          hoveredRef.current = cve;
          map.setFeatureState(
            { source: "estados", id: cve },
            { hover: true },
          );
          onHover?.(cve);
        });
      }

      setReady(true);
    });

    mapRef.current = map;
    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update color expression when values/range/stops change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const expr = buildColorExpression(min, max, colorStops);
    if (map.getLayer("estados-fill")) {
      map.setPaintProperty("estados-fill", "fill-color", expr);
    }
    // Update source data with new values
    const src = map.getSource("estados") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) {
      loadEstadosGeo().then((fc) => {
        const next: EstadosFC = {
          ...fc,
          features: fc.features.map((f) => ({
            ...f,
            properties: {
              ...f.properties,
              value: valueByCve.get(f.properties.cve_ent) ?? null,
            },
          })),
        };
        injectFeatureValues(next, valueByCve);
        src.setData(next);
      });
    }
  }, [min, max, colorStops, valueByCve, ready]);

  // Reflect selection
  const prevSelectedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const prev = prevSelectedRef.current;
    if (prev) {
      map.setFeatureState(
        { source: "estados", id: prev },
        { selected: false },
      );
    }
    if (selectedCve) {
      map.setFeatureState(
        { source: "estados", id: selectedCve },
        { selected: true },
      );
    }
    prevSelectedRef.current = selectedCve ?? null;
  }, [selectedCve, ready]);

  const fmt = formatValue ?? ((n: number) => n.toFixed(1));

  // Si className define la altura, height puede omitirse (default ignored).
  // Si className no la define, height se usa como fallback.
  const hasClassHeight =
    typeof className === "string" && /\bh-\[|\bh-\d/.test(className);
  return (
    <div
      className={className}
      style={
        hasClassHeight
          ? { position: "relative", width: "100%" }
          : { position: "relative", width: "100%", height }
      }
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0 }}
        aria-label={`Mapa de México · ${metricLabel}`}
        role="img"
        aria-describedby="mapa-help-text"
      />
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-10 rounded-card bg-midnight-void/85 backdrop-blur border border-cloud-whisper/10 px-4 py-3 text-[11px] text-light-ash">
          <div className="eyebrow mb-2 text-[9px]">{metricLabel}</div>
          <div className="flex items-center gap-2">
            <span className="tabular">{fmt(min)}</span>
            <div
              className="h-2 w-32 rounded-pill"
              style={{
                background: `linear-gradient(90deg, ${colorStops
                  .map(([p, c]) => `${c} ${p}%`)
                  .join(", ")})`,
              }}
            />
            <span className="tabular">{fmt(max)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function injectFeatureValues(
  fc: EstadosFC,
  values: Map<string, number>,
) {
  for (const f of fc.features) {
    (f.properties as EstadosFC["features"][number]["properties"] & {
      value?: number | null;
    }).value = values.get(f.properties.cve_ent) ?? null;
  }
}

function buildColorExpression(
  min: number,
  max: number,
  stops: Array<[number, string]>,
): maplibregl.ExpressionSpecification {
  // Map our 0..100 stops onto [min,max]
  const range = max - min || 1;
  const interp: Array<number | string> = [];
  for (const [p, color] of stops) {
    interp.push(min + (p / 100) * range, color);
  }
  return [
    "case",
    ["==", ["coalesce", ["feature-state", "value"], ["get", "value"]], null],
    "#1a1a1a",
    [
      "interpolate",
      ["linear"],
      ["coalesce", ["feature-state", "value"], ["get", "value"], min],
      ...interp,
    ],
  ] as unknown as maplibregl.ExpressionSpecification;
}
