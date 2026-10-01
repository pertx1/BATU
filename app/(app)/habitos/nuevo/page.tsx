import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { HabitForm } from "@/components/habits/habit-form";

export const metadata: Metadata = { title: "Nuevo hábito" };

export default async function NewHabitPage() {
  await requireOnboardedUser();
  return (
    <>
      <PageHeader title="Nuevo hábito" back="/habitos" />
      <PageBody>
        <HabitForm />
      </PageBody>
    </>
  );
}
