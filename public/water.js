// public/water.js
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

// Texture width for simulation
const WIDTH = 128;
// Water size in system units - should be large enough for the scene context
const BOUNDS = 6000; // Planet-scale water plane

let gpuCompute;
let heightmapVariable;
let waterMesh, meshRay; // meshRay for mouse raycasting

const mouseCoords = new THREE.Vector2();
let mousedown = false;

// Publicly accessible effect controller for potential GUI integration
export const effectController = {
    mouseSize: 200.0, // Scaled from example: 0.2 for BOUNDS 6 -> 200 for BOUNDS 6000
    mouseDeep: 10.0,  // Scaled from example: 0.01 for BOUNDS 6 -> 10 for BOUNDS 6000
    viscosity: 0.98,
    speed: 4, // Simulation steps per render frames (higher is faster sim)
    // wireframe: false, // Can be added if needed
};

let simFrame = 0;

const shaderSnippets = {
    heightmap_fragment: /* glsl */`
        #include <common>
        uniform vec2 mousePos; // Mouse position in world space on the water plane
        uniform float mouseSize;
        uniform float viscosity;
        uniform float deep;

        uniform vec2 objectPos; // Position of the interacting object (e.g., core)
        uniform float objectSize;
        uniform float objectDeep;

        uniform vec2 sun1Pos;
        uniform float sun1Size;
        uniform float sun1Deep;

        uniform vec2 sun2Pos;
        uniform float sun2Size;
        uniform float sun2Deep;

        void main() {
            vec2 cellSize = 1.0 / resolution.xy;
            vec2 uv = gl_FragCoord.xy * cellSize;

            // heightmapValue.x == height from previous frame
            // heightmapValue.y == height from penultimate frame
            vec4 heightmapValue = texture2D(heightmap, uv);

            // Get neighbours
            vec4 north = texture2D(heightmap, uv + vec2(0.0, cellSize.y));
            vec4 south = texture2D(heightmap, uv + vec2(0.0, -cellSize.y));
            vec4 east = texture2D(heightmap, uv + vec2(cellSize.x, 0.0));
            vec4 west = texture2D(heightmap, uv + vec2(-cellSize.x, 0.0));

            float newHeight = ((north.x + south.x + east.x + west.x) * 0.5 - heightmapValue.y) * viscosity;

            // Mouse influence
            // Map UV (0-1) to world space (-BOUNDS/2 to BOUNDS/2 for interaction calculation)
            vec2 worldUV = (uv - vec2(0.5)) * BOUNDS;
            // mousePos is already in world space relative to water plane center
            float mousePhase = clamp(length(worldUV - vec2(mousePos.x, -mousePos.y)) * PI / mouseSize, 0.0, PI);
            newHeight -= (cos(mousePhase) + 1.0) * deep;

            // Object influence (e.g., abstract core)
            float objectPhase = clamp(length(worldUV - vec2(objectPos.x, -objectPos.y)) * PI / objectSize, 0.0, PI);
            newHeight -= (cos(objectPhase) + 1.0) * objectDeep;

            // Sun 1 influence
            float sun1Phase = clamp(length(worldUV - vec2(sun1Pos.x, -sun1Pos.y)) * PI / sun1Size, 0.0, PI);
            newHeight -= (cos(sun1Phase) + 1.0) * sun1Deep;

            // Sun 2 influence
            float sun2Phase = clamp(length(worldUV - vec2(sun2Pos.x, -sun2Pos.y)) * PI / sun2Size, 0.0, PI);
            newHeight -= (cos(sun2Phase) + 1.0) * sun2Deep;

            heightmapValue.y = heightmapValue.x;
            heightmapValue.x = newHeight;

            gl_FragColor = heightmapValue;
        }
    `,
    water_vertex_common: /* glsl */`
        #include <common>
        uniform sampler2D heightmap;
    `,
    water_vertex_beginnormal: /* glsl */`
        // Calculate normals from heightmap
        vec2 cellSize = vec2(1.0 / WIDTH, 1.0 / WIDTH); // Relates to texture resolution
        float texelSize = BOUNDS / WIDTH; // Size of one texel in world units

        vec3 objectNormal = vec3(
            (texture2D(heightmap, uv + vec2(-cellSize.x, 0.0)).x - texture2D(heightmap, uv + vec2(cellSize.x, 0.0)).x) / (2.0 * texelSize),
            (texture2D(heightmap, uv + vec2(0.0, -cellSize.y)).x - texture2D(heightmap, uv + vec2(0.0, cellSize.y)).x) / (2.0 * texelSize),
            1.0
        );
        objectNormal = normalize(objectNormal);

        #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
        #endif
    `,
    water_vertex_begin: /* glsl */`
        // Displace vertices based on heightmap
        float heightValue = texture2D(heightmap, uv).x;
        vec3 transformed = vec3(position.x, position.y, heightValue); // Assuming plane is X,Y and height is Z before rotation

        #ifdef USE_ALPHAHASH
            vPosition = vec3(position.xy, heightValue); // Use transformed Z for alpha hash if needed
        #endif
    `,
};

