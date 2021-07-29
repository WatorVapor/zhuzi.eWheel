const model3d = {
  debug:false
};

window.addEventListener('DOMContentLoaded', () =>{
  loadPointCloud();
});

let gAppPointCloud = false;
const loadPointCloud = () => {
  gAppPointCloud = new PointCloud4Lidar('canvas-lidar-point-cloud');
}


class PointCloud4Lidar {
  constructor(canvas) {
    this.canvasid_ = canvas;
    this.loadPointCloud_();
  }
  loadPointCloud_() {
    const renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector(`#${this.canvasid_}`)
    });
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    this.scene_ = new THREE.Scene();
    const axes = new THREE.AxesHelper(10);
    this.scene_.add(axes);

    const gridHelper_detail = new THREE.GridHelper( 10, 100 ,0x111111,0x222222);
    this.scene_.add( gridHelper_detail ); 

    const gridHelper = new THREE.GridHelper( 10, 10 );
    this.scene_.add( gridHelper ); 

    const camera = new THREE.PerspectiveCamera(45,width / height,0.001,1000);
    //const camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2,1,100);
    camera.position.set(10, 10, 10);
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);      
    const light = new THREE.AmbientLight(0xffffff );
    light.intensity = 10; 
    light.position.set(-10, -10, -10);
    this.scene_.add(light);

    this.CenterGeometry_ = new THREE.SphereGeometry( 0.1, 256, 256 );
    this.CenterMaterial_ = new THREE.MeshBasicMaterial( {color: 0xff0000} );
    const sphere  = new THREE.Mesh( this.CenterGeometry_, this.CenterMaterial_ );
    this.scene_.add(sphere);
    
    this.pointGeometry_ = new THREE.BoxGeometry( 0.02, 0.02, 0.02 );
    this.pointMaterial_ = new THREE.MeshBasicMaterial( {color: 0xffff} );

    const tick = () => {
      controls.update();
      renderer.render(this.scene_, camera);
      requestAnimationFrame(tick);
    }
    tick();
  }
  onPointData(points){
    //console.log('onPointData::points=<',points,'>');
    for(const point of points) {
      //console.log('onPointData::point=<',point,'>');
      const cube = new THREE.Mesh( this.pointGeometry_, this.pointMaterial_ );
      //console.log('onPointData::cube=<',cube,'>');
      cube.position.x = point.x;
      cube.position.z = point.y;
      this.scene_.add(cube);
    }
  }
}
