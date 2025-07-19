/* global THREE */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as GodRays from 'three/addons/shaders/GodRaysShader.js';

const container = document.getElementById('godrays-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 1, 3000);
camera.position.z = 200;

const renderer = new THREE.WebGLRenderer({alpha:true});
renderer.setSize(innerWidth,innerHeight);
container.appendChild(renderer.domElement);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(20,16,8),
  new THREE.MeshBasicMaterial({color:0xffffff})
);
scene.add(sphere);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

renderer.setAnimationLoop(()=>{
  controls.update();
  renderer.render(scene,camera);
});

addEventListener('resize',()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
