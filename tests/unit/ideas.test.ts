import { describe, expect, it } from "vitest";
import { ideaToTask } from "@/lib/data/ideas";

describe("idea → tarea", () => {
  it("primera línea = título, resto = notas", () => {
    expect(ideaToTask("Montar un huerto\nEn la terraza\ncon tomates")).toEqual({
      title: "Montar un huerto",
      notes: "En la terraza\ncon tomates",
    });
    expect(ideaToTask("  Solo título  ")).toEqual({ title: "Solo título", notes: null });
  });
  it("un título muy largo se corta y lo que sobra pasa a las notas", () => {
    const r = ideaToTask("a".repeat(350));
    expect(r.title).toHaveLength(300);
    expect(r.notes).toBe("a".repeat(50));
  });
});
