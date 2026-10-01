import { describe, expect, it } from "vitest";
import {
  computeNextTimes,
  deliverAt,
  inDndWindow,
  nextLocalTimeAt,
  readiness,
} from "@/lib/notifications/timing";
import { eveningMessage, joinList, morningMessage, overdueMessage } from "@/lib/notifications/messages";
import { isAllowedPushEndpoint } from "@/lib/push";

const TZ = "Europe/Madrid";
const dnd = { timezone: TZ, dndEnabled: true, dndStart: 23 * 60, dndEnd: 7 * 60 + 30 };

describe("horario de no molestar", () => {
  it("detecta franjas que cruzan la medianoche", () => {
    expect(inDndWindow(23 * 60 + 30, 1380, 450)).toBe(true);
    expect(inDndWindow(3 * 60, 1380, 450)).toBe(true);
    expect(inDndWindow(7 * 60 + 30, 1380, 450)).toBe(false);
    expect(inDndWindow(12 * 60, 1380, 450)).toBe(false);
  });

  it("detecta franjas dentro del mismo día y la franja vacía", () => {
    expect(inDndWindow(14 * 60, 13 * 60, 15 * 60)).toBe(true);
    expect(inDndWindow(15 * 60, 13 * 60, 15 * 60)).toBe(false);
    expect(inDndWindow(10, 600, 600)).toBe(false);
  });

  it("retrasa al final de la franja lo que cae dentro", () => {
    // 23:30 del 1 oct en Madrid (UTC+2) → 07:30 del 2 oct
    expect(deliverAt(new Date("2026-10-01T21:30:00Z"), dnd).toISOString()).toBe("2026-10-02T05:30:00.000Z");
    // 03:00 del 2 oct → 07:30 del mismo día
    expect(deliverAt(new Date("2026-10-02T01:00:00Z"), dnd).toISOString()).toBe("2026-10-02T05:30:00.000Z");
    // 12:00 → sin cambios
    const noon = new Date("2026-10-02T10:00:00Z");
    expect(deliverAt(noon, dnd)).toBe(noon);
    expect(deliverAt(new Date("2026-10-01T21:30:00Z"), { ...dnd, dndEnabled: false }).toISOString()).toBe(
      "2026-10-01T21:30:00.000Z",
    );
  });

  it("espera, envía o descarta según la hora", () => {
    const at = new Date("2026-10-01T21:30:00Z"); // 23:30, dentro de no molestar
    expect(readiness(at, dnd, new Date("2026-10-02T03:00:00Z"))).toBe("wait");
    expect(readiness(at, dnd, new Date("2026-10-02T05:31:00Z"))).toBe("send");
    expect(readiness(at, dnd, new Date("2026-10-02T07:31:00Z"))).toBe("stale");
    const plain = { ...dnd, dndEnabled: false };
    expect(readiness(at, plain, new Date("2026-10-01T23:29:00Z"))).toBe("send");
    expect(readiness(at, plain, new Date("2026-10-01T23:31:00Z"))).toBe("stale");
  });
});

describe("próximos disparos", () => {
  it("elige hoy si aún no ha pasado la hora, y si no mañana", () => {
    const now = new Date("2026-10-01T05:00:00Z"); // 07:00 en Madrid
    expect(nextLocalTimeAt(480, TZ, now).toISOString()).toBe("2026-10-01T06:00:00.000Z");
    expect(nextLocalTimeAt(420, TZ, now).toISOString()).toBe("2026-10-02T05:00:00.000Z");
  });

  it("la revisión semanal cae en domingo", () => {
    const now = new Date("2026-10-01T10:00:00Z"); // jueves
    const times = computeNextTimes(
      { timezone: TZ, morningTime: 480, eveningTime: 1290, overdueTime: 540, weeklyReviewTime: 1080 },
      now,
    );
    expect(times.nextWeeklyAt.toISOString()).toBe("2026-10-04T16:00:00.000Z"); // dom 18:00 (UTC+2)
    expect(times.nextEveningAt.toISOString()).toBe("2026-10-01T19:30:00.000Z");
  });

  it("respeta el cambio de hora (fin del horario de verano)", () => {
    // 25 oct 2026: Madrid pasa a UTC+1
    const now = new Date("2026-10-24T12:00:00Z");
    expect(nextLocalTimeAt(480, TZ, new Date("2026-10-25T05:00:00Z")).toISOString()).toBe("2026-10-25T07:00:00.000Z");
    expect(nextLocalTimeAt(480, TZ, now).toISOString()).toBe("2026-10-25T07:00:00.000Z");
  });
});

describe("textos de los avisos", () => {
  it("resumen de la mañana", () => {
    expect(joinList(["a", "b", "c"])).toBe("a, b y c");
    const m = morningMessage("Ana", { tasks: 3, habits: 1, events: 0 }, "Llamar al banco");
    expect(m.title).toBe("Buenos días, Ana");
    expect(m.body).toBe("Hoy tienes 3 tareas y 1 hábito.\nLo más importante: Llamar al banco");
    expect(morningMessage(null, { tasks: 0, habits: 0, events: 0 }, null).body).toBe("Hoy no tienes nada planificado.");
  });

  it("repaso de la noche y atrasadas", () => {
    expect(eveningMessage(1).body).toBe("Te queda 1 cosa por hacer hoy.");
    expect(eveningMessage(4).body).toBe("Te quedan 4 cosas por hacer hoy.");
    expect(overdueMessage(2).body).toContain("2 tareas atrasadas");
  });
});

describe("endpoints push permitidos", () => {
  it("solo servicios push reales y por https", () => {
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QGx...")).toBe(true);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isAllowedPushEndpoint("http://web.push.apple.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedPushEndpoint("https://evil.com/web.push.apple.com")).toBe(false);
    expect(isAllowedPushEndpoint("https://push.apple.com.evil.com/x")).toBe(false);
  });
});
