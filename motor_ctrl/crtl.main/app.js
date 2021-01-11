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
    onHallCounterFromBoard(parseInt(step),port.path);
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
  console.log('onHallCounterFromBoard::motorid=<',motorid,'>');
  console.log('onHallCounterFromBoard::port=<',port,'>');
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
      //onGamePadEventRigth(data);
    }
    if(data[4] === 4) {
      onGamePadEventBack(data);
    }
    if(data[4] === 6) {
      //onGamePadEventLeft(data);
    }
    //onGamePadJoysStick(data[0],data[1],data[2],data[3]);
  }
}

const onGamePadEventForward = (data) => {
  //console.log('onGamePadEventForward::data=<',data,'>');
  const port = ZhuZiMotorDevices['r'] || ZhuZiMotorDevices['l'];
  try {
    const reqStr = 'z\n';
    const wBuff = Buffer.from(reqStr,'utf-8');
    //console.log('onGamePadEventForward::wBuff=<',wBuff,'>');
    port.write(wBuff);
    

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    port.write(wBuffGo);    
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}


const onGamePadEventBack = (data) => {
  //console.log('onGamePadEventForward::data=<',data,'>');
  const port = ZhuZiMotorDevices['r'] || ZhuZiMotorDevices['l'];
  try {
    const reqStr = 'f\n';
    const wBuff = Buffer.from(reqStr,'utf-8');
    //console.log('onGamePadEventForward::wBuff=<',wBuff,'>');
    port.write(wBuff);
    

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    //console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    port.write(wBuffGo);    
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}
