import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Hábitos" };

export default function HabitosPage() {
  return (
    <>
      <PageHeader title="Hábitos" />
      <PageBody>
        <ComingSoon text="Tus hábitos con rachas llegan en la siguiente fase." />
      </PageBody>
    </>
  );
}
