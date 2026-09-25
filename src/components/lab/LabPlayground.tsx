"use client";

import { useEffect, useState } from "react";
import ArduinoLab, { decodeShare } from "./ArduinoLab";
import {
  PLAYGROUND_PARTS,
  PLAYGROUND_SKETCHES,
  type LabConfig,
} from "@/lib/arduino/lab";
import { portfolioData } from "@/lib/portfolio-data";
import {
  intervalTimerSketch,
  jingleBellsSketch,
} from "@/lib/sketches/interval-timer";

const STARTER: LabConfig = {
  title: "starter_kit.ino",
  parts: PLAYGROUND_PARTS,
  sketches: [
    ...PLAYGROUND_SKETCHES,
    {
      id: "adrian-timer",
      label: "Adrian's interval timer",
      source: intervalTimerSketch,
      speed: 600,
      note: "The same sketch as the real project. On this kit the button sits on pin 8, so pressing it resets the timer.",
    },
    {
      id: "adrian-jingle",
      label: "Adrian's Jingle Bells lights",
      source: jingleBellsSketch,
      speed: 1,
    },
  ],
};

interface Board {
  id: string;
  name: string;
  config: LabConfig;
}

const BOARDS: Board[] = [
  { id: "starter", name: "Starter kit", config: STARTER },
  ...portfolioData.projects
    .filter((p) => p.lab)
    .map((p) => ({ id: p.id, name: p.name, config: p.lab! })),
];

export default function LabPlayground() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  // Bumped on every URL read so a new share link remounts the lab.
  const [loadId, setLoadId] = useState(0);

  useEffect(() => {
    // Read the URL after hydration, and again if a share link is opened while
    // already on /lab (a hash change doesn't reload the page).
    const readUrl = () => {
      const url = new URL(window.location.href);
      const code = url.hash.startsWith("#code=")
        ? decodeShare(url.hash.slice(6))
        : null;
      const from = url.searchParams.get("from");
      setShared(code);
      setLoadId((n) => n + 1);
      setBoardId(
        code ? "starter" : BOARDS.some((b) => b.id === from) ? from : "starter",
      );
    };
    readUrl();
    window.addEventListener("hashchange", readUrl);
    return () => window.removeEventListener("hashchange", readUrl);
  }, []);

  const board = BOARDS.find((b) => b.id === boardId);

  return (
    <div>
      <div
        className="mb-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Choose a board"
      >
        {BOARDS.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={b.id === boardId}
            onClick={() => {
              setShared(null);
              setBoardId(b.id);
              history.replaceState(
                null,
                "",
                b.id === "starter" ? "/lab" : `/lab?from=${b.id}`,
              );
            }}
            className={`min-h-11 rounded-md border px-4 text-sm transition-colors ${
              b.id === boardId
                ? "border-ink bg-ink text-paper"
                : "border-ink-faint text-ink-muted hover:border-accent hover:text-accent-strong"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>
      {board ? (
        <ArduinoLab
          key={`${board.id}-${loadId}`}
          config={board.config}
          initialCode={shared}
          shareable
          wide
        />
      ) : (
        <div
          className="h-[40rem] animate-pulse rounded-xl border border-term-border bg-term-bg"
          aria-hidden
        />
      )}
    </div>
  );
}
