import { useState, useEffect, useMemo } from "react";
import type { RowChange } from "@/types";

interface RowChangesProps {
  changes: RowChange[];
  keyColumns: string[];
}

const PAGE_SIZE = 50;

export function RowChanges({ changes, keyColumns }: RowChangesProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  const added = useMemo(() => changes.filter((r) => r.type === "added"), [changes]);
  const removed = useMemo(() => changes.filter((r) => r.type === "removed"), [changes]);
  const modified = useMemo(() => changes.filter((r) => r.type === "modified"), [changes]);

  useEffect(() => {
    setExpandedRows(new Set());
  }, [page]);

  function toggleRow(idx: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {added.length > 0 && (
        <ChangeSection
          title={`Added Rows (${added.length})`}
          rows={added}
          keyColumns={keyColumns}
          color="green"
        />
      )}

      {removed.length > 0 && (
        <ChangeSection
          title={`Removed Rows (${removed.length})`}
          rows={removed}
          keyColumns={keyColumns}
          color="red"
        />
      )}

      {modified.length > 0 && (
        <div className="rounded-sm border border-border bg-white p-6">
          <h3 className="mb-3 font-serif text-lg font-bold text-text-primary">
            Modified Rows ({modified.length})
          </h3>
          <div className="space-y-2">
            {modified.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row, i) => {
              const globalIdx = page * PAGE_SIZE + i;
              const isExpanded = expandedRows.has(globalIdx);
              const keyStr = keyColumns
                .map((col) => `${col}: ${String(row.keyValues[col] ?? "")}`)
                .join(", ");

              return (
                <div key={globalIdx} className="border-l-3 border-amber pl-3">
                  <button
                    onClick={() => toggleRow(globalIdx)}
                    className="w-full text-left text-sm text-text-primary hover:text-navy"
                  >
                    <span className="font-medium">{keyStr}</span>
                    <span className="ml-2 text-text-secondary">
                      ({row.type === "modified" ? row.changes.length : 0} field{(row.type === "modified" ? row.changes.length : 0) === 1 ? "" : "s"} changed)
                    </span>
                    <span className="ml-1 text-text-secondary">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </button>
                  {isExpanded && row.type === "modified" && (
                    <table className="mt-2 ml-2 w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-text-secondary">
                          <th className="pb-1 pr-4">Column</th>
                          <th className="pb-1 pr-4">Old Value</th>
                          <th className="pb-1">New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.changes.map((cell, ci) => (
                          <tr key={ci}>
                            <td className="py-0.5 pr-4 font-medium text-text-primary">
                              {cell.column}
                            </td>
                            <td className="py-0.5 pr-4 text-red">
                              {String(cell.oldValue ?? "")}
                            </td>
                            <td className="py-0.5 text-green">
                              {String(cell.newValue ?? "")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>

          {modified.length > PAGE_SIZE && (
            <Pagination
              page={page}
              totalItems={modified.length}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="rounded-sm border border-border px-3 py-1 text-sm disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-text-secondary">
        Page {page + 1} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={(page + 1) * PAGE_SIZE >= totalItems}
        className="rounded-sm border border-border px-3 py-1 text-sm disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function ChangeSection({
  title,
  rows,
  keyColumns,
  color,
}: {
  title: string;
  rows: RowChange[];
  keyColumns: string[];
  color: "green" | "red";
}) {
  const [page, setPage] = useState(0);
  const borderColor = color === "green" ? "border-green" : "border-red";
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-sm border border-border bg-white p-6">
      <h3 className="mb-3 font-serif text-lg font-bold text-text-primary">{title}</h3>
      <div className="space-y-1">
        {pageRows.map((row, i) => {
          const keyStr = keyColumns
            .map((col) => String(row.keyValues[col] ?? ""))
            .join(", ");
          return (
            <p key={page * PAGE_SIZE + i} className={`border-l-3 ${borderColor} pl-3 text-sm text-text-primary`}>
              {keyStr}
            </p>
          );
        })}
      </div>
      {rows.length > PAGE_SIZE && (
        <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
      )}
    </div>
  );
}
