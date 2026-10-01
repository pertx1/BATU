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

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 backdrop-blur-xl"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={24} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
