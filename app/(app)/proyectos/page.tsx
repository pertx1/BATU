import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Proyectos" };

export default function ProyectosPage() {
  return (
    <>
      <PageHeader title="Proyectos" back="/menu" />
      <PageBody>
        <ComingSoon text="La gestión de proyectos llega en la siguiente fase." />
      </PageBody>
    </>
  );
}
