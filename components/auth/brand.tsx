import Image from "next/image";

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={64}
        height={64}
        className="mb-4 rounded-2xl shadow-lg shadow-accent/20"
        priority
      />
      <h1 className="text-3xl font-bold tracking-tight">Antola</h1>
      {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
    </div>
  );
}
