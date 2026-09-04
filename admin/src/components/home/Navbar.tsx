"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import SelectLanguage from "@/components/language";
import styles from "./landing-system.module.css";

const links = [
  { href: "#features", key: "features" },
  { href: "#workspace", key: "download" },
  { href: "/privacy", key: "privacy" },
] as const;

const subscribeToMount = () => () => {};

export default function Navbar() {
  const t = useTranslations("home.navbar");
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ""}`}>
      <div className={styles.container}>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link href="/" className={styles.brand} aria-label="Shea home">
            <span className={styles.brandMark}>
              <Image src="/mini_logo.png" alt="" width={25} height={25} priority />
            </span>
            <span>
              <span className={styles.brandName}>Shea</span>
              <span className={styles.brandTagline}>{t("tagline")}</span>
            </span>
          </Link>

          <div className={styles.navLinks}>
            {links.map((link) => (
              <Link key={link.key} href={link.href} className={styles.navLink}>
                {t(link.key)}
              </Link>
            ))}
          </div>

          <div className={styles.navActions}>
            <SelectLanguage triggerClassName={styles.languageTrigger} />
            {mounted ? (
              <button
                type="button"
                className={styles.iconButton}
                onClick={toggleTheme}
                aria-label={t("themeToggle")}
              >
                {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            ) : null}
            <Link href="/login" className={styles.navCta}>
              {t("cta")}
            </Link>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setIsOpen((value) => !value)}
              aria-expanded={isOpen}
              aria-label={t("menu")}
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        <div className={`${styles.mobilePanel} ${isOpen ? "" : styles.mobilePanelClosed}`}>
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setIsOpen(false)}
            >
              {t(link.key)}
            </Link>
          ))}
          <Link href="/login" className={styles.navCta} onClick={() => setIsOpen(false)}>
            {t("cta")}
          </Link>
        </div>
      </div>
    </header>
  );
}
