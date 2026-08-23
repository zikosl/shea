import Link from "next/link";
import { ArrowRight, Bell, ShieldCheck, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

const benefitKeys = ["guided", "reminders", "privacy"] as const;
const benefitIcons = [Smartphone, Bell, ShieldCheck];

const AppDownload = async () => {
  const t = await getTranslations("home.download");

  return (
    <section id="download" className="px-4 pb-24 pt-14 md:px-6 md:pb-28 md:pt-18">
      <div className="container">
        <div className="marketing-card overflow-hidden p-6 md:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="marketing-kicker">{t("eyebrow")}</div>
              <h2 className="mt-5 font-display text-4xl text-rose-950 dark:text-rose-50 md:text-5xl">{t("title")}</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-rose-950/68 dark:text-rose-50/72">{t("description")}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-300 dark:text-rose-950 dark:hover:bg-rose-200">
                  <Link href="/login">
                    {t("appStore")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-rose-200 bg-white/80 text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:bg-white/6 dark:text-rose-100 dark:hover:bg-white/10"
                >
                  <Link href="/privacy">{t("playStore")}</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {benefitKeys.map((key, index) => {
                const Icon = benefitIcons[index];

                return (
                  <div key={key} className="flex items-start gap-4 rounded-[24px] border border-rose-100/80 bg-white/70 p-4 dark:border-rose-400/16 dark:bg-white/5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 text-rose-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-rose-950 dark:text-rose-50">{t(`benefits.${key}.title`)}</p>
                      <p className="mt-1 text-sm leading-7 text-rose-950/68 dark:text-rose-50/68">
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
