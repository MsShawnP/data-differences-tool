import { describe, it, expect } from "vitest";
import { detectKeyColumns, analyzeColumns } from "@/lib/column-detector";
import type { ParsedFile } from "@/types";

function makeParsedFile(
  columns: string[],
  rows: Record<string, unknown>[]
): ParsedFile {
  return {
    fileName: "test.csv",
    columns: columns.map((name, index) => ({
      name,
      detectedType: "text" as const,
      index,
    })),
    rows,
    rowCount: rows.length,
  };
}

describe("analyzeColumns", () => {
  it("returns all columns as matched when schemas are identical", () => {
    const fileA = makeParsedFile(["id", "name", "amount"], [
      { id: "1", name: "Alice", amount: "100" },
    ]);
    const fileB = makeParsedFile(["id", "name", "amount"], [
      { id: "1", name: "Alice", amount: "100" },
    ]);

    const result = analyzeColumns(fileA, fileB);

    expect(result.matched).toHaveLength(3);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.renamed).toHaveLength(0);
    expect(result.reordered).toBe(false);
  });

  it("detects added and removed columns", () => {
    const fileA = makeParsedFile(["id", "name", "old_col"], [
      { id: "1", name: "Alice", old_col: "x" },
    ]);
    const fileB = makeParsedFile(["id", "name", "new_col"], [
      { id: "1", name: "Alice", new_col: "y" },
    ]);

    const result = analyzeColumns(fileA, fileB);

    expect(result.matched).toHaveLength(2);
    expect(result.removed).toContain("old_col");
    expect(result.added).toContain("new_col");
  });

  it("detects renamed columns via name + content similarity", () => {
    const rows = [
      { employee_name: "Alice", id: "1" },
      { employee_name: "Bob", id: "2" },
      { employee_name: "Carol", id: "3" },
    ];
    const fileA = makeParsedFile(["id", "employee_name"], rows);
    const fileB = makeParsedFile(["id", "emp_name"], [
      { emp_name: "Alice", id: "1" },
      { emp_name: "Bob", id: "2" },
      { emp_name: "Carol", id: "3" },
    ]);

    const result = analyzeColumns(fileA, fileB);

    expect(result.renamed).toHaveLength(1);
    expect(result.renamed[0]!.oldName).toBe("employee_name");
    expect(result.renamed[0]!.newName).toBe("emp_name");
    expect(result.renamed[0]!.confidence).toBeGreaterThan(0.7);
  });

  it("does not rename columns with low similarity", () => {
    const fileA = makeParsedFile(["id", "revenue"], [
      { id: "1", revenue: "1000" },
      { id: "2", revenue: "2000" },
    ]);
    const fileB = makeParsedFile(["id", "category"], [
      { id: "1", category: "electronics" },
      { id: "2", category: "clothing" },
    ]);

    const result = analyzeColumns(fileA, fileB);

    expect(result.renamed).toHaveLength(0);
    expect(result.removed).toContain("revenue");
    expect(result.added).toContain("category");
  });

  it("detects column reordering", () => {
    const fileA = makeParsedFile(["id", "name", "amount"], [
      { id: "1", name: "Alice", amount: "100" },
    ]);
    const fileB = makeParsedFile(["amount", "id", "name"], [
      { id: "1", name: "Alice", amount: "100" },
    ]);

    const result = analyzeColumns(fileA, fileB);

    expect(result.matched).toHaveLength(3);
    expect(result.reordered).toBe(true);
  });

  it("does not flag reorder when column order is preserved", () => {
    const fileA = makeParsedFile(["id", "name"], [
      { id: "1", name: "Alice" },
    ]);
    const fileB = makeParsedFile(["id", "name", "extra"], [
      { id: "1", name: "Alice", extra: "x" },
    ]);

    const result = analyzeColumns(fileA, fileB);

    expect(result.reordered).toBe(false);
  });
});

