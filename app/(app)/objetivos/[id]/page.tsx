import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { getGoalDetail } from "@/lib/data/goals";
import { taskInclude, taskOrder, toTaskView } from "@/lib/data/tasks";
import { formatNumber, GOAL_TYPE_LABEL } from "@/lib/goals";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { LineChart } from "@/components/charts/line-chart";
import { deadlineLabel, ProgressBar } from "@/components/goals/goal-card";
import { GoalStatusControls, MilestoneList, ProgressLogger } from "@/components/goals/goal-actions";
import { TaskList } from "@/components/tasks/task-item";
import { SectionTitle } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Objetivo" };

export default async function GoalPage({ params }: PageProps<"/objetivos/[id]">) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const detail = await getGoalDetail(user.id, id);
  if (!detail) notFound();
  const { goal, milestones, logs } = detail;
  const today = todayStr(user.timezone);

  const tasks =
    goal.type === "TASKS"
      ? (await db.task.findMany({ where: { userId: user.id, goalId: id }, include: taskInclude, orderBy: taskOrder })).map(
          (t) => toTaskView(t, user.timezone),
        )
      : [];
  const pending = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);
  const pct = Math.round(goal.progress * 100);
  const deadline = goal.deadline && goal.status !== "ACHIEVED" ? deadlineLabel(goal.deadline, today) : null;
  const unit = goal.unit ? ` ${goal.unit}` : "";
  const points = logs.map((l) => ({ date: l.date, value: l.value }));

  return (
    <>
      <PageHeader
        title="Objetivo"
        back="/objetivos"
        right={
          <Link href={`/objetivos/${id}/editar`} aria-label="Editar objetivo" className="glass flex size-11 items-center justify-center rounded-full text-fg">
            <Pencil size={20} />
          </Link>
        }
      />
      <PageBody>
        <div className="space-y-5">
          <section className="card p-4">
            <p className="text-[13px] font-medium text-muted">
              {GOAL_TYPE_LABEL[goal.type]}
              {goal.project ? ` · ${goal.project.emoji ? `${goal.project.emoji} ` : ""}${goal.project.name}` : ""}
            </p>
            <h2 className="mt-0.5 text-xl font-bold leading-snug">{goal.title}</h2>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-[15px] text-muted">{goal.label}</p>
              <p className={`text-4xl font-bold tabular-nums ${goal.status === "ACHIEVED" ? "text-success" : ""}`}>{pct}%</p>
            </div>
            <div className="mt-2">
              <ProgressBar value={goal.progress} achieved={goal.status === "ACHIEVED"} />
            </div>
            {goal.status === "ACHIEVED" ? (
              <p className="mt-3 flex items-center gap-2 font-medium text-success">
                <Trophy size={18} /> ¡Conseguido!
              </p>
            ) : deadline ? (
              <p className={`mt-3 flex items-center gap-1.5 text-sm ${deadline.late ? "text-danger" : "text-muted"}`}>
                <CalendarClock size={16} /> {deadline.text}
              </p>
            ) : null}
          </section>

          {goal.why ? (
            <section className="rounded-2xl border-l-4 border-accent bg-accent-soft px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Por qué es importante</p>
              <p className="mt-1 whitespace-pre-line">{goal.why}</p>
            </section>
          ) : null}

          <GoalStatusControls goal={goal} />

          {goal.type === "NUMERIC" ? (
            <>
              {points.length ? (
                <section className="card p-4">
                  <h2 className="font-semibold">Evolución</h2>
                  <p className="mb-2 text-sm text-muted">
                    Inicio {formatNumber(goal.startValue ?? 0)}
                    {unit} · meta {formatNumber(goal.targetValue ?? 0)}
                    {unit}
                  </p>
                  <LineChart
                    points={points}
                    target={goal.targetValue}
                    caption={`Evolución de ${goal.title}`}
                    unit={goal.unit}
                  />
                </section>
              ) : null}
              <ProgressLogger goal={goal} logs={logs} today={today} />
            </>
          ) : null}

          {goal.type === "MILESTONES" ? (
            <MilestoneList key={milestones.map((m) => m.id + m.done).join()} goalId={goal.id} initial={milestones} />
          ) : null}

          {goal.type === "TASKS" ? (
            <section>
              <Link
                href={`/tareas/nueva?goal=${goal.id}&back=${encodeURIComponent(`/objetivos/${goal.id}`)}`}
                className="btn btn-secondary w-full"
              >
                <Plus size={20} /> Añadir tarea a este objetivo
              </Link>
              {pending.length ? (
                <>
                  <SectionTitle>Pendientes</SectionTitle>
                  <TaskList tasks={pending} today={today} />
                </>
              ) : null}
              {done.length ? (
                <>
                  <SectionTitle>Completadas</SectionTitle>
                  <TaskList tasks={done} today={today} />
                </>
              ) : null}
              {!tasks.length ? (
                <p className="mt-3 text-center text-sm text-muted">
                  Vincula tareas desde aquí o eligiendo este objetivo al crear una tarea.
                </p>
              ) : null}
            </section>
          ) : null}

          {goal.description ? (
            <section className="card p-4">
              <h2 className="font-semibold">Descripción</h2>
              <p className="mt-1 whitespace-pre-line text-muted">{goal.description}</p>
            </section>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
