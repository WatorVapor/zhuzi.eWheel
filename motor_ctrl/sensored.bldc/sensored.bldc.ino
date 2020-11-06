#include <EEPROM.h>
#include <inttypes.h>

#define DUMP_VAR(x)  { \
  Serial.print(__LINE__);\
  Serial.print("@@"#x"=<");\
  Serial.print(x);\
  Serial.print(">");\
  Serial.print("\r\n");\
}

#define PORT_BRAKE 11
#define PORT_CW 12
#define PORT_PWM 3
#define PORT_HALL 2



#define CW() {\
  iBoolMotorCWFlag = true;\
  digitalWrite(PORT_CW,HIGH);\
}

#define CCW() {\
  iBoolMotorCWFlag = false;\
  digitalWrite(PORT_CW,LOW);\
  }


static long iHallTurnCounter = 0;
static uint32_t iMotorStartDelay = 0;
static uint32_t iMotorStartWait = 0;

void setup() {
  // initialize port for motor control
  pinMode(PORT_BRAKE, OUTPUT);
  pinMode(PORT_CW, OUTPUT);
  pinMode(PORT_PWM, OUTPUT);
  
  pinMode(PORT_HALL, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PORT_HALL),HallTurnCounterInterrupt , FALLING);

  // clock prescale by 1, PWM frequency: 32KHz
  TCCR2B = TCCR2B & 0xF8 | 0x01;
 
  Serial.begin(115200);
  DUMP_VAR("goto start!!!\n");
  digitalWrite(PORT_BRAKE,LOW);
  digitalWrite(PORT_CW,HIGH);
  analogWrite(PORT_PWM, 0);
  byte motorid = EEPROM.read(0);
  DUMP_VAR(motorid);

  byte startDelay1 = EEPROM.read(2);
  byte startDelay2 = EEPROM.read(3);
  byte startDelay3 = EEPROM.read(4);
  byte startDelay4 = EEPROM.read(5);
  uint32_t startDelay = uint32_t(startDelay1) << 24 | uint32_t(startDelay2) << 16 | uint32_t(startDelay3) << 8 | uint32_t(startDelay4);;
  DUMP_VAR(startDelay);
  iMotorStartDelay = startDelay;
}

static int32_t iMainLoopCounter = 0;


static long volatile iHallTurnRunStep = 0;
static bool iBoolMotorCWFlag = false; //





void loopMotor(void);
void stopMotor(void);
void startMotor(void);

void loop() {
  loopMotor();
  handleIncommingCommand();
}

void HallTurnCounterInterrupt(void) {
  iHallTurnCounter++;
  if(iHallTurnRunStep > 0) {
    DUMP_VAR(iHallTurnRunStep);
    iHallTurnRunStep--;
  } else {
    stopMotor();
  }
}






void runLongCommand(char ch);

void handleIncommingCommand(void) {
  signed incomingByte = Serial.read();
  if (incomingByte != -1) {
    if(incomingByte == 'z') {
      CW();
      digitalWrite(PORT_CW,HIGH);
    }
    if(incomingByte == 'f') {
      CCW();
    }
    if(incomingByte == 'b') {
      digitalWrite(PORT_BRAKE,HIGH);
    }
    if(incomingByte == 'e') {
      digitalWrite(PORT_BRAKE,LOW);
    }
    if(incomingByte == '0') {
      analogWrite(PORT_PWM, 0);
      digitalWrite(PORT_BRAKE,LOW);
    }
    if(incomingByte == 'g') {
      startMotor();
    }
    runLongCommand(incomingByte);
  }
}

static String gHandleStringCommand;
static bool bMotorRunning = false;

void runLongCommand(char ch) {
  gHandleStringCommand += ch;
  if(ch == '\n') {
    if(gHandleStringCommand.startsWith("spd:")) {
      auto speedValue = gHandleStringCommand.substring(4, gHandleStringCommand.length());
      speedValue.trim();
      DUMP_VAR(speedValue);
      int spd = speedValue.toInt();
      if(bMotorRunning) {
        analogWrite(PORT_PWM, spd);
      }
    }
    if(gHandleStringCommand.startsWith("id:")) {
      auto idValue = gHandleStringCommand.substring(3, gHandleStringCommand.length());
      DUMP_VAR(idValue);
      if(idValue.length() > 0) {
        char id = idValue.charAt(0);
        EEPROM.write(0,id);
      }
    }
    if(gHandleStringCommand.startsWith("delay:")) {
      auto delayValue = gHandleStringCommand.substring(6, gHandleStringCommand.length());
      DUMP_VAR(delayValue);
      uint32_t delay = delayValue.toInt();
      DUMP_VAR(delay);
      byte *pDelay = (byte *)(&delay);
      EEPROM.write(5,*pDelay);
      EEPROM.write(4,*(pDelay+1));
      EEPROM.write(3,*(pDelay+2));
      EEPROM.write(2,*(pDelay+3));
    }
    gHandleStringCommand = "";
  }
}


const static uint8_t iConstMaxSpeed = 64;
const static uint8_t iConstMinSpeed = 12;
const static uint8_t iConstBrakeDistance = 32;

static bool bMotorToBeStarted = false;

void stopMotor(void) {
  analogWrite(PORT_PWM, 0);
  digitalWrite(PORT_BRAKE,LOW);
  iHallTurnRunStep = -1;
  bMotorToBeStarted = false;
  bMotorRunning = false;
}
void startMotor(void) {
  iMotorStartWait = iMotorStartDelay;
  bMotorToBeStarted = true;
  if(iMotorStartWait == 0) {
    startMotorReal();
  }
}

static int32_t iTurnTimerOutCounter = 0UL;
const static int32_t iConstTurnTimeout = 1024UL*1024UL;
void startMotorReal(void) {
  analogWrite(PORT_PWM, 128);
  digitalWrite(PORT_BRAKE,HIGH);
  iHallTurnRunStep = 32;
  iTurnTimerOutCounter = iConstTurnTimeout;
  DUMP_VAR(iHallTurnRunStep);
  bMotorToBeStarted = false;
  bMotorRunning = true;
}
void loopMotor(void) {
  iMotorStartWait--;
  if(bMotorToBeStarted) {
    if(iMotorStartWait == 0) {
      startMotorReal();
    }
  }
  if(bMotorRunning) {
    iTurnTimerOutCounter--;
    if( iTurnTimerOutCounter == 0) {
      DUMP_VAR(iTurnTimerOutCounter);
      stopMotor();
    }
    /*
    if( iTurnTimerOutCounter < 0) {
      DUMP_VAR(iTurnTimerOutCounter);
    }
    */
  }
}
