"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

const TABS = [
  { href: "/comida", label: "Diario" },
  { href: "/comida/analisis", label: "Análisis" },
  { href: "/comida/peso", label: "Peso" },
];

/** Control segmentado Diario | Análisis | Peso y el engranaje de ajustes. */
export function FoodTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2">
      <nav className="flex flex-1 rounded-full bg-surface-2 p-1" aria-label="Secciones de Comida">
        {TABS.map((t) => {
          const active = t.href === "/comida" ? pathname === "/comida" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 flex-1 items-center justify-center rounded-full px-2 text-[15px] font-semibold transition ${
                active ? "bg-segment text-fg shadow-[0_3px_8px_rgb(0_0_0/0.12)]" : "text-muted"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/comida/ajustes"
        aria-label="Ajustes de nutrición"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg"
      >
        <Settings size={22} />
      </Link>
    </div>
  );
}

/** Abre la hoja de «+» de Comida (la escucha FoodFab). */
export function openFoodSheet(action: "menu" | "camera" | "gallery" | "text" = "menu") {
  window.dispatchEvent(new CustomEvent("antola:food-add", { detail: action }));
}
