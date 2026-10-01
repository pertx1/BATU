"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { useLeave } from "@/lib/client/navigation";
import { addDays, minutesToHHMM, type DateStr } from "@/lib/dates";
import { RECURRENCE_LABEL } from "@/lib/recurrence";
import type { Priority, ProjectView, Recurrence, ReminderMode, TaskView } from "@/lib/types";
import { Segmented, WeekdayPicker } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

const BEFORE_OPTIONS = [
  { value: 0, label: "A la hora" },
  { value: 5, label: "5 min antes" },
  { value: 10, label: "10 min antes" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 1440, label: "1 día antes" },
];

export type GoalOption = { id: string; title: string };

export function TaskForm({
  task,
  projects,
  goals,
  today,
  defaults,
  returnTo,
}: {
  task?: TaskView;
  projects: ProjectView[];
  goals: GoalOption[];
  today: DateStr;
  defaults?: { dueDate?: DateStr | null; title?: string; projectId?: string | null; goalId?: string | null };
  returnTo: string;
}) {
  const router = useRouter();
  const leave = useLeave();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(task?.title ?? defaults?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [dueDate, setDueDate] = useState<string>(task?.dueDate ?? defaults?.dueDate ?? "");
  const [time, setTime] = useState<string>(task?.time != null ? minutesToHHMM(task.time) : "");
  const [projectId, setProjectId] = useState(task?.project?.id ?? defaults?.projectId ?? "");
  const [goalId, setGoalId] = useState(task?.goalId ?? defaults?.goalId ?? "");
  const [reminderMode, setReminderMode] = useState<ReminderMode>(task?.reminderMode ?? "NONE");
  const [reminderDate, setReminderDate] = useState<string>(task?.reminderDate ?? "");
  const [reminderTime, setReminderTime] = useState<string>(
    task?.reminderTime != null ? minutesToHHMM(task.reminderTime) : "",
  );
  const [minutesBefore, setMinutesBefore] = useState<number>(task?.reminderMinutesBefore ?? 15);
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? "NONE");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task?.recurrenceDays ?? []);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");

  function chooseReminderMode(mode: ReminderMode) {
    setReminderMode(mode);
    if (mode === "AT_TIME") {
      if (!reminderDate) setReminderDate(dueDate || today);
      if (!reminderTime) setReminderTime(time || "09:00");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (reminderMode === "BEFORE" && !dueDate && recurrence === "NONE") {
      toast.error("Para avisar antes, la tarea necesita una fecha.");
      return;
    }
    if (reminderMode === "AT_TIME" && (!reminderDate || !reminderTime)) {
      toast.error("Elige el día y la hora del recordatorio.");
      return;
    }
    setSaving(true);
    const extraSubtask = newSubtask.trim();
    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      priority,
      dueDate: dueDate || null,
      time: dueDate && time ? time : null,
      projectId: projectId || null,
      goalId: goalId || null,
      reminderMode,
      reminderDate: reminderMode === "AT_TIME" ? reminderDate : null,
      reminderTime: reminderMode === "AT_TIME" ? reminderTime : null,
      reminderMinutesBefore: reminderMode === "BEFORE" ? minutesBefore : null,
      recurrence,
      recurrenceDays: recurrence === "WEEKDAYS" ? recurrenceDays : [],
      ...(task ? {} : { subtasks: extraSubtask ? [...subtasks, extraSubtask] : subtasks }),
    };
    try {
      if (task) {
        await api(`/api/tasks/${task.id}`, { method: "PATCH", body: payload });
        toast.show({ message: "Cambios guardados" });
        leave(returnTo);
      } else {
        await api("/api/tasks", { method: "POST", body: payload });
        toast.show({ message: dueDate || projectId ? "Tarea creada" : "Guardada en la Bandeja" });
        router.push(returnTo);
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  }

  const tomorrow = addDays(today, 1);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input
        className="input text-lg font-semibold"
        placeholder="¿Qué hay que hacer?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={!task}
        required
        maxLength={300}
        aria-label="Título"
      />

      <textarea
        className="input min-h-20 resize-y"
        placeholder="Notas"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={5000}
        aria-label="Notas"
      />

      <div>
        <span className="label">Fecha</span>
        <div className="mb-2 flex gap-2">
          {[
            { v: today, l: "Hoy" },
            { v: tomorrow, l: "Mañana" },
            { v: "", l: "Sin fecha" },
          ].map((o) => (
            <button
              key={o.l}
              type="button"
              onClick={() => setDueDate(o.v)}
              className={`min-h-10 flex-1 rounded-xl text-[15px] font-semibold transition ${
                dueDate === o.v ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Fecha" />
          <input
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={!dueDate}
            aria-label="Hora (opcional)"
          />
        </div>
      </div>

      <div>
        <span className="label">Prioridad</span>
        <Segmented
          value={priority}
          onChange={setPriority}
          options={[
            { value: "HIGH", label: "🔴 Alta" },
            { value: "MEDIUM", label: "🟡 Media" },
            { value: "LOW", label: "⚪ Baja" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Proyecto</span>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji ? `${p.emoji} ` : ""}
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Objetivo vinculado</span>
          <select className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">Ninguno</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="label">Repetir</span>
        <select className="input" value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
          {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => (
            <option key={r} value={r}>
              {RECURRENCE_LABEL[r]}
            </option>
          ))}
        </select>
        {recurrence === "WEEKDAYS" ? (
          <div className="mt-3">
            <WeekdayPicker value={recurrenceDays} onChange={setRecurrenceDays} />
          </div>
        ) : null}
        {recurrence !== "NONE" && !dueDate ? (
          <p className="mt-1.5 text-xs text-muted">Empezará hoy.</p>
        ) : null}
      </div>

      <div>
        <span className="label">Recordatorio</span>
        <Segmented
          value={reminderMode}
          onChange={chooseReminderMode}
          options={[
            { value: "NONE", label: "No" },
            { value: "AT_TIME", label: "A una hora" },
            { value: "BEFORE", label: "Antes" },
          ]}
        />
        {reminderMode === "AT_TIME" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input type="date" className="input" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} aria-label="Día del aviso" />
            <input type="time" className="input" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} aria-label="Hora del aviso" />
          </div>
        ) : null}
        {reminderMode === "BEFORE" ? (
          <div className="mt-3">
            <select className="input" value={minutesBefore} onChange={(e) => setMinutesBefore(Number(e.target.value))}>
              {BEFORE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!time ? <p className="mt-1.5 text-xs text-muted">Sin hora, se cuenta desde las 9:00.</p> : null}
          </div>
        ) : null}
      </div>

      {!task ? (
        <div>
          <span className="label">Subtareas</span>
          {subtasks.length ? (
            <ul className="mb-2 space-y-1.5">
              {subtasks.map((s, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="flex-1">{s}</span>
                  <button type="button" aria-label="Quitar" onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))} className="text-muted">
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Añadir subtarea"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (newSubtask.trim()) {
                    setSubtasks([...subtasks, newSubtask.trim()]);
                    setNewSubtask("");
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary px-4"
              aria-label="Añadir subtarea"
              onClick={() => {
                if (newSubtask.trim()) {
                  setSubtasks([...subtasks, newSubtask.trim()]);
                  setNewSubtask("");
                }
              }}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={saving || !title.trim()}>
        {saving ? "Guardando…" : task ? "Guardar cambios" : "Crear tarea"}
      </button>
    </form>
  );
}
