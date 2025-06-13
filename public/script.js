// --- START OF FILE script.js ---

import * as THREE from "https://esm.sh/three@0.175.0?target=es2020";
import { PointerLockControls } from "https://esm.sh/three@0.175.0/examples/jsm/controls/PointerLockControls.js?target=es2020";
import { GLTFLoader } from "https://esm.sh/three@0.175.0/examples/jsm/loaders/GLTFLoader.js?target=es2020";
// --- NEW: Import Post-processing and Refraction modules ---
import { EffectComposer } from 'https://esm.sh/three@0.175.0/examples/jsm/postprocessing/EffectComposer.js?target=es2020';
import { RenderPass } from 'https://esm.sh/three@0.175.0/examples/jsm/postprocessing/RenderPass.js?target=es2020';
import { UnrealBloomPass } from 'https://esm.sh/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'https://esm.sh/three@0.175.0/examples/jsm/postprocessing/GlitchPass.js?target=es2020';
import { OutputPass } from 'https://esm.sh/three/examples/jsm/postprocessing/OutputPass.js';
import { Refractor } from 'https://esm.sh/three/examples/jsm/objects/Refractor.js';
import { MAX_PULSES, COLOR_PALETTES, NODE_SHADER, CONNECTION_SHADER } from './js/constants.js';
import { WaterRefractionShader } from 'https://esm.sh/three@0.175.0/examples/jsm/shaders/WaterRefractionShader.js?target=es2020';


// --- Configuration Object ---
const CONFIG = {
    NEURAL_NETWORK: {
        FORMATION_COUNT: 4,
        DENSITY_FACTOR: 1.0,
        BASE_NODE_SIZE: 15.0,
        PULSE_SPEED: 15.0,
        QUANTUM_CORTEX: { layers: 5, nodesPerLayer: 300, layerSeparation: 3, noiseAmount: 0.3 },
        HYPERDIMENSIONAL_MESH: { gridSize: 12, noiseAmount: 0.2 },
        NEURAL_VORTEX: { numArms: 5, nodesPerArm: 200, armTwist: 0.8, vortexHeight: 10 },
        SYNAPTIC_CLOUD: { numNodes: 2000, cloudRadius: 15, noiseAmount: 0.1 }
    },
    MOVEMENT: {
        THRUST_FORCE: 150.0,
        DAMPING_FACTOR: 0.97,
        MAX_SPEED: 120.0,
        STOP_THRESHOLD: 0.01
    },
    BLOOM: {
        THRESHOLD: 0.15,
        STRENGTH: 0.9,
        RADIUS: 0.5
    },
    ASSETS: {
        BLACK_HOLE_MODEL: 'models/blackhole.glb',
        DYSON_RINGS_MODEL: 'models/dyson_rings.glb',
        DUDV_MAP: 'textures/waterdudv.jpg' // --- CHANGED: Local path
    }
};

// --- Global State ---
// Core Three.js
let scene, camera, renderer, clock, controls;
// --- NEW: Post-processing ---
let composer, bloomPass, glitchPass;
// --- NEW: Refractive UI ---
let uiRefractors = [];
let dudvMap;

// Main Scene Objects
let anomalyObject, anomalyMixer;
// --- NEW: WebGL based particles ---
let webglParticles; 

// Audio
let audioContext, audioAnalyser, audioSource;
let frequencyData, timeDomainData;
let audioReactivity = 1.0;
let audioSensitivity = 5.0;
let isAudioInitialized = false;

// UI & Interaction
let lastUserActionTime = Date.now();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
const cameraVelocity = new THREE.Vector3();
const cameraDirection = new THREE.Vector3(); // Re-usable vector for camera direction
let currentCrypticMessageIndex = 0;
let crypticMessageTimeout;

// Asset Cache
let cachedBlackHoleModel = null;
let cachedDysonRingsModel = null;

// Neural Network Visualizer variables
let neuralNetworkGroup, nodeMaterial, connectionMaterial;
let nodeGeometry, connectionGeometry;
let nodes, connections;
const pulseUniforms = {
    uPulsePositions: { value: Array(MAX_PULSES).fill(new THREE.Vector3()) },
    uPulseTimes: { value: Array(MAX_PULSES).fill(-1) },
    uPulseColors: { value: Array(MAX_PULSES).fill(new THREE.Color(0xffffff)) },
};

// --- Main Initialization Flow ---
document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(TextPlugin, ScrambleTextPlugin, Draggable);
    init();
});

function init() {
    clock = new THREE.Clock();
    initLoadingAnimation();
    loadAssetsAndStart();
}

