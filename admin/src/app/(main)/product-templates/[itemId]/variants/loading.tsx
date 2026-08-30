import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between border-b pb-5">
        <div className="space-y-3"><Skeleton className="h-7 w-32" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-10 w-44" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
