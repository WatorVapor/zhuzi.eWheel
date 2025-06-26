const btn_open_serial_template = `
    <div class="row justify-content-center">
      <div class="col-4">
        <input type="button" class="btn btn-success" onclick="onClickOpenDevice(this)" value="Open Device of Lidar(UART)"></input>
      </div>
      <div class="col-4">
        <input type="button" class="btn btn-warning" onclick="onClickClearCloudPoint(this)" value="Clear Cloud Point"></input>
      </div>
    </div>
`;

window.addEventListener('DOMContentLoaded', (event) => {
  const btn_open_serial_option = {
     data() {
       return {};
     },
    template:btn_open_serial_template
  };
  const btn_open_serial_app = Vue.createApp({});
  btn_open_serial_app.component('btn-open-serial', btn_open_serial_option);
  btn_open_serial_app.mount('#vue-ui-open-serial');
});
