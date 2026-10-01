/**
 * Apariencia (claro / oscuro / la del sistema). Es de cada dispositivo, como en
 * iOS: se guarda en localStorage y un script en <head> la aplica antes de
 * pintar, para que no se vea un destello del tema equivocado.
 */
export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "antola-theme";

/** Color de la barra de estado / del navegador para cada tema (= --bg). */
export const THEME_COLORS = { light: "#f2f2f7", dark: "#000000" } as const;

/** Script para <head>: aplica la preferencia guardada antes de pintar. */
export const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;

/** Pone data-theme en <html> y ajusta las etiquetas theme-color (tras hidratar). */
export function applyTheme(theme: Theme, colors = THEME_COLORS) {
  const root = document.documentElement;
  const forced = theme === "light" || theme === "dark" ? theme : null;
  if (forced) root.dataset.theme = forced;
  else delete root.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const media = m.getAttribute("data-media") ?? m.getAttribute("media") ?? "";
    if (!m.hasAttribute("data-media")) m.setAttribute("data-media", media);
    const isDark = media.includes("dark");
    if (forced) {
      m.removeAttribute("media");
      m.setAttribute("content", forced === "dark" ? colors.dark : colors.light);
    } else {
      m.setAttribute("media", media);
      m.setAttribute("content", isDark ? colors.dark : colors.light);
    }
  });
}

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento (modo privado): se aplica solo a esta visita.
  }
  applyTheme(theme);
}
