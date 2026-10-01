/**
 * Niveles de Antola. Funciones puras (se usan en el servidor y en el cliente
 * solo para pintar; los XP los calcula siempre el servidor).
 *
 * Curva: XP total para llegar al nivel n = round(100 · (n − 1)^1,5).
 * Nivel 2 = 100 XP, nivel 5 = 800, nivel 15 ≈ 5.240, nivel 30 ≈ 15.620.
 */

export type Stage = "pequena" | "exploradora" | "experta" | "reina";

export const MAX_LEVEL = 99;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** Progreso dentro del nivel actual (para la barra). */
export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  const span = Math.max(1, to - from);
  return { level, from, to, into: xp - from, needed: to - xp, ratio: Math.min(1, Math.max(0, (xp - from) / span)) };
}

/** Fase de Antola según el nivel. */
export function stageForLevel(level: number): Stage {
  if (level >= 30) return "reina";
  if (level >= 15) return "experta";
  if (level >= 5) return "exploradora";
  return "pequena";
}

export const STAGE_LABEL: Record<Stage, string> = {
  pequena: "Pequeña",
  exploradora: "Exploradora",
  experta: "Experta",
  reina: "Reina",
};

export const STAGE_FROM: Record<Stage, number> = { pequena: 1, exploradora: 5, experta: 15, reina: 30 };

const TITLES: { from: number; title: string }[] = [
  { from: 1, title: "Novata" },
  { from: 5, title: "Constante" },
  { from: 10, title: "Incansable" },
  { from: 15, title: "Imparable" },
  { from: 22, title: "Maestra" },
  { from: 30, title: "Leyenda" },
];

export function levelTitle(level: number): string {
  let t = TITLES[0].title;
  for (const row of TITLES) if (level >= row.from) t = row.title;
  return t;
}

/** Lo que se desbloquea justo al llegar a un nivel (fase nueva o título nuevo). */
export function unlocksAtLevel(level: number): string[] {
  const out: string[] = [];
  const stage = (Object.entries(STAGE_FROM) as [Stage, number][]).find(([, from]) => from === level);
  if (stage && level > 1) out.push(`Antola ${STAGE_LABEL[stage[0]].toLowerCase()}`);
  const title = TITLES.find((t) => t.from === level && level > 1);
  if (title) out.push(`Título «${title.title}»`);
  return out;
}
