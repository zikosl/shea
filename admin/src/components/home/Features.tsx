import { PackageCheck, ScanSearch, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

const icons = [Sparkles, ScanSearch, PackageCheck];
const featureKeys = ["diagnosis", "pairing", "delivery"] as const;

const Features = async () => {
  const t = await getTranslations("home.features");

  return (
    <section id="features" className="px-4 py-14 md:px-6 md:py-18">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="marketing-kicker">{t("eyebrow")}</div>
          <h2 className="mt-5 font-display text-4xl text-rose-950 dark:text-rose-50 md:text-5xl">{t("title")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-rose-950/66 dark:text-rose-50/70">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
          {featureKeys.map((key, index) => {
            const Icon = icons[index];

            return (
              <div key={key} className="marketing-card group p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 text-rose-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-rose-950 dark:text-rose-50">{t(`items.${key}.title`)}</h3>
                <p className="mt-3 text-sm leading-7 text-rose-950/68 dark:text-rose-50/68">
                  {t(`items.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
