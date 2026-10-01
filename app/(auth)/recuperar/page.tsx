import type { Metadata } from "next";
import { Brand } from "@/components/auth/brand";
import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Brand subtitle="Recuperar contraseña" />
      <ForgotPasswordForm />
    </>
  );
}
