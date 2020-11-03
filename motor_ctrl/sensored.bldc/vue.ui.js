document.addEventListener('DOMContentLoaded', (event) => {
  createVueApps();
});
let vmMotorID = false;
let vmMotorDelay = false;
const createVueApps = () => {
  const motorIdConf = {
    data() {
      return {
        id:''
      }
    },
    watch: {
      id(val,oldVal) {
        onChangeMotorId(val,oldVal);
      }
    }
  };
  const appMotorId = Vue.createApp(motorIdConf);
  //console.log('createVueApps::appMotorId=<',appMotorId,'>');
  vmMotorID = appMotorId.mount('#vue-ui-motor-id');
  //console.log('createVueApps::vmMotorID=<',vmMotorID,'>');


  const motorDelayConf = {
    data() {
      return {
        delay:''
      }
    },
    watch: {
      delay(val,oldVal) {
        onChangeMotorDelay(val,oldVal);
      }
    }
  };
  const appMotorDelay = Vue.createApp(motorDelayConf);
  //console.log('createVueApps::appMotorDelay=<',appMotorDelay,'>');
  vmMotorDelay = appMotorDelay.mount('#vue-ui-motor-delay');
  //console.log('createVueApps::vmMotorDelay=<',vmMotorDelay,'>');
  
  
  
}

const onChangeMotorId = (val,oldVal) => {
  //console.log('onChangeMotorId::val=<',val,'>');
  //console.log('onChangeMotorId::oldVal=<',oldVal,'>');
  if(val !== oldVal) {
    writeMotorId(val);
  }
}
const onMotorIdFromBoard = (id) => {
  vmMotorID.id = id;
}

const onChangeMotorDelay = (val,oldVal) => {
  //console.log('onChangeMotorDelay::val=<',val,'>');
  //console.log('onChangeMotorDelay::oldVal=<',oldVal,'>');
  if(val !== oldVal) {
    writeMotorDelay(val);
  }
}

const onMotorRelayFromBoard = (delay) => {
  vmMotorDelay.delay = delay;
}