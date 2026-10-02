"use client";

import { useState } from "react";
import { Bar as RBar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Lightbulb } from "lucide-react";
import { formatDateStr, type DateStr } from "@/lib/dates";
import type { Analysis } from "@/lib/data/analysis";
import { SLOT_INFO, formatScore, type Bar, type HeatCell, type MacroSplit } from "@/lib/nutrition/analysis";
import { MEAL_TYPE_INFO, formatWater } from "@/lib/nutrition/meals";
import { NUTRIENT, type Nutrient } from "@/lib/nutrition/nutrients";
import { NUTRIENT_ICON } from "@/components/nutrition/bits";
import { HUNGER_FACES } from "@/components/nutrition/meal-composer";

const int = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const CALORIES_COLOR = "var(--accent)";

function Card({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {subtitle ? <p className="text-[14px] text-muted">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-bg px-4 py-6 text-center text-[15px] text-muted">{children}</p>;
}

// ---------- Constancia ----------

const WEEKDAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const HEAT_FILL = ["var(--surface-2)", "color-mix(in srgb, var(--accent) 35%, var(--surface-2))", "color-mix(in srgb, var(--accent) 65%, var(--surface-2))", "var(--accent)"];
const mealsText = (n: number) => (n === 0 ? "sin comidas" : n === 1 ? "1 comida" : `${n} comidas`);

export function ConsistencyCard({ data }: { data: Analysis }) {
  const [picked, setPicked] = useState<HeatCell | null>(null);
  const { current, best } = data.streak;
  return (
    <Card title="Constancia" subtitle="Comidas registradas cada día, últimas 13 semanas">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-bg px-3 py-2">
          <p className="text-[12px] text-muted">Racha actual</p>
          <p className="text-[22px] font-bold">
            {current} {current === 1 ? "día" : "días"} {current > 0 ? "🔥" : ""}
          </p>
        </div>
        <div className="rounded-2xl bg-bg px-3 py-2">
          <p className="text-[12px] text-muted">Mejor racha</p>
          <p className="text-[22px] font-bold">
            {best} {best === 1 ? "día" : "días"}
          </p>
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-[3px] pr-0.5 text-[10px] leading-none text-muted" aria-hidden>
          {WEEKDAY_LETTERS.map((l, i) => (
            <span key={l} className="flex items-center">
              {i % 2 === 0 ? l : ""}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-flow-col grid-cols-[repeat(13,minmax(0,1fr))] grid-rows-7 gap-[3px]" role="grid" aria-label="Calendario de constancia">
          {data.heatmap.flat().map((c) =>
            c.future ? (
              <span key={c.day} className="aspect-square" aria-hidden />
            ) : (
              <button
                key={c.day}
                type="button"
                onClick={() => setPicked(picked?.day === c.day ? null : c)}
                aria-label={`${formatDateStr(c.day, "EEEE d 'de' MMMM")}: ${mealsText(c.meals)}`}
                className={`aspect-square rounded-[4px] ${picked?.day === c.day ? "ring-2 ring-fg" : c.day === data.today ? "ring-1 ring-muted" : ""}`}
                style={{ background: HEAT_FILL[c.level] }}
              />
            ),
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-muted">
        <span className="min-h-4">{picked ? `${formatDateStr(picked.day, "EEE d 'de' MMM")} · ${mealsText(picked.meals)}` : "Toca un día para verlo"}</span>
        <span className="flex shrink-0 items-center gap-1" aria-hidden>
          0
          {HEAT_FILL.map((f) => (
            <span key={f} className="size-3 rounded-[3px]" style={{ background: f }} />
          ))}
          3+
        </span>
      </div>
    </Card>
  );
}

// ---------- Barras por día (o por semana) con la línea del objetivo ----------

function tickFor(bars: Bar[]) {
  if (bars[0]?.weekly) return (d: DateStr) => formatDateStr(d, "d MMM");
  if (bars.length <= 7) return (d: DateStr) => formatDateStr(d, "EEEEEE");
  return (d: DateStr) => formatDateStr(d, "d");
}

/** Marcas redondas del eje (múltiplos de `step`, como mucho 5). */
function niceTicks(max: number, step: number): number[] {
  const unit = step * Math.max(1, Math.ceil(Math.ceil(max / step) / 4));
  const top = Math.max(unit, Math.ceil(max / unit) * unit);
  return Array.from({ length: top / unit + 1 }, (_, i) => i * unit);
}

function DayBars({
  bars,
  target,
  color,
  format,
  hideNumbers,
  label,
  step,
}: {
  bars: Bar[];
  target: number;
  step: number;
  color: string;
  format: (v: number) => string;
  hideNumbers: boolean;
  label: string;
}) {
  const ticks = niceTicks(Math.max(target * 1.1, ...bars.map((b) => b.value ?? 0)), step);
  const tick = tickFor(bars);
  const weekly = bars[0]?.weekly ?? false;
  return (
    <div style={{ height: 200 }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 8, right: 4, bottom: 0, left: hideNumbers ? 4 : -8 }} barCategoryGap="22%">
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="key" tickFormatter={tick} tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis
            hide={hideNumbers}
            domain={[0, ticks.at(-1)!]}
            ticks={ticks}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => format(v)}
          />
          {hideNumbers ? null : (
            <Tooltip
              cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
              contentStyle={{ background: "var(--surface)", border: "none", borderRadius: 12, boxShadow: "0 6px 20px rgb(0 0 0/0.15)", color: "var(--fg)" }}
              labelFormatter={(d) => (weekly ? `Semana del ${formatDateStr(String(d), "d 'de' MMMM")}` : formatDateStr(String(d), "EEEE d 'de' MMMM"))}
              formatter={(v) => [format(Number(v)), weekly ? "Media" : "Total"]}
            />
          )}
          <ReferenceLine
            y={target}
            stroke="var(--fg)"
            strokeOpacity={0.55}
            strokeDasharray="6 5"
            strokeWidth={1.5}
            label={{ value: "Objetivo", position: "insideTopRight", fill: "var(--muted)", fontSize: 12 }}
          />
          <RBar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            {bars.map((b) => (
              <Cell key={b.key} fillOpacity={b.partial ? 0.45 : 1} />
            ))}
          </RBar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PartialNote({ bars }: { bars: Bar[] }) {
  const p = bars.find((b) => b.partial && b.value);
  if (!p) return null;
  return <p className="mt-2 text-[12px] text-muted">La barra más clara es {p.weekly ? "esta semana" : "hoy"}, que aún no ha terminado.</p>;
}

export function CaloriesChartCard({ data }: { data: Analysis }) {
  const c = data.calories;
  const kcal = (v: number) => `${int.format(v)}`;
  return (
    <Card
      title="Calorías"
      subtitle={
        data.hideNumbers
          ? `${data.loggedDays} de ${data.rangeDays} días con comidas`
          : c.average != null
            ? `Media de ${int.format(c.average)} kcal al día · objetivo ${int.format(c.target)}`
            : `Objetivo ${int.format(c.target)} kcal al día`
      }
    >
      {data.loggedDays ? (
        <>
          <DayBars bars={c.bars} target={c.target} color={CALORIES_COLOR} format={kcal} step={500} hideNumbers={data.hideNumbers} label="Calorías por día con la línea de tu objetivo" />
          <PartialNote bars={c.bars} />
        </>
      ) : (
        <Empty>Aún no hay comidas en este periodo.</Empty>
      )}
    </Card>
  );
}

export function WaterChartCard({ data }: { data: Analysis }) {
  const w = data.water;
  return (
    <Card
      title="Agua"
      subtitle={
        w.average != null
          ? `Media de ${formatWater(w.average)} al día · ${w.goalDays} de ${w.days} días con tu objetivo`
          : `Objetivo ${formatWater(w.target)} al día`
      }
    >
      {w.average != null ? (
        <>
          <DayBars
            bars={w.bars}
            target={w.target}
            color={NUTRIENT.water.color}
            format={(v) => (v >= 1000 ? `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(v / 1000)} L` : `${int.format(v)} ml`)}
            hideNumbers={false}
            step={500}
            label="Agua por día con la línea de tu objetivo"
          />
          <PartialNote bars={w.bars} />
        </>
      ) : (
        <Empty>Aún no hay agua apuntada en este periodo.</Empty>
      )}
    </Card>
  );
}

// ---------- Macros ----------

const MACRO_ROWS: { k: Exclude<Nutrient, "kcal" | "water">; key: "proteinG" | "carbsG" | "fatG" | "fiberG" }[] = [
  { k: "protein", key: "proteinG" },
  { k: "carbs", key: "carbsG" },
  { k: "fat", key: "fatG" },
  { k: "fiber", key: "fiberG" },
];

// Proteína y carbohidratos no van juntos: sus colores se parecen.
const SPLIT_ORDER: { k: "protein" | "fat" | "carbs" }[] = [{ k: "protein" }, { k: "fat" }, { k: "carbs" }];

function SplitBar({ split, label }: { split: MacroSplit; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[13px] text-muted">{label}</span>
      <div className="flex h-3 flex-1 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${label}: proteína ${split.protein} %, grasa ${split.fat} %, carbohidratos ${split.carbs} %`}>
        {SPLIT_ORDER.map(({ k }) => (split[k] > 0 ? <span key={k} style={{ width: `${split[k]}%`, background: NUTRIENT[k].color }} /> : null))}
      </div>
    </div>
  );
}

export function MacrosCard({ data }: { data: Analysis }) {
  const { average: avg, target, split, targetSplit } = data.macros;
  return (
    <Card title="Macros" subtitle={avg ? "Media diaria frente a tu objetivo" : undefined}>
      {avg ? (
        <>
          <ul className="space-y-3">
            {MACRO_ROWS.map(({ k, key }) => {
              const ratio = target[key] > 0 ? avg[key] / target[key] : 0;
              return (
                <li key={k}>
                  <div className="flex items-center gap-2 text-[15px]">
                    <span style={{ color: NUTRIENT[k].color }} aria-hidden>
                      {NUTRIENT_ICON[k]()}
                    </span>
                    <span className="flex-1 font-medium">{NUTRIENT[k].label}</span>
                    {data.hideNumbers ? null : (
                      <span className="text-[14px] text-muted tabular-nums">
                        <b className="font-semibold text-fg">{int.format(avg[key])} g</b> de {int.format(target[key])} g
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, background: NUTRIENT[k].color }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {split && targetSplit ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-[15px] font-semibold">De dónde vienen tus calorías</p>
              <div className="space-y-2">
                <SplitBar split={split} label="Tú" />
                <SplitBar split={targetSplit} label="Objetivo" />
              </div>
              <table className="mt-3 w-full text-[14px]">
                <thead className="text-[12px] text-muted">
                  <tr>
                    <th className="pb-1 text-left font-normal" />
                    <th className="pb-1 text-right font-normal">Tú</th>
                    <th className="pb-1 text-right font-normal">Objetivo</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {SPLIT_ORDER.map(({ k }) => (
                    <tr key={k}>
                      <td className="py-0.5">
                        <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: NUTRIENT[k].color }} />
                        {NUTRIENT[k].label}
                      </td>
                      <td className="py-0.5 text-right font-semibold">{split[k]} %</td>
                      <td className="py-0.5 text-right text-muted">{targetSplit[k]} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <Empty>Aún no hay comidas en este periodo.</Empty>
      )}
    </Card>
  );
}

// ---------- Hambre y saciedad ----------

function ScoreBar({ value, label }: { value: number | null; label: string }) {
  if (value == null) return <span className="text-[13px] text-muted">—</span>;
  return (
    <span className="flex items-center gap-2" aria-label={`${label}: ${formatScore(value)} de 5`}>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${(value / 5) * 100}%` }} />
      </span>
      <span className="w-7 text-right text-[13px] font-semibold tabular-nums">{formatScore(value)}</span>
    </span>
  );
}

const faceFor = (v: number) => HUNGER_FACES[Math.min(4, Math.max(0, Math.round(v) - 1))];

export function HungerCard({ data }: { data: Analysis }) {
  const h = data.hunger;
  return (
    <Card title="Hambre y saciedad" subtitle="Hambre antes de comer y saciedad después, de 1 a 5">
      {h.count ? (
        <>
          <table className="w-full table-fixed text-[14px]">
            <thead className="text-[12px] text-muted">
              <tr>
                <th className="w-[34%] pb-1 text-left font-normal" />
                <th className="pb-1 pl-2 text-left font-normal">Hambre antes</th>
                <th className="pb-1 pl-2 text-left font-normal">Saciedad después</th>
              </tr>
            </thead>
            <tbody>
              {h.byType.map((r) => (
                <tr key={r.type}>
                  <td className="truncate py-1.5">
                    <span aria-hidden>{MEAL_TYPE_INFO[r.type].emoji}</span> {MEAL_TYPE_INFO[r.type].label}
                  </td>
                  <td className="py-1.5 pl-2">
                    <ScoreBar value={r.hunger} label="Hambre" />
                  </td>
                  <td className="py-1.5 pl-2">
                    <ScoreBar value={r.fullness} label="Saciedad" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {h.bySlot.some((s) => s.hunger != null) ? (
            <>
              <p className="mb-2 mt-4 text-[15px] font-semibold">Hambre según la hora</p>
              <div className="grid grid-cols-4 gap-2">
                {h.bySlot.map((s) => (
                  <div key={s.slot} className="rounded-2xl bg-bg px-1 py-2 text-center">
                    <p className="text-[12px] font-semibold">{SLOT_INFO[s.slot].label}</p>
                    <p className="text-[11px] text-muted">{SLOT_INFO[s.slot].hours}</p>
                    {s.hunger != null ? (
                      <>
                        <p className="mt-1 text-xl" aria-hidden>
                          {faceFor(s.hunger).emoji}
                        </p>
                        <p className="text-[13px] font-semibold tabular-nums">{formatScore(s.hunger)}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-[13px] text-muted">—</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {h.insights.length ? (
            <ul className="mt-4 space-y-2">
              {h.insights.map((t) => (
                <li key={t} className="flex gap-2 rounded-2xl bg-accent-soft px-3 py-2.5 text-[14px]">
                  <Lightbulb size={17} className="mt-0.5 shrink-0 text-accent" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : h.daysToInsights ? (
            <p className="mt-4 text-[13px] text-muted">
              Sigue anotando cómo llegas y cómo acabas cada comida. En {h.daysToInsights} {h.daysToInsights === 1 ? "día" : "días"} te contaré lo que vaya viendo.
            </p>
          ) : null}
        </>
      ) : (
        <Empty>Al registrar una comida, marca cuánta hambre tenías; al terminar, cuánta saciedad notas. Aquí verás cómo cambia según la comida y la hora.</Empty>
      )}
    </Card>
  );
}
