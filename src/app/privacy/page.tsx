import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What this site collects, what it doesn't, and how cookie consent and optional analytics work.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "September 11, 2026";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20 pt-14 sm:px-8 sm:pt-20">
        <Link
          href="/"
          className="mb-10 inline-block text-sm text-ink-faint underline underline-offset-4 hover:text-ink-muted"
        >
          ← Back to portfolio
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-ink-muted">
          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">The short version</h2>
            <p>
              This is a personal portfolio for Adrian Vela, a mechanical
              engineering student. There is no account system, no database, and
              no AI or chat feature on this site. The only thing stored is a
              single cookie that remembers your cookie preference, and —
              only if you accept — anonymous, aggregate page-view analytics.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">Cookies</h2>
            <p>
              This site sets exactly one first-party cookie,{" "}
              <code className="font-mono text-sm">cookie-consent</code>, which
              stores whether you accepted or rejected optional analytics. It
              lasts up to 180 days and contains no personal information — just
              the word &quot;accepted&quot; or &quot;rejected&quot;. No
              third-party or advertising cookies are set by this site.
            </p>
            <p className="mt-3">
              You can change your choice at any time using{" "}
              <span className="italic">Cookie preferences</span> in the
              footer of any page.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              Optional analytics
            </h2>
            <p>
              If you accept, this site loads Vercel Web Analytics — a
              privacy-focused analytics tool operated by Vercel (this site&apos;s
              host) that is itself cookieless and collects only aggregate,
              anonymized metrics such as page path, referrer, approximate
              (country-level) location, and device type. It does not collect
              names, email addresses, or any other personal identifier, and
              it is never loaded before you accept. Only I (the site owner)
              can view this data, through my own Vercel dashboard. See{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-4 hover:text-accent-strong"
              >
                Vercel&apos;s privacy policy
              </a>{" "}
              for how Vercel itself handles that data.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              What this site does not do
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>No account creation, login, or password storage.</li>
              <li>No forms that collect personal information.</li>
              <li>
                No AI assistant or chat feature — an earlier version of this
                site had one; it has been removed, and this policy will be
                updated first if that ever changes.
              </li>
              <li>No advertising or third-party tracking scripts.</li>
              <li>No selling or sharing of data with third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              Hosting &amp; standard server logs
            </h2>
            <p>
              This site is hosted on Vercel. Like virtually any web host,
              Vercel&apos;s infrastructure may keep standard technical logs (e.g.
              IP address, request timing) as part of normal operation and
              security. This site does not access, export, or build any
              profile from those logs — see Vercel&apos;s own privacy policy
              (linked above) for their infrastructure-level practices.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              External links
            </h2>
            <p>
              This site links out to GitHub and LinkedIn. Those are
              independent services with their own privacy policies — this
              policy only covers this portfolio site itself.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">Children</h2>
            <p>
              This site is a general-audience personal portfolio and is not
              directed at children.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              Changes to this policy
            </h2>
            <p>
              If what this site collects changes, this page will be updated
              and the date above will change accordingly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">Questions</h2>
            <p>
              Reach out via the GitHub or LinkedIn links on the{" "}
              <Link
                href="/"
                className="underline underline-offset-4 hover:text-accent-strong"
              >
                overview page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
