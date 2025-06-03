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
import { createWater, updateWater, effectController as waterEffectController } from './water.js'; // Import effectController if you want to tweak it from main.js or GUI
import { createSkybox, updateSkyboxTwinkle } from './skybox.js';
import { loadAbstractCore, updateAbstractCoreAnimation } from './abstract_core.js';

const parallaxLayers = []; // Populated by createSkybox

let container;
let camera, scene, renderer, composer;
let controls; // OrbitControls
let sunDirectionVector; // Renamed for clarity, as it's a direction, not the light object itself
let waterData; // Will store the object returned by createWater (mesh, GPGPU data, etc.)
let abstractCore; // Model from abstract_core.js
let mixer;    // AnimationMixer from abstract_core.js
const clock = new THREE.Clock();
const physicalLights = [];
const NUM_PHYSICAL_LIGHTS = 3;
let suns = []; // For original sun objects that also act as lights

const BLOOM_LAYER = 1;

// Utility to convert a 3D world position on a sphere to UV coordinates
function worldToSphericalUV(worldPosition, planetRadius) {
    // Ensure the position is on the sphere's surface for accurate UV mapping
    const pointOnSphere = worldPosition.clone().normalize().multiplyScalar(planetRadius);

    // u (longitude): atan2(x, z) maps z-axis to 0, positive x-axis to 0.25 PI, etc.
    // We add 0.5 to shift range from [-0.5, 0.5] to [0, 1]
    const u = (Math.atan2(pointOnSphere.x, pointOnSphere.z) / (2 * Math.PI)) + 0.5;

    // v (latitude): asin(y / radius) maps y from -radius to +radius to -PI/2 to PI/2.
    // Divide by PI and add 0.5 to map to [0, 1]
    const v = (Math.asin(pointOnSphere.y / planetRadius) / Math.PI) + 0.5;

    return new THREE.Vector2(u, v);
}
const PLANET_RADIUS = 15000; // Matches water.js // Layer for objects that should bloom

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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8; 
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Or THREE.VSMShadowMap for better quality if performance allows
    container.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', event => {
        console.error('WebGL context lost');
        event.preventDefault();
    });

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 100, PLANET_RADIUS * 4); // Adjusted near/far for planet scale
    camera.position.set(0, PLANET_RADIUS + 3000, PLANET_RADIUS * 1.2); // Position camera relative to planet surface
    camera.lookAt(0, PLANET_RADIUS, 0); // Look at the core on the water planet surface
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

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // Sun direction vector (original use, might be repurposed or removed if not needed by new water directly)
    sunDirectionVector = new THREE.Vector3(1,1,1); 

    // Water - new GPGPU water system
    // createWater now needs renderer, scene, and camera
    waterData = createWater(renderer, scene, camera); 

    // Skybox (Procedural Stars & Dust)
    createSkybox(scene, parallaxLayers); 

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(0x707070, 0x444444, 1.4);
    scene.add(hemisphereLight);
    const ambientLight = new THREE.AmbientLight(0x606070, 1.4);
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
        { color: 0xFFFFCC, emissive: 0xFFFFAA, yOffset: 50, orbitRadius: 2800, orbitSpeed: 0.52, angle: 0, lightPower: 70000 }, 
        { color: 0xFFA500, emissive: 0xFF8800, yOffset: 50, orbitRadius: 2200, orbitSpeed: 0.36, angle: Math.PI / 2, lightPower: 60000 },
        { color: 0x00CCFF, emissive: 0x00AADD, yOffset: 40, orbitRadius: 1500, orbitSpeed: 0.22, angle: Math.PI, lightPower: 50000 },
        { color: 0xFF33CC, emissive: 0xFF33AA, yOffset: 30, orbitRadius: 900, orbitSpeed: 0.39, angle: Math.PI * 1.5, lightPower: 55000 },
    ];
    const textureLoader = new THREE.TextureLoader(); 
    const flareTexture0 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
    const flareTexture3 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare3.png');

    sunParams.forEach(param => {
        const material = new THREE.MeshStandardMaterial({
            color: param.color,
            emissive: param.emissive,
            emissiveIntensity: 1,
            metalness: 0, // Suns are not metallic
            roughness: 0.8, // Adjust for desired appearance
        });
        const mesh = new THREE.Mesh(sunGeometry, material);
        const radius = param.orbitRadius; // Use the orbitRadius defined in sunParams

        // New animation parameters
        const baseSize = Math.random() * 0.4 + 0.8; // Base scale multiplier (0.8 to 1.2)
        const scaleSpeed = Math.random() * 0.5 + 0.2; // Speed of size oscillation
        const scalePhase = Math.random() * Math.PI * 2; // Initial phase of size oscillation
        const yUndulationSpeed = Math.random() * 0.3 + 0.1; // Speed of y-axis undulation
        const yUndulationPhase = Math.random() * Math.PI * 2; // Initial phase of y-axis undulation

        // Set initial y position based on undulation (range 10 to 100)
        const yCenter = 55;
        const yAmplitude = 45;
        const initialY = yCenter + Math.sin(yUndulationPhase) * yAmplitude;

        mesh.position.set(
            0 + radius * Math.cos(param.angle), // Initial X relative to world origin
            initialY, // initialY is calculated locally and is fine
            0 + radius * Math.sin(param.angle)  // Initial Z relative to world origin
        );

        // Set initial scale
        mesh.scale.set(baseSize, baseSize, baseSize);
        
        // Add physical light properties to the sun
        const sunPointLight = new THREE.PointLight(param.color, undefined, 0, 2); // Color, Intensity (from power), Distance, Decay
        sunPointLight.power = param.lightPower; // Use the defined lightPower from sunParams
        sunPointLight.castShadow = true;
        sunPointLight.shadow.mapSize.width = 512;
        sunPointLight.shadow.mapSize.height = 512;
        sunPointLight.shadow.camera.near = baseSize; // Near plane should be beyond the sun's surface
        sunPointLight.shadow.camera.far = Math.max(5000, radius * 2.5); // Ensure it covers the orbit
        sunPointLight.shadow.bias = -0.005;
        // sunPointLight.shadow.radius = 2; // For PCFSoftShadowMap

        mesh.add(sunPointLight); // Add the light as a child of the sun mesh

        mesh.layers.enable(BLOOM_LAYER);
        scene.add(mesh);

        const lensflare = new Lensflare();
        lensflare.addElement(new LensflareElement(flareTexture0, 700, 0, material.color));
        lensflare.addElement(new LensflareElement(flareTexture3, 60, 0.6));
        lensflare.addElement(new LensflareElement(flareTexture3, 70, 0.7));
        lensflare.addElement(new LensflareElement(flareTexture3, 120, 0.9));
        lensflare.addElement(new LensflareElement(flareTexture3, 70, 1.0));
        mesh.add(lensflare);

        suns.push({
            mesh: mesh,
            lensflare: lensflare,
            param: param, // Store the original parameters
            currentAngle: param.angle, // Initialize current orbital angle
            baseSize: baseSize,
            scaleSpeed: scaleSpeed,
            scalePhase: scalePhase,
            yUndulationSpeed: yUndulationSpeed,
            yUndulationPhase: yUndulationPhase
        });
        setBloomLayer(mesh); 
    });

    // Abstract Core
    loadAbstractCore(scene, (loadedCore, loadedMixer) => {
        abstractCore = loadedCore;
        mixer = loadedMixer;
        if (abstractCore && abstractCore.position) {
            abstractCore.position.set(0, PLANET_RADIUS, 0); // Position core on the surface of the water planet surface of the water sphere (radius 3000)
            orbitCenter.copy(abstractCore.position); // Update orbit center if used elsewhere
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
    controls.maxDistance = 10000; // Increased max distance for orbit controls
    controls.target.set(0, 3000, 0); // Set orbit controls target to the core
    controls.maxPolarAngle = Math.PI; // Allow looking from below 

    // Create physical orbiting lights
    for (let i = 0; i < NUM_PHYSICAL_LIGHTS; i++) {
        const lightColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.6).getHex();
        const lightPower = 80000 + Math.random() * 120000; // Lumens (e.g., 80k to 200k)
        const bulbRadius = 15;

        const light = createPhysicalLight(lightColor, lightPower, bulbRadius);

        // Random orbit parameters around the abstract core
        const orbitAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const orbitRadius = 700 + Math.random() * 600; // Orbit distance from core center
        const orbitSpeed = 0.15 + Math.random() * 0.2; // Radians per second
        
        // Initial position on the sphere of orbitRadius
        let initialRelativePosition = new THREE.Vector3(orbitRadius, 0, 0);
        const randomRotationAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const randomInitialAngle = Math.random() * Math.PI * 2;
        const initialQuaternion = new THREE.Quaternion().setFromAxisAngle(randomRotationAxis, randomInitialAngle);
        initialRelativePosition.applyQuaternion(initialQuaternion);

        light.userData.orbit = {
            axis: orbitAxis,
            speed: orbitSpeed,
            currentRelativePosition: initialRelativePosition,
            rotationQuaternion: new THREE.Quaternion()
        };

        scene.add(light);
        physicalLights.push(light);
    }

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

function createPhysicalLight(color, power, bulbRadius = 15) {
    const pointLight = new THREE.PointLight(color, undefined, 0, 2); // Color, Intensity (set by power), Distance (0=infinite), Decay (2=physical)
    pointLight.power = power; // Power in lumens

    const bulbGeometry = new THREE.SphereGeometry(bulbRadius, 16, 8);
    const bulbMaterial = new THREE.MeshStandardMaterial({
        emissive: color,
        emissiveIntensity: 30.0, // Tuned for bloom and exposure, may need adjustment
        color: 0x000000, // Black base color, glow comes from emissive
        metalness: 0,
        roughness: 0.5
    });
    const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulbMesh.layers.enable(BLOOM_LAYER); // Ensure bulb contributes to bloom
    pointLight.add(bulbMesh);

    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 512; // Decent quality for multiple lights
    pointLight.shadow.mapSize.height = 512;
    pointLight.shadow.camera.near = Math.max(10, bulbRadius * 2); // Near plane should be beyond the bulb
    pointLight.shadow.camera.far = 5000; // Adjust based on scene scale and orbit radius
    pointLight.shadow.bias = -0.005; // Helps prevent shadow acne
    // pointLight.shadow.radius = 2; // For PCFSoftShadowMap, if using soft shadows

    return pointLight;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    controls.update(); 

    // updateWater now takes the waterData object and the camera
    if (waterData && waterData.gpuCompute && waterData.heightmapVariable) {
        // Mouse interaction
        const mouseHitPoint = waterData.getMouseIntersectionPoint();
        if (mouseHitPoint) {
            const mouseUV = worldToSphericalUV(mouseHitPoint, PLANET_RADIUS);
            waterData.heightmapVariable.material.uniforms.mouseUV.value.copy(mouseUV);
            // Approximate UV size: world size / (half circumference)
            // This is a rough approximation. A more accurate way might involve projecting two points defining the diameter.
            const mouseSizeWorld = waterData.effectController.mouseSize; // from water.js effectController
            const mouseSizeUV = mouseSizeWorld / (Math.PI * PLANET_RADIUS); // Fraction of half circumference
            waterData.heightmapVariable.material.uniforms.mouseSize.value = Math.max(0.001, mouseSizeUV); // Ensure non-zero
        } else {
            waterData.heightmapVariable.material.uniforms.mouseUV.value.set(-1.0, -1.0); // Off-screen
        }
    }

    if (waterData && waterData.heightmapVariable) { // Ensure GPGPU water is ready
        updateWater(waterData, camera, elapsedTime); 
    } 

    updateSkyboxTwinkle(); 

    if (abstractCore && mixer) { 
        updateAbstractCoreAnimation(); 

        // Abstract core interaction with water
        if (waterData && waterData.heightmapVariable) {
            const coreWorldPosition = new THREE.Vector3();
            abstractCore.getWorldPosition(coreWorldPosition);
            const waterLevel = PLANET_RADIUS; // Water surface is now at planet radius
            const coreInteractionSize = 150; // Radius of core's influence
            const coreInteractionDepth = 15.0; // How much it displaces water

            // Check if the bottom of the core (approximated) might be touching or in the water
            // This is a simple check; a more accurate one might use bounding box intersection
            if (coreWorldPosition.y <= waterLevel + coreInteractionSize * 0.5) { // Check if core's center is near/in water
                const coreUV = worldToSphericalUV(coreWorldPosition, PLANET_RADIUS);
                waterData.heightmapVariable.material.uniforms.objectUV.value.copy(coreUV);
                const coreSizeUV = coreInteractionSize / (Math.PI * PLANET_RADIUS); 
                waterData.heightmapVariable.material.uniforms.objectSize.value = Math.max(0.001, coreSizeUV);
                waterData.heightmapVariable.material.uniforms.objectDeep.value = coreInteractionDepth;
            } else {
                // If core is not interacting, move the influence point far away
                waterData.heightmapVariable.material.uniforms.objectUV.value.set(-1.0, -1.0); // Off-screen UV
            }
        }
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
        let interactingSunsCount = 0;
        const waterLevel = PLANET_RADIUS;
        const sunInteractionBaseSize = 80; // Base size of sun's influence, will be scaled by sun's actual size
        const sunInteractionBaseDepth = 8.0; // Base depth of sun's influence

        suns.forEach(sunObj => {
            // Orbital movement (XZ plane)
            sunObj.currentAngle += sunObj.param.orbitSpeed * delta;
            if (sunObj.currentAngle > Math.PI * 2) sunObj.currentAngle -= Math.PI * 2;
            sunObj.mesh.position.x = abstractCore.position.x + sunObj.param.orbitRadius * Math.cos(sunObj.currentAngle);
            sunObj.mesh.position.z = abstractCore.position.z + sunObj.param.orbitRadius * Math.sin(sunObj.currentAngle);

            // Y-position undulation
            const yBase = abstractCore.position.y + sunObj.param.yOffset;
            const yAmplitude = 450; // Increased amplitude for larger scale, can be param-specific if needed
            const yUndulation = Math.sin(elapsedTime * sunObj.yUndulationSpeed + sunObj.yUndulationPhase) * yAmplitude;
            sunObj.mesh.position.y = yBase + yUndulation;

            // Scale animation (grow/shrink a little)
            const scaleOscillation = Math.sin(elapsedTime * sunObj.scaleSpeed + sunObj.scalePhase) * 0.1; // +/- 10% variation
            const currentScale = sunObj.baseSize * (1 + scaleOscillation);
            sunObj.mesh.scale.set(currentScale, currentScale, currentScale);

            // Sun interaction with water
            if (waterData && waterData.heightmapVariable && interactingSunsCount < 2) {
                const sunWorldPosition = sunObj.mesh.position;
                const sunRadius = 120 * currentScale; // Actual world radius of the sun sphere (model radius * current scale)

                if (sunWorldPosition.y - sunRadius <= waterLevel) { // Check if bottom of sun touches water
                    const sunUniformSet = interactingSunsCount === 0 ? 'sun1' : 'sun2';
                    const sunUV = worldToSphericalUV(sunWorldPosition, PLANET_RADIUS);
                    waterData.heightmapVariable.material.uniforms[sunUniformSet + 'UV'].value.copy(sunUV);
                    const currentSunWorldSize = sunInteractionBaseSize * (currentScale / sunObj.baseSize);
                    const sunSizeUV = currentSunWorldSize / (Math.PI * PLANET_RADIUS);
                    waterData.heightmapVariable.material.uniforms[sunUniformSet + 'Size'].value = Math.max(0.001, sunSizeUV);
                    waterData.heightmapVariable.material.uniforms[sunUniformSet + 'Deep'].value = sunInteractionBaseDepth;
                    interactingSunsCount++;
                }
            }
        });

        // If fewer than 2 suns are interacting, move the unused influence points away
        if (waterData && waterData.heightmapVariable) {
            if (interactingSunsCount < 1) {
                waterData.heightmapVariable.material.uniforms.sun1Pos.value.set(10000, 10000);
            }
            if (interactingSunsCount < 2) {
                waterData.heightmapVariable.material.uniforms.sun2Pos.value.set(10000, 10000);
            }
        }
    }

    composer.render(delta);
}
