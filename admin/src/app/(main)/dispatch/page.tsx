import { ContentLayout } from "@/components/admin-panel/content-layout";

import { getDispatchBoard } from "./actions";
import { DispatchControlCenter } from "./dispatch-control-center";

export const metadata = { title: "Dispatch Control | Shea Admin" };
export const instant = false;

export default async function DispatchPage() {
  const board = await getDispatchBoard();
  return (
    <ContentLayout
      title="Dispatch Control"
      description="Monitor delivery risk, locate riders, and intervene before an order becomes late."
    >
      <DispatchControlCenter initialBoard={board} />
    </ContentLayout>
  );
}
