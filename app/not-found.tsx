import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <SearchX size={44} className="text-muted" />
      <h1 className="mt-4 text-2xl font-bold">No lo encontramos</h1>
      <p className="mt-2 text-muted">Puede que se haya borrado o que el enlace no sea correcto.</p>
      <Link href="/" className="btn btn-primary mt-6 w-full">
        Ir a Hoy
      </Link>
    </main>
  );
}
