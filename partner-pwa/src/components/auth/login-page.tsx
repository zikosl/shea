"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { useHasMounted } from "@/hooks/use-has-mounted";
import { usePartnerStore } from "@/store/partner-store";
import { LoadingStage } from "@/components/workspace/loading-stage";
import { LoginView } from "@/components/workspace/login-view";

export function LoginPage() {
  const router = useRouter();
  const mounted = useHasMounted();
  const { resolvedTheme, setTheme } = useTheme();
  const { session, isBootstrapping, signIn } = usePartnerStore();

  useEffect(() => {
    if (mounted && session) {
      router.replace("/dashboard");
    }
  }, [mounted, router, session]);

  if (!mounted) {
    return <LoadingStage label="Preparing sign in..." />;
  }

  if (session) {
    return <LoadingStage label="Opening workspace..." />;
  }

  return (
    <LoginView
      loading={isBootstrapping}
      onSubmit={signIn}
      theme={resolvedTheme}
      toggleTheme={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    />
  );
}
