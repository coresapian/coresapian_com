// public/skybox.js
import * as THREE from 'three';

let starGeometry, starMaterial, starField;
let starVertices = [], starColors = [];
let numStars, skyboxRadius;
let baseColors = [];
let starInitialBrightnessFactors = [];
let dustGeometry, dustMaterial, dustField;
let dustVertices = [], dustColors = [];
let numDustStars, dustSkyboxRadius;

export function createSkybox(scene, parallaxLayers) {
    skyboxRadius = 5000;
    numStars = 15000;

    starGeometry = new THREE.BufferGeometry();
    starMaterial = new THREE.PointsMaterial({
        size: 1.5,
        sizeAttenuation: true,
        vertexColors: true
    });

    baseColors = [
        new THREE.Color(0xaadcff), // Blueish-white
        new THREE.Color(0xffffff), // White
        new THREE.Color(0xfff4d4), // Yellowish-white
        new THREE.Color(0xffa500), // Orange
        new THREE.Color(0xff6347)  // Tomato/Reddish-Orange
    ];

    for (let i = 0; i < numStars; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const x = skyboxRadius * Math.sin(phi) * Math.cos(theta);
        const y = skyboxRadius * Math.sin(phi) * Math.sin(theta);
        const z = skyboxRadius * Math.cos(phi);
        starVertices.push(x, y, z);

        const baseColor = baseColors[Math.floor(Math.random() * baseColors.length)].clone();
        let brightness = Math.pow(Math.random(), 2.5);
        brightness = 0.3 + brightness * 0.7;
        starInitialBrightnessFactors.push(brightness);
        baseColor.multiplyScalar(brightness);
        starColors.push(baseColor.r, baseColor.g, baseColor.b);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    parallaxLayers.push({ field: starField, factor: 0.8, name: 'starField' });

    // Dust Layer
    dustSkyboxRadius = skyboxRadius * 1.2;
    numDustStars = 50000;
    dustGeometry = new THREE.BufferGeometry();
    dustMaterial = new THREE.PointsMaterial({
        size: 0.2,
        sizeAttenuation: true,
        vertexColors: true,
    });
    const dustBaseColor = new THREE.Color(0xcccccc);
    for (let i = 0; i < numDustStars; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const x = dustSkyboxRadius * Math.sin(phi) * Math.cos(theta);
        const y = dustSkyboxRadius * Math.sin(phi) * Math.sin(theta);
        const z = dustSkyboxRadius * Math.cos(phi);
        dustVertices.push(x, y, z);
        const finalColor = dustBaseColor.clone();
        let brightness = Math.pow(Math.random(), 3.0);
        brightness = 0.1 + brightness * 0.4;
        finalColor.multiplyScalar(brightness);
        dustColors.push(finalColor.r, finalColor.g, finalColor.b);
    }
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustVertices, 3));
    dustGeometry.setAttribute('color', new THREE.Float32BufferAttribute(dustColors, 3));
    dustField = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustField);
    parallaxLayers.push({ field: dustField, factor: 0.9, name: 'dustField' });

    return { starField, dustField };
}

export function updateSkyboxTwinkle() {
    if (starGeometry && starColors.length > 0 && numStars > 0) {
        const twinkleSpeed = 0.05; 
        const starsToTwinkle = Math.floor(numStars * twinkleSpeed);
        
        for (let i = 0; i < starsToTwinkle; i++) {
            const starIndex = Math.floor(Math.random() * numStars);
            const originalBaseColor = baseColors[Math.floor(Math.random() * baseColors.length)].clone(); // Simplified
            const initialBrightness = starInitialBrightnessFactors[starIndex];
            const twinkleIntensityFactor = 0.6;
            let newBrightness = initialBrightness + (Math.random() - 0.5) * initialBrightness * twinkleIntensityFactor * 2;
            newBrightness = Math.max(0.1, Math.min(newBrightness, initialBrightness * (1 + twinkleIntensityFactor)));
            newBrightness = Math.min(newBrightness, 1.5);

            const newColor = originalBaseColor.multiplyScalar(newBrightness);
            starColors[starIndex * 3] = newColor.r;
            starColors[starIndex * 3 + 1] = newColor.g;
            starColors[starIndex * 3 + 2] = newColor.b;
        }
        starGeometry.attributes.color.needsUpdate = true;
    }
}