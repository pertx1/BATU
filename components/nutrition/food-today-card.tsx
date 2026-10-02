"use client";

import Link from "next/link";
import { Camera, ChevronRight, GlassWater, Plus } from "lucide-react";
import type { FoodToday } from "@/lib/data/nutrition";
import { formatLiters, remaining } from "@/lib/nutrition/meals";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import { NUTRIENT_ICON } from "@/components/nutrition/bits";
import { useWater } from "@/components/nutrition/diary";
import { Ring } from "@/components/nutrition/ring";

const fmt = new Intl.NumberFormat("es-ES");

/** Tarjeta «Comida de hoy» en Hoy: calorías, agua con +1 vaso y cámara. */
export function FoodTodayCard({ data }: { data: FoodToday }) {
  const water = useWater(null, data.waterMl);
  const r = remaining(data.kcal, data.kcalTarget);
  const pct = data.waterTarget ? Math.min(100, (water.ml / data.waterTarget) * 100) : 0;
  return (
    <div className="card overflow-hidden">
      <Link href="/comida" className="flex items-center gap-3 p-4 pb-3 active:bg-surface-2">
        <Ring value={r.ratio} size={56} stroke={7} color={NUTRIENT.kcal.color} icon={NUTRIENT_ICON.kcal(15)} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Comida de hoy</p>
          {data.hideNumbers ? (
            <p className="font-semibold">Ver mi diario</p>
          ) : (
            <p className="font-semibold tabular-nums">
              {fmt.format(r.value)} kcal {r.over ? "por encima" : "restantes"}
            </p>
          )}
        </div>
        <ChevronRight size={18} className="text-muted" />
      </Link>
      <div className="flex items-center gap-2 px-4 pb-4">
        <GlassWater size={20} className="shrink-0" style={{ color: NUTRIENT.water.color }} />
        <div className="min-w-0 flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: NUTRIENT.water.color }} />
          </div>
          <p className="mt-1 whitespace-nowrap text-[13px] text-muted tabular-nums">
            {formatLiters(water.ml)} / {formatLiters(data.waterTarget)} L
          </p>
        </div>
        <button
          type="button"
          onClick={() => water.add(data.glassMl)}
          disabled={water.busy}
          className="flex h-10 items-center gap-1 rounded-full bg-surface-2 px-3 text-[15px] font-semibold"
          aria-label={`Añadir un vaso de agua (${data.glassMl} ml)`}
        >
          <Plus size={16} strokeWidth={2.6} /> 1 vaso
        </button>
        <Link
          href="/comida?anadir=foto"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fg text-bg"
          aria-label="Registrar una comida con foto"
        >
          <Camera size={19} />
        </Link>
      </div>
    </div>
  );
}
