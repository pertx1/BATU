import Link from "next/link";
import { ChevronRight, Menu, Plus, Target } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { capitalize, formatTz, greeting, todayStr } from "@/lib/dates";
import { getTodayData } from "@/lib/data/today";
import { getAntolaToday } from "@/lib/data/antola";
import { AntolaToday } from "@/components/antola/antola-today";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { HabitRow } from "@/components/habits/habit-card";
import { TaskList } from "@/components/tasks/task-item";
import { OverdueList } from "@/components/today/overdue-list";
import { ProgressCard } from "@/components/today/progress-card";
import { SectionTitle } from "@/components/ui/controls";
import { BadgeSync } from "@/components/today/badge-sync";
import { NotifyBanner } from "@/components/today/notify-banner";
import { EventRow } from "@/components/calendar/event-row";

export default async function TodayPage() {
  const user = await requireOnboardedUser();
  const now = new Date();
  const today = todayStr(user.timezone, now);
  const data = await getTodayData(user.id, user.timezone, today);
  const antola = await getAntolaToday(user, today, data, now);
  const hello = `${greeting(now, user.timezone)}${user.name ? `, ${user.name}` : ""}`;
  const date = capitalize(formatTz(now, user.timezone, "EEEE, d 'de' MMMM"));
  const pendingToday = data.tasks.filter((t) => !t.completedAt).length + data.overdue.length;

  return (
    <>
      <BadgeSync count={pendingToday} />
      <PageHeader
        subtitle={date}
        title={hello}
        right={
          <Link href="/menu" aria-label="Menú" className="glass flex size-11 items-center justify-center rounded-full text-fg">
            <Menu size={22} />
          </Link>
        }
      />
      <PageBody>
        <NotifyBanner />
        {antola ? <AntolaToday data={antola} overdueIds={data.overdue.map((t) => t.id)} today={today} /> : null}
        <div className="space-y-3">
          <ProgressCard done={data.progress.done} total={data.progress.total} />
          {data.focus ? (
            <Link href={`/objetivos/${data.focus.id}`} className="card flex items-center gap-3 p-4 active:bg-surface-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Target size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Foco</p>
                <p className="truncate font-semibold">{data.focus.title}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(data.focus.progress * 100)}%` }} />
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {data.focus.label} · {Math.round(data.focus.progress * 100)}%
                </p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ) : null}
        </div>

        {data.overdue.length ? (
          <>
            <SectionTitle tone="danger">Vencidas · {data.overdue.length}</SectionTitle>
            <OverdueList tasks={data.overdue} today={today} />
          </>
        ) : null}

        <SectionTitle>Tareas de hoy</SectionTitle>
        {data.tasks.length ? (
          <TaskList tasks={data.tasks} today={today} showDate={false} />
        ) : (
          <Link href={`/tareas/nueva?date=${today}&back=/`} className="card flex items-center gap-3 p-4 text-muted active:bg-surface-2">
            <Plus size={20} /> Añadir una tarea para hoy
          </Link>
        )}

        {data.events.length ? (
          <>
            <SectionTitle>Eventos</SectionTitle>
            <ul className="card divide-y divide-line overflow-hidden">
              {data.events.map((e) => (
                <li key={e.id}>
                  <EventRow event={e} day={today} />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {data.habits.length ? (
          <>
            <SectionTitle>Hábitos de hoy</SectionTitle>
            <ul className="card divide-y divide-line overflow-hidden">
              {data.habits.map((h) => (
                <li key={h.id}>
                  <HabitRow habit={h} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </PageBody>
    </>
  );
}
