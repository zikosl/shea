import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const policySections = [
  {
    id: "data-we-collect",
    title: "Information we collect",
    body: "Shea may collect account details, phone or email login data, delivery addresses, beauty preferences, order activity, device information, and support messages. Location data is used only when you allow it, mainly for delivery and nearby service experiences.",
  },
  {
    id: "how-we-use-data",
    title: "How we use information",
    body: "We use information to create accounts, process orders, connect customers with partner stores and drivers, improve product discovery, secure sessions, prevent abuse, send operational updates, and provide customer support.",
  },
  {
    id: "sharing",
    title: "Sharing with partners",
    body: "We share only the information needed to complete the service. Stores may receive order and customer details needed to prepare purchases. Drivers may receive delivery details. We do not sell personal information.",
  },
  {
    id: "security",
    title: "Security",
    body: "We use access controls, token-based authentication, protected backend APIs, and operational safeguards to reduce unauthorized access. No digital service is perfectly secure, but we design Shea to limit risk and protect daily usage.",
  },
  {
    id: "data-retention",
    title: "Retention and deletion",
    body: "We keep information for as long as needed to provide Shea, meet legal or accounting obligations, resolve disputes, and protect the platform. You can request account deletion or correction through the app or by contacting support.",
  },
  {
    id: "rights",
    title: "Your choices",
    body: "You can update profile details, manage permissions on your device, request access or deletion, and opt out of non-essential communications where supported. Essential order and security messages may still be sent.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="marketing-shell min-h-screen px-4 pb-20 pt-32 md:px-6 md:pt-36">
      <div className="container">
        <section className="marketing-card relative overflow-hidden p-6 md:p-10">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-200/60 blur-3xl dark:bg-rose-500/15" />
          <div className="relative max-w-3xl">
            <div className="marketing-kicker">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacy and trust
            </div>
            <h1 className="mt-5 font-display text-5xl leading-tight text-rose-950 dark:text-rose-50 md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-5 text-base leading-8 text-rose-950/68 dark:text-rose-50/72 md:text-lg">
              This policy explains how Shea handles information across the customer app, partner tools, delivery workflow, and admin platform.
            </p>
            <p className="mt-4 text-sm font-medium text-rose-950/55 dark:text-rose-50/55">
              Effective date: April 10, 2026
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.35fr_0.65fr]">
          <aside className="marketing-card h-fit p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500 dark:text-rose-200/78">
              Contents
            </p>
            <nav className="mt-4 space-y-2">
              {policySections.map((section) => (
                <Link
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-2xl px-3 py-2 text-sm text-rose-950/68 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-50/68 dark:hover:bg-white/8 dark:hover:text-rose-100"
                >
                  {section.title}
                </Link>
              ))}
            </nav>
          </aside>

          <div className="space-y-5">
            {policySections.map((section) => (
              <section key={section.id} id={section.id} className="marketing-card scroll-mt-28 p-6 md:p-7">
                <h2 className="text-2xl font-semibold text-rose-950 dark:text-rose-50">
                  {section.title}
                </h2>
                <p className="mt-3 text-base leading-8 text-rose-950/68 dark:text-rose-50/70">
                  {section.body}
                </p>
              </section>
            ))}

            <section className="marketing-card p-6 md:p-7">
              <h2 className="text-2xl font-semibold text-rose-950 dark:text-rose-50">Contact</h2>
              <p className="mt-3 text-base leading-8 text-rose-950/68 dark:text-rose-50/70">
                For privacy questions, account requests, or deletion requests, contact us at{" "}
                <a href="mailto:support@shea.openzey.com" className="font-semibold text-rose-600 underline underline-offset-4 dark:text-rose-200">
                  support@shea.openzey.com
                </a>
                .
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