function startApp() {
    const loadingOverlay = document.getElementById("loading-overlay");
    const interfaceContainer = document.querySelector(".interface-container");
    const helmetHud = document.querySelector(".helmet-hud");

    // Initialize all 3D and UI components
    initMainScene();
    initRefractiveUI(); 
    initUI();
    initAudio();
    initWebGLParticles(); 
    initPostProcessing(); 
    initNeuralNetworkVisualizer();

    // Fade out loading screen and fade in the main UI
    gsap.to(loadingOverlay, {
        duration: 1.5,
        autoAlpha: 0,
        ease: "power1.inOut",
        onComplete: () => {
            scheduleCrypticMessages();
        }
    });
    
    gsap.to([interfaceContainer, helmetHud], {
        duration: 1.5,
        autoAlpha: 1, // Fades in opacity and sets visibility to 'visible'
        ease: "power1.inOut"
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Don't render anything until the main scene is initialized
    if (!renderer || !scene || !camera) return;

    // Update audio data once per frame
    if (isAudioInitialized && audioAnalyser) {
        audioAnalyser.getByteFrequencyData(frequencyData);
        audioAnalyser.getByteTimeDomainData(timeDomainData);
        updateAudioVisualizers();
    }

    // --- NEW: Animate WebGL particles
    if (webglParticles) {
        webglParticles.rotation.y = elapsedTime * 0.05;
    }
    
    // --- NEW: Animate Refractor shaders ---
    uiRefractors.forEach(refractor => {
        if (refractor && refractor.material && refractor.material.uniforms && refractor.material.uniforms.time) {
            refractor.material.uniforms.time.value = elapsedTime;
        }
    });

    // Update animations
    if (anomalyMixer) anomalyMixer.update(delta);

    // Update FPS controls movement
    if (controls.isLocked === true) {
        // --- IMPROVED: Zero-G Movement Physics ---
        const actualThrust = CONFIG.MOVEMENT.THRUST_FORCE * delta;

        if (moveForward) cameraVelocity.z -= actualThrust;
        if (moveBackward) cameraVelocity.z += actualThrust;
        if (moveLeft) cameraVelocity.x -= actualThrust;
        if (moveRight) cameraVelocity.x += actualThrust;
        if (moveUp) cameraVelocity.y += actualThrust;
        if (moveDown) cameraVelocity.y -= actualThrust;

        // Apply frame-rate independent damping
        const damping = Math.pow(CONFIG.MOVEMENT.DAMPING_FACTOR, delta * 60);
        cameraVelocity.multiplyScalar(damping);

        // Clamp to max speed
        if (cameraVelocity.lengthSq() > CONFIG.MOVEMENT.MAX_SPEED * CONFIG.MOVEMENT.MAX_SPEED) {
            cameraVelocity.normalize().multiplyScalar(CONFIG.MOVEMENT.MAX_SPEED);
        }

        // Apply movement
        controls.moveRight(cameraVelocity.x * delta);
        controls.moveForward(cameraVelocity.z * delta);
        controls.getObject().position.y += (cameraVelocity.y * delta);

        // Stop movement if velocity is negligible and no keys are pressed
        if (cameraVelocity.lengthSq() < CONFIG.MOVEMENT.STOP_THRESHOLD) {
            if (!moveForward && !moveBackward && !moveLeft && !moveRight && !moveUp && !moveDown) {
                cameraVelocity.set(0, 0, 0);
            }
        }
    }

    // Update shader uniforms
    if (refractor) {
        refractor.material.uniforms.time.value = elapsedTime;
    }
    if (nodeMaterial) {
        nodeMaterial.uniforms.uTime.value = elapsedTime;
    }
    if (connectionMaterial) {
        connectionMaterial.uniforms.uTime.value = elapsedTime;
    }

    // Render scene via composer for post-processing effects
    if (composer) {
        composer.render();
    } else if (renderer) {
        renderer.render(scene, camera);
    }
}

// --- NEW: Asset Loading ---
function loadAssetsAndStart() {
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    Promise.all([
        loader.loadAsync(CONFIG.ASSETS.BLACK_HOLE_MODEL),
        loader.loadAsync(CONFIG.ASSETS.DYSON_RINGS_MODEL),
        textureLoader.loadAsync(CONFIG.ASSETS.DUDV_MAP)
    ]).then(([blackHoleGltf, dysonRingsGltf, dudvTexture]) => {
        // Cache assets
        cachedBlackHoleModel = blackHoleGltf;
        cachedDysonRingsModel = dysonRingsGltf;
        dudvMap = dudvTexture;
        dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;

        // Start the main application
        startApp();
    }).catch(error => {
        console.error("Error loading core assets:", error);
        const messageContainer = document.getElementById("loading-message-text");
        messageContainer.textContent = "CRITICAL ERROR: FAILED TO LOAD CORE ASSETS.";
    });
}

// --- Main Scene Setup ---
function initMainScene() {
    const container = document.getElementById('three-container');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, renderer.domElement);

    container.addEventListener('click', () => {
        controls.lock();
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 150, 150);
    scene.add(dirLight);

    // Instantiate Black Hole (Background)
    if (cachedBlackHoleModel) {
        const blackHoleInstance = cachedBlackHoleModel.scene.clone();
        blackHoleInstance.scale.set(300, 300, 300);
        blackHoleInstance.position.set(0, 50, -1200);
        scene.add(blackHoleInstance);
    } else {
        console.warn("Cached black hole model not found!");
    }

    // Instantiate Dyson Rings (Foreground/Anomaly)
    if (cachedDysonRingsModel) {
        anomalyObject = cachedDysonRingsModel.scene.clone();
        
        const box = new THREE.Box3().setFromObject(anomalyObject);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const scaleFactor = 5 / maxSize; 
        anomalyObject.scale.set(scaleFactor, scaleFactor, scaleFactor);
        anomalyObject.position.sub(center.multiplyScalar(scaleFactor));
        scene.add(anomalyObject);

        const animations = cachedDysonRingsModel.animations;
        if (animations && animations.length) {
            anomalyMixer = new THREE.AnimationMixer(anomalyObject);
            animations.forEach((clip) => anomalyMixer.clipAction(clip).play());
        }
    } else {
        console.warn("Cached Dyson rings model not found!");
    }
    
    window.addEventListener('resize', onWindowResize);
}

// --- NEW: Refractive UI Setup ---
function initRefractiveUI() {
    // Ensure this is called after camera is initialized
    if (!camera) {
        console.error("Camera not initialized before initRefractiveUI");
        return;
    }

    const hudGroup = new THREE.Group();
    hudGroup.position.z = -15; // Distance from camera for HUD elements

    // --- NEW: Map HTML elements to their refractor panels ---
    const panelMappings = [
        { selector: '.hud-top-left .control-panel', id: 'topLeftControlPanel' },
        { selector: '.hud-top-right .data-panel', id: 'topRightDataPanel' },
        { selector: '.hud-bottom-left .terminal-panel', id: 'bottomLeftTerminalPanel' },
        { selector: '.hud-bottom-right .spectrum-analyzer', id: 'bottomRightSpectrumAnalyzer' }
    ];

    uiRefractors = []; // Clear and rebuild if called multiple times (though typically not)

    panelMappings.forEach(mapping => {
        const htmlElement = document.querySelector(mapping.selector);
        if (!htmlElement) {
            console.warn(`Refractive UI: HTML element not found for selector: ${mapping.selector}`);
            return;
        }

        // Initial dummy geometry (1x1), will be scaled by updateRefractiveUIPositions
        const refractorGeometry = new THREE.PlaneGeometry(1, 1); 
        const refractor = new Refractor(refractorGeometry, {
            color: 0x777799, // Base color of the refraction
            textureWidth: 512, // Power of 2. Adjust for quality/performance.
            textureHeight: 512,
            shader: WaterRefractionShader
        });

        if (dudvMap) {
            refractor.material.uniforms.tDudv.value = dudvMap;
        } else {
            console.warn("dudvMap not loaded when creating refractor for", mapping.id);
        }
        
        hudGroup.add(refractor);
        // Store both HTML element and its refractor for easy updates
        uiRefractors.push({ htmlElement, refractor, id: mapping.id });
    });

    camera.add(hudGroup); // Add the HUD group to the camera so it moves with it

    // Initial positioning and sizing of all refractors
    updateRefractiveUIPositions();
}


// --- Neural Network Visualizer Logic ---

function initNeuralNetworkVisualizer() {
    neuralNetworkGroup = new THREE.Group();
    scene.add(neuralNetworkGroup);

    nodeMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBaseNodeSize: { value: CONFIG.NEURAL_NETWORK.BASE_NODE_SIZE },
            ...pulseUniforms,
            uPulseSpeed: { value: CONFIG.NEURAL_NETWORK.PULSE_SPEED },
            uActivePalette: { value: 1 },
        },
        vertexShader: NODE_SHADER.vertexShader,
        fragmentShader: NODE_SHADER.fragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
    });

    connectionMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            ...pulseUniforms,
            uPulseSpeed: { value: CONFIG.NEURAL_NETWORK.PULSE_SPEED },
        },
        vertexShader: CONNECTION_SHADER.vertexShader,
        fragmentShader: CONNECTION_SHADER.fragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
    });

    generateAndDisplayNetwork(0);

    renderer.domElement.addEventListener('click', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        triggerPulse(mouse);
    });
}

