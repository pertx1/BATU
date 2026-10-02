"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { MEAL_TYPE_INFO, MEAL_TYPES, mealTypeForMinutes, type MealType } from "@/lib/nutrition/meals";
import { MicButton } from "@/components/ui/mic-button";

export const HUNGER_FACES = [
  { value: 1, emoji: "😌", label: "Nada" },
  { value: 2, emoji: "🙂", label: "Poca" },
  { value: 3, emoji: "😐", label: "Algo" },
  { value: 4, emoji: "😋", label: "Bastante" },
  { value: 5, emoji: "🤤", label: "Muchísima" },
];

export type ComposerResult = {
  description: string;
  type: MealType;
  minutes: number;
  hungerBefore: number | null;
  manual: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
};

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Formulario para registrar una comida: descripción (cómoda para dictar),
 * tipo sugerido por la hora, hora y hambre antes. La IA calcula el resto.
 */
export function MealComposer({
  aiAvailable,
  saving,
  onSubmit,
}: {
  aiAvailable: boolean;
  saving: boolean;
  onSubmit: (r: ComposerResult) => void;
}) {
  const [description, setDescription] = useState("");
  const [minutes, setMinutes] = useState(nowMinutes);
  const [type, setType] = useState<MealType>(() => mealTypeForMinutes(nowMinutes()));
  const [typeTouched, setTypeTouched] = useState(false);
  const [hunger, setHunger] = useState<number | null>(null);
  const [manual, setManual] = useState({ kcal: "", proteinG: "", carbsG: "", fatG: "" });
  const textRef = useRef<HTMLTextAreaElement>(null);
  const canSave = !saving && description.trim().length >= 3 && (aiAvailable || manual.kcal !== "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    const n = (s: string) => Math.max(0, Number(s.replace(",", ".")) || 0);
    onSubmit({
      description: description.trim(),
      type,
      minutes,
      hungerBefore: hunger,
      manual: aiAvailable ? null : { kcal: Math.round(n(manual.kcal)), proteinG: n(manual.proteinG), carbsG: n(manual.carbsG), fatG: n(manual.fatG) },
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="meal-description" className="label">
          ¿Qué has comido?
        </label>
        <div className="relative">
          <textarea
            id="meal-description"
            ref={textRef}
            className="input min-h-[96px] resize-none pr-14"
            placeholder="Ej.: plato de lentejas con chorizo, un trozo de pan y un yogur natural"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck
            maxLength={1000}
            rows={3}
          />
          <div className="absolute bottom-2 right-2">
            <MicButton value={description} onChange={(t) => setDescription(t.slice(0, 1000))} field={textRef} />
          </div>
        </div>
        {aiAvailable ? (
          <p className="mt-1.5 text-[13px] text-muted">Cuanto más detalle (cantidades, cómo está cocinado, el aceite…), mejor calcula la IA.</p>
        ) : null}
      </div>

      <div>
        <p className="label">Tipo</p>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {MEAL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => {
                setType(t);
                setTypeTouched(true);
              }}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-semibold transition ${
                type === t ? "bg-fg text-bg" : "bg-bg text-fg"
              }`}
            >
              <span aria-hidden>{MEAL_TYPE_INFO[t].emoji}</span>
              {MEAL_TYPE_INFO[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="meal-time" className="flex-1 font-medium">
          Hora
        </label>
        <input
          id="meal-time"
          type="time"
          className="input w-36 text-center"
          value={toHHMM(minutes)}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (Number.isFinite(h) && Number.isFinite(m)) {
              const v = h * 60 + m;
              setMinutes(v);
              // Si no lo has elegido tú, el tipo sigue a la hora.
              if (!typeTouched) setType(mealTypeForMinutes(v));
            }
          }}
        />
      </div>

      <fieldset>
        <legend className="label">Hambre antes de comer (opcional)</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {HUNGER_FACES.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={hunger === f.value}
              aria-label={`Hambre ${f.value} de 5: ${f.label}`}
              onClick={() => setHunger(hunger === f.value ? null : f.value)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 transition ${
                hunger === f.value ? "bg-accent-soft text-accent ring-2 ring-accent" : "bg-bg"
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

      {aiAvailable ? null : (
        <fieldset>
          <legend className="label">Valores (a mano)</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["kcal", "Calorías (kcal)"],
                ["proteinG", "Proteína (g)"],
                ["carbsG", "Carbohidratos (g)"],
                ["fatG", "Grasa (g)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="block">
                <span className="mb-1 block px-1 text-[13px] text-muted">{label}</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={manual[k]}
                  onChange={(e) => setManual((m) => ({ ...m, [k]: e.target.value.replace(/[^\d.,]/g, "").slice(0, 6) }))}
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={!canSave}>
        {saving ? (
          "Guardando…"
        ) : aiAvailable ? (
          <>
            <Sparkles size={19} /> Guardar y analizar
          </>
        ) : (
          "Guardar"
        )}
      </button>
    </form>
  );
}
