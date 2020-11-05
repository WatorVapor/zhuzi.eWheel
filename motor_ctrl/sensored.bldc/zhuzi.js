const filter = [
  { vendorId: 0x1A86 }
];
const serialOption = { 
  baudRate: 115200,
  databits:8,
  stopbits:1,
  parity:'none',
  buffersize:128
};

let gZhuziWriter = false;
const onClickOpenDevice = async (evt) => {
  try {
    const device = await navigator.serial.requestPort({filter: filter});
    console.log('onClickOpenDevice::device=<',device,'>');
    await device.open(serialOption);
    console.log('onClickOpenDevice::device=<',device,'>');
    const reader = device.readable.getReader();
    console.log('onClickOpenDevice::reader=<',reader,'>');

    gZhuziWriter = device.writable.getWriter();
    console.log('onClickOpenDevice::gZhuziWriter=<',gZhuziWriter,'>');

    setTimeout(()=> {
      readSerailData(reader);
    },0);
  }
  catch(e) {
    console.log('onClickListDevice::e=<',e,'>');
  }
}

let readBuffOneLine = '';
let readLineBufferSlice = [];
let readLineBuffer = [];
const elemRead = document.getElementById('serail-output');
const readSerailData = (reader)=> {
  const readOne = reader.read();
  readOne.then((evt)=>{
    //console.log('readSerailData::readOne evt=<',evt,'>');
    //console.log('readSerailData::readOne evt.value=<',evt.value.buffer,'>');
    const utf8txt = new TextDecoder("utf-8").decode(evt.value);
    //console.log('readSerailData::readOne utf8txt=<',utf8txt,'>');
    readBuffOneLine += utf8txt;
    const buffParam = readBuffOneLine.split('\n');
    //console.log('readSerailData::readOne buffParam=<',buffParam,'>');
    if(buffParam.length > 1) {
      for(const lineCmd of buffParam) {
        console.log('readSerailData::readOne lineCmd=<',lineCmd,'>');
        if(lineCmd) {
          readLineBuffer.push(lineCmd);
          onZhuZiInfoLine(lineCmd);
        }
      }
      elemRead.textContent = readLineBuffer.reverse().join('\n');
      const lastElem = buffParam[buffParam.length -1];
      //console.log('readSerailData::readOne lastElem=<',lastElem,'>');
      readBuffOneLine = lastElem;
    }
    if(evt.done === false) {
      setTimeout(()=>{
        readSerailData(reader);
      },0)
    }
  });          
};

const ZhuZiMotorId = 'motorid=<';
const ZhuZiMotorDelay = 'startDelay=<';

const onZhuZiInfoLine = (lineCmd) => {
  //console.log('onZhuZiInfoLine::lineCmd=<',lineCmd,'>');
  if(lineCmd.indexOf(ZhuZiMotorId) >= 0) {
    const motorid = getValueOfLineCmd(lineCmd);
    console.log('onZhuZiInfoLine::motorid=<',motorid,'>');
    const motoridStr = String.fromCharCode(motorid);
    console.log('onZhuZiInfoLine::motoridStr=<',motoridStr,'>');
    onMotorIdFromBoard(motoridStr);
  }
  if(lineCmd.indexOf(ZhuZiMotorDelay) >= 0) {
    const startDelayStr = getValueOfLineCmd(lineCmd);
    console.log('onZhuZiInfoLine::startDelayStr=<',startDelayStr,'>');
    const startDelay = parseInt(startDelayStr);
    console.log('onZhuZiInfoLine::startDelay=<',startDelay,'>');
    onMotorRelayFromBoard(startDelay);
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



const onClickTurnZ = (evt) => {
  try {
  if(gZhuziWriter) {
    const reqcalibrate = 'z\n';
    const wBuff = new TextEncoder().encode(reqcalibrate);
    console.log('onClickTurnZ::wBuff=<',wBuff,'>');
    gZhuziWriter.write(wBuff);
  }
  }
  catch(e) {
    console.log('onClickTurnZ::e=<',e,'>');
  }
}

const onClickTurnF = (evt) => {
  try {
  if(gZhuziWriter) {
    const reqcalibrate = 'f\n';
    const wBuff = new TextEncoder().encode(reqcalibrate);
    console.log('onClickTurnF::wBuff=<',wBuff,'>');
    gZhuziWriter.write(wBuff);
  }
  }
  catch(e) {
    console.log('onClickTurnF::e=<',e,'>');
  }
}

const onClickTurnG = (evt) => {
  try {
    if(gZhuziWriter) {
      const reqcalibrate = 'g\n';
      const wBuff = new TextEncoder().encode(reqcalibrate);
      console.log('onClickTurnG::wBuff=<',wBuff,'>');
      gZhuziWriter.write(wBuff);
    }
  }
  catch(e) {
    console.log('onClickTurnG::e=<',e,'>');
  }
}

const writeMotorId = (id) => {
  try {
    if(gZhuziWriter) {
      const reqcalibrate = `id:${id}\n`;
      const wBuff = new TextEncoder().encode(reqcalibrate);
      console.log('writeMotorId::wBuff=<',wBuff,'>');
      gZhuziWriter.write(wBuff);
    }
  }
  catch(e) {
    console.log('writeMotorId::e=<',e,'>');
  }  
}

const writeMotorDelay = (delay) => {
  try {
    if(gZhuziWriter) {
      const reqcalibrate = `delay:${delay}\n`;
      const wBuff = new TextEncoder().encode(reqcalibrate);
      console.log('writeMotorDelay::wBuff=<',wBuff,'>');
      gZhuziWriter.write(wBuff);
    }
  }
  catch(e) {
    console.log('writeMotorDelay::e=<',e,'>');
  }  
}


