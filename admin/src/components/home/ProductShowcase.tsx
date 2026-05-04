"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const imageByIndex = [
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1974",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=2080",
  "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=2015",
];

const productKeys = ["serum", "cream", "lipOil"] as const;

const ProductShowcase = () => {
  const t = useTranslations("home.showcase");
  const [activeIndex, setActiveIndex] = useState(0);

  const products = productKeys.map((key, index) => ({
    id: key,
    name: t(`items.${key}.name`),
    description: t(`items.${key}.description`),
    badge: t(`items.${key}.badge`),
    price: t(`items.${key}.price`),
    reviews: t(`items.${key}.reviews`),
    image: imageByIndex[index],
  }));

  const activeProduct = products[activeIndex];

  return (
    <section id="products" className="px-4 py-18 md:px-6 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="marketing-kicker">{t("eyebrow")}</div>
          <h2 className="mt-5 font-display text-4xl text-rose-950 dark:text-rose-50 md:text-5xl">{t("title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-rose-950/68 dark:text-rose-50/72">
            {t("description")}
          </p>
        </div>

        <div className="marketing-card relative mx-auto mt-14 max-w-6xl overflow-hidden p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-100/70 to-transparent" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative">
              <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-rose-200 bg-white/85 text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:bg-white/8 dark:text-rose-100 dark:hover:bg-white/12"
                  onClick={() => setActiveIndex((value) => (value === 0 ? products.length - 1 : value - 1))}
                  aria-label={t("previous")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-rose-200 bg-white/85 text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:bg-white/8 dark:text-rose-100 dark:hover:bg-white/12"
                  onClick={() => setActiveIndex((value) => (value === products.length - 1 ? 0 : value + 1))}
                  aria-label={t("next")}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="marketing-outline relative aspect-[4/4.5] overflow-hidden rounded-[32px] p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-100/70 via-white to-orange-50/80" />
                <div className="relative h-full overflow-hidden rounded-[24px]">
                  <Image
                    fill
                    src={activeProduct.image}
                    alt={activeProduct.name}
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>

            <div className="relative">
              <Badge className="rounded-full bg-rose-100 px-4 py-1.5 text-rose-700 hover:bg-rose-100 dark:bg-rose-300/16 dark:text-rose-100">
                {activeProduct.badge}
              </Badge>
              <h3 className="mt-5 font-display text-4xl text-rose-950 dark:text-rose-50 md:text-5xl">{activeProduct.name}</h3>
              <p className="mt-4 text-lg leading-8 text-rose-950/68 dark:text-rose-50/72">{activeProduct.description}</p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm font-medium text-rose-950/68 dark:text-rose-50/68">{activeProduct.reviews}</p>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <p className="text-3xl font-semibold text-rose-950 dark:text-rose-50">{activeProduct.price}</p>
                <Button className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300">{t("cta")}</Button>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {products.map((product, index) => (
                  <button
                    key={product.id}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      index === activeIndex
                        ? "bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950"
                        : "bg-white text-rose-700 shadow-sm ring-1 ring-rose-100 dark:bg-white/8 dark:text-rose-100 dark:ring-rose-400/16"
                    }`}
                    onClick={() => setActiveIndex(index)}
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
