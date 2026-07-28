import type { DiffResult } from "@/types";
import { formatCellValue } from "@/lib/display";

export function generateSummary(result: DiffResult): string {
  const { summary, rowChanges, columnChanges } = result;
  const { addedCount, removedCount, modifiedCount } = summary;
  const excludedRowCount = summary.excludedRowCount ?? 0;

  const excludedClause =
    excludedRowCount > 0
      ? ` ${excludedRowCount} duplicate/blank key row${excludedRowCount === 1 ? "" : "s"} excluded from comparison.`
      : "";

  if (addedCount === 0 && removedCount === 0 && modifiedCount === 0) {
    // A file can gain, lose, rename, or reorder a column while every row value
    // stays put. Lead with the column finding rather than reporting no change.
    const columnClause = describeColumnChanges(columnChanges);

    // Only claim no material difference when the row sets truly match. Excluded
    // rows mean some rows never got compared, so the files may still differ.
    if (excludedRowCount === 0) {
      if (columnClause) {
        return `No row values changed. ${columnClause}`;
      }
      // Not "identical" — comparison is tolerant, so whitespace, number
      // formatting, and date formats can differ between two files that match.
      return "No material differences after tolerant matching. Every row matched on the key columns and every compared value is equivalent.";
    }

    const excludedSentence = `No differences among the compared rows, but ${excludedRowCount} row${excludedRowCount === 1 ? "" : "s"} could not be matched because of duplicate or blank keys — the files are not necessarily identical.`;
    return columnClause ? `${excludedSentence} ${columnClause}` : excludedSentence;
  }

  const parts: string[] = [];

  if (addedCount > 0 && removedCount === 0 && modifiedCount === 0) {
    return `${addedCount} new row${addedCount === 1 ? "" : "s"} added. No existing rows were modified or removed.` + excludedClause;
  }

  if (removedCount > 0 && addedCount === 0 && modifiedCount === 0) {
    return `${removedCount} row${removedCount === 1 ? "" : "s"} removed. No rows were added or modified.` + excludedClause;
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

  return sentence + excludedClause;
}

/**
 * Plain-language sentences for the schema changes between the two files.
 * Returns "" when the columns match.
 */
function describeColumnChanges(columnChanges: DiffResult["columnChanges"]): string {
  const added: string[] = [];
  const removed: string[] = [];
  const renamed: string[] = [];
  let reordered = false;

  for (const change of columnChanges) {
    switch (change.type) {
      case "added":
        if (change.columnName) added.push(change.columnName);
        break;
      case "removed":
        if (change.columnName) removed.push(change.columnName);
        break;
      case "renamed": {
        const oldName = change.details?.oldName;
        const newName = change.details?.newName;
        if (oldName && newName) renamed.push(`${oldName} → ${newName}`);
        break;
      }
      case "reordered":
        reordered = true;
        break;
    }
  }

  const sentences: string[] = [];
  if (added.length > 0) {
    sentences.push(`${added.length} column${added.length === 1 ? "" : "s"} added: ${added.join(", ")}.`);
  }
  if (removed.length > 0) {
    sentences.push(`${removed.length} column${removed.length === 1 ? "" : "s"} removed: ${removed.join(", ")}.`);
  }
  if (renamed.length > 0) {
    sentences.push(`${renamed.length} column${renamed.length === 1 ? "" : "s"} renamed: ${renamed.join(", ")}.`);
  }
  if (reordered) {
    sentences.push("Columns reordered.");
  }

  return sentences.join(" ");
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
      const from = formatCellValue(change.oldValue);
      const to = formatCellValue(change.newValue);
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