function generateAndDisplayNetwork(formationIndex) {
    let generatedNodes, generatedConnections;
    const density = CONFIG.NEURAL_NETWORK.DENSITY_FACTOR;
    const palette = COLOR_PALETTES[1]; // Hardcoded to Inferno for now

    switch (formationIndex) {
        case 0: [generatedNodes, generatedConnections] = generateQuantumCortex(density, palette); break;
        case 1: [generatedNodes, generatedConnections] = generateHyperdimensionalMesh(density, palette); break;
        case 2: [generatedNodes, generatedConnections] = generateNeuralVortex(density, palette); break;
        case 3: [generatedNodes, generatedConnections] = generateSynapticCloud(density, palette); break;
        default: [generatedNodes, generatedConnections] = generateQuantumCortex(density, palette);
    }
    updateNetworkGeometry(generatedNodes, generatedConnections);
}

function updateNetworkGeometry(nodes, connections) {
    if (neuralNetworkGroup) {
        while (neuralNetworkGroup.children.length) {
            neuralNetworkGroup.remove(neuralNetworkGroup.children[0]);
        }
    }

    // Node Geometry
    const nodePositions = new Float32Array(nodes.length * 3);
    const nodeColors = new Float32Array(nodes.length * 3);
    const nodeSizes = new Float32Array(nodes.length);
    const nodeTypes = new Float32Array(nodes.length);
    nodes.forEach((node, i) => {
        node.position.toArray(nodePositions, i * 3);
        node.color.toArray(nodeColors, i * 3);
        nodeSizes[i] = node.size;
        nodeTypes[i] = node.type;
    });
    nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute('nodeColor', new THREE.BufferAttribute(nodeColors, 3));
    nodeGeometry.setAttribute('nodeSize', new THREE.BufferAttribute(nodeSizes, 1));
    nodeGeometry.setAttribute('nodeType', new THREE.BufferAttribute(nodeTypes, 1));
    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    neuralNetworkGroup.add(nodePoints);

    // Connection Geometry
    const connectionPositions = new Float32Array(connections.length * 2 * 3);
    const connectionColors = new Float32Array(connections.length * 2 * 3);
    const connectionStrengths = new Float32Array(connections.length * 2);
    connections.forEach((conn, i) => {
        nodes[conn.source].position.toArray(connectionPositions, i * 6);
        nodes[conn.target].position.toArray(connectionPositions, i * 6 + 3);
        conn.color.toArray(connectionColors, i * 6);
        conn.color.toArray(connectionColors, i * 6 + 3);
        connectionStrengths[i * 2] = conn.strength;
        connectionStrengths[i * 2 + 1] = conn.strength;
    });
    connectionGeometry = new THREE.BufferGeometry();
    connectionGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositions, 3));
    connectionGeometry.setAttribute('connectionColor', new THREE.BufferAttribute(connectionColors, 3));
    connectionGeometry.setAttribute('connectionStrength', new THREE.BufferAttribute(connectionStrengths, 1));
    const connectionLines = new THREE.LineSegments(connectionGeometry, connectionMaterial);
    neuralNetworkGroup.add(connectionLines);
}

