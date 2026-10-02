import type { Priority } from "@prisma/client";
import type { DateStr } from "@/lib/dates";

/** Puntos de cada acción. Solo los usa el servidor. */
export const XP = {
  task: { LOW: 5, MEDIUM: 10, HIGH: 20 } as Record<Priority, number>,
  habit: 5,
  dayComplete: 25,
  review: 50,
  milestone: 50,
  goal: 200,
} as const;

/**
 * XP de Comida. Premian registrar y cuidarse (comidas apuntadas, agua,
 * proteína, escucharse), nunca comer poco ni bajar rápido. Nunca se restan.
 */
export const FOOD_XP = {
  mealsDay: 10, // al menos 3 comidas registradas en el día
  water: 10, // objetivo de agua
  protein: 10, // objetivo de proteína
  hunger: 2, // hambre antes y saciedad después de una comida
  weighIn: 5, // pesarse (una vez por semana)
} as const;
export const MEALS_FOR_XP = 3;
export const MAX_HUNGER_XP_PER_DAY = 3;

/**
 * Solo dan XP los registros de hoy o de ayer (anti-trampas: apuntar días
 * antiguos no suma). Se puede seguir apuntando cualquier día, sin XP.
 */
export function foodXpDay(day: DateStr, today: DateStr, yesterday: DateStr): boolean {
  return day === today || day === yesterday;
}

/** Menos de esto entre crear y completar una tarea = 1 XP (anti-trampas). */
export const QUICK_TASK_MS = 2 * 60 * 1000;
export const QUICK_TASK_XP = 1;

/** 1 miga por cada 10 XP. */
export const XP_PER_CRUMB = 10;

/** Protectores de racha que se pueden guardar a la vez. */
export const MAX_SHIELDS = 2;

/**
 * XP de una tarea completada.
 * - Creada y completada en menos de 2 minutos: 1 XP.
 * - Completada después de su fecha (otro día local): la mitad.
 */
export function taskXp(input: {
  priority: Priority;
  createdAt: Date;
  completedAt: Date;
  dueDate: DateStr | null;
  completedDay: DateStr; // día local en que se completó
}): number {
  if (input.completedAt.getTime() - input.createdAt.getTime() < QUICK_TASK_MS) return QUICK_TASK_XP;
  const base = XP.task[input.priority];
  if (input.dueDate && input.completedDay > input.dueDate) return Math.ceil(base / 2);
  return base;
}

/** Migas que da pasar de `before` a `after` XP (negativo si se restan). */
export function crumbsForXp(before: number, after: number): number {
  return Math.floor(Math.max(0, after) / XP_PER_CRUMB) - Math.floor(Math.max(0, before) / XP_PER_CRUMB);
}

/**
 * ¿Es productivo un día? Todos los hábitos que tocaban (si tocaba alguno) o al
 * menos 3 tareas completadas ese día.
 */
export function isProductiveDay(input: { habitsScheduled: number; habitsDone: number; tasksCompleted: number }): boolean {
  if (input.tasksCompleted >= 3) return true;
  return input.habitsScheduled > 0 && input.habitsDone >= input.habitsScheduled;
}

/** ¿Está completo el día (tareas de hoy + hábitos de hoy, al menos una cosa)? */
export function isDayComplete(input: { tasksTotal: number; tasksDone: number; habitsScheduled: number; habitsDone: number }): boolean {
  const total = input.tasksTotal + input.habitsScheduled;
  return total > 0 && input.tasksDone >= input.tasksTotal && input.habitsDone >= input.habitsScheduled;
}

/**
 * Cierre de días: avanza la racha día a día. Un día no productivo con la
 * racha en marcha gasta un protector si lo hay; si no, la racha vuelve a 0.
 */
export function closeStreak(
  state: { current: number; best: number; shields: number },
  days: boolean[],
): { current: number; best: number; shields: number; shieldUsed: boolean[] } {
  let { current, best, shields } = state;
  const shieldUsed: boolean[] = [];
  for (const productive of days) {
    if (productive) {
      current++;
      best = Math.max(best, current);
      shieldUsed.push(false);
    } else if (current > 0 && shields > 0) {
      shields--;
      shieldUsed.push(true);
    } else {
      current = 0;
      shieldUsed.push(false);
    }
  }
  return { current, best, shields, shieldUsed };
}
