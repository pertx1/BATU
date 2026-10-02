"use client";

import { Droplet, Flame, GlassWater, Leaf, Wheat, Zap } from "lucide-react";
import { MEAL_TYPE_INFO } from "@/lib/nutrition/meals";
import type { MealView } from "@/lib/data/nutrition";

/** Icono fijo de cada nutriente (lucide-react). */
export const NUTRIENT_ICON = {
  kcal: (s = 18) => <Flame size={s} />,
  protein: (s = 15) => <Zap size={s} fill="currentColor" />,
  carbs: (s = 15) => <Wheat size={s} />,
  fat: (s = 15) => <Droplet size={s} fill="currentColor" />,
  fiber: (s = 15) => <Leaf size={s} />,
  water: (s = 15) => <GlassWater size={s} />,
};

export function MealThumb({
  meal,
  size = 76,
  kind = "meal",
}: {
  meal: Pick<MealView, "id" | "type" | "hasPhoto">;
  size?: number;
  kind?: "meal" | "favorite";
}) {
  const info = MEAL_TYPE_INFO[meal.type];
  if (meal.hasPhoto) {
    return (
      // Foto privada: la sirve una ruta que comprueba la sesión.
      <img
        src={`/api/nutrition/photos/${kind}/${meal.id}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-2xl bg-surface-2 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size, height: size, background: `${info.bg}55`, fontSize: size * 0.45 }}
      aria-hidden
    >
      {info.emoji}
    </span>
  );
}
