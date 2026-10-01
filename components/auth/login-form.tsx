"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client/api";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/login", { body: { email, password } });
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      window.location.href = res.redirect === "/" && safeNext ? safeNext : res.redirect;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <div className="flex flex-col items-center gap-3 pt-2 text-sm">
        <Link href="/recuperar" className="text-muted underline-offset-4 hover:underline">
          ¿Has olvidado la contraseña?
        </Link>
        <Link href="/registro" className="font-semibold text-accent">
          Crear una cuenta
        </Link>
      </div>
    </form>
  );
}
