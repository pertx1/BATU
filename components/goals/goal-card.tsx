import Link from "next/link";
import { CalendarClock, ChevronRight, Star } from "lucide-react";
import { diffDays, formatDateStr, type DateStr } from "@/lib/dates";
import type { GoalView } from "@/lib/types";
import type { TrendPoint } from "@/lib/nutrition/weight";
import { Ring } from "@/components/nutrition/ring";
import { WeightChart } from "@/components/nutrition/weight-chart";

export function deadlineLabel(deadline: DateStr, today: DateStr): { text: string; late: boolean } {
  const d = diffDays(deadline, today);
  const date = formatDateStr(deadline, "d MMM yyyy");
  if (d < 0) return { text: `Venció el ${date}`, late: true };
  if (d === 0) return { text: "Vence hoy", late: false };
  if (d <= 60) return { text: `Quedan ${d} ${d === 1 ? "día" : "días"}`, late: false };
  return { text: `Hasta el ${date}`, late: false };
}

export function ProgressBar({ value, achieved }: { value: number; achieved?: boolean }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-accent-soft"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${achieved ? "bg-success" : "bg-accent"}`}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

export function GoalCard({ goal, today, weight }: { goal: GoalView; today: DateStr; weight?: { series: TrendPoint[]; target: number } | null }) {
  const deadline = goal.deadline && goal.status !== "ACHIEVED" ? deadlineLabel(goal.deadline, today) : null;
  const pct = Math.round(goal.progress * 100);
  // Objetivo «Peso»: anillo de progreso y mini gráfico de la tendencia.
  if (goal.type === "WEIGHT" && weight) {
    return (
      <Link href={`/objetivos/${goal.id}`} className="card block p-4 active:bg-surface-2">
        <div className="flex items-center gap-3">
          <Ring value={goal.progress} size={60} stroke={7} color="var(--success)" icon={<span className="text-[12px] font-bold tabular-nums text-fg">{pct}%</span>} />
          <div className="min-w-0 flex-1">
            {goal.isFocus ? (
              <p className="mb-0.5 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-accent">
                <Star size={12} fill="currentColor" /> Foco
              </p>
            ) : null}
            <p className="font-semibold leading-snug">{goal.title}</p>
            <p className="text-[13px] text-muted">⚖️ {goal.label} · según la tendencia</p>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </div>
        {weight.series.length > 1 ? (
          <div className="mt-2">
            <WeightChart series={weight.series.slice(-60)} target={weight.target} today={today} eta={null} compact />
          </div>
        ) : null}
        {deadline ? (
          <p className="mt-1 flex items-center justify-end gap-1 text-[13px] text-muted">
            <CalendarClock size={14} /> {deadline.text}
          </p>
        ) : null}
      </Link>
    );
  }
  return (
    <Link href={`/objetivos/${goal.id}`} className="card block p-4 active:bg-surface-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {goal.isFocus ? (
            <p className="mb-0.5 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-accent">
              <Star size={12} fill="currentColor" /> Foco
            </p>
          ) : null}
          <p className="font-semibold leading-snug">{goal.title}</p>
          {goal.project ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
              <span className="size-2 rounded-full" style={{ backgroundColor: goal.project.color }} />
              {goal.project.emoji ? `${goal.project.emoji} ` : ""}
              {goal.project.name}
            </p>
          ) : null}
        </div>
        <span className="text-lg font-bold tabular-nums">{pct}%</span>
        <ChevronRight size={18} className="mt-1 text-muted" />
      </div>
      <div className="mt-3">
        <ProgressBar value={goal.progress} achieved={goal.status === "ACHIEVED"} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[13px] text-muted">
        <span>{goal.label}</span>
        {deadline ? (
          <span className={`flex items-center gap-1 ${deadline.late ? "text-danger" : ""}`}>
            <CalendarClock size={14} /> {deadline.text}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
