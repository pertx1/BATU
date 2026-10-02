"use client";

import { PenLine } from "lucide-react";
import { openFoodSheet } from "@/components/nutrition/food-tabs";

/** Botones de la cabecera de Comida: describir una comida y la racha 🔥. */
export function FoodHeaderButtons({ streak }: { streak: number }) {
  return (
    <>
      <button
        type="button"
        onClick={() => openFoodSheet("text")}
        aria-label="Describir una comida"
        className="glass flex size-11 items-center justify-center rounded-full text-fg"
      >
        <PenLine size={21} />
      </button>
      <span
        className="glass flex h-11 items-center gap-1 rounded-full px-3.5 text-[17px] font-bold tabular-nums"
        aria-label={`Racha: ${streak} ${streak === 1 ? "día" : "días"} seguidos registrando comida`}
        title="Días seguidos registrando al menos una comida"
      >
        <span aria-hidden>🔥</span>
        {streak}
      </span>
    </>
  );
}
