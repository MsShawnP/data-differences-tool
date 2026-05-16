import type { DiffResult } from "@/types";
import { DiffSummary } from "./DiffSummary";
import { ColumnChanges } from "./ColumnChanges";
import { RowChanges } from "./RowChanges";
import { DownloadOptions } from "./DownloadOptions";

interface DiffReportProps {
  result: DiffResult;
  onStartOver: () => void;
}

export function DiffReport({ result, onStartOver }: DiffReportProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-text-primary">
          Comparison Results
        </h2>
        <button
          onClick={onStartOver}
          className="rounded-sm border border-border px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-navy hover:text-navy"
        >
          Start Over
        </button>
      </div>

      <DiffSummary result={result} />
      <ColumnChanges changes={result.columnChanges} />
      <RowChanges changes={result.rowChanges} keyColumns={result.keyColumnsUsed} />
      <DownloadOptions result={result} />
    </div>
  );
}
