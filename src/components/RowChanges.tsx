import { useState } from "react";
import type { RowChange } from "@/types";

interface RowChangesProps {
  changes: RowChange[];
  keyColumns: string[];
}

const PAGE_SIZE = 50;

export function RowChanges({ changes, keyColumns }: RowChangesProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  const added = changes.filter((r) => r.type === "added");
  const removed = changes.filter((r) => r.type === "removed");
  const modified = changes.filter((r) => r.type === "modified");

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
                      ({row.changes?.length ?? 0} field{(row.changes?.length ?? 0) === 1 ? "" : "s"} changed)
                    </span>
                    <span className="ml-1 text-text-secondary">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </button>
                  {isExpanded && row.changes && (
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
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-sm border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary">
                Page {page + 1} of {Math.ceil(modified.length / PAGE_SIZE)}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(Math.ceil(modified.length / PAGE_SIZE) - 1, p + 1))
                }
                disabled={(page + 1) * PAGE_SIZE >= modified.length}
                className="rounded-sm border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
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
  const borderColor = color === "green" ? "border-green" : "border-red";

  return (
    <div className="rounded-sm border border-border bg-white p-6">
      <h3 className="mb-3 font-serif text-lg font-bold text-text-primary">{title}</h3>
      <div className="space-y-1">
        {rows.slice(0, 100).map((row, i) => {
          const keyStr = keyColumns
            .map((col) => String(row.keyValues[col] ?? ""))
            .join(", ");
          return (
            <p key={i} className={`border-l-3 ${borderColor} pl-3 text-sm text-text-primary`}>
              {keyStr}
            </p>
          );
        })}
        {rows.length > 100 && (
          <p className="mt-2 text-sm text-text-secondary">
            ...and {rows.length - 100} more
          </p>
        )}
      </div>
    </div>
  );
}
