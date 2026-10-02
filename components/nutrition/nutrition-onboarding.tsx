"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Droplet, Flame, Info, Wheat, Zap } from "lucide-react";
import { api } from "@/lib/client/api";
import { addDays, formatDateStr, type DateStr } from "@/lib/dates";
import {
  ACTIVITY_INFO,
  computePlan,
  formatKg,
  GOAL_INFO,
  goalHasTarget,
  goalOptions,
  PACE_LABEL,
  SEX_LABEL,
  targetWeightError,
  weightForBmi,
  MIN_BMI,
  ADULT_AGE,
  type Activity,
  type Goal,
  type Pace,
  type Sex,
} from "@/lib/nutrition/calc";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import { Antola } from "@/components/antola/antola";
import { Ring } from "@/components/nutrition/ring";
import { WheelPicker } from "@/components/ui/wheel-picker";
import type { Expression } from "@/lib/antola/messages";

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const AGES = range(13, 100);
const HEIGHTS = range(120, 230);
const KILOS = range(30, 250);
const DECIMALS = range(0, 9);

const ACTIVITIES: Activity[] = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"];
const PACES: Pace[] = ["GENTLE", "RECOMMENDED", "FAST"];

type Step = "sex" | "age" | "height" | "weight" | "activity" | "goal" | "target" | "result";

