"use client";

import { useEffect } from "react";
import { applyTheme, readTheme } from "@/lib/theme";

/** Ajusta el color de la barra (theme-color) al tema elegido en este dispositivo. */
export function ThemeSync() {
  useEffect(() => applyTheme(readTheme()), []);
  return null;
}
