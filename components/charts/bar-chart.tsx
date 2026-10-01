"use client";

import { useState } from "react";
import { niceTicks } from "@/components/charts/scale";

export type BarDatum = { key: string; label: string; tick: string; value: number };

const H = 160; // alto del área de dibujo
const PAD_TOP = 22; // sitio para el valor encima de la barra seleccionada
const AXIS_W = 28;
const AXIS_H = 22;

/**
 * Columnas de una sola serie (p. ej. tareas completadas por día). Toque o
 * ratón sobre una columna → muestra su valor. Incluye una tabla accesible.
 */
export function BarChart({
  data,
  unitOne,
  unitMany,
  caption,
  tickEvery = 1,
}: {
  data: BarDatum[];
  unitOne: string;
  unitMany: string;
  caption: string;
  tickEvery?: number;
}) {
  const unit = (n: number) => `${n} ${n === 1 ? unitOne : unitMany}`;
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const W = 340;
  const plotW = W - AXIS_W;
  const slot = plotW / data.length;
  const barW = Math.min(24, slot - 2); // 2px de aire entre columnas como mínimo
  const y = (v: number) => PAD_TOP + H - (v / top) * H;
  const shown = active ?? null;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${PAD_TOP + H + AXIS_H}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={caption}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={AXIS_W} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={AXIS_W - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] tabular-nums">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = AXIS_W + slot * i + slot / 2;
          const h = d.value > 0 ? Math.max(3, (d.value / top) * H) : 0;
          const r = Math.min(4, barW / 2, h);
          const x0 = cx - barW / 2;
          const yTop = PAD_TOP + H - h;
          const isActive = shown === i;
          return (
            <g key={d.key}>
              {h > 0 ? (
                <path
                  // Extremo de datos redondeado (4px), base recta sobre el eje.
                  d={`M${x0},${PAD_TOP + H} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${PAD_TOP + H} Z`}
                  fill="var(--accent)"
                  opacity={shown === null || isActive ? 1 : 0.45}
                />
              ) : null}
              {isActive ? (
                <text x={cx} y={yTop - 6} textAnchor="middle" className="fill-fg text-[11px] font-semibold tabular-nums">
                  {d.value}
                </text>
              ) : null}
              {(data.length - 1 - i) % tickEvery === 0 ? (
                <text
                  // La última etiqueta se alinea a la derecha para que no se corte.
                  x={i === data.length - 1 && data.length > 7 ? Math.min(cx + barW / 2, W) : cx}
                  y={PAD_TOP + H + 15}
                  textAnchor={i === data.length - 1 && data.length > 7 ? "end" : "middle"}
                  className="fill-muted text-[10px]"
                >
                  {d.tick}
                </text>
              ) : null}
              {/* Zona táctil: toda la franja de la columna, más grande que la marca. */}
              <rect
                x={AXIS_W + slot * i}
                y={0}
                width={slot}
                height={PAD_TOP + H + AXIS_H}
                fill="transparent"
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                onPointerDown={() => setActive(i)}
              >
                <title>{`${d.label}: ${unit(d.value)}`}</title>
              </rect>
            </g>
          );
        })}
        <line x1={AXIS_W} x2={W} y1={PAD_TOP + H} y2={PAD_TOP + H} stroke="var(--muted)" strokeOpacity={0.4} strokeWidth={1} />
      </svg>
      <figcaption className="mt-1 h-5 text-center text-sm text-muted" aria-live="polite">
        {shown !== null ? `${data[shown].label} · ${unit(data[shown].value)}` : ""}
      </figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{unit(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
