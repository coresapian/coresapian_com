// --- GOD RAYS SCRIPT ---
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GodRaysFakeSunShader, GodRaysDepthMaskShader, GodRaysCombineShader, GodRaysGenerateShader } from 'three/addons/shaders/GodRaysShader.js';

let container;
let camera, scene, renderer, materialDepth;
let sphereMesh;

const sunPosition = new THREE.Vector3(0, 1000, -1000);
const clipPosition = new THREE.Vector4();
const screenSpacePosition = new THREE.Vector3();

const postprocessing = { enabled: true };

const orbitRadius = 200;

const bgColor = 0x000511;
const sunColor = 0xffee00;

const godrayRenderTargetResolutionMultiplier = 1.0 / 4.0;

init();

function init() {
    container = document.getElementById('godrays-container');

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.z = 200;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    materialDepth = new THREE.MeshDepthMaterial();

    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const loader = new OBJLoader();
    loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/obj/tree.obj', (obj) => {
        obj.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.material = material;
            }
        });
        obj.position.set(0, -150, -150);
        obj.scale.multiplyScalar(400);
        scene.add(obj);
    });

    sphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 10),
        new THREE.MeshBasicMaterial({ color: sunColor })
    );
    sphereMesh.scale.multiplyScalar(20);
    scene.add(sphereMesh);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    initPostprocessing();

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(animate);

    // Initialize background effects
    setupTorchEffect();
    setupMatrixRain();
}

// --- TORCH EFFECT --- 
function setupTorchEffect() {
    const torch = document.querySelector('#torch-overlay');
    if (!torch) return;

    // Basic flicker with GSAP
    gsap.to(torch, {
        '--torch-flicker-opacity': 'random(0.1, 0.4)',
        '--flicker-size': 'random(450, 550)px',
        duration: 'random(0.05, 0.15)',
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
    });

    window.addEventListener('mousemove', e => {
        gsap.to(torch, {
            '--torch-x': `${e.clientX}px`,
            '--torch-y': `${e.clientY}px`,
            '--torch-brightness': '0.6',
            duration: 0.4,
            ease: 'power2.out'
        });
    });

    document.body.addEventListener('mouseleave', () => {
         gsap.to(torch, { '--torch-brightness': '0', duration: 1 });
    });
    document.body.addEventListener('mouseenter', () => {
         gsap.to(torch, { '--torch-brightness': '0.6', duration: 1 });
    });
}

