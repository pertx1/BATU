import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Ajustes" };

export default function AjustesPage() {
  return (
    <>
      <PageHeader title="Ajustes" back="/menu" />
      <PageBody>
        <ComingSoon text="Los ajustes y las notificaciones llegan en la fase 4." />
      </PageBody>
    </>
  );
}
