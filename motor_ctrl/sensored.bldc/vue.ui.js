document.addEventListener('DOMContentLoaded', (event) => {
  createVueApps();
});
let vmMotorID = false;
const createVueApps = () => {
  const motorAppConf = {
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
  const appMotorId = Vue.createApp(motorAppConf);
  //console.log('createVueApps::appMotorId=<',appMotorId,'>');
  vmMotorID = appMotorId.mount('#vue-ui-motor-id');
  //console.log('createVueApps::vmMotorID=<',vmMotorID,'>');
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
