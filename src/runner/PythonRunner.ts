import type { CheckResult, FromWorker, ToWorker } from "./protocol";
import harness from "./labcheck.py?raw";

export const PYODIDE_VERSION = "314.0.7";
const PACKAGE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export type RunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  /** The run was killed because it went past its time limit. */
  timedOut: boolean;
  /** The run was killed by stop(). */
  stopped: boolean;
  /** Lab runs only: one result per hidden check (missing if the run was killed). */
  checks?: CheckResult[];
};

export type RunnerStatus =
  | { state: "loading" }
  | { state: "ready"; pythonVersion: string }
  | { state: "error"; message: string };

type Pending = {
  id: number;
  stdout: string;
  stderr: string;
  checks?: CheckResult[];
  onOutput?: (text: string, stream: "stdout" | "stderr") => void;
  resolve: (result: RunResult) => void;
  timer?: ReturnType<typeof setTimeout>;
};

/**
 * Owns the Python worker. Only one program runs at a time; stop() or a
 * time-out kills the worker and starts a fresh one, which is the only
 * reliable way to end an infinite loop.
 */
export class PythonRunner {
  private worker!: Worker;
  private ready!: Promise<void>;
  private pending?: Pending;
  private nextId = 1;

  constructor(private onStatus: (status: RunnerStatus) => void = () => {}) {
    this.start();
  }

  run(code: string, opts: { timeoutMs?: number; onOutput?: Pending["onOutput"] } = {}): Promise<RunResult> {
    return this.send({ type: "run", id: this.nextId++, code }, opts.timeoutMs ?? 5000, opts.onOutput);
  }

  /** Runs the learner's code, then the mission's checks.py against it. */
  lab(code: string, checks: string, opts: { timeoutMs?: number; onOutput?: Pending["onOutput"] } = {}): Promise<RunResult> {
    return this.send({ type: "lab", id: this.nextId++, code, checks }, opts.timeoutMs ?? 5000, opts.onOutput);
  }

  install(packages: string[], onOutput?: Pending["onOutput"]): Promise<RunResult> {
    return this.send({ type: "install", id: this.nextId++, packages }, 180_000, onOutput);
  }

  stop() {
    this.restart({ stopped: true, timedOut: false });
  }

  /** Shuts the worker down for good (e.g. when the page unmounts). */
  dispose() {
    clearTimeout(this.pending?.timer);
    this.pending = undefined;
    this.worker.terminate();
  }

  private start() {
    this.onStatus({ state: "loading" });
    this.worker = new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
    this.ready = new Promise((resolve, reject) => {
      this.worker.onmessage = (event: MessageEvent<FromWorker>) => {
        const msg = event.data;
        if (msg.type === "ready") {
          this.onStatus({ state: "ready", pythonVersion: msg.pythonVersion });
          resolve();
        } else if (msg.type === "init-error") {
          this.onStatus({ state: "error", message: msg.message });
          reject(new Error(msg.message));
        } else {
          this.handle(msg);
        }
      };
    });
    this.ready.catch(() => {});
    const indexURL = new URL("pyodide/", document.baseURI).href;
    this.post({ type: "init", indexURL, packageBaseUrl: PACKAGE_CDN, harness });
  }

  private async send(msg: ToWorker & { id: number }, timeoutMs: number, onOutput?: Pending["onOutput"]) {
    if (this.pending) throw new Error("Python is already running something");
    await this.ready;
    return new Promise<RunResult>((resolve) => {
      this.pending = { id: msg.id, stdout: "", stderr: "", onOutput, resolve };
      // The clock starts once Python is loaded, so slow first loads never count.
      this.pending.timer = setTimeout(() => this.restart({ stopped: false, timedOut: true }), timeoutMs);
      this.post(msg);
    });
  }

  private handle(msg: Exclude<FromWorker, { type: "ready" | "init-error" }>) {
    const p = this.pending;
    if (!p || msg.id !== p.id) return;
    if (msg.type === "stdout" || msg.type === "stderr") {
      p[msg.type] += msg.text;
      p.onOutput?.(msg.text, msg.type);
    } else if (msg.type === "checks") {
      p.checks = msg.results;
    } else if (msg.type === "done") {
      this.finish({ ok: msg.ok, stdout: p.stdout, stderr: p.stderr, checks: p.checks, timedOut: false, stopped: false });
    }
  }

  private finish(result: RunResult) {
    const p = this.pending;
    if (!p) return;
    clearTimeout(p.timer);
    this.pending = undefined;
    p.resolve(result);
  }

  private restart(reason: { stopped: boolean; timedOut: boolean }) {
    const p = this.pending;
    this.worker.terminate();
    if (p) this.finish({ ok: false, stdout: p.stdout, stderr: p.stderr, ...reason });
    this.start();
  }

  private post(msg: ToWorker) {
    this.worker.postMessage(msg);
  }
}
