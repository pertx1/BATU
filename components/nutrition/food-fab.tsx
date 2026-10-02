"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CupSoda, GlassWater, Plus, X } from "lucide-react";
import { apiForm } from "@/lib/client/api";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import type { MealType } from "@/lib/nutrition/meals";
import { api } from "@/lib/client/api";
import { MealThumb } from "@/components/nutrition/bits";
import { useWater } from "@/components/nutrition/diary";
import { MealComposer, type ComposerResult } from "@/components/nutrition/meal-composer";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

type Action = "menu" | "text" | "favorites" | "water";
type View = "menu" | "water" | "compose" | "favorites";

export type FavoriteView = { id: string; name: string; type: MealType; kcal: number; hasPhoto: boolean };

/** Botón «+» de la pestaña Comida (blanco) y su hoja para añadir. */
export function FoodFab({
  glassMl,
  bottleMl,
  aiAvailable,
  favorites,
  hideNumbers,
}: {
  glassMl: number;
  bottleMl: number;
  aiAvailable: boolean;
  favorites: FavoriteView[];
  hideNumbers: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [saving, setSaving] = useState(false);
  const water = useWater(null, 0);

  const show = useCallback((action: Action) => {
    setView(action === "water" ? "water" : action === "text" ? "compose" : action === "favorites" ? "favorites" : "menu");
    setOpen(true);
  }, []);

  useEffect(() => {
    const onAdd = (e: Event) => show((e as CustomEvent<Action>).detail ?? "menu");
    window.addEventListener("antola:food-add", onAdd);
    // Desde «Hoy» o un aviso: /comida?anadir=texto o ?anadir=agua.
    const param = new URLSearchParams(window.location.search).get("anadir");
    if (param) {
      setView(param === "agua" ? "water" : param === "texto" ? "compose" : "menu");
      setOpen(true);
      router.replace("/comida", { scroll: false });
    }
    return () => window.removeEventListener("antola:food-add", onAdd);
  }, [router, show]);

  async function save(r: ComposerResult) {
    setSaving(true);
    try {
      const form = new FormData();
      // El día que estás viendo en el Diario (por defecto, hoy).
      const dia = new URLSearchParams(window.location.search).get("dia");
      if (dia) form.set("day", dia);
      form.set("minutes", String(r.minutes));
      form.set("type", r.type);
      if (r.description) form.set("description", r.description);
      if (r.hungerBefore) form.set("hungerBefore", String(r.hungerBefore));
      if (r.manual) for (const [k, v] of Object.entries(r.manual)) form.set(k, String(v));
      const res = await apiForm<{ estimating: boolean; notice: string | null }>("/api/nutrition/meals", form);
      setOpen(false);
      toast.show({ message: res.notice ?? (res.estimating ? "Analizando tu comida… 🔍" : "Comida guardada 🍽️"), duration: res.notice ? 7000 : 3000 });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function addWater(ml: number) {
    setOpen(false);
    await water.add(ml);
  }

  const options: { action: Exclude<Action, "menu">; emoji: string; label: string; ready: boolean }[] = [
    { action: "text", emoji: "✍️", label: "Describir comida", ready: true },
    { action: "favorites", emoji: "⭐", label: "Comidas habituales", ready: true },
    { action: "water", emoji: "💧", label: "Añadir agua", ready: true },
  ];

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
      <Sheet
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={view === "water" ? "Añadir agua" : view === "compose" ? "Registrar comida" : view === "favorites" ? "Comidas habituales" : "Añadir"}
      >
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
        ) : view === "favorites" ? (
          <FavoritesList
            favorites={favorites}
            hideNumbers={hideNumbers}
            onLogged={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        ) : view === "compose" ? (
          <MealComposer aiAvailable={aiAvailable} saving={saving} onSubmit={save} />
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-bg">
            {options.map((o) => (
              <li key={o.action} className="border-b border-line last:border-0">
                <button
                  type="button"
                  disabled={!o.ready}
                  onClick={() => (o.action === "water" ? setView("water") : show(o.action))}
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

/** Comidas habituales: un toque y queda registrada (sin volver a llamar a la IA). */
function FavoritesList({ favorites, hideNumbers, onLogged }: { favorites: FavoriteView[]; hideNumbers: boolean; onLogged: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!favorites.length) {
    return (
      <div className="rounded-2xl bg-bg px-5 py-8 text-center">
        <p className="text-4xl" aria-hidden>
          ⭐
        </p>
        <p className="mt-2 font-semibold">Aún no tienes comidas habituales</p>
        <p className="mt-1 text-[15px] text-muted">Abre una comida registrada y toca «Guardar como comida habitual».</p>
      </div>
    );
  }
  async function log(f: FavoriteView) {
    setBusy(f.id);
    try {
      const body: Record<string, unknown> = {};
      const dia = new URLSearchParams(window.location.search).get("dia");
      if (dia) body.day = dia;
      const d = new Date();
      body.minutes = d.getHours() * 60 + d.getMinutes();
      await api(`/api/nutrition/favorites/${f.id}/log`, { body });
      toast.show({ message: `${f.name} registrada 🍽️` });
      onLogged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function remove(f: FavoriteView) {
    if (confirm !== f.id) {
      setConfirm(f.id);
      setTimeout(() => setConfirm((c) => (c === f.id ? null : c)), 4000);
      return;
    }
    try {
      await api(`/api/nutrition/favorites/${f.id}`, { method: "DELETE" });
      toast.show({ message: "Quitada de tus comidas habituales" });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
      {favorites.map((f) => (
        <li key={f.id} className="flex items-center gap-2 pr-2">
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 p-2.5 text-left active:bg-surface-2" disabled={!!busy} onClick={() => log(f)}>
            <MealThumb meal={f} size={52} kind="favorite" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{f.name}</span>
              <span className="block text-[13px] text-muted">{busy === f.id ? "Registrando…" : hideNumbers ? "Toca para registrarla" : `${f.kcal} kcal · toca para registrarla`}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => remove(f)}
            className={`flex h-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${confirm === f.id ? "bg-surface-2 px-3" : "w-9 text-muted"}`}
            aria-label={`Quitar ${f.name} de las habituales`}
          >
            {confirm === f.id ? "Quitar" : <X size={18} />}
          </button>
        </li>
      ))}
    </ul>
  );
}
