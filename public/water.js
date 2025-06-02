// public/water.js
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

export function createWater(scene, sun) {
    const waterGeometry = new THREE.SphereGeometry(500, 64, 32); 
    const water = new Water(waterGeometry, {
        textureWidth: 1024,
        textureHeight: 1024,
        waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg', 
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(8, 8); 
            },
            undefined,
            function (error) {
                console.error('An error happened loading the water normals texture:', error);
                if (water && water.material && water.material.uniforms.causticsIntensity) {
                    water.material.uniforms.causticsIntensity.value = 0.0; 
                }
            }
        ),
        sunDirection: sun.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x0064b4,
        distortionScale: 8.0,
        fog: scene.fog !== undefined,
        causticsIntensity: 2.3,
        causticsScale: 1.8,
        causticsSpeed: 0.6,
        transparent: true,
        opacity: 0.4
    });


    water.receiveShadow = true;
    scene.add(water);
    return water;
}

export function updateWater(water, time) {
    if (water && water.material && water.material.uniforms['time']) {
        water.material.uniforms['time'].value = time;
    }
}