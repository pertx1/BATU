import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { formatDateStr } from "@/lib/dates";
import { getAntolaProfile } from "@/lib/data/antola";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { AntolaScreen } from "@/components/antola/antola-screen";

export const metadata: Metadata = { title: "Antola" };

export default async function AntolaPage({ searchParams }: PageProps<"/antola">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const profile = await getAntolaProfile(user);
  const tab = typeof sp.tab === "string" ? sp.tab : "logros";

  if (!profile.enabled) {
    return (
      <>
        <PageHeader title="Antola" back="/menu" />
        <PageBody>
          <div className="card p-5 text-center">
            <p className="font-semibold">La gamificación está desactivada</p>
            <p className="mt-1 text-sm text-muted">Tus puntos y logros siguen guardados. Puedes volver a activarla en Ajustes.</p>
            <Link href="/ajustes#antola" className="btn btn-primary mt-4">
              Ir a Ajustes
            </Link>
          </div>
        </PageBody>
      </>
    );
  }

  const history = profile.history.map((d) => ({
    key: d.day,
    label: formatDateStr(d.day, "EEEE d 'de' MMMM"),
    tick: formatDateStr(d.day, "d/M"),
    value: d.xp,
  }));

  return (
    <>
      <PageHeader title="Antola" back="/menu" />
      <PageBody>
        <AntolaScreen profile={profile} history={history} initialTab={tab} />
      </PageBody>
    </>
  );
}
