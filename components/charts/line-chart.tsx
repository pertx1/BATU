"use client";

import { useState } from "react";
import { niceTicks } from "@/components/charts/scale";
import { formatDateStr } from "@/lib/dates";
import { formatNumber } from "@/lib/goals";

export type LinePoint = { date: string; value: number }; // date = "YYYY-MM-DD"

const W = 340;
const H = 150;
const PAD_TOP = 12;
const AXIS_W = 40;
const AXIS_H = 22;
const PAD_RIGHT = 10;

const dayMs = (d: string) => Date.parse(d + "T00:00:00Z");

/**
 * Evolución de un valor en el tiempo (una sola serie). Línea de 2px, lavado
 * de área al 10%, punto final con anillo y la meta como referencia. Al tocar
 * o pasar el ratón se marca el registro más cercano.
 */
export function LineChart({
  points,
  target,
  unit,
  caption,
}: {
  points: LinePoint[];
  target: number | null;
  unit: string | null;
  caption: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const format = (n: number) => `${formatNumber(n)}${unit ? ` ${unit}` : ""}`;
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const lo = Math.min(...values, ...(target != null ? [target] : []));
  const hi = Math.max(...values, ...(target != null ? [target] : []));
  const integer = values.every(Number.isInteger) && (target == null || Number.isInteger(target));
  const ticks = niceTicks(hi, lo >= 0 && lo < (hi - lo) * 0.5 ? 0 : lo, integer);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const t0 = dayMs(points[0].date);
  const t1 = dayMs(points[points.length - 1].date);
  const plotW = W - AXIS_W - PAD_RIGHT;
  const x = (d: string) => (t1 === t0 ? AXIS_W + plotW / 2 : AXIS_W + ((dayMs(d) - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD_TOP + H - ((v - yMin) / (yMax - yMin || 1)) * H;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.date)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(points[points.length - 1].date)},${PAD_TOP + H} L${x(points[0].date)},${PAD_TOP + H} Z`;
  const last = points[points.length - 1];
  const shown = active ?? null;

  function nearest(clientX: number, rect: DOMRect) {
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
    });
    return best;
  }

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${PAD_TOP + H + AXIS_H}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={caption}
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerDown={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={AXIS_W} x2={W - PAD_RIGHT} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={AXIS_W - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] tabular-nums">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {target != null ? (
          <g>
            <line x1={AXIS_W} x2={W - PAD_RIGHT} y1={y(target)} y2={y(target)} stroke="var(--success)" strokeWidth={1.5} />
            <text x={W - PAD_RIGHT} y={y(target) - 5} textAnchor="end" className="fill-muted text-[10px] font-semibold">
              Meta
            </text>
          </g>
        ) : null}
        <path d={area} fill="var(--accent)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {shown !== null ? (
          <line
            x1={x(points[shown].date)}
            x2={x(points[shown].date)}
            y1={PAD_TOP}
            y2={PAD_TOP + H}
            stroke="var(--muted)"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ) : null}
        {(shown !== null ? [points[shown]] : [last]).map((p) => (
          <circle key={p.date + p.value} cx={x(p.date)} cy={y(p.value)} r={4.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        <text x={AXIS_W} y={PAD_TOP + H + 15} className="fill-muted text-[10px]">
          {formatDateStr(points[0].date, "d MMM")}
        </text>
        {points.length > 1 ? (
          <text x={W - PAD_RIGHT} y={PAD_TOP + H + 15} textAnchor="end" className="fill-muted text-[10px]">
            {formatDateStr(last.date, "d MMM")}
          </text>
        ) : null}
      </svg>
      <figcaption className="mt-1 h-5 text-center text-sm text-muted" aria-live="polite">
        {shown !== null
          ? `${formatDateStr(points[shown].date, "d 'de' MMMM")} · ${format(points[shown].value)}`
          : `Último: ${format(last.value)}`}
      </figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{formatDateStr(p.date, "d 'de' MMMM yyyy")}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
