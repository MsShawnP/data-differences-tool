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
    columns: columns.map((name, index) => ({
      name,
      detectedType: "text" as const,
      index,
    })),
    rows,
    rowCount: rows.length,
  };
}

function makeNumericFile(
  fileName: string,
  columns: string[],
  rows: Record<string, unknown>[]
): ParsedFile {
  return {
    fileName,
    columns: columns.map((name, index) => ({
      name,
      detectedType: name === "id" ? "text" as const : "number" as const,
      index,
    })),
    rows,
    rowCount: rows.length,
  };
}

const defaultConfig: DiffConfig = {
  keyColumns: ["id"],
  caseSensitive: true,
  numericTolerance: 1e-9,
};

describe("computeDiff", () => {
  it("returns zero changes for identical files", () => {
    const rows = [
      { id: "1", name: "Alice", amount: "100" },
      { id: "2", name: "Bob", amount: "200" },
    ];
    const fileA = makeParsedFile("a.csv", ["id", "name", "amount"], rows);
    const fileB = makeParsedFile("b.csv", ["id", "name", "amount"], rows);

    const result = computeDiff(fileA, fileB, defaultConfig);

    expect(result.summary.addedCount).toBe(0);
    expect(result.summary.removedCount).toBe(0);
    expect(result.summary.modifiedCount).toBe(0);
    expect(result.summary.unchangedCount).toBe(2);
  });

  it("detects added rows", () => {
    const fileA = makeParsedFile("a.csv", ["id", "name"], [
      { id: "1", name: "Alice" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "name"], [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Carol" },
      { id: "4", name: "Diana" },
    ]);

    const result = computeDiff(fileA, fileB, defaultConfig);

    expect(result.summary.addedCount).toBe(3);
    expect(result.summary.unchangedCount).toBe(1);
    const addedKeys = result.rowChanges
      .filter((r) => r.type === "added")
      .map((r) => r.keyValues.id);
    expect(addedKeys).toContain("2");
    expect(addedKeys).toContain("3");
    expect(addedKeys).toContain("4");
  });

  it("detects removed rows", () => {
    const fileA = makeParsedFile("a.csv", ["id", "name"], [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Carol" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "name"], [
      { id: "1", name: "Alice" },
    ]);

    const result = computeDiff(fileA, fileB, defaultConfig);

    expect(result.summary.removedCount).toBe(2);
    expect(result.summary.unchangedCount).toBe(1);
  });

  it("detects modified rows with correct before/after values", () => {
    const fileA = makeParsedFile("a.csv", ["id", "name", "status"], [
      { id: "1", name: "Alice", status: "active" },
      { id: "2", name: "Bob", status: "active" },
      { id: "3", name: "Carol", status: "active" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "name", "status"], [
      { id: "1", name: "Alice", status: "inactive" },
      { id: "2", name: "Robert", status: "active" },
      { id: "3", name: "Carol", status: "active" },
    ]);

    const result = computeDiff(fileA, fileB, defaultConfig);

    expect(result.summary.modifiedCount).toBe(2);
    expect(result.summary.unchangedCount).toBe(1);

    const modified1 = result.rowChanges.find(
      (r) => r.type === "modified" && r.keyValues.id === "1"
    );
    expect(modified1?.changes).toHaveLength(1);
    expect(modified1?.changes?.[0]?.column).toBe("status");
    expect(modified1?.changes?.[0]?.oldValue).toBe("active");
    expect(modified1?.changes?.[0]?.newValue).toBe("inactive");

    const modified2 = result.rowChanges.find(
      (r) => r.type === "modified" && r.keyValues.id === "2"
    );
    expect(modified2?.changes).toHaveLength(1);
    expect(modified2?.changes?.[0]?.column).toBe("name");
    expect(modified2?.changes?.[0]?.oldValue).toBe("Bob");
    expect(modified2?.changes?.[0]?.newValue).toBe("Robert");
  });

  it("handles composite (multi-column) key", () => {
    const config: DiffConfig = {
      keyColumns: ["dept", "emp_id"],
      caseSensitive: true,
      numericTolerance: 1e-9,
    };

    const fileA = makeParsedFile("a.csv", ["dept", "emp_id", "salary"], [
      { dept: "eng", emp_id: "1", salary: "100k" },
      { dept: "eng", emp_id: "2", salary: "110k" },
      { dept: "sales", emp_id: "1", salary: "90k" },
    ]);
    const fileB = makeParsedFile("b.csv", ["dept", "emp_id", "salary"], [
      { dept: "eng", emp_id: "1", salary: "105k" },
      { dept: "eng", emp_id: "2", salary: "110k" },
      { dept: "sales", emp_id: "1", salary: "90k" },
    ]);

    const result = computeDiff(fileA, fileB, config);

    expect(result.summary.modifiedCount).toBe(1);
    expect(result.summary.unchangedCount).toBe(2);
    const modified = result.rowChanges.find((r) => r.type === "modified");
    expect(modified?.keyValues).toEqual({ dept: "eng", emp_id: "1" });
  });

  it("handles duplicate key values — last occurrence wins", () => {
    const fileA = makeParsedFile("a.csv", ["id", "value"], [
      { id: "1", value: "first" },
      { id: "1", value: "second" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "value"], [
      { id: "1", value: "second" },
    ]);

    const result = computeDiff(fileA, fileB, defaultConfig);

    // Last occurrence of id=1 in A is "second", which matches B
    expect(result.summary.unchangedCount).toBe(1);
    expect(result.summary.modifiedCount).toBe(0);
  });

  it("treats null/empty key values as empty-string key", () => {
    const fileA = makeParsedFile("a.csv", ["id", "name"], [
      { id: "", name: "NoId" },
      { id: "1", name: "Alice" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "name"], [
      { id: "", name: "NoId-Changed" },
      { id: "1", name: "Alice" },
    ]);

    const result = computeDiff(fileA, fileB, defaultConfig);

    expect(result.summary.modifiedCount).toBe(1);
    expect(result.summary.unchangedCount).toBe(1);
    const modified = result.rowChanges.find((r) => r.type === "modified");
    expect(modified?.keyValues.id).toBe("");
  });

  it("diffs only overlapping columns when schemas differ", () => {
    const fileA = makeParsedFile("a.csv", ["id", "name", "old_field"], [
      { id: "1", name: "Alice", old_field: "x" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "name", "new_field"], [
      { id: "1", name: "Alice", new_field: "y" },
    ]);

    const result = computeDiff(fileA, fileB, defaultConfig);

    // Only id and name overlap; old_field and new_field don't participate in row diff
    expect(result.summary.unchangedCount).toBe(1);
    expect(result.summary.modifiedCount).toBe(0);
    expect(result.columnChanges.some((c) => c.type === "removed")).toBe(true);
    expect(result.columnChanges.some((c) => c.type === "added")).toBe(true);
  });

  it("applies numeric tolerance — 12.00 vs 12 not flagged", () => {
    const fileA = makeNumericFile("a.csv", ["id", "amount"], [
      { id: "1", amount: 12.0 },
    ]);
    const fileB = makeNumericFile("b.csv", ["id", "amount"], [
      { id: "1", amount: 12 },
    ]);

    const config: DiffConfig = {
      keyColumns: ["id"],
      caseSensitive: true,
      numericTolerance: 1e-9,
    };

    const result = computeDiff(fileA, fileB, config);

    expect(result.summary.unchangedCount).toBe(1);
    expect(result.summary.modifiedCount).toBe(0);
  });

  it("applies date normalization — different formats same date not flagged", () => {
    const fileA: ParsedFile = {
      fileName: "a.csv",
      columns: [
        { name: "id", detectedType: "text", index: 0 },
        { name: "date", detectedType: "date", index: 1 },
      ],
      rows: [{ id: "1", date: "2024-01-15" }],
      rowCount: 1,
    };
    const fileB: ParsedFile = {
      fileName: "b.csv",
      columns: [
        { name: "id", detectedType: "text", index: 0 },
        { name: "date", detectedType: "date", index: 1 },
      ],
      rows: [{ id: "1", date: "01/15/2024" }],
      rowCount: 1,
    };

    const result = computeDiff(fileA, fileB, defaultConfig);

    expect(result.summary.unchangedCount).toBe(1);
    expect(result.summary.modifiedCount).toBe(0);
  });

  it("swapping A and B turns added into removed and vice versa", () => {
    const fileA = makeParsedFile("a.csv", ["id", "name"], [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "name"], [
      { id: "1", name: "Alice" },
      { id: "3", name: "Carol" },
    ]);

    const resultAB = computeDiff(fileA, fileB, defaultConfig);
    const resultBA = computeDiff(fileB, fileA, defaultConfig);

    expect(resultAB.summary.addedCount).toBe(resultBA.summary.removedCount);
    expect(resultAB.summary.removedCount).toBe(resultBA.summary.addedCount);
  });
});
