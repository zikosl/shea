import {
  BarChart3,
  Boxes,
  Building2,
  PackageSearch,
  Route,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import styles from "./landing-system.module.css";

const features = [
  { key: "diagnosis", icon: Boxes, size: "wide", visual: "catalog" },
  { key: "pairing", icon: Building2, size: "narrow", visual: "partners" },
  { key: "rituals", icon: BarChart3, size: "third", visual: "chart" },
  { key: "community", icon: PackageSearch, size: "third", visual: "approval" },
  { key: "delivery", icon: Route, size: "third", visual: "route" },
] as const;

function FeatureVisual({ type }: { type: (typeof features)[number]["visual"] }) {
  if (type === "catalog") {
    return (
      <div className={styles.catalogVisual} aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div className={styles.productTile} key={item}>
            <div className={styles.productThumb} />
            <div className={styles.productLine} />
            <div className={styles.productLineShort} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "partners" || type === "approval") {
    const rows = type === "partners"
      ? [["GL", "Glow Lab", "Active"], ["MN", "Maison N", "Active"], ["BL", "Bloom", "Review"]]
      : [["01", "New catalog request", "Review"], ["02", "Variant matched", "Ready"], ["03", "Brand verified", "Ready"]];

    return (
      <div className={styles.partnerVisual} aria-hidden="true">
        {rows.map(([initials, name, state]) => (
          <div className={styles.partnerRow} key={name}>
            <span className={styles.partnerAvatar}>{initials}</span>
            <span className={styles.partnerName}>{name}</span>
            <span className={styles.partnerState}>{state}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <svg className={styles.miniChart} viewBox="0 0 300 105" aria-hidden="true">
        <path d="M0 92 C35 85 44 52 78 65 S133 83 164 42 S218 58 250 27 S280 18 300 10" fill="none" stroke="var(--lp-accent)" strokeWidth="3" strokeLinecap="round" />
        <path d="M0 92 C35 85 44 52 78 65 S133 83 164 42 S218 58 250 27 S280 18 300 10 L300 105 L0 105 Z" fill="var(--lp-accent-soft)" opacity=".65" />
      </svg>
    );
  }

  return (
    <div className={styles.routeVisual} aria-hidden="true">
      <span className={`${styles.routeDot} ${styles.routeStart}`} />
      <span className={`${styles.routeDot} ${styles.routeEnd}`} />
    </div>
  );
}

export default async function Features() {
  const t = await getTranslations("home.features");

  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{t("eyebrow")}</p>
            <h2 className={styles.sectionTitle}>{t("title")}</h2>
          </div>
          <p className={styles.sectionDescription}>{t("description")}</p>
        </div>

        <div className={styles.bento}>
          {features.map(({ key, icon: Icon, size, visual }) => (
            <article
              key={key}
              className={`${styles.featureCard} ${
                size === "wide" ? styles.featureWide : size === "narrow" ? styles.featureNarrow : styles.featureThird
              }`}
            >
              <span className={styles.featureIcon}><Icon size={19} /></span>
              <h3 className={styles.featureTitle}>{t(`items.${key}.title`)}</h3>
              <p className={styles.featureDescription}>{t(`items.${key}.description`)}</p>
              <FeatureVisual type={visual} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
