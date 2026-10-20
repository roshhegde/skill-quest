import { MISSIONS, regions } from "../content/missions";
import type { useProgress } from "../progress";

type Progress = ReturnType<typeof useProgress>;

/** Fixed path: a mission opens once every mission before it is done. */
export function isUnlocked(missionId: string, done: Progress["done"]) {
  const i = MISSIONS.findIndex((m) => m.id === missionId);
  return MISSIONS.slice(0, i).every((m) => done?.has(m.id));
}

export function Home({ progress }: { progress: Progress }) {
  const { done, xpIntoLevel, xpPerLevel, level } = progress;
  const current = MISSIONS.find((m) => !done?.has(m.id));

  return (
    <main className="stack">
      <section className="card stack">
        <div className="eyebrow">Python track · Story: Café Byte</div>
        <h1>From one script to a busy café</h1>
        <p className="muted">
          Each mission is a short story, one idea to learn, and a lab where you write real Python. Hidden
          checks tell you when it works.
        </p>
        <div className="stack tight">
          <div className="row between small">
            <span className="strong">Level {level}</span>
            <span className="muted">
              {xpIntoLevel} / {xpPerLevel} XP to level {level + 1}
            </span>
          </div>
          <div className="bar">
            <div style={{ width: `${(xpIntoLevel / xpPerLevel) * 100}%` }} />
          </div>
        </div>
        {current && done && (
          <a className="btn primary self-start" href={`#/m/${current.id}`}>
            {done.size === 0 ? "Start" : "Continue"}: {current.title}
          </a>
        )}
      </section>

      {regions().map((r) => (
        <section key={r.region} className="card stack">
          <h2>
            Region {r.region} · {r.name}
          </h2>
          <div className="mission-grid">
            {r.missions.map((m) => {
              const finished = done?.get(m.id);
              const open = isUnlocked(m.id, done);
              const state = finished ? "done" : open ? "open" : "locked";
              const body = (
                <>
                  <span className={`dot ${state}`} aria-hidden="true">
                    {finished ? "✓" : open ? m.order : "🔒"}
                  </span>
                  <span>
                    <span className="strong block">{m.title}</span>
                    <span className="small muted">
                      {m.format} · {finished ? `${finished.xp} XP earned` : `${m.minutes} min`}
                    </span>
                  </span>
                </>
              );
              return open ? (
                <a key={m.id} href={`#/m/${m.id}`} className={`mission ${state}`} data-testid={`mission-${m.id}`}>
                  {body}
                </a>
              ) : (
                <div key={m.id} className="mission locked" data-testid={`mission-${m.id}`} aria-disabled="true">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="card row between wrap">
        <div>
          <div className="strong">Playground</div>
          <div className="small muted">Free Python with no checks, for trying things out.</div>
        </div>
        <a className="btn ghost" href="#/playground">
          Open playground
        </a>
      </section>
    </main>
  );
}
