"use client";

import { useCallback, useState } from "react";
import Overview from "./overview/Overview";
import Terminal from "./terminal/Terminal";
import Link from "next/link";
import Footer from "./Footer";

export type View = "overview" | "terminal";

export default function PortfolioApp({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);

  const goTo = useCallback((next: View) => {
    setView(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next === "overview") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", next);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);

  return (
    <div
      className={`flex min-h-dvh flex-col transition-colors duration-300 ${
        view === "terminal" ? "bg-term-bg" : ""
      }`}
    >
      <ViewSwitcher view={view} onChange={goTo} />

      <main className="flex-1">
        <div hidden={view !== "overview"}>
          <Overview onOpenTerminal={() => goTo("terminal")} />
        </div>
        <div
          hidden={view !== "terminal"}
          className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-0 pb-6 pt-4 sm:px-6"
        >
          <Terminal
            active={view === "terminal"}
            onGoHome={() => goTo("overview")}
          />
        </div>
      </main>

      <Footer dark={view === "terminal"} />
    </div>
  );
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  const isTerminal = view === "terminal";

  return (
    <header
      className={`sticky top-0 z-10 border-b transition-colors ${
        isTerminal
          ? "border-term-border bg-term-bg"
          : "border-hairline bg-paper/90 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3 sm:px-8">
        <span
          className={`font-mono text-sm ${isTerminal ? "text-term-fg" : "text-ink"}`}
        >
          Adrian Vela
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/lab"
            className={`min-h-11 rounded-full px-3 text-sm font-medium transition-colors flex items-center ${
              isTerminal
                ? "text-term-fg-dim hover:text-term-fg"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Lab
          </Link>
          <nav
            aria-label="View switcher"
            className={`flex items-center gap-1 rounded-full border p-1 ${
              isTerminal ? "border-term-border" : "border-hairline"
            }`}
          >
            <TabButton
              label="Overview"
              active={!isTerminal}
              dark={isTerminal}
              onClick={() => onChange("overview")}
            />
            <TabButton
              label="Terminal"
              active={isTerminal}
              dark={isTerminal}
              onClick={() => onChange("terminal")}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}

function TabButton({
  label,
  active,
  dark,
  onClick,
}: {
  label: string;
  active: boolean;
  dark: boolean;
  onClick: () => void;
}) {
  const base =
    "min-h-11 rounded-full px-4 text-sm font-medium transition-colors flex items-center";
  const activeClass = dark
    ? "bg-term-accent/15 text-term-accent"
    : "bg-ink text-paper";
  const inactiveClass = dark
    ? "text-term-fg-dim hover:text-term-fg"
    : "text-ink-muted hover:text-ink";

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${base} ${active ? activeClass : inactiveClass}`}
    >
      {label}
    </button>
  );
}
