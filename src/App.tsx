import { FileUpload } from "@/components/FileUpload";
import { ColumnPicker } from "@/components/ColumnPicker";
import { DiffReport } from "@/components/DiffReport";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDiffWorkflow } from "@/hooks/use-diff-workflow";

export default function App() {
  const { state, setFileA, setFileB, startCompare, setError, reset } =
    useDiffWorkflow();

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto max-w-[900px] px-6 py-12">
        <header className="mb-12">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-text-primary">
            Data Differences Tool
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            See exactly what changed between two versions of a spreadsheet.
          </p>
          {state.step === "idle" && (
            <p className="mt-3 text-sm text-text-secondary">
              Month-end exports, vendor price lists, headcount files — compare the old and new version without eyeballing thousands of rows or trusting that nothing slipped. We detect the key column automatically, compare every row, and show what was added, removed, or modified, with before/after values. CSV and XLSX up to 50 MB.
            </p>
          )}
        </header>

        <main className="space-y-8">
          {state.step !== "results" && (
            <div className="flex flex-col gap-4 sm:flex-row">
              <FileUpload
                label="File A (Before)"
                file={state.fileA}
                onParsed={setFileA}
                onError={setError}
              />
              <FileUpload
                label="File B (After)"
                file={state.fileB}
                onParsed={setFileB}
                onError={setError}
              />
            </div>
          )}

          {state.step === "idle" && (
            <div className="rounded-sm border border-border bg-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Example result
              </p>
              <p className="mt-2 text-base leading-relaxed text-text-primary">
                Compared 1,204 rows by <span className="font-medium">Invoice #</span>. 12 rows added, 3 removed, 47 modified.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span><span className="font-semibold text-green">12</span> <span className="text-text-secondary">Added</span></span>
                <span><span className="font-semibold text-red">3</span> <span className="text-text-secondary">Removed</span></span>
                <span><span className="font-semibold text-amber">47</span> <span className="text-text-secondary">Modified</span></span>
                <span><span className="font-semibold text-text-secondary">1,142</span> <span className="text-text-secondary">Unchanged</span></span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">
                Invoice <span className="font-medium text-text-primary">#4021</span> — Amount <span className="text-red">1,200.00</span> → <span className="text-green">1,320.00</span>, Status <span className="text-red">Pending</span> → <span className="text-green">Paid</span>. Download the full report as Excel or CSV.
              </p>
            </div>
          )}

          {state.step === "files-uploaded" && state.fileA && state.fileB && (
            <ColumnPicker
              fileA={state.fileA}
              fileB={state.fileB}
              onCompare={startCompare}
            />
          )}

          {state.step === "computing" && (
            <div className="py-8 text-center">
              <p className="text-text-secondary">Computing differences...</p>
            </div>
          )}

          {state.step === "results" && state.result && (
            <DiffReport result={state.result} onStartOver={reset} />
          )}

          {state.step === "error" && state.error && (
            <div className="rounded-sm border border-red/30 bg-red-surface p-4">
              <p className="text-sm text-red">{state.error}</p>
              <button
                onClick={reset}
                className="mt-2 text-sm text-navy underline"
              >
                Start over
              </button>
            </div>
          )}
        </main>

        <footer className="mt-16 border-t border-border pt-6 pb-8 text-center">
          <p className="text-sm text-text-secondary">
            Built by{" "}
            <a
              href="https://lailarallc.com"
              className="text-text-secondary underline hover:text-text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lailara LLC
            </a>
          </p>
        </footer>
      </div>
    </div>
    </ErrorBoundary>
  );
}
