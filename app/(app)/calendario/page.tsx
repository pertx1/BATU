import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Calendario" };

export default function CalendarioPage() {
  return (
    <>
      <PageHeader title="Calendario" />
      <PageBody>
        <ComingSoon text="El calendario mensual, semanal y diario llega en la fase 3." />
      </PageBody>
    </>
  );
}
