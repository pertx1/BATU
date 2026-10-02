import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { foodNudges, weightPageData } from "@/lib/nutrition/weight-service";
import { PageBody } from "@/components/app/page-header";
import { FoodNudges } from "@/components/nutrition/food-nudges";
import { WeightView } from "@/components/nutrition/weight-view";

export const metadata: Metadata = { title: "Peso" };

export default async function WeightPage() {
  const user = await requireOnboardedUser();
  const [data, nudges] = await Promise.all([weightPageData(user), foodNudges(user)]);
  return (
    <PageBody>
      <FoodNudges nudges={nudges} className="pt-3" />
      <WeightView data={data} />
    </PageBody>
  );
}
