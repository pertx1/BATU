import { describe, expect, it } from "vitest";
import { niceTicks } from "@/components/charts/scale";

describe("niceTicks", () => {
  it("enteros para conteos", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(23)).toEqual([0, 10, 20, 30]);
  });
  it("decimales y mínimo distinto de cero", () => {
    expect(niceTicks(1.2, 0, false)).toEqual([0, 0.5, 1, 1.5]);
    expect(niceTicks(82, 70, false)).toEqual([70, 75, 80, 85]);
  });
});
