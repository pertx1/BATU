import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageBody } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Análisis" };

export default function AnalysisPage() {
  return (
    <PageBody>
      <div className="mt-6">
        <EmptyState icon={<BarChart3 size={28} />} title="Muy pronto" text="Aquí verás tus calorías, macros, agua, constancia y hambre en gráficos." />
      </div>
    </PageBody>
  );
}
