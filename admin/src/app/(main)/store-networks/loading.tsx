export default function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl border bg-muted/40" />)}
    </div>
  );
}
