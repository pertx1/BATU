"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { api } from "@/lib/client/api";
import { minutesToHHMM, type DateStr } from "@/lib/dates";
import { habitDaysLabel } from "@/lib/habits";
import type { HabitView } from "@/lib/types";
import { CheckCircle } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

export function useHabitToggle(habitId: string, initialDone: boolean) {
  const router = useRouter();
  const toast = useToast();
  const [done, setDone] = useState(initialDone);

  async function toggle(date?: DateStr) {
    const next = !done;
    setDone(next);
    try {
      await api(`/api/habits/${habitId}/toggle`, { body: { done: next, date } });
      router.refresh();
    } catch (err) {
      setDone(!next);
      toast.error((err as Error).message);
    }
  }
  return { done, toggle };
}

export function HabitRow({ habit, week }: { habit: HabitView; week?: { date: DateStr; done: boolean }[] }) {
  const { done, toggle } = useHabitToggle(habit.id, habit.doneToday);
  const color = habit.color ?? "var(--success)";
  const streak = habit.currentStreak + (done && !habit.doneToday ? 1 : 0) - (!done && habit.doneToday ? 1 : 0);

  return (
    <Link href={`/habitos/${habit.id}`} className={`flex items-center gap-3 px-4 py-3 active:bg-surface-2 ${!habit.scheduledToday && !done ? "opacity-60" : ""}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl">{habit.emoji || "✨"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{habit.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
          {streak > 0 ? (
            <span className="inline-flex items-center gap-0.5 font-semibold text-warning">
              <Flame size={13} /> {streak}
            </span>
          ) : null}
          <span className="truncate">
            {habit.scheduledToday ? habitDaysLabel(habit.daysOfWeek) : "Hoy no toca"}
            {habit.reminderTime != null ? ` · ${minutesToHHMM(habit.reminderTime)}` : ""}
          </span>
        </div>
        {week ? (
          <div className="mt-1.5 flex gap-1">
            {week.map((d, i) => (
              <span
                key={d.date}
                className="size-2 rounded-full"
                style={{ backgroundColor: (i === week.length - 1 ? done : d.done) ? color : "var(--line)" }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <CheckCircle checked={done} onToggle={() => toggle()} color={color} label={done ? "Desmarcar hoy" : "Marcar como hecho hoy"} size={30} />
    </Link>
  );
}
