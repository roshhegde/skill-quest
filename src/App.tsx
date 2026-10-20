import { useEffect, useState } from "react";
import { usePythonRunner } from "./usePythonRunner";
import { useProgress } from "./progress";
import { findMission } from "./content/missions";
import type { RunnerStatus } from "./runner/PythonRunner";
import { Home } from "./screens/Home";
import { Lab } from "./screens/Lab";
import { Playground } from "./screens/Playground";

// Hash routes keep the static build working on GitHub Pages:
//   #/            home and mission list
//   #/m/<id>      a mission lab
//   #/playground  free Python playground
function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash.replace(/^#/, "") || "/";
}

export function App() {
  const { runner, status } = usePythonRunner();
  const progress = useProgress();
  const route = useRoute();

  let screen;
  const missionId = route.match(/^\/m\/([\w-]+)$/)?.[1];
  if (missionId) {
    const mission = findMission(missionId);
    screen = mission ? (
      // key resets the lab when moving to the next mission.
      <Lab key={mission.id} mission={mission} runner={runner} status={status} progress={progress} />
    ) : (
      <NotFound />
    );
  } else if (route === "/playground") {
    screen = <Playground runner={runner} status={status} />;
  } else {
    screen = <Home progress={progress} />;
  }

  return (
    <div className="page">
      <header className="topbar">
        <a href="#/" className="logo">
          Skill Quest
        </a>
        <div className="row wrap">
          <div className="pill xp" data-testid="xp">
            Level {progress.level} · {progress.totalXp} XP
          </div>
          <StatusPill status={status} />
        </div>
      </header>
      {screen}
    </div>
  );
}

function StatusPill({ status }: { status: RunnerStatus }) {
  if (status.state === "ready") return <div className="pill ok">Python {status.pythonVersion} ready</div>;
  if (status.state === "error") return <div className="pill bad">Python failed to load: {status.message}</div>;
  return <div className="pill">Loading Python…</div>;
}

function NotFound() {
  return (
    <main className="card stack">
      <h1>Mission not found</h1>
      <a href="#/">Back to missions</a>
    </main>
  );
}
