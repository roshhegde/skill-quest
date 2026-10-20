import { useState } from "react";
import type { PythonRunner } from "../runner/PythonRunner";
import { SPIKES, type Spike } from "../spikes/spikes";

type State = { phase: "idle" | "installing" | "running" | "passed" | "failed"; log: string };

export function SpikePanel({ runner, ready }: { runner?: PythonRunner; ready: boolean }) {
  return (
    <section className="card stack">
      <div className="eyebrow">Phase 0 · Spikes</div>
      <h2>Do the later tracks' libraries run here?</h2>
      <p className="muted">
        Each check downloads its packages from PyPI into your browser, then runs a short script.
        The first run can take a minute.
      </p>
      {SPIKES.map((spike) => (
        <SpikeRow key={spike.id} spike={spike} runner={runner} ready={ready} />
      ))}
    </section>
  );
}

function SpikeRow({ spike, runner, ready }: { spike: Spike; runner?: PythonRunner; ready: boolean }) {
  const [state, setState] = useState<State>({ phase: "idle", log: "" });
  const busy = state.phase === "installing" || state.phase === "running";

  async function go() {
    if (!runner) return;
    let log = "";
    const append = (text: string) => setState((s) => ({ ...s, log: (log += text) }));
    setState({ phase: "installing", log: "" });
    append(`Installing ${spike.packages.join(", ")}…\n`);
    const installed = await runner.install(spike.packages, append);
    if (!installed.ok) return setState({ phase: "failed", log });
    setState({ phase: "running", log });
    const result = await runner.run(spike.code, { timeoutMs: 60_000, onOutput: append });
    const passed = result.ok && result.stdout.includes("PASSED");
    if (result.timedOut) append("Timed out after 60 seconds.\n");
    setState({ phase: passed ? "passed" : "failed", log });
  }

  const label = { idle: "Not run", installing: "Installing…", running: "Running…", passed: "Passed", failed: "Failed" }[
    state.phase
  ];

  return (
    <div className="spike" data-testid={`spike-${spike.id}`}>
      <div className="row between wrap">
        <div>
          <div className="strong">{spike.title}</div>
          <div className="muted small">{spike.why}</div>
        </div>
        <div className="row">
          <span className={`pill ${state.phase === "passed" ? "ok" : state.phase === "failed" ? "bad" : ""}`}>{label}</span>
          <button type="button" className="btn ghost" onClick={go} disabled={!ready || busy}>
            Run check
          </button>
        </div>
      </div>
      {state.log && <pre className="output small">{state.log}</pre>}
    </div>
  );
}
