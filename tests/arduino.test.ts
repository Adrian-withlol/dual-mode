import { test } from "node:test";
import assert from "node:assert/strict";
import { Machine, SketchError, type Hardware } from "../src/lib/arduino/interpreter.ts";
import { intervalTimerSketch, jingleBellsSketch } from "../src/lib/sketches/interval-timer.ts";

/** Fake board that records pin writes and lets tests drive inputs. */
function board() {
  const pins = new Map<number, number>();
  const inputs = new Map<number, number>();
  const log: string[] = [];
  const writes: { t: number; pin: number; v: number }[] = [];
  let machine: Machine | null = null;
  const hw: Hardware = {
    pinMode() {},
    digitalWrite(pin, v) { pins.set(pin, v); writes.push({ t: machine?.time ?? 0, pin, v }); },
    digitalRead: (pin) => inputs.get(pin) ?? 0,
    analogRead: (pin) => inputs.get(pin) ?? 0,
    analogWrite(pin, v) { pins.set(pin, v); },
    tone() {},
    noTone() {},
    serial(text) { log.push(text); },
  };
  return {
    hw, pins, inputs, log, writes,
    attach(m: Machine) { machine = m; return m; },
    lit: () => [2, 3, 4, 5, 6, 7].filter((p) => pins.get(p) === 1),
  };
}

/** Advance in frame-sized steps like the browser does. */
function run(m: Machine, from: number, to: number, step = 50) {
  for (let t = from + step; t <= to; t += step) m.runUntil(t);
  m.runUntil(to);
}

test("interval timer lights one LED every 10 minutes", () => {
  const b = board();
  b.inputs.set(8, 1); // tilt switch upright
  const m = b.attach(new Machine(intervalTimerSketch, b.hw));
  const MIN = 60_000;
  run(m, 0, 9 * MIN, 1000);
  assert.deepEqual(b.lit(), []);
  run(m, 9 * MIN, 10 * MIN + 2000, 1000);
  assert.deepEqual(b.lit(), [2]);
  run(m, 10 * MIN + 2000, 50 * MIN + 2000, 1000);
  assert.deepEqual(b.lit(), [2, 3, 4, 5, 6]);
});

test("interval timer clears the row after the sixth LED (one hour)", () => {
  const b = board();
  b.inputs.set(8, 1);
  const m = b.attach(new Machine(intervalTimerSketch, b.hw));
  run(m, 0, 60 * 60_000 + 500, 1000);
  assert.ok(b.writes.some((w) => w.pin === 7 && w.v === 1), "sixth LED should light");
  run(m, 60 * 60_000 + 500, 60 * 60_000 + 5000, 100);
  assert.deepEqual(b.lit(), []);
});

test("tilting the board resets the timer", () => {
  const b = board();
  b.inputs.set(8, 1);
  const m = b.attach(new Machine(intervalTimerSketch, b.hw));
  run(m, 0, 25 * 60_000, 1000);
  assert.deepEqual(b.lit(), [2, 3]);
  b.inputs.set(8, 0); // tilt
  run(m, 25 * 60_000, 25 * 60_000 + 1000, 100);
  assert.deepEqual(b.lit(), []);
  // Count restarts from the reset, so the next LED is 10 minutes later.
  run(m, 25 * 60_000 + 1000, 34 * 60_000, 1000);
  assert.deepEqual(b.lit(), []);
  run(m, 34 * 60_000, 35 * 60_000 + 2000, 1000);
  assert.deepEqual(b.lit(), [2]);
});

test("jingle bells flashes the chorus rhythm then pauses", () => {
  const b = board();
  const m = b.attach(new Machine(jingleBellsSketch, b.hw));
  // One pass: 45 notes over 60 beats of 350 ms, plus 3 one-beat pauses, then 1.5 s.
  // Integer math like the Uno: a 1-beat note is 262 + 87 = 349 ms, so the 36
  // one-beat notes make each pass 36 ms shorter than the ideal 23,550 ms.
  const cycle = (60 + 3) * 350 + 1500 - 36;
  run(m, 0, cycle - 10, 16);
  const onsPin2 = b.writes.filter((w) => w.pin === 2 && w.v === 1);
  assert.equal(onsPin2.length, 45);
  // The next pass starts right after the pause.
  run(m, cycle - 10, cycle + 5, 5);
  assert.equal(b.writes.filter((w) => w.pin === 2 && w.v === 1).length, 46);
  // First note: on for 3/4 of a beat, off for 1/4.
  const firstOff = b.writes.find((w) => w.pin === 2 && w.v === 0)!;
  assert.ok(Math.abs(firstOff.t - 262) <= 1, `first note off at ${firstOff.t}`);
});

