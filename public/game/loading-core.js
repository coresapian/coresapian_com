import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function disposeMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];

  for (const entry of materials) {
    if (!entry) {
      continue;
    }

    for (const value of Object.values(entry)) {
      if (value && typeof value === "object" && typeof value.dispose === "function") {
        value.dispose();
      }
    }

    entry.dispose?.();
  }
}

function disposeSceneObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();

    if (child.material) {
      disposeMaterial(child.material);
    }
  });
}

export function createLoadingCoreScene({ container, assetUrl }) {
  if (!container) {
    return {
      async start() {},
      destroy() {},
    };
  }

  const loader = new GLTFLoader();
  const clock = new THREE.Clock();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  let frameHandle = 0;
  let started = false;
  let destroyed = false;
  let mixer = null;
  let modelRoot = null;
  let resizeObserver = null;
  let removeResizeListener = null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  camera.position.set(0, 0.25, 6);
  scene.add(camera);

  const ambientLight = new THREE.AmbientLight(0x9efbe4, 1.25);
  const fillLight = new THREE.DirectionalLight(0x5fcfff, 2.4);
  const rimLight = new THREE.DirectionalLight(0xbaf6ff, 1.7);
  const coreLight = new THREE.PointLight(0x72ffe1, 10, 18, 2);

  fillLight.position.set(2.2, 2.4, 4.2);
  rimLight.position.set(-2.8, 1.5, -2.4);
  coreLight.position.set(0, 0, 1.4);

  scene.add(ambientLight, fillLight, rimLight, coreLight);

  const onResize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const frame = () => {
    if (destroyed) {
      return;
    }

    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    mixer?.update(delta);

    if (modelRoot) {
      modelRoot.rotation.y += delta * 0.18;
      modelRoot.rotation.x = Math.sin(elapsed * 0.6) * 0.08;
      modelRoot.position.y = Math.sin(elapsed * 0.8) * 0.08;
    }

    coreLight.intensity = 8 + Math.sin(elapsed * 1.7) * 1.8;
    renderer.render(scene, camera);
    frameHandle = window.requestAnimationFrame(frame);
  };

  const fitCameraToObject = (object) => {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));

    camera.position.set(center.x, center.y + size.y * 0.08, center.z + distance * 1.75);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  };

  const loadModel = async () => {
    const gltf = await loader.loadAsync(assetUrl);

    if (destroyed) {
      disposeSceneObject(gltf.scene);
      return;
    }

    modelRoot = gltf.scene;
    modelRoot.position.set(0, 0, 0);
    scene.add(modelRoot);
    fitCameraToObject(modelRoot);
    container.dataset.state = "ready";

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(modelRoot);

      for (const clip of gltf.animations) {
        mixer.clipAction(clip).play();
      }
    }
  };

  return {
    async start() {
      if (started || destroyed) {
        return;
      }

      started = true;
      container.dataset.state = "loading";
      container.appendChild(renderer.domElement);
      onResize();

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(container);
      } else {
        window.addEventListener("resize", onResize);
        removeResizeListener = () => window.removeEventListener("resize", onResize);
      }

      try {
        await loadModel();
      } catch (error) {
        container.dataset.state = "error";
        console.warn("Loader model failed to initialize:", error);
      }

      frame();
    },

    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      window.cancelAnimationFrame(frameHandle);
      resizeObserver?.disconnect();
      removeResizeListener?.();
      mixer?.stopAllAction();

      if (modelRoot) {
        disposeSceneObject(modelRoot);
        scene.remove(modelRoot);
      }

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