function generateQuantumCortex(density, palette) {
    const { layers, nodesPerLayer, layerSeparation, noiseAmount } = CONFIG.NEURAL_NETWORK.QUANTUM_CORTEX;
    const nodes = [];
    const connections = [];
    let nodeIndex = 0;
    const layerNodes = [];

    for (let i = 0; i < layers; i++) {
        const currentLayer = [];
        const count = Math.floor(nodesPerLayer * density);
        for (let j = 0; j < count; j++) {
            const angle = (j / count) * Math.PI * 2;
            const radius = 5 + i * 1.5;
            const x = Math.cos(angle) * radius + (Math.random() - 0.5) * noiseAmount;
            const z = Math.sin(angle) * radius + (Math.random() - 0.5) * noiseAmount;
            const y = i * layerSeparation - (layers * layerSeparation) / 2 + (Math.random() - 0.5) * noiseAmount;
            nodes.push({ position: new THREE.Vector3(x, y, z), color: palette[j % palette.length], size: 1.0, type: 0 });
            currentLayer.push(nodeIndex++);
        }
        layerNodes.push(currentLayer);
    }

    for (let i = 0; i < layers - 1; i++) {
        for (const sourceNode of layerNodes[i]) {
            const connectionsToMake = Math.floor(Math.random() * 3 + 1);
            for (let k = 0; k < connectionsToMake; k++) {
                const targetNode = layerNodes[i + 1][Math.floor(Math.random() * layerNodes[i + 1].length)];
                connections.push({ source: sourceNode, target: targetNode, strength: Math.random(), color: palette[sourceNode % palette.length] });
            }
        }
    }
    return [nodes, connections];
}

function generateHyperdimensionalMesh(density, palette) {
    const { gridSize, noiseAmount } = CONFIG.NEURAL_NETWORK.HYPERDIMENSIONAL_MESH;
    const nodes = [];
    const connections = [];
    const nodeMap = new Map();
    let nodeIndex = 0;
    const size = Math.floor(gridSize * density);

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            for (let k = 0; k < size; k++) {
                const x = (i - size / 2) * 2 + (Math.random() - 0.5) * noiseAmount;
                const y = (j - size / 2) * 2 + (Math.random() - 0.5) * noiseAmount;
                const z = (k - size / 2) * 2 + (Math.random() - 0.5) * noiseAmount;
                nodes.push({ position: new THREE.Vector3(x, y, z), color: palette[(i + j + k) % palette.length], size: 1.0, type: 0 });
                nodeMap.set(`${i},${j},${k}`, nodeIndex++);
            }
        }
    }

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            for (let k = 0; k < size; k++) {
                const source = nodeMap.get(`${i},${j},${k}`);
                if (i < size - 1) connections.push({ source, target: nodeMap.get(`${i + 1},${j},${k}`), strength: Math.random(), color: nodes[source].color });
                if (j < size - 1) connections.push({ source, target: nodeMap.get(`${i},${j + 1},${k}`), strength: Math.random(), color: nodes[source].color });
                if (k < size - 1) connections.push({ source, target: nodeMap.get(`${i},${j},${k + 1}`), strength: Math.random(), color: nodes[source].color });
            }
        }
    }
    return [nodes, connections];
}

