import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { weightPageData } from "@/lib/nutrition/weight-service";
import { PageBody } from "@/components/app/page-header";
import { WeightView } from "@/components/nutrition/weight-view";

export const metadata: Metadata = { title: "Peso" };

export default async function WeightPage() {
  const user = await requireOnboardedUser();
  const data = await weightPageData(user);
  return (
    <PageBody>
      <WeightView data={data} />
    </PageBody>
  );
}
