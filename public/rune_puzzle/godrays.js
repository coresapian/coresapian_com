/* global THREE */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GodRaysEffect } from 'three/addons/postprocessing/GodRaysEffect.js';

// --- Basic scene setup ---
const container = document.getElementById('godrays-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
camera.position.z = 200;

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- God Rays setup ---

// 1. Occlusion scene
const occlusionScene = new THREE.Scene();
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(20, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000 }) // Black for occlusion
);

occlusionScene.add(sphere);

// 2. Composer and passes
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera)); // Render main scene first

const godRaysEffect = new GodRaysEffect(camera, sphere, {
    resolutionScale: 1,
    density: 0.8,
    decay: 0.95,
    weight: 0.6,
    samples: 100
});

composer.addPass(godRaysEffect);

// --- Animation loop ---
function animate() {
    controls.update();
    composer.render();
}

renderer.setAnimationLoop(animate);

// --- Resize listener ---
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
});
