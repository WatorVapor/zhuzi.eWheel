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

let gElegWriter = false;
const onClickOpenDevice = async (evt) => {
  try {
    const device = await navigator.serial.requestPort({filter: filter});
    console.log('onClickOpenDevice::device=<',device,'>');
    await device.open(serialOption);
    console.log('onClickOpenDevice::device=<',device,'>');
    const reader = device.readable.getReader();
    console.log('onClickOpenDevice::reader=<',reader,'>');

    gElegWriter = device.writable.getWriter();
    console.log('onClickOpenDevice::gElegWriter=<',gElegWriter,'>');

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
        //console.log('readSerailData::readOne lineCmd=<',lineCmd,'>');
        if(lineCmd) {
          readLineBuffer.push(lineCmd);
          onELegInfoLine(lineCmd);
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

const ElegPosCounterStarter = 'iPositionByHall=<';
const ElegPosLowStarter = 'iPositionByHallRangeLow=<';
const ElegPosHighStarter = 'iPositionByHallRangeHigh=<';
const ElegSpeedStarter = 'iConstCurrentSpeed=<';

const onELegInfoLine = (lineCmd) => {
  //console.log('onELegInfoLine::lineCmd=<',lineCmd,'>');
  if( lineCmd.indexOf(ElegPosCounterStarter) >= 0) {
    const currentPos = getValueOfLineCmd(lineCmd);
    //console.log('onELegInfoLine::currentPos=<',currentPos,'>');
    updateRangevalue(currentPos);
  }
  if(lineCmd.indexOf(ElegPosLowStarter) >= 0) {
    const lowPos = getValueOfLineCmd(lineCmd);
    console.log('onELegInfoLine::lowPos=<',lowPos,'>');
    changeLowOfPos(lowPos);
  }
  if(lineCmd.indexOf(ElegPosHighStarter) >= 0) {
    const hightPos = getValueOfLineCmd(lineCmd);
    console.log('onELegInfoLine::hightPos=<',hightPos,'>');
    changeHighOfPos(hightPos);
  }
  if(lineCmd.indexOf(ElegSpeedStarter) >= 0) {
    const speed = getValueOfLineCmd(lineCmd);
    console.log('onELegInfoLine::speed=<',speed,'>');
  }
}

const getValueOfLineCmd =(lineCmd) => {
  const start = lineCmd.indexOf('=<');
  const end = lineCmd.indexOf('>');
  if(start > -1 && end > -1) {
    const value = lineCmd.slice(start+2,end);
    //console.log('onELegInfoLine::value=<',value,'>');
    return parseInt(value);
  }
  return false;
}

const changeLowOfPos = (value) => {
  const minElem = document.getElementById('eleg-position-min');
  minElem.textContent = value;
  const rangeElem = document.getElementById('eleg-position-value-range');
  rangeElem.setAttribute('min',parseInt(value) + 1);
}


const changeHighOfPos = (value) => {
  const maxElem = document.getElementById('eleg-position-max');
  maxElem.textContent = value;
  const rangeElem = document.getElementById('eleg-position-value-range');
  rangeElem.setAttribute('max',parseInt(value) -1);
}

const onClickCalibratePosition = (evt) => {
  try {
  if(gElegWriter) {
    const reqcalibrate = 'calibrate\n';
    const wBuff = new TextEncoder().encode(reqcalibrate);
    console.log('onClickCalibratePosition::wBuff=<',wBuff,'>');
    gElegWriter.write(wBuff);
  }
  }
  catch(e) {
    console.log('onClickCalibratePosition::e=<',e,'>');
  }
}

const onClickTurnZ = (evt) => {
  try {
  if(gElegWriter) {
    const reqcalibrate = 'z\n';
    const wBuff = new TextEncoder().encode(reqcalibrate);
    console.log('onClickTurnZ::wBuff=<',wBuff,'>');
    gElegWriter.write(wBuff);
  }
  }
  catch(e) {
    console.log('onClickTurnZ::e=<',e,'>');
  }
}

const onClickTurnF = (evt) => {
  try {
  if(gElegWriter) {
    const reqcalibrate = 'f\n';
    const wBuff = new TextEncoder().encode(reqcalibrate);
    console.log('onClickTurnF::wBuff=<',wBuff,'>');
    gElegWriter.write(wBuff);
  }
  }
  catch(e) {
    console.log('onClickTurnF::e=<',e,'>');
  }
}

const onClickTurnG = (evt) => {
  try {
  if(gElegWriter) {
    const reqcalibrate = 'g\n';
    const wBuff = new TextEncoder().encode(reqcalibrate);
    console.log('onClickTurnG::wBuff=<',wBuff,'>');
    gElegWriter.write(wBuff);
  }
  }
  catch(e) {
    console.log('onClickTurnG::e=<',e,'>');
  }
}




const onChangePosition = (elem) => {
  try {
    changeRangevalue(elem.value);
    if(gElegWriter) {
      //console.log('onClickChangePosition::elem.value=<',elem.value,'>');
      const reqPosition = `pos:${elem.value}\n`;
      const wBuff = new TextEncoder().encode(reqPosition);
      //console.log('onClickChangePosition::wBuff=<',wBuff,'>');
      gElegWriter.write(wBuff);
    }
  }
  catch(e) {
    console.log('onClickChangePosition::e=<',e,'>');
  }
}

const changeRangevalue = (value) => {
  const targetElem = document.getElementById('eleg-position-value-target-label');
  targetElem.textContent = value;
  updateRangevalue(value);
}

const updateRangevalue = (value) => {
  //console.log('updateRangevalue::value=<',value,'>');
  const labelElem = document.getElementById('eleg-position-value-label');
  labelElem.textContent = value;
 
 //console.log('updateRangevalue::value=<',value,'>');
  const rangeElem = document.getElementById('eleg-position-value-range');
  rangeElem.value = value;
}
