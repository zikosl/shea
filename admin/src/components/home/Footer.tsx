import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import styles from "./landing-system.module.css";

const columns = [
  { key: "shop", items: ["routine", "makeup", "body", "gifts"] },
  { key: "company", items: ["story", "partners", "journal", "careers"] },
  { key: "support", items: ["help", "shipping", "privacy", "terms"] },
] as const;

const resolveHref = (item: string) => {
  if (item === "privacy") return "/privacy";
  if (item === "terms") return "/privacy#data-retention";
  if (item === "partners") return "#workspace";
  return "#features";
};

export default async function Footer() {
  const t = await getTranslations("home.footer");

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div>
            <Link href="/" className={styles.brand} aria-label="Shea home">
              <span className={styles.brandMark}>
                <Image src="/mini_logo.png" alt="" width={25} height={25} />
              </span>
              <span className={styles.brandName}>Shea</span>
            </Link>
            <p className={styles.footerDescription}>{t("description")}</p>
          </div>

          <div className={styles.footerColumns}>
            {columns.map((column) => (
              <div key={column.key}>
                <p className={styles.footerHeading}>{t(`${column.key}.title`)}</p>
                <div className={styles.footerLinks}>
                  {column.items.map((item) => (
                    <Link key={item} href={resolveHref(item)} className={styles.footerLink}>
                      {t(`${column.key}.items.${item}`)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("signature")}</p>
        </div>
      </div>
    </footer>
  );
}
