import type { Metadata } from "next";
import { ResourcePage } from "@/components/admin-panel/resource-page";
import { getTestFlightRequests } from "./actions";
import { TestFlightInbox } from "./testflight-inbox";

export const instant = false;
export const metadata: Metadata = { title: "TestFlight requests | Shea" };

export default async function TestFlightRequestsPage() {
  const requests = await getTestFlightRequests();
  return <ResourcePage title="TestFlight requests" description="Invite iPhone beta testers through App Store Connect, then mark each request as invited.">
    <TestFlightInbox requests={requests} />
  </ResourcePage>;
}
