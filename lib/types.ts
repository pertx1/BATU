// Tipos que viajan del servidor a los componentes cliente (sin Date).
import type { DateStr } from "@/lib/dates";

export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type Recurrence = "NONE" | "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY";
export type ReminderMode = "NONE" | "AT_TIME" | "BEFORE";

export type ProjectView = { id: string; name: string; color: string; emoji: string | null };

export type SubtaskView = { id: string; title: string; done: boolean };

export type TaskView = {
  id: string;
  title: string;
  notes: string | null;
  priority: Priority;
  dueDate: DateStr | null;
  time: number | null; // minutos locales
  project: ProjectView | null;
  goalId: string | null;
  completedAt: string | null;
  recurrence: Recurrence;
  recurrenceDays: number[];
  reminderMode: ReminderMode;
  reminderDate: DateStr | null;
  reminderTime: number | null;
  reminderMinutesBefore: number | null;
  subtasks: SubtaskView[];
};

export type HabitView = {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  daysOfWeek: number[];
  reminderTime: number | null;
  doneToday: boolean;
  scheduledToday: boolean;
  currentStreak: number;
  bestStreak: number;
  since: DateStr; // primer día con datos (creación o primer registro)
};

export const PRIORITY_LABEL: Record<Priority, string> = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };

export const PROJECT_COLORS = [
  "#5b4cf0",
  "#2f80ed",
  "#14a3b8",
  "#2fa36b",
  "#8bbf2a",
  "#e0a516",
  "#f2711c",
  "#e5484d",
  "#e04e9b",
  "#8e5cd9",
  "#7a7a8c",
];
