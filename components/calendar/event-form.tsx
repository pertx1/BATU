"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { minutesToHHMM, type DateStr } from "@/lib/dates";
import { EVENT_REMINDER_OPTIONS, type EventView, type ProjectView } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

export function EventForm({
  event,
  projects,
  defaultDate,
  returnTo,
}: {
  event?: EventView;
  projects: ProjectView[];
  defaultDate: DateStr;
  returnTo: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(event?.title ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState<string>(event?.startDate ?? defaultDate);
  const [endDate, setEndDate] = useState<string>(event?.endDate ?? event?.startDate ?? defaultDate);
  const [startTime, setStartTime] = useState(event?.start != null ? minutesToHHMM(event.start) : "10:00");
  const [endTime, setEndTime] = useState(event?.end != null ? minutesToHHMM(event.end) : "11:00");
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [projectId, setProjectId] = useState(event?.project?.id ?? "");
  const [reminder, setReminder] = useState<string>(
    event ? (event.reminderMinutesBefore != null ? String(event.reminderMinutesBefore) : "") : "15",
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function changeStartTime(v: string) {
    // Al mover el inicio, el fin se desplaza para conservar la duración.
    const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
    if (startTime && endTime && v) {
      const duration = toMin(endTime) - toMin(startTime);
      if (duration > 0) setEndTime(minutesToHHMM(Math.min(toMin(v) + duration, 23 * 60 + 59)));
    }
    setStartTime(v);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      allDay,
      startDate,
      endDate: endDate && endDate >= startDate ? endDate : startDate,
      startTime: allDay ? null : startTime || null,
      endTime: allDay ? null : endTime || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      projectId: projectId || null,
      reminderMinutesBefore: reminder ? Number(reminder) : null,
    };
    try {
      if (event) {
        await api(`/api/events/${event.id}`, { method: "PATCH", body: payload });
        toast.show({ message: "Evento guardado" });
        router.refresh();
        setSaving(false);
      } else {
        await api("/api/events", { body: payload });
        toast.show({ message: "Evento creado" });
        router.push(returnTo);
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!event) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
      toast.show({ message: "Evento eliminado" });
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input
        className="input text-lg font-semibold"
        placeholder="Título del evento"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={!event}
        required
        maxLength={200}
        aria-label="Título"
      />

      <div className="card divide-y divide-line overflow-hidden">
        <label className="flex min-h-14 items-center justify-between px-4">
          <span className="font-medium">Todo el día</span>
          <input type="checkbox" role="switch" className="size-6 accent-[var(--accent)]" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        </label>
        <div className="px-4 py-3">
          <span className="label">Empieza</span>
          <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => {
              const v = e.target.value;
              if (endDate < v || endDate === startDate) setEndDate(v);
              setStartDate(v);
            }}
            required
            aria-label="Fecha de inicio"
          />
          {!allDay ? <input type="time" className="input" value={startTime} onChange={(e) => changeStartTime(e.target.value)} aria-label="Hora de inicio" /> : null}
          </div>
        </div>
        <div className="px-4 py-3">
          <span className="label">Termina</span>
          <div className="grid grid-cols-2 gap-2">
          <input type="date" className="input" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Fecha de fin" />
          {!allDay ? <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="Hora de fin" /> : null}
          </div>
        </div>
      </div>

      <input className="input" placeholder="Lugar" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} aria-label="Lugar" />

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
          <span className="label">Recordatorio</span>
          <select className="input" value={reminder} onChange={(e) => setReminder(e.target.value)}>
            <option value="">Sin aviso</option>
            {EVENT_REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {allDay && reminder ? <span className="mt-1.5 block text-xs text-muted">En eventos de todo el día se cuenta desde las 9:00.</span> : null}
        </label>
      </div>

      <textarea className="input min-h-24 resize-y" placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} aria-label="Notas" />

      <button type="submit" className="btn btn-primary w-full" disabled={saving || !title.trim()}>
        {saving ? "Guardando…" : event ? "Guardar cambios" : "Crear evento"}
      </button>
      {event ? (
        <button type="button" onClick={remove} className={`btn w-full ${confirmDelete ? "btn-danger" : "btn-secondary text-danger"}`}>
          <Trash2 size={20} /> {confirmDelete ? "Pulsa otra vez para eliminar" : "Eliminar evento"}
        </button>
      ) : null}
    </form>
  );
}
