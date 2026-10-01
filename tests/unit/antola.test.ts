import { describe, expect, it } from "vitest";
import { levelFromXp, levelProgress, levelTitle, stageForLevel, unlocksAtLevel, xpForLevel } from "@/lib/antola/levels";
import { closeStreak, crumbsForXp, isDayComplete, isProductiveDay, taskXp } from "@/lib/antola/xp";
import { MESSAGES, pickMessage, renderMessage, variantsFor, type Situation } from "@/lib/antola/messages";
import { candidateChallenges, pickChallenges } from "@/lib/antola/challenges";
import { ACHIEVEMENTS } from "@/lib/antola/achievements";
import { SHOP } from "@/lib/antola/shop";

describe("niveles", () => {
  it("curva round(100·(n−1)^1,5) acumulada", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(5)).toBe(800);
    expect(xpForLevel(30)).toBe(Math.round(100 * 29 ** 1.5));
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(799)).toBe(4);
    expect(levelFromXp(800)).toBe(5);
  });
  it("progreso dentro del nivel", () => {
    const p = levelProgress(150);
    expect(p.level).toBe(2);
    expect(p.into).toBe(50);
    expect(p.to).toBe(283);
  });
  it("fases, títulos y desbloqueos", () => {
    expect([1, 4, 5, 14, 15, 29, 30].map(stageForLevel)).toEqual(["pequena", "pequena", "exploradora", "exploradora", "experta", "experta", "reina"]);
    expect(levelTitle(1)).toBe("Novata");
    expect(levelTitle(30)).toBe("Leyenda");
    expect(unlocksAtLevel(5)).toContain("Antola exploradora");
    expect(unlocksAtLevel(3)).toEqual([]);
  });
});

describe("XP", () => {
  const created = new Date("2026-10-01T08:00:00Z");
  const later = new Date("2026-10-01T10:00:00Z");
  it("por prioridad, a tiempo", () => {
    expect(taskXp({ priority: "LOW", createdAt: created, completedAt: later, dueDate: "2026-10-01", completedDay: "2026-10-01" })).toBe(5);
    expect(taskXp({ priority: "MEDIUM", createdAt: created, completedAt: later, dueDate: null, completedDay: "2026-10-01" })).toBe(10);
    expect(taskXp({ priority: "HIGH", createdAt: created, completedAt: later, dueDate: "2026-10-02", completedDay: "2026-10-01" })).toBe(20);
  });
  it("tarde: la mitad", () => {
    expect(taskXp({ priority: "HIGH", createdAt: created, completedAt: later, dueDate: "2026-09-30", completedDay: "2026-10-01" })).toBe(10);
    expect(taskXp({ priority: "LOW", createdAt: created, completedAt: later, dueDate: "2026-09-30", completedDay: "2026-10-01" })).toBe(3);
  });
  it("creada y completada en menos de 2 minutos: 1 XP", () => {
    const quick = new Date(created.getTime() + 90_000);
    expect(taskXp({ priority: "HIGH", createdAt: created, completedAt: quick, dueDate: null, completedDay: "2026-10-01" })).toBe(1);
  });
  it("migas: 1 por cada 10 XP, también al restar", () => {
    expect(crumbsForXp(0, 9)).toBe(0);
    expect(crumbsForXp(9, 10)).toBe(1);
    expect(crumbsForXp(25, 45)).toBe(2);
    expect(crumbsForXp(45, 25)).toBe(-2);
  });
  it("día productivo y día completo", () => {
    expect(isProductiveDay({ habitsScheduled: 0, habitsDone: 0, tasksCompleted: 3 })).toBe(true);
    expect(isProductiveDay({ habitsScheduled: 0, habitsDone: 0, tasksCompleted: 2 })).toBe(false);
    expect(isProductiveDay({ habitsScheduled: 2, habitsDone: 2, tasksCompleted: 0 })).toBe(true);
    expect(isProductiveDay({ habitsScheduled: 2, habitsDone: 1, tasksCompleted: 0 })).toBe(false);
    expect(isDayComplete({ tasksTotal: 0, tasksDone: 0, habitsScheduled: 0, habitsDone: 0 })).toBe(false);
    expect(isDayComplete({ tasksTotal: 2, tasksDone: 2, habitsScheduled: 1, habitsDone: 1 })).toBe(true);
  });
  it("rachas con protectores", () => {
    expect(closeStreak({ current: 0, best: 0, shields: 0 }, [true, true, false, true])).toMatchObject({ current: 1, best: 2 });
    const r = closeStreak({ current: 5, best: 5, shields: 1 }, [false, true, false]);
    expect(r).toMatchObject({ current: 0, best: 6, shields: 0 });
    expect(r.shieldUsed).toEqual([true, false, false]);
    // Sin racha no se gasta protector.
    expect(closeStreak({ current: 0, best: 3, shields: 2 }, [false]).shields).toBe(2);
  });
});

