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
    if (row.type === "modified") {
      for (const change of row.changes) {
        columns.add(change.column);
      }
    }
  }
  return Array.from(columns);
}

interface Transition {
  from: string;
  to: string;
  count: number;
}

interface ChangePattern {
  column: string;
  count: number;
  topTransition?: Transition;
}

function detectMostCommonChange(
  rowChanges: DiffResult["rowChanges"]
): string | null {
  const modifiedRows = rowChanges.filter((r) => r.type === "modified");
  if (modifiedRows.length === 0) return null;

  const columnCounts = new Map<string, number>();
  const transitionCounts = new Map<string, Transition[]>();

  for (const row of modifiedRows) {
    if (row.type !== "modified") continue;
    for (const change of row.changes) {
      columnCounts.set(change.column, (columnCounts.get(change.column) ?? 0) + 1);

      if (!transitionCounts.has(change.column)) {
        transitionCounts.set(change.column, []);
      }
      const transitions = transitionCounts.get(change.column)!;
      const from = String(change.oldValue ?? "");
      const to = String(change.newValue ?? "");
      const existing = transitions.find((t) => t.from === from && t.to === to);
      if (existing) {
        existing.count++;
      } else {
        transitions.push({ from, to, count: 1 });
      }
    }
  }

  if (columnCounts.size === 0) return null;

  const sorted = Array.from(columnCounts.entries()).sort((a, b) => b[1] - a[1]);
  const [topColumn, topCount] = sorted[0]!;

  const transitions = transitionCounts.get(topColumn);
  let pattern: ChangePattern = { column: topColumn, count: topCount };

  if (transitions && transitions.length > 0) {
    const topTransition = transitions.sort((a, b) => b.count - a.count)[0]!;
    if (topTransition.count >= 2) {
      pattern.topTransition = topTransition;
    }
  }

  if (pattern.topTransition) {
    return `${topColumn} field changed from '${pattern.topTransition.from}' to '${pattern.topTransition.to}' in ${pattern.topTransition.count} row${pattern.topTransition.count === 1 ? "" : "s"}`;
  }

  return `${topColumn} field changed in ${topCount} row${topCount === 1 ? "" : "s"}`;
}
