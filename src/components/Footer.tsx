"use client";

import Link from "next/link";
import { useConsent } from "./consent/ConsentContext";

export default function Footer({ dark = false }: { dark?: boolean }) {
  const { openPreferences } = useConsent();

  return (
    <footer
      className={`border-t ${dark ? "border-term-border bg-term-bg" : "border-hairline bg-paper"}`}
    >
      <div
        className={`mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 ${
          dark ? "text-term-fg-dim" : "text-ink-faint"
        }`}
      >
        <p>© {new Date().getFullYear()} Adrian Vela</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/privacy"
            className={dark ? "hover:text-term-fg" : "hover:text-ink-muted"}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className={dark ? "hover:text-term-fg" : "hover:text-ink-muted"}
          >
            Terms
          </Link>
          <button
            type="button"
            onClick={openPreferences}
            className={dark ? "hover:text-term-fg" : "hover:text-ink-muted"}
          >
            Cookie preferences
          </button>
        </nav>
      </div>
    </footer>
  );
}
