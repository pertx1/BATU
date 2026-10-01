import { capitalize, localDateStr, localMinutes, minutesToHHMM, relativeDayLabel, type DateStr } from "@/lib/dates";

/** Lo que recibe el service worker (public/sw.js). */
export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  badgeCount?: number;
  timestamp?: number;
};

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "a, b y c" */
export function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

function dayLabel(day: DateStr, today: DateStr): string {
  return capitalize(relativeDayLabel(day, today));
}

function whenLabel(day: DateStr | null, minutes: number | null, today: DateStr): string | null {
  if (!day) return null;
  const d = dayLabel(day, today);
  return minutes != null ? `${d} a las ${minutesToHHMM(minutes)}` : d;
}

export function taskMessage(
  task: { id: string; title: string; dueDate: DateStr | null; dueAt: Date | null },
  timeZone: string,
  today: DateStr,
): PushPayload {
  const when = whenLabel(task.dueDate, task.dueAt ? localMinutes(task.dueAt, timeZone) : null, today);
  return {
    title: task.title,
    body: when ? `Tarea · ${when}` : "Recordatorio de tarea",
    url: `/tareas/${task.id}`,
    tag: `task:${task.id}`,
  };
}

export function eventMessage(
  event: { id: string; title: string; allDay: boolean; startDate: DateStr; startAt: Date | null; location: string | null },
  timeZone: string,
  today: DateStr,
): PushPayload {
  const day = event.startAt ? localDateStr(event.startAt, timeZone) : event.startDate;
  const when = event.allDay
    ? `${dayLabel(day, today)} · todo el día`
    : whenLabel(day, event.startAt ? localMinutes(event.startAt, timeZone) : null, today);
  return {
    title: event.title,
    body: [when, event.location].filter(Boolean).join(" · "),
    url: `/calendario/evento/${event.id}`,
    tag: `event:${event.id}`,
  };
}

export function habitMessage(habit: { id: string; name: string; emoji: string | null }): PushPayload {
  return {
    title: `${habit.emoji ? `${habit.emoji} ` : ""}${habit.name}`,
    body: "¿Ya lo has hecho hoy? Márcalo en Antola.",
    url: "/",
    tag: `habit:${habit.id}`,
  };
}

export function morningMessage(
  name: string | null,
  counts: { tasks: number; habits: number; events: number },
  topTask: string | null,
): PushPayload {
  const parts = [
    counts.tasks ? plural(counts.tasks, "tarea", "tareas") : null,
    counts.habits ? plural(counts.habits, "hábito", "hábitos") : null,
    counts.events ? plural(counts.events, "evento", "eventos") : null,
  ].filter((p): p is string => !!p);
  let body = parts.length ? `Hoy tienes ${joinList(parts)}.` : "Hoy no tienes nada planificado.";
  if (topTask) body += `\nLo más importante: ${topTask}`;
  return {
    title: name ? `Buenos días, ${name}` : "Buenos días",
    body,
    url: "/",
    tag: "morning",
  };
}

export function eveningMessage(pending: number): PushPayload {
  return {
    title: "Repaso de la noche",
    body: `Te ${pending === 1 ? "queda 1 cosa" : `quedan ${pending} cosas`} por hacer hoy.`,
    url: "/",
    tag: "evening",
  };
}

export function overdueMessage(count: number): PushPayload {
  return {
    title: "Tareas atrasadas",
    body: `Tienes ${plural(count, "tarea atrasada", "tareas atrasadas")}. Reprográmalas o márcalas como hechas.`,
    url: "/",
    tag: "overdue",
  };
}

export function weeklyMessage(): PushPayload {
  return {
    title: "Revisión semanal",
    body: "Tómate 5 minutos para repasar tu semana y planificar la siguiente.",
    url: "/revision",
    tag: "weekly",
  };
}

export function testMessage(): PushPayload {
  return {
    title: "Antola",
    body: "¡Las notificaciones funcionan! 🎉",
    url: "/ajustes",
    tag: "test",
  };
}
