import { describe, it, expect } from "vitest";

import { normalizeValue, valuesAreEqual } from "@/lib/normalizer";
import type { ColumnMetadata, DiffConfig } from "@/types";

const numericColumn: ColumnMetadata = {
  name: "amount",
  detectedType: "number",
  index: 0,
};

const dateColumn: ColumnMetadata = {
  name: "date",
  detectedType: "date",
  index: 1,
};

const textColumn: ColumnMetadata = {
  name: "name",
  detectedType: "text",
  index: 2,
};

const textFormattedColumn: ColumnMetadata = {
  name: "code",
  detectedType: "text",
  formatString: "@",
  index: 3,
};

const defaultConfig: DiffConfig = {
  keyColumns: ["id"],
  caseSensitive: true,
  numericTolerance: 1e-9,
};

const caseInsensitiveConfig: DiffConfig = {
  keyColumns: ["id"],
  caseSensitive: false,
  numericTolerance: 1e-9,
};

describe("normalizeValue", () => {
  describe("numeric columns", () => {
    it("strips currency symbols and whitespace", () => {
      expect(normalizeValue("  $12.00 ", numericColumn, defaultConfig)).toBe("12");
    });

    it("normalizes integer strings", () => {
      expect(normalizeValue("$12", numericColumn, defaultConfig)).toBe("12");
    });

    it("strips euro symbol", () => {
      expect(normalizeValue("€100.50", numericColumn, defaultConfig)).toBe("100.5");
    });

    it("strips pound symbol", () => {
      expect(normalizeValue("£99.99", numericColumn, defaultConfig)).toBe("99.99");
    });

    it("strips leading zeros via Number()", () => {
      expect(normalizeValue("007891", numericColumn, defaultConfig)).toBe("7891");
    });

    it("strips commas in numeric strings", () => {
      expect(normalizeValue("1,234,567.89", numericColumn, defaultConfig)).toBe("1234567.89");
    });
  });

  describe("date columns", () => {
    it("normalizes YYYY-MM-DD to itself", () => {
      expect(normalizeValue("2024-01-15", dateColumn, defaultConfig)).toBe("2024-01-15");
    });

    it("normalizes MM/DD/YYYY to ISO", () => {
      expect(normalizeValue("01/15/2024", dateColumn, defaultConfig)).toBe("2024-01-15");
    });

    it("normalizes MMM D, YYYY to ISO", () => {
      expect(normalizeValue("Jan 15, 2024", dateColumn, defaultConfig)).toBe("2024-01-15");
    });

    it("normalizes MMMM D, YYYY to ISO", () => {
      expect(normalizeValue("January 15, 2024", dateColumn, defaultConfig)).toBe("2024-01-15");
    });

    it("converts Excel date serial 45306 to 2024-01-15", () => {
      expect(normalizeValue(45306, dateColumn, defaultConfig)).toBe("2024-01-15");
    });
  });

  describe("text columns", () => {
    it("trims and collapses whitespace", () => {
      expect(normalizeValue("  hello   world  ", textColumn, defaultConfig)).toBe("hello world");
    });

    it("preserves leading zeros when format is '@'", () => {
      expect(normalizeValue("007891", textFormattedColumn, defaultConfig)).toBe("007891");
    });

    it("trims text-formatted values", () => {
      expect(normalizeValue("  007891  ", textFormattedColumn, defaultConfig)).toBe("007891");
    });
  });

  describe("case sensitivity", () => {
    it("preserves case when caseSensitive is true", () => {
      expect(normalizeValue("Active", textColumn, defaultConfig)).toBe("Active");
    });

    it("lowercases when caseSensitive is false", () => {
      expect(normalizeValue("Active", textColumn, caseInsensitiveConfig)).toBe("active");
    });
  });

  describe("null/undefined/empty", () => {
    it("normalizes null to empty string", () => {
      expect(normalizeValue(null, textColumn, defaultConfig)).toBe("");
    });

    it("normalizes undefined to empty string", () => {
      expect(normalizeValue(undefined, textColumn, defaultConfig)).toBe("");
    });

    it("normalizes empty string to empty string", () => {
      expect(normalizeValue("", textColumn, defaultConfig)).toBe("");
    });
  });
});

describe("valuesAreEqual", () => {
  describe("AE1: numeric equivalence with currency and whitespace", () => {
    it("treats '  $12.00 ' and '$12' as equal in numeric column", () => {
      expect(valuesAreEqual("  $12.00 ", "$12", numericColumn, defaultConfig)).toBe(true);
    });

    it("treats values within tolerance as equal", () => {
      const config: DiffConfig = { ...defaultConfig, numericTolerance: 0.01 };
      expect(valuesAreEqual("100.001", "100.005", numericColumn, config)).toBe(true);
    });

    it("treats values outside tolerance as not equal", () => {
      expect(valuesAreEqual("100", "101", numericColumn, defaultConfig)).toBe(false);
    });
  });

  describe("AE2: leading zeros behavior", () => {
    it("treats '007891' and '7891' as NOT equal in text column with format '@'", () => {
      expect(valuesAreEqual("007891", "7891", textFormattedColumn, defaultConfig)).toBe(false);
    });

    it("treats '007891' and '7891' as equal in numeric column", () => {
      expect(valuesAreEqual("007891", "7891", numericColumn, defaultConfig)).toBe(true);
    });
  });

  describe("AE3: date normalization", () => {
    it("treats '2024-01-15' and '01/15/2024' as equal in date column", () => {
      expect(valuesAreEqual("2024-01-15", "01/15/2024", dateColumn, defaultConfig)).toBe(true);
    });

    it("treats 'Jan 15, 2024' and '2024-01-15' as equal", () => {
      expect(valuesAreEqual("Jan 15, 2024", "2024-01-15", dateColumn, defaultConfig)).toBe(true);
    });
  });

  describe("whitespace normalization", () => {
    it("treats '  hello   world  ' and 'hello world' as equal", () => {
      expect(valuesAreEqual("  hello   world  ", "hello world", textColumn, defaultConfig)).toBe(
        true
      );
    });
  });

  describe("case sensitivity", () => {
    it("treats 'Active' and 'active' as equal when caseSensitive is false", () => {
      expect(valuesAreEqual("Active", "active", textColumn, caseInsensitiveConfig)).toBe(true);
    });

    it("treats 'Active' and 'active' as NOT equal when caseSensitive is true", () => {
      expect(valuesAreEqual("Active", "active", textColumn, defaultConfig)).toBe(false);
    });
  });

  describe("null/undefined/empty equivalence", () => {
    it("treats null and undefined as equal", () => {
      expect(valuesAreEqual(null, undefined, textColumn, defaultConfig)).toBe(true);
    });

    it("treats null and empty string as equal", () => {
      expect(valuesAreEqual(null, "", textColumn, defaultConfig)).toBe(true);
    });

    it("treats undefined and empty string as equal", () => {
      expect(valuesAreEqual(undefined, "", textColumn, defaultConfig)).toBe(true);
    });

    it("treats empty and non-empty as NOT equal", () => {
      expect(valuesAreEqual(null, "hello", textColumn, defaultConfig)).toBe(false);
    });
  });

  describe("Excel date serial", () => {
    it("treats serial 45306 and '2024-01-15' as equal in date column", () => {
      expect(valuesAreEqual(45306, "2024-01-15", dateColumn, defaultConfig)).toBe(true);
    });
  });
});
