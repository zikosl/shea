import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)_360px]"><Skeleton className="h-[720px] rounded-2xl" /><Skeleton className="h-[720px] rounded-2xl" /><Skeleton className="h-[720px] rounded-2xl" /></div>;
}
