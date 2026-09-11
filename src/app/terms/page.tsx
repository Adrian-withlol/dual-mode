import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for Adrian Vela's personal portfolio site.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "September 11, 2026";

export default function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-ink-muted">
          <section>
            <p>
              This site is Adrian Vela&apos;s personal, non-commercial portfolio —
              a place to share background, current work, and projects as a
              mechanical engineering student. It isn&apos;t a business or paid
              service, and these terms are written with that in mind.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">Content</h2>
            <p>
              The text, design, and code of this site belong to Adrian Vela
              unless stated otherwise. You&apos;re welcome to read, link to, and
              share this site. Please don&apos;t copy the content and present it
              as your own.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              Accuracy of information
            </h2>
            <p>
              Everything on this site — background, skills, projects,
              education, and experience — is described as accurately and
              honestly as possible, including being explicit about what&apos;s
              still in progress or not yet documented. That said, this is a
              personal site provided &quot;as is,&quot; without warranties of
              any kind, and without guarantees about uptime, completeness, or
              that it&apos;s free of errors.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              The interactive terminal
            </h2>
            <p>
              The terminal on this site is a self-contained interface for
              browsing the same content as the overview page through
              commands. It does not execute real shell commands, does not
              access your device beyond normal web-page behavior, and does
              not currently connect to any AI or third-party service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              Acceptable use
            </h2>
            <p>
              Please don&apos;t attempt to disrupt, scrape abusively, or probe
              this site for vulnerabilities. Normal browsing, sharing links,
              and viewing the public source on GitHub are all welcome.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">
              Links to other sites
            </h2>
            <p>
              This site links to external services (currently GitHub and
              LinkedIn). Those sites are outside Adrian&apos;s control and are
              governed by their own terms and privacy policies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-ink">Changes</h2>
            <p>
              These terms may be updated as the site changes. The date above
              reflects the last update.
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
