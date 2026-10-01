import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Estadísticas" };

export default function EstadisticasPage() {
  return (
    <>
      <PageHeader title="Estadísticas" back="/menu" />
      <PageBody>
        <ComingSoon text="Las estadísticas llegan en la fase 5." />
      </PageBody>
    </>
  );
}
