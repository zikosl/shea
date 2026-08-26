import { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { Navbar } from "@/components/admin-panel/navbar";

type ResourcePageProps = {
  title: string;
  description: string;
  action?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
};

export function ResourcePage({
  title,
  description,
  action,
  filters,
  children,
}: ResourcePageProps) {
  return (
    <div>
      <Navbar title={title} />
      <section className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <Heading title={title} description={description} />
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="space-y-3">
          {filters ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {filters}
            </div>
          ) : null}
          {children}
        </div>
      </section>
    </div>
  );
}
