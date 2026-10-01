import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { LogoutButton } from "@/components/app/logout-button";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Mi cuenta" back="/menu" />
      <PageBody>
        <div className="card mb-6 p-4">
          <p className="text-sm text-muted">Has iniciado sesión como</p>
          <p className="mt-0.5 break-all font-semibold">{user.email}</p>
        </div>
        <LogoutButton />
      </PageBody>
    </>
  );
}
