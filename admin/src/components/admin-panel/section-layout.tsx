import { Navbar } from "@/components/admin-panel/navbar";

type SectionLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export function SectionLayout({ title, children }: SectionLayoutProps) {
  return (
    <div className="relative">
      <Navbar title={title} />
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">{children}</div>
    </div>
  );
}
