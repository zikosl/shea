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
    <div>
      <Navbar title={title} />
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
