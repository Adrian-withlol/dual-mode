import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center px-6 sm:px-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-base text-ink-muted sm:text-lg">
          Whatever you were looking for isn&apos;t at this address. It might
          have moved, or the link might be off.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-sm text-paper transition-colors hover:bg-accent-strong"
        >
          ← Back to the portfolio
        </Link>
      </div>
      <Footer />
    </div>
  );
}
