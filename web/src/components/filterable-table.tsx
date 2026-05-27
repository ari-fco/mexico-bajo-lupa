"use client";

import * as React from "react";

export type FilterOption = {
  /** Identificador estable del filtro (también la query string key). */
  key: string;
  /** Label que ve el usuario. */
  label: string;
  /** Opciones seleccionables. La etiqueta vacía "Todos" se añade automáticamente. */
  options: string[];
};

export type Column<T> = {
  header: string;
  /** Cómo se renderiza cada celda. */
  render: (row: T) => React.ReactNode;
  /** Alineación de la columna. Default izquierda. */
  align?: "left" | "right" | "center";
  /** Si está presente, hace la columna ordenable. */
  sortValue?: (row: T) => number | string | null;
  /** Ancho máximo CSS (px) para truncar. */
  maxWidth?: number;
  /** Clase extra para la celda (txt-light-ash, tabular, etc.). */
  cellClass?: string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  /** Devuelve los strings searchables de una fila (case-insensitive). */
  searchKeys: (row: T) => string[];
  /** Definición de filtros desplegables. */
  filters?: FilterOption[];
  /** Devuelve el valor actual del filtro para una fila. */
  getFilterValue?: (row: T, filterKey: string) => string | null;
  /** Filas mínimas a renderizar por default. Si es undefined, se muestran todas. */
  initialLimit?: number;
  /** Mensaje cuando no hay matches. */
  emptyMessage?: string;
  /** Clave única por fila (para React keys). */
  rowKey: (row: T) => string;
  /** ARIA-label para la tabla. */
  ariaLabel?: string;
  /** Ancho mínimo de la tabla en px (para overflow horizontal). */
  minWidth?: number;
};

export function FilterableTable<T>({
  rows,
  columns,
  searchKeys,
  filters = [],
  getFilterValue,
  initialLimit,
  emptyMessage = "Sin resultados con los filtros actuales.",
  rowKey,
  ariaLabel,
  minWidth = 800,
}: Props<T>) {
  const [search, setSearch] = React.useState("");
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string>>({});
  const [sortKey, setSortKey] = React.useState<number | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q.length > 0) {
        const haystack = searchKeys(row).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        const rowVal = getFilterValue?.(row, key);
        if (rowVal !== value) return false;
      }
      return true;
    });
  }, [rows, search, activeFilters, searchKeys, getFilterValue]);

  const sorted = React.useMemo(() => {
    if (sortKey === null) return filtered;
    const col = columns[sortKey];
    if (!col?.sortValue) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return arr;
  }, [filtered, columns, sortKey, sortDir]);

  const visible = !showAll && initialLimit !== undefined
    ? sorted.slice(0, initialLimit)
    : sorted;

  const handleSort = (idx: number) => {
    const col = columns[idx];
    if (!col.sortValue) return;
    if (sortKey === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(idx);
      setSortDir("desc");
    }
  };

  const hasActiveFilters =
    search.length > 0 ||
    Object.values(activeFilters).some((v) => v && v.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] eyebrow text-ash-accent mb-1">
            Buscar
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="proveedor, descripción…"
            className="w-full bg-cloud-whisper/5 border border-cloud-whisper/15 rounded-pill px-4 py-2 text-[13px] text-cloud-whisper placeholder:text-light-ash/50 focus:outline-none focus:border-cloud-whisper/40"
          />
        </div>
        {filters.map((f) => (
          <div key={f.key} className="min-w-[140px]">
            <label className="block text-[10px] eyebrow text-ash-accent mb-1">
              {f.label}
            </label>
            <select
              value={activeFilters[f.key] ?? ""}
              onChange={(e) =>
                setActiveFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              className="w-full bg-cloud-whisper/5 border border-cloud-whisper/15 rounded-pill px-3 py-2 text-[13px] text-cloud-whisper focus:outline-none focus:border-cloud-whisper/40"
            >
              <option value="">Todos</option>
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveFilters({});
            }}
            className="text-[12px] text-ash-accent hover:text-cloud-whisper underline decoration-1 underline-offset-4 self-end pb-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Counter */}
      <div className="text-[12px] text-light-ash tabular">
        Mostrando <span className="text-cloud-whisper">{visible.length}</span> de{" "}
        <span className="text-cloud-whisper">{rows.length}</span>
        {hasActiveFilters && filtered.length !== rows.length && (
          <span className="text-ash-accent">
            {" "}· {filtered.length} matches
          </span>
        )}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="py-12 text-center text-[14px] text-light-ash">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table
            className="w-full text-[13px]"
            style={{ minWidth: `${minWidth}px` }}
            aria-label={ariaLabel}
          >
            <thead className="border-b border-cloud-whisper/15 text-light-ash">
              <tr>
                {columns.map((col, i) => {
                  const sortable = !!col.sortValue;
                  const isSorted = sortKey === i;
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left";
                  return (
                    <th
                      key={i}
                      className={`py-3 pr-3 ${alignClass} ${
                        sortable ? "cursor-pointer select-none hover:text-cloud-whisper" : ""
                      }`}
                      onClick={() => sortable && handleSort(i)}
                    >
                      {col.header}
                      {sortable && (
                        <span
                          className={`ml-1 text-[10px] ${isSorted ? "text-cloud-whisper" : "text-ash-accent/40"}`}
                          aria-hidden
                        >
                          {isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="text-cloud-whisper">
              {visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-cloud-whisper/8 hover:bg-cloud-whisper/[0.03]"
                >
                  {columns.map((col, i) => {
                    const alignClass =
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left";
                    const widthStyle = col.maxWidth
                      ? { maxWidth: `${col.maxWidth}px` }
                      : undefined;
                    const truncate = col.maxWidth ? "truncate" : "";
                    return (
                      <td
                        key={i}
                        className={`py-3 pr-3 ${alignClass} ${truncate} ${col.cellClass ?? ""}`}
                        style={widthStyle}
                      >
                        {col.render(row)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Show all */}
      {initialLimit !== undefined && sorted.length > initialLimit && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-center text-[12px] text-ash-accent hover:text-cloud-whisper underline decoration-1 underline-offset-4 mt-2"
        >
          Ver las {sorted.length} filas →
        </button>
      )}
    </div>
  );
}
