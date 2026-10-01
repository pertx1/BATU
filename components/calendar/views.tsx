import Link from "next/link";
import {
  addDays,
  capitalize,
  formatDateStr,
  minutesToHHMM,
  startOfWeekMonday,
  WEEKDAYS_SHORT,
  WEEK_ORDER,
  type DateStr,
} from "@/lib/dates";
import { eventSpanOnDay } from "@/lib/calendar-format";
import { dayDots, type DayItems } from "@/lib/data/calendar";
import { CompactDay, DayList } from "./day-list";
import { NowLine } from "./now-line";

type Days = Map<DateStr, DayItems>;

function Dots({ colors }: { colors: string[] }) {
  return (
    <span className="flex h-1.5 justify-center gap-0.5">
      {colors.map((c) => (
        <span key={c} className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
      ))}
    </span>
  );
}

function WeekdayHeader() {
  return (
    <div className="grid grid-cols-7 pb-1 text-center text-[12px] font-semibold text-muted">
      {WEEK_ORDER.map((d) => (
        <span key={d}>{WEEKDAYS_SHORT[d]}</span>
      ))}
    </div>
  );
}

function DayCell({
  date,
  href,
  today,
  selected,
  dim,
  dots,
}: {
  date: DateStr;
  href: string;
  today: DateStr;
  selected: boolean;
  dim?: boolean;
  dots: string[];
}) {
  const isToday = date === today;
  return (
    <Link
      href={href}
      scroll={false}
      replace
      className="flex flex-col items-center gap-1 py-1.5"
      aria-label={formatDateStr(date, "EEEE d 'de' MMMM")}
      aria-current={selected ? "date" : undefined}
    >
      <span
        className={`flex size-9 items-center justify-center rounded-full text-[16px] tabular-nums transition ${
          selected
            ? isToday
              ? "bg-accent font-bold text-accent-fg"
              : "bg-fg font-bold text-bg"
            : isToday
              ? "font-bold text-accent"
              : dim
                ? "text-muted/50"
                : ""
        }`}
      >
        {Number(date.slice(8))}
      </span>
      <Dots colors={dots} />
    </Link>
  );
}

export function MonthView({ selected, today, days }: { selected: DateStr; today: DateStr; days: Days }) {
  const month = selected.slice(0, 7);
  const first = startOfWeekMonday(`${month}-01`);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  // Si la última fila es toda del mes siguiente, se oculta.
  const visible = cells.slice(35).every((d) => d.slice(0, 7) !== month) ? cells.slice(0, 35) : cells;
  return (
    <>
      <div className="card mb-5 p-2">
        <WeekdayHeader />
        <div className="grid grid-cols-7">
          {visible.map((d) => (
            <DayCell
              key={d}
              date={d}
              href={`/calendario?v=mes&d=${d}`}
              today={today}
              selected={d === selected}
              dim={d.slice(0, 7) !== month}
              dots={dayDots(days.get(d))}
            />
          ))}
        </div>
      </div>
      <DayList day={selected} items={days.get(selected)} today={today} back={`/calendario?v=mes&d=${selected}`} />
    </>
  );
}

export function WeekView({ selected, today, days }: { selected: DateStr; today: DateStr; days: Days }) {
  const monday = startOfWeekMonday(selected);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <>
      <div className="card mb-5 p-2">
        <WeekdayHeader />
        <div className="grid grid-cols-7">
          {week.map((d) => (
            <DayCell
              key={d}
              date={d}
              href={`/calendario?v=semana&d=${d}`}
              today={today}
              selected={d === selected}
              dots={dayDots(days.get(d))}
            />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        {week.map((d) => (
          <CompactDay key={d} day={d} items={days.get(d)} today={today} back={`/calendario?v=semana&d=${selected}`} />
        ))}
      </div>
    </>
  );
}

const HOUR_PX = 52;

export function DayView({
  selected,
  today,
  days,
  timeZone,
}: {
  selected: DateStr;
  today: DateStr;
  days: Days;
  timeZone: string;
}) {
  const items = days.get(selected) ?? { events: [], tasks: [] };
  const timedEvents = items.events
    .map((e) => ({ e, span: eventSpanOnDay(e, selected) }))
    .filter((x): x is { e: (typeof items.events)[number]; span: [number, number] } => x.span !== null);
  const allDayEvents = items.events.filter((e) => eventSpanOnDay(e, selected) === null);
  const timedTasks = items.tasks.filter((t) => t.time != null);
  const untimed = { events: allDayEvents, tasks: items.tasks.filter((t) => t.time == null) };

  // Reparto en columnas de los eventos que se solapan.
  const sorted = [...timedEvents].sort((a, b) => a.span[0] - b.span[0]);
  const columnEnds: number[] = [];
  const placed = sorted.map((x) => {
    let col = columnEnds.findIndex((end) => end <= x.span[0]);
    if (col === -1) col = columnEnds.push(0) - 1;
    columnEnds[col] = x.span[1];
    return { ...x, col };
  });
  const cols = Math.max(1, columnEnds.length);

  return (
    <>
      <h2 className="mb-3 px-1 text-lg font-bold">
        {selected === today ? "Hoy · " : ""}
        {capitalize(formatDateStr(selected, "EEEE d 'de' MMMM"))}
      </h2>
      <DayList day={selected} items={untimed} today={today} back={`/calendario?v=dia&d=${selected}`} title={false} />
      <div className="card relative mt-5 overflow-hidden">
        <div className="relative" style={{ height: HOUR_PX * 24 }}>
          {selected === today ? <NowLine hourPx={HOUR_PX} timeZone={timeZone} /> : null}
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute inset-x-0 border-t border-line" style={{ top: h * HOUR_PX }}>
              <span className="absolute left-2 -top-2.5 bg-surface px-1 text-[11px] tabular-nums text-muted">
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            </div>
          ))}
          <div className="absolute inset-y-0 left-14 right-2">
            {placed.map(({ e, span, col }) => (
              <Link
                key={e.id}
                href={`/calendario/evento/${e.id}`}
                className="absolute overflow-hidden rounded-lg px-2 py-1 text-[13px] leading-tight text-white shadow-sm"
                style={{
                  top: (span[0] / 60) * HOUR_PX + 1,
                  height: Math.max(((span[1] - span[0]) / 60) * HOUR_PX - 2, 22),
                  left: `${(col / cols) * 100}%`,
                  width: `calc(${100 / cols}% - 4px)`,
                  backgroundColor: e.project?.color ?? "var(--accent)",
                }}
              >
                <span className="font-semibold">{e.title}</span>
                <span className="block opacity-90">
                  {minutesToHHMM(span[0])}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </Link>
            ))}
            {timedTasks.map((t) => (
              <Link
                key={t.id}
                href={`/tareas/${t.id}`}
                className={`absolute right-0 flex h-6 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[12px] shadow-sm ${
                  t.completedAt ? "text-muted line-through" : ""
                }`}
                style={{ top: (t.time! / 60) * HOUR_PX - 12, maxWidth: "60%" }}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: t.project?.color ?? "var(--muted)" }} />
                <span className="truncate">
                  {minutesToHHMM(t.time!)} {t.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
