import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NavBarTitle } from "@/components/app/nav-bar-title";

/**
 * Cabecera al estilo iOS 26: botones de cristal flotantes arriba y título
 * grande (34 pt) debajo, que se desplaza con el contenido. Al desaparecer el
 * título grande, aparece uno pequeño centrado en la barra.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: React.ReactNode;
}) {
  return (
    <>
      <header className="pt-safe pointer-events-none sticky top-0 z-30">
        {/* Efecto de borde de desplazamiento: el contenido se funde bajo los botones. */}
        <div className="scroll-edge-top absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex h-14 max-w-xl items-center gap-2 px-4">
          <div className="flex min-w-11 justify-start">
            {back ? (
              <Link
                href={back}
                className="glass pointer-events-auto flex size-11 items-center justify-center rounded-full text-fg"
                aria-label="Volver"
              >
                <ChevronLeft size={24} strokeWidth={2.4} className="-ml-0.5" />
              </Link>
            ) : null}
          </div>
          <NavBarTitle title={title} />
          <div className="pointer-events-auto flex min-w-11 items-center justify-end gap-2">{right}</div>
        </div>
      </header>
      <div className="mx-auto max-w-xl px-5 pb-3">
        {subtitle ? <p className="text-[15px] font-medium text-muted">{subtitle}</p> : null}
        <h1 id="large-title" className="text-[34px] font-bold leading-[41px]">
          {title}
        </h1>
      </div>
    </>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-5 pb-6">{children}</div>;
}
