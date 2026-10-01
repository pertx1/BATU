import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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
    <header className="pt-safe sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-end gap-2 px-5 pb-3 pt-3">
        {back ? (
          <Link href={back} className="-ml-2 mb-0.5 flex size-10 items-center justify-center rounded-full text-accent" aria-label="Volver">
            <ChevronLeft size={28} />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          {subtitle ? <p className="text-sm font-medium text-muted">{subtitle}</p> : null}
          <h1 className="truncate text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        </div>
        {right ? <div className="mb-0.5 flex items-center gap-1">{right}</div> : null}
      </div>
    </header>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-5 pb-6">{children}</div>;
}
