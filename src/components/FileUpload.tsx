import { useDropzone } from "react-dropzone";
import type { ParsedFile } from "@/types";
import { parseFile } from "@/lib/parser";
import { useCallback, useState } from "react";

interface FileUploadProps {
  label: string;
  file: ParsedFile | null;
  onParsed: (file: ParsedFile) => void;
  onError: (error: string) => void;
}

export function FileUpload({ label, file, onParsed, onError }: FileUploadProps) {
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const droppedFile = acceptedFiles[0];
      if (!droppedFile) return;

      setLoading(true);
      try {
        const parsed = await parseFile(droppedFile);
        onParsed(parsed);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to parse file.");
      } finally {
        setLoading(false);
      }
    },
    [onParsed, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  return (
    <div className="flex-1">
      <p className="mb-2 text-sm font-semibold text-text-secondary">{label}</p>
      <div
        {...getRootProps()}
        className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-6 transition-colors ${
          isDragActive
            ? "border-navy bg-navy/5"
            : file
              ? "border-green/40 bg-green/5"
              : "border-border hover:border-navy/40"
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <p className="text-sm text-text-secondary">Parsing...</p>
        ) : file ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-text-primary">{file.fileName}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {file.rowCount} rows, {file.columns.length} columns
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-text-secondary">
              {isDragActive ? "Drop file here" : "Drag & drop a CSV or XLSX file"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">or click to browse</p>
          </div>
        )}
      </div>
    </div>
  );
}
