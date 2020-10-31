#define DUMP_VAR(x)  { \
  Serial.print(__LINE__);\
  Serial.print("@@"#x"=<");\
  Serial.print(x);\
  Serial.print(">");\
  Serial.print("\n");\
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
}

static int32_t iMainLoopCounter = 0;

const static int32_t iMainLoopPrintA = 1024;
const static int32_t iMainLoopPrintB = 16;
const static int32_t iMainLoopPrintSkip = iMainLoopPrintA*iMainLoopPrintB;

static long volatile iHallTurnRunStep = 0;
static bool iBoolMotorCWFlag = false; //
static const  int16_t iPositionByHallRangeLow = 50;
static const  int16_t iPositionByHallRangeDistance = 152;
static const  int16_t iPositionByHallRangeHigh = iPositionByHallRangeLow + iPositionByHallRangeDistance;
static int16_t volatile iPositionByHall= -1;
static uint8_t volatile iConstCurrentSpeed = 0;

static bool iBoolRunCalibrate = false; //




static int16_t volatile iTargetPositionByHall= -1;
void caclTargetSpeed(void);

void loop() {
  loopMotor();
  handleIncommingCommand();
}

void HallTurnCounterInterrupt(void) {
  iHallTurnCounter++;
  DUMP_VAR(iHallTurnCounter);
  if(iHallTurnRunStep > 0) {
    iHallTurnRunStep--;
  } else {
    stopMotor();
  }
  if(iBoolMotorCWFlag) {
    iPositionByHall++;
  } else {
    iPositionByHall--;
  }
  DUMP_VAR(iPositionByHall);
  DUMP_VAR(iConstCurrentSpeed);
  DUMP_VAR(iTargetPositionByHall);
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
void runLongCommand(char ch) {
  gHandleStringCommand += ch;
  if(ch == '\n') {
    if(gHandleStringCommand.startsWith("spd:")) {
      auto speedValue = gHandleStringCommand.substring(4, gHandleStringCommand.length());
      speedValue.trim();
      DUMP_VAR(speedValue);
      auto spd = speedValue.toInt();
    }
    gHandleStringCommand = "";
  }
}

void runCalibrate(void) {
  iBoolMotorCWFlag = false;
  digitalWrite(PORT_CW,LOW);
  iBoolRunCalibrate = true;
  startMotor();
}

const static uint8_t iConstMaxSpeed = 64;
const static uint8_t iConstMinSpeed = 12;
const static uint8_t iConstBrakeDistance = 32;


void stopMotor(void) {
  analogWrite(PORT_PWM, 0);
  digitalWrite(PORT_BRAKE,LOW);
  iHallTurnRunStep = -1;
}
void startMotor(void) {
  analogWrite(PORT_PWM, 64);
  iConstCurrentSpeed = 32;
  digitalWrite(PORT_BRAKE,HIGH);
  iHallTurnRunStep = 16;
  //DUMP_VAR(iHallTurnRunStep);
}
void loopMotor(void) {
}
