import { PackageCheck, ScanSearch, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

const icons = [Sparkles, ScanSearch, PackageCheck];
const featureKeys = ["diagnosis", "pairing", "delivery"] as const;

const Features = async () => {
  const t = await getTranslations("home.features");

  return (
    <section id="features" className="px-4 py-12 md:px-6 md:py-16">
      <div className="container">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-rose-100/80 bg-white/55 p-5 backdrop-blur dark:border-rose-300/12 dark:bg-white/5 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="marketing-kicker">{t("eyebrow")}</div>
              <h2 className="mt-5 font-display text-4xl leading-tight text-rose-950 dark:text-rose-50 md:text-5xl">
                {t("title")}
              </h2>
              <p className="mt-4 text-base leading-8 text-rose-950/64 dark:text-rose-50/68">
                {t("description")}
              </p>
            </div>

            <div className="grid gap-3">
              {featureKeys.map((key, index) => {
                const Icon = icons[index];

                return (
                  <div
                    key={key}
                    className="group flex gap-4 rounded-3xl border border-rose-100/80 bg-white/70 p-4 transition-colors hover:bg-white dark:border-rose-300/12 dark:bg-white/5 dark:hover:bg-white/8"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-200/12 dark:text-rose-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-rose-950 dark:text-rose-50">
                        {t(`items.${key}.title`)}
                      </h3>
                      <p className="mt-1 text-sm leading-7 text-rose-950/64 dark:text-rose-50/66">
                        {t(`items.${key}.description`)}
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

export default Features;
