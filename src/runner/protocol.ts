// Messages exchanged between the page and the Python worker.

export type CheckResult = { name: string; passed: boolean; message: string };

export type ToWorker =
  | { type: "init"; indexURL: string; packageBaseUrl: string; harness: string }
  | { type: "run"; id: number; code: string }
  | { type: "lab"; id: number; code: string; checks: string }
  | { type: "install"; id: number; packages: string[] };

export type FromWorker =
  | { type: "ready"; pythonVersion: string }
  | { type: "init-error"; message: string }
  | { type: "stdout"; id: number; text: string }
  | { type: "stderr"; id: number; text: string }
  | { type: "checks"; id: number; results: CheckResult[] }
  | { type: "done"; id: number; ok: boolean };
