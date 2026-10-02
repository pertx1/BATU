"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateStr } from "@/lib/dates";
import type { TrendPoint } from "@/lib/nutrition/weight";
import { Segmented } from "@/components/ui/controls";

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(d + "T00:00:00Z");
const kgFmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

const RANGES = [
  { value: "30", label: "Mes" },
  { value: "90", label: "3 meses" },
  { value: "all", label: "Todo" },
] as const;
type RangeKey = (typeof RANGES)[number]["value"];

type Row = { x: number; kg?: number; trend?: number; projection?: number };

/**
 * Pesajes (puntos), tendencia (línea), peso objetivo (discontinua) y la
 * proyección hasta la fecha estimada (solo si la tendencia va hacia el objetivo).
 */
export function WeightChart({
  series,
  target,
  today,
  eta,
  compact = false,
}: {
  series: TrendPoint[];
  target: number | null;
  today: string;
  eta: string | null;
  compact?: boolean;
}) {
  const [range, setRange] = useState<RangeKey>("90");
  const data = useMemo(() => {
    const from = range === "all" ? -Infinity : ms(today) - Number(range) * DAY;
    const rows: Row[] = series.filter((p) => ms(p.day) >= from).map((p) => ({ x: ms(p.day), kg: p.kg, trend: p.trend }));
    const last = series.at(-1);
    if (eta && last && target != null && !compact) {
      rows[rows.length - 1] = { ...rows[rows.length - 1], projection: last.trend };
      rows.push({ x: ms(eta), projection: target });
    }
    return rows;
  }, [series, range, today, eta, target, compact]);

  if (!data.length) return null;
  const values = data.flatMap((r) => [r.kg, r.trend, r.projection]).filter((v): v is number => v != null);
  if (target != null) values.push(target);
  const lo = Math.floor(Math.min(...values) - 0.5);
  const hi = Math.ceil(Math.max(...values) + 0.5);
  const xMin = data[0].x;
  const xMax = Math.max(data.at(-1)!.x, ms(today));

  return (
    <div>
      {compact ? null : (
        <div className="mb-3">
          <Segmented value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
        </div>
      )}
      <div style={{ height: compact ? 90 : 220 }} role="img" aria-label="Gráfico de pesajes con la línea de tendencia">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: compact ? 0 : -12 }}>
            {compact ? null : <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />}
            <XAxis
              dataKey="x"
              type="number"
              domain={[xMin, xMax]}
              hide={compact}
              tickFormatter={(v: number) => formatDateStr(new Date(v).toISOString().slice(0, 10), "d MMM")}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[lo, hi]}
              hide={compact}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => kgFmt.format(v)}
              allowDecimals={false}
            />
            {target != null ? (
              <ReferenceLine
                y={target}
                stroke="var(--success)"
                strokeDasharray="6 5"
                strokeWidth={1.5}
                label={compact ? undefined : { value: `Objetivo ${kgFmt.format(target)}`, position: "insideTopRight", fill: "var(--muted)", fontSize: 12 }}
              />
            ) : null}
            {compact ? null : (
              <Tooltip
                cursor={{ stroke: "var(--line)" }}
                contentStyle={{ background: "var(--surface)", border: "none", borderRadius: 12, boxShadow: "0 6px 20px rgb(0 0 0/0.15)", color: "var(--fg)" }}
                labelFormatter={(v) => formatDateStr(new Date(Number(v)).toISOString().slice(0, 10), "d 'de' MMMM")}
                formatter={(value, name) => [`${kgFmt.format(Number(value))} kg`, name === "kg" ? "Pesaje" : name === "trend" ? "Tendencia" : "Proyección"]}
              />
            )}
            {compact ? null : <Scatter dataKey="kg" fill="var(--muted)" fillOpacity={0.55} isAnimationActive={false} />}
            <Line dataKey="trend" type="monotone" stroke="var(--accent)" strokeWidth={compact ? 2 : 2.5} dot={false} connectNulls isAnimationActive={!compact} />
            {compact ? null : (
              <Line dataKey="projection" stroke="var(--accent)" strokeOpacity={0.6} strokeDasharray="5 5" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
