import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GodRaysFakeSunShader, GodRaysDepthMaskShader, GodRaysCombineShader, GodRaysGenerateShader } from 'three/addons/shaders/GodRaysShader.js';

let container, camera, scene, renderer, clock, mixer;
let composer, bloomPass;
const orbs = [];

const postprocessing = {};
const sunPosition = new THREE.Vector3(0, 5, -15);

function setupModel(gltf) {
    console.log('Model loaded, setting up scene...');
    const model = gltf.scene;
    model.scale.set(1.5, 1.5, 1.5);
    model.position.set(0, -0.5, 0);
    scene.add(model);

    if (gltf.animations && gltf.animations.length) {
        console.log('Found animations:', gltf.animations.length);
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
    }
}

function init() {
    container = document.getElementById('container');
    clock = new THREE.Clock();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 0, 3.5);

    // Load Hourglass Model
    const loader = new GLTFLoader();
    const modelUrl = 'https://raw.githubusercontent.com/Artificial-Me/coresapian/main/public/loading_screen_hourglass_animation_model.glb';
    console.log('Loading hourglass model from:', modelUrl);
    
    loader.load(
        modelUrl, 
        (gltf) => {
            console.log('Hourglass model loaded successfully:', gltf);
            setupModel(gltf);
        },
        (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Error loading hourglass model:', error);
            console.log('Trying fallback local path...');
            
            // Fallback to local path
            loader.load('./loading_screen_hourglass_animation_model.glb', 
                (gltf) => {
                    console.log('Fallback model loaded successfully');
                    setupModel(gltf);
                },
                undefined,
                (fallbackError) => {
                    console.error('Fallback model also failed:', fallbackError);
                }
            );
        }
    );

    // Create Orbs
    const orbColors = [0xff4800, 0xffc700, 0xffa07a];
    const orbData = [
        { size: 0.04, speed: 0.5, path: (t) => new THREE.Vector3(1.2 * Math.cos(t), 0, 1.2 * Math.sin(t)) },
        { size: 0.06, speed: 0.3, path: (t) => new THREE.Vector3(0, 1.4 * Math.cos(t), 1.4 * Math.sin(t)) },
        { size: 0.05, speed: 0.4, path: (t) => new THREE.Vector3(1.0 * Math.cos(t), 1.0 * Math.sin(t), 1.0 * Math.sin(t*0.8)) }
    ];

    orbData.forEach((data, i) => {
        const geometry = new THREE.SphereGeometry(data.size, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: orbColors[i] });
        const orb = new THREE.Mesh(geometry, material);
        orb.userData = data;
        orbs.push(orb);
        scene.add(orb);
    });

    initPostprocessing();

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(animate);
}

function initPostprocessing() {
    const renderTargetWidth = window.innerWidth;
    const renderTargetHeight = window.innerHeight;

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    postprocessing.scene = new THREE.Scene();
    postprocessing.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
    postprocessing.camera.position.z = 100;
    postprocessing.scene.add(postprocessing.camera);

    const rtParams = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
    };
    postprocessing.rtTextureColors = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, rtParams);
    postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, { ...rtParams, depthBuffer: true, depthTexture: new THREE.DepthTexture() });
    
    const godrayRenderTargetResolutionMultiplier = 1.0 / 4.0;
    const adjustedWidth = renderTargetWidth * godrayRenderTargetResolutionMultiplier;
    const adjustedHeight = renderTargetHeight * godrayRenderTargetResolutionMultiplier;
    postprocessing.rtTextureGodRays1 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, rtParams);
    postprocessing.rtTextureGodRays2 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, rtParams);

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
    
    postprocessing.godrayCombineUniforms.fGodRayIntensity.value = 0.7;

    postprocessing.quad = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 1.0),
        postprocessing.materialGodraysCombine
    );
    postprocessing.quad.position.z = -9900;
    postprocessing.scene.add(postprocessing.quad);

    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.6, 0.3);
    composer.addPass(bloomPass);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
    bloomPass.setSize(width, height);
    
    const renderTargetWidth = window.innerWidth;
    const renderTargetHeight = window.innerHeight;
    postprocessing.rtTextureColors.setSize(renderTargetWidth, renderTargetHeight);
    postprocessing.rtTextureDepth.setSize(renderTargetWidth, renderTargetHeight);
    
    const adjustedWidth = renderTargetWidth * (1.0 / 4.0);
    const adjustedHeight = renderTargetHeight * (1.0 / 4.0);
    postprocessing.rtTextureGodRays1.setSize(adjustedWidth, adjustedHeight);
    postprocessing.rtTextureGodRays2.setSize(adjustedWidth, adjustedHeight);
}

