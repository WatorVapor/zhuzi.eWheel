#include <stdio.h>
#include <pico/multicore.h>

// The normal, core0 setup
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
  sleep_ms(500);
  multicore_launch_core1(loop_on_core1);
}
// The normal, core0 loop
void loop() {
  Serial.println("C0: ...");
  sleep_ms(1000);
}

/// core1 deny serail,delay...
void loop_on_core1() {
  bool flag = true;
  while(true) {
    gpio_put(LED_BUILTIN, flag);
    sleep_ms(500);
    flag = ! flag;
  }
}
