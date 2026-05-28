import * as React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Diccionario centralizado de qué significa cada sigla técnica usada en las
 * tablas ML. Cualquier nueva señal que se agregue al pipeline debería
 * registrarse acá para que el tooltip sea consistente en todo el sitio.
 */
export const FLAG_DESCRIPTIONS: Record<string, string> = {
  // Métodos de detección por contrato
  MAD: "Median Absolute Deviation — contrato con monto extremo respecto a la mediana del dataset (>5σ equivalente, robusto a outliers)",
  IF: "Isolation Forest — algoritmo no supervisado que aísla puntos anómalos según cuántos cortes aleatorios hacen falta para separarlos del resto",
  LOF: "Local Outlier Factor — mide qué tan aislado está un punto respecto a sus vecinos cercanos. Complementa al Isolation Forest",
  DBSCAN: "Density-Based Spatial Clustering — un punto marcado como 'noise' por DBSCAN no pertenece a ningún cluster denso del dataset",
  "DBSCAN noise": "DBSCAN — Density-Based Spatial Clustering. El contrato no encaja en ningún cluster denso del dataset (es geométricamente atípico)",

  // Señales por proveedor / cruces
  EFOS: "Empresa que Factura Operaciones Simuladas — listado oficial del SAT bajo el Art. 69-B del Código Fiscal de la Federación",
  "monto extremo": "Monto del contrato es estadísticamente extremo (MAD score >5)",
  isoforest: "Isolation Forest — algoritmo no supervisado que detecta contratos anómalos según cuántos cortes aleatorios hacen falta para aislarlos",
  "post-EFOS": "El contrato fue firmado DESPUÉS de que el SAT publicara al proveedor en la lista EFOS",
  "score prov.": "El proveedor tiene un score alto en el ranking compuesto (monto + concentración + % AD)",
  Benford: "El primer dígito del monto se aparta de la distribución de Benford esperada para el corte",
  "jump temporal": "El contrato cae en un mes con actividad anormalmente alta del proveedor",
};

/**
 * Badge con tooltip explicativo del método ML. Si el `flag` no está en
 * el diccionario, se renderiza como Badge normal sin tooltip.
 */
export function FlagBadge({
  flag,
  children,
}: {
  flag: string;
  children?: React.ReactNode;
}) {
  const description = FLAG_DESCRIPTIONS[flag];
  return (
    <span title={description ?? undefined}>
      <Badge variant="lozenge">{children ?? flag}</Badge>
    </span>
  );
}
