import { describe, expect, it } from "vitest";
import { joinDictation } from "@/lib/client/dictation";
import { themeScript } from "@/lib/theme";

describe("joinDictation", () => {
  it("empieza con mayúscula si el campo estaba vacío", () => {
    expect(joinDictation("", "comprar pan")).toBe("Comprar pan");
    expect(joinDictation("  ", "hola")).toBe("Hola");
  });
  it("añade lo dicho tras lo que ya había", () => {
    expect(joinDictation("Idea:", "app de recetas")).toBe("Idea: app de recetas");
    expect(joinDictation("Primera línea\n", "segunda")).toBe("Primera línea segunda");
  });
  it("sin nada dicho deja el texto igual", () => {
    expect(joinDictation("algo ", "")).toBe("algo ");
  });
});

describe("themeScript", () => {
  it("es JavaScript válido y solo acepta light/dark", () => {
    const store: Record<string, string> = {};
    const html = { dataset: {} as Record<string, string> };
    const run = (value: string | null) => {
      html.dataset = {};
      if (value == null) delete store["antola-theme"];
      else store["antola-theme"] = value;
      new Function("localStorage", "document", themeScript)(
        { getItem: (k: string) => store[k] ?? null },
        { documentElement: html },
      );
      return html.dataset.theme;
    };
    expect(run("dark")).toBe("dark");
    expect(run("light")).toBe("light");
    expect(run(null)).toBeUndefined();
    expect(run("<script>")).toBeUndefined();
  });
});
