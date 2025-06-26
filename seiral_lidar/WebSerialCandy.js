const filters = [
  { vendorId: 0x1A86 },
  { vendorId: 0x0403 }  
];

let gWriter = false;
const openSerialDevice = async (serialOption,cb) => {
  try {
    const device = await navigator.serial.requestPort({filter: filters});
    console.log('openSerialDevice::device=<',device,'>');
    await device.open(serialOption);
    console.log('openSerialDevice::device=<',device,'>');
    const writer = device.writable.getWriter();
    console.log('openSerialDevice::writer=<',writer,'>');
    gWriter = writer;
    const reader = device.readable.getReader();
    console.log('openSerialDevice::reader=<',reader,'>');
    setTimeout(()=> {
      readSerailData(reader,writer);
    },0);
    if(typeof cb === 'function') {
      cb(writer);
    }
  }
  catch(e) {
    console.log('openSerialDevice::e=<',e,'>');
  }
}



const readSerailData = (reader,writer)=> {
  //console.log('readSerailData::readOne writer=<',writer,'>');
  const readOne = reader.read();
  readOne.then((evt)=>{
    //console.log('readSerailData::readOne evt=<',evt,'>');
    //console.log('readSerailData::readOne evt.value=<',evt.value,'>');
    //console.log('readSerailData::readOne writer=<',writer,'>');
    onRecieveMsg(evt.value,writer);    
    if(evt.done === false) {
      setTimeout(()=>{
        readSerailData(reader);
      },0)
    }
  });          
};


const sendSerial = (data) => {
  try {
    console.log( 'sendSerial:data=<',data,'>' );
    gWriter.write(data);
  } catch(e) {
    console.log( 'sendSerial:e=<',e,'>' );
  }
};





const onRecieveMsg = (data,writer) => {
  //console.log( 'onRecieveMsg:data=<',data,'>' );
  if(typeof onRecvSerialMsg ==='function') {
    onRecvSerialMsg(data,writer);
  }
}
