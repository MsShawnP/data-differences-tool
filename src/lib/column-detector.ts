import type { ColumnChange, ParsedFile } from "@/types";

export interface KeyDetectionResult {
  detected: string[] | null;
  explanation: string;
  candidates: { column: string; reason: string; uniqueInBoth: boolean }[];
}

export interface ColumnMapping {
  matched: { nameA: string; nameB: string }[];
  added: string[];
  removed: string[];
  renamed: { oldName: string; newName: string; confidence: number }[];
  reordered: boolean;
}

// --- Column Analysis (U5) ---

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

function nameSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getColumnValues(rows: Record<string, unknown>[], column: string): Set<string> {
  const values = new Set<string>();
  for (const row of rows) {
    const val = row[column];
    if (val != null && val !== "") {
      values.add(String(val));
    }
  }
  return values;
}

export function analyzeColumns(fileA: ParsedFile, fileB: ParsedFile): ColumnMapping {
  const namesA = fileA.columns.map((c) => c.name);
  const namesB = fileB.columns.map((c) => c.name);

  const matched: ColumnMapping["matched"] = [];
  const unmatchedA = new Set(namesA);
  const unmatchedB = new Set(namesB);

  // Step 1: Exact name matching
  for (const name of namesA) {
    if (unmatchedB.has(name)) {
      matched.push({ nameA: name, nameB: name });
      unmatchedA.delete(name);
      unmatchedB.delete(name);
    }
  }

  // Step 2: Rename detection via combined score
  const renamed: ColumnMapping["renamed"] = [];
  const renameCandidates: { oldName: string; newName: string; score: number }[] = [];

  for (const oldName of unmatchedA) {
    const valuesA = getColumnValues(fileA.rows, oldName);
    for (const newName of unmatchedB) {
      const valuesB = getColumnValues(fileB.rows, newName);
      const nameScore = nameSimilarity(oldName, newName);
      const contentScore = jaccardSimilarity(valuesA, valuesB);
      const combined = 0.4 * nameScore + 0.6 * contentScore;
      if (combined > 0.7) {
        renameCandidates.push({ oldName, newName, score: combined });
      }
    }
  }

  // Greedy assignment: highest score first
  renameCandidates.sort((a, b) => b.score - a.score);
  const assignedA = new Set<string>();
  const assignedB = new Set<string>();

  for (const candidate of renameCandidates) {
    if (assignedA.has(candidate.oldName) || assignedB.has(candidate.newName)) continue;
    renamed.push({
      oldName: candidate.oldName,
      newName: candidate.newName,
      confidence: candidate.score,
    });
    assignedA.add(candidate.oldName);
    assignedB.add(candidate.newName);
    unmatchedA.delete(candidate.oldName);
    unmatchedB.delete(candidate.newName);
  }

  // Step 3: Remaining unmatched are added/removed
  const removed = Array.from(unmatchedA);
  const added = Array.from(unmatchedB);

  // Step 4: Reorder detection — compare index positions of matched columns
  let reordered = false;
  const indexMapA = new Map(fileA.columns.map((c) => [c.name, c.index]));
  const indexMapB = new Map(fileB.columns.map((c) => [c.name, c.index]));

  const matchedPairs = [...matched, ...renamed.map((r) => ({ nameA: r.oldName, nameB: r.newName }))];
  for (let i = 0; i < matchedPairs.length - 1; i++) {
    const pairI = matchedPairs[i]!;
    const pairJ = matchedPairs[i + 1]!;
    const orderA = (indexMapA.get(pairI.nameA) ?? 0) < (indexMapA.get(pairJ.nameA) ?? 0);
    const orderB = (indexMapB.get(pairI.nameB) ?? 0) < (indexMapB.get(pairJ.nameB) ?? 0);
    if (orderA !== orderB) {
      reordered = true;
      break;
    }
  }

  return { matched, added, removed, renamed, reordered };
}

