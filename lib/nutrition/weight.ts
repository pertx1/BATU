/** Peso: tendencia, cambios, proyección e hitos del objetivo (puro). */

import { weightTrend } from "@/lib/nutrition/calc";

export type WeighIn = { id?: string; day: string; kg: number };
export type TrendPoint = { day: string; kg: number; trend: number };

const DAY = 86_400_000;
const t = (d: string) => Date.parse(d + "T00:00:00Z");
const addDaysStr = (d: string, n: number) => new Date(t(d) + n * DAY).toISOString().slice(0, 10);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Tendencia en un día cualquiera (la del último pesaje de ese día o anterior). */
function trendAt(series: TrendPoint[], day: string): number | null {
  let v: number | null = null;
  for (const p of series) {
    if (p.day <= day) v = p.trend;
    else break;
  }
  return v;
}

export type WeightSummary = {
  series: TrendPoint[];
  current: number | null; // tendencia actual
  last: WeighIn | null; // último pesaje
  change7: number | null; // cambio de la tendencia en 7 días
  change30: number | null;
};

export function weightSummary(logs: WeighIn[], today: string): WeightSummary {
  const sorted = [...logs].sort((a, b) => a.day.localeCompare(b.day));
  const series = weightTrend(sorted);
  const current = series.at(-1)?.trend ?? null;
  const change = (days: number) => {
    if (current == null) return null;
    const first = series[0];
    const ref = trendAt(series, addDaysStr(today, -days));
    // Si aún no hay datos de hace tantos días, no se compara.
    if (ref == null || !first || first.day > addDaysStr(today, -days)) return null;
    return round1(current - ref);
  };
  return { series, current: current == null ? null : round1(current), last: sorted.at(-1) ?? null, change7: change(7), change30: change(30) };
}

/**
 * Ritmo de la tendencia en kg por semana (regresión lineal de las últimas 3
 * semanas). Hace falta al menos 3 pesajes en 7 días o más.
 */
export function weeklyRate(series: TrendPoint[], today: string): number | null {
  const from = addDaysStr(today, -21);
  const pts = series.filter((p) => p.day >= from);
  if (pts.length < 3 || t(pts.at(-1)!.day) - t(pts[0].day) < 7 * DAY) return null;
  const xs = pts.map((p) => (t(p.day) - t(pts[0].day)) / DAY);
  const ys = pts.map((p) => p.trend);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) ** 2;
  });
  return den ? (num / den) * 7 : null;
}

/** Fecha estimada de llegada (solo si la tendencia va en la buena dirección). */
export function projection(current: number | null, target: number | null, rate: number | null, today: string): string | null {
  if (current == null || target == null || rate == null) return null;
  const remaining = target - current;
  if (Math.abs(remaining) < 0.05) return null;
  if (Math.sign(remaining) !== Math.sign(rate) || Math.abs(rate) < 0.02) return null;
  const weeks = remaining / rate;
  if (weeks > 104) return null; // más de 2 años: no tiene sentido estimarlo
  return addDaysStr(today, Math.ceil(weeks * 7));
}

/** ¿Ha llegado la tendencia al objetivo? */
export function reachedTarget(start: number, current: number, target: number): boolean {
  return target < start ? current <= target : target > start ? current >= target : true;
}

export type WeightMilestone = { id: string; kg: number; label: string; reached: boolean };

/**
 * Hitos automáticos del objetivo de peso: cada 2 kg desde el inicio y la
 * mitad del camino (todos según la tendencia).
 */
export function weightMilestones(start: number, target: number, current: number | null): WeightMilestone[] {
  const dir = target < start ? -1 : 1;
  const total = Math.abs(target - start);
  const out: WeightMilestone[] = [];
  const passed = (kg: number) => current != null && (dir < 0 ? current <= kg + 1e-9 : current >= kg - 1e-9);
  for (let d = 2; d < total - 0.25; d += 2) {
    const kg = round1(start + dir * d);
    out.push({ id: `${d}kg`, kg, label: `${dir < 0 ? "−" : "+"}${d} kg`, reached: passed(kg) });
  }
  if (total >= 1) {
    const half = round1(start + (dir * total) / 2);
    if (!out.some((m) => Math.abs(m.kg - half) < 0.3)) out.push({ id: "half", kg: half, label: "Mitad del camino", reached: passed(half) });
    else out.find((m) => Math.abs(m.kg - half) < 0.3)!.label += " · mitad del camino";
  }
  return out.sort((a, b) => (dir < 0 ? b.kg - a.kg : a.kg - b.kg));
}

export function formatChange(kg: number | null): string {
  if (kg == null) return "—";
  if (Math.abs(kg) < 0.05) return "Igual";
  const n = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(Math.abs(kg));
  return `${kg > 0 ? "+" : "−"}${n} kg`;
}

/**
 * ¿La tendencia ha bajado más de un 1 % del peso por semana durante las dos
 * últimas semanas seguidas? Hace falta un pesaje de hace 14 días o más y
 * otro de los últimos 4 días para saberlo.
 */
export function losingTooFast(series: TrendPoint[], today: string): boolean {
  const sorted = [...series].sort((a, b) => a.day.localeCompare(b.day));
  const last = sorted.at(-1);
  if (!last || last.day < addDaysStr(today, -4)) return false;
  const a = trendAt(sorted, addDaysStr(today, -14));
  const b = trendAt(sorted, addDaysStr(today, -7));
  if (a == null || b == null || a === b) return false;
  return a - b > a * 0.01 && b - last.trend > b * 0.01;
}

/** Kilos avanzados hacia el objetivo (0 si la tendencia va al revés). */
export function progressKg(start: number, target: number, current: number | null): number {
  if (current == null) return 0;
  return Math.max(0, target < start ? start - current : current - start);
}
