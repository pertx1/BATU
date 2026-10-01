import Link from "next/link";
import { CalendarPlus, ListPlus, Plus } from "lucide-react";
import { capitalize, formatDateStr, type DateStr } from "@/lib/dates";
import type { DayItems } from "@/lib/data/calendar";
import { TaskList } from "@/components/tasks/task-item";
import { EventRow } from "./event-row";

/** Lista de un día con botones para añadir tarea o evento con esa fecha. */
export function DayList({
  day,
  items,
  today,
  back,
  title = true,
}: {
  day: DateStr;
  items: DayItems | undefined;
  today: DateStr;
  back: string;
  title?: boolean;
}) {
  const events = items?.events ?? [];
  const tasks = items?.tasks ?? [];
  const backParam = encodeURIComponent(back);
  return (
    <section className="animate-fade-up">
      {title ? (
        <h2 className="mb-3 px-1 text-lg font-bold">
          {day === today ? "Hoy · " : ""}
          {capitalize(formatDateStr(day, "EEEE d 'de' MMMM"))}
        </h2>
      ) : null}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Link href={`/tareas/nueva?date=${day}&back=${backParam}`} className="btn btn-secondary">
          <ListPlus size={20} /> Tarea
        </Link>
        <Link href={`/calendario/evento/nuevo?date=${day}&back=${backParam}`} className="btn btn-secondary">
          <CalendarPlus size={20} /> Evento
        </Link>
      </div>
      {events.length === 0 && tasks.length === 0 ? (
        <p className="card px-4 py-6 text-center text-muted">Nada planificado este día.</p>
      ) : (
        <div className="space-y-3">
          {events.length ? (
            <ul className="card divide-y divide-line overflow-hidden">
              {events.map((e) => (
                <li key={e.id}>
                  <EventRow event={e} day={day} />
                </li>
              ))}
            </ul>
          ) : null}
          {tasks.length ? <TaskList tasks={tasks} today={today} showDate={false} overdue={false} /> : null}
        </div>
      )}
    </section>
  );
}

/** Día compacto para la vista semanal: cabecera con "+" y sus elementos. */
export function CompactDay({
  day,
  items,
  today,
  back,
}: {
  day: DateStr;
  items: DayItems | undefined;
  today: DateStr;
  back: string;
}) {
  const events = items?.events ?? [];
  const tasks = items?.tasks ?? [];
  const backParam = encodeURIComponent(back);
  const isToday = day === today;
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <h2 className={`flex-1 text-[15px] font-bold ${isToday ? "text-accent" : ""} ${day < today ? "text-muted" : ""}`}>
          {isToday ? "Hoy · " : ""}
          {capitalize(formatDateStr(day, "EEEE d"))}
        </h2>
        <Link
          href={`/tareas/nueva?date=${day}&back=${backParam}`}
          className="flex h-8 items-center gap-1 rounded-full bg-surface-2 px-3 text-[13px] font-semibold"
          aria-label={`Añadir tarea el ${formatDateStr(day, "EEEE d")}`}
        >
          <Plus size={14} /> Tarea
        </Link>
        <Link
          href={`/calendario/evento/nuevo?date=${day}&back=${backParam}`}
          className="flex h-8 items-center gap-1 rounded-full bg-surface-2 px-3 text-[13px] font-semibold"
          aria-label={`Añadir evento el ${formatDateStr(day, "EEEE d")}`}
        >
          <Plus size={14} /> Evento
        </Link>
      </div>
      {events.length === 0 && tasks.length === 0 ? (
        <p className="px-1 text-sm text-muted">Sin planes</p>
      ) : (
        <div className="space-y-2">
          {events.length ? (
            <ul className="card divide-y divide-line overflow-hidden">
              {events.map((e) => (
                <li key={e.id}>
                  <EventRow event={e} day={day} />
                </li>
              ))}
            </ul>
          ) : null}
          {tasks.length ? <TaskList tasks={tasks} today={today} showDate={false} overdue={false} /> : null}
        </div>
      )}
    </section>
  );
}
