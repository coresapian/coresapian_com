// --- START OF FILE script.js ---

import * as THREE from "https://esm.sh/three@0.175.0?target=es2020";
import { OrbitControls } from "https://esm.sh/three@0.175.0/examples/jsm/controls/OrbitControls.js?target=es2020";
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
let currentCrypticMessageIndex = 0;
let crypticMessageTimeout;

// Asset Cache
let cachedSingularityModel = null;
const singularityModelPath = 'dyson_rings.glb';

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

        // Update animations and controls
        if (anomalyMixer) anomalyMixer.update(delta);
        if (controls) controls.update();
        
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
    loader.load(singularityModelPath, (gltf) => {
        cachedSingularityModel = gltf; // Cache the loaded model
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const scaleFactor = 1.5 / maxSize;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        model.position.sub(center.multiplyScalar(scaleFactor));
        preloaderScene.add(model);

        if (gltf.animations && gltf.animations.length) {
            preloaderMixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => preloaderMixer.clipAction(clip).play());
        }

        // The asset loader is now responsible for starting the main app.
        startApp();
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

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 500;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.1;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 150, 150);
    scene.add(dirLight);

    if (cachedSingularityModel) {
        anomalyObject = cachedSingularityModel.scene.clone();
        const animations = cachedSingularityModel.animations;
        
        // --- REMOVED: No more shader injection or material modification ---
        
        const box = new THREE.Box3().setFromObject(anomalyObject);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const scaleFactor = 5 / maxSize;
        anomalyObject.scale.set(scaleFactor, scaleFactor, scaleFactor);
        anomalyObject.position.sub(center.multiplyScalar(scaleFactor));
        scene.add(anomalyObject);

        if (animations && animations.length) {
            anomalyMixer = new THREE.AnimationMixer(anomalyObject);
            animations.forEach((clip) => anomalyMixer.clipAction(clip).play());
        }
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


function reorganizeUIForHUD() {
    console.log("Reorganizing UI for HUD...");

    const hudTopContainer = document.querySelector('.helmet-hud .hud-top-container');
    const hudLeftPanel = document.querySelector('.helmet-hud .hud-left-panel');
    const hudCenterArea = document.querySelector('.helmet-hud .hud-center-area');
    const hudRightPanel = document.querySelector('.helmet-hud .hud-right-panel');
    const hudBottomContainer = document.querySelector('.helmet-hud .hud-bottom-container');

    // Grab existing elements
    const header = document.querySelector('.interface-container .header');
    const controlPanel = document.querySelector('.control-panel');
    const dataPanel = document.querySelector('.data-panel');
    const terminalPanel = document.querySelector('.terminal-panel');
    const spectrumAnalyzer = document.querySelector('.spectrum-analyzer');
    const scannerFrame = document.querySelector('.interface-container .scanner-frame');
    // const notification = document.getElementById('notification'); // Decide if/where to move

    const scannerIdElement = document.querySelector('.scanner-frame .scanner-id');
    const scannerIdRightElement = document.querySelector('.scanner-frame .scanner-id-right');

    // Move elements to their new HUD locations
    if (header && hudTopContainer) {
        hudTopContainer.appendChild(header);
        console.log("Moved Header to HUD Top");

        if (scannerIdElement) {
            hudTopContainer.appendChild(scannerIdElement);
            console.log("Moved Scanner ID to HUD Top");
        }
        if (scannerIdRightElement) {
            hudTopContainer.appendChild(scannerIdRightElement);
            console.log("Moved Scanner ID Right to HUD Top");
        }
    }
    if (controlPanel && hudLeftPanel) {
        hudLeftPanel.appendChild(controlPanel);
        console.log("Moved Control Panel to HUD Left");
    }
    if (dataPanel && hudRightPanel) {
        hudRightPanel.appendChild(dataPanel);
        console.log("Moved Data Panel to HUD Right");
    }
    if (terminalPanel && hudBottomContainer) {
        hudBottomContainer.appendChild(terminalPanel);
        console.log("Moved Terminal Panel to HUD Bottom");
    }
    if (spectrumAnalyzer && hudRightPanel) {
        hudRightPanel.appendChild(spectrumAnalyzer); // Appending to right panel, will appear after dataPanel
        console.log("Moved Spectrum Analyzer to HUD Right");
    }
    if (scannerFrame && hudCenterArea) {
        // hudCenterArea.appendChild(scannerFrame); // Scanner frame might need more specific styling
        // For now, let's comment out moving scanner frame as its styling is very central
        console.log("Scanner Frame identified, manual placement/styling in HUD center recommended.");
    }

    // Optional: Clean up empty containers if necessary
    const interfaceContainer = document.querySelector('.interface-container');
    if (interfaceContainer && interfaceContainer.children.length === 0) {
        // interfaceContainer.remove(); // Or hide it
        console.log("Original interface-container is now empty or can be hidden.");
    }

    console.log("HUD UI reorganization attempt complete.");
}

// --- UI & Interaction Setup ---
function initUI() {
    setupEventListeners();
    makePanelDraggable(document.querySelector(".control-panel"), document.getElementById("control-panel-handle"));
    makePanelDraggable(document.querySelector(".spectrum-analyzer"), document.getElementById("spectrum-handle"));

    updateTimestamp();
    setInterval(updateTimestamp, 1000);

    // Initialize draggable for data-panel if it has a handle
    const dataPanelElement = document.querySelector('.data-panel');
    // Check if dataPanelElement itself exists before querying its child
    if (dataPanelElement) {
        const dataPanelHandle = dataPanelElement.querySelector('.drag-handle'); // Assuming a similar handle
        if (dataPanelHandle) {
            makePanelDraggable(dataPanelElement, dataPanelHandle);
        }
    }

    reorganizeUIForHUD(); // Added call
    typeTerminalMessages(); // Restore terminal message typing

    // Restore terminal draggability - assuming the whole panel or a specific handle
    const terminalPanelElement = document.querySelector('.terminal-panel');
    if (terminalPanelElement) {
        // If terminal has a specific handle, e.g., like other panels:
        // const terminalHandle = terminalPanelElement.querySelector('.drag-handle'); 
        // if (terminalHandle) { makePanelDraggable(terminalPanelElement, terminalHandle); }
        // else { makePanelDraggable(terminalPanelElement); } // Or make the whole panel draggable
        // For now, let's assume the terminal header can be used or the whole panel if no specific handle
        const terminalHeader = terminalPanelElement.querySelector('.terminal-header');
        if (terminalHeader) {
             makePanelDraggable(terminalPanelElement, terminalHeader);
        } else {
            makePanelDraggable(terminalPanelElement); // Fallback to whole panel if no header/handle
        }
    }
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
        controls.autoRotate = false; // Stop auto-rotation on user interaction
    });
    document.addEventListener("mousemove", () => { lastUserActionTime = Date.now(); });
    document.addEventListener("keydown", () => { lastUserActionTime = Date.now(); });
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
        "SYSTEM INITIALIZED. AUDIO ANALYSIS READY.",
        "SCANNING FOR ANOMALIES IN FREQUENCY SPECTRUM."
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