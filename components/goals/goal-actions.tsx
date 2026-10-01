"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatDateStr, type DateStr } from "@/lib/dates";
import { formatNumber } from "@/lib/goals";
import type { GoalStatus, GoalView, MilestoneView, ProgressLogView } from "@/lib/types";
import { CheckCircle, Segmented } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.show({ message: ok });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, toast };
}

/** Foco y estado (activo / pausado / conseguido). */
export function GoalStatusControls({ goal }: { goal: GoalView }) {
  const { run, busy } = useRun();
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        className={`btn w-full ${goal.isFocus ? "bg-accent-soft text-accent" : "btn-secondary"}`}
        onClick={() =>
          run(
            () => api(`/api/goals/${goal.id}/focus`, { body: { focus: !goal.isFocus } }),
            goal.isFocus ? "Ya no es tu foco" : "Ahora es tu foco: lo verás en Hoy",
          )
        }
      >
        <Star size={20} fill={goal.isFocus ? "currentColor" : "none"} />
        {goal.isFocus ? "Es tu foco" : "Marcar como foco"}
      </button>
      <Segmented<GoalStatus>
        value={goal.status}
        onChange={(status) => {
          if (status === goal.status) return;
          run(
            () => api(`/api/goals/${goal.id}`, { method: "PATCH", body: { status } }),
            status === "ACHIEVED" ? "¡Objetivo conseguido! 🎉" : status === "PAUSED" ? "Objetivo en pausa" : "Objetivo activo",
          );
        }}
        options={[
          { value: "ACTIVE", label: "Activo" },
          { value: "PAUSED", label: "Pausado" },
          { value: "ACHIEVED", label: "Conseguido" },
        ]}
      />
    </div>
  );
}

export function MilestoneList({ goalId, initial }: { goalId: string; initial: MilestoneView[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");

  async function toggle(m: MilestoneView) {
    setItems((l) => l.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)));
    if (!m.done) navigator.vibrate?.(10);
    try {
      await api(`/api/milestones/${m.id}`, { method: "PATCH", body: { done: !m.done } });
      router.refresh();
    } catch (err) {
      setItems((l) => l.map((x) => (x.id === m.id ? { ...x, done: m.done } : x)));
      toast.error((err as Error).message);
    }
  }

  async function add() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    try {
      const created = await api<MilestoneView>(`/api/goals/${goalId}/milestones`, { body: { title: t } });
      setItems((l) => [...l, created]);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function remove(id: string) {
    const prev = items;
    setItems((l) => l.filter((x) => x.id !== id));
    try {
      await api(`/api/milestones/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setItems(prev);
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="card overflow-hidden">
      <h2 className="px-4 pt-3 font-semibold">Hitos</h2>
      {items.length ? (
        <ol className="mt-1 divide-y divide-line">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <CheckCircle checked={m.done} onToggle={() => toggle(m)} label={m.title} size={24} />
              <span className={`flex-1 ${m.done ? "text-muted line-through" : ""}`}>{m.title}</span>
              <button type="button" onClick={() => remove(m.id)} className="p-1 text-muted" aria-label="Eliminar hito">
                <X size={18} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 pt-1 text-sm text-muted">Divide el objetivo en pasos concretos.</p>
      )}
      <div className="flex gap-2 border-t border-line p-3">
        <input
          className="input"
          placeholder="Añadir hito"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} className="btn btn-secondary px-4" aria-label="Añadir hito">
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

/** Registrar el valor de un objetivo numérico + historial de registros. */
export function ProgressLogger({
  goal,
  logs,
  today,
}: {
  goal: GoalView;
  logs: ProgressLogView[];
  today: DateStr;
}) {
  const { run, busy, toast } = useRun();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const unit = goal.unit ? ` ${goal.unit}` : "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = value.trim().replace(/\s/g, "");
    const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
    if (!t || !Number.isFinite(n)) {
      toast.error("Escribe un número.");
      return;
    }
    run(async () => {
      await api(`/api/goals/${goal.id}/progress`, { body: { value: n, date, note: note.trim() || null } });
      setValue("");
      setNote("");
    }, "Valor registrado");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="card space-y-3 p-4">
        <h2 className="font-semibold">Registrar valor</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">Valor{unit ? ` (${goal.unit})` : ""}</span>
            <input
              className="input"
              inputMode="decimal"
              placeholder={goal.currentValue != null ? formatNumber(goal.currentValue) : "0"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="label">Fecha</span>
            <input type="date" className="input" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <input className="input" placeholder="Nota (opcional)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !value.trim()}>
          <Plus size={20} /> Guardar registro
        </button>
      </form>

      {logs.length ? (
        <details className="card overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 font-semibold">Historial ({logs.length})</summary>
          <ul className="divide-y divide-line border-t border-line">
            {[...logs].reverse().map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium tabular-nums">
                    {formatNumber(l.value)}
                    {unit}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {formatDateStr(l.date, "d MMM yyyy")}
                    {l.note ? ` · ${l.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="p-2 text-muted"
                  aria-label="Borrar registro"
                  disabled={busy}
                  onClick={() => run(() => api(`/api/goal-progress/${l.id}`, { method: "DELETE" }), "Registro borrado")}
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
