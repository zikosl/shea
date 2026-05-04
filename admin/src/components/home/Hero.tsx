import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

const Hero = async () => {
  const t = await getTranslations("home.hero");
  const trustItems = ["personalization", "rituals", "delivery"] as const;
  const stats = ["glowPlans", "consultants", "satisfaction"] as const;

  return (
    <section className="relative overflow-hidden px-4 pb-18 pt-32 md:px-6 md:pb-24 md:pt-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.16),_transparent_38%)]" />
      <div className="container">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="marketing-kicker mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              {t("eyebrow")}
            </div>

            <h1 className="font-display text-5xl leading-[0.95] text-balance text-rose-950 dark:text-rose-50 sm:text-6xl lg:text-7xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-rose-950/68 dark:text-rose-50/72 md:text-xl">
              {t("description")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300">
                <Link href="/login">
                  {t("primaryCta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-rose-200 bg-white/80 text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:bg-white/6 dark:text-rose-100 dark:hover:bg-white/10">
                <Link href="#products">{t("secondaryCta")}</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/75 px-4 py-2 text-sm text-rose-900/78 shadow-[0_20px_40px_-30px_rgba(166,74,116,0.45)] dark:border-rose-400/18 dark:bg-white/6 dark:text-rose-50/86 dark:shadow-[0_20px_40px_-30px_rgba(8,4,18,0.85)]"
                >
                  <Check className="h-4 w-4 text-rose-500" />
                  {t(`trust.${item}`)}
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item} className="marketing-card p-5">
                  <p className="text-3xl font-semibold text-rose-950 dark:text-rose-50">{t(`stats.${item}.value`)}</p>
                  <p className="mt-2 text-sm leading-6 text-rose-950/68 dark:text-rose-50/68">{t(`stats.${item}.label`)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="marketing-card relative mx-auto max-w-[34rem] overflow-hidden p-6">
              <div className="absolute inset-x-10 top-0 h-32 rounded-full bg-rose-200/60 blur-3xl" />
              <div className="relative grid gap-5 sm:grid-cols-[0.7fr_0.3fr]">
                <div className="marketing-outline rounded-[30px] p-4">
                  <div className="rounded-[26px] bg-gradient-to-br from-rose-50 via-white to-orange-50 p-3">
                    <Image
                      src="/screenshoot.png"
                      alt={t("imageAlt")}
                      width={480}
                      height={920}
                      className="mx-auto rounded-[22px] object-cover"
                      priority
                    />
                  </div>
                </div>

                <div className="space-y-4 sm:pt-8">
                  <div className="marketing-outline rounded-[24px] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-200/76">
                      {t("routineCard.eyebrow")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-rose-950 dark:text-rose-50">
                      {t("routineCard.title")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-rose-950/65 dark:text-rose-50/68">
                      {t("routineCard.description")}
                    </p>
                  </div>
                  <div className="marketing-outline rounded-[24px] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-200/80">
                      {t("communityCard.eyebrow")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-rose-950 dark:text-rose-50">
                      {t("communityCard.title")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-rose-950/65 dark:text-rose-50/68">
                      {t("communityCard.description")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="marketing-card absolute -bottom-6 left-0 max-w-xs p-4 sm:left-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-200/76">
                {t("floatingCard.eyebrow")}
              </p>
              <p className="mt-2 text-base font-semibold text-rose-950 dark:text-rose-50">{t("floatingCard.title")}</p>
              <p className="mt-2 text-sm leading-6 text-rose-950/65 dark:text-rose-50/68">{t("floatingCard.description")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