describe("mensajes de Antola", () => {
  it("todas las situaciones tienen variantes para los dos tonos", () => {
    for (const s of Object.keys(MESSAGES) as Situation[]) {
      expect(variantsFor(s, "LIVELY").length, s).toBeGreaterThan(0);
      expect(variantsFor(s, "CALM").length, s).toBeGreaterThan(0);
    }
  });
  it("ids únicos", () => {
    const ids = Object.values(MESSAGES).flat().map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("no repite los recientes si hay alternativa", () => {
    const all = variantsFor("toque", "LIVELY").map((m) => m.id);
    const recent = all.slice(0, all.length - 1);
    for (let i = 0; i < 20; i++) expect(pickMessage("toque", "LIVELY", recent).id).toBe(all[all.length - 1]);
  });
  it("variables y nombre opcional", () => {
    expect(renderMessage("¡Buenos días, {nombre}! Hoy tienes {tareas}.", { nombre: "Ana", tareas: "3 tareas" })).toBe("¡Buenos días, Ana! Hoy tienes 3 tareas.");
    expect(renderMessage("¡Buenos días, {nombre}! Hoy tienes {tareas}.", { tareas: "1 tarea" })).toBe("¡Buenos días! Hoy tienes 1 tarea.");
    expect(renderMessage("{nombre} hola", {})).toBe("hola");
  });
});

describe("retos semanales", () => {
  const activity = { tasksPerWeek: 10, highPerWeek: 2, earlyPerWeek: 3, productivePerWeek: 4, activeHabits: 2, topProject: { id: "p1", name: "Trabajo", pending: 5 } };
  it("tres retos distintos, estables para la misma semana", () => {
    const a = pickChallenges(activity, "u1:2026-09-28");
    expect(a).toHaveLength(3);
    expect(new Set(a.map((c) => c.kind)).size).toBe(3);
    expect(pickChallenges(activity, "u1:2026-09-28")).toEqual(a);
    expect(a[0].kind).toBe("TASKS");
  });
  it("adaptados a la actividad", () => {
    const none = candidateChallenges({ ...activity, activeHabits: 0, highPerWeek: 0, topProject: null });
    expect(none.map((c) => c.kind)).not.toContain("HABIT_DAYS");
    expect(none.map((c) => c.kind)).not.toContain("PROJECT_TASKS");
    expect(candidateChallenges(activity).find((c) => c.kind === "PROJECT_TASKS")?.label).toBe("Termina 3 tareas de Trabajo");
  });
});

describe("catálogos", () => {
  it("logros e ids únicos", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.some((a) => a.secret)).toBe(true);
  });
  it("tienda: al menos 10 accesorios para Coleccionista", () => {
    expect(SHOP.filter((i) => i.kind === "accessory").length).toBeGreaterThanOrEqual(10);
    expect(new Set(SHOP.map((i) => i.id)).size).toBe(SHOP.length);
  });
});
