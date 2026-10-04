"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Check, ExternalLink, Mail, MonitorDown, Smartphone, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestTestFlightInvite } from "./actions";
import styles from "./bio.module.css";

const partnerUrl = "https://play.google.com/store/apps/details?id=com.zastroslimi.sheapartner";
const posUrl = "https://shea.openzey.com/api/pos/download";
const testFlightUrl = "https://apps.apple.com/app/testflight/id899247664";

export function BioPage() {
  const t = useTranslations("home.bio");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [guideOnly, setGuideOnly] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const result = await requestTestFlightInvite(email, website);
    setSubmitting(false);
    if (result.ok) { setSubmitted(true); return; }
    setError(t(`errors.${result.reason || "unavailable"}`));
  }

  return <div className={styles.page}>
    <section className={styles.shell} aria-labelledby="bio-title">
      <div className={styles.hero}>
        <span className={styles.logo}><Image src="/mini_logo.png" alt="" width={40} height={40} priority /></span>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 id="bio-title" className={styles.title}>{t("title")}</h1>
        <p className={styles.intro}>{t("intro")}</p>
      </div>

      <div className={styles.links} aria-label={t("linksLabel")}>
        <button type="button" className={`${styles.linkCard} ${styles.featured}`} onClick={() => setOpen(true)}>
          <span className={styles.linkIcon}><Smartphone size={21} /></span><span className={styles.linkCopy}><strong>{t("iphone.title")}</strong><small>{t("iphone.description")}</small></span><ArrowRight size={18} className={styles.arrow} aria-hidden="true" />
        </button>
        <a href={partnerUrl} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIcon}><Store size={21} /></span><span className={styles.linkCopy}><strong>{t("partner.title")}</strong><small>{t("partner.description")}</small></span><ExternalLink size={18} className={styles.arrow} aria-hidden="true" />
        </a>
        <a href={posUrl} className={styles.linkCard}>
          <span className={styles.linkIcon}><MonitorDown size={21} /></span><span className={styles.linkCopy}><strong>{t("pos.title")}</strong><small>{t("pos.description")}</small></span><ArrowDownToLine size={18} className={styles.arrow} aria-hidden="true" />
        </a>
      </div>

      <button type="button" className={styles.guideLink} onClick={() => { setGuideOnly(true); setOpen(true); }}>{t("guide.reopen")}</button>
      <div className={styles.footnote}><span>{t("footnote")}</span><Link href="/privacy">{t("privacy")}</Link></div>
    </section>

    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setSubmitted(false); setGuideOnly(false); setError(""); setEmail(""); } }}>
      <DialogContent className={styles.dialog}>
        <DialogHeader><span className={styles.dialogIcon}><Mail size={20} /></span><DialogTitle className={styles.dialogTitle}>{submitted ? t("success.title") : guideOnly ? t("guide.title") : t("modal.title")}</DialogTitle><DialogDescription className={styles.dialogDescription}>{submitted ? t("success.description") : guideOnly ? t("guide.description") : t("modal.description")}</DialogDescription></DialogHeader>
        {submitted || guideOnly ? <div className={styles.guide}>
          {submitted ? <p className={styles.guideHeading}>{t("guide.title")}</p> : null}
          <ol>
            <li><span>1</span><div>{t("guide.install")} <a href={testFlightUrl} target="_blank" rel="noopener noreferrer">{t("guide.openTestFlight")}</a></div></li>
            <li><span>2</span><div>{t("guide.email")}</div></li>
            <li><span>3</span><div>{t("guide.test")}</div></li>
          </ol>
          <p className={styles.guideNote}><Check size={15} />{t("guide.note")}</p>
        </div> : <form onSubmit={(event) => void submit(event)} className={styles.form}>
          <label htmlFor="testflight-email">{t("modal.emailLabel")}</label>
          <input id="testflight-email" type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={254} className={styles.input} aria-describedby="testflight-help testflight-error" />
          <p id="testflight-help" className={styles.help}>{t("modal.emailHelp")}</p>
          <div className={styles.honeypot} aria-hidden="true"><label htmlFor="testflight-website">Website</label><input id="testflight-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
          {error ? <p id="testflight-error" role="alert" className={styles.error}>{error}</p> : null}
          <button type="submit" disabled={submitting} className={styles.submit}>{submitting ? t("modal.submitting") : t("modal.submit")}<ArrowRight size={17} /></button>
          <p className={styles.privacyNote}>{t("modal.privacyBefore")} <Link href="/privacy">{t("privacy")}</Link>.</p>
        </form>}
      </DialogContent>
    </Dialog>
  </div>;
}
