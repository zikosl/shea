import Link from "next/link";
import { getTranslations } from "next-intl/server";

const Footer = async () => {
  const t = await getTranslations("home.footer");
  const columns = [
    { title: t("shop.title"), items: ["routine", "makeup", "body", "gifts"] as const },
    { title: t("company.title"), items: ["story", "partners", "journal", "careers"] as const },
    { title: t("support.title"), items: ["help", "shipping", "privacy", "terms"] as const },
  ];

  return (
    <footer className="border-t border-rose-100/70 bg-white/65 px-4 py-12 backdrop-blur-sm dark:border-rose-400/12 dark:bg-white/4 md:px-6">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-md">
            <p className="font-display text-4xl text-rose-950 dark:text-rose-50">Shea</p>
            <p className="mt-4 text-base leading-7 text-rose-950/68 dark:text-rose-50/68">{t("description")}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((column, index) => (
              <div key={index}>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500 dark:text-rose-200/78">
                  {column.title}
                </p>
                <div className="mt-4 space-y-3">
                  {column.items.map((item) => (
                    <Link
                      key={item}
                      href="/"
                      className="block text-sm text-rose-950/68 transition-colors hover:text-rose-600 dark:text-rose-50/68 dark:hover:text-rose-200"
                    >
                      {t(`${["shop", "company", "support"][index]}.items.${item}`)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-rose-100/80 pt-6 text-sm text-rose-950/60 dark:border-rose-400/12 dark:text-rose-50/60 md:flex-row md:items-center md:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("signature")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
