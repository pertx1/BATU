"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, RotateCcw, Sunrise, Trash2, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { addDays, type DateStr } from "@/lib/dates";
import type { SubtaskView, TaskView } from "@/lib/types";
import { CheckCircle } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { SnoozeButtons } from "@/components/ui/snooze-buttons";
import { useTaskCompletion } from "./task-item";

/** Botones rápidos en la ficha de una tarea (también a la que lleva una notificación). */
export function TaskQuickActions({ task, today }: { task: TaskView; today: DateStr }) {
  const router = useRouter();
  const { complete, uncomplete, toast } = useTaskCompletion();
  const [busy, setBusy] = useState(false);
  const done = !!task.completedAt;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {done ? (
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(() => uncomplete(task.id))}>
          <RotateCcw size={20} /> Marcar pendiente
        </button>
      ) : (
        <button
          type="button"
          className="btn bg-success text-white"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await complete(task.id);
              router.refresh();
            })
          }
        >
          <Check size={20} strokeWidth={3} /> Hecho
        </button>
      )}
      <button
        type="button"
        className="btn btn-secondary"
        disabled={busy || done}
        onClick={() =>
          run(async () => {
            await api(`/api/tasks/${task.id}`, { method: "PATCH", body: { dueDate: addDays(today, 1) } });
            toast.show({ message: "Movida a mañana" });
            router.refresh();
          })
        }
      >
        <Sunrise size={20} /> Mañana
      </button>
      {!done ? <SnoozeButtons path={`/api/tasks/${task.id}/snooze`} /> : null}
    </div>
  );
}


export function SubtaskList({ taskId, initial }: { taskId: string; initial: SubtaskView[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");

  async function toggle(s: SubtaskView) {
    setItems((list) => list.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
    try {
      await api(`/api/subtasks/${s.id}`, { method: "PATCH", body: { done: !s.done } });
      router.refresh();
    } catch (err) {
      setItems((list) => list.map((x) => (x.id === s.id ? { ...x, done: s.done } : x)));
      toast.error((err as Error).message);
    }
  }

  async function add() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    try {
      const created = await api<SubtaskView>(`/api/tasks/${taskId}/subtasks`, { body: { title: t } });
      setItems((list) => [...list, created]);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function remove(id: string) {
    const prev = items;
    setItems((list) => list.filter((x) => x.id !== id));
    try {
      await api(`/api/subtasks/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setItems(prev);
      toast.error((err as Error).message);
    }
  }

  const doneCount = items.filter((s) => s.done).length;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="font-semibold">Subtareas</h2>
        {items.length ? <span className="text-sm text-muted">{doneCount}/{items.length}</span> : null}
      </div>
      {items.length ? (
        <div className="mx-4 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
        </div>
      ) : null}
      <ul className="mt-1 divide-y divide-line">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
            <CheckCircle checked={s.done} onToggle={() => toggle(s)} label={s.title} size={22} />
            <span className={`flex-1 ${s.done ? "text-muted line-through" : ""}`}>{s.title}</span>
            <button type="button" onClick={() => remove(s.id)} className="p-1 text-muted" aria-label="Eliminar subtarea">
              <X size={18} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t border-line p-3">
        <input
          className="input"
          placeholder="Añadir subtarea"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} className="btn btn-secondary px-4" aria-label="Añadir subtarea">
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      className={`btn w-full ${confirm ? "btn-danger" : "btn-secondary text-danger"}`}
      onClick={async () => {
        if (!confirm) {
          setConfirm(true);
          setTimeout(() => setConfirm(false), 4000);
          return;
        }
        try {
          await api(`/api/tasks/${taskId}`, { method: "DELETE" });
          toast.show({ message: "Tarea eliminada" });
          router.push("/tareas");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
    >
      <Trash2 size={20} /> {confirm ? "Pulsa otra vez para eliminar" : "Eliminar tarea"}
    </button>
  );
}
