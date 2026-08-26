import Link from "next/link";
import { ArrowRight, Bell, ShieldCheck, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

const benefitKeys = ["guided", "reminders", "privacy"] as const;
const benefitIcons = [Smartphone, Bell, ShieldCheck];

const AppDownload = async () => {
  const t = await getTranslations("home.download");

  return (
    <section id="download" className="px-4 pb-24 pt-10 md:px-6 md:pb-28 md:pt-14">
      <div className="container">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] border border-rose-100 bg-gradient-to-br from-white via-rose-50/90 to-orange-50 p-6 shadow-[0_32px_90px_-56px_rgba(190,90,126,0.7)] dark:border-rose-300/14 dark:from-white/8 dark:via-rose-300/8 dark:to-orange-300/8 md:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.95fr]">
            <div>
              <div className="marketing-kicker">{t("eyebrow")}</div>
              <h2 className="mt-5 max-w-3xl font-display text-4xl leading-tight text-rose-950 dark:text-rose-50 md:text-5xl">
                {t("title")}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-rose-950/66 dark:text-rose-50/70">
                {t("description")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-rose-500 px-6 hover:bg-rose-600 dark:bg-rose-200 dark:text-rose-950 dark:hover:bg-rose-100">
                  <Link href="/login">
                    {t("appStore")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-rose-200 bg-white/75 px-6 text-rose-700 hover:bg-rose-50 dark:border-rose-300/20 dark:bg-white/6 dark:text-rose-100 dark:hover:bg-white/10"
                >
                  <Link href="/privacy">{t("playStore")}</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {benefitKeys.map((key, index) => {
                const Icon = benefitIcons[index];

                return (
                  <div key={key} className="flex items-start gap-4 rounded-3xl border border-rose-100/80 bg-white/70 p-4 dark:border-rose-300/14 dark:bg-white/5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm dark:bg-white/8 dark:text-rose-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-rose-950 dark:text-rose-50">{t(`benefits.${key}.title`)}</p>
                      <p className="mt-1 text-sm leading-7 text-rose-950/64 dark:text-rose-50/66">
                        {t(`benefits.${key}.description`)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppDownload;
