import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { Brand } from "@/components/auth/brand";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentSession()) redirect("/");
  const { next } = await searchParams;
  return (
    <>
      <Brand subtitle="Tu día, en orden." />
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}
