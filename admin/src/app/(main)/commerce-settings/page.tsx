import { ContentLayout } from "@/components/admin-panel/content-layout";

import { getCommerceSettings } from "./actions";
import SettingsManager from "./settings-manager";

export const instant = false;

export const metadata = { title: "Commerce Settings | Shea Admin" };

export default async function CommerceSettingsPage() {
  const settings = await getCommerceSettings();

  return (
    <ContentLayout title="Commerce Settings" description="Control the amounts and delivery times used across Shea checkout workflows.">
      <SettingsManager pricing={settings.pricing} schedules={settings.schedules} />
    </ContentLayout>
  );
}
