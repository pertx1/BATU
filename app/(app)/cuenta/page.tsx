import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { LogoutButton } from "@/components/app/logout-button";
import { AccountSettings } from "@/components/account/account-settings";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { user } = session;
  const otherSessions = await db.session.count({
    where: { userId: user.id, NOT: { id: session.sessionId }, expiresAt: { gt: new Date() } },
  });

  return (
    <>
      <PageHeader title="Mi cuenta" back="/menu" />
      <PageBody>
        <AccountSettings name={user.name} email={user.email} otherSessions={otherSessions} />
        <div className="mt-7 space-y-3">
          <LogoutButton />
          <Link href="/privacidad" className="flex items-center justify-center gap-1.5 py-2 text-sm text-muted">
            <ShieldCheck size={16} /> Política de privacidad <ChevronRight size={14} />
          </Link>
        </div>
      </PageBody>
    </>
  );
}
