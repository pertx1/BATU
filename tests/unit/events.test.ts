import { describe, expect, it } from "vitest";
import { eventFieldsToData, DEFAULT_EVENT_FIELDS } from "@/lib/event-input";
import { eventSpanOnDay, eventTimeLabel } from "@/lib/calendar-format";
import type { EventView } from "@/lib/types";

const TZ = "Europe/Madrid";
const base = { ...DEFAULT_EVENT_FIELDS, title: "Cita", startDate: "2026-10-05" };

describe("eventos", () => {
  it("con hora: guarda inicio y fin en UTC y el aviso X min antes", () => {
    const d = eventFieldsToData({ ...base, startTime: 600, endTime: 690, reminderMinutesBefore: 15 }, TZ);
    expect(d.allDay).toBe(false);
    expect(d.startAt?.toISOString()).toBe("2026-10-05T08:00:00.000Z");
    expect(d.endAt?.toISOString()).toBe("2026-10-05T09:30:00.000Z");
    expect(d.remindAt?.toISOString()).toBe("2026-10-05T07:45:00.000Z");
  });
  it("sin hora de inicio = todo el día; aviso 1 día antes = víspera a las 9:00", () => {
    const d = eventFieldsToData({ ...base, reminderMinutesBefore: 1440 }, TZ);
    expect(d.allDay).toBe(true);
    expect(d.startAt).toBeNull();
    expect(d.remindAt?.toISOString()).toBe("2026-10-04T07:00:00.000Z");
  });
  it("fin antes que inicio el mismo día → termina al día siguiente", () => {
    const d = eventFieldsToData({ ...base, startTime: 22 * 60, endTime: 60 }, TZ);
    expect(d.endDate.toISOString().slice(0, 10)).toBe("2026-10-06");
    expect(d.endAt?.toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });
  it("sin hora de fin dura una hora", () => {
    const d = eventFieldsToData({ ...base, startTime: 600 }, TZ);
    expect(d.endAt?.toISOString()).toBe("2026-10-05T09:00:00.000Z");
  });
});

describe("formato de eventos de varios días", () => {
  const e: EventView = {
    id: "1", title: "Viaje", allDay: false, startDate: "2026-10-05", endDate: "2026-10-07",
    start: 18 * 60, end: 10 * 60, location: null, notes: null, project: null, reminderMinutesBefore: null,
  };
  it("etiquetas por día", () => {
    expect(eventTimeLabel(e, "2026-10-05")).toBe("Desde las 18:00");
    expect(eventTimeLabel(e, "2026-10-06")).toBe("Todo el día");
    expect(eventTimeLabel(e, "2026-10-07")).toBe("Hasta las 10:00");
  });
  it("tramos en la vista diaria", () => {
    expect(eventSpanOnDay(e, "2026-10-05")).toEqual([1080, 1440]);
    expect(eventSpanOnDay(e, "2026-10-06")).toBeNull();
    expect(eventSpanOnDay(e, "2026-10-07")).toEqual([0, 600]);
  });
});