test("Uno integer widths, division and floats", () => {
  const b = board();
  const m = new Machine(`
    int big = 600000;
    long ok = 600000;
    byte wrap = 300;
    float f = 7 / 2;
    float g = 7 / 2.0;
    void setup() {
      Serial.println(big); Serial.println(ok); Serial.println(wrap);
      Serial.println(f); Serial.println(g); Serial.println(-7 / 2); Serial.println(7 % 3);
    }
    void loop() { delay(1000); }`, b.hw);
  m.runUntil(10);
  assert.deepEqual(b.log.join("").trim().split("\n"), ["10176", "600000", "44", "3.00", "3.50", "-3", "1"]);
});

test("functions, arrays, sizeof, switch, loops, defines", () => {
  const b = board();
  const m = new Machine(`
    #define N 5
    int data[] = {3, 1, 4, 1, 5};
    int sum(int arr[], int n) { int s = 0; for (int i = 0; i < n; i++) s += arr[i]; return s; }
    int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
    void setup() {
      Serial.println(sum(data, sizeof(data) / sizeof(data[0])));
      Serial.println(fact(N));
      int k = 0; while (true) { k++; if (k == 3) continue; if (k > 4) break; }
      Serial.println(k);
      switch (k) { case 4: Serial.println("four"); break; case 5: Serial.println("five"); default: Serial.println("fell"); }
      Serial.println(255, HEX);
      Serial.println(map(512, 0, 1023, 0, 255));
    }
    void loop() {}`, b.hw);
  m.runUntil(10);
  assert.deepEqual(b.log.join("").trim().split("\n"), ["14", "120", "5", "five", "fell", "FF", "127"]);
});

test("busy loop without delay keeps time moving and never hangs", () => {
  const b = board();
  const m = new Machine(`
    unsigned long last = 0; int n = 0;
    void setup() {}
    void loop() { if (millis() - last >= 1000) { last = millis(); n++; Serial.println(n); } }`, b.hw);
  run(m, 0, 5500, 16);
  assert.equal(b.log.length, 5);
});

test("helpful errors with line numbers", () => {
  assert.throws(() => new Machine("void loop() {}", board().hw), /needs a setup\(\)/);
  assert.throws(() => new Machine("void setup() {\n  x = 3;\n}\nvoid loop() {}", board().hw), (e: unknown) => e instanceof SketchError && e.line === 2 && /"x" isn't declared/.test(e.message));
  assert.throws(() => new Machine("void setup() { int a = 1 }\nvoid loop() {}", board().hw), /Expected ";"/);
  const b = board();
  const m = new Machine("int a[3];\nvoid setup() {\n  a[5] = 1;\n}\nvoid loop() {}", b.hw);
  m.runUntil(10);
  assert.ok(m.error && m.error.line === 3 && /outside a\[3\]/.test(m.error.message));
});

test("every playground example parses and runs for 10 simulated seconds", async () => {
  const { PLAYGROUND_SKETCHES } = await import("../src/lib/arduino/lab.ts");
  for (const s of PLAYGROUND_SKETCHES) {
    const b = board();
    b.inputs.set(8, 1);
    b.inputs.set(14, 700);
    const m = b.attach(new Machine(s.source, b.hw));
    run(m, 0, 10_000, 16);
    assert.equal(m.error, null, `${s.id}: ${m.error?.message}`);
  }
});

test("knob example maps the analog reading onto the LED bar", async () => {
  const { PLAYGROUND_SKETCHES } = await import("../src/lib/arduino/lab.ts");
  const b = board();
  b.inputs.set(14, 700); // 700/1023 of 6 LEDs -> 4
  const m = b.attach(new Machine(PLAYGROUND_SKETCHES.find((s) => s.id === "knob")!.source, b.hw));
  run(m, 0, 200, 16);
  assert.deepEqual(b.lit(), [2, 3, 4, 5]);
  assert.match(b.log.join(""), /A0 = 700 {2}-> {2}4 LEDs/);
});

test("a missing semicolon is reported on its own line", () => {
  assert.throws(
    () => new Machine("int a = 1\nint b = 2;\nvoid setup() {}\nvoid loop() {}", board().hw),
    (e: unknown) => e instanceof SketchError && e.line === 1,
  );
});