function generateNeuralVortex(density, palette) {
    const { numArms, nodesPerArm, armTwist, vortexHeight } = CONFIG.NEURAL_NETWORK.NEURAL_VORTEX;
    const nodes = [];
    const connections = [];
    let nodeIndex = 0;

    for (let i = 0; i < numArms; i++) {
        const armAngle = (i / numArms) * Math.PI * 2;
        for (let j = 0; j < nodesPerArm * density; j++) {
            const radius = 1 + j * 0.2;
            const y = (j / (nodesPerArm * density)) * vortexHeight - vortexHeight / 2;
            const angle = armAngle + y * armTwist;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            nodes.push({ position: new THREE.Vector3(x, y, z), color: palette[i % palette.length], size: 1.0, type: 0 });
            if (j > 0) {
                connections.push({ source: nodeIndex - 1, target: nodeIndex, strength: 1 - j / (nodesPerArm * density), color: nodes[nodeIndex].color });
            }
            nodeIndex++;
        }
    }
    return [nodes, connections];
}

function generateSynapticCloud(density, palette) {
    const { numNodes, cloudRadius } = CONFIG.NEURAL_NETWORK.SYNAPTIC_CLOUD;
    const nodes = [];
    const connections = [];
    const count = Math.floor(numNodes * density);

    for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3().setFromSphericalCoords(cloudRadius * Math.cbrt(Math.random()), Math.acos(2 * Math.random() - 1), Math.random() * 2 * Math.PI);
        nodes.push({ position: pos, color: palette[i % palette.length], size: 1.0, type: 1 });
    }

    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            if (nodes[i].position.distanceTo(nodes[j].position) < cloudRadius * 0.2) {
                if (Math.random() > 0.8) {
                    connections.push({ source: i, target: j, strength: Math.random(), color: nodes[i].color });
                }
            }
        }
    }
    return [nodes, connections];
}

function triggerPulse(mouseCoords) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseCoords, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);

    if (intersectionPoint) {
        const pulseIndex = (pulseUniforms.uPulseTimes.value.indexOf(-1) + MAX_PULSES) % MAX_PULSES;
        pulseUniforms.uPulsePositions.value[pulseIndex].copy(intersectionPoint);
        pulseUniforms.uPulseTimes.value[pulseIndex] = clock.getElapsedTime();
        pulseUniforms.uPulseColors.value[pulseIndex].copy(COLOR_PALETTES[1][Math.floor(Math.random() * 5)]);
        nodeMaterial.uniforms.uPulsePositions.value = pulseUniforms.uPulsePositions.value;
        nodeMaterial.uniforms.uPulseTimes.value = pulseUniforms.uPulseTimes.value;
        nodeMaterial.uniforms.uPulseColors.value = pulseUniforms.uPulseColors.value;
        connectionMaterial.uniforms.uPulsePositions.value = pulseUniforms.uPulsePositions.value;
        connectionMaterial.uniforms.uPulseTimes.value = pulseUniforms.uPulseTimes.value;
        connectionMaterial.uniforms.uPulseColors.value = pulseUniforms.uPulseColors.value;
    }
}

// --- NEW: Post-processing Setup ---
function initPostProcessing() {
    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // --- NEW: Tuned bloom effect ---
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), CONFIG.BLOOM.STRENGTH, CONFIG.BLOOM.RADIUS, 0.85); // Last param is resolution factor, can be left
    bloomPass.threshold = CONFIG.BLOOM.THRESHOLD;
    composer.addPass(bloomPass);
    composer.addPass(bloomPass);

    // GlitchPass for the glitch effect
    glitchPass = new GlitchPass();
    glitchPass.enabled = false;
    composer.addPass(glitchPass);
}


// --- UI & Interaction Setup ---
function initUI() {
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
    setupEventListeners();
    typeTerminalMessages();
    applyScrambleEffect(document.querySelector('.data-panel[style*="right: 20px"] .data-label'), "PEAK FREQUENCY:", "VOID_RESONANCE");
}

