export class LoadingShader {
  constructor(containerId = 'loading-shader-container') {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mesh = null;
    this.clock = new THREE.Clock();
    this.uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3() },
      iMouse: { value: new THREE.Vector2() }
    };
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    this.onWindowResize();
    
    // Create shader material
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec3 iResolution;
        uniform vec2 iMouse;
        varying vec2 vUv;
        
        void mainImage(out vec4 fragColor, in vec2 fragCoord) {
          vec2 r = iResolution.xy;
          vec2 uv = (2.0 * fragCoord - r) / r.y;
          
          float i = 0.0, e = 0.0, R = 0.0, s = 0.0;
          vec3 q, p, d = vec3(uv, 1.0);
          
          for (int j = 0; j < 77; j++) {
            vec3 pos = q + d * e * R * 0.2;
            R = length(pos);
            p = vec3(log2(R) - iTime * 0.4, exp(-pos.z/R), atan(pos.x, pos.y) + iTime * 0.2);
            
            s = 1.0;
            float sum = 0.0;
            for (int k = 0; k < 5; k++) {
              sum += abs(dot(sin(p.xxz * s), cos(p * s))) / s * 0.17;
              s += s;
            }
            e += sum;
            q = pos;
          }
          
          float o = 0.0;
          for (int j = 0; j < 77; j++) {
            o += 0.011 - exp(-e * 2000.0) * 0.016;
          }
          
          fragColor = vec4(vec3(tanh(o)), 1.0);
        }
        
        void main() {
          mainImage(gl_FragColor, vUv * iResolution.xy);
        }
      `
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
    
    // Start animation
    this.animate();
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    this.uniforms.iTime.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
  }
  
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.uniforms.iResolution.value.set(width, height, 1);
  }
  
  destroy() {
    if (this.container && this.renderer) {
      this.container.removeChild(this.renderer.domElement);
    }
    window.removeEventListener('resize', this.onWindowResize);
  }
}
