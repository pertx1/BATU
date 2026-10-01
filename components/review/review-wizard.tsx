"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarArrowUp, Check, CircleCheckBig, Quote, Sunrise } from "lucide-react";
import { api } from "@/lib/client/api";
import { addDays, relativeDayLabel, type DateStr } from "@/lib/dates";
import type { TaskView } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { Antola } from "@/components/antola/antola";
import type { AntolaLook } from "@/lib/gamification";
import type { Expression } from "@/lib/antola/messages";

const STEPS = ["Completado", "Pendiente", "Próxima semana", "Nota"] as const;

export function ReviewWizard({
  weekStart,
  today,
  completed,
  pending: initialPending,
  habits,
  previousFocus,
  existing,
  antola = null,
}: {
  weekStart: DateStr;
  today: DateStr;
  completed: TaskView[];
  pending: TaskView[];
  habits: { hit: number; scheduled: number; rate: number | null };
  previousFocus: string | null;
  existing: { nextWeekFocus: string | null; notes: string | null } | null;
  antola?: { look: AntolaLook; steps: { text: string; expression: Expression }[] } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(initialPending);
  const [moved, setMoved] = useState<Map<string, DateStr>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set(initialPending.map((t) => t.id)));
  const [customDate, setCustomDate] = useState("");
  const [focus, setFocus] = useState(existing?.nextWeekFocus ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  // Primer día de la semana siguiente a la revisada (nunca en el pasado).
  const nextMonday = addDays(weekStart, 7) > today ? addDays(weekStart, 7) : today;
  const waiting = pending.filter((t) => !moved.has(t.id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function reschedule(dueDate: DateStr) {
    const ids = waiting.filter((t) => selected.has(t.id)).map((t) => t.id);
    if (!ids.length) return toast.error("Selecciona alguna tarea.");
    setBusy(true);
    try {
      await api("/api/tasks/reschedule", { body: { ids, dueDate } });
      setMoved((m) => new Map([...m, ...ids.map((id) => [id, dueDate] as const)]));
      toast.show({ message: `${ids.length === 1 ? "1 tarea movida" : `${ids.length} tareas movidas`} a ${relativeDayLabel(dueDate, today).toLowerCase()}` });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function complete(id: string) {
    setBusy(true);
    try {
      await api(`/api/tasks/${id}/complete`, { method: "POST" });
      setPending((p) => p.filter((t) => t.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const res = await api<{ id: string }>("/api/reviews", {
        body: {
          weekStart,
          nextWeekFocus: focus.trim() || null,
          notes: notes.trim() || null,
          pendingIds: initialPending.map((t) => t.id),
        },
      });
      toast.show({ message: "Revisión guardada ✓" });
      router.push(`/revision/${res.id}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <ol className="mb-5 flex gap-1.5" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className="block w-full text-left"
            >
              <span className={`block h-1.5 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-surface-2"}`} />
              <span className={`mt-1 block truncate text-[12px] font-medium ${i === step ? "text-fg" : "text-muted"}`}>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      {antola ? (
        <div className="mb-4 flex items-end gap-2" aria-live="polite">
          <Antola expression={antola.steps[step].expression} stage={antola.look.stage} accessories={antola.look.accessories} size={72} />
          <p className="antola-bubble mb-3 flex-1 rounded-2xl bg-surface px-3.5 py-2.5 text-[15px] leading-snug">{antola.steps[step].text}</p>
        </div>
      ) : null}

      {step === 0 ? (
        <section className="space-y-4">
          <div className="card p-5 text-center">
            <CircleCheckBig size={36} className="mx-auto text-success" />
            <p className="mt-2 text-4xl font-bold tabular-nums">{completed.length}</p>
            <p className="text-muted">{completed.length === 1 ? "tarea completada" : "tareas completadas"}</p>
            {habits.rate != null ? (
              <p className="mt-3 text-sm text-muted">
                Hábitos: <b className="text-fg">{Math.round(habits.rate * 100)}%</b> ({habits.hit} de {habits.scheduled} días)
              </p>
            ) : null}
          </div>
          {previousFocus ? (
            <div className="rounded-2xl border-l-4 border-accent bg-accent-soft px-4 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent">
                <Quote size={14} /> Tu propósito para esta semana era
              </p>
              <p className="mt-1 whitespace-pre-line">{previousFocus}</p>
            </div>
          ) : null}
          {completed.length ? (
            <ul className="card divide-y divide-line overflow-hidden">
              {completed.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Check size={18} className="shrink-0 text-success" strokeWidth={3} />
                  <span className="min-w-0 flex-1">{t.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-4 text-center text-muted">Esta semana no completaste tareas. ¡La próxima será mejor!</p>
          )}
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          {pending.length === 0 ? (
            <p className="card p-5 text-center text-muted">🎉 No te quedó nada pendiente.</p>
          ) : (
            <>
              <p className="text-muted">
                {waiting.length
                  ? "Elige qué hacer con lo que quedó sin terminar. Puedes moverlo en bloque."
                  : "Todo reprogramado. ¡Bien!"}
              </p>
              <ul className="card divide-y divide-line overflow-hidden">
                {pending.map((t) => {
                  const to = moved.get(t.id);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      {to ? (
                        <CalendarArrowUp size={20} className="shrink-0 text-accent" />
                      ) : (
                        <input
                          type="checkbox"
                          className="size-5 shrink-0 accent-[var(--accent)]"
                          checked={selected.has(t.id)}
                          onChange={() => toggle(t.id)}
                          aria-label={`Seleccionar ${t.title}`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={to ? "text-muted" : ""}>{t.title}</p>
                        <p className={`text-[13px] ${to ? "text-accent" : t.dueDate && t.dueDate < today ? "text-danger" : "text-muted"}`}>
                          {to ? `Movida a ${relativeDayLabel(to, today).toLowerCase()}` : t.dueDate ? relativeDayLabel(t.dueDate, today) : ""}
                        </p>
                      </div>
                      {!to ? (
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-sm font-semibold text-success"
                          disabled={busy}
                          onClick={() => complete(t.id)}
                        >
                          Hecha
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {waiting.length ? (
                <div className="space-y-2">
                  <div className={`grid gap-2 ${nextMonday === today ? "grid-cols-1" : "grid-cols-2"}`}>
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => reschedule(today)}>
                      <Sunrise size={18} /> A hoy
                    </button>
                    {nextMonday !== today ? (
                      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => reschedule(nextMonday)}>
                        <CalendarArrowUp size={18} /> Al lunes
                      </button>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="input"
                      min={today}
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      aria-label="Otra fecha"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary shrink-0 px-4"
                      disabled={busy || !customDate}
                      onClick={() => reschedule(customDate)}
                    >
                      Mover
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3">
          <label className="block">
            <span className="text-lg font-semibold">¿Qué quieres conseguir la semana que viene?</span>
            <span className="mb-3 block text-sm text-muted">Una o dos cosas importantes. Te lo recordaremos en la próxima revisión.</span>
            <textarea
              className="input min-h-36 resize-y"
              placeholder="Terminar el informe, ir 3 días al gimnasio…"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              maxLength={2000}
              autoFocus
            />
          </label>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-3">
          <label className="block">
            <span className="text-lg font-semibold">Nota libre</span>
            <span className="mb-3 block text-sm text-muted">¿Qué ha ido bien? ¿Qué cambiarías?</span>
            <textarea
              className="input min-h-36 resize-y"
              placeholder="Escribe lo que quieras recordar de esta semana"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
              autoFocus
            />
          </label>
        </section>
      ) : null}

      <div className="mt-6 flex gap-2">
        {step > 0 ? (
          <button type="button" className="btn btn-secondary px-5" onClick={() => setStep(step - 1)} aria-label="Paso anterior">
            <ArrowLeft size={20} />
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary flex-1" onClick={() => setStep(step + 1)}>
            Siguiente <ArrowRight size={20} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={save}>
            <Check size={20} /> {busy ? "Guardando…" : existing ? "Actualizar revisión" : "Guardar revisión"}
          </button>
        )}
      </div>
    </div>
  );
}
