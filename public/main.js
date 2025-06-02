// main.js - Refactored
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js'; // For suns
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'; 
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';     
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Import new modules
import { createWater, updateWater } from './water.js';
import { createSkybox, updateSkyboxTwinkle } from './skybox.js';
import { loadAbstractCore, updateAbstractCoreAnimation } from './abstract_core.js';

const parallaxLayers = []; // Populated by createSkybox

let container;
let camera, scene, renderer, composer;
let controls; // OrbitControls
let sun;      // THREE.Vector3 for sun direction (used by water)
let water;    // Water mesh from water.js
let abstractCore; // Model from abstract_core.js
let mixer;    // AnimationMixer from abstract_core.js
const clock = new THREE.Clock();

// Variables for sun meshes
let suns = [];
let orbitCenter = new THREE.Vector3(0, 5, 0); // Default, updated by abstract core

const BLOOM_LAYER = 1; // Layer for objects that should bloom

init();
animate(); // Start animation loop

function init() {
    console.log('Init function started');
    container = document.getElementById('container');

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false, 
        depth: true     
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5; 
    container.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', event => {
        console.error('WebGL context lost');
        event.preventDefault();
    });

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000); 
    camera.position.set(30, 30, 100);
    camera.layers.enableAll(); // Enable all layers for rendering by default

    // Post-processing
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.05, 0.8);
    const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
    ssaoPass.kernelRadius = 16;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.2;

    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(ssaoPass); 
    composer.addPass(bloomPass); 

    // Sun direction vector (for water)
    sun = new THREE.Vector3(1,1,1); 

    // Water
    water = createWater(scene, sun); 

    // Skybox (Procedural Stars & Dust)
    createSkybox(scene, parallaxLayers); 

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(0x707070, 0x444444, 0.4);
    scene.add(hemisphereLight);
    const ambientLight = new THREE.AmbientLight(0x606070, 0.4);
    scene.add(ambientLight);
    
    const shadowLight1 = new THREE.DirectionalLight(0xffffff, 0.6); 
    shadowLight1.position.set(50, 200, 100); 
    shadowLight1.castShadow = true;
    shadowLight1.shadow.mapSize.width = 2048;
    shadowLight1.shadow.mapSize.height = 2048;
    shadowLight1.shadow.camera.near = 50;
    shadowLight1.shadow.camera.far = 500; 
    shadowLight1.shadow.camera.left = -200; 
    shadowLight1.shadow.camera.right = 200; 
    shadowLight1.shadow.camera.top = 200;   
    shadowLight1.shadow.camera.bottom = -200; 
    shadowLight1.shadow.bias = -0.0005; 
    scene.add(shadowLight1);

    const shadowLight2 = new THREE.DirectionalLight(0xffffff, 0.3); 
    shadowLight2.position.set(-100, 150, -150);
    shadowLight2.castShadow = true;
    shadowLight2.shadow.mapSize.width = 1024;
    shadowLight2.shadow.mapSize.height = 1024;
    shadowLight2.shadow.camera.near = 50;
    shadowLight2.shadow.camera.far = 800;
    shadowLight2.shadow.camera.left = -400;
    shadowLight2.shadow.camera.right = 400;
    shadowLight2.shadow.camera.top = 400;
    shadowLight2.shadow.camera.bottom = -400;
    shadowLight2.shadow.bias = -0.001;
    scene.add(shadowLight2);

    // Orbiting Suns with Lensflares
    const sunGeometry = new THREE.SphereGeometry(120, 32, 32);
    const sunParams = [
        { color: 0xFFFFCC, emissive: 0xFFFFAA, y: 50, z: 2800, orbitSpeed: 0.02, angle: 0 }, 
        { color: 0xFFA500, emissive: 0xFF8800, y: 50, z: 2200, orbitSpeed: 0.016, angle: Math.PI / 2 },
        { color: 0x00CCFF, emissive: 0x00AADD, y: 40, z: 1500, orbitSpeed: 0.012, angle: Math.PI },
        { color: 0xFF33CC, emissive: 0xFF33AA, y: 30, z: 900, orbitSpeed: 0.010, angle: Math.PI * 1.5 },
    ];
    const textureLoader = new THREE.TextureLoader(); 
    const flareTexture0 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
    const flareTexture3 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare3.png');

    sunParams.forEach(param => {
        const material = new THREE.MeshBasicMaterial({
            color: param.color,
            emissive: param.emissive,
            emissiveIntensity: 1,
        });
        const mesh = new THREE.Mesh(sunGeometry, material);
        const radius = Math.sqrt(Math.pow(200 - orbitCenter.x, 2) + Math.pow(param.z - orbitCenter.z, 2));
        mesh.position.set(orbitCenter.x + radius * Math.cos(param.angle), param.y + orbitCenter.y -5 , orbitCenter.z + radius * Math.sin(param.angle));
        
        const lensflare = new Lensflare();
        lensflare.addElement(new LensflareElement(flareTexture0, 700, 0, material.color));
        lensflare.addElement(new LensflareElement(flareTexture3, 60, 0.6));
        lensflare.addElement(new LensflareElement(flareTexture3, 70, 0.7));
        lensflare.addElement(new LensflareElement(flareTexture3, 120, 0.9));
        lensflare.addElement(new LensflareElement(flareTexture3, 70, 1.0));
        mesh.add(lensflare);
        
        scene.add(mesh);
        suns.push({ mesh: mesh, radius, y: param.y, speed: param.orbitSpeed, angle: param.angle });
        setBloomLayer(mesh); 
    });

    // Abstract Core
    loadAbstractCore(scene, (loadedCore, loadedMixer) => {
        abstractCore = loadedCore;
        mixer = loadedMixer;
        if (abstractCore && abstractCore.position) {
            orbitCenter.copy(abstractCore.position); 
             suns.forEach(sunObj => {
                sunObj.mesh.position.x = orbitCenter.x + sunObj.radius * Math.cos(sunObj.angle);
                sunObj.mesh.position.z = orbitCenter.z + sunObj.radius * Math.sin(sunObj.angle);
                sunObj.mesh.position.y = sunObj.y + orbitCenter.y -5; 
            });
        }
        if (abstractCore) {
            setBloomLayer(abstractCore); 
        }
    });

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 2000; 
    controls.maxPolarAngle = Math.PI / 2; 

    window.addEventListener('resize', onWindowResize);
    onWindowResize(); 
}

