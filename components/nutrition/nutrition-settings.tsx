"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Info } from "lucide-react";
import { api } from "@/lib/client/api";
import {
  ACTIVITY_INFO,
  computePlan,
  formatKg,
  GOAL_INFO,
  goalHasTarget,
  goalOptions,
  manualTargetsError,
  MIN_AGE,
  PACE_LABEL,
  SEX_LABEL,
  targetWeightError,
  type PlanInput,
} from "@/lib/nutrition/calc";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import { SectionTitle, Segmented, Switch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

export type NutritionSettingsValues = {
  plan: Omit<PlanInput, "weightKg"> & { weightKg: number };
  bmr: number;
  targets: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; waterMl: number };
  manualTargets: boolean;
  aiEnabled: boolean;
  aiConfigured: boolean;
  hideNumbers: boolean;
  glassMl: number;
  bottleMl: number;
  wakeTime: number;
  sleepTime: number;
  waterReminders: boolean;
  weighInPerWeek: number;
};

type Prefs = Pick<NutritionSettingsValues, "aiEnabled" | "hideNumbers" | "glassMl" | "bottleMl" | "wakeTime" | "sleepTime" | "waterReminders" | "weighInPerWeek"> & {
  waterMl: number;
};

const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromHHMM = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const num = (s: string) => Number(s.replace(",", "."));

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        {hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function NutritionSettings({ initial }: { initial: NutritionSettingsValues }) {
  const router = useRouter();
  const toast = useToast();

  /* ── Preferencias (se guardan solas) ── */
  const [prefs, setPrefs] = useState<Prefs>({
    aiEnabled: initial.aiEnabled,
    hideNumbers: initial.hideNumbers,
    glassMl: initial.glassMl,
    bottleMl: initial.bottleMl,
    wakeTime: initial.wakeTime,
    sleepTime: initial.sleepTime,
    waterReminders: initial.waterReminders,
    weighInPerWeek: initial.weighInPerWeek,
    waterMl: initial.targets.waterMl,
  });
  const saved = useRef(prefs);
  async function savePref(patch: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
    try {
      await api("/api/nutrition/settings", { method: "PATCH", body: patch });
      saved.current = { ...saved.current, ...patch };
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setPrefs(saved.current);
    }
  }

  /* ── Datos personales y objetivo → Recalcular ── */
  const [p, setP] = useState({ ...initial.plan });
  const [weightText, setWeightText] = useState(formatKg(initial.plan.weightKg));
  const [targetText, setTargetText] = useState(initial.plan.targetWeightKg ? formatKg(initial.plan.targetWeightKg) : "");
  const [busy, setBusy] = useState(false);
  const weightKg = num(weightText);
  const targetWeightKg = goalHasTarget(p.goal) ? num(targetText) : null;
  const input: PlanInput = { ...p, weightKg, targetWeightKg: targetWeightKg && Number.isFinite(targetWeightKg) ? targetWeightKg : null, pace: goalHasTarget(p.goal) ? (p.pace ?? "RECOMMENDED") : null };
  const valid = p.age >= MIN_AGE && p.age <= 110 && p.heightCm >= 100 && p.heightCm <= 250 && weightKg >= 25 && weightKg <= 350;
  const options = valid ? goalOptions(input) : [];
  const goalBlocked = options.find((o) => o.goal === p.goal && !o.allowed);
  const targetErr = valid && goalHasTarget(p.goal) ? (input.targetWeightKg ? targetWeightError(input) : "Pon tu peso objetivo.") : null;
  const preview = valid && !goalBlocked && !targetErr ? computePlan(input) : null;

  async function recalc() {
    setBusy(true);
    try {
      await api("/api/nutrition/profile", {
        body: { ...input, recordWeight: Math.abs(weightKg - initial.plan.weightKg) >= 0.05 },
      });
      toast.show({ message: "Plan recalculado ✨" });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /* ── Objetivos a mano ── */
  const [manualOn, setManualOn] = useState(initial.manualTargets);
  const [manual, setManual] = useState({
    kcal: String(initial.targets.kcal),
    proteinG: String(initial.targets.proteinG),
    carbsG: String(initial.targets.carbsG),
    fatG: String(initial.targets.fatG),
    fiberG: String(initial.targets.fiberG),
  });
  const manualValues = {
    kcal: Math.round(num(manual.kcal) || 0),
    proteinG: num(manual.proteinG) || 0,
    carbsG: num(manual.carbsG) || 0,
    fatG: num(manual.fatG) || 0,
    fiberG: num(manual.fiberG) || 0,
    waterMl: prefs.waterMl,
  };
  const manualErr = manualOn ? manualTargetsError(manualValues, initial.bmr) : null;

  async function saveManual(on: boolean) {
    setBusy(true);
    try {
      await api("/api/nutrition/targets", { method: "PUT", body: { manual: on ? manualValues : null } });
      toast.show({ message: on ? "Objetivos guardados" : "Vuelves a los objetivos calculados" });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const t = initial.targets;
  return (
    <div>
      {/* Resumen */}
      <div className="card p-4">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{initial.manualTargets ? "Tus objetivos (a mano)" : "Tus objetivos"}</p>
        <p className="mt-1 text-[28px] font-bold tabular-nums">{t.kcal} kcal</p>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[15px] text-muted tabular-nums">
          <span style={{ color: NUTRIENT.protein.color }}>Proteína {t.proteinG} g</span>
          <span style={{ color: NUTRIENT.carbs.color }}>Carbohidratos {t.carbsG} g</span>
          <span style={{ color: NUTRIENT.fat.color }}>Grasa {t.fatG} g</span>
        </p>
        <p className="mt-0.5 text-[15px] text-muted">
          Fibra {t.fiberG} g · Agua {formatKg(t.waterMl / 1000)} L · Metabolismo basal {initial.bmr} kcal
        </p>
      </div>

      {/* Datos y objetivo */}
      <SectionTitle>Tus datos y tu objetivo</SectionTitle>
      <div className="card space-y-3 p-4">
        <Segmented
          value={p.sex}
          onChange={(sex) => setP({ ...p, sex })}
          options={(["MALE", "FEMALE", "UNSPECIFIED"] as const).map((v) => ({ value: v, label: v === "UNSPECIFIED" ? "Sin decir" : SEX_LABEL[v] }))}
        />
        <div className="grid grid-cols-3 gap-2">
          <label>
            <span className="mb-1 block px-1 text-[13px] text-muted">Edad</span>
            <input className="input" inputMode="numeric" value={p.age || ""} onChange={(e) => setP({ ...p, age: Number(e.target.value.replace(/\D/g, "").slice(0, 3)) })} />
          </label>
          <label>
            <span className="mb-1 block px-1 text-[13px] text-muted">Altura (cm)</span>
            <input className="input" inputMode="numeric" value={p.heightCm || ""} onChange={(e) => setP({ ...p, heightCm: Number(e.target.value.replace(/\D/g, "").slice(0, 3)) })} />
          </label>
          <label>
            <span className="mb-1 block px-1 text-[13px] text-muted">Peso (kg)</span>
            <input className="input" inputMode="decimal" value={weightText} onChange={(e) => setWeightText(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block px-1 text-[13px] text-muted">Actividad</span>
          <select className="input" value={p.activity} onChange={(e) => setP({ ...p, activity: e.target.value as PlanInput["activity"] })}>
            {(Object.keys(ACTIVITY_INFO) as PlanInput["activity"][]).map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_INFO[a].label} · {ACTIVITY_INFO[a].text}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block px-1 text-[13px] text-muted">Objetivo</span>
          <select className="input" value={p.goal} onChange={(e) => setP({ ...p, goal: e.target.value as PlanInput["goal"] })}>
            {(Object.keys(GOAL_INFO) as PlanInput["goal"][]).map((g) => {
              const o = options.find((x) => x.goal === g);
              return (
                <option key={g} value={g} disabled={o ? !o.allowed : false}>
                  {GOAL_INFO[g].emoji} {GOAL_INFO[g].label}
                </option>
              );
            })}
          </select>
        </label>
        {goalBlocked ? <p className="text-[14px] text-muted">{goalBlocked.reason}</p> : null}
        {goalHasTarget(p.goal) ? (
          <>
            <label className="block">
              <span className="mb-1 block px-1 text-[13px] text-muted">Peso objetivo (kg)</span>
              <input className="input" inputMode="decimal" value={targetText} onChange={(e) => setTargetText(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))} />
            </label>
            <Segmented
              value={p.pace ?? "RECOMMENDED"}
              onChange={(pace) => setP({ ...p, pace })}
              options={(["GENTLE", "RECOMMENDED", "FAST"] as const).map((v) => ({ value: v, label: PACE_LABEL[v] }))}
            />
          </>
        ) : null}
        {targetErr ? <p className="text-[14px] text-muted">{targetErr}</p> : null}
        {preview ? (
          <div className="rounded-2xl bg-bg p-3 text-[15px]">
            <p>
              Con estos datos: <b className="tabular-nums">{preview.kcal} kcal</b> · proteína {preview.proteinG} g · carbohidratos {preview.carbsG} g · grasa {preview.fatG} g
            </p>
            {preview.notes.map((n) => (
              <p key={n} className="mt-1 text-[13px] text-muted">
                {n}
              </p>
            ))}
          </div>
        ) : null}
        <button type="button" className="btn btn-primary w-full" disabled={busy || !preview} onClick={recalc}>
          <Calculator size={19} /> Recalcular
        </button>
        <p className="text-[13px] text-muted">Recalcular vuelve a los objetivos calculados. Si cambias el peso, se apunta como pesaje de hoy.</p>
      </div>

      {/* A mano */}
      <SectionTitle>Objetivos a mano</SectionTitle>
      <div className="card">
        <Row label="Poner mis objetivos a mano" hint="Siempre con los límites de seguridad">
          <Switch
            checked={manualOn}
            label="Poner mis objetivos a mano"
            onChange={(v) => {
              setManualOn(v);
              if (!v && initial.manualTargets) void saveManual(false);
            }}
          />
        </Row>
        {manualOn ? (
          <div className="space-y-2 border-t border-line p-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["kcal", "Calorías (kcal)"],
                  ["proteinG", "Proteína (g)"],
                  ["carbsG", "Carbohidratos (g)"],
                  ["fatG", "Grasa (g)"],
                  ["fiberG", "Fibra (g)"],
                ] as const
              ).map(([k, label]) => (
                <label key={k}>
                  <span className="mb-1 block px-1 text-[13px] text-muted">{label}</span>
                  <input className="input" inputMode="decimal" value={manual[k]} onChange={(e) => setManual((m) => ({ ...m, [k]: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) }))} />
                </label>
              ))}
            </div>
            {manualErr ? <p className="text-[14px] text-muted">{manualErr}</p> : null}
            <button type="button" className="btn btn-primary w-full" disabled={busy || !!manualErr} onClick={() => saveManual(true)}>
              Guardar objetivos
            </button>
          </div>
        ) : null}
      </div>

      {/* Agua */}
      <SectionTitle>Agua</SectionTitle>
      <div className="card divide-y divide-line">
        <Row label="Objetivo diario" hint="En litros">
          <NumberField value={prefs.waterMl / 1000} step={0.05} min={0.5} max={6} decimals={2} label="Objetivo de agua en litros" onCommit={(v) => savePref({ waterMl: Math.round(v * 1000) })} />
        </Row>
        <Row label="Vaso" hint="En mililitros">
          <NumberField value={prefs.glassMl} step={10} min={50} max={1000} label="Tamaño del vaso en ml" onCommit={(v) => savePref({ glassMl: Math.round(v) })} />
        </Row>
        <Row label="Botella" hint="En mililitros">
          <NumberField value={prefs.bottleMl} step={50} min={100} max={3000} label="Tamaño de la botella en ml" onCommit={(v) => savePref({ bottleMl: Math.round(v) })} />
        </Row>
      </div>

      {/* Preferencias */}
      <SectionTitle>Preferencias</SectionTitle>
      <div className="card divide-y divide-line">
        <Row label="Estimar con IA" hint={initial.aiConfigured ? "Calorías y macros a partir de la foto o el texto" : "No está configurada en el servidor: valores a mano"}>
          <Switch checked={prefs.aiEnabled} label="Estimar con IA" onChange={(v) => savePref({ aiEnabled: v })} />
        </Row>
        <Row label="Ocultar los números" hint="Sin calorías ni gramos, solo los anillos">
          <Switch checked={prefs.hideNumbers} label="Ocultar los números de calorías y macros" onChange={(v) => savePref({ hideNumbers: v })} />
        </Row>
      </div>

      {/* Avisos */}
      <SectionTitle>Avisos</SectionTitle>
      <div className="card divide-y divide-line">
        <Row label="Recordarme beber agua" hint="Como mucho uno cada 2 horas, si vas por detrás">
          <Switch checked={prefs.waterReminders} label="Recordarme beber agua" onChange={(v) => savePref({ waterReminders: v })} />
        </Row>
        <Row label="Me despierto a las">
          <input type="time" className="input w-36 py-2 text-center" aria-label="Hora de despertar" defaultValue={toHHMM(prefs.wakeTime)} onBlur={(e) => {
            const v = fromHHMM(e.target.value);
            if (v != null && v !== prefs.wakeTime) void savePref({ wakeTime: v });
          }} />
        </Row>
        <Row label="Me acuesto a las">
          <input type="time" className="input w-36 py-2 text-center" aria-label="Hora de dormir" defaultValue={toHHMM(prefs.sleepTime)} onBlur={(e) => {
            const v = fromHHMM(e.target.value);
            if (v != null && v !== prefs.sleepTime) void savePref({ sleepTime: v });
          }} />
        </Row>
        <div className="px-4 py-3">
          <p className="mb-2 font-medium">Recordatorio para pesarme</p>
          <Segmented
            value={String(prefs.weighInPerWeek)}
            onChange={(v) => savePref({ weighInPerWeek: Number(v) })}
            options={[
              { value: "0", label: "No" },
              { value: "1", label: "1/sem" },
              { value: "2", label: "2/sem" },
              { value: "3", label: "3/sem" },
            ]}
          />
          <p className="mt-2 text-[13px] text-muted">Por la mañana, al despertar: lunes · lunes y jueves · lunes, miércoles y viernes.</p>
        </div>
      </div>

      <p className="mt-6 flex gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-muted">
        <Info size={16} className="mt-0.5 shrink-0" />
        Son estimaciones orientativas y no sustituyen a un profesional de la salud.
      </p>
      <Link href="/nutricion/bienvenida?rehacer=1" className="btn btn-secondary mt-3 w-full">
        Rehacer el cuestionario
      </Link>
    </div>
  );
}

/** Campo numérico que se guarda al salir de él. */
function NumberField({
  value,
  step,
  min,
  max,
  decimals = 0,
  label,
  onCommit,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  label: string;
  onCommit: (v: number) => void;
}) {
  const f = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: decimals }).format(n);
  const [text, setText] = useState(f(value));
  return (
    <input
      className="input w-24 py-2 text-center tabular-nums"
      inputMode={decimals ? "decimal" : "numeric"}
      aria-label={label}
      value={text}
      step={step}
      onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))}
      onBlur={() => {
        const n = num(text);
        if (!Number.isFinite(n) || n < min || n > max) {
          setText(f(value));
          return;
        }
        setText(f(n));
        if (Math.abs(n - value) > 1e-9) onCommit(n);
      }}
    />
  );
}