describe("detectKeyColumns", () => {
  it("detects column named 'id' with unique values", () => {
    const fileA = makeParsedFile(["id", "name", "value"], [
      { id: "1", name: "Alice", value: "100" },
      { id: "2", name: "Bob", value: "200" },
      { id: "3", name: "Carol", value: "300" },
    ]);
    const fileB = makeParsedFile(["id", "name", "value"], [
      { id: "1", name: "Alice", value: "150" },
      { id: "2", name: "Bob", value: "250" },
      { id: "3", name: "Carol", value: "350" },
    ]);

    const result = detectKeyColumns(fileA, fileB);

    expect(result.detected).toEqual(["id"]);
    expect(result.explanation).toContain("id");
    expect(result.explanation).toContain("unique");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].uniqueInBoth).toBe(true);
  });

  it("detects column matching *_id pattern with unique values", () => {
    const fileA = makeParsedFile(["order_id", "customer", "total"], [
      { order_id: "ORD-001", customer: "Acme", total: "500" },
      { order_id: "ORD-002", customer: "Beta", total: "750" },
      { order_id: "ORD-003", customer: "Acme", total: "200" },
    ]);
    const fileB = makeParsedFile(["order_id", "customer", "total"], [
      { order_id: "ORD-001", customer: "Acme", total: "510" },
      { order_id: "ORD-002", customer: "Beta", total: "760" },
      { order_id: "ORD-003", customer: "Acme", total: "210" },
    ]);

    const result = detectKeyColumns(fileA, fileB);

    expect(result.detected).toEqual(["order_id"]);
    expect(result.explanation).toContain("order_id");
    expect(result.candidates[0].reason).toContain("*_id");
  });

  it("falls back to first column with unique values when no name matches", () => {
    const fileA = makeParsedFile(["code", "label", "amount"], [
      { code: "A1", label: "foo", amount: "10" },
      { code: "A2", label: "bar", amount: "20" },
      { code: "A3", label: "foo", amount: "30" },
    ]);
    const fileB = makeParsedFile(["code", "label", "amount"], [
      { code: "A1", label: "foo", amount: "15" },
      { code: "A2", label: "bar", amount: "25" },
      { code: "A3", label: "baz", amount: "35" },
    ]);

    const result = detectKeyColumns(fileA, fileB);

    expect(result.detected).toEqual(["code"]);
    expect(result.explanation).toContain("code");
    expect(result.explanation).toContain("unique");
    expect(result.candidates.some((c) => c.column === "code")).toBe(true);
  });

  it("returns null when no column has unique values in both files", () => {
    const fileA = makeParsedFile(["category", "value"], [
      { category: "A", value: "10" },
      { category: "A", value: "20" },
      { category: "B", value: "30" },
    ]);
    const fileB = makeParsedFile(["category", "value"], [
      { category: "A", value: "10" },
      { category: "B", value: "10" },
      { category: "B", value: "30" },
    ]);

    const result = detectKeyColumns(fileA, fileB);

    expect(result.detected).toBeNull();
    expect(result.explanation).toContain("manually");
    expect(result.candidates.every((c) => !c.uniqueInBoth)).toBe(true);
  });

  it("skips 'id' column with duplicates and tries next heuristic", () => {
    const fileA = makeParsedFile(["id", "employee_id", "name"], [
      { id: "1", employee_id: "EMP-001", name: "Alice" },
      { id: "1", employee_id: "EMP-002", name: "Bob" },
      { id: "2", employee_id: "EMP-003", name: "Carol" },
    ]);
    const fileB = makeParsedFile(["id", "employee_id", "name"], [
      { id: "1", employee_id: "EMP-001", name: "Alice" },
      { id: "1", employee_id: "EMP-002", name: "Robert" },
      { id: "2", employee_id: "EMP-003", name: "Carol" },
    ]);

    const result = detectKeyColumns(fileA, fileB);

    // Should skip "id" (has duplicates) and detect "employee_id"
    expect(result.detected).toEqual(["employee_id"]);
    expect(result.explanation).toContain("employee_id");
    // "id" should appear in candidates as non-unique
    const idCandidate = result.candidates.find((c) => c.column === "id");
    expect(idCandidate).toBeDefined();
    expect(idCandidate!.uniqueInBoth).toBe(false);
  });

  it("handles case-insensitive 'ID' column name", () => {
    const fileA = makeParsedFile(["ID", "Status"], [
      { ID: "X1", Status: "active" },
      { ID: "X2", Status: "inactive" },
    ]);
    const fileB = makeParsedFile(["ID", "Status"], [
      { ID: "X1", Status: "inactive" },
      { ID: "X2", Status: "active" },
    ]);

    const result = detectKeyColumns(fileA, fileB);

    expect(result.detected).toEqual(["ID"]);
  });

  it("detects column named 'key' when id-pattern columns have duplicates", () => {
    const fileA = makeParsedFile(["ref_id", "key", "amount"], [
      { ref_id: "R1", key: "K001", amount: "100" },
      { ref_id: "R1", key: "K002", amount: "200" },
      { ref_id: "R2", key: "K003", amount: "300" },
    ]);
    const fileB = makeParsedFile(["ref_id", "key", "amount"], [
      { ref_id: "R1", key: "K001", amount: "110" },
      { ref_id: "R1", key: "K002", amount: "210" },
      { ref_id: "R2", key: "K003", amount: "310" },
    ]);

    const result = detectKeyColumns(fileA, fileB);

    // ref_id has duplicates, so it falls through to "key"
    expect(result.detected).toEqual(["key"]);
    expect(result.explanation).toContain("key");
    const refCandidate = result.candidates.find((c) => c.column === "ref_id");
    expect(refCandidate).toBeDefined();
    expect(refCandidate!.uniqueInBoth).toBe(false);
  });
});
