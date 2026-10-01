"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { api } from "@/lib/client/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ message: string }>("/api/auth/forgot", { body: { email } });
      setSent(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <MailCheck size={40} className="mx-auto text-success" />
        <p>{sent}</p>
        <p className="text-sm text-muted">El enlace caduca en 1 hora.</p>
        <Link href="/login" className="btn btn-secondary w-full">
          Volver a entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-center text-muted">Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Enviando…" : "Enviar enlace"}
      </button>
      <p className="pt-2 text-center text-sm">
        <Link href="/login" className="font-semibold text-accent">
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/reset", { body: { token, password } });
      window.location.href = res.redirect;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-center text-muted">
        Nueva contraseña para <b className="break-all text-fg">{email}</b>
      </p>
      {/* Ayuda a los gestores de contraseñas a asociarla a la cuenta. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <div>
        <label className="label" htmlFor="password">Nueva contraseña</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-muted">Al menos 8 caracteres.</p>
      </div>
      <div>
        <label className="label" htmlFor="repeat">Repite la contraseña</label>
        <input
          id="repeat"
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </div>
      {error ? <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Guardando…" : "Guardar y entrar"}
      </button>
      <p className="text-center text-xs text-muted">Se cerrará la sesión en todos tus dispositivos.</p>
    </form>
  );
}
