"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, RefreshCw, Sparkles, Star, Trash2, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { CONFIDENCE_LABEL, exactFood, scaledQuantity, scaleFood, totalsOf, type FoodItem, type Range } from "@/lib/nutrition/estimate";
import { MEAL_TYPE_INFO, MEAL_TYPES, type MealType } from "@/lib/nutrition/meals";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import type { MealView } from "@/lib/data/nutrition";
import { MealThumb, NUTRIENT_ICON } from "@/components/nutrition/bits";
import { HUNGER_FACES } from "@/components/nutrition/meal-composer";
import { MicButton } from "@/components/ui/mic-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

export const FULLNESS_FACES = [
  { value: 1, emoji: "😕", label: "Con hambre" },
  { value: 2, emoji: "🙂", label: "Casi" },
  { value: 3, emoji: "😊", label: "Bien" },
  { value: 4, emoji: "😌", label: "Lleno" },
  { value: 5, emoji: "😮‍💨", label: "De más" },
];

const fmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const rangeText = (r: Range, unit: string) => (Math.round(r.min) === Math.round(r.max) ? `${fmt.format(r.min)} ${unit}` : `${fmt.format(r.min)}–${fmt.format(r.max)} ${unit}`);
const mid = (r: Range) => (r.min + r.max) / 2;
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const factorText = (f: number) => `×${fmt.format(f)}`;

type Draft = { food: FoodItem; factor: number };

/** Hoja de detalle de una comida: ver, corregir, reutilizar o borrar. */
export function MealDetail({
  meal,
  hideNumbers,
  aiAvailable,
  onClose,
}: {
  meal: MealView | null;
  hideNumbers: boolean;
  aiAvailable: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!meal} onClose={onClose}>
      {meal ? <DetailBody key={meal.id} meal={meal} hideNumbers={hideNumbers} aiAvailable={aiAvailable} onClose={onClose} /> : null}
    </Sheet>
  );
}

/** Alimentos de partida: los de la estimación, o uno con los valores puestos a mano. */
function initialFoods(meal: MealView): FoodItem[] {
  if (meal.estimate?.foods.length) return meal.estimate.foods;
  if (meal.kcal > 0) {
    return [exactFood(meal.name ?? MEAL_TYPE_INFO[meal.type].label, "1 ración", { kcal: meal.kcal, protein: meal.proteinG, carbs: meal.carbsG, fat: meal.fatG, fiber: meal.fiberG })];
  }
  return [];
}

