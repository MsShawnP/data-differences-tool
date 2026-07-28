import type { DiffResult } from "@/types";
import { exportToExcel, exportToCsv, triggerDownload } from "@/lib/export";
import { useState } from "react";

interface DownloadOptionsProps {
  result: DiffResult;
}

export function DownloadOptions({ result }: DownloadOptionsProps) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExcel() {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportToExcel(result);
      triggerDownload(blob, "diff-report.xlsx");
    } catch {
      // ErrorBoundary can't catch async event-handler rejections, so surface
      // the failure inline instead of leaving the button silently dead.
      setExportError("Couldn't generate the Excel file. Try the CSV download.");
    } finally {
      setExporting(false);
    }
  }

  function handleCsv() {
    setExportError(null);
    try {
      const blob = exportToCsv(result);
      triggerDownload(blob, "diff-report.csv");
    } catch {
      setExportError("Couldn't generate the CSV file.");
    }
  }

  return (
    <div className="rounded-sm border border-border bg-surface p-6">
      <h3 className="mb-3 font-serif text-lg font-bold text-text-primary">
        Download Report
      </h3>
      <div className="flex gap-3">
        <button
          onClick={handleExcel}
          disabled={exporting}
          className="rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:opacity-60"
        >
          {exporting ? "Generating..." : "Download Excel"}
        </button>
        <button
          onClick={handleCsv}
          className="rounded-sm border border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Download CSV
        </button>
      </div>
      {exportError && (
        <p className="mt-3 text-sm text-red" role="alert">
          {exportError}
        </p>
      )}
    </div>
  );
}
