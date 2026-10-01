import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dbToDateStr } from "@/lib/dates";
import { goalProgress, goalProgressLabel } from "@/lib/goals";
import type { GoalStatus, GoalView, MilestoneView, ProgressLogView } from "@/lib/types";

export const goalInclude = {
  project: { select: { id: true, name: true, color: true, emoji: true } },
  milestones: { select: { doneAt: true } },
  tasks: { select: { completedAt: true } },
} satisfies Prisma.GoalInclude;

type GoalWithCounts = Prisma.GoalGetPayload<{ include: typeof goalInclude }>;

export function toGoalView(g: GoalWithCounts): GoalView {
  const counts = {
    milestonesDone: g.milestones.filter((m) => m.doneAt).length,
    milestonesTotal: g.milestones.length,
    tasksDone: g.tasks.filter((t) => t.completedAt).length,
    tasksTotal: g.tasks.length,
  };
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    why: g.why,
    deadline: g.deadline ? dbToDateStr(g.deadline) : null,
    status: g.status,
    type: g.type,
    startValue: g.startValue,
    currentValue: g.currentValue,
    targetValue: g.targetValue,
    unit: g.unit,
    isFocus: g.isFocus,
    project: g.project,
    progress: goalProgress({ ...g, ...counts }),
    label: goalProgressLabel({ ...g, ...counts }),
  };
}

export async function listGoalViews(userId: string, status?: GoalStatus): Promise<GoalView[]> {
  const goals = await db.goal.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: goalInclude,
    orderBy: [{ isFocus: "desc" }, { deadline: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  return goals.map(toGoalView);
}

export async function getGoalDetail(userId: string, id: string) {
  const goal = await db.goal.findFirst({
    where: { id, userId },
    include: {
      ...goalInclude,
      milestones: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, title: true, doneAt: true } },
      progressLogs: { orderBy: [{ date: "asc" }, { createdAt: "asc" }], select: { id: true, value: true, date: true, note: true } },
    },
  });
  if (!goal) return null;
  const milestones: MilestoneView[] = goal.milestones.map((m) => ({ id: m.id, title: m.title, done: !!m.doneAt }));
  const logs: ProgressLogView[] = goal.progressLogs.map((l) => ({
    id: l.id,
    value: l.value,
    date: dbToDateStr(l.date),
    note: l.note,
  }));
  return { goal: toGoalView(goal), milestones, logs };
}

/** El valor actual de un objetivo numérico es el último registrado (o el inicial). */
export async function syncCurrentValue(tx: Prisma.TransactionClient, userId: string, goalId: string) {
  const [goal, last] = await Promise.all([
    tx.goal.findFirst({ where: { id: goalId, userId }, select: { startValue: true } }),
    tx.goalProgressLog.findFirst({
      where: { goalId, userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { value: true },
    }),
  ]);
  if (!goal) return;
  await tx.goal.update({ where: { id: goalId, userId }, data: { currentValue: last?.value ?? goal.startValue } });
}
