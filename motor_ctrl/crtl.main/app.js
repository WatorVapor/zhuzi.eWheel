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
  //console.log('tryOpenZhuZiDevice::port=<',port,'>');
  const zhuzhiport = new SerialPort(port.path,serailOption);
  const parser = new Readline();
  zhuzhiport.pipe(parser);
  //console.log('tryOpenZhuZiDevice::zhuzhiport=<',zhuzhiport,'>');
  parser.on('data', (data)=>{
    //console.log('tryOpenZhuZiDevice::data=<',data,'>');
    onZhuZiInfoLine(data,zhuzhiport);
  });
}

const ZhuZiMotorDevices = {};
const ZhuZiMotorIdByPath = {};

const ZhuZiMotorId = 'motorid=<';
const ZhuZiHallRunStep = 'iHallTurnRunStep=<';

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
    onHallCounterFromBoard(parseInt(step),port.path);
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
  feedBackSpeedHall(HallRunStepOnTimeLine);
}

const clearHallStepBuffer = () => {
  let keys = Object.keys(HallRunStepOnTimeLine);
  for(const key of keys) {
    delete HallRunStepOnTimeLine[key];
  }
}

const iBaseSpeedOfMotion = 64;
const iStepSpeedOfMotion = 16;

const trimSpeed = (speed) => {
  if(speed < 0) {
    speed = 0;
  }
  if(speed > 255) {
    speed = 255;
  }
  return speed;
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
  const stepDiff = aMotionSteps.length - bMotionSteps.length;
  console.log('feedBackSpeedHall::stepDiff=<',stepDiff,'>');
  if(Math.abs(stepDiff) > 0) {
    const deltaSpeed = iStepSpeedOfMotion * stepDiff;
    
    const speedA = trimSpeed(iBaseSpeedOfMotion - deltaSpeed);
    const reqStrSpdA = `spd:${speedA}\n`;
    const wBuffSpdA = Buffer.from(reqStrSpdA,'utf-8');
    console.log('onGamePadEventForward::reqStrSpdA=<',reqStrSpdA,'>');
    const portA = ZhuZiMotorDevices[aMotor];
    portA.write(wBuffSpdA);    
   
    const speedB = trimSpeed(iBaseSpeedOfMotion + deltaSpeed);
    const reqStrSpdB = `spd:${speedB}\n`;
    const wBuffSpdB = Buffer.from(reqStrSpdB,'utf-8');
    console.log('onGamePadEventForward::reqStrSpdB=<',reqStrSpdB,'>');
    const portB = ZhuZiMotorDevices[bMotor];
    portB.write(wBuffSpdB);    
    
  }
}


const HID = require('node-hid');
const hidDevices = HID.devices();
//console.log('::hidDevices=<',hidDevices,'>');

const openHidDevice = (info) => {
  console.log('openHidDevice::info=<',info,'>');
  const device = new HID.HID(info.path);
  console.log('openHidDevice::device=<',device,'>');
  device.on('data', (data) => {
    //console.log('openHidDevice::data=<',data,'>');
    onGamePadInput(data);
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
  }
}

const onGamePadEventForward = (data) => {
  //console.log('onGamePadEventForward::data=<',data,'>');
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

const onGamePadEventRigth = (data) => {
  //console.log('onGamePadEventRigth::data=<',data,'>');
}

const onGamePadEventBack = (data) => {
  //console.log('onGamePadEventBack::data=<',data,'>');
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

const onGamePadEventLeft = (data) => {
  //console.log('onGamePadEventLeft::data=<',data,'>');
}
