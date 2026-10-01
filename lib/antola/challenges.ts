import type { ChallengeKind } from "@prisma/client";

/**
 * Retos semanales: cada lunes, 3 retos adaptados a lo que el usuario suele
 * hacer (media de las últimas 4 semanas). Funciones puras; el servidor las
 * usa para crear los retos y su progreso se calcula siempre en el servidor.
 */

export type Activity = {
  tasksPerWeek: number;
  highPerWeek: number;
  earlyPerWeek: number;
  productivePerWeek: number;
  activeHabits: number;
  topProject: { id: string; name: string; pending: number } | null;
};

export type ChallengeSpec = {
  kind: ChallengeKind;
  target: number;
  refId: string | null;
  label: string;
  rewardXp: number;
  rewardCrumbs: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Un poco más que la media (para que cueste, pero se pueda). */
function stretch(avg: number, min: number, max: number) {
  return clamp(Math.round(avg * 1.2 + 1), min, max);
}

function reward(difficulty: number) {
  return { rewardXp: 20 + difficulty * 10, rewardCrumbs: 5 + difficulty * 3 };
}

/** Candidatos según la actividad, de más a menos adecuados. */
export function candidateChallenges(a: Activity): ChallengeSpec[] {
  const out: ChallengeSpec[] = [];

  const tasks = stretch(a.tasksPerWeek, 5, 40);
  out.push({ kind: "TASKS", target: tasks, refId: null, label: `Completa ${plural(tasks, "tarea", "tareas")}`, ...reward(clamp(Math.round(tasks / 6), 1, 5)) });

  if (a.activeHabits > 0) {
    const days = clamp(Math.round(a.productivePerWeek) + 1, 3, 7);
    out.push({ kind: "HABIT_DAYS", target: days, refId: null, label: `Haz todos tus hábitos ${plural(days, "día", "días")}`, ...reward(days >= 6 ? 4 : 3) });
  }

  if (a.topProject && a.topProject.pending >= 2) {
    const n = clamp(Math.min(a.topProject.pending, 3), 2, 5);
    out.push({
      kind: "PROJECT_TASKS",
      target: n,
      refId: a.topProject.id,
      label: `Termina ${plural(n, "tarea", "tareas")} de ${a.topProject.name}`,
      ...reward(2),
    });
  }

  if (a.highPerWeek >= 1) {
    const n = stretch(a.highPerWeek, 2, 10);
    out.push({ kind: "HIGH_PRIORITY", target: n, refId: null, label: `Completa ${plural(n, "tarea", "tareas")} de prioridad alta`, ...reward(clamp(Math.round(n / 2), 2, 5)) });
  }

  const productive = clamp(Math.round(a.productivePerWeek) + 1, 3, 6);
  out.push({ kind: "PRODUCTIVE_DAYS", target: productive, refId: null, label: `Ten ${plural(productive, "día productivo", "días productivos")}`, ...reward(productive >= 5 ? 4 : 3) });

  const early = stretch(a.earlyPerWeek, 2, 10);
  out.push({ kind: "EARLY_TASKS", target: early, refId: null, label: `Completa ${plural(early, "tarea", "tareas")} antes de las 12:00`, ...reward(clamp(Math.round(early / 2), 1, 4)) });

  return out;
}

/** Número pseudoaleatorio estable a partir de un texto (misma semana → mismos retos). */
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Los 3 retos de la semana: siempre uno de tareas y dos más variados. */
export function pickChallenges(a: Activity, seed: string): ChallengeSpec[] {
  const all = candidateChallenges(a);
  const [first, ...rest] = all;
  const rand = seededRandom(seed);
  const shuffled = rest
    .map((c, i) => ({ c, w: rand() + (c.kind === "PROJECT_TASKS" || c.kind === "HABIT_DAYS" ? 0.35 : 0) - i * 0.05 }))
    .sort((x, y) => y.w - x.w)
    .map((x) => x.c);
  return [first, ...shuffled].slice(0, 3);
}
