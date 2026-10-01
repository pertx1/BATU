import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isDateStr, todayStr } from "@/lib/dates";
import { listGoalOptions, listProjects } from "@/lib/data/common";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "Nueva tarea" };

export default async function NewTaskPage({ searchParams }: PageProps<"/tareas/nueva">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const [projects, goals] = await Promise.all([listProjects(user.id), listGoalOptions(user.id)]);
  const date = isDateStr(sp.date) ? sp.date : null;
  const projectId = typeof sp.project === "string" && projects.some((p) => p.id === sp.project) ? sp.project : null;
  const goalId = typeof sp.goal === "string" && goals.some((g) => g.id === sp.goal) ? sp.goal : null;
  const back = typeof sp.back === "string" && sp.back.startsWith("/") && !sp.back.startsWith("//") ? sp.back : "/tareas";

  return (
    <>
      <PageHeader title="Nueva tarea" back={back} />
      <PageBody>
        <TaskForm
          projects={projects}
          goals={goals}
          today={todayStr(user.timezone)}
          defaults={{
            dueDate: date,
            title: typeof sp.title === "string" ? sp.title.slice(0, 300) : undefined,
            projectId,
            goalId,
          }}
          returnTo={back}
        />
      </PageBody>
    </>
  );
}
