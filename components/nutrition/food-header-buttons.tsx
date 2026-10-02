"use client";

import { Images } from "lucide-react";
import { openFoodSheet } from "@/components/nutrition/food-tabs";

/** Botones de la cabecera de Comida: añadir desde la galería y la racha 🔥. */
export function FoodHeaderButtons({ streak }: { streak: number }) {
  return (
    <>
      <button
        type="button"
        onClick={() => openFoodSheet("gallery")}
        aria-label="Añadir desde la galería"
        className="glass flex size-11 items-center justify-center rounded-full text-fg"
      >
        <Images size={21} />
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
