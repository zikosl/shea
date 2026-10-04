import { ResourcePage } from "@/components/admin-panel/resource-page";

import { getContributors, getSahimReviewQueue } from "./actions";
import { ContributorManager } from "./contributor-manager";
import { SahimReviewQueue } from "./review-queue";

export const instant = false;
export const metadata = { title: "Dashboard: Sahim Contributors" };

export default async function SahimPage() {
  const [accounts, queue] = await Promise.all([getContributors(), getSahimReviewQueue()]);

  return (
    <ResourcePage
      title="Sahim contributors"
      description="Invite contributors and manage their access to the Sahim catalog app."
    >
      <ContributorManager accounts={accounts} />
      <SahimReviewQueue items={queue} />
    </ResourcePage>
  );
}