// --- MATRIX RAIN --- 
function setupMatrixRain() {
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const letters = 'ᚠᚢᚦᚩᚱᚳᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛟᛞ';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array.from({ length: columns }).fill(1);

    function drawMatrix() {
        ctx.fillStyle = 'rgba(10, 10, 31, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--frost-blue').trim();
        ctx.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-family-glyphs').trim()}`;

        for (let i = 0; i < drops.length; i++) {
            const text = letters[Math.floor(Math.random() * letters.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(drawMatrix, 50);

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Recalculate columns and drops array on resize if needed
    });
}

function onWindowResize() {
    const renderTargetWidth = window.innerWidth;
    const renderTargetHeight = window.innerHeight;

    camera.aspect = renderTargetWidth / renderTargetHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(renderTargetWidth, renderTargetHeight);
    postprocessing.composer.setSize(renderTargetWidth, renderTargetHeight);

    const godraysResolutionX = renderTargetWidth * godrayRenderTargetResolutionMultiplier;
    const godraysResolutionY = renderTargetHeight * godrayRenderTargetResolutionMultiplier;

    postprocessing.rtTextureColors.setSize(renderTargetWidth, renderTargetHeight);
    postprocessing.rtTextureDepth.setSize(renderTargetWidth, renderTargetHeight);
    postprocessing.rtTextureGodRays1.setSize(godraysResolutionX, godraysResolutionY);
    postprocessing.rtTextureGodRays2.setSize(godraysResolutionX, godraysResolutionY);
}

function initPostprocessing() {
    const renderTargetWidth = window.innerWidth;
    const renderTargetHeight = window.innerHeight;

    postprocessing.scene = new THREE.Scene();
    postprocessing.camera = new THREE.OrthographicCamera(- 0.5, 0.5, 0.5, - 0.5, - 10000, 10000);
    postprocessing.camera.position.z = 100;
    postprocessing.scene.add(postprocessing.camera);

    const rtParams = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
    };

    postprocessing.rtTextureColors = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, rtParams);

    postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, rtParams);
    postprocessing.rtTextureDepth.depthTexture = new THREE.DepthTexture();
    postprocessing.rtTextureDepth.depthTexture.type = THREE.UnsignedShortType;
    postprocessing.rtTextureDepth.depthTexture.format = THREE.DepthFormat;

    const godraysResolutionX = renderTargetWidth * godrayRenderTargetResolutionMultiplier;
    const godraysResolutionY = renderTargetHeight * godrayRenderTargetResolutionMultiplier;

    postprocessing.rtTextureGodRays1 = new THREE.WebGLRenderTarget(godraysResolutionX, godraysResolutionY, rtParams);
    postprocessing.rtTextureGodRays2 = new THREE.WebGLRenderTarget(godraysResolutionX, godraysResolutionY, rtParams);

    const godraysMaskShader = GodRaysDepthMaskShader;
    postprocessing.godrayMaskUniforms = THREE.UniformsUtils.clone(godraysMaskShader.uniforms);
    postprocessing.materialGodraysDepthMask = new THREE.ShaderMaterial({
        uniforms: postprocessing.godrayMaskUniforms,
        vertexShader: godraysMaskShader.vertexShader,
        fragmentShader: godraysMaskShader.fragmentShader
    });

    const godraysGenShader = GodRaysGenerateShader;
    postprocessing.godrayGenUniforms = THREE.UniformsUtils.clone(godraysGenShader.uniforms);
    postprocessing.materialGodraysGenerate = new THREE.ShaderMaterial({
        uniforms: postprocessing.godrayGenUniforms,
        vertexShader: godraysGenShader.vertexShader,
        fragmentShader: godraysGenShader.fragmentShader
    });

    const godraysCombineShader = GodRaysCombineShader;
    postprocessing.godrayCombineUniforms = THREE.UniformsUtils.clone(godraysCombineShader.uniforms);
    postprocessing.materialGodraysCombine = new THREE.ShaderMaterial({
        uniforms: postprocessing.godrayCombineUniforms,
        vertexShader: godraysCombineShader.vertexShader,
        fragmentShader: godraysCombineShader.fragmentShader
    });

    postprocessing.godrayCombineUniforms["tColors"].value = postprocessing.rtTextureColors.texture;
    postprocessing.godrayCombineUniforms["tGodRays"].value = postprocessing.rtTextureGodRays2.texture;
    postprocessing.godrayCombineUniforms["fGodRayIntensity"].value = 0.75;

    postprocessing.quad = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 1.0),
        postprocessing.materialGodraysCombine
    );
    postprocessing.quad.position.z = - 9900;
    postprocessing.scene.add(postprocessing.quad);
}

function animate() {
    const time = Date.now() / 4000;
    sphereMesh.position.x = orbitRadius * Math.cos(time);
    sphereMesh.position.z = orbitRadius * Math.sin(time) - 100;

    if (postprocessing.enabled) {
        clipPosition.copy(sunPosition);
        clipPosition.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);

        clipPosition.x /= clipPosition.w;
        clipPosition.y /= clipPosition.w;

        screenSpacePosition.x = (clipPosition.x + 1) / 2;
        screenSpacePosition.y = (clipPosition.y + 1) / 2;
        screenSpacePosition.z = clipPosition.z;

        postprocessing.godrayGenUniforms["vSunPositionScreenSpace"].value.copy(screenSpacePosition);

        renderer.setRenderTarget(postprocessing.rtTextureColors);
        renderer.clear(true, true, false);
        renderer.render(scene, camera);

        scene.overrideMaterial = materialDepth;
        renderer.setRenderTarget(postprocessing.rtTextureDepth);
        renderer.clear();
        renderer.render(scene, camera);

        postprocessing.godrayMaskUniforms["tInput"].value = postprocessing.rtTextureDepth.depthTexture;

        postprocessing.scene.overrideMaterial = postprocessing.materialGodraysDepthMask;
        renderer.setRenderTarget(postprocessing.rtTextureGodRays1);
        renderer.clear();
        renderer.render(postprocessing.scene, postprocessing.camera);

        postprocessing.godrayGenUniforms["tInput"].value = postprocessing.rtTextureGodRays1.texture;

        postprocessing.scene.overrideMaterial = postprocessing.materialGodraysGenerate;
        renderer.setRenderTarget(postprocessing.rtTextureGodRays2);
        renderer.clear();
        renderer.render(postprocessing.scene, postprocessing.camera);

        postprocessing.scene.overrideMaterial = postprocessing.materialGodraysCombine;
        renderer.setRenderTarget(null);
        renderer.render(postprocessing.scene, postprocessing.camera);
        scene.overrideMaterial = null;

    } else {
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(scene, camera);
    }
}
