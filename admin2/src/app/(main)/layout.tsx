import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { SWRProvider } from "@/context/swr";
import { getServerSession } from "next-auth";
import Forbidden from "@/components/forbidden";
import { options } from "../api/auth/[...nextauth]/options";

export default async function DemoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  let session = await getServerSession(options)

  if (!session) return <Forbidden />
  return <SWRProvider session={session}>
    <AdminPanelLayout>{children}</AdminPanelLayout>
  </SWRProvider>;
}
