/**
 * ThreeJSScene - Handles Three.js scene management, camera, controls, and 3D rendering
 */

import * as THREE from "https://esm.sh/three@0.175.0";
import { OrbitControls } from "https://esm.sh/three@0.175.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.175.0/examples/jsm/loaders/GLTFLoader.js";
import { CONSTANTS, Utils, eventBus } from './Utils.js';

export class ThreeJSScene {
  constructor() {
    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Container element
    this.container = null;
    
    // Initialization state
    this.isInitialized = false;
    
    // Animation
    this.animationId = null;
    this.clock = new THREE.Clock();
    this.animationCallbacks = [];
    
    // Scene objects
    this.meshes = new Map();
    this.lights = new Map();
    this.materials = new Map();
    
    // Audio reactive properties
    this.audioReactiveObjects = [];
    this.audioIntensity = 0;
    
    // Performance monitoring
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.currentFPS = 0;
    
    // Settings
    this.settings = {
      enableShadows: true,
      enablePostProcessing: false,
      antialias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      backgroundColor: 0x000000,
      fogEnabled: true,
      fogColor: 0x000000,
      fogNear: 1,
      fogFar: 1000
    };
    
    // Loading manager
    this.loadingManager = new THREE.LoadingManager(
      () => eventBus.emit('threeJS:loadingComplete'),
      (url, loaded, total) => {
        const progress = Math.round((loaded / total) * 100);
        eventBus.emit('threeJS:loadingProgress', { progress });
      },
      (url) => eventBus.emit('threeJS:loadingError', { url })
    );
    this.loadingManager.onStart = (url, loaded, total) => {
      eventBus.emit('threeJS:loadingStart', { total });
    };
    
    // Bind methods
    this.init = this.init.bind(this);
    this.animate = this.animate.bind(this);
    this.render = this.render.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.updateAudioReactivity = this.updateAudioReactivity.bind(this);
  }

  /**
   * Initialize Three.js scene
   */
  async init(containerId = 'three-container') {
    try {
      if (!Utils.supportsWebGL()) {
        throw new Error('WebGL not supported');
      }

      // Clean up any existing renderer to prevent WebGL context conflicts
      if (this.renderer) {
        console.log('🧹 Cleaning up existing Three.js renderer before re-initialization...');
        this.destroy();
      }

      this.container = document.getElementById(containerId);
      if (!this.container) {
        throw new Error(`Container element '${containerId}' not found`);
      }

      await this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupControls();
      this.setupLights();
      this.setupEventListeners();
      await this.loadSceneAssets();
      
      // Start animation loop
      this.animate();
      
      this.isInitialized = true;
      
      eventBus.emit('threeJS:initialized', {
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera
      });
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.init');
      eventBus.emit('threeJS:error', { error: error.message });
      throw error; // Re-throw to allow App.js retry logic to work
    }
  }

