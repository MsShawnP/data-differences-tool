import type { DiffResult } from "@/types";

export function generateSummary(result: DiffResult): string {
  const { summary, rowChanges } = result;
  const { addedCount, removedCount, modifiedCount } = summary;

  if (addedCount === 0 && removedCount === 0 && modifiedCount === 0) {
    return "Files are identical. No differences found.";
  }

  const parts: string[] = [];

  if (addedCount > 0 && removedCount === 0 && modifiedCount === 0) {
    return `${addedCount} new row${addedCount === 1 ? "" : "s"} added. No existing rows were modified or removed.`;
  }

  if (removedCount > 0 && addedCount === 0 && modifiedCount === 0) {
    return `${removedCount} row${removedCount === 1 ? "" : "s"} removed. No rows were added or modified.`;
  }

  if (addedCount > 0) parts.push(`${addedCount} row${addedCount === 1 ? "" : "s"} added`);
  if (removedCount > 0) parts.push(`${removedCount} removed`);
  if (modifiedCount > 0) parts.push(`${modifiedCount} modified`);

  const changedColumns = getChangedColumns(rowChanges);
  const columnClause = changedColumns.length > 0
    ? ` across ${changedColumns.length} column${changedColumns.length === 1 ? "" : "s"}`
    : "";

  let sentence = parts.join(", ") + columnClause + ".";

  const pattern = detectMostCommonChange(rowChanges);
  if (pattern) {
    sentence += ` Most common change: ${pattern}.`;
  }

  return sentence;
}

function getChangedColumns(
  rowChanges: DiffResult["rowChanges"]
): string[] {
  const columns = new Set<string>();
  for (const row of rowChanges) {
    if (row.type === "modified" && row.changes) {
      for (const change of row.changes) {
        columns.add(change.column);
      }
    }
  }
  return Array.from(columns);
}

interface ChangePattern {
  column: string;
  count: number;
  topTransition?: { from: string; to: string; count: number };
}

function detectMostCommonChange(
  rowChanges: DiffResult["rowChanges"]
): string | null {
  const modifiedRows = rowChanges.filter((r) => r.type === "modified");
  if (modifiedRows.length === 0) return null;

  const columnCounts = new Map<string, number>();
  const transitionCounts = new Map<string, Map<string, number>>();

  for (const row of modifiedRows) {
    if (!row.changes) continue;
    for (const change of row.changes) {
      columnCounts.set(change.column, (columnCounts.get(change.column) ?? 0) + 1);

      const key = `${String(change.oldValue ?? "")} → ${String(change.newValue ?? "")}`;
      if (!transitionCounts.has(change.column)) {
        transitionCounts.set(change.column, new Map());
      }
      const colTransitions = transitionCounts.get(change.column)!;
      colTransitions.set(key, (colTransitions.get(key) ?? 0) + 1);
    }
  }

  if (columnCounts.size === 0) return null;

  const sorted = Array.from(columnCounts.entries()).sort((a, b) => b[1] - a[1]);
  const [topColumn, topCount] = sorted[0]!;

  const colTransitions = transitionCounts.get(topColumn);
  let pattern: ChangePattern = { column: topColumn, count: topCount };

  if (colTransitions) {
    const topTransitionEntry = Array.from(colTransitions.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (topTransitionEntry && topTransitionEntry[1] >= 2) {
      const [transition, count] = topTransitionEntry;
      const [from, to] = transition.split(" → ");
      pattern.topTransition = { from: from!, to: to!, count };
    }
  }

  if (pattern.topTransition) {
    return `${topColumn} field changed from '${pattern.topTransition.from}' to '${pattern.topTransition.to}' in ${pattern.topTransition.count} row${pattern.topTransition.count === 1 ? "" : "s"}`;
  }

  return `${topColumn} field changed in ${topCount} row${topCount === 1 ? "" : "s"}`;
}
