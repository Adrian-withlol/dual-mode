/**
 * Arduino sketch for the auto desk fan (thermostat), shown on the Overview
 * under that project. Kept as a string so it renders verbatim.
 */
export const deskFanSketch = `// Auto desk fan (thermostat) - Arduino Starter Kit parts only.
// Turn the knob to pick a target temperature. When the room is warmer than
// the target the fan turns on, and it spins faster the hotter it gets.
#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2); // RS, E, D4, D5, D6, D7 (kit book wiring)

const int TEMP_PIN = A0;   // TMP36 middle leg
const int KNOB_PIN = A1;   // target-temperature knob (middle leg)
const int FAN_PIN = 9;     // MOSFET gate - must be a ~PWM pin

const bool SHOW_FAHRENHEIT = true; // false = show degrees C on the screen

const float SET_MIN_C = 18.0;     // knob turned fully left
const float SET_MAX_C = 32.0;     // knob turned fully right
const float HYSTERESIS_C = 0.5;   // on at target+0.5, off at target-0.5 (no flicker)
const float FULL_SPEED_C = 4.0;   // this many degrees over target = full speed
const int MIN_PWM = 100;          // slowest speed that keeps YOUR motor turning (tune)
const int KICK_MS = 200;          // full-power burst to get a stopped motor going

bool fanOn = false;
int lastPwm = 0;
unsigned long lastPrint = 0;

float readTempC() {
  long total = 0;
  for (int i = 0; i < 16; i++) total += analogRead(TEMP_PIN); // average out noise
  float volts = (total / 16.0) * 5.0 / 1024.0;
  return (volts - 0.5) * 100.0;               // TMP36: 0.5 V at 0 C, 10 mV per C
}

float readTargetC() {
  int raw = analogRead(KNOB_PIN);
  float t = SET_MIN_C + (SET_MAX_C - SET_MIN_C) * raw / 1023.0;
  return floor(t * 2 + 0.5) / 2.0;            // snap to half degrees
}

int fanSpeed(float tempC, float targetC) {
  float over = tempC - targetC;
  if (!fanOn && over >= HYSTERESIS_C) fanOn = true;
  if (fanOn && over <= -HYSTERESIS_C) fanOn = false;
  if (!fanOn) return 0;
  float fraction = constrain(over / FULL_SPEED_C, 0.0, 1.0);
  return MIN_PWM + (int)((255 - MIN_PWM) * fraction);
}

float toDisplay(float c) {
  if (SHOW_FAHRENHEIT) return c * 9.0 / 5.0 + 32.0;
  return c;
}

void printTemp(float c) {        // e.g. "76.5°F" (6 characters)
  float v = toDisplay(c);
  if (v >= 0 && v < 10) lcd.print(" ");
  lcd.print(v, 1);
  lcd.write(223);                // degree symbol built into the LCD
  if (SHOW_FAHRENHEIT) lcd.print("F");
  else lcd.print("C");
}

void setup() {
  pinMode(FAN_PIN, OUTPUT);
  analogWrite(FAN_PIN, 0);
  Serial.begin(9600);
  lcd.begin(16, 2);
  lcd.print("Desk fan ready");
  delay(1000);
  lcd.clear();
}

void loop() {
  float tempC = readTempC();
  float targetC = readTargetC();
  int pwm = fanSpeed(tempC, targetC);

  if (pwm > 0 && lastPwm == 0) {   // starting from a stop: kick it
    analogWrite(FAN_PIN, 255);
    delay(KICK_MS);
  }
  analogWrite(FAN_PIN, pwm);
  lastPwm = pwm;
  int percent = pwm * 100 / 255;

  lcd.setCursor(0, 0);             // "Now  76.5°F     "
  // At 100°F or more this row is 17 characters; the last padding space
  // lands just past column 16, off-screen, so nothing visible changes.
  lcd.print("Now  ");
  printTemp(tempC);
  lcd.print("     ");
  lcd.setCursor(0, 1);             // "Set  73.0°F  62%"  or  "Set  73.0°F  OFF"
  lcd.print("Set  ");
  printTemp(targetC);
  if (pwm == 0) {
    lcd.print("  OFF");
  } else {
    lcd.print(" ");
    if (percent < 100) lcd.print(" ");
    if (percent < 10) lcd.print(" ");
    lcd.print(percent);
    lcd.print("%");
  }

  if (millis() - lastPrint >= 1000) { // one line per second for the laptop page
    lastPrint = millis();
    Serial.print("temp="); Serial.print(tempC, 1);
    Serial.print(",set="); Serial.print(targetC, 1);
    Serial.print(",fan="); Serial.println(percent);
  }
  delay(250);
}
`;
