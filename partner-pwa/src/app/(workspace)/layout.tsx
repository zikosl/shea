import { PartnerWorkspaceShell } from "@/components/workspace/app-shell";
import { PageTransition } from "@/components/workspace/page-transition";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PartnerWorkspaceShell>
      <PageTransition>{children}</PageTransition>
    </PartnerWorkspaceShell>
  );
}
