"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import SelectLanguage from "../language";

const links = [
  { href: "#features", key: "features" },
  { href: "#products", key: "products" },
  { href: "#testimonials", key: "testimonials" },
  { href: "#download", key: "download" },
] as const;

const Navbar = () => {
  const t = useTranslations("home.navbar");
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? "px-3 pt-3" : "px-3 pt-5"
      }`}
    >
      <div className="container">
        <div
          className={`mx-auto flex items-center justify-between rounded-full border border-white/60 bg-white/75 px-4 py-3 shadow-[0_24px_60px_-36px_rgba(166,74,116,0.38)] backdrop-blur-xl transition-all dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_-36px_rgba(8,4,18,0.8)] md:px-6 ${
            isScrolled ? "max-w-6xl" : "max-w-[72rem]"
          }`}
        >
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 shadow-[0_18px_36px_-20px_rgba(239,68,124,0.8)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-2xl leading-none text-rose-950 dark:text-rose-50">Shea</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-rose-500 dark:text-rose-200/80">
                {t("tagline")}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-sm font-medium text-rose-950/78 transition-colors hover:text-rose-600 dark:text-rose-50/82 dark:hover:text-rose-200"
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <SelectLanguage />
            {mounted ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={t("themeToggle")}
                className="bg-white/70 text-rose-700 hover:bg-rose-50 dark:bg-white/8 dark:text-rose-100 dark:hover:bg-white/12"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            ) : null}
            <Button asChild className="bg-rose-500 hover:bg-rose-600">
              <Link href="/login">{t("cta")}</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <SelectLanguage />
            {mounted ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={t("themeToggle")}
                className="bg-white/70 text-rose-700 hover:bg-rose-50 dark:bg-white/8 dark:text-rose-100 dark:hover:bg-white/12"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen((value) => !value)}
              aria-label={t("menu")}
              className="bg-white/70 text-rose-700 hover:bg-rose-50 dark:bg-white/8 dark:text-rose-100 dark:hover:bg-white/12"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div
          className={`mt-3 overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_24px_60px_-36px_rgba(166,74,116,0.38)] backdrop-blur-xl transition-all dark:border-white/10 dark:bg-[#1b1119]/92 dark:shadow-[0_24px_60px_-36px_rgba(8,4,18,0.85)] md:hidden ${
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-2 p-4">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-rose-950 transition-colors hover:bg-rose-50 dark:text-rose-50 dark:hover:bg-white/8"
                onClick={() => setIsOpen(false)}
              >
                {t(link.key)}
              </Link>
            ))}
            <Button asChild className="mt-2 w-full bg-rose-500 hover:bg-rose-600">
              <Link href="/login" onClick={() => setIsOpen(false)}>
                {t("cta")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
