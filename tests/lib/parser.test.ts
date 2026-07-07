import { describe, it, expect } from "vitest";
import { parseFile } from "@/lib/parser";
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
