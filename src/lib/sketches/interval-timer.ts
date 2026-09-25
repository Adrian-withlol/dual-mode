/**
 * Arduino sketch for the 10-minute interval timer, shown on the Overview
 * under that project. Kept as a string so it renders verbatim.
 */
export const intervalTimerSketch = `const int switchPin = 8;
unsigned long previousTime = 0;
int switchState = 0;
int prevSwitchState = 0;
int led = 2;
unsigned long interval = 600000; // 10 minutes per LED

void setup() {
  for (int x = 2; x < 8; x++) {
    pinMode(x, OUTPUT);
  }
  pinMode(switchPin, INPUT);
}

void loop() {
  unsigned long currentTime = millis();

  // Every interval, light the next LED.
  if (currentTime - previousTime > interval) {
    previousTime = currentTime;
    digitalWrite(led, HIGH);
    led++;

    // After the sixth LED, clear the row and start over.
    if (led == 8) {
      delay(1000);
      for (int x = 2; x < 8; x++) {
        digitalWrite(x, LOW);
      }
      led = 2;
      previousTime = millis();
    }
  }

  // Tilting the board (tilt sensor on pin 8) resets the timer.
  switchState = digitalRead(switchPin);
  if (switchState != prevSwitchState) {
    for (int x = 2; x < 8; x++) {
      digitalWrite(x, LOW);
    }
    led = 2;
    previousTime = currentTime;
  }
  prevSwitchState = switchState;
}
`;
