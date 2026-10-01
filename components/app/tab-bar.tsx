"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, Flame, Sun, Target } from "lucide-react";

const TABS = [
  { href: "/", label: "Hoy", icon: Sun },
  { href: "/tareas", label: "Tareas", icon: CheckSquare },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/habitos", label: "Hábitos", icon: Flame },
  { href: "/objetivos", label: "Objetivos", icon: Target },
];

/**
 * Barra de pestañas flotante de iOS 26: una cápsula de cristal (Liquid Glass)
 * sobre el contenido. Iconos y textos monocromos; solo la pestaña activa lleva
 * el color de acento.
 */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      aria-label="Navegación principal"
    >
      <ul className="glass mx-auto grid h-[62px] max-w-md grid-cols-5 rounded-full p-1 shadow-[0_8px_30px_rgb(0_0_0/0.12)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                // Se precarga entera al abrir la app: cambiar de pestaña es instantáneo.
                prefetch
                className={`flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                  active ? "bg-fg/[0.07] text-accent" : "text-fg"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={24} strokeWidth={active ? 2.3 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