class WaterMaterial extends THREE.MeshStandardMaterial {
    constructor(parameters) {
        super();
        this.defines = {
            'STANDARD': '',
            'USE_UV': '', // Ensure UVs are available
            'WIDTH': WIDTH.toFixed(1),
            'BOUNDS': BOUNDS.toFixed(1),
        };
        this.uniforms = {
            heightmap: { value: null },
        };
        this.onBeforeCompile = (shader) => {
            // Share common uniforms
            shader.uniforms.heightmap = this.uniforms.heightmap;

            // Modify vertex shader
            shader.vertexShader = shader.vertexShader.replace('#include <common>', shaderSnippets.water_vertex_common);
            shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', shaderSnippets.water_vertex_beginnormal);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', shaderSnippets.water_vertex_begin);
            this.userData.shader = shader; // Save for potential future uniform updates
        };
        this.setValues(parameters);
    }
    // Getter/Setter for heightmap uniform
    get heightmap() { return this.uniforms.heightmap.value; }
    set heightmap(v) { this.uniforms.heightmap.value = v; }
}

function fillInitialTexture(texture) {
    const simplex = new SimplexNoise();
    const waterMaxHeight = 0.1; // Initial small ripples
    const pixels = texture.image.data;
    let p = 0;
    for (let j = 0; j < WIDTH; j++) {
        for (let i = 0; i < WIDTH; i++) {
            const x = i * 128 / WIDTH; // Scale for noise input
            const y = j * 128 / WIDTH;
            let r = 0;
            // Simple initial noise, less complex than example's multi-octave
            r = simplex.noise(x * 0.1, y * 0.1) * waterMaxHeight;
            pixels[p + 0] = r;       // Height
            pixels[p + 1] = r;       // Previous height (same initially)
            pixels[p + 2] = 0;       // Not used (velocity x in some examples)
            pixels[p + 3] = 1;       // Not used (velocity y in some examples, or just alpha)
            p += 4;
        }
    }
}

