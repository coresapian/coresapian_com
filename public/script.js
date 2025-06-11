// --- START OF FILE script.js ---

import * as THREE from "https://esm.sh/three@0.175.0?target=es2020";
import { PointerLockControls } from "https://esm.sh/three@0.175.0/examples/jsm/controls/PointerLockControls.js?target=es2020";
import { GLTFLoader } from "https://esm.sh/three@0.175.0/examples/jsm/loaders/GLTFLoader.js?target=es2020";
// --- NEW: Import Post-processing modules ---
import { EffectComposer } from 'https://esm.sh/three@0.175.0/examples/jsm/postprocessing/EffectComposer.js?target=es2020';
import { RenderPass } from 'https://esm.sh/three@0.175.0/examples/jsm/postprocessing/RenderPass.js?target=es2020';
import { UnrealBloomPass } from 'https://esm.sh/three@0.175.0/examples/jsm/postprocessing/UnrealBloomPass.js?target=es2020';
import { GlitchPass } from 'https://esm.sh/three@0.175.0/examples/jsm/postprocessing/GlitchPass.js?target=es2020';


// --- Global State ---
// Core Three.js
let scene, camera, renderer, clock, controls;
let isPreloaderActive = true;
// --- NEW: Post-processing ---
let composer, bloomPass, glitchPass;

// Preloader
let preloaderScene, preloaderCamera, preloaderRenderer, preloaderMixer;

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
const movementSpeed = 80.0; // Increased movement speed
let currentCrypticMessageIndex = 0;
let crypticMessageTimeout;

// Asset Cache
let cachedBlackHoleModel = null;
let cachedDysonRingsModel = null;
const blackHoleModelPath = 'blackhole.glb';
const dysonRingsModelPath = 'dyson_rings.glb';

// --- Main Initialization Flow ---
document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(TextPlugin, ScrambleTextPlugin, Draggable);
    init();
});

function init() {
    clock = new THREE.Clock();
    initLoadingAnimation();
    setupPreloader();
    animate(); 
}

function startApp() {
    // Prevent startApp from running more than once
    if (!isPreloaderActive) return;

    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
        gsap.to(loadingOverlay, {
            duration: 1.5,
            autoAlpha: 0,
            ease: "power1.inOut",
            onComplete: () => {
                document.body.classList.add('app-loaded');
                if (preloaderRenderer) {
                    preloaderRenderer.dispose();
                }
                isPreloaderActive = false;
                console.log("Loading complete, main app starting.");
                scheduleCrypticMessages();
            }
        });
    }
    initMainScene();
    initUI();
    initAudio();
    initWebGLParticles(); // --- NEW: Initialize WebGL particles instead of DOM
    initPostProcessing(); // --- NEW: Initialize post-processing effects
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    if (isPreloaderActive) {
        if (preloaderRenderer && preloaderScene && preloaderCamera) {
            if (preloaderMixer) preloaderMixer.update(delta);
            preloaderRenderer.render(preloaderScene, preloaderCamera);
        }
    } else {
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

        // Update animations
        if (anomalyMixer) anomalyMixer.update(delta);
        // if (blackHoleMixer) blackHoleMixer.update(delta); // If you added animations to blackhole

        // Update FPS controls movement
        if (controls.isLocked === true) {
            // Reset velocity
            cameraVelocity.x = 0;
            cameraVelocity.y = 0;
            cameraVelocity.z = 0;

            // Calculate movement direction based on input states
            if (moveForward) {
                cameraVelocity.z = -1.0;
            }
            if (moveBackward) {
                cameraVelocity.z = 1.0;
            }
            if (moveLeft) {
                cameraVelocity.x = -1.0;
            }
            if (moveRight) {
                cameraVelocity.x = 1.0;
            }
            // Vertical movement (fly up/down)
            if (moveUp) {
                cameraVelocity.y = 1.0;
            }
            if (moveDown) {
                cameraVelocity.y = -1.0;
            }

            // Normalize if there's combined movement (diagonal), then apply speed and delta time
            // This ensures consistent speed in all directions.
            if (cameraVelocity.x !== 0 || cameraVelocity.z !== 0) {
                // Horizontal movement (strafe/forward/backward) is relative to camera's direction
                controls.moveRight(cameraVelocity.x * movementSpeed * delta);
                controls.moveForward(cameraVelocity.z * movementSpeed * delta);
            }
            
            // Vertical movement is absolute (along world Y axis for simplicity here)
            // For more complex flight, you might want Y relative to camera pitch.
            controls.getObject().position.y += (cameraVelocity.y * movementSpeed * delta);
        }

        // --- NEW: Render scene via composer for post-processing effects
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }
}

