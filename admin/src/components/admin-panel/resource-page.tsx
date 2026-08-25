import { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";

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
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Heading title={title} description={description} />
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="admin-surface space-y-4 p-4 sm:p-5">
        {filters ? (
          <div className="admin-muted-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            {filters}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
