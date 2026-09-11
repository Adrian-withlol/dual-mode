"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  aboutText,
  educationText,
  experienceText,
  getCompletions,
  helpText,
  projectsText,
  skillsText,
} from "./commands";
import { streamAsk } from "./ask-stream";

type LineKind = "input" | "output" | "error" | "system" | "ai";

interface TerminalLine {
  id: number;
  kind: LineKind;
  text: string;
}

const WELCOME = [
  "Adrian Vela — interactive portfolio terminal.",
  "Type 'help' to see everything you can do, or tap a command below.",
].join("\n");

const MOBILE_SHORTCUTS = [
  "help",
  "about",
  "skills",
  "projects",
  "education",
  "experience",
  "ask",
  "clear",
  "home",
];

let lineCounter = 0;
function nextId() {
  lineCounter += 1;
  return lineCounter;
}

export default function Terminal({
  active,
  onGoHome,
}: {
  active: boolean;
  onGoHome: () => void;
}) {
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    { id: nextId(), kind: "system", text: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const historyIndexRef = useRef<number | null>(null);
  const draftBeforeHistoryRef = useRef("");

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const appendLine = useCallback((kind: LineKind, text: string) => {
    setLines((prev) => [...prev, { id: nextId(), kind, text }]);
  }, []);

  const appendMutableLine = useCallback((kind: LineKind, initialText: string) => {
    const id = nextId();
    setLines((prev) => [...prev, { id, kind, text: initialText }]);
    return (updater: (prevText: string) => string, nextKind?: LineKind) => {
      setLines((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, text: updater(l.text), kind: nextKind ?? l.kind }
            : l
        )
      );
    };
  }, []);

  const runAsk = useCallback(
    async (question: string) => {
      if (!question) {
        appendLine("error", "Usage: ask [question] — try: ask what is he studying?");
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      const setAiText = appendMutableLine("ai", "Thinking…");
      let firstDelta = true;

      try {
        for await (const evt of streamAsk(question, controller.signal)) {
          if (evt.event === "delta") {
            if (firstDelta) {
              firstDelta = false;
              setAiText(() => evt.data.text);
            } else {
              setAiText((prev) => prev + evt.data.text);
            }
          } else if (evt.event === "error") {
            if (firstDelta) {
              setAiText(() => evt.data.message, "error");
            } else {
              appendLine("error", evt.data.message);
            }
          } else if (evt.event === "done") {
            if (firstDelta) {
              setAiText(() => "(No response received.)");
            }
          }
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [appendLine, appendMutableLine]
  );

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      appendLine("input", raw);

      if (!trimmed) return;

      setHistory((prev) => [...prev, trimmed]);
      historyIndexRef.current = null;

      const spaceIdx = trimmed.indexOf(" ");
      const cmd = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
      const arg = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

      switch (cmd) {
        case "help":
          appendLine("output", helpText());
          break;
        case "about":
          appendLine("output", aboutText());
          break;
        case "skills":
          appendLine("output", skillsText());
          break;
        case "projects":
          appendLine("output", projectsText());
          break;
        case "education":
          appendLine("output", educationText());
          break;
        case "experience":
          appendLine("output", experienceText());
          break;
        case "ask":
          await runAsk(arg);
          break;
        case "clear":
          setLines([]);
          break;
        case "home":
          appendLine("system", "Returning to overview…");
          onGoHome();
          break;
        default:
          appendLine(
            "error",
            `Command not found: "${cmd}". Type 'help' for a list of commands.`
          );
      }
    },
    [appendLine, onGoHome, runAsk]
  );

  const submit = useCallback(() => {
    if (isStreaming) return;
    const value = input;
    setInput("");
    void runCommand(value);
  }, [input, isStreaming, runCommand]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const navigateHistory = useCallback(
    (direction: -1 | 1) => {
      if (history.length === 0) return;
      const prevIndex = historyIndexRef.current;

      if (prevIndex === null) {
        if (direction !== -1) return;
        draftBeforeHistoryRef.current = input;
        const idx = history.length - 1;
        historyIndexRef.current = idx;
        setInput(history[idx]);
        return;
      }

      const nextIndex = prevIndex + direction;
      if (nextIndex < 0) return;
      if (nextIndex >= history.length) {
        historyIndexRef.current = null;
        setInput(draftBeforeHistoryRef.current);
        return;
      }
      historyIndexRef.current = nextIndex;
      setInput(history[nextIndex]);
    },
    [history, input]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateHistory(-1);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateHistory(1);
        return;
      }

      if (e.key === "Escape") {
        if (isStreaming) {
          e.preventDefault();
          stopStreaming();
        }
        return;
      }

      if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
        if (isStreaming) {
          e.preventDefault();
          stopStreaming();
        }
        // Otherwise let the browser handle Ctrl+C (e.g. copy selection) normally.
        return;
      }

      if (e.key === "Tab") {
        // Only autocomplete the first word; don't trap focus otherwise —
        // if there's nothing to complete, let Tab move focus as normal.
        if (input.includes(" ")) return;
        const matches = getCompletions(input);
        if (matches.length === 1) {
          e.preventDefault();
          setInput(`${matches[0]} `);
        } else if (matches.length > 1) {
          e.preventDefault();
          appendLine("system", `Possible completions: ${matches.join(", ")}`);
        }
        // matches.length === 0: fall through, Tab moves focus normally.
      }
    },
    [appendLine, input, isStreaming, navigateHistory, stopStreaming, submit]
  );

  const runShortcut = useCallback(
    (name: string) => {
      inputRef.current?.focus();
      if (name === "ask") {
        setInput("ask ");
        return;
      }
      setInput("");
      void runCommand(name);
    },
    [runCommand]
  );

  return (
    <div className="flex h-full min-h-[70vh] flex-col overflow-hidden rounded-none border-0 border-term-border bg-term-bg text-term-fg sm:min-h-[75vh] sm:rounded-xl sm:border">
      <div className="flex items-center gap-2 border-b border-term-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#e2726b]/70" />
        <span className="h-3 w-3 rounded-full bg-[#e8c468]/70" />
        <span className="h-3 w-3 rounded-full bg-term-accent/70" />
        <span className="ml-3 font-mono text-xs text-term-fg-dim">
          adrian@portfolio — terminal
        </span>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-label="Terminal session output"
        aria-live="polite"
        className="term-scrollbar flex-1 overflow-y-auto px-4 py-4 font-mono text-sm leading-relaxed"
      >
        {lines.map((line) => (
          <LineView key={line.id} line={line} />
        ))}
      </div>

      <div className="border-t border-term-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="select-none font-mono text-sm text-term-accent">
            $
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Terminal command input"
            placeholder={
              isStreaming
                ? "Streaming a response — press Esc or Ctrl+C to stop"
                : "Type a command, e.g. help"
            }
            disabled={false}
            readOnly={isStreaming}
            className="flex-1 bg-transparent font-mono text-sm text-term-fg placeholder:text-term-fg-dim focus:outline-none"
          />
          {isStreaming && (
            <button
              type="button"
              onClick={stopStreaming}
              className="rounded border border-term-border px-2 py-1 font-mono text-xs text-term-fg-dim hover:border-term-accent-dim hover:text-term-fg"
            >
              Stop
            </button>
          )}
        </div>

        <div
          className="term-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1"
          aria-label="Command shortcuts"
        >
          {MOBILE_SHORTCUTS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => runShortcut(name)}
              className="shrink-0 rounded-full border border-term-border px-3 py-1 font-mono text-xs text-term-fg-dim transition-colors hover:border-term-accent-dim hover:text-term-fg"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineView({ line }: { line: TerminalLine }) {
  if (line.kind === "input") {
    return (
      <div className="whitespace-pre-wrap break-words">
        <span className="text-term-accent">$ </span>
        <span className="text-term-fg">{line.text}</span>
      </div>
    );
  }

  const toneClass =
    line.kind === "error"
      ? "text-[#e2726b]"
      : line.kind === "system"
        ? "text-term-fg-dim"
        : line.kind === "ai"
          ? "text-term-fg"
          : "text-term-fg";

  return (
    <div className={`mb-2 whitespace-pre-wrap break-words ${toneClass}`}>
      {line.kind === "ai" && (
        <span className="mr-1 text-term-accent">ai&gt;</span>
      )}
      {line.text}
    </div>
  );
}
