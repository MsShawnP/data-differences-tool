import type { CellDiff, DiffConfig, DiffResult, ParsedFile, RowChange } from "@/types";
import { analyzeColumns, buildColumnChanges } from "@/lib/column-detector";
import { valuesAreEqual, normalizeValue } from "@/lib/normalizer";

const KEY_SEPARATOR = "\x00";

function buildCompositeKey(
  row: Record<string, unknown>,
  keyColumns: string[],
  columnMeta: Map<string, { detectedType: string }>,
  config: DiffConfig
): string {
  return keyColumns
    .map((col) => {
      const val = row[col];
      if (val == null || val === "") return "";
      const meta = columnMeta.get(col) ?? { name: col, detectedType: "text" as const, index: 0 };
      const normalized = normalizeValue(val, meta as any, config);
      return config.caseSensitive ? normalized : normalized.toLowerCase();
    })
    .join(KEY_SEPARATOR);
}

function buildRowIndex(
  rows: Record<string, unknown>[],
  keyColumns: string[],
  columnMeta: Map<string, { detectedType: string }>,
  config: DiffConfig
): { index: Map<string, number>; duplicates: Map<string, number[]> } {
  const index = new Map<string, number>();
  const duplicates = new Map<string, number[]>();

  for (let i = 0; i < rows.length; i++) {
    const key = buildCompositeKey(rows[i]!, keyColumns, columnMeta, config);
    if (index.has(key)) {
      if (!duplicates.has(key)) {
        duplicates.set(key, [index.get(key)!]);
      }
      duplicates.get(key)!.push(i);
    }
    index.set(key, i);
  }
  return { index, duplicates };
}

export function computeDiff(
  fileA: ParsedFile,
  fileB: ParsedFile,
  config: DiffConfig
): DiffResult {
  const columnMapping = analyzeColumns(fileA, fileB);
  const columnChanges = buildColumnChanges(columnMapping, fileA, fileB);
  const warnings: string[] = [];

  // Build column pairs for comparison: exact matches + renamed pairs
  const comparisonColumns: { nameA: string; nameB: string }[] = [
    ...columnMapping.matched,
    ...columnMapping.renamed.map((r) => ({ nameA: r.oldName, nameB: r.newName })),
  ];

  const colMetaMapA = new Map(fileA.columns.map((c) => [c.name, c]));
  const colMetaMapB = new Map(fileB.columns.map((c) => [c.name, c]));

  const { index: indexA, duplicates: dupsA } = buildRowIndex(
    fileA.rows, config.keyColumns, colMetaMapA as any, config
  );
  const { index: indexB, duplicates: dupsB } = buildRowIndex(
    fileB.rows, config.keyColumns, colMetaMapB as any, config
  );

  if (dupsA.size > 0) {
    const count = Array.from(dupsA.values()).reduce((sum, arr) => sum + arr.length, 0);
    warnings.push(`File A has ${count} rows with duplicate key values (${dupsA.size} distinct keys). Only the last occurrence of each is compared.`);
  }
  if (dupsB.size > 0) {
    const count = Array.from(dupsB.values()).reduce((sum, arr) => sum + arr.length, 0);
    warnings.push(`File B has ${count} rows with duplicate key values (${dupsB.size} distinct keys). Only the last occurrence of each is compared.`);
  }

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
      rowChanges.push({ type: "removed", keyValues, rowIndex: rowIdx });
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
      rowChanges.push({ type: "added", keyValues, rowIndex: rowIdx });
    }
  }

  // Find modified rows (in both, compare overlapping + renamed columns)
  for (const [key, rowIdxA] of indexA) {
    const rowIdxB = indexB.get(key);
    if (rowIdxB === undefined) continue;

    const rowA = fileA.rows[rowIdxA]!;
    const rowB = fileB.rows[rowIdxB]!;
    const changes: CellDiff[] = [];

    for (const { nameA, nameB } of comparisonColumns) {
      if (config.keyColumns.includes(nameA)) continue;

      const colMeta = colMetaMapA.get(nameA) ?? {
        name: nameA,
        detectedType: "text" as const,
        index: 0,
      };

      const valA = rowA[nameA];
      const valB = rowB[nameB];

      if (!valuesAreEqual(valA, valB, colMeta, config)) {
        const normalizedA = normalizeValue(valA, colMeta, config);
        const normalizedB = normalizeValue(valB, colMeta, config);
        const wasNormalized = String(valA ?? "") !== normalizedA || String(valB ?? "") !== normalizedB;

        changes.push({
          column: nameA !== nameB ? `${nameA} → ${nameB}` : nameA,
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
      rowChanges.push({ type: "modified", keyValues, rowIndex: rowIdxA, changes });
    } else {
      unchangedCount++;
    }
  }

  // Reconcile raw row counts against distinct-key counts. Duplicate keys (and
  // blank keys, which collapse into a single "" bucket) drop rows from the
  // comparison, so added/removed/modified can all be 0 even when the files
  // differ. Surfacing the excluded count keeps an "identical" verdict honest.
  const distinctKeysA = indexA.size;
  const distinctKeysB = indexB.size;
  const excludedRowCount =
    (fileA.rows.length - distinctKeysA) + (fileB.rows.length - distinctKeysB);

  return {
    summary: {
      totalRowsA: fileA.rowCount,
      totalRowsB: fileB.rowCount,
      addedCount: rowChanges.filter((r) => r.type === "added").length,
      removedCount: rowChanges.filter((r) => r.type === "removed").length,
      modifiedCount: rowChanges.filter((r) => r.type === "modified").length,
      unchangedCount,
      distinctKeysA,
      distinctKeysB,
      excludedRowCount,
    },
    columnChanges,
    rowChanges,
    keyColumnsUsed: config.keyColumns,
    config,
    warnings,
  };
}
