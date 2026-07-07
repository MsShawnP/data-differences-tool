import { describe, it, expect } from "vitest";
import { generateSummary } from "@/lib/summary-generator";
import type { DiffResult } from "@/types";

function makeDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    summary: {
      totalRowsA: 100,
      totalRowsB: 100,
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
      unchangedCount: 100,
    },
    columnChanges: [],
    rowChanges: [],
    keyColumnsUsed: ["id"],
    config: { keyColumns: ["id"], caseSensitive: true, numericTolerance: 1e-9 },
    ...overrides,
  };
}

describe("generateSummary", () => {
  it("reports identical files", () => {
    const result = makeDiffResult();
    const summary = generateSummary(result);
    expect(summary).toBe("Files are identical. No differences found.");
  });

  it("reports only additions", () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 100,
        totalRowsB: 158,
        addedCount: 58,
        removedCount: 0,
        modifiedCount: 0,
        unchangedCount: 100,
      },
      rowChanges: Array.from({ length: 58 }, (_, i) => ({
        type: "added" as const,
        keyValues: { id: String(i + 100) },
        rowIndex: i,
      })),
    });

    const summary = generateSummary(result);
    expect(summary).toBe("58 new rows added. No existing rows were modified or removed.");
  });

  it("reports only removals", () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 100,
        totalRowsB: 90,
        addedCount: 0,
        removedCount: 10,
        modifiedCount: 0,
        unchangedCount: 90,
      },
      rowChanges: Array.from({ length: 10 }, (_, i) => ({
        type: "removed" as const,
        keyValues: { id: String(i) },
        rowIndex: i,
      })),
    });

    const summary = generateSummary(result);
    expect(summary).toBe("10 rows removed. No rows were added or modified.");
  });

  it("reports mixed changes with pattern detection", () => {
    const modifiedRows = Array.from({ length: 18 }, (_, i) => ({
      type: "modified" as const,
      keyValues: { id: String(i) },
      rowIndex: i,
      changes: [
        {
          column: "status",
          oldValue: "pending",
          newValue: "approved",
          wasNormalized: false,
        },
      ],
    }));
    const otherModified = Array.from({ length: 5 }, (_, i) => ({
      type: "modified" as const,
      keyValues: { id: String(i + 100) },
      rowIndex: i + 100,
      changes: [
        {
          column: "amount",
          oldValue: "100",
          newValue: "200",
          wasNormalized: false,
        },
      ],
    }));

    const result = makeDiffResult({
      summary: {
        totalRowsA: 200,
        totalRowsB: 349,
        addedCount: 142,
        removedCount: 7,
        modifiedCount: 23,
        unchangedCount: 28,
      },
      rowChanges: [
        ...Array.from({ length: 142 }, (_, i) => ({
          type: "added" as const,
          keyValues: { id: String(i + 200) },
          rowIndex: i,
        })),
        ...Array.from({ length: 7 }, (_, i) => ({
          type: "removed" as const,
          keyValues: { id: String(i + 500) },
          rowIndex: i,
        })),
        ...modifiedRows,
        ...otherModified,
      ],
    });

    const summary = generateSummary(result);
    expect(summary).toContain("142 rows added");
    expect(summary).toContain("7 removed");
    expect(summary).toContain("23 modified");
    expect(summary).toContain("status field changed from 'pending' to 'approved' in 18 rows");
  });

  it("reports column count when modifications span multiple columns", () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 10,
        totalRowsB: 10,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 3,
        unchangedCount: 7,
      },
      rowChanges: [
        {
          type: "modified" as const,
          keyValues: { id: "1" },
          rowIndex: 0,
          changes: [
            { column: "name", oldValue: "A", newValue: "B", wasNormalized: false },
            { column: "status", oldValue: "x", newValue: "y", wasNormalized: false },
            { column: "amount", oldValue: "1", newValue: "2", wasNormalized: false },
          ],
        },
        {
          type: "modified" as const,
          keyValues: { id: "2" },
          rowIndex: 1,
          changes: [
            { column: "name", oldValue: "C", newValue: "D", wasNormalized: false },
          ],
        },
        {
          type: "modified" as const,
          keyValues: { id: "3" },
          rowIndex: 2,
          changes: [
            { column: "status", oldValue: "x", newValue: "z", wasNormalized: false },
          ],
        },
      ],
    });

    const summary = generateSummary(result);
    expect(summary).toContain("across 3 columns");
  });

  it("omits pattern clause when no clear pattern exists", () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 10,
        totalRowsB: 10,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 3,
        unchangedCount: 7,
      },
      rowChanges: [
        {
          type: "modified" as const,
          keyValues: { id: "1" },
          rowIndex: 0,
          changes: [
            { column: "value", oldValue: "a", newValue: "b", wasNormalized: false },
          ],
        },
        {
          type: "modified" as const,
          keyValues: { id: "2" },
          rowIndex: 1,
          changes: [
            { column: "value", oldValue: "c", newValue: "d", wasNormalized: false },
          ],
        },
        {
          type: "modified" as const,
          keyValues: { id: "3" },
          rowIndex: 2,
          changes: [
            { column: "value", oldValue: "e", newValue: "f", wasNormalized: false },
          ],
        },
      ],
    });

    const summary = generateSummary(result);
    // No repeated transition, so no "from X to Y" clause
    expect(summary).toContain("value field changed in 3 rows");
    expect(summary).not.toContain("from");
  });
});
