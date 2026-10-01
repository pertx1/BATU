"use client";

import { Check } from "lucide-react";
import { PROJECT_COLORS } from "@/lib/types";
import { WEEKDAYS_SHORT, WEEK_ORDER } from "@/lib/dates";
import { Antola } from "@/components/antola/antola";
import { useGamification } from "@/components/antola/gamification-provider";

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
    <div className="flex rounded-full bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-10 flex-1 rounded-full px-2 text-[15px] font-semibold transition ${
            value === o.value ? "bg-segment text-fg shadow-[0_3px_8px_rgb(0_0_0/0.12)]" : "text-muted"
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
  const { enabled, look } = useGamification();
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center animate-fade-up">
      {enabled ? (
        // Con la gamificación activa, Antola acompaña los estados vacíos.
        <div className="mb-2">
          <Antola expression="saludando" stage={look.stage} accessories={look.accessories} size={96} />
        </div>
      ) : (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      )}
      <p className="font-semibold">{title}</p>
      {text ? <p className="mt-1 text-sm text-muted">{text}</p> : null}
    </div>
  );
}

export function SectionTitle({ children, tone }: { children: React.ReactNode; tone?: "danger" }) {
  return (
    <h2 className={`mb-1.5 mt-7 px-4 text-[13px] uppercase ${tone === "danger" ? "font-semibold text-danger" : "text-muted"}`}>
      {children}
    </h2>
  );
}

/** Interruptor tipo iOS. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? "bg-switch" : "bg-surface-2"
      }`}
    >
      <span
        className={`absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
