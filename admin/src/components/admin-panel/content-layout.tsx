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
      <div className="container pb-8 pt-5 sm:pt-6">
        <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-border/75 bg-card/88 p-5 shadow-[0_20px_60px_-42px_rgba(15,58,122,0.3)] backdrop-blur-sm dark:border-slate-400/12 dark:bg-white/5 dark:shadow-[0_24px_60px_-42px_rgba(2,8,23,0.82)] sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Shea operations
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
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
