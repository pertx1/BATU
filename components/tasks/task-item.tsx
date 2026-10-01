"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, ListChecks, Repeat } from "lucide-react";
import { api } from "@/lib/client/api";
import { minutesToHHMM, relativeDayLabel, type DateStr } from "@/lib/dates";
import type { Priority, TaskView } from "@/lib/types";
import { CheckCircle } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

export const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: "var(--danger)",
  MEDIUM: "var(--warning)",
  LOW: "var(--muted)",
};

export function useTaskCompletion() {
  const router = useRouter();
  const toast = useToast();

  async function complete(id: string, onUndo?: () => void) {
    navigator.vibrate?.(10);
    await api(`/api/tasks/${id}/complete`, { method: "POST" });
    toast.show({
      message: "¡Hecho! ✓",
      actionLabel: "Deshacer",
      duration: 5000,
      onAction: async () => {
        try {
          await api(`/api/tasks/${id}/uncomplete`, { method: "POST" });
          onUndo?.();
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      },
    });
    setTimeout(() => router.refresh(), 700);
  }

  async function uncomplete(id: string) {
    await api(`/api/tasks/${id}/uncomplete`, { method: "POST" });
    router.refresh();
  }

  return { complete, uncomplete, toast };
}

export function TaskItem({
  task,
  today,
  showDate = true,
  overdue = false,
}: {
  task: TaskView;
  today: DateStr;
  showDate?: boolean;
  overdue?: boolean;
}) {
  const [done, setDone] = useState(!!task.completedAt);
  const { complete, uncomplete, toast } = useTaskCompletion();

  async function toggle() {
    const next = !done;
    setDone(next);
    try {
      if (next) await complete(task.id, () => setDone(false));
      else await uncomplete(task.id);
    } catch (err) {
      setDone(!next);
      toast.error((err as Error).message);
    }
  }

  const subDone = task.subtasks.filter((s) => s.done).length;
  const meta: React.ReactNode[] = [];
  if (showDate && task.dueDate) {
    meta.push(
      <span key="d" className={overdue ? "font-semibold text-danger" : ""}>
        {relativeDayLabel(task.dueDate, today)}
      </span>,
    );
  }
  if (task.time != null) meta.push(<span key="t" className={overdue ? "text-danger" : ""}>{minutesToHHMM(task.time)}</span>);
  if (task.project) {
    meta.push(
      <span key="p" className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full" style={{ backgroundColor: task.project.color }} />
        {task.project.emoji ? `${task.project.emoji} ` : ""}
        {task.project.name}
      </span>,
    );
  }
  if (task.subtasks.length) {
    meta.push(
      <span key="s" className="inline-flex items-center gap-0.5">
        <ListChecks size={13} /> {subDone}/{task.subtasks.length}
      </span>,
    );
  }
  if (task.recurrence !== "NONE") meta.push(<Repeat key="r" size={13} aria-label="Se repite" />);
  if (task.reminderMode !== "NONE") meta.push(<AlarmClock key="a" size={13} aria-label="Con recordatorio" />);

  return (
    <Link
      href={`/tareas/${task.id}`}
      className={`flex items-start gap-3 px-4 py-3 transition active:bg-surface-2 ${done ? "opacity-60" : ""}`}
    >
      <div className="pt-0.5">
        <CheckCircle
          checked={done}
          onToggle={toggle}
          color={done ? undefined : PRIORITY_COLOR[task.priority]}
          label={done ? "Marcar como pendiente" : "Completar tarea"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[16px] leading-snug ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
        {meta.length ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">{meta}</div>
        ) : null}
      </div>
    </Link>
  );
}

export function TaskList({
  tasks,
  today,
  showDate = true,
  overdue = false,
}: {
  tasks: TaskView[];
  today: DateStr;
  showDate?: boolean;
  overdue?: boolean;
}) {
  return (
    <ul className={`card divide-y divide-line overflow-hidden ${overdue ? "ring-1 ring-danger/40" : ""}`}>
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskItem task={t} today={today} showDate={showDate} overdue={overdue} />
        </li>
      ))}
    </ul>
  );
}
