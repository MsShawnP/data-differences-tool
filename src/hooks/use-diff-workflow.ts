import { useReducer, useCallback } from "react";
import type { DiffConfig, DiffResult, ParsedFile, WorkflowState, WorkflowStep } from "@/types";
import { computeDiff } from "@/lib/differ";

type Action =
  | { type: "SET_FILE_A"; payload: ParsedFile }
  | { type: "SET_FILE_B"; payload: ParsedFile }
  | { type: "START_COMPARE"; payload: { keyColumns: string[]; caseSensitive: boolean } }
  | { type: "DIFF_COMPLETE"; payload: DiffResult }
  | { type: "ERROR"; payload: string }
  | { type: "RESET" };

function getStep(state: Omit<WorkflowState, "step">): WorkflowStep {
  if (state.error) return "error";
  if (state.result) return "results";
  if (state.config) return "computing";
  if (state.fileA && state.fileB) return "files-uploaded";
  return "idle";
}

function reducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case "SET_FILE_A": {
      const next = { ...state, fileA: action.payload, error: null };
      return { ...next, step: getStep(next) };
    }
    case "SET_FILE_B": {
      const next = { ...state, fileB: action.payload, error: null };
      return { ...next, step: getStep(next) };
    }
    case "START_COMPARE": {
      const config: DiffConfig = {
        keyColumns: action.payload.keyColumns,
        caseSensitive: action.payload.caseSensitive,
        numericTolerance: 1e-9,
      };
      return { ...state, config, step: "computing", error: null };
    }
    case "DIFF_COMPLETE": {
      return { ...state, result: action.payload, step: "results" };
    }
    case "ERROR": {
      return { ...state, error: action.payload, step: "error" };
    }
    case "RESET": {
      return initialState;
    }
  }
}

const initialState: WorkflowState = {
  step: "idle",
  fileA: null,
  fileB: null,
  config: null,
  result: null,
  error: null,
};

export function useDiffWorkflow() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setFileA = useCallback((file: ParsedFile) => {
    dispatch({ type: "SET_FILE_A", payload: file });
  }, []);

  const setFileB = useCallback((file: ParsedFile) => {
    dispatch({ type: "SET_FILE_B", payload: file });
  }, []);

  const startCompare = useCallback(
    (keyColumns: string[], caseSensitive: boolean) => {
      if (!state.fileA || !state.fileB) return;

      dispatch({ type: "START_COMPARE", payload: { keyColumns, caseSensitive } });

      try {
        const config: DiffConfig = {
          keyColumns,
          caseSensitive,
          numericTolerance: 1e-9,
        };
        const result = computeDiff(state.fileA, state.fileB, config);
        dispatch({ type: "DIFF_COMPLETE", payload: result });
      } catch (err) {
        dispatch({
          type: "ERROR",
          payload: err instanceof Error ? err.message : "Diff computation failed.",
        });
      }
    },
    [state.fileA, state.fileB]
  );

  const setError = useCallback((error: string) => {
    dispatch({ type: "ERROR", payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    setFileA,
    setFileB,
    startCompare,
    setError,
    reset,
  };
}
