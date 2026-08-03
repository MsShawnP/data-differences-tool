// Demo golden lock for data-differences-tool.
//
// Pins the diff output for a representative before/after pair so the deployed,
// browser-local comparison cannot drift during the client-mode conversion.
import { describe, it, expect } from "vitest";
import { computeDiff } from "@/lib/differ";
import type { DiffConfig, ParsedFile } from "@/types";

function makeParsedFile(
  fileName: string,
  columns: string[],
  rows: Record<string, unknown>[]
): ParsedFile {
  return {
    fileName,
    columns: columns.map((name, index) => ({ name, detectedType: "text" as const, index })),
    rows,
    rowCount: rows.length,
  };
}

const config: DiffConfig = { keyColumns: ["id"], caseSensitive: true, numericTolerance: 1e-9 };

// A fixed before/after pair: 1 unchanged, 1 modified, 1 removed, 1 added.
const FILE_A = makeParsedFile("before.csv", ["id", "name", "amount"], [
  { id: "1", name: "Alice", amount: "100" },
  { id: "2", name: "Bob", amount: "200" },
  { id: "3", name: "Carol", amount: "300" },
]);
const FILE_B = makeParsedFile("after.csv", ["id", "name", "amount"], [
  { id: "1", name: "Alice", amount: "100" },
  { id: "2", name: "Bob", amount: "250" },
  { id: "4", name: "Dave", amount: "400" },
]);

describe("demo golden", () => {
  it("locks the summary counts for the reference pair", () => {
    const r = computeDiff(FILE_A, FILE_B, config);
    expect(r.summary.unchangedCount).toBe(1); // row 1
    expect(r.summary.modifiedCount).toBe(1); // row 2 amount 200 -> 250
    expect(r.summary.removedCount).toBe(1); // row 3 gone
    expect(r.summary.addedCount).toBe(1); // row 4 new
  });
});
