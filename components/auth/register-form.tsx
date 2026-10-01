"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client/api";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api<{ redirect: string }>("/api/auth/register", {
        body: { email, password, acceptPrivacy: accept, timezone },
      });
      window.location.href = res.redirect;
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
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-muted">Mínimo 8 caracteres.</p>
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-5 accent-[var(--accent)]"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
          required
        />
        <span>
          He leído y acepto la{" "}
          <Link href="/privacidad" className="font-semibold text-accent">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      {error ? <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="pt-2 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Entrar
        </Link>
      </p>
    </form>
  );
}
