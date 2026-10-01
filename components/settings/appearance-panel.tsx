"use client";

import { useEffect, useState } from "react";
import { readTheme, setTheme, type Theme } from "@/lib/theme";
import { Segmented } from "@/components/ui/controls";

const HELP: Record<Theme, string> = {
  system: "Sigue el modo claro u oscuro del iPhone.",
  light: "Siempre en modo claro.",
  dark: "Siempre en modo oscuro.",
};

/** Modo claro / oscuro. Se guarda en este dispositivo y se aplica al momento. */
export function AppearancePanel() {
  const [theme, setThemeState] = useState<Theme>("system");

  // localStorage solo existe en el navegador: se lee tras hidratar.
  useEffect(() => setThemeState(readTheme()), []);

  function choose(t: Theme) {
    setThemeState(t);
    setTheme(t);
  }

  return (
    <div className="card p-4">
      <Segmented
        value={theme}
        onChange={choose}
        options={[
          { value: "system", label: "Automático" },
          { value: "light", label: "Claro" },
          { value: "dark", label: "Oscuro" },
        ]}
      />
      <p className="mt-2 px-1 text-sm text-muted">{HELP[theme]}</p>
    </div>
  );
}
