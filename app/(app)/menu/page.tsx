import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ChevronRight, ClipboardCheck, Folder, Settings, ShieldCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/env";
import { PageBody, PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Menú" };

const ITEMS = [
  { href: "/proyectos", label: "Proyectos", icon: Folder },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/revision", label: "Revisión semanal", icon: ClipboardCheck },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
  { href: "/cuenta", label: "Mi cuenta", icon: UserRound },
];

export default async function MenuPage() {
  const user = await requireUser();
  const items = isAdminEmail(user.email) ? [...ITEMS, { href: "/admin", label: "Administración", icon: ShieldCheck }] : ITEMS;
  return (
    <>
      <PageHeader title="Menú" back="/" />
      <PageBody>
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-4 active:bg-surface-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={20} />
                </span>
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight size={20} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </PageBody>
    </>
  );
}
