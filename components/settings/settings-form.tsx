"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/client/api";
import { Segmented, Switch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

export type SettingsValues = {
  timezone: string;
  morningTime: string;
  eveningTime: string;
  overdueTime: string;
  weeklyReviewTime: string;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  notifyTasks: boolean;
  notifyEvents: boolean;
  notifyHabits: boolean;
  notifyMorning: boolean;
  notifyEvening: boolean;
  notifyOverdue: boolean;
  notifyWeekly: boolean;
  gamificationEnabled: boolean;
  antolaOnToday: boolean;
  soundsEnabled: boolean;
  antolaTone: "LIVELY" | "CALM";
  notifyStreakRisk: boolean;
  notifyRewards: boolean;
  notifyMissYou: boolean;
};

type Toggle = { key: keyof SettingsValues; title: string; text: string; time?: keyof SettingsValues; antola?: boolean };

const TOGGLES: Toggle[] = [
  { key: "notifyTasks", title: "Tareas", text: "A la hora de su recordatorio" },
  { key: "notifyEvents", title: "Eventos", text: "Con la antelación que elijas en cada evento" },
  { key: "notifyHabits", title: "Hábitos", text: "A su hora, solo si aún no están hechos" },
  { key: "notifyMorning", title: "Resumen de la mañana", text: "Tareas, hábitos y eventos del día", time: "morningTime" },
  { key: "notifyEvening", title: "Repaso de la noche", text: "Solo si queda algo pendiente", time: "eveningTime" },
  { key: "notifyOverdue", title: "Tareas atrasadas", text: "Una vez al día, si tienes alguna", time: "overdueTime" },
  { key: "notifyWeekly", title: "Revisión semanal", text: "Los domingos", time: "weeklyReviewTime" },
  { key: "notifyStreakRisk", title: "Racha en peligro", text: "A las 20:00, si llevas 3 días o más y hoy aún no", antola: true },
  { key: "notifyRewards", title: "Logros y retos", text: "Cuando consigues uno", antola: true },
  { key: "notifyMissYou", title: "Te echo de menos", text: "Si llevas 2 días sin entrar (como mucho cada 3 días)", antola: true },
];

type SaveState = "idle" | "saving" | "saved";

export function SettingsForm({ initial, timezones }: { initial: SettingsValues; timezones: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [deviceTz, setDeviceTz] = useState<string | null>(null);
  const pending = useRef<Partial<SettingsValues>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saved = useRef(initial);

  useEffect(() => {
    try {
      setDeviceTz(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
    } catch {
      setDeviceTz(null);
    }
  }, []);

  async function flush() {
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setSaveState("saving");
    try {
      await api("/api/settings", { method: "PATCH", body: patch });
      saved.current = { ...saved.current, ...patch };
      setSaveState("saved");
      // La zona horaria cambia cómo se ve todo: recargamos los datos del servidor.
      if (patch.timezone || patch.gamificationEnabled !== undefined || patch.antolaOnToday !== undefined || patch.soundsEnabled !== undefined) {
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
      setValues(saved.current);
      setSaveState("idle");
    }
  }

  function update<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    // Un campo de hora vacío (iOS lo permite al borrar) no se guarda.
    if (typeof value === "string" && !value) return;
    pending.current[key] = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  }

  useEffect(
    () => () => {
      // Al salir de la página, se guarda lo que quedara pendiente.
      if (timer.current) {
        clearTimeout(timer.current);
        const patch = pending.current;
        if (Object.keys(patch).length) {
          fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
            keepalive: true,
          }).catch(() => {});
        }
      }
    },
    [],
  );

  const tzOptions = timezones.includes(values.timezone) ? timezones : [values.timezone, ...timezones];

  return (
    <div className="space-y-7">
      <p className="-mb-4 flex h-5 items-center justify-end gap-1.5 text-sm text-muted" aria-live="polite">
        {saveState === "saving" ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Guardando…
          </>
        ) : saveState === "saved" ? (
          <>
            <Check size={14} className="text-success" /> Guardado
          </>
        ) : null}
      </p>

      <section id="antola" className="scroll-mt-24">
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">Antola</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          <li className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Gamificación</p>
              <p className="text-sm text-muted">Antola, puntos, rachas, logros y tienda. Si la apagas, se ocultan pero no se borran.</p>
            </div>
            <Switch checked={values.gamificationEnabled} onChange={(v) => update("gamificationEnabled", v)} label="Gamificación" />
          </li>
          {values.gamificationEnabled ? (
            <>
              <li className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Antola en «Hoy»</p>
                  <p className="text-sm text-muted">Con su bocadillo y sus sugerencias</p>
                </div>
                <Switch checked={values.antolaOnToday} onChange={(v) => update("antolaOnToday", v)} label="Antola en Hoy" />
              </li>
              <li className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Sonidos</p>
                  <p className="text-sm text-muted">Cortos, al completar y celebrar</p>
                </div>
                <Switch checked={values.soundsEnabled} onChange={(v) => update("soundsEnabled", v)} label="Sonidos" />
              </li>
              <li className="px-4 py-3">
                <p className="mb-2 font-medium">Tono de Antola</p>
                <Segmented
                  value={values.antolaTone}
                  onChange={(v) => update("antolaTone", v)}
                  options={[
                    { value: "LIVELY", label: "Animado" },
                    { value: "CALM", label: "Tranquilo" },
                  ]}
                />
              </li>
            </>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">Zona horaria</h2>
        <div className="card space-y-3 p-4">
          <select
            className="input"
            value={values.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            aria-label="Zona horaria"
          >
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {deviceTz && deviceTz !== values.timezone && tzOptions.includes(deviceTz) ? (
            <button type="button" className="btn btn-secondary w-full" onClick={() => update("timezone", deviceTz)}>
              <MapPin size={18} /> Usar la de este dispositivo ({deviceTz.replace(/_/g, " ")})
            </button>
          ) : null}
          <p className="text-sm text-muted">
            Los días, los hábitos y los avisos se calculan con esta zona. Las tareas conservan su hora local.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">Avisos</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {TOGGLES.filter((t) => !t.antola || values.gamificationEnabled).map((t) => {
            const on = values[t.key] as boolean;
            return (
              <li key={t.key} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-sm text-muted">{t.text}</p>
                  </div>
                  <Switch checked={on} onChange={(v) => update(t.key, v)} label={t.title} />
                </div>
                {t.time && on ? (
                  <label className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[15px] text-muted">Hora</span>
                    <input
                      type="time"
                      className="input w-40 text-center"
                      value={values[t.time] as string}
                      onChange={(e) => update(t.time!, e.target.value)}
                      aria-label={`Hora: ${t.title}`}
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">No molestar</h2>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Horario de silencio</p>
              <p className="text-sm text-muted">Lo que llegue en ese horario se enviará al terminar.</p>
            </div>
            <Switch checked={values.dndEnabled} onChange={(v) => update("dndEnabled", v)} label="No molestar" />
          </div>
          {values.dndEnabled ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Desde</span>
                <input
                  type="time"
                  className="input"
                  value={values.dndStart}
                  onChange={(e) => update("dndStart", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="label">Hasta</span>
                <input
                  type="time"
                  className="input"
                  value={values.dndEnd}
                  onChange={(e) => update("dndEnd", e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
