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
  caclTargetSpeed();
 //printTurnCounter();
  handleIncommingCommand();
}

void HallTurnCounterInterrupt(void) {
  iHallTurnCounter++;
  //DUMP_VAR(iHallTurnCounter);
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
    DUMP_VAR(gHandleStringCommand);
    if(gHandleStringCommand.startsWith("calibrate")) {
      runCalibrate();
    }
    if(gHandleStringCommand.startsWith("pos:")) {
      auto posValue = gHandleStringCommand.substring(4, gHandleStringCommand.length());
      posValue.trim();
      DUMP_VAR(posValue);
      auto pos = posValue.toInt();
      runToPosion(pos);
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

//const static uint8_t iConstMaxSpeed = 255;
const static uint8_t iConstMaxSpeed = 64;
const static uint8_t iConstMinSpeed = 12;
const static uint8_t iConstBrakeDistance = 32;

void runToPosion(int16_t position) {
  if(position >= iPositionByHallRangeHigh ||position <= iPositionByHallRangeLow) {
    return;
  }
  iTargetPositionByHall = position;
  //DUMP_VAR(position);
  int16_t currentPos = iPositionByHall;
  //DUMP_VAR(currentPos);
  int16_t diff = position - currentPos;
  //DUMP_VAR(diff);
  iHallTurnRunStep = abs(diff);
  //DUMP_VAR(iHallTurnRunStep);
  if(iHallTurnRunStep > 0) {
    if(diff > 0) {
      CW();
    } else {
      CCW();
    }
    uint32_t speed1 = iConstMaxSpeed;
    uint32_t speed2 = iHallTurnRunStep;
    uint32_t speed3 = iPositionByHallRangeDistance;
    uint32_t speed32 = iConstMaxSpeed * iHallTurnRunStep/iConstBrakeDistance;
    if(speed32 > iConstMaxSpeed) {
      speed32 = iConstMaxSpeed;
    }
    if(speed32 < iConstMinSpeed) {
      speed32 = iConstMinSpeed;
    }
    uint8_t speed8 = speed32 & 0xff;
    /*
    if(speed8 < iConstMinSpeed) {
      speed8 = iConstMinSpeed;
    }
    */
    iConstCurrentSpeed = speed8;
    analogWrite(PORT_PWM, speed8);
    digitalWrite(PORT_BRAKE,HIGH);
  }
}
const static int8_t iConstTargetNear = 1;

static int8_t iTargetNearCounter = 0;
void caclTargetSpeed(void) {
  if(iTargetPositionByHall == -1) {
    return;
  }
  int8_t diff = abs(iTargetPositionByHall - iPositionByHall);
  if(diff <= iConstTargetNear ) {
    if(iTargetNearCounter++ > 1) {
      iTargetPositionByHall = -1;
    }
    return;
  }
  iTargetNearCounter = 0;
  runToPosion(iTargetPositionByHall);
}

void stopMotor(void) {
  analogWrite(PORT_PWM, 0);
  digitalWrite(PORT_BRAKE,LOW);
  iHallTurnRunStep = -1;
}
void startMotor(void) {
  analogWrite(PORT_PWM, 32);
  iConstCurrentSpeed = 32;
  digitalWrite(PORT_BRAKE,HIGH);
  iHallTurnRunStep = 6;
}
