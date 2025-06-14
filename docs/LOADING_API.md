# Loading System API Documentation

## ThreeJSScene Loading Methods

### `loadModel(modelPath)`
- Loads a single model with automatic fallback
- Parameters:
  - `modelPath`: Path to .glb file (e.g. 'models/asset.glb')
- Returns: Promise resolving to THREE.Group

### `loadModelWithLOD(modelPath, lodDistances)`
- Loads model with LOD support
- Parameters:
  - `modelPath`: Base model path
  - `lodDistances`: [near, far] switch distances (default [50, 100])
- Returns: Promise resolving to THREE.LOD

## Loading UI Events

### Events emitted:
- `threeJS:loadingStart`: Loading begins
- `threeJS:loadingProgress`: Progress updates
- `threeJS:loadingComplete`: All assets loaded
- `threeJS:loadingError`: Error loading asset

## Customization

### To modify:
1. Loading styles: `public/css/loading.css`
2. Loading behavior: `public/js/loading.js`
3. LOD distances: `ThreeJSScene.loadModelWithLOD()`