function setBloomLayer(object) {
    object.layers.enable(BLOOM_LAYER);
    object.traverse(child => { 
        child.layers.enable(BLOOM_LAYER);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight); 
}


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    controls.update(); 

    updateWater(water, elapsedTime); 

    updateSkyboxTwinkle(); 

    if (abstractCore && mixer) { 
        updateAbstractCoreAnimation(); 
    }

    if (camera && parallaxLayers.length > 0) {
        parallaxLayers.forEach(layerData => {
            if (layerData.field) {
                layerData.field.rotation.x = camera.rotation.x * layerData.factor;
                layerData.field.rotation.y = camera.rotation.y * layerData.factor;
            }
        });
    }
    
    if (suns.length > 0 && abstractCore) { 
        suns.forEach(sunObj => {
            sunObj.angle += sunObj.speed * delta;
            if (sunObj.angle > Math.PI * 2) sunObj.angle -= Math.PI * 2;
            sunObj.mesh.position.x = orbitCenter.x + sunObj.radius * Math.cos(sunObj.angle);
            sunObj.mesh.position.z = orbitCenter.z + sunObj.radius * Math.sin(sunObj.angle);
            sunObj.mesh.position.y = orbitCenter.y + sunObj.y -5 ;
        });
    }

    composer.render(delta);
}
