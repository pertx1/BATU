import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { formatTz, weekLabel } from "@/lib/dates";
import { getReview } from "@/lib/data/review";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { DeleteButton } from "@/components/ui/delete-button";

export const metadata: Metadata = { title: "Revisión" };

export default async function ReviewDetailPage({ params }: PageProps<"/revision/[id]">) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const review = await getReview(user.id, id);
  if (!review) notFound();

  return (
    <>
      <PageHeader
        title="Revisión"
        subtitle={weekLabel(review.weekStart)}
        back="/revision"
        right={
          <Link href={`/revision?semana=${review.weekStart}`} aria-label="Editar revisión" className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-fg">
            <Pencil size={20} />
          </Link>
        }
      />
      <PageBody>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold tabular-nums text-success">{review.completedCount}</p>
              <p className="text-sm text-muted">completadas</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold tabular-nums">{review.pendingCount}</p>
              <p className="text-sm text-muted">pendientes</p>
            </div>
          </div>

          {review.nextWeekFocus ? (
            <section className="rounded-2xl border-l-4 border-accent bg-accent-soft px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Para la semana siguiente</p>
              <p className="mt-1 whitespace-pre-line">{review.nextWeekFocus}</p>
            </section>
          ) : null}

          {review.notes ? (
            <section className="card p-4">
              <h2 className="font-semibold">Nota</h2>
              <p className="mt-1 whitespace-pre-line text-muted">{review.notes}</p>
            </section>
          ) : null}

          {review.completedItems.length ? (
            <section>
              <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">Lo que completaste</h2>
              <ul className="card divide-y divide-line overflow-hidden">
                {review.completedItems.map((t, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Check size={18} className="shrink-0 text-success" strokeWidth={3} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-center text-sm text-muted">
            Guardada el {formatTz(review.updatedAt, user.timezone, "d MMM yyyy 'a las' HH:mm")}
          </p>
          <DeleteButton
            path={`/api/reviews/${review.id}`}
            label="Eliminar revisión"
            confirmLabel="Pulsa otra vez para eliminar"
            done="Revisión eliminada"
            redirectTo="/revision"
          />
        </div>
      </PageBody>
    </>
  );
}
