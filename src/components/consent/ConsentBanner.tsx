"use client";

import Link from "next/link";
import { useConsent } from "./ConsentContext";

export default function ConsentBanner() {
  const { bannerOpen, accept, reject } = useConsent();

  if (!bannerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-paper-raised px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          This site can use optional, privacy-friendly analytics (page views
          only — no ads, no tracking cookies) to help me understand what&apos;s
          useful. It stays off until you choose. See the{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 text-accent-strong hover:text-accent"
          >
            privacy policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={reject}
            className="flex-1 rounded-md border border-ink-faint px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink sm:flex-none"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={accept}
            className="flex-1 rounded-md border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent-strong hover:border-accent-strong sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
