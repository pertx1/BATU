import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Plus } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { todayStr } from "@/lib/dates";
import { lastNDays, listHabitViews } from "@/lib/data/habits";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { HabitRow } from "@/components/habits/habit-card";
import { EmptyState, SectionTitle } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Hábitos" };

export default async function HabitsPage() {
  const user = await requireOnboardedUser();
  const today = todayStr(user.timezone);
  const { habits, logs } = await listHabitViews(user.id, user.timezone, today);
  const days = lastNDays(today, 7);
  const todays = habits.filter((h) => h.scheduledToday);
  const others = habits.filter((h) => !h.scheduledToday);
  const doneCount = todays.filter((h) => h.doneToday).length;

  const row = (h: (typeof habits)[number]) => (
    <li key={h.id}>
      <HabitRow habit={h} week={days.map((d) => ({ date: d, done: logs.get(h.id)?.has(d) ?? false }))} />
    </li>
  );

  return (
    <>
      <PageHeader
        title="Hábitos"
        subtitle={todays.length ? `${doneCount} de ${todays.length} hechos hoy` : undefined}
        right={
          <Link href="/habitos/nuevo" aria-label="Nuevo hábito" className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Plus size={24} />
          </Link>
        }
      />
      <PageBody>
        {habits.length === 0 ? (
          <>
            <EmptyState icon={<Flame size={26} />} title="Crea tu primer hábito" text="Pequeñas acciones diarias, grandes cambios." />
            <Link href="/habitos/nuevo" className="btn btn-primary w-full">
              <Plus size={20} /> Nuevo hábito
            </Link>
          </>
        ) : (
          <>
            {todays.length ? (
              <>
                <SectionTitle>Hoy</SectionTitle>
                <ul className="card divide-y divide-line overflow-hidden">{todays.map(row)}</ul>
              </>
            ) : null}
            {others.length ? (
              <>
                <SectionTitle>Otros días</SectionTitle>
                <ul className="card divide-y divide-line overflow-hidden">{others.map(row)}</ul>
              </>
            ) : null}
          </>
        )}
      </PageBody>
    </>
  );
}
