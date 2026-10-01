import { describe, expect, it } from "vitest";
import { currentOccurrence } from "@/lib/recurrence";

describe("currentOccurrence (repetitivas sin hacer)", () => {
  it("cada día: pasa a hoy", () => {
    expect(currentOccurrence("2026-09-28", "2026-10-01", "DAILY", [])).toBe("2026-10-01");
    expect(currentOccurrence("2026-09-30", "2026-10-01", "DAILY", [])).toBe("2026-10-01");
  });
  it("ya está al día: no cambia", () => {
    expect(currentOccurrence("2026-10-01", "2026-10-01", "DAILY", [])).toBeNull();
    expect(currentOccurrence("2026-10-05", "2026-10-01", "DAILY", [])).toBeNull();
  });
  it("cada semana: el último día de la serie, aunque sea anterior a hoy", () => {
    // jueves 17 sep → jueves 24 sep (hoy es jueves 1 oct → hoy)
    expect(currentOccurrence("2026-09-17", "2026-10-01", "WEEKLY", [])).toBe("2026-10-01");
    expect(currentOccurrence("2026-09-14", "2026-10-01", "WEEKLY", [])).toBe("2026-09-28");
    // lunes 28 sep, hoy jueves: aún es la de esta semana
    expect(currentOccurrence("2026-09-28", "2026-10-01", "WEEKLY", [])).toBeNull();
  });
  it("días concretos: lunes y miércoles", () => {
    // desde el lunes 21 sep, hoy jueves 1 oct → miércoles 30 sep
    expect(currentOccurrence("2026-09-21", "2026-10-01", "WEEKDAYS", [1, 3])).toBe("2026-09-30");
  });
  it("cada mes conserva el día", () => {
    expect(currentOccurrence("2026-07-31", "2026-10-01", "MONTHLY", [])).toBe("2026-09-30");
  });
  it("no repetitiva: nunca", () => {
    expect(currentOccurrence("2026-09-01", "2026-10-01", "NONE", [])).toBeNull();
  });
});
