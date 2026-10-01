"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useLeave } from "@/lib/client/navigation";
import { minutesToHHMM } from "@/lib/dates";
import { PROJECT_COLORS, type HabitView } from "@/lib/types";
import { ColorPicker, Segmented, WeekdayPicker } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

const SUGGESTIONS = ["💧 Beber agua", "🏃 Hacer ejercicio", "📚 Leer 20 min", "🧘 Meditar", "🥗 Comer sano", "😴 Dormir 8 h"];

export function HabitForm({ habit }: { habit?: HabitView }) {
  const router = useRouter();
  const leave = useLeave();
  const toast = useToast();
  const [name, setName] = useState(habit?.name ?? "");
  const [emoji, setEmoji] = useState(habit?.emoji ?? "");
  const [color, setColor] = useState(habit?.color ?? PROJECT_COLORS[3]);
  const [mode, setMode] = useState<"all" | "some">(habit && habit.daysOfWeek.length ? "some" : "all");
  const [days, setDays] = useState<number[]>(habit?.daysOfWeek.length ? habit.daysOfWeek : [1, 2, 3, 4, 5]);
  const [reminder, setReminder] = useState(habit?.reminderTime != null ? minutesToHHMM(habit.reminderTime) : "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "some" && days.length === 0) {
      toast.error("Elige al menos un día.");
      return;
    }
    setBusy(true);
    const body = {
      name,
      emoji: emoji.trim() || null,
      color,
      daysOfWeek: mode === "all" ? [] : days,
      reminderTime: reminder || null,
    };
    try {
      if (habit) {
        await api(`/api/habits/${habit.id}`, { method: "PATCH", body });
        toast.show({ message: "Hábito guardado" });
        leave("/habitos");
      } else {
        await api("/api/habits", { body });
        toast.show({ message: "Hábito creado. ¡A por la racha! 🔥" });
        router.push("/habitos");
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {!habit ? (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {SUGGESTIONS.map((s) => {
            const [e, ...rest] = s.split(" ");
            return (
              <button
                key={s}
                type="button"
                className="shrink-0 rounded-full bg-surface-2 px-3.5 py-2 text-[14px] font-medium"
                onClick={() => {
                  setEmoji(e);
                  setName(rest.join(" "));
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input className="input w-16 text-center text-xl" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="✨" maxLength={8} aria-label="Emoji" />
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del hábito" required maxLength={80} aria-label="Nombre" />
      </div>
      <div>
        <span className="label">Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <span className="label">¿Qué días?</span>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "all", label: "Todos los días" },
            { value: "some", label: "Días concretos" },
          ]}
        />
        {mode === "some" ? (
          <div className="mt-3">
            <WeekdayPicker value={days} onChange={setDays} />
          </div>
        ) : null}
      </div>
      <label className="block">
        <span className="label">Recordatorio (opcional)</span>
        <div className="flex gap-2">
          <input type="time" className="input" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          {reminder ? (
            <button type="button" className="btn btn-secondary" onClick={() => setReminder("")}>
              Quitar
            </button>
          ) : null}
        </div>
        <span className="mt-1.5 block text-xs text-muted">Solo te avisaremos si a esa hora aún no lo has hecho.</span>
      </label>
      <button type="submit" className="btn btn-primary w-full" disabled={busy || !name.trim()}>
        {habit ? "Guardar cambios" : "Crear hábito"}
      </button>
    </form>
  );
}