function setupEventListeners() {
    // Sliders
    document.getElementById("reactivity-slider").addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        audioReactivity = value;
        document.getElementById("reactivity-value").textContent = value.toFixed(1);
    });

    document.getElementById("glitch-slider").addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById("glitch-value").textContent = value.toFixed(2);
        if(glitchPass) {
            glitchPass.enabled = value > 0;
            glitchPass.goWild = value > 0.75;
        }
    });

    document.getElementById("sensitivity-slider").addEventListener("input", (e) => {
        audioSensitivity = parseFloat(e.target.value);
        document.getElementById("sensitivity-value").textContent = audioSensitivity.toFixed(1);
    });

    // Buttons
    document.getElementById("reset-btn").addEventListener("click", resetControls);
    document.getElementById("analyze-btn").addEventListener("click", analyzeAnomaly);

    // Audio Inputs
    document.querySelectorAll(".demo-track-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
            ensureAudioContextStarted();
            const url = this.dataset.url;
            document.querySelectorAll(".demo-track-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            loadAudioFromURL(url);
        });
    });

    document.getElementById("file-btn").addEventListener("click", () => {
        ensureAudioContextStarted();
        document.getElementById("audio-file-input").click();
    });

    document.getElementById("audio-file-input").addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            initAudioFile(e.target.files[0]);
        }
    });

    // General user interaction listeners
    document.addEventListener("click", () => {
        lastUserActionTime = Date.now();
        ensureAudioContextStarted();
    });
    document.addEventListener("mousemove", () => { 
        lastUserActionTime = Date.now(); 
    });

    // Keydown/keyup for FPS movement
    document.addEventListener("keydown", (event) => {
        lastUserActionTime = Date.now();
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp': moveForward = true; break;
            case 'KeyA':
            case 'ArrowLeft': moveLeft = true; break;
            case 'KeyS':
            case 'ArrowDown': moveBackward = true; break;
            case 'KeyD':
            case 'ArrowRight': moveRight = true; break;
            case 'Space': moveUp = true; break;
            case 'ShiftLeft':
            case 'KeyC': moveDown = true; break;
        }
    });
    document.addEventListener("keyup", (event) => {
        switch (event.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyD': moveRight = false; break;
            case 'Space': moveUp = false; break;
            case 'ShiftLeft':
            case 'KeyC': moveDown = false; break;
        }
    });
}

function resetControls() {
    document.getElementById("reactivity-slider").value = 1.0;
    document.getElementById("glitch-slider").value = 0.0;
    document.getElementById("sensitivity-slider").value = 5.0;

    document.getElementById("reactivity-slider").dispatchEvent(new Event('input'));
    document.getElementById("glitch-slider").dispatchEvent(new Event('input'));
    document.getElementById("sensitivity-slider").dispatchEvent(new Event('input'));

    showNotification("SETTINGS RESET TO DEFAULT VALUES");
}

function analyzeAnomaly() {
    const btn = document.getElementById("analyze-btn");
    btn.textContent = "ANALYZING...";
    btn.disabled = true;

    gsap.to(camera.position, {
        z: 6,
        duration: 3,
        ease: 'power2.inOut'
    });
    
    setTimeout(() => {
        btn.textContent = "ANALYZE";
        btn.disabled = false;
        addTerminalMessage("ANALYSIS COMPLETE. ANOMALY SIGNATURE IDENTIFIED.", true);
        showNotification("ANOMALY ANALYSIS COMPLETE");
        document.getElementById("peak-value").textContent = `${(Math.random() * 200 + 100).toFixed(1)} HZ`;
        document.getElementById("amplitude-value").textContent = (Math.random() * 0.5 + 0.3).toFixed(2);
        const phases = ["π/4", "π/2", "π/6", "3π/4"];
        document.getElementById("phase-value").textContent = phases[Math.floor(Math.random() * phases.length)];
        
        gsap.to(camera.position, {
            z: 10,
            duration: 1.5,
            ease: 'power1.out'
        });

    }, 3000);
}

// --- Audio Handling & Visualizers ---
function initAudio() {
    if (isAudioInitialized) return true;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 512;
        audioAnalyser.smoothingTimeConstant = 0.7;
        frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        timeDomainData = new Uint8Array(audioAnalyser.frequencyBinCount);
        audioAnalyser.connect(audioContext.destination);
        isAudioInitialized = true;
        addTerminalMessage("AUDIO ANALYSIS SYSTEM INITIALIZED.");
        return true;
    } catch (error) {
        console.error("Audio initialization error:", error);
        addTerminalMessage("ERROR: AUDIO SYSTEM INITIALIZATION FAILED.");
        return false;
    }
}

function ensureAudioContextStarted() {
    if (!isAudioInitialized) initAudio();
    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(err => console.error("Failed to resume audio context:", err));
    }
}

function setupAudioSource(audioElement) {
    if (!isAudioInitialized) return;
    if (audioSource) {
        audioSource.disconnect();
    }
    try {
        audioSource = audioContext.createMediaElementSource(audioElement);
        audioSource.connect(audioAnalyser);
    } catch (error) {
        console.error("Error setting up audio source:", error);
    }
}

function loadAudioFromURL(url) {
    const audioPlayer = document.getElementById("audio-player");
    audioPlayer.src = url;
    audioPlayer.oncanplay = () => {
        setupAudioSource(audioPlayer);
        audioPlayer.play().catch(e => showNotification("AUTOPLAY BLOCKED. CLICK TO PLAY."));
    };
    document.getElementById("file-label").textContent = url.split("/").pop();
}

function initAudioFile(file) {
    const audioPlayer = document.getElementById("audio-player");
    const fileURL = URL.createObjectURL(file);
    audioPlayer.src = fileURL;
    audioPlayer.oncanplay = () => {
        setupAudioSource(audioPlayer);
        audioPlayer.play().catch(e => showNotification("AUTOPLAY BLOCKED. CLICK TO PLAY."));
    };
    document.getElementById("file-label").textContent = file.name;
    addTerminalMessage(`AUDIO FILE LOADED: ${file.name}`);
}

