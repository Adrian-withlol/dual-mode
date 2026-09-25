"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Machine, SketchError, type Hardware } from "@/lib/arduino/interpreter";
import {
  SPEEDS,
  pinName,
  type LabConfig,
  type LedColor,
  type Part,
} from "@/lib/arduino/lab";

const LED_RGB: Record<LedColor, string> = {
  red: "255 72 64",
  yellow: "255 200 60",
  green: "74 222 128",
  blue: "96 165 250",
  white: "235 240 255",
};

const OUTPUT = 1;
const INPUT_PULLUP = 2;
const MAX_SERIAL_LINES = 300;

interface Snapshot {
  out: Record<number, number>;
  modes: Record<number, number>;
  toneOn: boolean;
  time: number;
}

function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function speedLabel(s: number) {
  return `${s}×`;
}

export function encodeShare(code: string): string {
  const bytes = new TextEncoder().encode(code);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(s: string): string | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    return new TextDecoder().decode(
      Uint8Array.from(bin, (c) => c.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}

export default function ArduinoLab({
  config,
  initialSketchId,
  initialCode,
  shareable = false,
  wide = false,
}: {
  config: LabConfig;
  initialSketchId?: string;
  /** Code from a share link; opens as a custom sketch. */
  initialCode?: string | null;
  shareable?: boolean;
  /** Side-by-side editor and serial monitor (full-page lab). */
  wide?: boolean;
}) {
  const first =
    config.sketches.find((s) => s.id === initialSketchId) ?? config.sketches[0];
  const [sketchId, setSketchId] = useState<string>(
    initialCode ? "custom" : first.id,
  );
  const [code, setCode] = useState<string>(initialCode ?? first.source);
  const [appliedCode, setAppliedCode] = useState<string>(
    initialCode ?? first.source,
  );
  const [speed, setSpeed] = useState<number>(initialCode ? 1 : first.speed);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<SketchError | null>(null);
  const [serial, setSerial] = useState<string[]>([]);
  const [snap, setSnap] = useState<Snapshot>({
    out: {},
    modes: {},
    toneOn: false,
    time: 0,
  });
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [tiltUp, setTiltUp] = useState<Record<number, boolean>>({});
  const [pots, setPots] = useState<Record<number, number>>({});
  const [sound, setSound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [ready, setReady] = useState(false);
  const escapedRef = useRef(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const serialRef = useRef<HTMLPreElement>(null);

  // Mutable runtime state lives in refs so the animation loop never goes stale.
  const rt = useRef({
    machine: null as Machine | null,
    virtual: 0,
    last: 0,
    raf: 0,
    running: false,
    speed: speed,
    visible: false,
    out: new Map<number, number>(),
    modes: new Map<number, number>(),
    tone: null as null | { pin: number; freq: number; until: number },
    serialBuf: [] as string[],
    partial: "",
    serialDirty: false,
    lastKey: "",
    lastLit: "",
    audio: null as AudioContext | null,
    osc: null as OscillatorNode | null,
    sound: false,
    inputs: {
      pressed: new Set<number>(),
      tiltUp: {} as Record<number, boolean>,
      pots: {} as Record<number, number>,
    },
  });

  const parts = config.parts;
  const partByPin = useMemo(
    () => new Map(parts.map((p) => [p.pin, p])),
    [parts],
  );

  // Keep input refs in sync with React state.
  useEffect(() => {
    rt.current.inputs.pressed = pressed;
  }, [pressed]);
  useEffect(() => {
    rt.current.inputs.tiltUp = tiltUp;
  }, [tiltUp]);
  useEffect(() => {
    rt.current.inputs.pots = pots;
  }, [pots]);
  useEffect(() => {
    rt.current.speed = speed;
  }, [speed]);

  const stopSound = useCallback(() => {
    const r = rt.current;
    if (r.osc) {
      try {
        r.osc.stop();
      } catch {
        /* already stopped */
      }
      r.osc.disconnect();
      r.osc = null;
    }
  }, []);

  const playSound = useCallback(
    (freq: number) => {
      const r = rt.current;
      if (!r.sound || r.speed !== 1) return;
      try {
        r.audio ??= new AudioContext();
        stopSound();
        const osc = r.audio.createOscillator();
        const gain = r.audio.createGain();
        osc.type = "square";
        osc.frequency.value = Math.max(31, Math.min(8000, freq));
        gain.gain.value = 0.04;
        osc.connect(gain).connect(r.audio.destination);
        osc.start();
        r.osc = osc;
      } catch {
        /* audio unavailable */
      }
    },
    [stopSound],
  );

  useEffect(() => {
    rt.current.sound = sound;
    if (!sound) stopSound();
  }, [sound, stopSound]);

  const hardware = useMemo<Hardware>(() => {
    const r = rt.current;
    const read = (pin: number): number => {
      const part = partByPin.get(pin);
      const inp = r.inputs;
      if (part) {
        switch (part.type) {
          case "button": {
            const down = inp.pressed.has(pin);
            return part.wiring === "pullup" ? (down ? 0 : 1) : down ? 1 : 0;
          }
          case "tilt":
            return inp.tiltUp[pin] === false ? 0 : 1;
          case "pot":
            return (inp.pots[pin] ?? 512) > 511 ? 1 : 0;
          default:
            return (r.out.get(pin) ?? 0) > 0 ? 1 : 0;
        }
      }
      if (r.modes.get(pin) === INPUT_PULLUP) return 1;
      return (r.out.get(pin) ?? 0) > 0 ? 1 : 0;
    };
    return {
      pinMode: (pin, mode) => {
        r.modes.set(pin, mode);
      },
      digitalWrite: (pin, v) => {
        r.out.set(pin, v ? 255 : 0);
      },
      digitalRead: read,
      analogRead: (pin) => {
        const part = partByPin.get(pin);
        if (part?.type === "pot") return Math.round(r.inputs.pots[pin] ?? 512);
        return read(pin) * 1023;
      },
      analogWrite: (pin, v) => {
        r.out.set(pin, v);
      },
      tone: (pin, freq, dur) => {
        r.tone = { pin, freq, until: dur ? r.virtual + dur : Infinity };
        playSound(freq);
      },
      noTone: () => {
        r.tone = null;
        stopSound();
      },
      serial: (text) => {
        const chunks = (r.partial + text).split("\n");
        r.partial = chunks.pop() ?? "";
        if (chunks.length) {
          r.serialBuf.push(...chunks);
          if (r.serialBuf.length > MAX_SERIAL_LINES)
            r.serialBuf.splice(0, r.serialBuf.length - MAX_SERIAL_LINES);
        }
        r.serialDirty = true;
      },
    };
  }, [partByPin, playSound, stopSound]);

  const publish = useCallback(() => {
    const r = rt.current;
    const toneOn = !!r.tone && r.virtual < r.tone.until;
    const out = Object.fromEntries(r.out);
    const modes = Object.fromEntries(r.modes);
    const key = JSON.stringify([
      out,
      modes,
      toneOn,
      Math.floor(r.virtual / 1000),
    ]);
    if (key !== r.lastKey) {
      r.lastKey = key;
      setSnap({ out, modes, toneOn, time: r.virtual });
      const lit = parts
        .filter((p) => p.type === "led" && (out[p.pin] ?? 0) > 0)
        .map((p) => pinName(p.pin))
        .join(", ");
      if (lit !== r.lastLit) {
        r.lastLit = lit;
        setAnnounce(lit ? `Lit: ${lit}` : "All LEDs off");
      }
    }
    if (r.serialDirty) {
      r.serialDirty = false;
      setSerial([...r.serialBuf, ...(r.partial ? [r.partial] : [])]);
    }
  }, [parts]);

  // The loop reads the latest `frame` through a ref, so it can reschedule itself.
  const loopRef = useRef<FrameRequestCallback | null>(null);
  const schedule = useCallback(() => {
    rt.current.raf = requestAnimationFrame((t) => loopRef.current?.(t));
  }, []);

  const frame = useCallback(
    (now: number) => {
      const r = rt.current;
      if (!r.running || !r.machine) return;
      const dt = Math.min(100, now - (r.last || now));
      r.last = now;
      r.virtual += dt * r.speed;
      r.machine.runUntil(r.virtual);
      if (r.tone && r.virtual >= r.tone.until) {
        r.tone = null;
        stopSound();
      }
      if (r.machine.error) {
        setError(r.machine.error);
        r.running = false;
        setRunning(false);
        stopSound();
        publish();
        return;
      }
      publish();
      schedule();
    },
    [publish, schedule, stopSound],
  );

  useEffect(() => {
    loopRef.current = frame;
  }, [frame]);

  const pause = useCallback(() => {
    const r = rt.current;
    r.running = false;
    cancelAnimationFrame(r.raf);
    stopSound();
    setRunning(false);
  }, [stopSound]);

  const resume = useCallback(() => {
    const r = rt.current;
    if (!r.machine || r.machine.error || r.running) return;
    r.running = true;
    r.last = 0;
    setRunning(true);
    schedule();
  }, [schedule]);

  const start = useCallback(
    (source: string) => {
      const r = rt.current;
      cancelAnimationFrame(r.raf);
      stopSound();
      r.running = false;
      r.out = new Map();
      r.modes = new Map();
      r.tone = null;
      r.virtual = 0;
      r.serialBuf = [];
      r.partial = "";
      r.serialDirty = true;
      r.lastKey = "";
      setError(null);
      setAppliedCode(source);
      try {
        r.machine = new Machine(source, hardware);
        setReady(true);
      } catch (e) {
        r.machine = null;
        setReady(false);
        setError(e instanceof SketchError ? e : new SketchError(String(e), 0));
        setRunning(false);
        publish();
        return;
      }
      publish();
      if (r.visible) {
        r.running = true;
        r.last = 0;
        setRunning(true);
        schedule();
      }
    },
    [hardware, publish, schedule, stopSound],
  );

  // Start once the lab scrolls into view; pause while off-screen.
  const wantRunning = useRef(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const r = rt.current;
        r.visible = entry.isIntersecting;
        if (entry.isIntersecting) {
          if (!r.machine && !error) start(appliedCode);
          else if (wantRunning.current) resume();
        } else if (r.running) {
          pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      const r = rt.current;
      cancelAnimationFrame(r.raf);
      stopSound();
      r.audio?.close().catch(() => {});
    },
    [stopSound],
  );

  useEffect(() => {
    const el = serialRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [serial]);

  const chooseSketch = (id: string) => {
    const s = config.sketches.find((x) => x.id === id);
    if (!s) return;
    setSketchId(id);
    setCode(s.source);
    setSpeed(s.speed);
    rt.current.speed = s.speed;
    wantRunning.current = true;
    start(s.source);
  };

  const runEdited = () => {
    wantRunning.current = true;
    if (!config.sketches.some((s) => s.source === code)) setSketchId("custom");
    start(code);
  };

  const togglePause = () => {
    if (running) {
      wantRunning.current = false;
      pause();
    } else {
      wantRunning.current = true;
      resume();
    }
  };

  const goToLine = (line: number) => {
    const ta = editorRef.current;
    if (!ta || line < 1) return;
    const lines = code.split("\n");
    const startIdx =
      lines.slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0);
    ta.focus();
    ta.setSelectionRange(startIdx, startIdx + (lines[line - 1]?.length ?? 0));
  };

  const share = async () => {
    const url = `${location.origin}/lab#code=${encodeShare(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      history.replaceState(null, "", `/lab#code=${encodeShare(code)}`);
    }
  };

  const dirty = code !== appliedCode;
  const sketch = config.sketches.find((s) => s.id === sketchId);

  return (
    <div
      ref={rootRef}
      className="lab overflow-hidden rounded-xl border border-term-border bg-term-bg text-term-fg"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-term-border px-4 py-3">
        <p className="font-mono text-xs text-term-fg-dim">
          {config.title}
          <span
            className="ml-3 tabular-nums text-term-fg"
            aria-label="Board time"
          >
            {formatClock(snap.time)}
          </span>
        </p>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Simulation speed"
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              onClick={() => {
                setSpeed(s);
                rt.current.speed = s;
                if (s !== 1) stopSound();
              }}
              className={`min-h-9 rounded-md px-2.5 font-mono text-xs transition-colors ${
                speed === s
                  ? "bg-term-accent/15 text-term-accent"
                  : "text-term-fg-dim hover:text-term-fg"
              }`}
            >
              {speedLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div
        className="lab-board relative px-4 py-6"
        role="group"
        aria-label={`Virtual breadboard with ${parts.length} parts`}
      >
        <ul className="flex flex-wrap items-end justify-center gap-x-5 gap-y-6">
          {parts.map((p) => (
            <li
              key={`${p.type}-${p.pin}`}
              className="flex w-16 flex-col items-center gap-2 text-center"
            >
              <PartView
                part={p}
                value={snap.out[p.pin] ?? 0}
                output={snap.modes[p.pin] === OUTPUT}
                toneOn={snap.toneOn}
                pressed={pressed.has(p.pin)}
                tiltUp={tiltUp[p.pin] !== false}
                pot={pots[p.pin] ?? 512}
                onPress={(down) =>
                  setPressed((prev) => {
                    const next = new Set(prev);
                    if (down) next.add(p.pin);
                    else next.delete(p.pin);
                    return next;
                  })
                }
                onTilt={() =>
                  setTiltUp((prev) => ({
                    ...prev,
                    [p.pin]: prev[p.pin] === false,
                  }))
                }
                onPot={(v) => setPots((prev) => ({ ...prev, [p.pin]: v }))}
              />
              <span className="font-mono text-[11px] leading-tight text-term-fg-dim">
                {pinName(p.pin)}
                {p.label && (
                  <span className="block text-term-fg/80">{p.label}</span>
                )}
                {p.virtual && (
                  <span
                    className="block text-[10px] text-term-accent-dim"
                    title="Not on the physical build"
                  >
                    virtual
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-y border-term-border px-4 py-3">
        {config.sketches.length > 1 && (
          <label className="flex items-center gap-2 font-mono text-xs text-term-fg-dim">
            Sketch
            <select
              value={
                config.sketches.some((s) => s.id === sketchId)
                  ? sketchId
                  : "custom"
              }
              onChange={(e) => chooseSketch(e.target.value)}
              className="min-h-9 rounded-md border border-term-border bg-term-bg-raised px-2 text-term-fg"
            >
              {config.sketches.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              {!config.sketches.some((s) => s.id === sketchId) && (
                <option value="custom">Your edits</option>
              )}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={runEdited}
          className="lab-btn lab-btn-primary"
        >
          {dirty ? "Run my changes" : "Restart"}
        </button>
        <button
          type="button"
          onClick={togglePause}
          disabled={!ready || !!error}
          className="lab-btn"
        >
          {running ? "Pause" : "Resume"}
        </button>
        <label className="ml-auto flex min-h-9 cursor-pointer items-center gap-2 font-mono text-xs text-term-fg-dim">
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => setSound(e.target.checked)}
            className="accent-[var(--term-accent)]"
          />
          Sound{speed !== 1 && sound ? " (1× only)" : ""}
        </label>
      </div>

      {sketch?.note && !dirty && (
        <p className="border-b border-term-border px-4 py-2 text-xs text-term-fg-dim">
          {sketch.note}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="border-b border-term-border bg-[#2a1414] px-4 py-3 font-mono text-xs text-[#ffb4a8]"
        >
          {error.line > 0 ? (
            <button
              type="button"
              onClick={() => goToLine(error.line)}
              className="mr-2 underline underline-offset-2"
            >
              Line {error.line}
            </button>
          ) : null}
          {error.message}
        </div>
      )}

      <div
        className={
          wide ? "grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""
        }
      >
        <div className={wide ? "lg:border-r lg:border-term-border" : ""}>
          <label
            htmlFor={`code-${config.title}`}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-3 font-mono text-xs text-term-fg-dim"
          >
            <span>
              Code{" "}
              {dirty && (
                <span className="text-term-accent">
                  (edited, not running yet)
                </span>
              )}
            </span>
            <span className="flex gap-3">
              {sketch && dirty && (
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-term-fg"
                  onClick={() => setCode(sketch.source)}
                >
                  Undo edits
                </button>
              )}
              {shareable && (
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-term-fg"
                  onClick={share}
                >
                  {copied ? "Link copied" : "Copy share link"}
                </button>
              )}
            </span>
          </label>
          <textarea
            id={`code-${config.title}`}
            ref={editorRef}
            value={code}
            spellCheck={false}
            wrap="off"
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                escapedRef.current = true;
                return;
              }
              const escaped = escapedRef.current;
              escapedRef.current = false;
              if (
                e.key === "Tab" &&
                !escaped &&
                !e.shiftKey &&
                !e.altKey &&
                !e.metaKey &&
                !e.ctrlKey
              ) {
                e.preventDefault();
                const ta = e.currentTarget;
                const s = ta.selectionStart;
                const next =
                  code.slice(0, s) + "  " + code.slice(ta.selectionEnd);
                setCode(next);
                requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
              }
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                runEdited();
              }
            }}
            rows={wide ? 22 : 14}
            aria-describedby={`code-help-${config.title}`}
            className="term-scrollbar block w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-term-fg outline-none focus-visible:bg-term-bg-raised"
          />
          <p
            id={`code-help-${config.title}`}
            className="px-4 pb-3 font-mono text-[11px] text-term-fg-dim"
          >
            Edit anything, then Run (Ctrl+Enter). Tab indents; press Esc then
            Tab to leave the editor.
          </p>
        </div>
        <div className={wide ? "" : "border-t border-term-border"}>
          <div className="flex items-center justify-between px-4 pt-3 font-mono text-xs text-term-fg-dim">
            <span>Serial monitor</span>
            <button
              type="button"
              className="underline underline-offset-2 hover:text-term-fg"
              onClick={() => {
                rt.current.serialBuf = [];
                rt.current.partial = "";
                setSerial([]);
              }}
            >
              Clear
            </button>
          </div>
          <pre
            ref={serialRef}
            aria-live="off"
            className={`term-scrollbar overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-term-fg ${wide ? "h-[26rem]" : "h-28"}`}
          >
            {serial.length ? (
              serial.join("\n")
            ) : (
              <span className="text-term-fg-dim">
                Nothing printed yet. Try Serial.println(millis());
              </span>
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

function PartView({
  part,
  value,
  output,
  toneOn,
  pressed,
  tiltUp,
  pot,
  onPress,
  onTilt,
  onPot,
}: {
  part: Part;
  value: number;
  output: boolean;
  toneOn: boolean;
  pressed: boolean;
  tiltUp: boolean;
  pot: number;
  onPress: (down: boolean) => void;
  onTilt: () => void;
  onPot: (v: number) => void;
}) {
  const name = part.label ?? pinName(part.pin);
  switch (part.type) {
    case "led": {
      // Without pinMode(OUTPUT) a real pin only drives the weak pull-up, so the LED glows faintly.
      const level = (value / 255) * (output ? 1 : 0.12);
      return (
        <span
          className="lab-led"
          role="img"
          aria-label={`${part.color} LED on ${pinName(part.pin)}, ${level > 0.02 ? "on" : "off"}`}
          style={
            {
              "--led": LED_RGB[part.color],
              "--level": level.toFixed(3),
            } as React.CSSProperties
          }
        />
      );
    }
    case "button":
      return (
        <button
          type="button"
          className="lab-button"
          aria-pressed={pressed}
          aria-label={`${name}: hold to press`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onPress(true);
          }}
          onPointerUp={() => onPress(false)}
          onPointerCancel={() => onPress(false)}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              onPress(true);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") onPress(false);
          }}
          onBlur={() => pressed && onPress(false)}
        >
          <span />
        </button>
      );
    case "tilt":
      return (
        <button
          type="button"
          className="lab-tilt"
          aria-pressed={!tiltUp}
          aria-label={`${name}: ${tiltUp ? "upright, click to tip over" : "tipped over, click to stand up"}`}
          onClick={onTilt}
          data-up={tiltUp}
        >
          <span />
        </button>
      );
    case "pot":
      return (
        <span className="flex flex-col items-center gap-1">
          <span
            className="lab-knob"
            style={
              {
                "--turn": `${(pot / 1023) * 270 - 135}deg`,
              } as React.CSSProperties
            }
            aria-hidden
          />
          <input
            type="range"
            min={0}
            max={1023}
            value={pot}
            onChange={(e) => onPot(Number(e.target.value))}
            aria-label={`${name} on ${pinName(part.pin)}`}
            className="w-16 accent-[var(--term-accent)]"
          />
        </span>
      );
    case "piezo":
      return (
        <span
          className="lab-piezo"
          data-on={toneOn}
          role="img"
          aria-label={`Piezo buzzer on ${pinName(part.pin)}, ${toneOn ? "sounding" : "quiet"}`}
        />
      );
  }
}
