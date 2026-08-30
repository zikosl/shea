import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  LayoutDashboard,
  Package,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import styles from "./landing-system.module.css";

const trustItems = ["personalization", "rituals", "delivery"] as const;
const metrics = ["revenue", "orders", "fulfillment"] as const;
const orders = ["one", "two", "three"] as const;
const stats = ["glowPlans", "consultants", "satisfaction"] as const;

export default async function Hero() {
  const t = await getTranslations("home.hero");

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{t("eyebrow")}</p>
              <h1 className={styles.heroTitle}>
                {t("titleLead")} <em>{t("titleAccent")}</em> {t("titleTail")}
              </h1>
              <p className={styles.heroDescription}>{t("description")}</p>

              <div className={styles.heroActions}>
                <Link href="/login" className={styles.primaryButton}>
                  {t("primaryCta")}
                  <ArrowRight size={16} />
                </Link>
                <Link href="#features" className={styles.secondaryButton}>
                  {t("secondaryCta")}
                </Link>
              </div>

              <div className={styles.trustRow}>
                {trustItems.map((item) => (
                  <span key={item} className={styles.trustItem}>
                    <span className={styles.trustDot} />
                    {t(`trust.${item}`)}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.consoleWrap} aria-label={t("imageAlt")}>
              <div className={styles.consoleGlow} />
              <div className={styles.console}>
                <div className={styles.consoleTopbar}>
                  <span className={styles.consoleDots}><i /><i /><i /></span>
                  <span className={styles.consoleStatus}>
                    <Activity size={12} />
                    {t("console.live")}
                  </span>
                </div>
                <div className={styles.consoleBody}>
                  <aside className={styles.consoleRail} aria-hidden="true">
                    <span className={styles.railLogo}>S</span>
                    <span className={`${styles.railItem} ${styles.railItemActive}`}><LayoutDashboard size={16} /></span>
                    <span className={styles.railItem}><Package size={16} /></span>
                    <span className={styles.railItem}><Store size={16} /></span>
                    <span className={styles.railItem}><Truck size={16} /></span>
                    <span className={styles.railItem}><Users size={16} /></span>
                  </aside>

                  <div className={styles.consoleMain}>
                    <div className={styles.consoleHeading}>
                      <div>
                        <p className={styles.consoleKicker}>{t("console.label")}</p>
                        <p className={styles.consoleTitle}>{t("console.title")}</p>
                      </div>
                      <span className={styles.consoleFilter}>{t("console.period")}</span>
                    </div>

                    <div className={styles.metricGrid}>
                      {metrics.map((metric) => (
                        <div className={styles.metricCard} key={metric}>
                          <p className={styles.metricLabel}>{t(`console.metrics.${metric}.label`)}</p>
                          <p className={styles.metricValue}>
                            {t(`console.metrics.${metric}.value`)}
                            <span className={styles.metricTrend}>{t(`console.metrics.${metric}.trend`)}</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className={styles.chartCard}>
                      <div className={styles.chartHeader}>
                        <span>{t("console.chart")}</span>
                        <BarChart3 size={13} />
                      </div>
                      <svg className={styles.chart} viewBox="0 0 420 112" role="img" aria-label={t("console.chart")}>
                        <defs>
                          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--lp-accent)" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="var(--lp-accent)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path className={styles.chartArea} d="M0 96 C38 90 48 70 80 74 S132 88 164 61 S220 67 250 41 S310 54 340 28 S387 27 420 8 L420 112 L0 112 Z" />
                        <path className={styles.chartLine} d="M0 96 C38 90 48 70 80 74 S132 88 164 61 S220 67 250 41 S310 54 340 28 S387 27 420 8" />
                      </svg>
                    </div>

                    <div className={styles.orderList}>
                      {orders.map((order) => (
                        <div className={styles.orderRow} key={order}>
                          <div>
                            <p className={styles.orderCustomer}>{t(`console.orders.${order}.customer`)}</p>
                            <p className={styles.orderMeta}>{t(`console.orders.${order}.meta`)}</p>
                          </div>
                          <span className={styles.orderAmount}>{t(`console.orders.${order}.amount`)}</span>
                          <span className={styles.statusBadge}>{t(`console.orders.${order}.status`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.floatingSignal}>
                <p className={styles.signalTop}><Activity size={12} /> {t("floatingCard.eyebrow")}</p>
                <p className={styles.signalText}>{t("floatingCard.title")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.proof} aria-label={t("proofLabel")}>
        <div className={`${styles.container} ${styles.proofInner}`}>
          <p className={styles.proofIntro}>{t("proofLabel")}</p>
          {stats.map((stat) => (
            <div key={stat} className={styles.proofStat}>
              <p className={styles.proofValue}>{t(`stats.${stat}.value`)}</p>
              <p className={styles.proofLabel}>{t(`stats.${stat}.label`)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