  /**
   * Setup WebGL renderer
   */
  async setupRenderer() {
    const capabilities = Utils.getDeviceCapabilities();
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.settings.antialias && !capabilities.mobile,
      alpha: true,
      powerPreference: capabilities.mobile ? 'low-power' : 'high-performance'
    });
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(this.settings.pixelRatio);
    this.renderer.setClearColor(this.settings.backgroundColor, 0);
    
    // Enable shadows if supported and not on mobile
    if (this.settings.enableShadows && !capabilities.mobile) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Enable tone mapping for better colors
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.container.appendChild(this.renderer.domElement);
  }

  /**
   * Setup Three.js scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    
    // Add fog if enabled
    if (this.settings.fogEnabled) {
      this.scene.fog = new THREE.Fog(
        this.settings.fogColor,
        this.settings.fogNear,
        this.settings.fogFar
      );
    }
  }

  /**
   * Setup camera
   */
  setupCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    
    // Add camera to scene for audio reactive effects
    this.scene.add(this.camera);
  }

  /**
   * Setup orbit controls
   */
  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // Configure controls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI;
    
    // Auto-rotate for demo effect
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
  }

  /**
   * Setup scene lighting
   */
  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    this.lights.set('ambient', ambientLight);
    
    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = this.settings.enableShadows;
    
    if (directionalLight.castShadow) {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
      directionalLight.shadow.camera.left = -10;
      directionalLight.shadow.camera.right = 10;
      directionalLight.shadow.camera.top = 10;
      directionalLight.shadow.camera.bottom = -10;
    }
    
    this.scene.add(directionalLight);
    this.lights.set('directional', directionalLight);
    
    // Point lights for audio reactivity
    const colors = [0x00ffff, 0xff00ff, 0xffff00];
    colors.forEach((color, index) => {
      const pointLight = new THREE.PointLight(color, 0.5, 10);
      const angle = (index / colors.length) * Math.PI * 2;
      pointLight.position.set(
        Math.cos(angle) * 3,
        Math.sin(angle) * 3,
        2
      );
      this.scene.add(pointLight);
      this.lights.set(`point${index}`, pointLight);
      this.audioReactiveObjects.push(pointLight);
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', Utils.debounce(this.onWindowResize, 100));
    
    // Audio events
    eventBus.on('audio:dataUpdated', this.updateAudioReactivity);
    
    eventBus.on('audio:play', () => {
      this.controls.autoRotate = true;
    });
    
    eventBus.on('audio:pause', () => {
      this.controls.autoRotate = false;
    });
    
    // UI events for camera control
    eventBus.on('ui:zoomCamera', (data) => {
      this.zoomCameraForAudio(data.zoom);
    });
  }

  /**
   * Load scene assets
   */
  async loadSceneAssets() {
    try {
      // First load critical path assets
      await this.loadCriticalAssets();
      
      // Then load secondary assets
      await this.loadSecondaryAssets();
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.loadSceneAssets');
      throw error;
    }
  }
  
  async loadCriticalAssets() {
    // Load main scene model first
    const spaceStation = await this.loadModelWithLOD('models/space_station_3.glb', [30, 80]);
    this.scene.add(spaceStation);
    this.meshes.set('spaceStation', spaceStation);
  }
  
  async loadSecondaryAssets() {
    // Load other models after main scene is ready
    const singularity = await this.loadModelWithLOD('models/information_singularity.glb', [20, 50]);
    singularity.position.set(10, 0, 0);
    this.scene.add(singularity);
    this.meshes.set('singularity', singularity);
  }

  /**
   * Create default scene objects
   */
  createDefaultObjects() {
    // Central geometry that reacts to audio
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    
    // Create audio-reactive material
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      shininess: 100,
      transparent: true,
      opacity: 0.8
    });
    
    const centralMesh = new THREE.Mesh(geometry, material);
    centralMesh.castShadow = true;
    centralMesh.receiveShadow = true;
    
    this.scene.add(centralMesh);
    this.meshes.set('central', centralMesh);
    this.audioReactiveObjects.push(centralMesh);
    
    // Create orbiting particles
    this.createOrbitingParticles();
    
    // Create background geometry
    this.createBackgroundGeometry();
  }

  /**
   * Create orbiting particles
   */
  createOrbitingParticles() {
    const particleCount = 50;
    const geometry = new THREE.SphereGeometry(0.02, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());
      
      // Random position on sphere
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      
      const radius = 3 + Math.random() * 2;
      particle.position.setFromSphericalCoords(radius, phi, theta);
      
      // Store original position for animation
      particle.userData.originalPosition = particle.position.clone();
      particle.userData.animationOffset = Math.random() * Math.PI * 2;
      
      particles.add(particle);
    }
    
    this.scene.add(particles);
    this.meshes.set('particles', particles);
    this.audioReactiveObjects.push(particles);
  }

  /**
   * Create background geometry
   */
  createBackgroundGeometry() {
    // Create a large sphere for background effects
    const geometry = new THREE.SphereGeometry(50, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x001122,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    
    const backgroundSphere = new THREE.Mesh(geometry, material);
    this.scene.add(backgroundSphere);
    this.meshes.set('background', backgroundSphere);
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    if (!this.camera || !this.renderer || !this.container) return;
    
    try {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(width, height);
      
      eventBus.emit('threeJS:resized', { width, height });
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.onWindowResize');
    }
  }

  /**
   * Update audio reactivity
   */
  updateAudioReactivity(audioData) {
    if (!audioData || !audioData.frequencyData) return;
    
    try {
      // Calculate audio intensity
      let sum = 0;
      for (let i = 0; i < audioData.frequencyData.length; i++) {
        sum += audioData.frequencyData[i];
      }
      this.audioIntensity = (sum / audioData.frequencyData.length) / 255;
      
      // Update central mesh
      const centralMesh = this.meshes.get('central');
      if (centralMesh) {
        const scale = 1 + this.audioIntensity * 0.5;
        centralMesh.scale.setScalar(scale);
        
        // Update material opacity based on audio
        centralMesh.material.opacity = 0.6 + this.audioIntensity * 0.4;
        
        // Rotate based on audio
        centralMesh.rotation.y += this.audioIntensity * 0.1;
        centralMesh.rotation.x += this.audioIntensity * 0.05;
      }
      
      // Update point lights
      this.lights.forEach((light, key) => {
        if (key.startsWith('point')) {
          light.intensity = 0.3 + this.audioIntensity * 0.7;
        }
      });
      
      // Update particles
      const particles = this.meshes.get('particles');
      if (particles) {
        particles.children.forEach((particle, index) => {
          const offset = particle.userData.animationOffset;
          const time = this.clock.getElapsedTime();
          const audioOffset = this.audioIntensity * Math.sin(time * 2 + offset);
          
          particle.position.copy(particle.userData.originalPosition);
          particle.position.multiplyScalar(1 + audioOffset * 0.3);
          
          // Update particle color based on frequency data
          const frequencyIndex = Math.floor((index / particles.children.length) * audioData.frequencyData.length);
          const frequency = audioData.frequencyData[frequencyIndex] / 255;
          
          particle.material.color.setHSL(frequency * 0.7, 1, 0.5 + frequency * 0.5);
        });
      }
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.updateAudioReactivity');
    }
  }

  /**
   * Zoom camera for audio events
   */
  zoomCameraForAudio(shouldZoom) {
    if (!this.controls) return;
    
    try {
      const targetDistance = shouldZoom ? 3 : 5;
      
      // Smooth camera transition using GSAP if available
      if (typeof gsap !== 'undefined') {
        gsap.to(this.camera.position, {
          duration: 1,
          z: targetDistance,
          ease: "power2.inOut"
        });
      } else {
        // Fallback to direct positioning
        this.camera.position.z = targetDistance;
      }
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.zoomCameraForAudio');
    }
  }

  /**
   * Animation loop
   */
  animate() {
    this.animationId = requestAnimationFrame(this.animate);
    
    try {
      // Update controls
      if (this.controls) {
        this.controls.update();
      }
      
      // Update animations
      this.updateAnimations();
      
      // Run animation callbacks
      this.animationCallbacks.forEach(callback => callback());
      
      // Render scene
      this.render();
      
      // Update performance metrics
      this.updatePerformanceMetrics();
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.animate');
    }
  }

  /**
   * Update scene animations
   */
  updateAnimations() {
    const time = this.clock.getElapsedTime();
    
    // Rotate background
    const background = this.meshes.get('background');
    if (background) {
      background.rotation.y = time * 0.01;
    }
    
    // Animate particles orbital motion
    const particles = this.meshes.get('particles');
    if (particles) {
      particles.rotation.y = time * 0.1;
      particles.rotation.x = Math.sin(time * 0.5) * 0.1;
    }
  }

  /**
   * Render the scene
   */
  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFPSUpdate >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = now;
      
      eventBus.emit('threeJS:performanceUpdate', {
        fps: this.currentFPS,
        renderCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles
      });
    }
  }

  /**
   * Update scene settings
   */
  updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      
      // Apply settings changes
      if (this.renderer) {
        if ('backgroundColor' in newSettings) {
          this.renderer.setClearColor(newSettings.backgroundColor);
        }
        
        if ('pixelRatio' in newSettings) {
          this.renderer.setPixelRatio(newSettings.pixelRatio);
        }
      }
      
      if (this.scene && 'fogEnabled' in newSettings) {
        if (newSettings.fogEnabled) {
          this.scene.fog = new THREE.Fog(
            this.settings.fogColor,
            this.settings.fogNear,
            this.settings.fogFar
          );
        } else {
          this.scene.fog = null;
        }
      }
      
      eventBus.emit('threeJS:settingsUpdated', this.settings);
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.updateSettings');
    }
  }

  /**
   * Get current scene state
   */
  getState() {
    return {
      initialized: !!(this.scene && this.camera && this.renderer),
      animating: !!this.animationId,
      fps: this.currentFPS,
      audioIntensity: this.audioIntensity,
      settings: this.settings,
      objectCount: this.scene ? this.scene.children.length : 0
    };
  }

  /**
   * Load a 3D model
   */
  async loadModel(modelPath) {
    return new Promise((resolve, reject) => {
      // Try optimized version first
      const optimizedPath = modelPath.replace('.glb', '_optimized.glb');
      
      const tryLoad = (path) => {
        const loader = new GLTFLoader(this.loadingManager);
        loader.load(
          path,
          (gltf) => resolve(gltf),
          null, // Progress handled by loadingManager
          (error) => {
            // If optimized version fails, try original
            if (path === optimizedPath) {
              tryLoad(modelPath);
            } else {
              Utils.handleError(error, 'ThreeJSScene.loadModel');
              reject(error);
            }
          }
        );
      };
      
      tryLoad(optimizedPath);
    });
  }

  /**
   * Load a 3D model with LOD support
   */
  async loadModelWithLOD(modelPath, lodDistances = [50, 100]) {
    return new Promise(async (resolve) => {
      // Load all LOD versions
      const baseName = modelPath.replace('.glb', '');
      const models = {
        high: await this.loadModel(`${baseName}.glb`),
        low: await this.loadModel(`${baseName}_low.glb`)
      };
      
      // Create LOD group with smooth transitions
      const lod = new THREE.LOD();
      lod.addLevel(models.high.scene, lodDistances[0], 0.5); // 0.5 = hysteresis factor
      lod.addLevel(models.low.scene, lodDistances[1], 0.5);
      
      // Smooth transition between LODs
      this.animationCallbacks.push(() => {
        if (this.camera) {
          lod.update(this.camera);
          // Smoothly adjust material properties during transition
          lod.children.forEach((child, i) => {
            const distance = this.camera.position.distanceTo(child.object.position);
            const fadeRange = lodDistances[i] * 0.3;
            if (child.object.material) {
              child.object.material.opacity = THREE.MathUtils.clamp(
                (lodDistances[i] - distance) / fadeRange, 0.7, 1
              );
            }
          });
        }
      });
      
      resolve(lod);
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      // Cancel animation
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      // Dispose of geometries and materials
      this.scene?.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      // Dispose renderer
      if (this.renderer) {
        this.renderer.dispose();
        if (this.container && this.renderer.domElement) {
          this.container.removeChild(this.renderer.domElement);
        }
      }
      
      // Remove event listeners
      window.removeEventListener('resize', this.onWindowResize);
      
      // Clear references
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.container = null;
      this.meshes.clear();
      this.lights.clear();
      this.materials.clear();
      this.audioReactiveObjects = [];
      
      // Reset initialization state
      this.isInitialized = false;
      
      eventBus.emit('threeJS:destroyed');
      
    } catch (error) {
      Utils.handleError(error, 'ThreeJSScene.destroy');
    }
  }
}

// Export singleton instance
export const threeJSScene = new ThreeJSScene();
