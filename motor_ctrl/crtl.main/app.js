const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

const findZhuZiDevices = async () => {
  const ports = await SerialPort.list();
  console.log('findZhuZiDevices::ports=<',ports,'>');
  for(const port of ports) {
    //console.log('findZhuZiDevices::port=<',port,'>');
    if(port.vendorId === '1A86' || port.vendorId === '1a86') {
      //console.log('findZhuZiDevices::port=<',port,'>');
      tryOpenZhuZiDevice(port);
    }
  }
}
findZhuZiDevices();

const serailOption = {
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false,
};

const tryOpenZhuZiDevice = (port) => {
  console.log('tryOpenZhuZiDevice::port=<',port,'>');
  const zhuzhiport = new SerialPort(port.path,serailOption);
  console.log('tryOpenZhuZiDevice::zhuzhiport=<',zhuzhiport,'>');
  const parser = new Readline();
  zhuzhiport.pipe(parser);
  console.log('tryOpenZhuZiDevice::zhuzhiport=<',zhuzhiport,'>');
  parser.on('data', (data)=>{
    //console.log('tryOpenZhuZiDevice::data=<',data,'>');
    onZhuZiInfoLine(data,zhuzhiport);
  });
}

const ZhuZiMotorDevices = {};
const ZhuZiMotorIdByPath = {};

const ZhuZiMotorId = 'motorid=<';
const ZhuZiHallRunStep = 'iHTS=<';
const ZhuZiHallCounter = 'iHTC=<';

const onZhuZiInfoLine = (lineCmd,port) => {
  //console.log('onZhuZiInfoLine::lineCmd=<',lineCmd,'>');
  if(lineCmd.indexOf(ZhuZiMotorId) >= 0) {
    const motorid = getValueOfLineCmd(lineCmd);
    //console.log('onZhuZiInfoLine::motorid=<',motorid,'>');
    const motoridStr = String.fromCharCode(motorid);
    //console.log('onZhuZiInfoLine::motoridStr=<',motoridStr,'>');
    onMotorIdFromBoard(motoridStr,port);
  }
  if(lineCmd.indexOf(ZhuZiHallRunStep) >= 0) {
    const step = getValueOfLineCmd(lineCmd);
    //console.log('onZhuZiInfoLine::step=<',step,'>');
    //console.log('tryOpenZhuZiDevice::port.path=<',port.path,'>');
    if(gControlSpeedByHall) {
      onHallCounterFromBoard(parseInt(step),port.path);
    }
  }
  if(lineCmd.indexOf(ZhuZiHallCounter) >= 0) {
    const counter = getValueOfLineCmd(lineCmd);
    //console.log('onZhuZiInfoLine::counter=<',counter,'>');
    //console.log('tryOpenZhuZiDevice::port.path=<',port.path,'>');
  }
}
const getValueOfLineCmd =(lineCmd) => {
  const start = lineCmd.indexOf('=<');
  const end = lineCmd.indexOf('>');
  if(start > -1 && end > -1) {
    const value = lineCmd.slice(start+2,end);
    //console.log('onZhuZiInfoLine::value=<',value,'>');
    return parseInt(value);
  }
  return false;
}

const onMotorIdFromBoard = (motorid,port) => {
  //console.log('onMotorIdFromBoard::motorid=<',motorid,'>');
  //console.log('onMotorIdFromBoard::port=<',port.path,'>');
  ZhuZiMotorDevices[motorid] = port;
  ZhuZiMotorIdByPath[port.path] = motorid;
  //console.log('onMotorIdFromBoard::ZhuZiMotorDevices=<',ZhuZiMotorDevices,'>');
  //console.log('onMotorIdFromBoard::ZhuZiMotorIdByPath=<',ZhuZiMotorIdByPath,'>');
}

