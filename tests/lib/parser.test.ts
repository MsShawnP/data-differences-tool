import { describe, it, expect } from "vitest";
import { parseFile, assertDeclaredCellsWithinLimit } from "@/lib/parser";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Helper: create a File object from a local fixture path.
 * In Node/vitest we use the global File constructor (available via jsdom or happy-dom)
 * or fall back to a Blob-based shim.
 */
function fixtureFile(relativePath: string, mimeType = "text/csv"): File {
  const absolute = resolve(__dirname, "../fixtures", relativePath);
  const buffer = readFileSync(absolute);
  return new File([buffer], relativePath, { type: mimeType });
}

describe("parseFile", () => {
  it("parses a simple 3-column CSV with headers into correct ParsedFile structure", async () => {
    const file = fixtureFile("simple-a.csv");
    const result = await parseFile(file);

    expect(result.fileName).toBe("simple-a.csv");
    expect(result.rowCount).toBe(3);
    expect(result.rows).toHaveLength(3);

    // Column metadata
    expect(result.columns).toHaveLength(3);
    expect(result.columns[0]?.name).toBe("id");
    expect(result.columns[1]?.name).toBe("name");
    expect(result.columns[2]?.name).toBe("amount");

    // Type detection: id and amount are numeric, name is text
    expect(result.columns[0]?.detectedType).toBe("number");
    expect(result.columns[1]?.detectedType).toBe("text");
    expect(result.columns[2]?.detectedType).toBe("number");

    // Row data spot check
    expect(result.rows[0]).toMatchObject({ id: 1, name: "Alice", amount: 100.5 });
    expect(result.rows[2]).toMatchObject({ id: 3, name: "Charlie", amount: 300 });
  });

  it("detects mixed-type columns as text", async () => {
    // CSV with a column that has both numbers and strings
    const csvContent = "id,value\n1,hello\n2,42\n3,world\n";
    const file = new File([csvContent], "mixed.csv", { type: "text/csv" });
    const result = await parseFile(file);

    expect(result.columns).toHaveLength(2);
    // "value" column has strings and numbers mixed → should be text
    expect(result.columns[1]?.name).toBe("value");
    expect(result.columns[1]?.detectedType).toBe("text");
  });

  it("detects a mixed-type column when the off-type values appear past row 100", async () => {
    // Type detection used to sample the first 100 data rows, so a column that
    // is uniform through row 100 and mixed below it was typed for the whole
    // file from its first hundred values.
    const rows = Array.from({ length: 120 }, (_, i) => `${i + 1},${1000 + i}`);
    rows.push("121,N/A");
    const csvContent = `id,code\n${rows.join("\n")}\n`;
    const file = new File([csvContent], "late-mixed.csv", { type: "text/csv" });
    const result = await parseFile(file);

    expect(result.rowCount).toBe(121);
    expect(result.columns[1]?.name).toBe("code");
    expect(result.columns[1]?.detectedType).toBe("text");
  });

  it("names a blank-header column to match its row key so its values compare", async () => {
    // Middle column has no header. SheetJS keys its values as "__EMPTY";
    // the column metadata name must match, or the column never compares.
    const csvContent = "id,,amount\n1,foo,100\n2,bar,200\n";
    const file = new File([csvContent], "blank-header.csv", { type: "text/csv" });
    const result = await parseFile(file);

    expect(result.columns).toHaveLength(3);
    const blankCol = result.columns[1]!;
    expect(blankCol.name).toBe("__EMPTY");
    // The metadata name is an actual key on the row object (not undefined).
    expect(result.rows[0]![blankCol.name]).toBe("foo");
    // Every column name resolves to a real value on the first row.
    for (const col of result.columns) {
      expect(result.rows[0]![col.name]).toBeDefined();
    }
  });

  it("disambiguates duplicate header columns to match their row keys", async () => {
    // Two "name" columns. SheetJS keys the second as "name_1".
    const csvContent = "id,name,name\n1,Alice,Smith\n";
    const file = new File([csvContent], "dup-header.csv", { type: "text/csv" });
    const result = await parseFile(file);

    expect(result.columns).toHaveLength(3);
    expect(result.columns[1]?.name).toBe("name");
    expect(result.columns[2]?.name).toBe("name_1");
    // Both distinct keys are present on the row, so both columns compare.
    expect(result.rows[0]!["name"]).toBe("Alice");
    expect(result.rows[0]!["name_1"]).toBe("Smith");
  });

  it("rejects a declared range whose cell count is a decompression-bomb size", () => {
    // A tiny (zip-compressed) file can declare an enormous used range; parsing
    // it would materialize hundreds of millions of cells and freeze the tab.
    // The full XFD1048576 grid is ~17 billion cells, far over the limit.
    const bombRange = { s: { r: 0, c: 0 }, e: { r: 1_048_575, c: 16_383 } };
    expect(() => assertDeclaredCellsWithinLimit(bombRange, "bomb.xlsx")).toThrow(
      /too large to process/
    );
  });

  it("accepts a declared range of ordinary size", () => {
    // 1,000 rows x 50 columns = 50,000 cells — well within the limit.
    const okRange = { s: { r: 0, c: 0 }, e: { r: 999, c: 49 } };
    expect(() => assertDeclaredCellsWithinLimit(okRange, "ok.csv")).not.toThrow();
  });

  it("returns ParsedFile with zero rows and correct column names for headers-only file", async () => {
    const csvContent = "col_a,col_b,col_c\n";
    const file = new File([csvContent], "empty.csv", { type: "text/csv" });
    const result = await parseFile(file);

    expect(result.fileName).toBe("empty.csv");
    expect(result.rowCount).toBe(0);
    expect(result.rows).toHaveLength(0);

    expect(result.columns).toHaveLength(3);
    expect(result.columns[0]?.name).toBe("col_a");
    expect(result.columns[1]?.name).toBe("col_b");
    expect(result.columns[2]?.name).toBe("col_c");

    // No data rows → type should be unknown
    expect(result.columns[0]?.detectedType).toBe("unknown");
    expect(result.columns[1]?.detectedType).toBe("unknown");
    expect(result.columns[2]?.detectedType).toBe("unknown");
  });
});
