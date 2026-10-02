"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, CupSoda, Droplet, Flame, GlassWater, Leaf, Wheat, Zap } from "lucide-react";
import { api } from "@/lib/client/api";
import { addDays, formatDateStr, type DateStr } from "@/lib/dates";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import { formatLiters, MEAL_TYPE_INFO, remaining } from "@/lib/nutrition/meals";
import type { Diary, MealView } from "@/lib/data/nutrition";
import { Ring } from "@/components/nutrition/ring";
import { useToast } from "@/components/ui/toast";

const fmt = new Intl.NumberFormat("es-ES");
const g = (n: number) => `${Math.round(n)} g`;

export const NUTRIENT_ICON = {
  kcal: (s = 18) => <Flame size={s} />,
  protein: (s = 15) => <Zap size={s} fill="currentColor" />,
  carbs: (s = 15) => <Wheat size={s} />,
  fat: (s = 15) => <Droplet size={s} fill="currentColor" />,
  fiber: (s = 15) => <Leaf size={s} />,
  water: (s = 15) => <GlassWater size={s} />,
};

/* ─── Selector de día ─────────────────────────────────────────────────────── */

export function DayPicker({ day, today }: { day: DateStr; today: DateStr }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const yesterday = addDays(today, -1);
  const items: { date: DateStr; label: string }[] = [
    { date: today, label: "Hoy" },
    { date: yesterday, label: "Ayer" },
  ];
  if (day !== today && day !== yesterday) items.push({ date: day, label: formatDateStr(day, "d MMM") });
  const href = (d: DateStr) => (d === today ? "/comida" : `/comida?dia=${d}`);

  return (
    <div className="flex items-center gap-5 px-1 pt-3">
      {items.map((it) => {
        const active = it.date === day;
        return (
          <Link
            key={it.date}
            href={href(it.date)}
            replace
            scroll={false}
            aria-current={active ? "date" : undefined}
            className={`relative pb-2 text-[20px] font-bold transition-colors ${active ? "text-fg" : "text-muted"}`}
          >
            {it.label}
            <span
              className={`absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-fg transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
              aria-hidden
            />
          </Link>
        );
      })}
      <label className="relative ml-auto flex size-11 cursor-pointer items-center justify-center rounded-full text-muted active:bg-surface-2">
        <CalendarDays size={24} />
        <span className="sr-only">Elegir otro día</span>
        <input
          ref={input}
          type="date"
          max={today}
          value={day}
          onClick={() => input.current?.showPicker?.()}
          onChange={(e) => {
            const v = e.target.value;
            if (v && v <= today) router.replace(href(v), { scroll: false });
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/* ─── Calorías ────────────────────────────────────────────────────────────── */

export function CaloriesCard({ diary }: { diary: Diary }) {
  const r = remaining(diary.totals.kcal, diary.targets.kcal);
  return (
    <div className="card flex items-center gap-3 p-5">
      <div className="min-w-0 flex-1">
        {diary.hideNumbers ? (
          <>
            <p className="text-[28px] font-bold leading-tight">Calorías</p>
            <p className="text-[15px] text-muted">{diary.meals.length ? "Lo que llevas hoy" : "Aún sin registrar"}</p>
          </>
        ) : (
          <>
            <p className="text-[52px] font-bold leading-none tracking-tight tabular-nums">{fmt.format(r.value)}</p>
            {/* Pasarse no es un error: mismo color neutro, sin rojo. */}
            <p className="mt-1.5 text-[15px] text-muted">{r.over ? "kcal por encima" : "Calorías restantes"}</p>
            <p className="mt-0.5 text-[13px] text-muted tabular-nums">
              {fmt.format(diary.totals.kcal)} de {fmt.format(diary.targets.kcal)} kcal
            </p>
          </>
        )}
      </div>
      <Ring
        value={r.ratio}
        size={118}
        stroke={11}
        color={NUTRIENT.kcal.color}
        icon={NUTRIENT_ICON.kcal(22)}
        label={`${Math.round(r.ratio * 100)} % de las calorías del día`}
      />
    </div>
  );
}

/* ─── Macros (dos páginas deslizables) ─────────────────────────────────────── */

type MacroKey = "protein" | "carbs" | "fat" | "fiber" | "water";

function MacroCard({
  k,
  consumed,
  target,
  unit = "g",
  hideNumbers,
}: {
  k: MacroKey;
  consumed: number;
  target: number;
  unit?: "g" | "ml";
  hideNumbers: boolean;
}) {
  const r = remaining(consumed, target);
  // Proteína, fibra y agua: llegar es un logro. Carbohidratos y grasa: solo informativo.
  const goalReached = (k === "protein" || k === "fiber" || k === "water") && consumed >= target && target > 0;
  const fmtUnit = (n: number) => (unit === "ml" ? `${formatLiters(n)} L` : g(n));
  const status = goalReached ? null : r.over ? "por encima" : "restantes";
  return (
    <div className="card flex min-w-0 flex-col p-3">
      {hideNumbers ? null : <p className="text-[22px] font-bold leading-tight tabular-nums">{fmtUnit(goalReached ? consumed : r.value)}</p>}
      <p className={`truncate text-[12px] ${hideNumbers ? "text-[15px] font-semibold text-fg" : "text-muted"}`}>{NUTRIENT[k].label}</p>
      <p className="flex h-5 items-center gap-1 text-[12px] font-medium text-muted">
        {goalReached ? (
          <>
            <Check size={14} strokeWidth={3} style={{ color: NUTRIENT.fiber.color }} />
            Conseguido
          </>
        ) : hideNumbers ? null : (
          status
        )}
      </p>
      <div className="mt-2 flex justify-center">
        <Ring value={r.ratio} size={78} stroke={9} color={NUTRIENT[k].color} icon={NUTRIENT_ICON[k]()} label={`${NUTRIENT[k].label}: ${Math.round(r.ratio * 100)} %`} />
      </div>
    </div>
  );
}

export function MacroPager({ diary }: { diary: Diary }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const { totals: t, targets: o, hideNumbers } = diary;

  function go(p: number) {
    const el = scroller.current;
    if (el) el.scrollTo({ left: p * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={scroller}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
        aria-roledescription="carrusel"
      >
        <div className="grid w-full shrink-0 snap-start grid-cols-3 gap-2 px-5" aria-label="Proteína, carbohidratos y grasa" role="group">
          <MacroCard k="protein" consumed={t.proteinG} target={o.proteinG} hideNumbers={hideNumbers} />
          <MacroCard k="carbs" consumed={t.carbsG} target={o.carbsG} hideNumbers={hideNumbers} />
          <MacroCard k="fat" consumed={t.fatG} target={o.fatG} hideNumbers={hideNumbers} />
        </div>
        <div className="grid w-full shrink-0 snap-start grid-cols-2 gap-2 px-5" aria-label="Fibra y agua" role="group">
          <MacroCard k="fiber" consumed={t.fiberG} target={o.fiberG} hideNumbers={hideNumbers} />
          <MacroCard k="water" consumed={diary.waterMl} target={o.waterMl} unit="ml" hideNumbers={false} />
        </div>
      </div>
      <div className="mt-2.5 flex justify-center gap-1.5">
        {[0, 1].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-label={p === 0 ? "Ver proteína, carbohidratos y grasa" : "Ver fibra y agua"}
            aria-current={page === p ? "true" : undefined}
            className="flex size-5 items-center justify-center"
          >
            <span className={`size-2 rounded-full transition-colors ${page === p ? "bg-fg" : "bg-surface-2"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Agua ────────────────────────────────────────────────────────────────── */

/** Añade agua con deshacer. Devuelve el total del día que ve el usuario. */
export function useWater(day: DateStr | null, initialMl: number) {
  const router = useRouter();
  const toast = useToast();
  const [ml, setMl] = useState(initialMl);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMl(initialMl), [initialMl]);

  async function add(amount: number) {
    setBusy(true);
    setMl((m) => m + amount);
    try {
      const res = await api<{ id: string; totalMl: number }>("/api/nutrition/water", { body: { ml: amount, ...(day ? { day } : {}) } });
      setMl(res.totalMl);
      toast.show({
        message: `+${amount} ml de agua 💧`,
        actionLabel: "Deshacer",
        onAction: async () => {
          setMl((m) => Math.max(0, m - amount));
          try {
            await api(`/api/nutrition/water/${res.id}`, { method: "DELETE" });
          } catch (err) {
            toast.error((err as Error).message);
          }
          router.refresh();
        },
      });
      router.refresh();
    } catch (err) {
      setMl((m) => m - amount);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { ml, add, busy };
}

export function WaterCard({ diary }: { diary: Diary }) {
  const { ml, add, busy } = useWater(diary.day === diary.today ? null : diary.day, diary.waterMl);
  const target = diary.targets.waterMl;
  const pct = target ? Math.min(100, (ml / target) * 100) : 0;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <GlassWater size={22} style={{ color: NUTRIENT.water.color }} />
        <p className="flex-1 font-semibold">Agua</p>
        <p className="text-[15px] text-muted tabular-nums">
          {formatLiters(ml)} / {formatLiters(target)} L
        </p>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Agua del día"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={ml}
      >
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: NUTRIENT.water.color }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-secondary whitespace-nowrap px-3 text-fg" disabled={busy} onClick={() => add(diary.glassMl)}>
          <GlassWater size={18} style={{ color: NUTRIENT.water.color }} /> +1 vaso
        </button>
        <button type="button" className="btn btn-secondary whitespace-nowrap px-3 text-fg" disabled={busy} onClick={() => add(diary.bottleMl)}>
          <CupSoda size={18} style={{ color: NUTRIENT.water.color }} /> +1 botella
        </button>
      </div>
    </div>
  );
}

/* ─── Lista de comidas ─────────────────────────────────────────────────────── */

export function MealThumb({ meal, size = 76 }: { meal: Pick<MealView, "id" | "type" | "hasPhoto">; size?: number }) {
  const info = MEAL_TYPE_INFO[meal.type];
  if (meal.hasPhoto) {
    return (
      // Foto privada: la sirve una ruta que comprueba la sesión.
      <img
        src={`/api/nutrition/photos/meal/${meal.id}`}
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

function MealRow({ meal, hideNumbers }: { meal: MealView; hideNumbers: boolean }) {
  const pending = meal.status === "PENDING";
  const title = meal.name ?? meal.description ?? MEAL_TYPE_INFO[meal.type].label;
  return (
    <li className={`card flex items-center gap-3 p-3 ${pending ? "shimmer" : ""}`}>
      <MealThumb meal={meal} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-semibold">{pending ? "Analizando…" : title}</p>
          <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[13px] font-semibold text-muted tabular-nums">{meal.time}</span>
        </div>
        {pending ? (
          <div className="mt-2 space-y-2" aria-hidden>
            <div className="h-3 w-3/5 rounded-full bg-surface-2" />
            <div className="h-3 w-4/5 rounded-full bg-surface-2" />
          </div>
        ) : hideNumbers ? (
          <p className="mt-0.5 text-[15px] text-muted">{MEAL_TYPE_INFO[meal.type].label}</p>
        ) : meal.status === "FAILED" ? (
          <p className="mt-0.5 text-[15px] text-muted">Sin estimar todavía</p>
        ) : (
          <>
            <p className="mt-0.5 flex items-center gap-1 font-semibold tabular-nums">
              {NUTRIENT_ICON.kcal(17)} {fmt.format(meal.kcal)} kcal
            </p>
            <p className="mt-0.5 flex gap-3 text-[14px] font-medium text-muted tabular-nums">
              <span className="flex items-center gap-1">
                <span style={{ color: NUTRIENT.protein.color }}>{NUTRIENT_ICON.protein(14)}</span>
                {g(meal.proteinG)}
              </span>
              <span className="flex items-center gap-1">
                <span style={{ color: NUTRIENT.carbs.color }}>{NUTRIENT_ICON.carbs(14)}</span>
                {g(meal.carbsG)}
              </span>
              <span className="flex items-center gap-1">
                <span style={{ color: NUTRIENT.fat.color }}>{NUTRIENT_ICON.fat(14)}</span>
                {g(meal.fatG)}
              </span>
            </p>
          </>
        )}
      </div>
    </li>
  );
}

export function MealList({ diary }: { diary: Diary }) {
  const router = useRouter();
  const pending = diary.meals.some((m) => m.status === "PENDING");
  // Mientras la IA estima, la lista se actualiza sola.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [pending, router]);

  const yesterday = addDays(diary.today, -1);
  const title =
    diary.day === diary.today ? "Registrado hoy" : diary.day === yesterday ? "Registrado ayer" : `Registrado el ${formatDateStr(diary.day, "d 'de' MMMM")}`;

  return (
    <section aria-label={title}>
      <h2 className="mb-3 mt-7 px-1 text-[22px] font-bold">{title}</h2>
      {diary.meals.length ? (
        <ul className="space-y-2.5">
          {diary.meals.map((m) => (
            <MealRow key={m.id} meal={m} hideNumbers={diary.hideNumbers} />
          ))}
        </ul>
      ) : (
        <div className="card px-5 py-8 text-center">
          <p className="text-4xl" aria-hidden>
            🍽️
          </p>
          <p className="mt-2 font-semibold">{diary.day === diary.today ? "Aún no has registrado nada hoy" : "No hay nada registrado este día"}</p>
          <p className="mt-1 text-[15px] text-muted">Toca + para hacer una foto o describir lo que comes.</p>
        </div>
      )}
    </section>
  );
}
