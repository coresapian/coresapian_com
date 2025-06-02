// public/abstract_core.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let abstractCoreModel, mixer, actions = {};
let clock = new THREE.Clock(); // Keep clock local if only used here
let noise = new THREE.Vector3();
let noiseTime = 0;
const noiseSpeed = 0.1; // Speed of noise evolution
const noiseScale = 0.005; // Scale of rotation changes
let isAnimationPaused = false;
let currentAnimationName = 'Animation_Core_Pulse'; // Default animation, adjust if needed
let glowMaterial;

// Function to create a glowing material
function createGlowMaterial(color, intensity) {
    return new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: intensity,
        transparent: true,
        opacity: 0.8, // Adjust as needed
        side: THREE.FrontSide,
        depthWrite: false, 
        blending: THREE.AdditiveBlending 
    });
}

export function loadAbstractCore(scene, onLoaded) {
    const loader = new GLTFLoader();
    loader.load(
        'abstract_core.glb', 
        function (gltf) {
            abstractCoreModel = gltf.scene;
            abstractCoreModel.scale.set(1, 1, 1); 
            abstractCoreModel.position.set(0, 0, 0); 
            abstractCoreModel.castShadow = true;
            abstractCoreModel.receiveShadow = true;

            glowMaterial = createGlowMaterial(new THREE.Color(0x00ffff), 2.5); // Cyan glow

            abstractCoreModel.traverse(function (child) {
                if (child.isMesh) {
                    console.log('Mesh Name:', child.name, '; UUID:', child.uuid); // Log mesh name and UUID
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Apply glow material to specific parts based on name
                    // Adjust these names to match your GLB model's structure
                    if (child.name.includes('Core_Energy') || child.name.includes('Inner_Glow_Object') || child.name === 'Sphere_Core_0') {
                        child.material = glowMaterial.clone(); 
                    } else if (child.material) {
                        // Ensure other parts have standard materials
                        const originalMaterial = child.material;
                        child.material = new THREE.MeshStandardMaterial({
                            color: originalMaterial.color || 0xffffff,
                            map: originalMaterial.map || null,
                            metalness: originalMaterial.metalness || 0.5,
                            roughness: originalMaterial.roughness || 0.5,
                        });
                    }
                }
            });
            
            scene.add(abstractCoreModel);

            // Add multiple PointLights for better illumination from various angles
            const lightConfigs = [
                { position: [0, 15, 0], intensity: 1.5, distance: 150, decay: 1.5 }, // Top
                { position: [0, -15, 0], intensity: 1.0, distance: 150, decay: 1.5 }, // Bottom
                { position: [15, 0, 5], intensity: 1.2, distance: 150, decay: 1.5 },  // Front-ish/Side
                { position: [-15, 0, -5], intensity: 1.2, distance: 150, decay: 1.5 }  // Back-ish/Side
            ];

            lightConfigs.forEach(config => {
                const light = new THREE.PointLight(0xffffff, config.intensity, config.distance, config.decay);
                light.position.set(config.position[0], config.position[1], config.position[2]);
                abstractCoreModel.add(light);
            });

            mixer = new THREE.AnimationMixer(abstractCoreModel);
            if (gltf.animations && gltf.animations.length) {
                gltf.animations.forEach((clip) => {
                    const action = mixer.clipAction(clip);
                    actions[clip.name] = action;
                    // Autoplay a default animation if desired
                    if (clip.name === currentAnimationName) {
                        action.play();
                    }
                });
            } else {
                console.warn("Abstract core model has no animations.");
            }

            if (onLoaded) onLoaded(abstractCoreModel, mixer, actions);
        },
        undefined, // onProgress callback (optional)
        function (error) {
            console.error('An error happened loading the abstract core model:', error);
        }
    );
}

export function updateAbstractCoreAnimation() {
    const deltaTime = clock.getDelta(); // Get delta time for animations
    if (mixer && !isAnimationPaused && abstractCoreModel) {
        mixer.update(deltaTime);
    }

    if (abstractCoreModel) {
        noiseTime += noiseSpeed * deltaTime;
        // More complex noise for smoother, less predictable rotation
        noise.x = (Math.sin(noiseTime * 0.37) + Math.cos(noiseTime * 0.67 + 1.5)) * 0.5;
        noise.y = (Math.sin(noiseTime * 0.43 + 0.5) + Math.cos(noiseTime * 0.73 + 2.1)) * 0.5;
        noise.z = (Math.sin(noiseTime * 0.53 + 1.0) + Math.cos(noiseTime * 0.83 + 0.7)) * 0.5;
        
        abstractCoreModel.rotation.x += noise.x * noiseScale;
        abstractCoreModel.rotation.y += noise.y * noiseScale;
        abstractCoreModel.rotation.z += noise.z * noiseScale;
    }
}

export function toggleAbstractCoreAnimation() {
    isAnimationPaused = !isAnimationPaused;
    if (actions[currentAnimationName]) {
        actions[currentAnimationName].paused = isAnimationPaused;
    }
    return isAnimationPaused;
}

export function reverseAbstractCoreAnimation() {
    if (actions[currentAnimationName]) {
        actions[currentAnimationName].timeScale *= -1;
        // If reversing from a paused state, ensure it plays
        if (actions[currentAnimationName].timeScale < 0 && isAnimationPaused) {
            actions[currentAnimationName].paused = false;
            // isAnimationPaused = false; // Keep global pause state consistent if needed
        }
    }
}

export function playAbstractCoreAnimation(name) {
    if (actions[name] && currentAnimationName !== name) {
        if (actions[currentAnimationName]) {
            actions[currentAnimationName].fadeOut(0.3); // Smooth transition
        }
        actions[name].reset().fadeIn(0.3).play();
        currentAnimationName = name;
        isAnimationPaused = false; // Ensure animation plays
        if (actions[currentAnimationName]) actions[currentAnimationName].paused = false;
    } else if (actions[name] && actions[name].paused) {
        // If playing the same animation that was paused
        actions[name].paused = false;
        isAnimationPaused = false;
    }
}
