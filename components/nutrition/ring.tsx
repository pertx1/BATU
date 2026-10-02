"use client";

import { useEffect, useState } from "react";

/**
 * Anillo de progreso circular: grueso, con el fondo en gris, extremos
 * redondeados, animación al cargar y un icono dentro de un círculo en el
 * centro. `value` va de 0 a 1 (por encima de 1 se dibuja lleno).
 */
export function Ring({
  value,
  size = 76,
  stroke = 9,
  color,
  icon,
  label,
  animate = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  icon?: React.ReactNode;
  label?: string;
  animate?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const [shown, setShown] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) return setShown(target);
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target, animate]);
  const inner = Math.round(size * 0.42);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.2, 1)", opacity: shown > 0 ? 1 : 0 }}
        />
      </svg>
      {icon ? (
        <span className="relative flex items-center justify-center rounded-full bg-surface-2" style={{ width: inner, height: inner, color }}>
          {icon}
        </span>
      ) : null}
    </div>
  );
}
