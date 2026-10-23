/// <reference lib="webworker" />
// Runs Python (Pyodide) off the main thread so a slow or endless program never
// freezes the page. The page can always kill this worker and start a new one.
import type { PyodideAPI } from "pyodide";
import type { FromWorker, ToWorker } from "./protocol";

const post = (msg: FromWorker) => self.postMessage(msg);

let pyodide: PyodideAPI | undefined;
let currentId = 0;
// Everything the current program has printed, for lab checks to inspect.
let currentOutput = "";

async function init(indexURL: string, packageBaseUrl: string, harness: string) {
  // Loaded at runtime from our own site rather than bundled by Vite.
  const { loadPyodide } = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`);
  pyodide = (await loadPyodide({ indexURL, packageBaseUrl })) as PyodideAPI;
  pyodide.setStdout({
    batched: (text) => {
      currentOutput += text + "\n";
      post({ type: "stdout", id: currentId, text: text + "\n" });
    },
  });
  pyodide.setStderr({ batched: (text) => post({ type: "stderr", id: currentId, text: text + "\n" }) });
  pyodide.FS.writeFile("/home/pyodide/labcheck.py", harness);
  const pythonVersion = pyodide.runPython("import sys; sys.version.split()[0]") as string;
  post({ type: "ready", pythonVersion });
}

async function run(id: number, code: string) {
  const { globals, error } = await execute(id, code);
  globals.destroy();
  post({ type: "done", id, ok: error === null });
}

// Runs the learner's code, then the mission's hidden checks against it.
async function lab(id: number, code: string, checks: string) {
  const { globals, error } = await execute(id, code);
  try {
    const labcheck = pyodide!.pyimport("labcheck");
    const json = labcheck.run_checks(checks, code, globals, currentOutput, error) as string;
    labcheck.destroy();
    post({ type: "checks", id, results: JSON.parse(json) });
  } catch (err) {
    post({ type: "stderr", id, text: `The checks themselves failed: ${String((err as Error).message ?? err)}` });
  } finally {
    globals.destroy();
  }
  post({ type: "done", id, ok: error === null });
}

async function execute(id: number, code: string) {
  currentId = id;
  currentOutput = "";
  // A fresh namespace per run, so one attempt never leaks into the next.
  const globals = pyodide!.globals.get("dict")();
  let error: string | null = null;
  try {
    await pyodide!.runPythonAsync(code, { globals, filename: "main.py" });
  } catch (err) {
    error = cleanTraceback(String((err as Error).message ?? err));
    post({ type: "stderr", id, text: error });
  }
  return { globals, error };
}

async function install(id: number, packages: string[]) {
  currentId = id;
  try {
    await pyodide!.loadPackage("micropip");
    const micropip = pyodide!.pyimport("micropip");
    await micropip.install(packages);
    micropip.destroy();
    post({ type: "done", id, ok: true });
  } catch (err) {
    post({ type: "stderr", id, text: String((err as Error).message ?? err) });
    post({ type: "done", id, ok: false });
  }
}

// Drop Pyodide's internal frames so learners only see their own code.
function cleanTraceback(message: string): string {
  const lines = message.split("\n");
  const start = lines.findIndex((line) => line.includes('File "main.py"'));
  if (start <= 0) return message;
  return ["Traceback (most recent call last):", ...lines.slice(start)].join("\n");
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  if (msg.type === "init") {
    init(msg.indexURL, msg.packageBaseUrl, msg.harness).catch((err) =>
      post({ type: "init-error", message: String(err?.message ?? err) }),
    );
  } else if (msg.type === "run") {
    void run(msg.id, msg.code);
  } else if (msg.type === "lab") {
    void lab(msg.id, msg.code, msg.checks);
  } else if (msg.type === "install") {
    void install(msg.id, msg.packages);
  }
};