export function createWater(renderer, scene, camera) {
    // Geometry: A large plane for the water surface
    const waterGeometry = new THREE.PlaneGeometry(BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1);

    // Material
    const waterMaterial = new WaterMaterial({
        color: 0x6080A0, // A slightly deeper blue
        metalness: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide, // Render both sides
        envMapIntensity: 0.5,
    });

    waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2; // Make it horizontal
    waterMesh.position.y = 3000; // Position at the desired scene level
    waterMesh.receiveShadow = true;
    waterMesh.castShadow = true; // Ripples might cast subtle shadows
    scene.add(waterMesh);

    // For mouse raycasting against the water plane
    const meshRayGeometry = new THREE.PlaneGeometry(BOUNDS, BOUNDS, 1, 1);
    meshRay = new THREE.Mesh(meshRayGeometry, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
    meshRay.rotation.x = -Math.PI / 2;
    meshRay.position.y = 3000;
    scene.add(meshRay); // Add to scene for raycaster to intersect

    // GPU Computation Renderer setup
    gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);
    if (gpuCompute.isSupported === false) {
        console.error('GPUComputationRenderer not supported.');
        // Fallback or error message
        // For now, the water will just be a flat plane if not supported.
        return { waterMesh, gpuCompute: null, heightmapVariable: null, effectController }; 
    }

    const initialHeightmap = gpuCompute.createTexture();
    fillInitialTexture(initialHeightmap);

    heightmapVariable = gpuCompute.addVariable('heightmap', shaderSnippets.heightmap_fragment, initialHeightmap);
    gpuCompute.setVariableDependencies(heightmapVariable, [heightmapVariable]);

    heightmapVariable.material.uniforms['mousePos'] = { value: new THREE.Vector2(10000, 10000) }; // Far away initially
    heightmapVariable.material.uniforms['mouseSize'] = { value: effectController.mouseSize };
    heightmapVariable.material.uniforms['viscosity'] = { value: effectController.viscosity };
    heightmapVariable.material.uniforms['deep'] = { value: effectController.mouseDeep };

    // Uniforms for object interaction (e.g., abstract core)
    heightmapVariable.material.uniforms['objectPos'] = { value: new THREE.Vector2(10000, 10000) }; // Far away initially
    heightmapVariable.material.uniforms['objectSize'] = { value: 50.0 }; // Example size for core
    heightmapVariable.material.uniforms['objectDeep'] = { value: 5.0 };  // Example depth for core

    // Uniforms for Sun 1 interaction
    heightmapVariable.material.uniforms['sun1Pos'] = { value: new THREE.Vector2(10000, 10000) };
    heightmapVariable.material.uniforms['sun1Size'] = { value: 30.0 }; // Example size for suns
    heightmapVariable.material.uniforms['sun1Deep'] = { value: 3.0 };  // Example depth for suns

    // Uniforms for Sun 2 interaction
    heightmapVariable.material.uniforms['sun2Pos'] = { value: new THREE.Vector2(10000, 10000) };
    heightmapVariable.material.uniforms['sun2Size'] = { value: 30.0 };
    heightmapVariable.material.uniforms['sun2Deep'] = { value: 3.0 };

    heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);

    const error = gpuCompute.init();
    if (error !== null) {
        console.error('GPUComputationRenderer error: ', error);
    }

    // Mouse interaction listeners
    const raycaster = new THREE.Raycaster();
    function onPointerMove(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseCoords.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        if (mousedown) {
             // Optional: update raycast continuously while mouse is down and moving
            raycaster.setFromCamera(mouseCoords, camera);
            const intersects = raycaster.intersectObject(meshRay, false); // Don't intersect children
            if (intersects.length > 0) {
                const point = intersects[0].point;
                // Convert world point to plane's local coords for uniform
                const localPoint = waterMesh.worldToLocal(point.clone()); 
                heightmapVariable.material.uniforms['mousePos'].value.set(localPoint.x, localPoint.y); // Plane is XY locally
            }
        }
    }
    function onPointerDown(event) {
        mousedown = true;
        // Perform initial raycast on pointer down
        raycaster.setFromCamera(mouseCoords, camera);
        const intersects = raycaster.intersectObject(meshRay, false);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const localPoint = waterMesh.worldToLocal(point.clone());
            heightmapVariable.material.uniforms['mousePos'].value.set(localPoint.x, localPoint.y);
        }
    }
    function onPointerUp() {
        mousedown = false;
        heightmapVariable.material.uniforms['mousePos'].value.set(10000, 10000); // Move mouse influence away
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    
    // Return all necessary components for the update loop and potential external control
    return { waterMesh, waterMaterial, gpuCompute, heightmapVariable, effectController, meshRay, raycaster };
}

export function updateWater(waterData, camera) {
    if (!waterData || !waterData.gpuCompute || !waterData.heightmapVariable) {
        return; // GPGPU not supported or not initialized
    }

    // Update uniforms that might change per frame (e.g., from effectController)
    waterData.heightmapVariable.material.uniforms['mouseSize'].value = effectController.mouseSize;
    waterData.heightmapVariable.material.uniforms['viscosity'].value = effectController.viscosity;
    waterData.heightmapVariable.material.uniforms['deep'].value = effectController.mouseDeep;

    // Object interaction uniforms will be updated from main.js directly on waterData.heightmapVariable.material.uniforms

    // Perform GPU computation only at specified speed
    simFrame++;
    if (simFrame >= 7 - Math.max(1, Math.min(6, effectController.speed))) { // Speed 1-6
        waterData.gpuCompute.compute();
        // Get compute output in custom uniform for water material
        waterData.waterMaterial.heightmap = waterData.gpuCompute.getCurrentRenderTarget(waterData.heightmapVariable).texture;
        simFrame = 0;
    }
}