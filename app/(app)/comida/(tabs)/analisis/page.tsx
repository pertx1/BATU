import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getAnalysis } from "@/lib/data/analysis";
import { RANGES, parseRange } from "@/lib/nutrition/analysis";
import { PageBody } from "@/components/app/page-header";
import { CaloriesChartCard, ConsistencyCard, HungerCard, MacrosCard, WaterChartCard } from "@/components/nutrition/analysis-view";

export const metadata: Metadata = { title: "Análisis" };

export default async function AnalysisPage({ searchParams }: PageProps<"/comida/analisis">) {
  const user = await requireOnboardedUser();
  const range = parseRange((await searchParams).rango);
  const data = await getAnalysis(user, range.days);
  if (!data) redirect("/nutricion/bienvenida");

  return (
    <PageBody>
      <div className="space-y-3 pt-3">
        <ConsistencyCard data={data} />
        {/* El periodo elegido afecta a todo lo que hay debajo. */}
        <nav className="flex rounded-full bg-surface-2 p-1" aria-label="Periodo">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={r.key === "7" ? "/comida/analisis" : `/comida/analisis?rango=${r.key}`}
              scroll={false}
              replace
              aria-current={r.key === range.key ? "page" : undefined}
              className={`flex min-h-10 flex-1 items-center justify-center rounded-full px-2 text-[15px] font-semibold transition ${
                r.key === range.key ? "bg-segment text-fg shadow-[0_3px_8px_rgb(0_0_0/0.12)]" : "text-muted"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <CaloriesChartCard data={data} />
        <MacrosCard data={data} />
        <WaterChartCard data={data} />
        <HungerCard data={data} />
      </div>
    </PageBody>
  );
}
