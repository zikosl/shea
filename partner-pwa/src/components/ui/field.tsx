"use client";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">{label}</span>
      {children}
    </label>
  );
}
