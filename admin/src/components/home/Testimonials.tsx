"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

const testimonialKeys = ["amina", "sarah", "nour"] as const;

const Testimonials = () => {
  const t = useTranslations("home.testimonials");

  return (
    <section id="testimonials" className="px-4 py-18 md:px-6 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="marketing-kicker">{t("eyebrow")}</div>
          <h2 className="mt-5 font-display text-4xl text-rose-950 dark:text-rose-50 md:text-5xl">{t("title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-rose-950/68 dark:text-rose-50/72">
            {t("description")}
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonialKeys.map((key) => (
            <article key={key} className="marketing-card p-7">
              <div className="flex items-center gap-1 text-amber-400">
                {[0, 1, 2, 3, 4].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-5 text-base leading-8 text-rose-950/75 dark:text-rose-50/74">
                &quot;{t(`items.${key}.quote`)}&quot;
              </p>
              <div className="mt-8 border-t border-rose-100 pt-5 dark:border-rose-400/16">
                <p className="font-semibold text-rose-950 dark:text-rose-50">{t(`items.${key}.name`)}</p>
                <p className="mt-1 text-sm text-rose-950/60 dark:text-rose-50/62">{t(`items.${key}.meta`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