export function buildColumnChanges(mapping: ColumnMapping, fileA: ParsedFile, fileB: ParsedFile): ColumnChange[] {
  const changes: ColumnChange[] = [];
  const indexMapA = new Map(fileA.columns.map((c) => [c.name, c.index]));
  const indexMapB = new Map(fileB.columns.map((c) => [c.name, c.index]));

  for (const name of mapping.added) {
    changes.push({ type: "added", columnName: name });
  }
  for (const name of mapping.removed) {
    changes.push({ type: "removed", columnName: name });
  }
  for (const r of mapping.renamed) {
    changes.push({
      type: "renamed",
      columnName: r.newName,
      details: {
        oldName: r.oldName,
        newName: r.newName,
        confidence: r.confidence,
      },
    });
  }
  if (mapping.reordered) {
    changes.push({
      type: "reordered",
      columnName: "(columns reordered)",
      details: {
        oldIndex: indexMapA.get(fileA.columns[0]?.name ?? "") ?? 0,
        newIndex: indexMapB.get(fileB.columns[0]?.name ?? "") ?? 0,
      },
    });
  }
  return changes;
}

// --- Key Column Detection (U7) ---

/**
 * Check whether all values in a given column are unique across the rows.
 * Treats stringified values so that 1 and "1" are considered the same.
 */
function hasUniqueValues(
  rows: Record<string, unknown>[],
  column: string
): boolean {
  const seen = new Set<string>();
  for (const row of rows) {
    const val = String(row[column] ?? "");
    if (seen.has(val)) return false;
    seen.add(val);
  }
  return rows.length > 0;
}

/**
 * Automatically detect likely key columns by inspecting column names and
 * value uniqueness in both files.
 *
 * Priority order:
 * 1. Column named exactly "id" (case-insensitive)
 * 2. Columns matching the *_id pattern (case-insensitive)
 * 3. Column named "key" (case-insensitive)
 * 4. First column with all-unique values in both files
 */
export function detectKeyColumns(
  fileA: ParsedFile,
  fileB: ParsedFile
): KeyDetectionResult {
  const candidates: KeyDetectionResult["candidates"] = [];
  const columnNames = fileA.columns.map((c) => c.name);

  // Helper: test a column and record it as a candidate
  function testCandidate(
    column: string,
    reason: string
  ): { column: string; reason: string; uniqueInBoth: boolean } {
    const uniqueA = hasUniqueValues(fileA.rows, column);
    const uniqueB = hasUniqueValues(fileB.rows, column);
    const uniqueInBoth = uniqueA && uniqueB;
    const candidate = { column, reason, uniqueInBoth };
    candidates.push(candidate);
    return candidate;
  }

  // 1. Look for column named exactly "id" (case-insensitive)
  const idColumn = columnNames.find((n) => n.toLowerCase() === "id");
  if (idColumn) {
    const result = testCandidate(idColumn, 'Column named "id"');
    if (result.uniqueInBoth) {
      return {
        detected: [idColumn],
        explanation: `Detected '${idColumn}' as key — all values unique in both files`,
        candidates,
      };
    }
  }

  // 2. Look for columns matching *_id pattern (case-insensitive)
  const idSuffixColumns = columnNames.filter((n) =>
    /_id$/i.test(n)
  );
  for (const col of idSuffixColumns) {
    const result = testCandidate(col, "Column name matches *_id pattern");
    if (result.uniqueInBoth) {
      return {
        detected: [col],
        explanation: `Detected '${col}' as key — all values unique in both files`,
        candidates,
      };
    }
  }

  // 3. Look for column named "key" (case-insensitive)
  const keyColumn = columnNames.find((n) => n.toLowerCase() === "key");
  if (keyColumn) {
    const result = testCandidate(keyColumn, 'Column named "key"');
    if (result.uniqueInBoth) {
      return {
        detected: [keyColumn],
        explanation: `Detected '${keyColumn}' as key — all values unique in both files`,
        candidates,
      };
    }
  }

  // 4. Fall back to first column with all-unique values in both files
  for (const col of columnNames) {
    // Skip columns we already tested
    if (candidates.some((c) => c.column === col)) continue;

    const result = testCandidate(col, "First column with unique values");
    if (result.uniqueInBoth) {
      return {
        detected: [col],
        explanation: `Detected '${col}' as key — all values unique in both files`,
        candidates,
      };
    }
  }

  // No valid key found
  return {
    detected: null,
    explanation:
      "No column with unique values found in both files. Please select key columns manually.",
    candidates,
  };
}
