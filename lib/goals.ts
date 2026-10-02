import type { GoalType } from "@prisma/client";

/** Progreso de un objetivo entre 0 y 1. */
export function goalProgress(input: {
  type: GoalType;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
}): number {
  let p = 0;
  // El objetivo de peso funciona como uno numérico (inicio → actual → objetivo).
  if (input.type === "NUMERIC" || input.type === "WEIGHT") {
    const start = input.startValue ?? 0;
    const target = input.targetValue ?? 0;
    const current = input.currentValue ?? start;
    p = target === start ? (current >= target ? 1 : 0) : (current - start) / (target - start);
  } else if (input.type === "MILESTONES") {
    p = input.milestonesTotal ? input.milestonesDone / input.milestonesTotal : 0;
  } else {
    p = input.tasksTotal ? input.tasksDone / input.tasksTotal : 0;
  }
  return Math.max(0, Math.min(1, p));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(n);
}

/** "40 / 100 kg", "3 de 5 hitos", "2 de 8 tareas". */
export function goalProgressLabel(input: {
  type: GoalType;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
}): string {
  if (input.type === "NUMERIC" || input.type === "WEIGHT") {
    const current = input.currentValue ?? input.startValue ?? 0;
    return `${formatNumber(current)} / ${formatNumber(input.targetValue ?? 0)}${input.unit ? ` ${input.unit}` : ""}`;
  }
  if (input.type === "MILESTONES") return `${input.milestonesDone} de ${input.milestonesTotal} hitos`;
  return `${input.tasksDone} de ${input.tasksTotal} tareas`;
}

export const GOAL_STATUS_LABEL = { ACTIVE: "Activo", PAUSED: "Pausado", ACHIEVED: "Conseguido" } as const;
export const GOAL_TYPE_LABEL = { NUMERIC: "Numérico", MILESTONES: "Por hitos", TASKS: "Por tareas", WEIGHT: "Peso" } as const;
