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
    const axes = new THREE.AxesHelper(50);
    this.scene_.add(axes);  
    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      1,
      200
    );
    camera.position.set(50, 50, 50);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);      
    const light = new THREE.AmbientLight(0xffffff );
    light.intensity = 2; 
    light.position.set(-50, -50, -50);
    this.scene_.add(light);
    
    this.pointGeometry_ = new THREE.SphereGeometry( 0.05, 32, 32 );
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
      const sphere = new THREE.Mesh( this.pointGeometry_, this.pointMaterial_ );
      //console.log('onPointData::sphere=<',sphere,'>');
      sphere.position.x = point.x;
      sphere.position.z = point.y;
      this.scene_.add(sphere);
    }
  }
}
