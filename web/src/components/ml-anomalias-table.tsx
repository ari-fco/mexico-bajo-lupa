"use client";

import * as React from "react";
import { FilterableTable, type Column } from "@/components/filterable-table";
import type { MlAnomaliaContrato } from "@/lib/types";
import { fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)} K`;
  return `$${fmtInt(n)}`;
}

type Props = {
  rows: MlAnomaliaContrato[];
};

export function MlAnomaliasTable({ rows }: Props) {
  const modalidades = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.modalidad))).sort(),
    [rows],
  );

  const columns: Column<MlAnomaliaContrato>[] = [
    {
      header: "Proveedor",
      render: (r) => <span title={r.proveedor}>{r.proveedor}</span>,
      sortValue: (r) => r.proveedor.toLowerCase(),
      maxWidth: 240,
    },
    {
      header: "Institución",
      render: (r) => <span title={r.institucion ?? ""}>{r.institucion}</span>,
      cellClass: "text-light-ash text-[12px]",
      maxWidth: 200,
    },
    {
      header: "Monto",
      render: (r) => fmtMonto(r.monto),
      sortValue: (r) => r.monto,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Mod.",
      render: (r) => r.modalidad,
      cellClass: "text-light-ash",
    },
    {
      header: "Señales",
      render: (r) => (
        <span className="text-[11px] text-ash-accent">
          {[
            r.flag_monto_extremo && "MAD",
            r.flag_isoforest && "IF",
            r.flag_lof && "LOF",
            r.flag_dbscan_noise && "DBSCAN",
            r.flag_efos && "EFOS",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      ),
      sortValue: (r) => r.n_flags,
    },
  ];

  return (
    <FilterableTable
      rows={rows}
      columns={columns}
      searchKeys={(r) => [r.proveedor, r.institucion ?? "", r.descripcion ?? ""]}
      filters={[
        { key: "modalidad", label: "Modalidad", options: modalidades },
        { key: "efos", label: "EFOS", options: ["Sí", "No"] },
      ]}
      getFilterValue={(r, key) => {
        if (key === "modalidad") return r.modalidad;
        if (key === "efos") return r.flag_efos ? "Sí" : "No";
        return null;
      }}
      rowKey={(r) => r.contrato_id}
      ariaLabel="Contratos con 2+ señales de anomalía"
      minWidth={800}
      initialLimit={50}
    />
  );
}
