import { ContentLayout } from "@/components/admin-panel/content-layout";
import { PosReleaseManager } from "./release-manager";

export const metadata = { title: "POS Updates | Shea Admin" };

export default function PosUpdatesPage() {
  return (
    <ContentLayout
      title="POS Updates"
      description="Publish signed Windows installers to the update channel used by Shea POS registers."
    >
      <PosReleaseManager />
    </ContentLayout>
  );
}
