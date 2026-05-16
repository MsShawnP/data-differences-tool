import type { DiffResult } from "@/types";
import { exportToExcel, exportToCsv, triggerDownload } from "@/lib/export";
import { useState } from "react";

interface DownloadOptionsProps {
  result: DiffResult;
}

export function DownloadOptions({ result }: DownloadOptionsProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExcel() {
    setExporting(true);
    try {
      const blob = await exportToExcel(result);
      triggerDownload(blob, "diff-report.xlsx");
    } finally {
      setExporting(false);
    }
  }

  function handleCsv() {
    const blob = exportToCsv(result);
    triggerDownload(blob, "diff-report.csv");
  }

  return (
    <div className="rounded-sm border border-border bg-white p-6">
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
    </div>
  );
}