const HallRunStepOnTimeLine = {};
const onHallCounterFromBoard = (step,port) => {
  //console.log('onHallCounterFromBoard::motorid=<',motorid,'>');
  //console.log('onHallCounterFromBoard::port=<',port,'>');
  const motorid = ZhuZiMotorIdByPath[port];
  if(!HallRunStepOnTimeLine[motorid]) {
    HallRunStepOnTimeLine[motorid] = [];
  }
  HallRunStepOnTimeLine[motorid].push({step:step,ts:new Date()});
  /*
  if(step === 1) {
    console.log('onHallCounterFromBoard::HallRunStepOnTimeLine=<',JSON.stringify(HallRunStepOnTimeLine,undefined,2),'>');
  }
  */
  if(step > 16) {
    feedBackSpeedHall();
  }
}

const clearHallStepBuffer = () => {
  let keys = Object.keys(HallRunStepOnTimeLine);
  for(const key of keys) {
    delete HallRunStepOnTimeLine[key];
  }
}

const iBaseSpeedOfMotion = 64;
const iStepSpeedOfMotionBaseFactor = 1*100;

const trimSpeed = (speed) => {
  if(speed < 16) {
    speed = 16;
  }
  if(speed > 128) {
    speed = 128;
  }
  return parseInt(speed);
}

const feedBackSpeedHall = ()=> {
  //console.log('feedBackSpeedHall::HallRunStepOnTimeLine=<',HallRunStepOnTimeLine,'>');
  //console.log('feedBackSpeedHall::HallRunStepOnTimeLine=<',JSON.stringify(HallRunStepOnTimeLine,undefined,2),'>');
  let keys = Object.keys(HallRunStepOnTimeLine);
  if(keys.length < 2) {
    return;
  }
  const aMotor = keys[0];
  const aMotionSteps = HallRunStepOnTimeLine[aMotor];
  const bMotor = keys[1];
  const bMotionSteps = HallRunStepOnTimeLine[bMotor];
  //console.log('feedBackSpeedHall::aMotionSteps=<',aMotionSteps,'>');
  //console.log('feedBackSpeedHall::bMotionSteps=<',bMotionSteps,'>');
  let speedSumA = 0.0;
  let aMotorStartAt = false;
  let aMotorCurAt = false;
  if(aMotionSteps.length > 2) {
    aMotorStartAt = aMotionSteps[1];
    aMotorCurAt = aMotionSteps[aMotionSteps.length-1];
    //console.log('feedBackSpeedHall::aMotorStartAt=<',aMotorStartAt,'>');
    //console.log('feedBackSpeedHall::aMotorCurAt=<',aMotorCurAt,'>');
    const escape_ms = aMotorCurAt.ts  - aMotorStartAt.ts;
    speedSumA = (aMotorStartAt.step - aMotorCurAt.step) / escape_ms;
  }
  //console.log('feedBackSpeedHall::speedSumA=<',speedSumA,'>');
  let speedSumB = 0.0;
  let bMotorStartAt = false;
  let bMotorCurAt = false;
  if(bMotionSteps.length > 2) {
    bMotorStartAt = bMotionSteps[1];
    bMotorCurAt = bMotionSteps[bMotionSteps.length-1];
    //console.log('feedBackSpeedHall::bMotorStartAt=<',bMotorStartAt,'>');
    //console.log('feedBackSpeedHall::bMotorCurAt=<',bMotorCurAt,'>');
    const escape_ms = bMotorCurAt.ts  - bMotorStartAt.ts;
    speedSumB = (bMotorStartAt.step - bMotorCurAt.step) / escape_ms;
  }
  //console.log('feedBackSpeedHall::speedSumB=<',speedSumB,'>');
  const speedDiff = speedSumA - speedSumB;
  console.log('feedBackSpeedHall::speedDiff=<',speedDiff,'>');
  if(Math.abs(speedDiff) > 0.0) {
    const deltaSpeed = iStepSpeedOfMotionBaseFactor * speedDiff;
    console.log('feedBackSpeedHall::deltaSpeed=<',deltaSpeed,'>');
    let speedAFactor = iBaseSpeedOfMotion - deltaSpeed; 
    if(aMotorStartAt && aMotorCurAt) {
      speedAFactor = aMotorCurAt.step * speedAFactor/aMotorStartAt.step;
    }
    console.log('feedBackSpeedHall::speedAFactor=<',speedAFactor,'>');
    const speedPWMA = trimSpeed(speedAFactor);
    console.log('feedBackSpeedHall::speedPWMA=<',speedPWMA,'>');
    const reqStrSpdA = `spd:${speedPWMA}\n`;
    const wBuffSpdA = Buffer.from(reqStrSpdA,'utf-8');
    //console.log('feedBackSpeedHall::reqStrSpdA=<',reqStrSpdA,'>');
    const portA = ZhuZiMotorDevices[aMotor];
   
    let speedBFactor = iBaseSpeedOfMotion + deltaSpeed;
    if(bMotorCurAt && bMotorStartAt) {
      speedBFactor = bMotorCurAt.step * speedBFactor / bMotorStartAt.step;
    }
    console.log('feedBackSpeedHall::speedBFactor=<',speedBFactor,'>');    
    const speedPWMB = trimSpeed(speedBFactor);
    console.log('feedBackSpeedHall::speedPWMB=<',speedPWMB,'>');
    const reqStrSpdB = `spd:${speedPWMB}\n`;
    const wBuffSpdB = Buffer.from(reqStrSpdB,'utf-8');
    //console.log('feedBackSpeedHall::reqStrSpdB=<',reqStrSpdB,'>');
    const portB = ZhuZiMotorDevices[bMotor];
    portA.write(wBuffSpdA);    
    portB.write(wBuffSpdB);    
    
  }
}

