import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { addDays, dayOfWeek, isDateStr, startOfWeekMonday, todayStr, weekLabel } from "@/lib/dates";
import { defaultReviewWeek, getReviewData, listReviews } from "@/lib/data/review";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ReviewWizard } from "@/components/review/review-wizard";
import { SectionTitle } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Revisión semanal" };

export default async function ReviewPage({ searchParams }: PageProps<"/revision">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const today = todayStr(user.timezone);
  const currentMonday = startOfWeekMonday(today);
  const requested = isDateStr(sp.semana) && dayOfWeek(sp.semana) === 1 && sp.semana <= currentMonday ? sp.semana : null;
  const weekStart = requested ?? defaultReviewWeek(today);

  const [data, history] = await Promise.all([
    getReviewData(user.id, user.timezone, weekStart, today),
    listReviews(user.id),
  ]);
  const prev = addDays(weekStart, -7);
  const next = addDays(weekStart, 7);

  return (
    <>
      <PageHeader title="Revisión semanal" back="/menu" />
      <PageBody>
        <div className="mb-5 flex items-center gap-2">
          <Link href={`/revision?semana=${prev}`} aria-label="Semana anterior" className="flex size-10 items-center justify-center rounded-full bg-surface-2">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
              {weekStart === currentMonday ? "Esta semana" : weekStart === addDays(currentMonday, -7) ? "La semana pasada" : "Semana"}
            </p>
            <p className="font-semibold">{weekLabel(weekStart)}</p>
          </div>
          {next <= currentMonday ? (
            <Link href={`/revision?semana=${next}`} aria-label="Semana siguiente" className="flex size-10 items-center justify-center rounded-full bg-surface-2">
              <ChevronRight size={20} />
            </Link>
          ) : (
            <span className="size-10" />
          )}
        </div>

        {data.existing ? (
          <p className="mb-4 rounded-xl bg-success-soft px-3 py-2 text-center text-sm text-success">
            Ya revisaste esta semana. Puedes actualizarla.
          </p>
        ) : null}

        <ReviewWizard
          key={weekStart}
          weekStart={weekStart}
          today={today}
          completed={data.completed}
          pending={data.pending}
          habits={data.habits}
          previousFocus={data.previousFocus}
          existing={data.existing}
        />

        {history.length ? (
          <>
            <SectionTitle>
              <span className="inline-flex items-center gap-1.5">
                <History size={14} /> Revisiones anteriores
              </span>
            </SectionTitle>
            <ul className="card divide-y divide-line overflow-hidden">
              {history.map((r) => (
                <li key={r.id}>
                  <Link href={`/revision/${r.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{weekLabel(r.weekStart)}</p>
                      <p className="truncate text-sm text-muted">
                        {r.completedCount} hechas · {r.pendingCount} pendientes
                        {r.nextWeekFocus ? ` · ${r.nextWeekFocus}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </PageBody>
    </>
  );
}
