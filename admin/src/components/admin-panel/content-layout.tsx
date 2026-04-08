import { Navbar } from "@/components/admin-panel/navbar";

interface ContentLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function ContentLayout({
  title,
  description,
  actions,
  children
}: ContentLayoutProps) {
  return (
    <div className="relative">
      <Navbar title={title} />
      <div className="container pb-8 pt-6 sm:pt-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-border/70 bg-background/55 p-5 shadow-sm backdrop-blur-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Admin overview
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
