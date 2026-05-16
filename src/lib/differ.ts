import type { CellDiff, DiffConfig, DiffResult, ParsedFile, RowChange } from "@/types";
import { analyzeColumns, buildColumnChanges } from "@/lib/column-detector";
import { valuesAreEqual, normalizeValue } from "@/lib/normalizer";

const KEY_SEPARATOR = "\x00";

function buildCompositeKey(
  row: Record<string, unknown>,
  keyColumns: string[],
  config: DiffConfig
): string {
  return keyColumns
    .map((col) => {
      const val = row[col];
      if (val == null || val === "") return "";
      return config.caseSensitive ? String(val).trim() : String(val).trim().toLowerCase();
    })
    .join(KEY_SEPARATOR);
}

function buildRowIndex(
  rows: Record<string, unknown>[],
  keyColumns: string[],
  config: DiffConfig
): Map<string, number> {
  const index = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const key = buildCompositeKey(rows[i]!, keyColumns, config);
    index.set(key, i);
  }
  return index;
}

export function computeDiff(
  fileA: ParsedFile,
  fileB: ParsedFile,
  config: DiffConfig
): DiffResult {
  const columnMapping = analyzeColumns(fileA, fileB);
  const columnChanges = buildColumnChanges(columnMapping, fileA, fileB);

  const overlappingColumns = columnMapping.matched.map((m) => m.nameA);

  const indexA = buildRowIndex(fileA.rows, config.keyColumns, config);
  const indexB = buildRowIndex(fileB.rows, config.keyColumns, config);

  const rowChanges: RowChange[] = [];
  let unchangedCount = 0;

  // Find removed rows (in A but not in B)
  for (const [key, rowIdx] of indexA) {
    if (!indexB.has(key)) {
      const row = fileA.rows[rowIdx]!;
      const keyValues: Record<string, unknown> = {};
      for (const col of config.keyColumns) {
        keyValues[col] = row[col];
      }
      rowChanges.push({
        type: "removed",
        keyValues,
        rowIndex: rowIdx,
      });
    }
  }

  // Find added rows (in B but not in A)
  for (const [key, rowIdx] of indexB) {
    if (!indexA.has(key)) {
      const row = fileB.rows[rowIdx]!;
      const keyValues: Record<string, unknown> = {};
      for (const col of config.keyColumns) {
        keyValues[col] = row[col];
      }
      rowChanges.push({
        type: "added",
        keyValues,
        rowIndex: rowIdx,
      });
    }
  }

  // Find modified rows (in both, compare overlapping columns)
  for (const [key, rowIdxA] of indexA) {
    const rowIdxB = indexB.get(key);
    if (rowIdxB === undefined) continue;

    const rowA = fileA.rows[rowIdxA]!;
    const rowB = fileB.rows[rowIdxB]!;
    const changes: CellDiff[] = [];

    for (const colName of overlappingColumns) {
      if (config.keyColumns.includes(colName)) continue;

      const colMeta = fileA.columns.find((c) => c.name === colName) ?? {
        name: colName,
        detectedType: "text" as const,
        index: 0,
      };

      const valA = rowA[colName];
      const valB = rowB[colName];

      if (!valuesAreEqual(valA, valB, colMeta, config)) {
        const normalizedA = normalizeValue(valA, colMeta, config);
        const normalizedB = normalizeValue(valB, colMeta, config);
        const wasNormalized = String(valA ?? "") !== normalizedA || String(valB ?? "") !== normalizedB;

        changes.push({
          column: colName,
          oldValue: valA,
          newValue: valB,
          wasNormalized,
        });
      }
    }

    if (changes.length > 0) {
      const keyValues: Record<string, unknown> = {};
      for (const col of config.keyColumns) {
        keyValues[col] = rowA[col];
      }
      rowChanges.push({
        type: "modified",
        keyValues,
        rowIndex: rowIdxA,
        changes,
      });
    } else {
      unchangedCount++;
    }
  }

  return {
    summary: {
      totalRowsA: fileA.rowCount,
      totalRowsB: fileB.rowCount,
      addedCount: rowChanges.filter((r) => r.type === "added").length,
      removedCount: rowChanges.filter((r) => r.type === "removed").length,
      modifiedCount: rowChanges.filter((r) => r.type === "modified").length,
      unchangedCount,
    },
    columnChanges,
    rowChanges,
    keyColumnsUsed: config.keyColumns,
    config,
  };
}