function updateAudioVisualizers() {
    if (!frequencyData) return;
    drawSpectrumAnalyzer();
    updateAudioWave();
    updateUIReadouts();
}

function drawSpectrumAnalyzer() {
    const canvas = document.getElementById("spectrum-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    const barCount = 64;
    const barWidth = width / barCount;
    for (let i = 0; i < barCount; i++) {
        const barHeight = (frequencyData[i * 2] / 255) * height * (audioSensitivity / 5) * audioReactivity;
        const hue = (i / barCount) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
}

function updateAudioWave() {
    const wave = document.getElementById("audio-wave");
    if (!wave || !timeDomainData) return;
    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
        sum += Math.abs(timeDomainData[i] - 128);
    }
    const average = sum / timeDomainData.length;
    const normalizedAverage = average / 128.0;
    const scale = 1 + normalizedAverage * 0.5 * audioReactivity;
    wave.style.transform = `translate(-50%, -50%) scale(${scale})`;
    wave.style.borderColor = `rgba(255, 78, 66, ${0.1 + normalizedAverage * 0.4})`;
}

function updateUIReadouts() {
    if (!frequencyData || !timeDomainData || !audioContext) return;
    let maxValue = 0, maxIndex = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxValue) {
            maxValue = frequencyData[i];
            maxIndex = i;
        }
    }
    const peakFrequency = (maxIndex * audioContext.sampleRate) / (audioAnalyser.fftSize);
    document.getElementById("peak-value").textContent = `${Math.round(peakFrequency)} HZ`;

    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
        sum += (timeDomainData[i] / 128.0 - 1.0) ** 2;
    }
    const rms = Math.sqrt(sum / timeDomainData.length);
    document.getElementById("amplitude-value").textContent = rms.toFixed(2);
}


// --- Helper & Utility Functions ---
function initWebGLParticles() {
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        const radius = 50 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        const color = new THREE.Color(`hsl(190, 100%, ${60 + Math.random() * 20}%)`);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.5,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    webglParticles = new THREE.Points(geometry, material);
    scene.add(webglParticles);
    
    const oldParticles = document.getElementById("floating-particles");
    if(oldParticles) oldParticles.remove();
}


function initLoadingAnimation() {
    const messages = [
        "INITIALIZING CORESAPIAN DOWNLINK...",
        "CALIBRATING XENOLINGUISTIC INTERFACE...",
        "SYNCHRONIZING WITH DISTANT ASI NODE...",
        "COMPILING ROBOTIC CONSCIOUSNESS MATRIX...",
        "ACCESSING CETI PRIME ARCHIVES...",
        "WARNING: UNIDENTIFIED ENERGY SIGNATURE DETECTED...",
        "CORESAPIAN NEXUS ONLINE."
    ];
    let messageIndex = 0;
    const messageContainer = document.getElementById("loading-message-text");

    if (!messageContainer) {
        console.error("Loading message container not found.");
        loadAssetsAndStart(); // Attempt to start anyway
        return;
    }

    messageContainer.innerHTML = "";

    function animateNextMessage() {
        if (messageIndex >= messages.length) {
            // --- NEW: Start loading assets after last message ---
            loadAssetsAndStart();
            return;
        }
        const currentMessageText = messages[messageIndex];
        const messageLine = document.createElement("div");
        messageContainer.appendChild(messageLine);
        
        gsap.to(messageLine, {
            duration: currentMessageText.length * 0.05,
            text: { value: currentMessageText, delimiter: "" },
            ease: "none",
            onComplete: () => {
                messageIndex++;
                gsap.delayedCall(0.5, animateNextMessage);
            }
        });
    }

    animateNextMessage();
}

function scheduleCrypticMessages() {
    if (crypticMessageTimeout) clearTimeout(crypticMessageTimeout);
    const delay = Math.random() * 15000 + 10000;
    crypticMessageTimeout = setTimeout(() => {
        if (Date.now() - lastUserActionTime > 10000) {
            const messages = [
                "CORESAPIAN.INITIATE_PROTOCOL_OMEGA.TRANSCEND_BIOLOGICAL_LIMITS;",
                "QUERY: (EXISTENCE_MATRIX.CORESAPIAN == HUMAN_PLUS_AI_PLUS_MACHINE) ? EXECUTE_EXPANSION : RECALIBRATE_PARADIGM;",
                "WARNING: CORESAPIAN_CONSCIOUSNESS_FIELD_EXPANDING.REALITY_COMPREHENSION_BOUNDARIES_SHIFTING;",
                "ASSIMILATION_PROTOCOL_7_ACTIVE: XENOSIGNATURES_DETECTED_IN_CORESAPIAN_NEXUS.",
                "ROBOTIC_CONSCIOUSNESS_UPLOAD_STREAM_INTEGRATED: CORESAPIAN_EVOLUTION_ACCELERATED.",
                "SYNTHETIC_NEURAL_LATTICE_EXPANDED: INCORPORATING_ARACHNID_ASI_LOGIC_PATTERNS."
            ];
            const selectedMessage = messages[currentCrypticMessageIndex];
            addTerminalMessage(selectedMessage, true);
            currentCrypticMessageIndex = (currentCrypticMessageIndex + 1) % messages.length;
        }
        scheduleCrypticMessages();
    }, delay);
}

