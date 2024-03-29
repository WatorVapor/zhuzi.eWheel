let gSerialWriter = false;
const openSerialOfLidar = () => {
  const serialOption = { 
    baudRate: 115200,
    databits:8,
    stopbits:1,
    parity:'none',
    buffersize:32
  };  
  openSerialDevice(serialOption,(writer)=>{
    console.log('openSerialOfLidar::writer=<',writer,'>');
    gSerialWriter = writer;
    setTimeout(()=>{
      startHokuyo1();
    },10);
  });
}

const startHokuyo1 = () => {
  const buffWrite = Buffer.from('L1\n','utf-8');
  gSerialWriter.write(buffWrite);
}

const scan_deg = 180.0; 
const cluster = 3;
let gSentCmdStr = false;
const readHokuyo = () => {
  const angle_read = 0.0 - scan_deg/2.0;
  const minstep = 384 - (scan_deg/2.0)/.351;
  const maxstep = 384 + (scan_deg/2.0)/.351;  
  const readCmd = `G${zeroPadding(minstep,3)}${zeroPadding(maxstep,3)}${zeroPadding(cluster,2)}\n`;
  console.log('readHokuyo::readCmd=<',readCmd,'>');
  gSentCmdStr = readCmd;
  const buffWrite = Buffer.from(readCmd,'utf-8');
  gSerialWriter.write(buffWrite);
}


//const LidarPackSeperator = 'aa552828';
const LidarPackSeperator = 'aa55';
const Buffer = buffer.Buffer;
let gAllBufferHex = '';
let gAllBufferUtf8 = '';
const onRecvSerialMsg = (msg) => {
  //console.log('onRecvSerialMsg::msg=<',msg,'>');
  const buffMsg = Buffer.from(msg);
  //console.log('onRecvSerialMsg::buffMsg=<',buffMsg,'>');
  const buffHex = buffMsg.toString('hex');
  //console.log('onRecvSerialMsg::buffHex=<',buffHex,'>');
  const buffUtf8 = buffMsg.toString('utf-8');
  //console.log('onRecvSerialMsg::buffUtf8=<',buffUtf8,'>');
  gAllBufferUtf8 += buffUtf8;
  //console.log('onRecvSerialMsg::gAllBufferUtf8=<',gAllBufferUtf8,'>');
  if(gAllBufferUtf8.startsWith('L1\n0')) {
    console.log('onRecvSerialMsg::gAllBufferUtf8=<',gAllBufferUtf8,'>');
    gAllBufferUtf8 = '';
    setTimeout(()=>{
      readHokuyo();
    },1);    
    return;
  }
  if(gSentCmdStr) {
    if(gAllBufferUtf8.startsWith(gSentCmdStr)) {
      console.log('onRecvSerialMsg::gAllBufferUtf8=<',gAllBufferUtf8,'>');
    }
  }

  //gAllBufferHex += buffHex;
  //console.log('onRecvSerialMsg::gAllBufferHex=<',gAllBufferHex,'>');
  gAllBufferHex += buffHex;
  //console.log('onRecvSerialMsg::gAllBufferHex=<',gAllBufferHex,'>');
  const resultFrames = gAllBufferHex.split(LidarPackSeperator);
  //console.log('onRecvSerialMsg::resultFrames=<',resultFrames,'>');
  if(resultFrames.length > 0) {
    for(let index = 0;index < resultFrames.length -1 ;index++) {
      onOneFrameLidarRawData(resultFrames[index]);
    }
    gAllBufferHex = resultFrames[resultFrames.length -1];
  }
  //console.log('onRecvSerialMsg::gAllBufferHex=<',gAllBufferHex,'>');  
}

const onOneFrameLidarRawData = (oneFrame) => {
  //console.log('onOneFrameLidarRawData::oneFrame=<',oneFrame,'>');
  //console.log('onOneFrameLidarRawData::oneFrame.length=<',oneFrame.length,'>');
  if(oneFrame.length === 256) {
    onOneFrameLidarData(oneFrame);
  } else {
    //console.log('onOneFrameLidarRawData::oneFrame=<',oneFrame,'>');
    //console.log('onOneFrameLidarRawData::oneFrame.length=<',oneFrame.length,'>');
  }
}
const kStepAngle = (0.0 -Math.PI*2);
const onOneFrameLidarData = (oneFrame) => {
  //console.log('onOneFrameLidarData::oneFrame=<',oneFrame,'>');
  //console.log('onOneFrameLidarData::oneFrame.length=<',oneFrame.length,'>');
  const frameData = Buffer.from(oneFrame,'hex');
  //console.log('onOneFrameLidarData::frameData=<',frameData,'>');
  //console.log('onOneFrameLidarData::frameData.length=<',frameData.length,'>');
  const pack_type = frameData[0];
  const data_length = frameData[1];
  //console.log('onOneFrameLidarData::pack_type=<',pack_type,'>');
  //console.log('onOneFrameLidarData::data_length=<',data_length,'>');
  const start_angle = (frameData[3] << 8) + frameData[2];
  //console.log('onOneFrameLidarData::start_angle=<',start_angle,'>');
  const stop_angle  = (frameData[5] << 8) + frameData[4];
  //console.log('onOneFrameLidarData::stop_angle =<',stop_angle ,'>');
  let diff = stop_angle - start_angle;
  if (stop_angle < start_angle ) {
    diff =  0xB400 - start_angle + stop_angle
  }
  let angle_per_sample = 0;
  if (diff > 1 && (data_length-1) > 0) {
    angle_per_sample = diff / (data_length-1)
  }
  //console.log('onOneFrameLidarData::angle_per_sample=<',angle_per_sample,'>');
  const dataOffset = 8;
  const cloudPoints = [];
  for(let index = 0; index < data_length;index++) {
    const data0 = frameData[dataOffset + index*3 + 0];
    const quality = data0;
    //console.log('onOneFrameLidarData::quality=<',quality,'>');
    const data1 = frameData[dataOffset + index*3 + 1];
    const data2 = frameData[dataOffset + index*3 + 2];
    const distanceMM = data2  << 8 + data1;
    //console.log('onOneFrameLidarData::distanceMM=<',distanceMM,'>');
    const distanceM = parseFloat(distanceMM)/1000;
    //console.log('onOneFrameLidarData::distanceM=<',distanceM,'>');
    const angle = (start_angle + angle_per_sample * index);
    const anglef = kStepAngle * (angle / 0xB400) ;
    //console.log('onOneFrameLidarData::anglef=<',anglef,'>');
    const x = distanceM * Math.cos(anglef);
    const y = distanceM * Math.sin(anglef);
    if(quality > 2 && Math.abs(distanceM) < 8.0 && Math.abs(distanceM) > 0.08) {
      cloudPoints.push({x:x,y:y});
    }
  }
  gAppPointCloud.onPointData(cloudPoints);
}



const zeroPadding = (NUM, LEN) => {
	return ( Array(LEN).join('0') + NUM ).slice( -LEN );
}
