import Dexie, { type EntityTable } from "dexie";
import { useEffect, useState } from "react";

// Progress lives in the browser's IndexedDB, so it survives reloads with no account.
export type MissionProgress = {
  missionId: string;
  completedAt: number;
  xp: number;
  hintsUsed: number;
  firstTry: boolean;
};

const db = new Dexie("skill-quest") as Dexie & { missions: EntityTable<MissionProgress, "missionId"> };
db.version(1).stores({ missions: "missionId" });

/** XP for a finished mission: base, +5 with no hints, +5 on the first try, -2 per hint. */
export function scoreMission(base: number, hintsUsed: number, firstTry: boolean) {
  const bonus = (hintsUsed === 0 ? 5 : 0) + (firstTry ? 5 : 0);
  return Math.max(0, base + bonus - 2 * hintsUsed);
}

/** Saves a finish. A replay only replaces the old result if it earned more XP. */
export async function saveMission(p: MissionProgress) {
  await db.transaction("rw", db.missions, async () => {
    const old = await db.missions.get(p.missionId);
    if (!old || p.xp > old.xp) await db.missions.put(p);
  });
  notify();
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

export function useProgress() {
  const [done, setDone] = useState<Map<string, MissionProgress>>();
  useEffect(() => {
    const load = () => db.missions.toArray().then((rows) => setDone(new Map(rows.map((r) => [r.missionId, r]))));
    load();
    listeners.add(load);
    return () => void listeners.delete(load);
  }, []);
  const totalXp = done ? [...done.values()].reduce((sum, p) => sum + p.xp, 0) : 0;
  return { done, totalXp, ...levelFor(totalXp) };
}

/** 100 XP per level for now. */
export function levelFor(xp: number) {
  return { level: Math.floor(xp / 100) + 1, xpIntoLevel: xp % 100, xpPerLevel: 100 };
}
