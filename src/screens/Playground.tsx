import { useCallback, useState } from "react";
import { CodeEditor } from "../components/CodeEditor";
import { SpikePanel } from "../components/SpikePanel";
import type { PythonRunner, RunnerStatus } from "../runner/PythonRunner";

const STARTER = `menu = {"latte": 3.50, "mocha": 4.00}

for item, price in menu.items():
    print(f"{item:<6} {price:.2f}")

# Try an endless loop, then press Stop:
# while True: pass
`;

type Line = { text: string; stream: "stdout" | "stderr" | "info" };

export function Playground({ runner, status }: { runner?: PythonRunner; status: RunnerStatus }) {
  const [code, setCode] = useState(STARTER);
  const [output, setOutput] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    if (!runner || running) return;
    setRunning(true);
    setOutput([]);
    const result = await runner.run(code, {
      onOutput: (text, stream) => setOutput((lines) => [...lines, { text, stream }]),
    });
    if (result.timedOut) setOutput((l) => [...l, { text: "Stopped after 5 seconds. Is there an endless loop?\n", stream: "info" }]);
    if (result.stopped) setOutput((l) => [...l, { text: "Stopped.\n", stream: "info" }]);
    setRunning(false);
  }, [runner, running, code]);

  const ready = status.state === "ready";

  return (
    <main className="stack">
      <section className="card stack">
        <div className="eyebrow">Python playground</div>
        <h1>Try anything</h1>
        <p className="muted">
          A free space with no checks. Python runs in a background worker, so a stuck program never
          freezes the page. Press Ctrl+Enter or Run.
        </p>
      </section>

      <section className="panel">
        <div className="panel-bar">
          <span className="mono muted">main.py</span>
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => runner?.stop()} disabled={!running}>
              Stop
            </button>
            <button type="button" className="btn primary" onClick={run} disabled={!ready || running}>
              {running ? "Running…" : "Run"}
            </button>
          </div>
        </div>
        <CodeEditor value={code} onChange={setCode} onRun={run} label="Python code editor" />
      </section>

      <section className="panel" aria-live="polite">
        <div className="panel-bar">
          <span className="mono muted">Output</span>
        </div>
        <pre className="output" data-testid="output">
          {output.length === 0 ? (
            <span className="muted">Output appears here.</span>
          ) : (
            output.map((line, i) => (
              <span key={i} className={line.stream}>
                {line.text}
              </span>
            ))
          )}
        </pre>
      </section>

      <SpikePanel runner={runner} ready={ready} />
    </main>
  );
}
