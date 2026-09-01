import { SectionLayout } from "@/components/admin-panel/section-layout";

export const instant = false;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SectionLayout title="Catalog Requests">{children}</SectionLayout>;
}
