import { describe, expect, it } from "vitest";
import { addMonthsClamped, localDateStr, startOfWeekMonday, zonedToUtc } from "@/lib/dates";
import { nextOccurrence } from "@/lib/recurrence";
import { bestStreak, currentStreak } from "@/lib/habits";
import { computeTaskTiming, nextHabitReminderAt } from "@/lib/schedule";

describe("fechas y zonas horarias", () => {
  it("convierte hora local a UTC respetando el horario de verano", () => {
    expect(zonedToUtc("2026-07-01", 9 * 60, "Europe/Madrid").toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(zonedToUtc("2026-12-01", 9 * 60, "Europe/Madrid").toISOString()).toBe("2026-12-01T08:00:00.000Z");
  });
  it("calcula el día local", () => {
    const instant = new Date("2026-10-01T23:30:00Z");
    expect(localDateStr(instant, "Europe/Madrid")).toBe("2026-10-02");
    expect(localDateStr(instant, "America/Mexico_City")).toBe("2026-10-01");
  });
  it("suma meses sin desbordar", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-02-28", 1, 31)).toBe("2026-03-31");
  });
  it("lunes de la semana", () => {
    expect(startOfWeekMonday("2026-10-04")).toBe("2026-09-28"); // domingo
    expect(startOfWeekMonday("2026-10-05")).toBe("2026-10-05");
  });
});

describe("repetición de tareas", () => {
  it("diaria completada hoy → mañana", () => {
    expect(nextOccurrence("2026-10-01", "2026-10-01", "DAILY", [])).toBe("2026-10-02");
  });
  it("diaria completada con retraso → no deja atrasadas", () => {
    expect(nextOccurrence("2026-09-25", "2026-10-01", "DAILY", [])).toBe("2026-10-02");
  });
  it("adelantada → la siguiente a su fecha", () => {
    expect(nextOccurrence("2026-10-03", "2026-10-01", "DAILY", [])).toBe("2026-10-04");
  });
  it("días concretos (lunes y jueves)", () => {
    expect(nextOccurrence("2026-10-01", "2026-10-01", "WEEKDAYS", [1, 4])).toBe("2026-10-05");
  });
  it("mensual conserva el día 31", () => {
    expect(nextOccurrence("2026-01-31", "2026-01-31", "MONTHLY", [])).toBe("2026-02-28");
  });
});

describe("rachas de hábitos", () => {
  const done = new Set(["2026-09-28", "2026-09-29", "2026-09-30"]);
  it("no rompe la racha si hoy aún no está hecho", () => {
    expect(currentStreak([], done, "2026-10-01", "2026-01-01")).toBe(3);
  });
  it("se rompe si falta un día programado", () => {
    expect(currentStreak([], done, "2026-10-02", "2026-01-01")).toBe(0);
  });
  it("ignora días no programados", () => {
    // lunes y miércoles; hecho 28 (L) y 30 (X); hoy jueves 1
    expect(currentStreak([1, 3], new Set(["2026-09-28", "2026-09-30"]), "2026-10-01", "2026-01-01")).toBe(2);
  });
  it("mejor racha", () => {
    const d = new Set(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-10"]);
    expect(bestStreak([], d, "2026-10-01", "2026-09-01")).toBe(3);
  });
});

describe("recordatorios", () => {
  it("BEFORE resta minutos a la hora de la tarea", () => {
    const t = computeTaskTiming(
      { dueDate: "2026-10-01", time: 10 * 60, reminderMode: "BEFORE", reminderMinutesBefore: 15 },
      "Europe/Madrid",
    );
    expect(t.remindAt?.toISOString()).toBe("2026-10-01T07:45:00.000Z");
  });
  it("sin fecha no hay recordatorio BEFORE", () => {
    const t = computeTaskTiming({ dueDate: null, time: null, reminderMode: "BEFORE", reminderMinutesBefore: 15 }, "UTC");
    expect(t.reminderMode).toBe("NONE");
    expect(t.remindAt).toBeNull();
  });
  it("hábito: si la hora ya pasó hoy, mañana", () => {
    const now = new Date("2026-10-01T10:00:00Z"); // 12:00 en Madrid
    expect(nextHabitReminderAt([], 9 * 60, "Europe/Madrid", "2026-10-01", now)?.toISOString()).toBe(
      "2026-10-02T07:00:00.000Z",
    );
  });
});
