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
  if (input.type === "NUMERIC") {
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
