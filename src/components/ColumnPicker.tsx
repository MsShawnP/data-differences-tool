import { useState, useEffect } from "react";
import type { ParsedFile } from "@/types";
import { detectKeyColumns } from "@/lib/column-detector";

interface ColumnPickerProps {
  fileA: ParsedFile;
  fileB: ParsedFile;
  onCompare: (keyColumns: string[], caseSensitive: boolean) => void;
}

export function ColumnPicker({ fileA, fileB, onCompare }: ColumnPickerProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [autoDetectMsg, setAutoDetectMsg] = useState<string | null>(null);

  const allColumns = fileA.columns.map((c) => c.name);

  useEffect(() => {
    handleAutoDetect();
  }, []);

  function handleAutoDetect() {
    const result = detectKeyColumns(fileA, fileB);
    if (result.detected) {
      setSelectedKeys(new Set(result.detected));
      setAutoDetectMsg(result.explanation);
    } else {
      setAutoDetectMsg(result.explanation);
    }
  }

  function toggleColumn(col: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
    setAutoDetectMsg(null);
  }

  function handleCompare() {
    if (selectedKeys.size === 0) return;
    onCompare(Array.from(selectedKeys), caseSensitive);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold text-text-primary">
          Select Key Columns
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Which column is the unique ID for each row? (e.g., Employee ID, Invoice Number, SKU.)
          We've auto-detected one below — change it if needed, then click Compare.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAutoDetect}
          className="rounded-sm border border-navy px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Auto-detect
        </button>
        {autoDetectMsg && (
          <p className="text-sm text-text-secondary">{autoDetectMsg}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {allColumns.map((col) => (
          <button
            key={col}
            onClick={() => toggleColumn(col)}
            className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
              selectedKeys.has(col)
                ? "border-navy bg-navy text-white"
                : "border-border text-text-primary hover:border-navy/40"
            }`}
          >
            {col}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={!caseSensitive}
            onChange={(e) => setCaseSensitive(!e.target.checked)}
            className="h-4 w-4 rounded-sm border-border"
          />
          Case-insensitive comparison
        </label>
      </div>

      <button
        onClick={handleCompare}
        disabled={selectedKeys.size === 0}
        className="rounded-sm bg-navy px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Compare Files
      </button>
    </div>
  );
}
