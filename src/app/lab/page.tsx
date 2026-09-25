import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import LabPlayground from "@/components/lab/LabPlayground";

export const metadata: Metadata = {
  title: "Arduino Lab",
  description:
    "Run Arduino sketches in your browser on a simulated board: LEDs, buttons, a tilt switch, a knob and a buzzer. Edit the code and share what you build.",
  alternates: { canonical: "/lab" },
};

export default function LabPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20 pt-14 sm:px-8 sm:pt-20">
        <Link
          href="/"
          className="mb-10 inline-block text-sm text-ink-faint underline underline-offset-4 hover:text-ink-muted"
        >
          ← Back to portfolio
        </Link>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
          Arduino Lab
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-muted text-pretty">
          Run real Arduino sketches on a simulated board, right here. Load one
          of my project boards or the starter kit, change the code, and press
          the parts. When you make something you like, copy the share link.
        </p>

        <div className="mt-10">
          <LabPlayground />
        </div>

        <section
          className="mt-14 grid gap-8 text-sm text-ink-muted md:grid-cols-2"
          aria-label="How the lab works"
        >
          <div>
            <h2 className="mb-2 text-base font-semibold text-ink">
              What it supports
            </h2>
            <p className="max-w-[60ch] text-pretty">
              setup() and loop(), variables and arrays, functions,
              if/for/while/switch, #define, and the core Arduino calls: pinMode,
              digitalWrite, digitalRead, analogRead, analogWrite, millis, delay,
              tone, map, random and Serial.print. Numbers use the same sizes as
              an Arduino Uno, so an int still overflows past 32,767.
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-semibold text-ink">
              What it doesn&apos;t
            </h2>
            <p className="max-w-[60ch] text-pretty">
              Libraries (#include), String objects, pointers, interrupts and
              timing tricks below a millisecond. It interprets your code rather
              than compiling it, so it&apos;s a place to learn and experiment,
              not a replacement for testing on real hardware.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
