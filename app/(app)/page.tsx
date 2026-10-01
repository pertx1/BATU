import Link from "next/link";
import { Menu } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { capitalize, formatTz, greeting } from "@/lib/dates";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export default async function TodayPage() {
  const user = await requireUser();
  const now = new Date();
  const hello = `${greeting(now, user.timezone)}${user.name ? `, ${user.name}` : ""}`;
  const date = capitalize(formatTz(now, user.timezone, "EEEE, d 'de' MMMM"));

  return (
    <>
      <PageHeader
        subtitle={date}
        title={hello}
        right={
          <Link href="/menu" aria-label="Menú" className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-fg">
            <Menu size={22} />
          </Link>
        }
      />
      <PageBody>
        <ComingSoon text="Aquí verás tus tareas, hábitos y eventos de hoy." />
      </PageBody>
    </>
  );
}
