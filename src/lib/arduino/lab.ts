/**
 * Lab configuration: which parts sit on the virtual breadboard and which
 * sketches a project ships with. Any project in portfolio-data.ts can add a
 * `lab` block to get an interactive simulator; the /lab playground uses the
 * general-purpose kit below.
 */

export type LedColor = "red" | "yellow" | "green" | "blue" | "white";

interface PartBase {
  /** Arduino pin number (A0-A5 are 14-19). */
  pin: number;
  label?: string;
  /** Not on the physical build; added so visitors can experiment. */
  virtual?: boolean;
}

export type Part =
  | (PartBase & { type: "led"; color: LedColor })
  /** Momentary push button. "pullup": wired to GND, reads LOW while pressed. */
  | (PartBase & { type: "button"; wiring: "pullup" | "pulldown" })
  /** Tilt switch: reads HIGH upright, LOW tipped over. */
  | (PartBase & { type: "tilt" })
  /** Potentiometer on an analog pin, reads 0-1023. */
  | (PartBase & { type: "pot" })
  | (PartBase & { type: "piezo" });

export interface LabSketch {
  id: string;
  label: string;
  source: string;
  /** Default time multiplier, e.g. 600 turns 10 minutes into 1 second. */
  speed: number;
  note?: string;
}

export interface LabConfig {
  title: string;
  intro?: string;
  parts: Part[];
  sketches: LabSketch[];
}

export const SPEEDS = [1, 10, 60, 600] as const;

export function pinName(pin: number): string {
  return pin >= 14 && pin <= 19 ? `A${pin - 14}` : `D${pin}`;
}

// ---------------------------------------------------------------- playground

const blink = `// Blink the built-in LED once a second.
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`;

const button = `// Hold the button to light the green LEDs.
// The button uses the internal pull-up, so pressed reads LOW.
const int buttonPin = 8;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(6, OUTPUT);
  pinMode(7, OUTPUT);
}

void loop() {
  int pressed = digitalRead(buttonPin) == LOW;
  digitalWrite(6, pressed);
  digitalWrite(7, pressed);
}
`;

const knob = `// Turn the knob: the LED bar fills up and the value prints to Serial.
const int ledPins[] = {2, 3, 4, 5, 6, 7};
const int count = 6;
int lastLevel = -1;

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < count; i++) pinMode(ledPins[i], OUTPUT);
}

void loop() {
  int reading = analogRead(A0);
  int level = map(reading, 0, 1023, 0, count);
  for (int i = 0; i < count; i++) {
    digitalWrite(ledPins[i], i < level ? HIGH : LOW);
  }
  if (level != lastLevel) {
    Serial.print("A0 = ");
    Serial.print(reading);
    Serial.print("  ->  ");
    Serial.print(level);
    Serial.println(" LEDs");
    lastLevel = level;
  }
  delay(20);
}
`;

const melody = `// Play a short scale on the piezo each time the button is pressed.
// Turn sound on and set speed to 1x to hear it.
const int buttonPin = 8;
const int piezoPin = 9;
int notes[] = {262, 294, 330, 349, 392, 440, 494, 523};

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  for (int pin = 2; pin <= 7; pin++) pinMode(pin, OUTPUT);
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    for (int i = 0; i < 8; i++) {
      digitalWrite(2 + i % 6, HIGH);
      tone(piezoPin, notes[i], 180);
      delay(220);
      digitalWrite(2 + i % 6, LOW);
    }
  }
}
`;

const fade = `// Fade the LED on pin 3 in and out with PWM (analogWrite).
int brightness = 0;
int step = 5;

void setup() {
  pinMode(3, OUTPUT);
}

void loop() {
  analogWrite(3, brightness);
  brightness = brightness + step;
  if (brightness <= 0 || brightness >= 255) step = -step;
  delay(30);
}
`;

const blank = `void setup() {
  // Runs once when the board starts.

}

void loop() {
  // Runs over and over.

}
`;

export const PLAYGROUND_PARTS: Part[] = [
  { type: "led", pin: 2, color: "red" },
  { type: "led", pin: 3, color: "red" },
  { type: "led", pin: 4, color: "yellow" },
  { type: "led", pin: 5, color: "yellow" },
  { type: "led", pin: 6, color: "green" },
  { type: "led", pin: 7, color: "green" },
  { type: "led", pin: 13, color: "white", label: "LED_BUILTIN" },
  { type: "button", pin: 8, wiring: "pullup", label: "Button" },
  { type: "tilt", pin: 12, label: "Tilt switch" },
  { type: "piezo", pin: 9, label: "Piezo" },
  { type: "pot", pin: 14, label: "Knob" },
];

export const PLAYGROUND_SKETCHES: LabSketch[] = [
  { id: "blink", label: "Blink", source: blink, speed: 1 },
  { id: "button", label: "Button", source: button, speed: 1 },
  { id: "knob", label: "Knob bar graph", source: knob, speed: 1 },
  { id: "fade", label: "Fade (PWM)", source: fade, speed: 1 },
  { id: "melody", label: "Melody", source: melody, speed: 1 },
  { id: "blank", label: "Blank", source: blank, speed: 1 },
];
