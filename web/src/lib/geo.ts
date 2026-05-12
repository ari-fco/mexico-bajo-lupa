"use client";

import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

export type EstadoFeatureProps = {
  state_code: number;
  state_name: string;
  cve_ent: string; // padded "01"-"32"
};

export type EstadosFC = FeatureCollection<
  Polygon | MultiPolygon,
  EstadoFeatureProps
>;

let cached: Promise<EstadosFC> | null = null;

export function loadEstadosGeo(): Promise<EstadosFC> {
  if (cached) return cached;
  cached = (async () => {
    const res = await fetch("/mx-topo.json", { cache: "force-cache" });
    if (!res.ok) throw new Error("No se pudo cargar el TopoJSON de México");
    const topo = (await res.json()) as Topology;
    const fc = feature(
      topo,
      // @ts-expect-error — topology objects keyed dynamically
      topo.objects.states,
    ) as unknown as FeatureCollection<
      Polygon | MultiPolygon,
      { state_code: number; state_name: string }
    >;

    const out: EstadosFC = {
      type: "FeatureCollection",
      features: fc.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          cve_ent: String(f.properties.state_code).padStart(2, "0"),
        },
      })),
    };
    return out;
  })();
  return cached;
}
