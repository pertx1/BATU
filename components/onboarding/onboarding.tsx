"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { api } from "@/lib/client/api";
import { PROJECT_COLORS } from "@/lib/types";
import { useStandalone } from "@/lib/client/standalone";
import { InstallInstructions } from "./install-instructions";
import { Antola } from "@/components/antola/antola";
import type { Expression } from "@/lib/antola/messages";

const SUGGESTED = [
  { name: "Personal", emoji: "🏠", color: PROJECT_COLORS[0] },
  { name: "Trabajo", emoji: "💼", color: PROJECT_COLORS[1] },
  { name: "Salud", emoji: "💪", color: PROJECT_COLORS[3] },
  { name: "Estudios", emoji: "📚", color: PROJECT_COLORS[6] },
];

type ProjectDraft = { name: string; emoji: string | null; color: string; selected: boolean };

export function Onboarding({
  initialName,
  initialTimezone,
  initialMorning,
  initialEvening,
}: {
  initialName: string;
  initialTimezone: string;
  initialMorning: string;
  initialEvening: string;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  // Se detectó con Intl al registrarse; aquí se puede cambiar.
  const [timezone, setTimezone] = useState(initialTimezone);
  const [morning, setMorning] = useState(initialMorning);
  const [evening, setEvening] = useState(initialEvening);
  const [projects, setProjects] = useState<ProjectDraft[]>(SUGGESTED.map((p) => ({ ...p, selected: true })));
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const standalone = useStandalone();

  const zones = useMemo(() => {
    try {
      const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
      return list.includes(timezone) ? list : [timezone, ...list];
    } catch {
      return [timezone];
    }
  }, [timezone]);

  const steps = ["Nombre", "Zona horaria", "Horarios", "Proyectos", "Instalar"];
  const first = name.trim().split(/\s+/)[0];
  // Antola se presenta y acompaña cada paso.
  const guide: { text: string; expression: Expression }[] = [
    { text: "¡Hola! Soy Antola, tu hormiga ayudante. Te acompaño a organizar el día. ¿Cómo te llamas?", expression: "saludando" },
    { text: `Encantada${first ? `, ${first}` : ""}. Dime tu zona horaria y sabré cuándo empieza tu día.`, expression: "feliz" },
    { text: "Te aviso por la mañana con lo del día y por la noche si queda algo. ¿A qué hora te va bien?", expression: "pensativa" },
    { text: "Las hormigas lo ordenamos todo por zonas. Elige tus proyectos (luego puedes cambiarlos).", expression: "orgullosa" },
    { text: "¡Listo! Cada tarea y hábito te dará puntos y yo iré creciendo contigo.", expression: "celebrando" },
  ];

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/onboarding", {
        body: {
          name,
          timezone,
          morningTime: morning,
          eveningTime: evening,
          projects: projects.filter((p) => p.selected).map(({ name, emoji, color }) => ({ name, emoji, color })),
        },
      });
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function next() {
    setError(null);
    if (step === 0 && !name.trim()) return setError("Escribe tu nombre");
    if (step === 3) return void finish();
    setStep((s) => s + 1);
  }

  return (
    <div className="flex flex-1 flex-col py-6">
      <div className="mb-8 flex items-center gap-3">
        {step > 0 && step < 4 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="-ml-2 flex size-10 items-center justify-center rounded-full text-accent" aria-label="Atrás">
            <ChevronLeft size={26} />
          </button>
        ) : (
          <span className="size-10" />
        )}
        <div className="flex flex-1 gap-1.5" aria-label={`Paso ${step + 1} de ${steps.length}`}>
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-surface-2"}`} />
          ))}
        </div>
        <span className="size-10" />
      </div>

      <div className="mb-6 flex items-end gap-2" aria-live="polite">
        <Antola expression={guide[step].expression} size={78} />
        <p className="antola-bubble mb-3 flex-1 rounded-2xl bg-surface px-3.5 py-2.5 text-[15px] leading-snug">{guide[step].text}</p>
      </div>

      <div key={step} className="flex-1 animate-fade-up">
        {step === 0 ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">¡Hola! 👋</h1>
            <p className="mt-2 text-muted">Bienvenido a Antola. ¿Cómo te llamas?</p>
            <input
              className="input mt-8 text-lg"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={60}
              autoComplete="given-name"
              onKeyDown={(e) => e.key === "Enter" && next()}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Tu zona horaria</h1>
            <p className="mt-2 text-muted">La hemos detectado automáticamente. Sirve para calcular tu «hoy» y la hora de los avisos.</p>
            <select className="input mt-8" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost mt-2 w-full"
              onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}
            >
              Usar la de este dispositivo
            </button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Tus momentos del día</h1>
            <p className="mt-2 text-muted">Te enviaremos un resumen por la mañana y una revisión por la noche si te queda algo pendiente.</p>
            <label className="mt-8 block">
              <span className="label">☀️ Resumen de la mañana</span>
              <input type="time" className="input" value={morning} onChange={(e) => setMorning(e.target.value)} />
            </label>
            <label className="mt-4 block">
              <span className="label">🌙 Revisión de la noche</span>
              <input type="time" className="input" value={evening} onChange={(e) => setEvening(e.target.value)} />
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Tus proyectos</h1>
            <p className="mt-2 text-muted">Las áreas en las que organizas tu vida. Podrás cambiarlas cuando quieras.</p>
            <ul className="mt-8 space-y-2">
              {projects.map((p, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setProjects(projects.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)))}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                      p.selected ? "border-accent bg-accent-soft" : "border-line bg-surface"
                    }`}
                    aria-pressed={p.selected}
                  >
                    <span className="text-2xl">{p.emoji ?? "📁"}</span>
                    <span className="flex-1 font-semibold">{p.name}</span>
                    <span className={`size-5 rounded-full border-2 ${p.selected ? "border-accent bg-accent" : "border-line"}`} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input className="input" placeholder="Otro proyecto" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={60} />
              <button
                type="button"
                className="btn btn-secondary px-4"
                aria-label="Añadir proyecto"
                onClick={() => {
                  if (!custom.trim()) return;
                  setProjects([
                    ...projects,
                    { name: custom.trim(), emoji: null, color: PROJECT_COLORS[(projects.length + 4) % PROJECT_COLORS.length], selected: true },
                  ]);
                  setCustom("");
                }}
              >
                <Plus size={20} />
              </button>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">¡Todo listo, {name.trim()}! 🎉</h1>
            {standalone ? (
              <p className="mt-2 text-muted">
                Ya tienes Antola instalada. Activa las notificaciones en <b>Ajustes</b> para recibir tus recordatorios.
              </p>
            ) : (
              <>
                <p className="mt-2 text-muted">Para recibir notificaciones en el iPhone, instala Antola en tu pantalla de inicio:</p>
                <div className="mt-6">
                  <InstallInstructions />
                </div>
              </>
            )}
          </>
        ) : null}
      </div>

      {error ? <p className="mb-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
      {step < 4 ? (
        <button type="button" className="btn btn-primary w-full" onClick={next} disabled={saving}>
          {step === 3 ? (saving ? "Guardando…" : "Terminar") : "Continuar"}
        </button>
      ) : (
        <Link href="/" className="btn btn-primary w-full">
          Empezar
        </Link>
      )}
    </div>
  );
}