const reportStats = (aMotionSteps,bMotionSteps) => {
  const lastAMotion = aMotionSteps[aMotionSteps.length-1];
  const lastBMotion = bMotionSteps[bMotionSteps.length-1];
  if(lastAMotion.step === 1 && lastBMotion.step === 1) {
    console.log('feedBackSpeedHall::lastAMotion=<',lastAMotion,'>');
    console.log('feedBackSpeedHall::lastBMotion=<',lastBMotion,'>');
    const firstAMotion = aMotionSteps[0];
    const firstBMotion = bMotionSteps[0];
    console.log('feedBackSpeedHall::firstAMotion=<',firstAMotion,'>');
    console.log('feedBackSpeedHall::firstBMotion=<',firstBMotion,'>');
    const elscapeA = lastAMotion.ts - firstAMotion.ts;
    console.log('feedBackSpeedHall::elscapeA=<',elscapeA,'>');
    const elscapeB = lastBMotion.ts - firstBMotion.ts;
    console.log('feedBackSpeedHall::elscapeB=<',elscapeB,'>');
  }
}


const HID = require('node-hid');
const hidDevices = HID.devices();
//console.log('::hidDevices=<',hidDevices,'>');
let gDataRepeartInterval = false;
let gInputData = false;

const openHidDevice = (info) => {
  console.log('openHidDevice::info=<',info,'>');
  const device = new HID.HID(info.path);
  console.log('openHidDevice::device=<',device,'>');
  device.on('data', (data) => {
    //console.log('openHidDevice::data=<',data,'>');
    gInputData = data;
    if(gDataRepeartInterval === false) {
      gDataRepeartInterval = setInterval(()=>{
        onGamePadInput(gInputData);
      },50);
    }
  });
  device.on('error', (error) => {
    console.log('openHidDevice::error=<',error,'>');
  });
};

for(const hidDevice of hidDevices) {
  //console.log('::hidDevice=<',hidDevice,'>');
  if(hidDevice.product === 'Logicool Dual Action') {
    openHidDevice(hidDevice);
  }
}

const onGamePadInput = (data) => {
  //console.log('onGamePadInput::data=<',data,'>');
  if (data.length > 4) {
    //console.log('onGamePadInput::data[4]=<',data[4],'>');
    if(data[4] === 0) {
      onGamePadEventForward(data);
    }
    if(data[4] === 2) {
      onGamePadEventRigth(data);
    }
    if(data[4] === 4) {
      onGamePadEventBack(data);
    }
    if(data[4] === 6) {
      onGamePadEventLeft(data);
    }
    onGamePadJoysStick(data[0],data[1],data[2],data[3]);
  }
}

