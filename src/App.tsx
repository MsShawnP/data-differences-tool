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
            Upload two spreadsheets and see exactly what changed.
          </p>
        </header>

        <main className="space-y-8">
          {state.step !== "results" && (
            <div className="flex gap-4">
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
            <div className="rounded-sm border border-red/30 bg-red/5 p-4">
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
      </div>
    </div>
    </ErrorBoundary>
  );
}
