// Messages exchanged between the page and the Python worker.

export type ToWorker =
  | { type: "init"; indexURL: string; packageBaseUrl: string }
  | { type: "run"; id: number; code: string }
  | { type: "install"; id: number; packages: string[] };

export type FromWorker =
  | { type: "ready"; pythonVersion: string }
  | { type: "init-error"; message: string }
  | { type: "stdout"; id: number; text: string }
  | { type: "stderr"; id: number; text: string }
  | { type: "done"; id: number; ok: boolean };
