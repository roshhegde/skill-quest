import { useCallback, useState, type ReactNode } from "react";
import { CodeEditor } from "../components/CodeEditor";
import { MISSIONS, nextMission, type Mission } from "../content/missions";
import { saveMission, scoreMission, type useProgress } from "../progress";
import type { CheckResult } from "../runner/protocol";
import type { PythonRunner, RunnerStatus } from "../runner/PythonRunner";
import { isUnlocked } from "./Home";

type Props = {
  mission: Mission;
  runner?: PythonRunner;
  status: RunnerStatus;
  progress: ReturnType<typeof useProgress>;
};

type Line = { text: string; stream: "stdout" | "stderr" | "info" };
type Reward = { xp: number; hintsUsed: number; firstTry: boolean };

export function Lab({ mission, runner, status, progress }: Props) {
  const [tab, setTab] = useState<"story" | "concept">("story");
  const [code, setCode] = useState(mission.starter);
  const [output, setOutput] = useState<Line[]>([]);
  const [checks, setChecks] = useState<CheckResult[]>();
  const [busy, setBusy] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [reward, setReward] = useState<Reward>();

  const ready = status.state === "ready";
  const next = nextMission(mission.id);

  const runChecks = useCallback(async () => {
    if (!runner || busy || reward) return;
    setBusy(true);
    setOutput([]);
    setChecks(undefined);
    const result = await runner.lab(code, mission.checks, {
      onOutput: (text, stream) => setOutput((l) => [...l, { text, stream }]),
    });
    setBusy(false);
    if (result.timedOut) {
      setOutput((l) => [...l, { text: "Your code didn't finish within 5 seconds. Is there an endless loop?\n", stream: "info" }]);
      return;
    }
    if (result.stopped) {
      setOutput((l) => [...l, { text: "Stopped.\n", stream: "info" }]);
      return;
    }
    const tries = attempts + 1;
    setAttempts(tries);
    setChecks(result.checks);
    if (result.checks?.length && result.checks.every((c) => c.passed)) {
      const firstTry = tries === 1;
      const xp = scoreMission(mission.xp, hintsUsed, firstTry);
      setReward({ xp, hintsUsed, firstTry });
      await saveMission({ missionId: mission.id, completedAt: Date.now(), xp, hintsUsed, firstTry });
    }
  }, [runner, busy, reward, code, mission, attempts, hintsUsed]);

  if (!progress.done) return null;
  if (!isUnlocked(mission.id, progress.done)) {
    const blocker = MISSIONS.find((m) => !progress.done?.has(m.id))!;
    return (
      <main className="card stack">
        <h1>{mission.title} is locked</h1>
        <p className="muted">Missions open in order. Finish “{blocker.title}” first.</p>
        <a className="btn primary self-start" href={`#/m/${blocker.id}`}>
          Go to {blocker.title}
        </a>
      </main>
    );
  }

  const maxXp = scoreMission(mission.xp, hintsUsed, attempts === 0);

  return (
    <main className="stack">
      <div className="row between wrap">
        <a href="#/" className="back">
          ← Missions
        </a>
        <div className="mono muted">
          Region {mission.region} · Mission {mission.order} · {mission.format}
        </div>
      </div>
      <h1>{mission.title}</h1>

      <div className="lab">
        <aside className="stack">
          <section className="card stack">
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "story"} onClick={() => setTab("story")}>
                Story
              </button>
              <button type="button" role="tab" aria-selected={tab === "concept"} onClick={() => setTab("concept")}>
                Concept
              </button>
            </div>
            {tab === "story" ? (
              <div className="stack" role="tabpanel">
                <Prose text={mission.story} />
                <div className="goal">
                  <div className="eyebrow">Your goal</div>
                  <p>{mission.goal}</p>
                </div>
              </div>
            ) : (
              <Concept mission={mission} runner={runner} canRun={ready && !busy} setBusy={setBusy} />
            )}
          </section>

          <Hints hints={mission.hints} used={hintsUsed} onTake={() => setHintsUsed((h) => h + 1)} locked={!!reward} />
        </aside>

        <div className="stack">
          <section className="panel">
            <div className="panel-bar">
              <span className="mono muted">main.py · up to {maxXp} XP</span>
              <div className="row">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setCode(mission.starter)}
                  disabled={busy || !!reward}
                >
                  Reset
                </button>
                {busy ? (
                  <button type="button" className="btn ghost" onClick={() => runner?.stop()}>
                    Stop
                  </button>
                ) : null}
                <button type="button" className="btn primary" onClick={runChecks} disabled={!ready || busy || !!reward}>
                  {busy ? "Checking…" : "Run checks"}
                </button>
              </div>
            </div>
            <CodeEditor value={code} onChange={setCode} onRun={runChecks} label="Python code editor" />
          </section>

          <section className="panel" aria-live="polite">
            <div className="panel-bar">
              <span className="mono muted">Output</span>
            </div>
            <pre className="output" data-testid="output">
              {output.length === 0 ? (
                <span className="muted">
                  {attempts > 0 || busy ? "Your code printed nothing." : "Press Run checks (or Ctrl+Enter) to run your code."}
                </span>
              ) : (
                output.map((line, i) => (
                  <span key={i} className={line.stream}>
                    {line.text}
                  </span>
                ))
              )}
            </pre>
          </section>

          <section className="card stack" aria-live="polite">
            <h2>Checks</h2>
            {checks ? (
              <ul className="checks" data-testid="checks">
                {checks.map((c) => (
                  <li key={c.name} className={c.passed ? "pass" : "fail"}>
                    <span className="mark" aria-hidden="true">
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <span>
                      <span className="strong block">{c.name}</span>
                      {!c.passed && c.message ? <span className="small">{c.message}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Hidden checks run against your code and say what still needs work.</p>
            )}
          </section>

          {reward && (
            <section className="card reward stack" data-testid="reward">
              <div className="reward-title">Mission complete · +{reward.xp} XP</div>
              <div className="small">
                {[
                  `${mission.xp} base`,
                  reward.hintsUsed === 0 ? "+5 no hints" : `−${2 * reward.hintsUsed} for hints`,
                  reward.firstTry ? "+5 first try" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className="recap">
                <div className="eyebrow">Remember</div>
                <Prose text={mission.recap} />
              </div>
              <div className="row wrap">
                {next ? (
                  <a className="btn primary" href={`#/m/${next.id}`}>
                    Next: {next.title}
                  </a>
                ) : (
                  <span className="muted">That's every mission so far. More are on the way.</span>
                )}
                <a className="btn ghost" href="#/">
                  Back to missions
                </a>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Concept({
  mission,
  runner,
  canRun,
  setBusy,
}: {
  mission: Mission;
  runner?: PythonRunner;
  canRun: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [out, setOut] = useState<Line[]>();
  const { concept } = mission;

  const tryIt = async () => {
    if (!runner || !concept.snippet) return;
    setBusy(true);
    const lines: Line[] = [];
    setOut(lines);
    const result = await runner.run(concept.snippet, {
      onOutput: (text, stream) => setOut((l) => [...(l ?? []), { text, stream }]),
    });
    if (result.timedOut) setOut((l) => [...(l ?? []), { text: "Stopped after 5 seconds.\n", stream: "info" }]);
    setBusy(false);
  };

  return (
    <div className="stack" role="tabpanel">
      <h2>{concept.title}</h2>
      <Prose text={concept.body} />
      {concept.snippet && (
        <div className="snippet">
          <pre>{concept.snippet.trimEnd()}</pre>
          <div className="row between wrap">
            <span className="small muted">Guess the output, then run it.</span>
            <button type="button" className="btn ghost" onClick={tryIt} disabled={!canRun}>
              Try it
            </button>
          </div>
          {out && (
            <pre className="output" data-testid="snippet-output">
              {out.map((line, i) => (
                <span key={i} className={line.stream}>
                  {line.text}
                </span>
              ))}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function Hints({ hints, used, onTake, locked }: { hints: string[]; used: number; onTake: () => void; locked: boolean }) {
  const left = hints.length - used;
  return (
    <section className="card stack">
      <div className="row between wrap">
        <span className="strong">Hints · {left} left</span>
        {left > 0 && !locked && (
          <button type="button" className="btn hint" onClick={onTake}>
            Get a hint (−2 XP)
          </button>
        )}
      </div>
      {used > 0 && (
        <ol className="hints">
          {hints.slice(0, used).map((h) => (
            <li key={h}>
              <Inline text={h} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Paragraphs from line breaks, with `code` spans. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text
        .trim()
        .split("\n")
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>
            <Inline text={p} />
          </p>
        ))}
    </>
  );
}

function Inline({ text }: { text: string }): ReactNode {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}
