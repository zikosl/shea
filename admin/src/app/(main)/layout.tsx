import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { SWRProvider } from "@/context/swr";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { options } from "../api/auth/[...nextauth]/options";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function DemoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  let session = await getServerSession(options)

  if (!session?.accessToken || session.error === "RefreshAccessTokenError") {
    redirect("/login")
  }

  return <SWRProvider session={session}>
    <AdminPanelLayout>{children}</AdminPanelLayout>
  </SWRProvider>;
}