const onGamePadEventForward = (data) => {
  gControlSpeedByHall = true;
  //console.log('onGamePadEventForward::data=<',data,'>');
  const portR = ZhuZiMotorDevices['r'];
  const portL = ZhuZiMotorDevices['l'];
  try {
    const reqStrR = 'z\n';
    const wBuffR = Buffer.from(reqStrR,'utf-8');
    //console.log('onGamePadEventForward::wBuffR=<',wBuffR,'>');
    portR.write(wBuffR);
    
    const reqStrL = 'f\n';
    const wBuffL = Buffer.from(reqStrL,'utf-8');
    //console.log('onGamePadEventForward::wBuffL=<',wBuffL,'>');
    portL.write(wBuffL);

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    clearHallStepBuffer();
    portR.write(wBuffGo);    
    portL.write(wBuffGo);
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}

const onGamePadEventRigth = (data) => {
  gControlSpeedByHall = false;
  //console.log('onGamePadEventRigth::data=<',data,'>');
  const portR = ZhuZiMotorDevices['r'];
  const portL = ZhuZiMotorDevices['l'];
  try {
    const reqStrR = 'f\n';
    const wBuffR = Buffer.from(reqStrR,'utf-8');
    //console.log('onGamePadEventForward::wBuffR=<',wBuffR,'>');
    portR.write(wBuffR);
    
    const reqStrL = 'f\n';
    const wBuffL = Buffer.from(reqStrL,'utf-8');
    //console.log('onGamePadEventForward::wBuffL=<',wBuffL,'>');
    portL.write(wBuffL);

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    clearHallStepBuffer();
    portR.write(wBuffGo);    
    portL.write(wBuffGo);
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}

const onGamePadEventBack = (data) => {
  gControlSpeedByHall = true;
  //console.log('onGamePadEventBack::data=<',data,'>');
  const portR = ZhuZiMotorDevices['r'];
  const portL = ZhuZiMotorDevices['l'];
  try {
    const reqStrR = 'f\n';
    const wBuffR = Buffer.from(reqStrR,'utf-8');
    //console.log('onGamePadEventForward::wBuffR=<',wBuffR,'>');
    portR.write(wBuffR);
    
    const reqStrL = 'z\n';
    const wBuffL = Buffer.from(reqStrL,'utf-8');
    //console.log('onGamePadEventForward::wBuffL=<',wBuffL,'>');
    portL.write(wBuffL);

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    clearHallStepBuffer();
    portR.write(wBuffGo);    
    portL.write(wBuffGo);    
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}

const onGamePadEventLeft = (data) => {
  gControlSpeedByHall = false;
  //console.log('onGamePadEventLeft::data=<',data,'>');
  const portR = ZhuZiMotorDevices['r'];
  const portL = ZhuZiMotorDevices['l'];
  try {
    const reqStrR = 'z\n';
    const wBuffR = Buffer.from(reqStrR,'utf-8');
    //console.log('onGamePadEventForward::wBuffR=<',wBuffR,'>');
    portR.write(wBuffR);
    
    const reqStrL = 'z\n';
    const wBuffL = Buffer.from(reqStrL,'utf-8');
    //console.log('onGamePadEventForward::wBuffL=<',wBuffL,'>');
    portL.write(wBuffL);

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    clearHallStepBuffer();
    portR.write(wBuffGo);    
    portL.write(wBuffGo);
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}

const iConstCenterCutter = 64;
const iConstCenterPos = 128;
const iConstMaxPos = 255;
const iConstMinPos = 0;
let gControlSpeedByHall = false;


let gLoopStick1 = iConstCenterPos;
let gLoopStick2 = iConstCenterPos;
let gLoopStick3 = iConstCenterPos;
let gLoopStick4 = iConstCenterPos;
const onGamePadJoysStick = (stick1,stick2,stick3,stick4) => {
  gLoopStick1 = stick1;
  gLoopStick2 = stick2;
  gLoopStick3 = stick3;
  gLoopStick4 = stick4;
  onGamePadJoysStickSelfLoop(gLoopStick1,gLoopStick2,gLoopStick3,gLoopStick4);
}

const onGamePadJoysStickSelfLoop = (stick1,stick2,stick3,stick4) => {
  /*
  if(Math.abs(stick1-128) > iConstCenterCutter) {
    console.log('onGamePadJoysStickSelfLoop::stick1=<',stick1,'>');
  }
  if(Math.abs(stick2-128) > iConstCenterCutter) {
    console.log('onGamePadJoysStickSelfLoop::stick2=<',stick2,'>');
  }
  if(Math.abs(stick3-128) > iConstCenterCutter) {
    console.log('onGamePadJoysStickSelfLoop::stick3=<',stick3,'>');
  }
  if(Math.abs(stick4-128) > iConstCenterCutter) {
    console.log('onGamePadJoysStickSelfLoop::stick4=<',stick4,'>');
  }
  */
  
  /*
  if(Math.abs(stick4-iConstCenterPos) > iConstCenterCutter || Math.abs(stick2-iConstCenterPos) > iConstCenterCutter) {
    //console.log('onGamePadJoysStickSelfLoop::stick1=<',stick1,'>');
    //console.log('onGamePadJoysStickSelfLoop::stick2=<',stick2,'>');
    onGamePadAnalogTwoStick(stick2,stick4);
    gControlSpeedByHall = false;
  }
  */
  if(Math.abs(stick1-iConstCenterPos) > iConstCenterCutter || Math.abs(stick2-iConstCenterPos) > iConstCenterCutter) {
    //console.log('onGamePadJoysStickSelfLoop::stick1=<',stick1,'>');
    //console.log('onGamePadJoysStickSelfLoop::stick2=<',stick2,'>');
    onGamePadAnalogOneStick(stick1,stick2);
    gControlSpeedByHall = false;
  }
  
}

const covertInput2Speed = (input) => {
  return iConstCenterPos - input;
}

const onGamePadAnalogTwoStick = (lInput,rRigth) => {
  console.log('onGamePadAnalogTwoStick::lInput=<',lInput,'>');
  const speedLeft = covertInput2Speed(lInput);
  console.log('onGamePadAnalogTwoStick::speedLeft=<',speedLeft,'>');
  console.log('onGamePadAnalogTwoStick::rRigth=<',rRigth,'>');
  const speedRigth = covertInput2Speed(rRigth);
  console.log('onGamePadAnalogTwoStick::speedRigth=<',speedRigth,'>');
  try {
    const portR = ZhuZiMotorDevices['r'];
    const portL = ZhuZiMotorDevices['l'];
    if(speedLeft > 0) {
      const reqStrL = 'f\n';
      const wBuffL = Buffer.from(reqStrL,'utf-8');
      //console.log('onGamePadAnalogTwoStick::wBuffL=<',wBuffL,'>');
      portL.write(wBuffL);    
    } else {
      const reqStrL = 'z\n';
      const wBuffL = Buffer.from(reqStrL,'utf-8');
      //console.log('onGamePadAnalogTwoStick::wBuffL=<',wBuffL,'>');
      portL.write(wBuffL);        
    }
    if(speedRigth > 0) {
      const reqStrR = 'z\n';
      const wBuffR = Buffer.from(reqStrR,'utf-8');
      //console.log('onGamePadAnalogTwoStick::wBuffR=<',wBuffR,'>');
      portR.write(wBuffR);
    } else {
      const reqStrR = 'f\n';
      const wBuffR = Buffer.from(reqStrR,'utf-8');
      //console.log('onGamePadAnalogTwoStick::wBuffR=<',wBuffR,'>');
      portR.write(wBuffR);
    }
    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadAnalogTwoStick::wBuffGo=<',wBuffGo,'>');
    
    if(Math.abs(speedLeft) > iConstCenterCutter) {
      const reqStrSpdL = `spd:${Math.abs(speedLeft)}\n`;
      const wBuffSpdL = Buffer.from(reqStrSpdL,'utf-8');
      //console.log('onGamePadAnalogTwoStick::wBuffSpdL=<',wBuffSpdL,'>');
      portL.write(wBuffSpdL);
      portL.write(wBuffGo);
    }

    if(Math.abs(speedRigth) > iConstCenterCutter) {
      const reqStrSpdR = `spd:${Math.abs(speedRigth)}\n`;
      const wBuffSpdR = Buffer.from(reqStrSpdR,'utf-8');
      //console.log('onGamePadAnalogTwoStick::wBuffSpdR=<',wBuffSpdR,'>');
      portR.write(wBuffSpdR);    
      portR.write(wBuffGo);
    }
  } catch(e) {
    console.log('onGamePadAnalogTwoStick::e=<',e,'>');
  }
}

const calcSpeedXY = (x,y) => {
  const xSpeed = iConstCenterPos - x;
  const ySpeed = iConstCenterPos - y;
  console.log('calcSpeedLeft::xSpeed=<',xSpeed,'>');
  console.log('calcSpeedLeft::ySpeed=<',ySpeed,'>');
  let lWheel = ySpeed;
  let rWheel = ySpeed;
  lWheel -= xSpeed;
  rWheel += xSpeed;
  return {l:lWheel,r:rWheel};
}


const onGamePadAnalogOneStick = (x,y) => {
  const speedXY = calcSpeedXY(x,y);
  console.log('onGamePadAnalogOneStick::speedXY=<',speedXY,'>');
  const speedLeft = speedXY.l;
  const speedRigth = speedXY.r;
  
  try {
    const portR = ZhuZiMotorDevices['r'];
    const portL = ZhuZiMotorDevices['l'];
    if(speedLeft > 0) {
      const reqStrL = 'f\n';
      const wBuffL = Buffer.from(reqStrL,'utf-8');
      //console.log('onGamePadAnalogOneStick::wBuffL=<',wBuffL,'>');
      portL.write(wBuffL);    
    } else {
      const reqStrL = 'z\n';
      const wBuffL = Buffer.from(reqStrL,'utf-8');
      //console.log('onGamePadAnalogOneStick::wBuffL=<',wBuffL,'>');
      portL.write(wBuffL);        
    }
    if(speedRigth > 0) {
      const reqStrR = 'z\n';
      const wBuffR = Buffer.from(reqStrR,'utf-8');
      //console.log('onGamePadAnalogOneStick::wBuffR=<',wBuffR,'>');
      portR.write(wBuffR);
    } else {
      const reqStrR = 'f\n';
      const wBuffR = Buffer.from(reqStrR,'utf-8');
      //console.log('onGamePadAnalogOneStick::wBuffR=<',wBuffR,'>');
      portR.write(wBuffR);
    }
    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadAnalogOneStick::wBuffGo=<',wBuffGo,'>');
    
    if(Math.abs(speedLeft) > iConstCenterCutter) {
      const reqStrSpdL = `spd:${Math.abs(speedLeft)}\n`;
      const wBuffSpdL = Buffer.from(reqStrSpdL,'utf-8');
      //console.log('onGamePadAnalogOneStick::wBuffSpdL=<',wBuffSpdL,'>');
      portL.write(wBuffSpdL);
      portL.write(wBuffGo);
    }

    if(Math.abs(speedRigth) > iConstCenterCutter) {
      const reqStrSpdR = `spd:${Math.abs(speedRigth)}\n`;
      const wBuffSpdR = Buffer.from(reqStrSpdR,'utf-8');
      //console.log('onGamePadAnalogOneStick::wBuffSpdR=<',wBuffSpdR,'>');
      portR.write(wBuffSpdR);    
      portR.write(wBuffGo);
    }
  } catch(e) {
    console.log('onGamePadAnalogOneStick::e=<',e,'>');
  }
}
