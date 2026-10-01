"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { addDays, type DateStr } from "@/lib/dates";
import type { TaskView } from "@/lib/types";
import { TaskItem } from "@/components/tasks/task-item";
import { useToast } from "@/components/ui/toast";

/** Tareas vencidas, en rojo, con opción de pasarlas a hoy o a mañana. */
export function OverdueList({ tasks, today }: { tasks: TaskView[]; today: DateStr }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function move(ids: string[], date: DateStr, label: string) {
    setBusy(true);
    try {
      await api("/api/tasks/reschedule", { body: { ids, dueDate: date } });
      toast.show({ message: ids.length > 1 ? `${ids.length} tareas movidas a ${label}` : `Movida a ${label}` });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const tomorrow = addDays(today, 1);
  return (
    <div className="overflow-hidden rounded-2xl border border-danger/40 bg-surface">
      <ul className="divide-y divide-line">
        {tasks.map((t) => (
          <li key={t.id}>
            <TaskItem task={t} today={today} overdue />
            <div className="-mt-1 flex gap-2 pb-3 pl-14 pr-4">
              <button type="button" disabled={busy} onClick={() => move([t.id], today, "hoy")} className="rounded-lg bg-danger-soft px-3 py-1.5 text-[13px] font-semibold text-danger">
                Hoy
              </button>
              <button type="button" disabled={busy} onClick={() => move([t.id], tomorrow, "mañana")} className="rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-semibold">
                Mañana
              </button>
            </div>
          </li>
        ))}
      </ul>
      {tasks.length > 1 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => move(tasks.map((t) => t.id), today, "hoy")}
          className="w-full border-t border-line py-3 text-[15px] font-semibold text-danger active:bg-surface-2"
        >
          Mover todas a hoy
        </button>
      ) : null}
    </div>
  );
}
