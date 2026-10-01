import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { capitalize, localDateStr, relativeDayLabel, todayStr } from "@/lib/dates";
import { listIdeas } from "@/lib/data/ideas";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { IdeasBoard } from "@/components/ideas/ideas-board";

export const metadata: Metadata = { title: "Ideas" };

export default async function IdeasPage() {
  const user = await requireOnboardedUser();
  const today = todayStr(user.timezone);
  const ideas = await listIdeas(user.id);

  return (
    <>
      <PageHeader title="Ideas" back="/menu" />
      <PageBody>
        <IdeasBoard
          initial={ideas.map((i) => ({
            id: i.id,
            text: i.text,
            pinned: i.pinned,
            when: capitalize(relativeDayLabel(localDateStr(new Date(i.createdAt), user.timezone), today)),
          }))}
        />
      </PageBody>
    </>
  );
}
