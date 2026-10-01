import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { formatTz } from "@/lib/dates";
import { getAdminOverview } from "@/lib/data/admin";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { UserToggle } from "@/components/admin/user-toggle";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 100) : null;
  const data = await getAdminOverview(q);
  const fmt = (d: Date | null) => (d ? formatTz(d, admin.timezone, "d MMM yyyy, HH:mm") : "—");

  return (
    <>
      <PageHeader title="Administración" back="/menu" />
      <PageBody>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Usuarios" value={data.total} />
          <Stat label="Activos 7 días" value={data.active7} />
          <Stat label="Desactivados" value={data.disabled} />
        </div>
        <p className="mt-3 text-sm text-muted">
          Solo ves datos de las cuentas, nunca su contenido (tareas, hábitos, eventos…).
        </p>

        <form className="relative mt-5" action="/admin">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q ?? ""} type="search" placeholder="Buscar por email" className="input pl-10" autoCapitalize="none" />
        </form>

        <p className="mb-2 mt-5 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
          {q ? `${data.matching} resultados` : "Cuentas"}
          {data.matching > data.users.length ? ` (mostrando ${data.users.length})` : ""}
        </p>
        <ul className="card divide-y divide-line overflow-hidden">
          {data.users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${u.disabledAt ? "text-muted line-through" : ""}`}>{u.email}</p>
                <p className="text-[13px] text-muted">Registro: {fmt(u.createdAt)}</p>
                <p className="text-[13px] text-muted">Última actividad: {fmt(u.lastActiveAt)}</p>
                {!u.onboardedAt ? <p className="text-[13px] text-warning">Sin completar la bienvenida</p> : null}
                {u.disabledAt ? <p className="text-[13px] text-danger">Desactivada el {fmt(u.disabledAt)}</p> : null}
              </div>
              {u.id === admin.id ? (
                <span className="shrink-0 rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">Tú</span>
              ) : (
                <UserToggle id={u.id} email={u.email} disabled={!!u.disabledAt} />
              )}
            </li>
          ))}
          {data.users.length === 0 ? <li className="px-4 py-6 text-center text-muted">Sin resultados</li> : null}
        </ul>
      </PageBody>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