function filterGodRays(inputTex, renderTarget, stepSize) {
    postprocessing.scene.overrideMaterial = postprocessing.materialGodraysGenerate;
    postprocessing.godrayGenUniforms['fStepSize'].value = stepSize;
    postprocessing.godrayGenUniforms['tInput'].value = inputTex;
    renderer.setRenderTarget(renderTarget);
    renderer.render(postprocessing.scene, postprocessing.camera);
    postprocessing.scene.overrideMaterial = null;
}

function getStepSize(filterLen, tapsPerPass, pass) {
    return filterLen * Math.pow(tapsPerPass, -pass);
}

function render() {
    const clipPosition = new THREE.Vector4();
    const screenSpacePosition = new THREE.Vector3();

    clipPosition.x = sunPosition.x;
    clipPosition.y = sunPosition.y;
    clipPosition.z = sunPosition.z;
    clipPosition.w = 1;
    clipPosition.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);

    clipPosition.x /= clipPosition.w;
    clipPosition.y /= clipPosition.w;

    screenSpacePosition.x = (clipPosition.x + 1) / 2;
    screenSpacePosition.y = (clipPosition.y + 1) / 2;
    screenSpacePosition.z = clipPosition.z;

    postprocessing.godrayGenUniforms['vSunPositionScreenSpace'].value.copy(screenSpacePosition);

    renderer.setRenderTarget(postprocessing.rtTextureColors);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);

    scene.overrideMaterial = new THREE.MeshDepthMaterial();
    renderer.setRenderTarget(postprocessing.rtTextureDepth);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;

    postprocessing.godrayMaskUniforms['tInput'].value = postprocessing.rtTextureDepth.texture;
    postprocessing.scene.overrideMaterial = postprocessing.materialGodraysDepthMask;
    renderer.setRenderTarget(postprocessing.rtTextureGodRays1);
    renderer.clear();
    renderer.render(postprocessing.scene, postprocessing.camera);

    const filterLen = 1.0;
    const TAPS_PER_PASS = 6.0;
    filterGodRays(postprocessing.rtTextureGodRays1.texture, postprocessing.rtTextureGodRays2, getStepSize(filterLen, TAPS_PER_PASS, 1.0));
    filterGodRays(postprocessing.rtTextureGodRays2.texture, postprocessing.rtTextureGodRays1, getStepSize(filterLen, TAPS_PER_PASS, 2.0));
    filterGodRays(postprocessing.rtTextureGodRays1.texture, postprocessing.rtTextureGodRays2, getStepSize(filterLen, TAPS_PER_PASS, 3.0));

    postprocessing.godrayCombineUniforms['tColors'].value = postprocessing.rtTextureColors.texture;
    postprocessing.godrayCombineUniforms['tGodRays'].value = postprocessing.rtTextureGodRays2.texture;
    postprocessing.scene.overrideMaterial = postprocessing.materialGodraysCombine;
    renderer.setRenderTarget(null);
    renderer.render(postprocessing.scene, postprocessing.camera);
    postprocessing.scene.overrideMaterial = null;

    composer.render();
}

function animate() {
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (elapsedTime >= 7.0) {
        window.location.href = './rune_puzzle/index.html';
        renderer.setAnimationLoop(null); // Stop animation loop
        return;
    }

    if (mixer) {
        mixer.update(delta);
    }

    orbs.forEach(orb => {
        const time = elapsedTime * orb.userData.speed;
        const newPos = orb.userData.path(time);
        orb.position.copy(newPos);
    });

    render();
}

init();
