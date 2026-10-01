import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Inbox, ListTodo, Plus } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { relativeDayLabel, todayStr } from "@/lib/dates";
import { listProjects } from "@/lib/data/common";
import { listTasks, type TaskFilter } from "@/lib/data/tasks";
import type { TaskView } from "@/lib/types";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { TaskList } from "@/components/tasks/task-item";
import { EmptyState, SectionTitle } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Tareas" };

const BASE_FILTERS = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Próximos 7 días" },
  { key: "bandeja", label: "Bandeja" },
  { key: "sinfecha", label: "Sin fecha" },
  { key: "hechas", label: "Completadas" },
];

export default async function TasksPage({ searchParams }: PageProps<"/tareas">) {
  const user = await requireOnboardedUser();
  const { f } = await searchParams;
  const key = typeof f === "string" ? f : "hoy";
  const today = todayStr(user.timezone);
  const projects = await listProjects(user.id);

  let filter: TaskFilter;
  let project = null as (typeof projects)[number] | null;
  if (key.startsWith("p:")) {
    project = projects.find((p) => p.id === key.slice(2)) ?? null;
    filter = project ? { kind: "project", projectId: project.id } : { kind: "today" };
  } else {
    filter =
      key === "semana"
        ? { kind: "week" }
        : key === "bandeja"
          ? { kind: "inbox" }
          : key === "sinfecha"
            ? { kind: "nodate" }
            : key === "hechas"
              ? { kind: "done" }
              : { kind: "today" };
  }
  const activeKey = project ? key : filter.kind === "today" ? "hoy" : key;

  const [tasks, inboxCount] = await Promise.all([
    listTasks(user.id, user.timezone, filter, today),
    db.task.count({ where: { userId: user.id, completedAt: null, dueDate: null, projectId: null } }),
  ]);

  return (
    <>
      <PageHeader
        title={project ? `${project.emoji ?? ""} ${project.name}`.trim() : "Tareas"}
        right={
          <Link
            href={`/tareas/nueva${project ? `?project=${project.id}` : ""}`}
            aria-label="Nueva tarea"
            className="glass flex size-11 items-center justify-center rounded-full text-fg"
          >
            <Plus size={24} />
          </Link>
        }
      />
      <nav className="no-scrollbar mx-auto flex max-w-xl gap-2 overflow-x-auto px-5 pb-2" aria-label="Filtros">
        {BASE_FILTERS.map((b) => (
          <FilterChip key={b.key} href={`/tareas?f=${b.key}`} active={activeKey === b.key}>
            {b.label}
            {b.key === "bandeja" && inboxCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[12px] text-accent-fg">{inboxCount}</span>
            ) : null}
          </FilterChip>
        ))}
        {projects.map((p) => (
          <FilterChip key={p.id} href={`/tareas?f=p:${p.id}`} active={activeKey === `p:${p.id}`}>
            <span className="mr-1.5 size-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.emoji ? `${p.emoji} ` : ""}
            {p.name}
          </FilterChip>
        ))}
      </nav>
      <PageBody>
        <Content filter={filter} tasks={tasks} today={today} />
      </PageBody>
    </>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-[14px] font-semibold transition ${
        active ? "bg-fg text-bg" : "bg-surface-2 text-fg"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function Content({ filter, tasks, today }: { filter: TaskFilter; tasks: TaskView[]; today: string }) {
  if (filter.kind === "today") {
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today);
    const todays = tasks.filter((t) => t.dueDate === today);
    if (!tasks.length) {
      return <EmptyState icon={<CheckCircle2 size={26} />} title="Nada pendiente para hoy" text="Disfruta del día o adelanta algo de la semana." />;
    }
    return (
      <>
        {overdue.length ? (
          <>
            <SectionTitle tone="danger">Vencidas · {overdue.length}</SectionTitle>
            <TaskList tasks={overdue} today={today} overdue />
          </>
        ) : null}
        {todays.length ? (
          <>
            <SectionTitle>Hoy · {todays.length}</SectionTitle>
            <TaskList tasks={todays} today={today} showDate={false} />
          </>
        ) : null}
      </>
    );
  }

  if (!tasks.length) {
    const empty: Record<string, { title: string; text: string; icon: React.ReactNode }> = {
      week: { title: "Semana despejada", text: "No hay tareas en los próximos 7 días.", icon: <ListTodo size={26} /> },
      inbox: { title: "Bandeja vacía", text: "Lo que apuntes con «+» sin fecha ni proyecto aparecerá aquí.", icon: <Inbox size={26} /> },
      nodate: { title: "Todo tiene fecha", text: "No hay tareas pendientes sin fecha.", icon: <ListTodo size={26} /> },
      done: { title: "Aún no has completado tareas", text: "¡A por la primera!", icon: <CheckCircle2 size={26} /> },
      project: { title: "Proyecto sin tareas pendientes", text: "Añade una con el botón de arriba.", icon: <ListTodo size={26} /> },
    };
    const e = empty[filter.kind];
    return <EmptyState icon={e.icon} title={e.title} text={e.text} />;
  }

  if (filter.kind === "week") {
    const groups = new Map<string, TaskView[]>();
    for (const t of tasks) groups.set(t.dueDate!, [...(groups.get(t.dueDate!) ?? []), t]);
    return (
      <>
        {[...groups.entries()].map(([date, list]) => (
          <section key={date}>
            <SectionTitle>{relativeDayLabel(date, today)}</SectionTitle>
            <TaskList tasks={list} today={today} showDate={false} />
          </section>
        ))}
      </>
    );
  }

  return (
    <div className="mt-2">
      <TaskList tasks={tasks} today={today} overdue={false} />
    </div>
  );
}
