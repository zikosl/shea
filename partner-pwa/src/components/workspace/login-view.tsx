"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardList, Download, Loader2, Rocket, ShoppingBag, Sun, Moon, WifiOff } from "lucide-react";
import { toast } from "sonner";

function FeatureCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <article className="ds-subtle-surface rounded-[26px] p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[hsla(var(--primary),0.16)] text-[hsl(var(--primary-strong))]">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
    </article>
  );
}

export function LoginView({
  loading,
  onSubmit,
  theme,
  toggleTheme,
}: {
  loading: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
  theme?: string;
  toggleTheme: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !password) {
      toast.error("Email and password are both required.");
      return;
    }

    await onSubmit(email, password);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsla(var(--primary),0.22),transparent_28%),radial-gradient(circle_at_85%_20%,hsla(var(--accent),0.18),transparent_24%),radial-gradient(circle_at_bottom_right,hsla(var(--primary-strong),0.1),transparent_28%)]" />
      <div className="relative grid w-full max-w-5xl gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="ds-surface partner-hero ds-grid-glow rounded-[28px] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[hsla(var(--card),0.76)]">
                <Rocket className="h-5 w-5 text-[hsl(var(--primary-strong))]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">Shea Partner</p>
                <h1 className="ds-display text-[2.25rem] leading-none">Store operations</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="ds-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <p className="mb-5 max-w-[42ch] text-[13px] text-[hsl(var(--muted-foreground))]">
            A softer, more premium workspace for managing products, orders, and in-store sales with confidence.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <FeatureCard title="Orders" icon={<ClipboardList className="h-5 w-5" />} />
            <FeatureCard title="Products" icon={<ShoppingBag className="h-5 w-5" />} />
            <FeatureCard title="Offline ready" icon={<WifiOff className="h-5 w-5" />} />
            <FeatureCard title="Installable" icon={<Download className="h-5 w-5" />} />
          </div>
        </section>

        <section className="ds-surface rounded-[28px] p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Welcome back</p>
          <h2 className="ds-display mb-2 mt-2 text-[2.2rem] leading-none">Sign in</h2>
          <p className="mb-5 text-[13px] text-[hsl(var(--muted-foreground))]">Enter your partner credentials to open the workspace.</p>

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="ds-input !min-h-11"
                placeholder="partner@example.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="ds-input !min-h-11"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="ds-primary-button inline-flex w-full items-center justify-center gap-2 rounded-[16px] px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {loading ? "Opening workspace..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
