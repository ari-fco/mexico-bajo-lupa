"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { FilterableTable, type Column } from "@/components/filterable-table";
import type { MlContinuidadProveedor } from "@/lib/types";
import { fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} M`;
  return `$${fmtInt(n)}`;
}

export function MlPersistentesTable({ rows }: { rows: MlContinuidadProveedor[] }) {
  const columns: Column<MlContinuidadProveedor>[] = [
    {
      header: "Proveedor",
      render: (r) => <span title={r.proveedor}>{r.proveedor}</span>,
      sortValue: (r) => r.proveedor.toLowerCase(),
      maxWidth: 260,
    },
    {
      header: "Años",
      render: (r) => r.n_anos,
      sortValue: (r) => r.n_anos,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Contratos",
      render: (r) => fmtInt(r.n_contratos),
      sortValue: (r) => r.n_contratos,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Monto total",
      render: (r) => fmtMonto(r.monto_total),
      sortValue: (r) => r.monto_total,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Sexenios",
      render: (r) => r.n_sexenios,
      sortValue: (r) => r.n_sexenios,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Intensidad",
      render: (r) => `${(r.intensidad * 100).toFixed(0)}%`,
      sortValue: (r) => r.intensidad,
      align: "right",
      cellClass: "tabular text-light-ash",
    },
  ];

  return (
    <FilterableTable
      rows={rows}
      columns={columns}
      searchKeys={(r) => [r.proveedor]}
      rowKey={(r) => r.proveedor}
      ariaLabel="Proveedores persistentes (3+ sexenios)"
      minWidth={800}
      initialLimit={25}
    />
  );
}

export function MlTransitoriosTable({ rows }: { rows: MlContinuidadProveedor[] }) {
  const sexenios = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.sexenio_dominante))).sort(),
    [rows],
  );

  const columns: Column<MlContinuidadProveedor>[] = [
    {
      header: "Proveedor",
      render: (r) => <span title={r.proveedor}>{r.proveedor}</span>,
      sortValue: (r) => r.proveedor.toLowerCase(),
      maxWidth: 260,
    },
    {
      header: "Sexenio dom.",
      render: (r) => <Badge variant="lozenge">{r.sexenio_dominante}</Badge>,
    },
    {
      header: "Activo",
      render: (r) => `${r.primer_ano}–${r.ultimo_ano}`,
      sortValue: (r) => r.primer_ano,
      align: "right",
      cellClass: "tabular text-light-ash",
    },
    {
      header: "Contratos",
      render: (r) => fmtInt(r.n_contratos),
      sortValue: (r) => r.n_contratos,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Monto total",
      render: (r) => fmtMonto(r.monto_total),
      sortValue: (r) => r.monto_total,
      align: "right",
      cellClass: "tabular",
    },
  ];

  return (
    <FilterableTable
      rows={rows}
      columns={columns}
      searchKeys={(r) => [r.proveedor]}
      filters={[{ key: "sexenio", label: "Sexenio dominante", options: sexenios }]}
      getFilterValue={(r, key) =>
        key === "sexenio" ? r.sexenio_dominante : null
      }
      rowKey={(r) => r.proveedor}
      ariaLabel="Proveedores transitorios (un sexenio)"
      minWidth={800}
      initialLimit={25}
    />
  );
}

export function MlElectoralesTable({ rows }: { rows: MlContinuidadProveedor[] }) {
  const columns: Column<MlContinuidadProveedor>[] = [
    {
      header: "Proveedor",
      render: (r) => <span title={r.proveedor}>{r.proveedor}</span>,
      sortValue: (r) => r.proveedor.toLowerCase(),
      maxWidth: 260,
    },
    {
      header: "Activo",
      render: (r) => `${r.primer_ano}–${r.ultimo_ano}`,
      sortValue: (r) => r.primer_ano,
      align: "right",
      cellClass: "tabular text-light-ash",
    },
    {
      header: "Contratos",
      render: (r) => fmtInt(r.n_contratos),
      sortValue: (r) => r.n_contratos,
      align: "right",
      cellClass: "tabular",
    },
    {
      header: "Monto total",
      render: (r) => fmtMonto(r.monto_total),
      sortValue: (r) => r.monto_total,
      align: "right",
      cellClass: "tabular",
    },
  ];

  return (
    <FilterableTable
      rows={rows}
      columns={columns}
      searchKeys={(r) => [r.proveedor]}
      rowKey={(r) => r.proveedor}
      ariaLabel="Proveedores activos solo en años electorales"
      minWidth={800}
      initialLimit={30}
    />
  );
}
