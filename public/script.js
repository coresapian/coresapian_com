import * as THREE from "https://esm.sh/three@0.175.0?target=es2020";
import { OrbitControls } from "https://esm.sh/three@0.175.0/examples/jsm/controls/OrbitControls.js?target=es2020";
import { GLTFLoader } from "https://esm.sh/three@0.175.0/examples/jsm/loaders/GLTFLoader.js?target=es2020";

// --- Global State ---
// Core Three.js
let scene, camera, renderer, clock, controls;
let isPreloaderActive = true;

// Preloader
let preloaderScene, preloaderCamera, preloaderRenderer, preloaderMixer;

// Main Scene Objects
let anomalyObject, anomalyMixer;
let floatingParticles = [];

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
const singularityModelPath = 'strangest_star.glb';

// --- Main Initialization Flow ---
document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(TextPlugin, ScrambleTextPlugin, Draggable);
    init();
});

function init() {
    clock = new THREE.Clock();
    initLoadingAnimation();
    setupPreloader();
    animate(); // Start the single, unified animation loop
}

function startApp() {
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
    initFloatingParticles();
}

// --- Unified Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
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

            // Update all visual elements that depend on audio
            updateAudioVisualizers();
        }

        // Update animations and controls
        if (anomalyMixer) anomalyMixer.update(delta);
        if (controls) controls.update();
        
        renderer.render(scene, camera);
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

    loadAndCacheGLBModel(singularityModelPath, (gltf) => {
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
    });
}

// --- Main Scene Setup ---
function initMainScene() {
    const container = document.getElementById('three-container');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x12100f, 0.02);

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
    controls.maxDistance = 50;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(50, 150, 150);
    scene.add(dirLight);

    if (cachedSingularityModel) {
        anomalyObject = cachedSingularityModel.scene.clone();
        const animations = cachedSingularityModel.animations;

        // The model will now use its own materials from the GLB file.
        // The custom shader and material replacement logic have been removed.
        
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

// --- UI & Interaction Setup ---
function initUI() {
    makePanelDraggable(document.querySelector(".control-panel"), document.getElementById("control-panel-handle"));
    makePanelDraggable(document.querySelector(".terminal-panel"));
    makePanelDraggable(document.querySelector(".spectrum-analyzer"), document.getElementById("spectrum-handle"));

    updateTimestamp();
    setInterval(updateTimestamp, 1000);

    typeTerminalMessages();
    setupEventListeners();

    applyScrambleEffect(document.querySelector('.data-panel[style*="right: 20px"] .data-label'), "PEAK FREQUENCY:", "VOID_RESONANCE");
}

function setupEventListeners() {
    // Sliders
    // NOTE: These controls no longer affect the main 3D model.
    document.getElementById("intensity-slider").addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById("intensity-value").textContent = value.toFixed(1);
    });

    document.getElementById("resolution-slider").addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById("resolution-value").textContent = value;
    });

    document.getElementById("distortion-slider").addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById("distortion-value").textContent = value.toFixed(1);
    });

    document.getElementById("reactivity-slider").addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        audioReactivity = value; // This still affects other visualizers
        document.getElementById("reactivity-value").textContent = value.toFixed(1);
    });

    document.getElementById("glitch-slider").addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById("glitch-value").textContent = value.toFixed(2);
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
    document.addEventListener("mousemove", () => { lastUserActionTime = Date.now(); });
    document.addEventListener("keydown", () => { lastUserActionTime = Date.now(); });
}

function resetControls() {
    document.getElementById("intensity-slider").value = 1.0;
    document.getElementById("resolution-slider").value = 32;
    document.getElementById("distortion-slider").value = 1.0;
    document.getElementById("reactivity-slider").value = 1.0;
    document.getElementById("glitch-slider").value = 0.0;
    document.getElementById("sensitivity-slider").value = 5.0;

    // Trigger input events to update UI and variables
    document.getElementById("intensity-slider").dispatchEvent(new Event('input'));
    document.getElementById("resolution-slider").dispatchEvent(new Event('input'));
    document.getElementById("distortion-slider").dispatchEvent(new Event('input'));
    document.getElementById("reactivity-slider").dispatchEvent(new Event('input'));
    document.getElementById("glitch-slider").dispatchEvent(new Event('input'));
    document.getElementById("sensitivity-slider").dispatchEvent(new Event('input'));

    showNotification("SETTINGS RESET TO DEFAULT VALUES");
}

function analyzeAnomaly() {
    const btn = document.getElementById("analyze-btn");
    btn.textContent = "ANALYZING...";
    btn.disabled = true;

    setTimeout(() => {
        btn.textContent = "ANALYZE";
        btn.disabled = false;
        addTerminalMessage("ANALYSIS COMPLETE. ANOMALY SIGNATURE IDENTIFIED.", true);
        showNotification("ANOMALY ANALYSIS COMPLETE");
        document.getElementById("peak-value").textContent = `${(Math.random() * 200 + 100).toFixed(1)} HZ`;
        document.getElementById("amplitude-value").textContent = (Math.random() * 0.5 + 0.3).toFixed(2);
        const phases = ["π/4", "π/2", "π/6", "3π/4"];
        document.getElementById("phase-value").textContent = phases[Math.floor(Math.random() * phases.length)];
    }, 3000);
}

// --- Audio Handling & Visualizers ---
function initAudio() {
    if (isAudioInitialized) return true;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 2048;
        audioAnalyser.smoothingTimeConstant = 0.8;
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
    const barCount = 128;
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
function initFloatingParticles() {
    const container = document.getElementById("floating-particles");
    if (!container) return;
    const numParticles = 500;
    container.innerHTML = "";
    floatingParticles = [];

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement("div");
        particle.style.position = "absolute";
        particle.style.width = `${Math.random() * 2 + 1}px`;
        particle.style.height = particle.style.width;
        particle.style.backgroundColor = `rgba(0, ${Math.floor(Math.random() * 75) + 180}, ${Math.floor(Math.random() * 55) + 200}, ${Math.random() * 0.5 + 0.2})`;
        particle.style.borderRadius = "50%";
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (Math.max(window.innerWidth, window.innerHeight) / 2 - 100) + 100;
        const x = Math.cos(angle) * distance + window.innerWidth / 2;
        const y = Math.sin(angle) * distance + window.innerHeight / 2;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        container.appendChild(particle);
        floatingParticles.push({
            element: particle,
            angle,
            distance,
            speed: Math.random() * 0.0005 + 0.0001
        });
    }

    function animateParticles() {
        floatingParticles.forEach(p => {
            p.angle += p.speed;
            const x = Math.cos(p.angle) * p.distance + window.innerWidth / 2;
            const y = Math.sin(p.angle) * p.distance + window.innerHeight / 2;
            p.element.style.transform = `translate(${x - p.element.offsetLeft}px, ${y - p.element.offsetTop}px)`;
        });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

function loadAndCacheGLBModel(modelPath, onLoad) {
    if (cachedSingularityModel) {
        console.log(`Using cached GLB model: ${modelPath}`);
        onLoad(cachedSingularityModel);
        return;
    }
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
        console.log(`GLB model loaded and cached: ${modelPath}`);
        onLoad(gltf);
    }, undefined, (error) => {
        console.error(`Error loading GLB model ${modelPath}:`, error);
    });
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
                } else {
                    startApp(); 
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
                terminalContent.scrollTop = terminalContent.scrollHeight;
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
    const triggerElement = handle || element; // Use handle if provided, otherwise the whole element
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
    }
}