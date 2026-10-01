import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { addDays, todayStr } from "@/lib/dates";
import { completionRate, habitDaysLabel, habitGrid } from "@/lib/habits";
import { listHabitViews } from "@/lib/data/habits";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { HabitForm } from "@/components/habits/habit-form";
import { HabitGrid } from "@/components/habits/habit-grid";
import { DeleteHabitButton } from "@/components/habits/delete-habit";

export const metadata: Metadata = { title: "Hábito" };

export default async function HabitPage({ params }: PageProps<"/habitos/[id]">) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const today = todayStr(user.timezone);
  const { habits, logs } = await listHabitViews(user.id, user.timezone, today);
  const habit = habits.find((h) => h.id === id);
  if (!habit) notFound();

  const done = logs.get(habit.id) ?? new Set<string>();
  const grid = habitGrid(habit.daysOfWeek, done, today, 15);
  const from30 = addDays(today, -29);
  const rate30 = completionRate(habit.daysOfWeek, done, habit.since > from30 ? habit.since : from30, today);

  return (
    <>
      <PageHeader title={`${habit.emoji ?? ""} ${habit.name}`.trim()} subtitle={habitDaysLabel(habit.daysOfWeek)} back="/habitos" />
      <PageBody>
        <div className="grid grid-cols-3 gap-2">
          <Stat value={`${habit.currentStreak}`} label="Racha actual" accent />
          <Stat value={`${habit.bestStreak}`} label="Mejor racha" />
          <Stat value={`${Math.round(rate30 * 100)}%`} label="Últimos 30 días" />
        </div>
        <div className="card mt-4 p-4">
          <h2 className="mb-3 font-semibold">Últimas semanas</h2>
          <HabitGrid habitId={habit.id} columns={grid} color={habit.color ?? "var(--success)"} />
          <p className="mt-3 text-xs text-muted">Toca un día pasado para marcarlo o desmarcarlo.</p>
        </div>
        <div className="mt-6">
          <HabitForm key={JSON.stringify(habit)} habit={habit} />
        </div>
        <div className="mt-4">
          <DeleteHabitButton habitId={habit.id} />
        </div>
      </PageBody>
    </>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="card px-3 py-3 text-center">
      <p className={`text-2xl font-bold ${accent ? "text-warning" : ""}`}>
        {accent && value !== "0" ? "🔥 " : ""}
        {value}
      </p>
      <p className="mt-0.5 text-[12px] text-muted">{label}</p>
    </div>
  );
}
