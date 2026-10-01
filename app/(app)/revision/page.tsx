import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Revisión semanal" };

export default function RevisionPage() {
  return (
    <>
      <PageHeader title="Revisión semanal" back="/menu" />
      <PageBody>
        <ComingSoon text="La revisión semanal llega en la fase 5." />
      </PageBody>
    </>
  );
}
