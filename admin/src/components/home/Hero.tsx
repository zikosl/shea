import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

const Hero = async () => {
  const t = await getTranslations("home.hero");
  const trustItems = ["personalization", "rituals", "delivery"] as const;

  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-32 md:px-6 md:pb-20 md:pt-36">
      <div className="pointer-events-none absolute left-1/2 top-20 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-rose-200/55 blur-3xl dark:bg-rose-500/12" />
      <div className="container relative">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="marketing-kicker mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("eyebrow")}
              </div>

              <h1 className="font-display text-5xl leading-[0.95] text-balance text-rose-950 dark:text-rose-50 sm:text-6xl lg:text-7xl">
                {t("title")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-rose-950/66 dark:text-rose-50/70 md:text-lg">
                {t("description")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-rose-500 px-6 hover:bg-rose-600 dark:bg-rose-200 dark:text-rose-950 dark:hover:bg-rose-100">
                  <Link href="/login">
                    {t("primaryCta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-rose-200 bg-white/70 px-6 text-rose-800 hover:bg-rose-50 dark:border-rose-300/20 dark:bg-white/6 dark:text-rose-100 dark:hover:bg-white/10">
                  <Link href="#features">{t("secondaryCta")}</Link>
                </Button>
              </div>

              <div className="mt-8 grid max-w-2xl gap-2 sm:grid-cols-3">
                {trustItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-2xl border border-rose-100/90 bg-white/60 px-3 py-2 text-xs font-medium text-rose-950/70 backdrop-blur dark:border-rose-300/14 dark:bg-white/5 dark:text-rose-50/72"
                  >
                    <Check className="h-3.5 w-3.5 text-rose-500 dark:text-rose-200" />
                    {t(`trust.${item}`)}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="marketing-card relative overflow-hidden p-6">
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-rose-300 to-transparent" />
                <div className="rounded-[2rem] border border-rose-100 bg-gradient-to-br from-white via-rose-50 to-orange-50 p-8 text-center dark:border-rose-300/14 dark:from-white/8 dark:via-rose-300/8 dark:to-orange-300/8">
                  <Image
                    src="/logo.png"
                    alt="Shea"
                    width={220}
                    height={150}
                    className="mx-auto h-auto w-48 object-contain"
                    priority
                  />
                  <p className="mx-auto mt-6 max-w-xs text-sm leading-7 text-rose-950/64 dark:text-rose-50/68">
                    {t("floatingCard.description")}
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-3 hidden rounded-3xl border border-rose-100 bg-white/80 p-4 shadow-[0_24px_60px_-38px_rgba(190,90,126,0.6)] backdrop-blur md:block dark:border-rose-300/14 dark:bg-white/8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500 dark:text-rose-200">
                  {t("floatingCard.eyebrow")}
                </p>
                <p className="mt-2 max-w-48 text-sm font-semibold leading-6 text-rose-950 dark:text-rose-50">
                  {t("floatingCard.title")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
