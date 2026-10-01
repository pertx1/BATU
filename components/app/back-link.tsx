"use client";

import { useRouter } from "next/navigation";

/** "← Volver": a la página anterior si la hay; si no, a `fallback`. */
export function BackLink({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm font-semibold text-accent"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      ← Volver
    </button>
  );
}
