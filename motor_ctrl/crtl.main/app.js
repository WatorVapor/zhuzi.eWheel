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

const ZhuZiMotorId = 'motorid=<';
const onZhuZiInfoLine = (lineCmd,port) => {
  //console.log('onZhuZiInfoLine::lineCmd=<',lineCmd,'>');
  if(lineCmd.indexOf(ZhuZiMotorId) >= 0) {
    const motorid = getValueOfLineCmd(lineCmd);
    //console.log('onZhuZiInfoLine::motorid=<',motorid,'>');
    const motoridStr = String.fromCharCode(motorid);
    //console.log('onZhuZiInfoLine::motoridStr=<',motoridStr,'>');
    onMotorIdFromBoard(motoridStr,port);
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
  console.log('onMotorIdFromBoard::motorid=<',motorid,'>');
  console.log('onMotorIdFromBoard::port=<',port.path,'>');
  ZhuZiMotorDevices[motorid] = port;
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
    console.log('onGamePadEventForward::wBuffR=<',wBuffR,'>');
    portR.write(wBuffR);
    
    const reqStrL = 'z\n';
    const wBuffL = Buffer.from(reqStrL,'utf-8');
    console.log('onGamePadEventForward::wBuffL=<',wBuffL,'>');
    portL.write(wBuffL);

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    portR.write(wBuffGo);    
    portL.write(wBuffGo);    
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}

const onGamePadEventRigth = (data) => {
  console.log('onGamePadEventRigth::data=<',data,'>');
}

const onGamePadEventBack = (data) => {
  console.log('onGamePadEventBack::data=<',data,'>');
  const portR = ZhuZiMotorDevices['r'];
  const portL = ZhuZiMotorDevices['l'];
  try {
    const reqStrR = 'z\n';
    const wBuffR = Buffer.from(reqStrR,'utf-8');
    console.log('onGamePadEventForward::wBuffR=<',wBuffR,'>');
    portR.write(wBuffR);
    
    const reqStrL = 'f\n';
    const wBuffL = Buffer.from(reqStrL,'utf-8');
    console.log('onGamePadEventForward::wBuffL=<',wBuffL,'>');
    portL.write(wBuffL);

    const reqStrGo = 'g\n';
    const wBuffGo = Buffer.from(reqStrGo,'utf-8');
    console.log('onGamePadEventForward::wBuffGo=<',wBuffGo,'>');
    portR.write(wBuffGo);    
    portL.write(wBuffGo);    
  }
  catch(e) {
    console.log('onGamePadEventForward::e=<',e,'>');
  }
}

const onGamePadEventLeft = (data) => {
  console.log('onGamePadEventLeft::data=<',data,'>');
}
