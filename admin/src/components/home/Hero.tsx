import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

const Hero = async () => {
  const t = await getTranslations("home.hero");
  const trustItems = ["personalization", "rituals", "delivery"] as const;

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-32 md:px-6 md:pb-20 md:pt-36">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-rose-200/55 blur-3xl dark:bg-rose-500/15" />
      <div className="pointer-events-none absolute -right-20 top-28 h-80 w-80 rounded-full bg-orange-100/75 blur-3xl dark:bg-orange-400/10" />
      <div className="container">
        <div className="marketing-card relative overflow-hidden px-5 py-8 md:px-10 md:py-12 lg:px-14">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/80 to-transparent" />
          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-3xl">
              <div className="marketing-kicker mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("eyebrow")}
              </div>

              <h1 className="font-display text-5xl leading-[0.92] text-balance text-rose-950 dark:text-rose-50 sm:text-6xl lg:text-7xl">
                {t("title")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-rose-950/68 dark:text-rose-50/72 md:text-lg">
                {t("description")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-300 dark:text-rose-950 dark:hover:bg-rose-200">
                  <Link href="/login">
                    {t("primaryCta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-rose-200 bg-white/75 text-rose-800 hover:bg-rose-50 dark:border-rose-300/20 dark:bg-white/6 dark:text-rose-100 dark:hover:bg-white/10">
                  <Link href="#download">{t("secondaryCta")}</Link>
                </Button>
              </div>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {trustItems.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/68 px-3.5 py-2 text-xs font-medium text-rose-950/72 dark:border-rose-300/18 dark:bg-white/6 dark:text-rose-50/76"
                  >
                    <Check className="h-3.5 w-3.5 text-rose-500 dark:text-rose-200" />
                    {t(`trust.${item}`)}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="marketing-outline relative mx-auto max-w-[27rem] overflow-hidden rounded-[36px] p-6">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-rose-200/70 blur-3xl" />
                <div className="relative rounded-[30px] bg-gradient-to-br from-rose-50 via-white to-orange-50 p-7 text-center dark:from-white/10 dark:via-white/5 dark:to-rose-300/10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_20px_45px_-24px_rgba(244,63,94,0.9)] dark:bg-rose-300 dark:text-rose-950">
                    <Heart className="h-7 w-7 fill-current" />
                  </div>
                  <Image
                    src="/logo.png"
                    alt="Shea"
                    width={220}
                    height={150}
                    className="mx-auto mt-7 h-auto w-48 object-contain"
                    priority
                  />
                  <p className="mx-auto mt-6 max-w-xs text-sm leading-7 text-rose-950/64 dark:text-rose-50/68">
                    {t("floatingCard.description")}
                  </p>
                </div>
              </div>

              <div className="marketing-card absolute -bottom-5 left-0 hidden max-w-[15rem] p-4 md:block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-200/76">
                  {t("floatingCard.eyebrow")}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-rose-950 dark:text-rose-50">{t("floatingCard.title")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
