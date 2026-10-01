import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Tareas" };

export default function TareasPage() {
  return (
    <>
      <PageHeader title="Tareas" />
      <PageBody>
        <ComingSoon text="Tus tareas, la bandeja de entrada y los filtros llegan en la siguiente fase." />
      </PageBody>
    </>
  );
}
