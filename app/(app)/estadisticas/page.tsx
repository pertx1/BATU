import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { dayOfWeek, formatDateStr, todayStr, WEEKDAYS_SHORT } from "@/lib/dates";
import { getStats, type StatsPeriod } from "@/lib/data/stats";
import { formatNumber } from "@/lib/goals";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressBar } from "@/components/goals/goal-card";
import { SectionTitle } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Estadísticas" };

const pct = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);

export default async function StatsPage({ searchParams }: PageProps<"/estadisticas">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const days: StatsPeriod = sp.p === "30" ? 30 : 7;
  const today = todayStr(user.timezone);
  const stats = await getStats(user.id, user.timezone, today, days);

  const bars = stats.series.map((d) => ({
    key: d.date,
    label: formatDateStr(d.date, "EEEE d 'de' MMMM"),
    tick: days === 7 ? WEEKDAYS_SHORT[dayOfWeek(d.date)] : formatDateStr(d.date, "d/M"),
    value: d.count,
  }));

  return (
    <>
      <PageHeader title="Estadísticas" back="/menu" />
      <PageBody>
        <nav className="mb-5 flex rounded-full bg-surface-2 p-1" aria-label="Periodo">
          {([7, 30] as const).map((n) => (
            <Link
              key={n}
              href={n === 7 ? "/estadisticas" : "/estadisticas?p=30"}
              aria-current={n === days ? "page" : undefined}
              className={`flex min-h-10 flex-1 items-center justify-center rounded-full text-[15px] font-semibold transition ${
                n === days ? "bg-segment text-fg shadow-[0_3px_8px_rgb(0_0_0/0.12)]" : "text-muted"
              }`}
            >
              Últimos {n} días
            </Link>
          ))}
        </nav>

        <div className="grid grid-cols-3 gap-2">
          <Tile label="Tareas hechas" value={String(stats.tasks.completed)} note={`${formatNumber(Math.round(stats.tasks.perDay * 10) / 10)} al día`} />
          <Tile label="Hábitos" value={pct(stats.habits.rate)} note={`${stats.habits.hit} de ${stats.habits.scheduled}`} />
          <Tile label="Objetivos" value={String(stats.goals.active.length)} note={`${stats.goals.achieved} conseguidos`} />
        </div>

        <section className="card mt-5 p-4">
          <h2 className="font-semibold">Tareas completadas por día</h2>
          <p className="mb-3 text-sm text-muted">
            {stats.tasks.best.count > 0
              ? `Mejor día: ${formatDateStr(stats.tasks.best.date, "EEEE d")} (${stats.tasks.best.count})`
              : "Aún no hay tareas completadas en este periodo"}
          </p>
          <BarChart
            data={bars}
            caption={`Tareas completadas por día, últimos ${days} días`}
            unitOne="tarea"
            unitMany="tareas"
            tickEvery={days === 7 ? 1 : 7}
          />
          <p className="mt-2 text-sm text-muted">
            Pendientes ahora: {stats.tasks.pending}
            {stats.tasks.overdue ? <span className="text-danger"> · {stats.tasks.overdue} atrasadas</span> : null}
          </p>
        </section>

        <SectionTitle>Hábitos</SectionTitle>
        {stats.habits.list.length ? (
          <ul className="card divide-y divide-line overflow-hidden">
            {stats.habits.list.map((h) => (
              <li key={h.id}>
                <Link href={`/habitos/${h.id}`} className="block px-4 py-3 active:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {h.emoji ? `${h.emoji} ` : ""}
                      {h.name}
                    </span>
                    <span className="font-semibold tabular-nums">{pct(h.rate)}</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={h.rate ?? 0} />
                  </div>
                  <p className="mt-1.5 flex items-center gap-3 text-[13px] text-muted">
                    <span className="flex items-center gap-1">
                      <Flame size={14} className="text-warning" /> Racha {h.currentStreak}
                    </span>
                    <span>Mejor {h.bestStreak}</span>
                    <span>
                      {h.hit}/{h.scheduled} días
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-muted">Todavía no tienes hábitos.</p>
        )}

        <SectionTitle>Objetivos activos</SectionTitle>
        {stats.goals.active.length ? (
          <ul className="card divide-y divide-line overflow-hidden">
            {stats.goals.active.map((g) => (
              <li key={g.id}>
                <Link href={`/objetivos/${g.id}`} className="block px-4 py-3 active:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{g.title}</span>
                    <span className="font-semibold tabular-nums">{Math.round(g.progress * 100)}%</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={g.progress} />
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted">{g.label}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-muted">No tienes objetivos activos.</p>
        )}
      </PageBody>
    </>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-3">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[12px] text-muted">{note}</p>
    </div>
  );
}
