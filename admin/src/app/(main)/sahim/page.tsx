import { ResourcePage } from "@/components/admin-panel/resource-page";

import { getContributors } from "./actions";
import { ContributorManager } from "./contributor-manager";

export const instant = false;
export const metadata = { title: "Dashboard: Sahim Contributors" };

export default async function SahimPage() {
  const accounts = await getContributors();

  return (
    <ResourcePage
      title="Sahim contributors"
      description="Invite contributors and manage their access to the Sahim catalog app."
    >
      <ContributorManager accounts={accounts} />
    </ResourcePage>
  );
}
