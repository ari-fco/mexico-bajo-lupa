"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { FilterableTable, type Column } from "@/components/filterable-table";
import type { MlOneShot } from "@/lib/types";
import { fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} M`;
  return `$${fmtInt(n)}`;
}

type Props = {
  rows: MlOneShot[];
};

export function MlOneshotsTable({ rows }: Props) {
  const sexenios = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.sexenio_unico))).sort(),
    [rows],
  );
  const modalidades = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.modalidad_unico))).sort(),
    [rows],
  );

  const columns: Column<MlOneShot>[] = [
    {
      header: "Proveedor",
      render: (r) => <span title={r.proveedor}>{r.proveedor}</span>,
      sortValue: (r) => r.proveedor.toLowerCase(),
      maxWidth: 260,
    },
    {
      header: "Monto",
      render: (r) => fmtMonto(r.monto_unico),
      sortValue: (r) => r.monto_unico,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Año",
      render: (r) => r.ano_unico,
      sortValue: (r) => r.ano_unico,
      cellClass: "tabular",
    },
    {
      header: "Sexenio",
      render: (r) => r.sexenio_unico,
      cellClass: "text-light-ash text-[12px]",
    },
    {
      header: "Mod.",
      render: (r) => r.modalidad_unico,
      cellClass: "text-light-ash",
    },
    {
      header: "Ramo",
      render: (r) => <span title={r.ramo_unico}>{r.ramo_unico}</span>,
      cellClass: "text-light-ash text-[12px]",
      maxWidth: 180,
    },
    {
      header: "EFOS",
      render: (r) =>
        r.es_efos ? (
          <Badge variant="lozenge">⚠ EFOS</Badge>
        ) : (
          <span className="text-light-ash text-[11px]">—</span>
        ),
      sortValue: (r) => (r.es_efos ? 1 : 0),
    },
  ];

  return (
    <FilterableTable
      rows={rows}
      columns={columns}
      searchKeys={(r) => [r.proveedor, r.ramo_unico, r.descripcion_unico ?? ""]}
      filters={[
        { key: "sexenio", label: "Sexenio", options: sexenios },
        { key: "modalidad", label: "Modalidad", options: modalidades },
        { key: "efos", label: "EFOS", options: ["Sí", "No"] },
      ]}
      getFilterValue={(r, key) => {
        if (key === "sexenio") return r.sexenio_unico;
        if (key === "modalidad") return r.modalidad_unico;
        if (key === "efos") return r.es_efos ? "Sí" : "No";
        return null;
      }}
      rowKey={(r) => `${r.proveedor_norm}-${r.ano_unico}-${r.monto_unico}`}
      ariaLabel="Top one-shot wonders millonarios"
      minWidth={900}
    />
  );
}
