import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { todayStr } from "@/lib/dates";
import { listGoalOptions, listProjects } from "@/lib/data/common";
import { getTaskView } from "@/lib/data/tasks";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { TaskForm } from "@/components/tasks/task-form";
import { DeleteTaskButton, SubtaskList, TaskQuickActions } from "@/components/tasks/task-actions";

export const metadata: Metadata = { title: "Tarea" };

export default async function TaskPage({ params }: PageProps<"/tareas/[id]">) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const [task, projects, goals] = await Promise.all([
    getTaskView(user.id, id, user.timezone),
    listProjects(user.id),
    listGoalOptions(user.id),
  ]);
  if (!task) notFound();
  const today = todayStr(user.timezone);

  return (
    <>
      <PageHeader title={task.completedAt ? "Tarea completada" : "Tarea"} back="/tareas" />
      <PageBody>
        <div className="space-y-5">
          <TaskQuickActions task={task} today={today} />
          <SubtaskList key={task.subtasks.map((s) => s.id).join()} taskId={task.id} initial={task.subtasks} />
          <TaskForm key={JSON.stringify(task)} task={task} projects={projects} goals={goals} today={today} returnTo="/tareas" />
          <DeleteTaskButton taskId={task.id} />
        </div>
      </PageBody>
    </>
  );
}
