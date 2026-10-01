import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  addDays,
  addMonthsClamped,
  capitalize,
  formatDateStr,
  isDateStr,
  startOfWeekMonday,
  todayStr,
  type DateStr,
} from "@/lib/dates";
import { getCalendarRange } from "@/lib/data/calendar";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { DayView, MonthView, WeekView } from "@/components/calendar/views";

export const metadata: Metadata = { title: "Calendario" };

type View = "mes" | "semana" | "dia";

function range(view: View, d: DateStr): [DateStr, DateStr] {
  if (view === "dia") return [d, d];
  if (view === "semana") {
    const monday = startOfWeekMonday(d);
    return [monday, addDays(monday, 6)];
  }
  const first = startOfWeekMonday(`${d.slice(0, 7)}-01`);
  return [first, addDays(first, 41)];
}

function shift(view: View, d: DateStr, dir: 1 | -1): DateStr {
  if (view === "dia") return addDays(d, dir);
  if (view === "semana") return addDays(d, 7 * dir);
  return addMonthsClamped(`${d.slice(0, 7)}-01`, dir);
}

function title(view: View, d: DateStr): string {
  if (view === "dia") return capitalize(formatDateStr(d, "MMMM yyyy"));
  if (view === "semana") {
    const monday = startOfWeekMonday(d);
    const sunday = addDays(monday, 6);
    return monday.slice(0, 7) === sunday.slice(0, 7)
      ? capitalize(formatDateStr(monday, "MMMM yyyy"))
      : `${capitalize(formatDateStr(monday, "MMM"))} – ${formatDateStr(sunday, "MMM yyyy")}`;
  }
  return capitalize(formatDateStr(d, "MMMM yyyy"));
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const today = todayStr(user.timezone);
  const view: View = sp.v === "semana" || sp.v === "dia" ? sp.v : "mes";
  const selected = isDateStr(sp.d) ? sp.d : today;
  const [from, to] = range(view, selected);
  const days = await getCalendarRange(user.id, user.timezone, from, to);

  const nav = (target: DateStr, v: View = view) => `/calendario?v=${v}&d=${target}`;

  return (
    <>
      <PageHeader
        title={title(view, selected)}
        right={
          <>
            <Link href={nav(shift(view, selected, -1))} replace scroll={false} aria-label="Anterior" className="flex size-10 items-center justify-center rounded-full bg-surface-2">
              <ChevronLeft size={22} />
            </Link>
            <Link href={nav(today)} replace scroll={false} className="flex h-10 items-center rounded-full bg-surface-2 px-3.5 text-[15px] font-semibold">
              Hoy
            </Link>
            <Link href={nav(shift(view, selected, 1))} replace scroll={false} aria-label="Siguiente" className="flex size-10 items-center justify-center rounded-full bg-surface-2">
              <ChevronRight size={22} />
            </Link>
          </>
        }
      />
      <div className="mx-auto max-w-xl px-5 pb-3">
        <div className="flex rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Vista">
          {(
            [
              ["mes", "Mes"],
              ["semana", "Semana"],
              ["dia", "Día"],
            ] as const
          ).map(([v, label]) => (
            <Link
              key={v}
              href={nav(selected, v)}
              replace
              scroll={false}
              role="tab"
              aria-selected={view === v}
              className={`flex min-h-10 flex-1 items-center justify-center rounded-lg text-[15px] font-semibold transition ${
                view === v ? "bg-surface text-fg shadow-sm" : "text-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <PageBody>
        {view === "mes" ? <MonthView selected={selected} today={today} days={days} /> : null}
        {view === "semana" ? <WeekView selected={selected} today={today} days={days} /> : null}
        {view === "dia" ? <DayView selected={selected} today={today} days={days} timeZone={user.timezone} /> : null}
      </PageBody>
    </>
  );
}
