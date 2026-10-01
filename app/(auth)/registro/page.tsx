import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { allowSignup } from "@/lib/env";
import { Brand } from "@/components/auth/brand";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  if (await getCurrentSession()) redirect("/");
  if (!allowSignup()) {
    return (
      <>
        <Brand />
        <div className="card p-6 text-center">
          <h2 className="text-lg font-semibold">El registro está cerrado</h2>
          <p className="mt-2 text-muted">Ahora mismo no se pueden crear cuentas nuevas.</p>
          <Link href="/login" className="btn btn-primary mt-6 w-full">Volver a entrar</Link>
        </div>
      </>
    );
  }
  return (
    <>
      <Brand subtitle="Crea tu cuenta" />
      <RegisterForm />
    </>
  );
}
