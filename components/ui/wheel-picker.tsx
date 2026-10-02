"use client";

import { useEffect, useRef } from "react";

const ITEM = 44;
const VISIBLE = 5;

/**
 * Selector tipo rueda (como el de iOS): lista con scroll-snap y la opción
 * central resaltada. También se maneja con las flechas del teclado.
 */
export function WheelPicker<T extends string | number>({
  values,
  value,
  onChange,
  format = (v) => String(v),
  label,
  width = 120,
}: {
  values: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  label: string;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = Math.max(0, values.indexOf(value));

  // Coloca la rueda en el valor actual (también si cambia desde fuera).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ITEM) !== index) el.scrollTop = index * ITEM;
  }, [index]);

  function onScroll() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM)));
      if (values[i] !== value) onChange(values[i]);
    }, 80);
  }

  function step(d: number) {
    const i = Math.max(0, Math.min(values.length - 1, index + d));
    onChange(values[i]);
    ref.current?.scrollTo({ top: i * ITEM, behavior: "smooth" });
  }

  return (
    <div className="relative" style={{ width, height: ITEM * VISIBLE }}>
      {/* Franja de la opción elegida */}
      <div className="pointer-events-none absolute inset-x-0 rounded-xl bg-surface-2" style={{ top: ITEM * 2, height: ITEM }} />
      <div
        ref={ref}
        onScroll={onScroll}
        tabIndex={0}
        role="spinbutton"
        aria-label={label}
        aria-valuetext={format(value)}
        aria-valuenow={typeof value === "number" ? value : index}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            step(-1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            step(1);
          }
        }}
        className="no-scrollbar relative h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          paddingBlock: ITEM * 2,
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        }}
      >
        {values.map((v, i) => (
          <button
            key={String(v)}
            type="button"
            tabIndex={-1}
            onClick={() => step(i - index)}
            className={`flex w-full snap-center items-center justify-center tabular-nums transition-[font-size,color] ${
              i === index ? "text-[24px] font-bold text-fg" : "text-[19px] text-muted"
            }`}
            style={{ height: ITEM }}
          >
            {format(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
