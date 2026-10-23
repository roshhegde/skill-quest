import { parse } from "yaml";

// Each mission is a folder under content/<track>/<region>/<mission>/.
// solution.py is deliberately not imported: it is only for tests.
export type Mission = {
  id: string;
  track: string;
  region: number;
  regionName: string;
  order: number;
  title: string;
  format: string;
  minutes: number;
  xp: number;
  story: string;
  goal: string;
  concept: { title: string; body: string; snippet?: string };
  hints: string[];
  recap: string;
  starter: string;
  checks: string;
};

const files = import.meta.glob<string>("/content/**/{mission.yaml,starter.py,checks.py}", {
  query: "?raw",
  import: "default",
  eager: true,
});

function load(): Mission[] {
  const missions: Mission[] = [];
  for (const [path, text] of Object.entries(files)) {
    if (!path.endsWith("/mission.yaml")) continue;
    const dir = path.slice(0, -"mission.yaml".length);
    const starter = files[dir + "starter.py"];
    const checks = files[dir + "checks.py"];
    if (starter === undefined || checks === undefined) throw new Error(`${dir} needs starter.py and checks.py`);
    missions.push({ ...(parse(text) as Omit<Mission, "starter" | "checks">), starter, checks });
  }
  return missions.sort((a, b) => a.region - b.region || a.order - b.order);
}

export const MISSIONS = load();

export function findMission(id: string) {
  return MISSIONS.find((m) => m.id === id);
}

export function nextMission(id: string) {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i >= 0 ? MISSIONS[i + 1] : undefined;
}

export type Region = { region: number; name: string; missions: Mission[] };

export function regions(track = "python"): Region[] {
  const byRegion = new Map<number, Region>();
  for (const m of MISSIONS.filter((m) => m.track === track)) {
    const r = byRegion.get(m.region) ?? { region: m.region, name: m.regionName, missions: [] };
    r.missions.push(m);
    byRegion.set(m.region, r);
  }
  return [...byRegion.values()];
}
