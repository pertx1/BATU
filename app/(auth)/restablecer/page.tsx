import type { Metadata } from "next";
import Link from "next/link";
import { findValidResetToken } from "@/lib/auth/reset";
import { Brand } from "@/components/auth/brand";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Nueva contraseña", referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/restablecer">) {
  const { token } = await searchParams;
  const record = typeof token === "string" ? await findValidResetToken(token) : null;

  return (
    <>
      <Brand subtitle="Nueva contraseña" />
      {record ? (
        <ResetPasswordForm token={token as string} email={record.user.email} />
      ) : (
        <div className="space-y-5 text-center">
          <p>El enlace no es válido o ha caducado.</p>
          <p className="text-sm text-muted">Los enlaces duran 1 hora y solo se pueden usar una vez.</p>
          <Link href="/recuperar" className="btn btn-primary w-full">
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </>
  );
}
