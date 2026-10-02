import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { PageBody } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Peso" };

export default function WeightPage() {
  return (
    <PageBody>
      <div className="mt-6">
        <EmptyState icon={<Scale size={28} />} title="Muy pronto" text="Aquí verás la tendencia de tu peso, tus pesajes y el camino hacia tu objetivo." />
      </div>
    </PageBody>
  );
}
