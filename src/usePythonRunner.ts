import { useEffect, useState } from "react";
import { PythonRunner, type RunnerStatus } from "./runner/PythonRunner";

// One Python worker for the whole page.
export function usePythonRunner() {
  const [status, setStatus] = useState<RunnerStatus>({ state: "loading" });
  const [runner, setRunner] = useState<PythonRunner>();

  useEffect(() => {
    const r = new PythonRunner(setStatus);
    setRunner(r);
    return () => r.dispose();
  }, []);

  return { runner, status };
}
