import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Objetivos" };

export default function ObjetivosPage() {
  return (
    <>
      <PageHeader title="Objetivos" />
      <PageBody>
        <ComingSoon text="Los objetivos llegan en la fase 5." />
      </PageBody>
    </>
  );
}