// --- Preloader Setup ---
function setupPreloader() {
    const canvas = document.getElementById("preloader-canvas");
    if (!canvas) return;

    preloaderScene = new THREE.Scene();
    preloaderCamera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 100);
    preloaderCamera.position.z = 2.5;

    preloaderRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    preloaderRenderer.setPixelRatio(window.devicePixelRatio);
    preloaderRenderer.setSize(canvas.width, canvas.height);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    preloaderScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(2, 5, 5);
    preloaderScene.add(directionalLight);

    const loader = new GLTFLoader();

    Promise.all([
        loader.loadAsync(blackHoleModelPath),
        loader.loadAsync(dysonRingsModelPath)
    ]).then(([blackHoleGltf, dysonRingsGltf]) => {
        cachedBlackHoleModel = blackHoleGltf;
        cachedDysonRingsModel = dysonRingsGltf;

        // Use Dyson Rings for preloader visualization
        const preloaderDisplayModelGltf = dysonRingsGltf;
        const model = preloaderDisplayModelGltf.scene.clone(); // Clone for preloader

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const scaleFactor = 1.5 / maxSize;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        model.position.sub(center.multiplyScalar(scaleFactor));
        preloaderScene.add(model);

        if (preloaderDisplayModelGltf.animations && preloaderDisplayModelGltf.animations.length) {
            preloaderMixer = new THREE.AnimationMixer(model);
            preloaderDisplayModelGltf.animations.forEach((clip) => preloaderMixer.clipAction(clip).play());
        }

        startApp(); // Call startApp after both models are loaded and cached
    }).catch(error => {
        console.error("Error loading models for preloader:", error);
        addTerminalMessage("CRITICAL ERROR: FAILED TO LOAD CORE ASSETS.");
        // Optionally, try to start with what's available or show a persistent error
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
    // Add the PointerLockControls' object (which is the camera) to the scene
    // scene.add(controls.getObject()); // This is not strictly necessary if camera is already in scene, but good practice for some controls.
                                    // However, PointerLockControls moves the camera directly, not a separate object.

    container.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        console.log('Pointer locked');
    });

    controls.addEventListener('unlock', () => {
        console.log('Pointer unlocked');
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 150, 150);
    scene.add(dirLight);

    // Instantiate Black Hole (Background)
    if (cachedBlackHoleModel) {
        const blackHoleInstance = cachedBlackHoleModel.scene.clone();
        // Scale the black hole to be very large and position it far back
        blackHoleInstance.scale.set(300, 300, 300); // Adjust scale as needed
        blackHoleInstance.position.set(0, 50, -1200); // Adjust position (e.g. slightly up, far back)
        // Optional: Rotate it for a better view if needed
        // blackHoleInstance.rotation.x = Math.PI / 8;
        scene.add(blackHoleInstance);

        // If black hole has its own animations that should play (optional)
        // if (cachedBlackHoleModel.animations && cachedBlackHoleModel.animations.length) {
        //     const blackHoleMixer = new THREE.AnimationMixer(blackHoleInstance);
        //     cachedBlackHoleModel.animations.forEach(clip => blackHoleMixer.clipAction(clip).play());
        //     // Remember to update blackHoleMixer in the animate() loop if you create it
        // }
    } else {
        console.warn("Cached black hole model not found!");
    }

    // Instantiate Dyson Rings (Foreground/Anomaly)
    if (cachedDysonRingsModel) {
        anomalyObject = cachedDysonRingsModel.scene.clone();
        
        // Apply existing scaling logic for the anomaly object
        const box = new THREE.Box3().setFromObject(anomalyObject);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const scaleFactor = 5 / maxSize; 
        anomalyObject.scale.set(scaleFactor, scaleFactor, scaleFactor);
        anomalyObject.position.sub(center.multiplyScalar(scaleFactor)); // Center it at origin
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

// --- NEW: Post-processing Setup ---
function initPostProcessing() {
    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // UnrealBloomPass for the "glow" effect
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.05; // Lower threshold to make more things glow
    bloomPass.strength = 1.2; // The strength of the glow
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);

    // GlitchPass for the glitch effect
    glitchPass = new GlitchPass();
    glitchPass.enabled = false; // Initially disabled
    composer.addPass(glitchPass);
}


// --- UI & Interaction Setup ---
function initUI() {
    updateTimestamp();
    setInterval(updateTimestamp, 1000);

    // Draggable panels are disabled for the new static HUD layout.

    setupEventListeners();
    // initHudParallax(); // Parallax effect disabled as it may conflict with FPS controls.
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
        // OrbitControls autoRotate no longer exists, click is now handled by PointerLockControls listener for locking.
    });
    document.addEventListener("mousemove", () => { 
        lastUserActionTime = Date.now(); 
        // Mouse movement for aiming is handled by PointerLockControls internally when locked.
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
            case 'KeyC': moveDown = true; break; // Using C or Left Shift for down
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
    // --- REMOVED: Anomaly control resets ---
    document.getElementById("reactivity-slider").value = 1.0;
    document.getElementById("glitch-slider").value = 0.0;
    document.getElementById("sensitivity-slider").value = 5.0;

    // Trigger input events to update UI and variables
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
    
    // --- REMOVED: No longer need to calculate smoothed values for shaders ---
    // The raw frequencyData is used directly in the visualizers below.

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
    const barCount = 64; // Match UI
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
        console.error("Loading message container ('loading-message-text') not found. Skipping loading animation.");
        startApp();
        return;
    }

    messageContainer.innerHTML = "";

    function animateNextMessage() {
        const currentMessageText = messages[messageIndex];
        const messageLine = document.createElement("div");
        messageContainer.appendChild(messageLine);
        
        gsap.to(messageLine, {
            duration: currentMessageText.length * 0.05,
            text: { value: currentMessageText, delimiter: "" },
            ease: "none",
            onComplete: () => {
                messageIndex++;
                if (messageIndex < messages.length) {
                    gsap.delayedCall(0.5, animateNextMessage);
                }
            }
        });
    }

    if (messages.length > 0) {
        animateNextMessage();
    } else {
        startApp();
    }
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

function makePanelDraggable(element, handle) {
    if (!element) return;
    const triggerElement = handle || element;
    Draggable.create(element, {
        type: "x,y",
        edgeResistance: 0.65,
        bounds: "body",
        inertia: true,
        trigger: triggerElement,
        onDragStart: function() {
            gsap.to(this.target, { zIndex: 100 });
        },
    });
}

function initHudParallax() {
    const hud = document.querySelector('.helmet-hud');
    if (!hud) return;

    const shiftAmount = 15; // Max pixels to shift

    window.addEventListener('mousemove', (event) => {
        const { clientX, clientY } = event;
        const { innerWidth, innerHeight } = window;

        // Calculate mouse position from -1 to 1
        const mouseX = (clientX / innerWidth - 0.5) * 2;
        const mouseY = (clientY / innerHeight - 0.5) * 2;

        // Calculate the shift
        const shiftX = mouseX * shiftAmount;
        const shiftY = mouseY * shiftAmount;

        // Use GSAP for smooth animation, moving the HUD opposite to the cursor
        gsap.to(hud, {
            x: -shiftX,
            y: -shiftY,
            duration: 1,
            ease: 'power2.out'
        });
    });
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
    }
}