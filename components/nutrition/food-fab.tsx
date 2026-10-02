"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CupSoda, GlassWater, Plus } from "lucide-react";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import { useWater } from "@/components/nutrition/diary";
import { Sheet } from "@/components/ui/sheet";

type Action = "menu" | "camera" | "gallery" | "text" | "favorites" | "water";

const OPTIONS: { action: Exclude<Action, "menu">; emoji: string; label: string; ready: boolean }[] = [
  { action: "camera", emoji: "📷", label: "Hacer foto", ready: false },
  { action: "gallery", emoji: "🖼️", label: "Elegir de la galería", ready: false },
  { action: "text", emoji: "✍️", label: "Describir comida", ready: false },
  { action: "favorites", emoji: "⭐", label: "Comidas habituales", ready: false },
  { action: "water", emoji: "💧", label: "Añadir agua", ready: true },
];

/** Botón «+» de la pestaña Comida (blanco) y su hoja para añadir. */
export function FoodFab({ glassMl, bottleMl }: { glassMl: number; bottleMl: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "water">("menu");
  const water = useWater(null, 0);

  function show(action: Action) {
    setView(action === "water" ? "water" : "menu");
    setOpen(true);
  }

  useEffect(() => {
    const onAdd = (e: Event) => show((e as CustomEvent<Action>).detail ?? "menu");
    window.addEventListener("antola:food-add", onAdd);
    // Desde «Hoy» (botón de cámara): /comida?anadir=foto
    const param = new URLSearchParams(window.location.search).get("anadir");
    if (param) {
      show(param === "agua" ? "water" : "menu");
      router.replace("/comida", { scroll: false });
    }
    return () => window.removeEventListener("antola:food-add", onAdd);
  }, [router]);

  async function addWater(ml: number) {
    setOpen(false);
    await water.add(ml);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => show("menu")}
        aria-label="Añadir comida o agua"
        className="fixed right-5 z-40 flex size-16 items-center justify-center rounded-full bg-fg text-bg shadow-[0_8px_24px_rgb(0_0_0/0.25)] transition active:scale-90"
        style={{ bottom: "calc(max(env(safe-area-inset-bottom), 12px) + 62px + 14px)" }}
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={view === "water" ? "Añadir agua" : "Añadir"}>
        {view === "water" ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="card flex flex-col items-center gap-1 bg-surface-2 py-5 font-semibold" disabled={water.busy} onClick={() => addWater(glassMl)}>
              <GlassWater size={30} style={{ color: NUTRIENT.water.color }} />
              +1 vaso
              <span className="text-[13px] font-normal text-muted">{glassMl} ml</span>
            </button>
            <button type="button" className="card flex flex-col items-center gap-1 bg-surface-2 py-5 font-semibold" disabled={water.busy} onClick={() => addWater(bottleMl)}>
              <CupSoda size={30} style={{ color: NUTRIENT.water.color }} />
              +1 botella
              <span className="text-[13px] font-normal text-muted">{bottleMl} ml</span>
            </button>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-bg">
            {OPTIONS.map((o) => (
              <li key={o.action} className="border-b border-line last:border-0">
                <button
                  type="button"
                  disabled={!o.ready}
                  onClick={() => o.action === "water" && setView("water")}
                  className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium active:bg-surface-2 disabled:opacity-50"
                >
                  <span className="text-2xl" aria-hidden>
                    {o.emoji}
                  </span>
                  <span className="flex-1">{o.label}</span>
                  {o.ready ? null : <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] text-muted">Pronto</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