/** Onboarding de nutrición: una pregunta por pantalla y, al final, el plan. */
export function NutritionOnboarding({ today, antola }: { today: DateStr; antola: boolean }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(170);
  const [kgInt, setKgInt] = useState(70);
  const [kgDec, setKgDec] = useState(0);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [targetInt, setTargetInt] = useState(65);
  const [targetDec, setTargetDec] = useState(0);
  const [pace, setPace] = useState<Pace>("RECOMMENDED");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightKg = kgInt + kgDec / 10;
  const targetKg = targetInt + targetDec / 10;
  const hasTarget = !!goal && goalHasTarget(goal);
  const steps: Step[] = ["sex", "age", "height", "weight", "activity", "goal", ...(hasTarget ? (["target"] as Step[]) : []), "result"];
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const options = useMemo(() => goalOptions({ age, weightKg, heightCm: height }), [age, weightKg, height]);
  const minTarget = Math.ceil(weightForBmi(MIN_BMI, height) * 10) / 10;
  const targetError = hasTarget ? targetWeightError({ goal: goal!, weightKg, heightCm: height, targetWeightKg: targetKg }) : null;

  const planFor = (p: Pace) =>
    computePlan({
      sex: sex ?? "UNSPECIFIED",
      age,
      heightCm: height,
      weightKg,
      activity: activity ?? "SEDENTARY",
      goal: goal ?? "MAINTAIN",
      pace: hasTarget ? p : null,
      targetWeightKg: hasTarget ? targetKg : null,
    });
  const plan = planFor(pace);

  function choose<T>(setter: (v: T) => void, v: T) {
    setter(v);
    setError(null);
    setTimeout(() => setStepIndex((i) => i + 1), 180);
  }

  function chooseGoal(g: Goal) {
    setGoal(g);
    setError(null);
    if (goalHasTarget(g)) {
      // Propuesta inicial razonable: ±5 kg (sin bajar del mínimo saludable).
      const proposal = g === "LOSE_FAT" || g === "LOSE_WEIGHT" ? Math.max(minTarget, weightKg - 5) : weightKg + 5;
      setTargetInt(Math.floor(proposal));
      setTargetDec(Math.round((proposal - Math.floor(proposal)) * 10) % 10);
    }
    setTimeout(() => setStepIndex((i) => i + 1), 180);
  }

  function next() {
    setError(null);
    if (step === "target" && targetError) return setError(targetError);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  async function start() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/nutrition/profile", {
        body: {
          onboarding: true,
          sex,
          age,
          heightCm: height,
          weightKg,
          activity,
          goal: plan.goal,
          pace: hasTarget ? pace : null,
          targetWeightKg: hasTarget ? targetKg : null,
        },
      });
      router.replace("/comida");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const guide: Record<Step, { text: string; expression: Expression }> = {
    sex: { text: "¡Vamos a preparar tu plan de comida! Primero, unas preguntas rápidas.", expression: "saludando" },
    age: { text: "Con tu edad calculo mejor lo que gasta tu cuerpo.", expression: "feliz" },
    height: { text: "¿Cuánto mides? Desliza la rueda.", expression: "feliz" },
    weight: { text: "Tu peso de hoy. Será tu primer pesaje; luego lo que cuenta es la tendencia.", expression: "feliz" },
    activity: { text: "¿Cuánto te mueves en una semana normal?", expression: "pensativa" },
    goal: { text: "¿Qué te gustaría conseguir?", expression: "pensativa" },
    target: { text: "Sin prisas: el ritmo recomendado es el más fácil de mantener.", expression: "feliz" },
    result: { text: "¡Listo! Esto es lo que te propongo. Podrás cambiarlo cuando quieras.", expression: "celebrando" },
  };

  const kcalShare = (g: number, perG: number) => (plan.kcal ? (g * perG) / plan.kcal : 0);
  const etaFor = (weeks: number | null) => (weeks == null ? null : formatDateStr(addDays(today, weeks * 7), "d 'de' MMMM 'de' yyyy"));

  return (
    <div className="flex flex-1 flex-col py-4">
      <div className="mb-5 flex items-center gap-3">
        {stepIndex > 0 ? (
          <button type="button" onClick={() => setStepIndex((i) => i - 1)} className="-ml-2 flex size-10 items-center justify-center rounded-full text-accent" aria-label="Atrás">
            <ChevronLeft size={26} />
          </button>
        ) : (
          <span className="size-10" />
        )}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1} aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="size-10" />
      </div>

      {antola ? (
        <div className="mb-4 flex items-end gap-2" aria-live="polite">
          <Antola expression={guide[step].expression} size={64} />
          <p className="antola-bubble mb-2 flex-1 rounded-2xl bg-surface px-3.5 py-2.5 text-[15px] leading-snug">{guide[step].text}</p>
        </div>
      ) : null}

      <div key={step} className="flex-1 animate-fade-up">
        {step === "sex" ? (
          <Question title="Sexo" text="Solo se usa en la fórmula del gasto de energía.">
            <div className="space-y-2">
              {(Object.keys(SEX_LABEL) as Sex[]).map((s) => (
                <BigOption key={s} selected={sex === s} onClick={() => choose(setSex, s)} title={SEX_LABEL[s]} />
              ))}
            </div>
          </Question>
        ) : null}

        {step === "age" ? (
          <Question title="Edad" text="Guardamos tu año de nacimiento para que se actualice sola.">
            <div className="flex justify-center">
              <WheelPicker values={AGES} value={age} onChange={setAge} format={(v) => `${v} años`} label="Edad" width={170} />
            </div>
          </Question>
        ) : null}

        {step === "height" ? (
          <Question title="Altura">
            <div className="flex justify-center">
              <WheelPicker values={HEIGHTS} value={height} onChange={setHeight} format={(v) => `${v} cm`} label="Altura en centímetros" width={170} />
            </div>
          </Question>
        ) : null}

        {step === "weight" ? (
          <Question title="Peso actual" text="En kilos, con un decimal.">
            <div className="flex items-center justify-center gap-1">
              <WheelPicker values={KILOS} value={kgInt} onChange={setKgInt} label="Kilos" width={110} />
              <span className="text-2xl font-bold">,</span>
              <WheelPicker values={DECIMALS} value={kgDec} onChange={setKgDec} label="Decimales" width={70} />
              <span className="ml-1 text-xl font-semibold text-muted">kg</span>
            </div>
          </Question>
        ) : null}

        {step === "activity" ? (
          <Question title="Nivel de actividad">
            <div className="space-y-2">
              {ACTIVITIES.map((a) => (
                <BigOption key={a} selected={activity === a} onClick={() => choose(setActivity, a)} title={ACTIVITY_INFO[a].label} text={ACTIVITY_INFO[a].text} />
              ))}
            </div>
          </Question>
        ) : null}

        {step === "goal" ? (
          <Question title="Tu objetivo">
            {age < ADULT_AGE ? (
              <Notice>
                Antes de los 18 años no calculamos déficits ni superávits: solo «Mantener» y hábitos sanos. Si quieres cambiar tu peso, háblalo con tu médico o un nutricionista.
              </Notice>
            ) : null}
            <div className="space-y-2">
              {options.map((o) => (
                <BigOption
                  key={o.goal}
                  selected={goal === o.goal}
                  disabled={!o.allowed}
                  onClick={() => chooseGoal(o.goal)}
                  title={`${GOAL_INFO[o.goal].emoji} ${GOAL_INFO[o.goal].label}`}
                  text={o.allowed ? GOAL_INFO[o.goal].text : (o.reason ?? "")}
                />
              ))}
            </div>
          </Question>
        ) : null}

        {step === "target" && goal ? (
          <Question title="Peso objetivo y ritmo">
            <div className="flex items-center justify-center gap-1">
              <WheelPicker values={KILOS} value={targetInt} onChange={setTargetInt} label="Peso objetivo, kilos" width={110} />
              <span className="text-2xl font-bold">,</span>
              <WheelPicker values={DECIMALS} value={targetDec} onChange={setTargetDec} label="Peso objetivo, decimales" width={70} />
              <span className="ml-1 text-xl font-semibold text-muted">kg</span>
            </div>
            {targetError ? <Notice>{targetError}</Notice> : null}
            <p className="mb-2 mt-5 px-1 text-[13px] uppercase text-muted">Ritmo</p>
            <div className="space-y-2">
              {PACES.map((p) => {
                const pl = planFor(p);
                const eta = targetError ? null : etaFor(pl.weeksToTarget);
                return (
                  <BigOption
                    key={p}
                    selected={pace === p}
                    onClick={() => setPace(p)}
                    title={`${PACE_LABEL[p]} · ${pl.kgPerWeek > 0 ? "+" : "−"}${formatKg(Math.abs(pl.kgPerWeek))} kg/semana`}
                    text={[eta ? `Llegarías hacia el ${eta}` : null, ...pl.notes].filter(Boolean).join(" ")}
                  />
                );
              })}
            </div>
          </Question>
        ) : null}

        {step === "result" ? (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tu plan diario</h1>
            <div className="card mt-4 flex items-center gap-4 p-5">
              <div className="flex-1">
                <p className="text-5xl font-bold tabular-nums tracking-tight">{plan.kcal}</p>
                <p className="text-muted">calorías al día</p>
              </div>
              <Ring value={1} size={104} stroke={12} color={NUTRIENT.kcal.color} icon={<Flame size={20} />} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { g: plan.proteinG, share: kcalShare(plan.proteinG, 4), label: "Proteína", color: NUTRIENT.protein.color, icon: <Zap size={15} fill="currentColor" /> },
                { g: plan.carbsG, share: kcalShare(plan.carbsG, 4), label: "Carbohidratos", color: NUTRIENT.carbs.color, icon: <Wheat size={15} /> },
                { g: plan.fatG, share: kcalShare(plan.fatG, 9), label: "Grasa", color: NUTRIENT.fat.color, icon: <Droplet size={15} fill="currentColor" /> },
              ].map((m) => (
                <div key={m.label} className="card flex flex-col items-center p-3">
                  <Ring value={m.share} size={70} stroke={8} color={m.color} icon={m.icon} />
                  <p className="mt-2 text-lg font-bold tabular-nums">{m.g} g</p>
                  <p className="text-[12px] text-muted">{m.label}</p>
                </div>
              ))}
            </div>

            <ul className="card mt-3 divide-y divide-line text-[15px]">
              <Explain title={`Metabolismo basal (TMB): ${plan.bmr} kcal`} text="Lo que gasta tu cuerpo en reposo: respirar, pensar, mantener la temperatura." />
              <Explain title={`Gasto diario estimado: ${plan.tdee} kcal`} text={`Tu TMB multiplicada por tu nivel de actividad (${ACTIVITY_INFO[activity ?? "SEDENTARY"].label.toLowerCase()}).`} />
              <Explain
                title={`Calorías objetivo: ${plan.kcal} kcal`}
                text={
                  plan.goal === "MAINTAIN"
                    ? "Las mismas que gastas: para mantenerte."
                    : plan.goal === "RECOMP"
                      ? "Un 10 % menos de lo que gastas, con mucha proteína: perder grasa y ganar músculo a la vez."
                      : `${plan.kcal < plan.tdee ? "Un poco menos" : "Un poco más"} de lo que gastas, para ${plan.kgPerWeek > 0 ? "ganar" : "perder"} unos ${formatKg(Math.abs(plan.kgPerWeek))} kg por semana.`
                }
              />
              <Explain title={`Proteína: ${plan.proteinG} g`} text="Ayuda a mantener y construir músculo y es la que más sacia." />
              <Explain title={`Carbohidratos: ${plan.carbsG} g`} text="La energía principal del día: el resto de las calorías." />
              <Explain title={`Grasa: ${plan.fatG} g`} text="Un 25 % de las calorías (y nunca menos de 0,6 g por kilo): la necesitas para las hormonas y las vitaminas." />
              <Explain title={`Fibra: ${plan.fiberG} g · Agua: ${formatKg(plan.waterMl / 1000)} L`} text="14 g de fibra por cada 1000 kcal y 35 ml de agua por kilo." />
            </ul>
            {plan.notes.map((n) => (
              <Notice key={n}>{n}</Notice>
            ))}
            <p className="mt-3 flex gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-muted">
              <Info size={16} className="mt-0.5 shrink-0" />
              Son estimaciones orientativas y no sustituyen a un profesional de la salud.
            </p>
          </div>
        ) : null}
      </div>

      {error ? <p className="my-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">{error}</p> : null}
      {step === "result" ? (
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={start} disabled={saving}>
          {saving ? "Guardando…" : "Empezar"}
        </button>
      ) : ["age", "height", "weight", "target"].includes(step) ? (
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={next} disabled={step === "target" && !!targetError}>
          Continuar
        </button>
      ) : null}
    </div>
  );
}

function Question({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {text ? <p className="mt-1.5 text-muted">{text}</p> : null}
      <div className="mt-6">{children}</div>
    </>
  );
}

function BigOption({
  title,
  text,
  selected,
  disabled,
  onClick,
}: {
  title: string;
  text?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`w-full rounded-2xl border-2 px-4 py-3.5 text-left transition active:scale-[0.99] disabled:opacity-50 ${
        selected ? "border-accent bg-accent-soft" : "border-transparent bg-surface"
      }`}
    >
      <span className="block text-[17px] font-semibold">{title}</span>
      {text ? <span className="mt-0.5 block text-[14px] leading-snug text-muted">{text}</span> : null}
    </button>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[14px] leading-snug">{children}</p>;
}

function Explain({ title, text }: { title: string; text: string }) {
  return (
    <li className="px-4 py-3">
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 text-[14px] leading-snug text-muted">{text}</p>
    </li>
  );
}
