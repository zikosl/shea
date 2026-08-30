import Link from "next/link";
import { ArrowRight, Bike, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import styles from "./landing-system.module.css";

const apps = [
  { key: "client", icon: ShoppingBag },
  { key: "partner", icon: Store },
  { key: "rider", icon: Bike },
  { key: "admin", icon: ShieldCheck },
] as const;

export default async function AppDownload() {
  const t = await getTranslations("home.download");

  return (
    <>
      <section id="workspace" className={styles.workflowSection}>
        <div className={styles.container}>
          <div className={styles.workflowPanel}>
            <div className={styles.workflowGrid}>
              <div className={styles.workflowCopy}>
                <div>
                  <p className={styles.eyebrow}>{t("eyebrow")}</p>
                  <h2 className={styles.workflowTitle}>{t("title")}</h2>
                  <p className={styles.workflowDescription}>{t("description")}</p>
                  <div className={styles.workflowActions}>
                    <Link href="/login" className={styles.primaryButton}>
                      {t("appStore")}
                      <ArrowRight size={16} />
                    </Link>
                    <Link href="/privacy" className={styles.secondaryButton}>
                      {t("playStore")}
                    </Link>
                  </div>
                </div>
              </div>

              <div className={styles.appStack}>
                {apps.map(({ key, icon: Icon }) => (
                  <article className={styles.appCard} key={key}>
                    <span className={styles.appIcon}><Icon size={19} /></span>
                    <div>
                      <h3 className={styles.appName}>{t(`apps.${key}.title`)}</h3>
                      <p className={styles.appDescription}>{t(`apps.${key}.description`)}</p>
                    </div>
                    <span className={styles.appState}>
                      <span className={styles.trustDot} />
                      {t("connected")}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaCopy}>
              <p className={styles.eyebrow}>{t("cta.eyebrow")}</p>
              <h2 className={styles.ctaTitle}>{t("cta.title")}</h2>
            </div>
            <div className={styles.ctaAction}>
              <Link href="/login" className={styles.primaryButton}>
                {t("cta.button")}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
