"use client";

import { Check } from "lucide-react";
import { PROJECT_COLORS } from "@/lib/types";
import { WEEKDAYS_SHORT, WEEK_ORDER } from "@/lib/dates";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-lg px-2 text-[15px] font-semibold transition ${
            value === o.value ? "bg-surface text-fg shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CheckCircle({
  checked,
  onToggle,
  color,
  label,
  size = 26,
}: {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  label: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="-m-2 flex shrink-0 items-center justify-center p-2"
    >
      <span
        className={`flex items-center justify-center rounded-full border-2 transition-colors ${
          checked ? "animate-pop border-transparent text-white" : "border-current"
        }`}
        style={{
          width: size,
          height: size,
          color: checked ? undefined : color ?? "var(--muted)",
          backgroundColor: checked ? color ?? "var(--success)" : undefined,
        }}
      >
        {checked ? <Check size={size * 0.62} strokeWidth={3.2} /> : null}
      </span>
    </button>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {PROJECT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={`size-9 rounded-full transition ${value === c ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : ""}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="flex justify-between gap-1.5">
      {WEEK_ORDER.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
            className={`size-10 rounded-full text-[15px] font-semibold transition ${
              on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
            }`}
          >
            {WEEKDAYS_SHORT[d]}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center animate-fade-up">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text ? <p className="mt-1 text-sm text-muted">{text}</p> : null}
    </div>
  );
}

export function SectionTitle({ children, tone }: { children: React.ReactNode; tone?: "danger" }) {
  return (
    <h2 className={`mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide ${tone === "danger" ? "text-danger" : "text-muted"}`}>
      {children}
    </h2>
  );
}