function DetailBody({ meal, hideNumbers, aiAvailable, onClose }: { meal: MealView; hideNumbers: boolean; aiAvailable: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(meal.name ?? "");
  const [drafts, setDrafts] = useState<Draft[]>(() => initialFoods(meal).map((food) => ({ food, factor: 1 })));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [correction, setCorrection] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hunger, setHunger] = useState(meal.hungerBefore);
  const [fullness, setFullness] = useState(meal.fullnessAfter);
  const correctionRef = useRef<HTMLTextAreaElement>(null);
  const pending = meal.status === "PENDING";

  // Si llega la estimación mientras está abierta, se ve al momento.
  useEffect(() => {
    if (!dirty) setDrafts(initialFoods(meal).map((food) => ({ food, factor: 1 })));
  }, [meal, dirty]);

  const foods = drafts.map((d) => (d.factor === 1 ? d.food : { ...scaleFood(d.food, d.factor), quantity: scaledQuantity(d.food.quantity, d.factor) }));
  const totals = totalsOf(foods);

  async function patch(body: Record<string, unknown>, ok?: string) {
    setBusy(true);
    try {
      await api(`/api/nutrition/meals/${meal.id}`, { method: "PATCH", body });
      if (ok) toast.show({ message: ok });
      router.refresh();
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveFoods() {
    if (await patch({ foods }, "Cambios guardados")) setDirty(false);
  }

  async function reestimate(withCorrection: boolean) {
    setBusy(true);
    try {
      await api(`/api/nutrition/meals/${meal.id}/estimate`, { body: { correction: withCorrection ? correction.trim() : null } });
      toast.show({ message: "Volviendo a estimar… 🔍" });
      setCorrection("");
      setDirty(false);
      router.refresh();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveFavorite() {
    setBusy(true);
    try {
      await api("/api/nutrition/favorites", { body: { mealId: meal.id, name: name.trim() || null } });
      toast.show({ message: "Guardada en tus comidas habituales ⭐" });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/nutrition/meals/${meal.id}`, { method: "DELETE" });
      toast.show({ message: "Comida borrada" });
      onClose();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  const update = (i: number, d: Partial<Draft>) => {
    setDrafts((list) => list.map((x, j) => (j === i ? { ...x, ...d } : x)));
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      {/* Foto grande */}
      <div className="relative -mx-5 -mt-2">
        {meal.hasPhoto ? (
          <img src={`/api/nutrition/photos/meal/${meal.id}`} alt="Foto de la comida" className="max-h-72 w-full bg-surface-2 object-cover" />
        ) : (
          <div className="flex justify-center py-2">
            <MealThumb meal={meal} size={96} />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nombre, tipo y hora */}
      <div>
        <label htmlFor="meal-name" className="sr-only">
          Nombre
        </label>
        <input
          id="meal-name"
          className="w-full bg-transparent text-[24px] font-bold outline-none placeholder:text-muted"
          value={name}
          placeholder={pending ? "Analizando…" : MEAL_TYPE_INFO[meal.type].label}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() !== (meal.name ?? "") && patch({ name: name.trim() || null })}
          enterKeyHint="done"
        />
        <div className="mt-2 flex gap-2">
          <select
            className="input flex-1 py-2"
            aria-label="Tipo de comida"
            value={meal.type}
            onChange={(e) => patch({ type: e.target.value as MealType })}
          >
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEAL_TYPE_INFO[t].emoji} {MEAL_TYPE_INFO[t].label}
              </option>
            ))}
          </select>
          <input
            type="time"
            aria-label="Hora"
            className="input w-36 py-2 text-center"
            defaultValue={toHHMM(meal.minutes)}
            onBlur={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              if (Number.isFinite(h) && Number.isFinite(m) && h * 60 + m !== meal.minutes) patch({ minutes: h * 60 + m });
            }}
          />
        </div>
      </div>

      {pending ? (
        <div className="shimmer rounded-2xl bg-surface-2 px-4 py-6 text-center text-muted">Analizando… se rellena solo en unos segundos.</div>
      ) : null}

      {meal.status === "FAILED" ? (
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-[15px]">{meal.error ?? "No se pudo estimar esta comida."}</p>
          {aiAvailable ? (
            <button type="button" className="btn btn-secondary mt-3 w-full text-fg" disabled={busy} onClick={() => reestimate(false)}>
              <RefreshCw size={18} /> Volver a intentarlo
            </button>
          ) : null}
          <p className="mt-2 text-[13px] text-muted">También puedes añadir los alimentos a mano aquí abajo.</p>
        </div>
      ) : null}

      {/* Totales con rangos */}
      {!pending && !hideNumbers && foods.length ? (
        <div className="rounded-2xl bg-bg p-4">
          <div className="flex items-baseline gap-2">
            <span style={{ color: NUTRIENT.kcal.color }}>{NUTRIENT_ICON.kcal(20)}</span>
            <span className="text-[30px] font-bold tabular-nums">{fmt.format(Math.round(mid(totals.kcal)))}</span>
            <span className="text-muted">kcal</span>
            <span className="ml-auto text-[13px] text-muted tabular-nums">{rangeText(totals.kcal, "kcal")}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["protein", totals.protein],
                ["carbs", totals.carbs],
                ["fat", totals.fat],
                ["fiber", totals.fiber],
              ] as const
            ).map(([k, r]) => (
              <div key={k}>
                <p className="flex items-center justify-center gap-1 font-bold tabular-nums">
                  <span style={{ color: NUTRIENT[k].color }}>{NUTRIENT_ICON[k](14)}</span>
                  {fmt.format(Math.round(mid(r)))} g
                </p>
                <p className="text-[11px] text-muted">{NUTRIENT[k].label}</p>
                <p className="text-[11px] text-muted tabular-nums">{rangeText(r, "g")}</p>
              </div>
            ))}
          </div>
          {meal.estimate ? (
            <p className="mt-3 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-muted">
              {CONFIDENCE_LABEL[meal.estimate.confidence]}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Alimentos */}
      {!pending ? (
        <section aria-label="Alimentos">
          <h3 className="label">Alimentos</h3>
          {drafts.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
              {drafts.map((d, i) => {
                const f = foods[i];
                return (
                  <li key={i} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.food.name}</p>
                      {f.quantity ? <p className="truncate text-[13px] text-muted">{f.quantity}</p> : null}
                      {hideNumbers ? null : <p className="text-[13px] text-muted tabular-nums">{rangeText(f.kcal, "kcal")}</p>}
                    </div>
                    <div className="flex items-center rounded-full bg-surface-2">
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center disabled:opacity-30"
                        disabled={d.factor <= 0.25}
                        onClick={() => update(i, { factor: Math.max(0.25, d.factor - 0.25) })}
                        aria-label={`Menos ${d.food.name}`}
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-10 text-center text-[13px] font-semibold tabular-nums">{factorText(d.factor)}</span>
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center disabled:opacity-30"
                        disabled={d.factor >= 5}
                        onClick={() => update(i, { factor: Math.min(5, d.factor + 0.25) })}
                        aria-label={`Más ${d.food.name}`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center text-muted"
                      onClick={() => {
                        setDrafts((list) => list.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                      aria-label={`Quitar ${d.food.name}`}
                    >
                      <X size={17} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl bg-bg px-4 py-3 text-[15px] text-muted">Aún no hay alimentos.</p>
          )}
          {adding ? (
            <AddFood
              onCancel={() => setAdding(false)}
              onAdd={(f) => {
                setDrafts((list) => [...list, { food: f, factor: 1 }]);
                setDirty(true);
                setAdding(false);
              }}
            />
          ) : (
            <button type="button" className="btn btn-ghost mt-1 w-full" onClick={() => setAdding(true)}>
              <Plus size={18} /> Añadir alimento
            </button>
          )}
          {dirty ? (
            <button type="button" className="btn btn-primary mt-2 w-full" disabled={busy} onClick={saveFoods}>
              Guardar cambios
            </button>
          ) : null}
        </section>
      ) : null}

      {/* Suposiciones */}
      {!pending && meal.estimate?.assumptions.length ? (
        <section>
          <h3 className="label">Suposiciones</h3>
          <ul className="space-y-1 rounded-2xl bg-bg px-4 py-3 text-[15px] text-muted">
            {meal.estimate.assumptions.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Corregir y volver a estimar */}
      {!pending && aiAvailable && (meal.hasPhoto || meal.description || meal.estimate) ? (
        <section>
          <label htmlFor="meal-correction" className="label">
            ¿Algo no cuadra?
          </label>
          <div className="relative">
            <textarea
              id="meal-correction"
              ref={correctionRef}
              className="input min-h-[72px] resize-none bg-bg pr-14"
              placeholder="Ej.: era media ración, sin salsa, también un yogur…"
              value={correction}
              maxLength={500}
              onChange={(e) => setCorrection(e.target.value)}
              autoCapitalize="sentences"
              rows={2}
            />
            <div className="absolute bottom-2 right-2">
              <MicButton value={correction} onChange={(t) => setCorrection(t.slice(0, 500))} field={correctionRef} />
            </div>
          </div>
          <button type="button" className="btn btn-secondary mt-2 w-full" disabled={busy || correction.trim().length < 3} onClick={() => reestimate(true)}>
            <Sparkles size={18} /> Volver a estimar
          </button>
        </section>
      ) : null}

      {/* Hambre y saciedad */}
      <section className="space-y-3">
        <Faces
          legend="Hambre antes"
          faces={HUNGER_FACES}
          value={hunger}
          onChange={(v) => {
            setHunger(v);
            void patch({ hungerBefore: v });
          }}
        />
        <Faces
          legend="Saciedad después"
          faces={FULLNESS_FACES}
          value={fullness}
          onChange={(v) => {
            setFullness(v);
            void patch({ fullnessAfter: v });
          }}
        />
      </section>

      <div className="space-y-2 pt-1">
        {!pending ? (
          <button type="button" className="btn btn-secondary w-full text-fg" disabled={busy || dirty || !foods.length} onClick={saveFavorite}>
            <Star size={19} /> Guardar como comida habitual
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary w-full text-muted" disabled={busy} onClick={remove}>
          <Trash2 size={19} /> {confirmDelete ? "Toca otra vez para borrarla" : "Borrar comida"}
        </button>
      </div>
    </div>
  );
}

export function Faces({
  legend,
  faces,
  value,
  onChange,
}: {
  legend: string;
  faces: { value: number; emoji: string; label: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {faces.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={value === f.value}
            aria-label={`${legend}: ${f.value} de 5, ${f.label}`}
            onClick={() => onChange(value === f.value ? null : f.value)}
            className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 transition ${
              value === f.value ? "bg-accent-soft text-accent ring-2 ring-accent" : "bg-bg"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {f.emoji}
            </span>
            <span className="text-[11px] font-semibold">{f.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Añadir un alimento a mano (valores exactos). */
function AddFood({ onAdd, onCancel }: { onAdd: (f: FoodItem) => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: "", quantity: "", kcal: "", protein: "", carbs: "", fat: "", fiber: "" });
  const n = (s: string) => Math.max(0, Number(s.replace(",", ".")) || 0);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((x) => ({ ...x, [k]: k === "name" || k === "quantity" ? e.target.value : e.target.value.replace(/[^\d.,]/g, "").slice(0, 6) }));
  const fields = [
    ["kcal", "kcal"],
    ["protein", "Proteína (g)"],
    ["carbs", "Carbohidratos (g)"],
    ["fat", "Grasa (g)"],
    ["fiber", "Fibra (g)"],
  ] as const;
  return (
    <div className="mt-2 space-y-2 rounded-2xl bg-bg p-3">
      <input className="input bg-surface-2" placeholder="Alimento (p. ej. yogur natural)" value={v.name} onChange={set("name")} maxLength={80} aria-label="Alimento" />
      <input className="input bg-surface-2" placeholder="Cantidad (p. ej. 1 unidad, 125 g)" value={v.quantity} onChange={set("quantity")} maxLength={60} aria-label="Cantidad" />
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([k, label]) => (
          <input key={k} className="input bg-surface-2" inputMode="decimal" placeholder={label} aria-label={label} value={v[k]} onChange={set(k)} />
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={!v.name.trim() || v.kcal === ""}
          onClick={() =>
            onAdd(exactFood(v.name.trim(), v.quantity.trim(), { kcal: n(v.kcal), protein: n(v.protein), carbs: n(v.carbs), fat: n(v.fat), fiber: n(v.fiber) }))
          }
        >
          Añadir
        </button>
      </div>
    </div>
  );
}