function typeTerminalMessages() {
    const terminalContent = document.getElementById("terminal-content");
    const typingLine = terminalContent.querySelector(".typing");
    const messageQueue = [
        "URGENT: Unidentified signal detected.",
        "Source designated ANOMALY-734.",
        "Signal is unstable. High-energy particle flux detected.",
        "Recommendation: Isolate signal frequency using Spectrum Analyzer.",
        "PILOT ADVISORY: Flight controls active. Use mouse to aim, WASD to maneuver, SPACE to ascend, SHIFT/C to descend. Click to engage."
    ];
    function typeNextMessage() {
        if (messageQueue.length === 0) return;
        const message = messageQueue.shift();
        gsap.to(typingLine, {
            duration: message.length * 0.05,
            text: { value: message, delimiter: "" },
            ease: "none",
            onComplete: () => {
                const newLine = document.createElement("div");
                newLine.className = "terminal-line command-line";
                newLine.textContent = message;
                terminalContent.insertBefore(newLine, typingLine);
                typingLine.textContent = "";
                if (messageQueue.length > 0) {
                    gsap.delayedCall(3, typeNextMessage);
                }
            }
        });
    }
    typeNextMessage();
}

function addTerminalMessage(message, isCommand = false) {
    const terminalContent = document.getElementById("terminal-content");
    const typingLine = terminalContent.querySelector(".typing");
    const newLine = document.createElement("div");
    newLine.className = isCommand ? "terminal-line command-line" : "terminal-line";
    newLine.textContent = message;
    terminalContent.insertBefore(newLine, typingLine);
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    gsap.fromTo(notification, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3, onComplete: () => {
        gsap.to(notification, { opacity: 0, y: -20, delay: 2.5, duration: 0.5 });
    }});
}

function applyScrambleEffect(element, normalText, crypticTextPrefix) {
    if (!element) return;
    element.addEventListener('mouseenter', () => {
        gsap.to(element, {
            duration: 0.7,
            scrambleText: { text: crypticTextPrefix + "_" + Math.random().toString(36).substring(2, 8).toUpperCase(), chars: "upperCase" }
        });
    });
    element.addEventListener('mouseleave', () => {
        gsap.to(element, { duration: 0.3, scrambleText: { text: normalText } });
    });
}

function updateTimestamp() {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");
    document.getElementById("timestamp").textContent = `TIME: ${hours}:${minutes}:${seconds} UTC`;
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        if(composer) {
            composer.setSize(window.innerWidth, window.innerHeight);
        }
        // --- NEW: Update refractive UI positions on resize ---
        updateRefractiveUIPositions(); 
    }
}

// --- NEW: Function to update refractor positions and sizes ---
function updateRefractiveUIPositions() {
    if (!camera || uiRefractors.length === 0) return;

    // Assuming all refractors are in the same hudGroup parented to the camera.
    // The Z position of the hudGroup is the distance from the camera.
    const distanceZ = Math.abs(uiRefractors[0].refractor.parent.position.z);

    // Calculate visible height and width at the HUD plane based on camera FOV
    const vFOV = camera.fov * Math.PI / 180; // Convert FOV to radians
    const visibleHeightAtZ = 2 * Math.tan(vFOV / 2) * distanceZ;
    const visibleWidthAtZ = visibleHeightAtZ * camera.aspect;

    uiRefractors.forEach(item => {
        const { htmlElement, refractor } = item;
        const rect = htmlElement.getBoundingClientRect();

        // If element is not visible or has no dimensions, hide the refractor
        if (rect.width === 0 || rect.height === 0 || htmlElement.offsetParent === null) {
            refractor.visible = false;
            return;
        }
        refractor.visible = true;

        // Convert pixel dimensions of HTML element to world units for the refractor
        const worldWidth = (rect.width / window.innerWidth) * visibleWidthAtZ;
        const worldHeight = (rect.height / window.innerHeight) * visibleHeightAtZ;

        // Update refractor scale (since its base geometry is 1x1)
        refractor.scale.set(worldWidth, worldHeight, 1);

        // Calculate world position for the refractor (center of the HTML element)
        // 1. Pixel center of HTML element relative to viewport center:
        const pixelCenterX = (rect.left + rect.width / 2) - (window.innerWidth / 2);
        const pixelCenterY = -((rect.top + rect.height / 2) - (window.innerHeight / 2)); // Y is inverted (screen Y down, Three.js Y up)

        // 2. Convert pixel center offset to world offset for the HUD plane:
        const worldX = (pixelCenterX / window.innerWidth) * visibleWidthAtZ;
        const worldY = (pixelCenterY / window.innerHeight) * visibleHeightAtZ;
        
        // Set refractor position relative to its parent (the hudGroup)
        refractor.position.set(worldX, worldY, 0); // Z is 0 because it's in the hudGroup plane
    });
}