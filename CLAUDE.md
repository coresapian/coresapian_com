# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**coresapian.com** is a dual-platform interactive experience: a static web app deployed on Netlify and a Godot 4.6 + iOS native app. Both versions present the same flow — a drag-and-drop Elder Futhark rune puzzle followed by a scrollable "core truths" book — with a matrix/cyberpunk hacker aesthetic. There is no backend server; everything runs client-side.

## Development Commands

### Web (static, no build step)

```bash
# Local dev server with redirect support
npx netlify-cli dev

# Or simple static serve (no redirects)
npx serve public
```

No testing framework is configured.

### Godot

```bash
# Open project in Godot editor (adjust path to your Godot binary)
/Users/core/Downloads/Godot.app/Contents/MacOS/Godot --path godot --editor

# Headless validation (checks for parse errors)
/Users/core/Downloads/Godot.app/Contents/MacOS/Godot --headless --path godot --quit

# Export PCK for iOS
cd godot && ./export_to_ios.sh
```

The Godot binary path can be overridden via `GODOT_BIN` env var. The export script checks PATH, `/Applications`, and `~/Downloads`.

## Architecture

### Dual-Platform Layout

```
public/           # Web version — Netlify deploy root
  rune_puzzle/    # Puzzle (Three.js, GSAP, ES modules)
  core_truths_book/ # Book carousel + oracle terminal (ONNX worker)
godot/            # Godot 4.6 project (Mobile renderer, portrait 1170x2532)
  scenes/         # .tscn + .gd files (main, rune_puzzle, core_truths)
  shaders/        # matrix_rain, godrays, glow (.gdshader)
ios/              # SwiftUI + SwiftGodotKit integration (no .xcodeproj — see ios/README.md)
  CoreSapian/     # 3 Swift files: App entry, ContentView, GodotSwiftMessenger
```

### Web: Netlify serves `public/`

- Root redirect: `/ → /rune_puzzle/` (status 301 in `netlify.toml`)
- **`/rune_puzzle/`** — Drag-and-drop puzzle. On win (4 correct glyphs), redirects to `/core_truths_book/` after 3s. Active logic is in `puzzle.js` (which dynamically imports `godrays.js`). `script.js` is dead code.
- **`/core_truths_book/`** — Book carousel with 6 core truths. Includes oracle chat powered by ONNX Web Worker (`workers/worker-Jy3fF0zp.js`).

### Godot: 3D reimplementation

- **`scenes/main.tscn`** — Entry point. Instances RunePuzzle, has FadeCanvasLayer for transitions. `main.gd` listens for `puzzle_completed` signal, fades out, swaps to CoreTruths scene.
- **`scenes/rune_puzzle/`** — 3D puzzle: 23 RigidBody3D glyphs, 4 socket Node3Ds with Area3D detection, raycast-based drag on Plane(UP, 0). Target word: `ᚲᛟᚱᛖ`. Matrix rain shader overlay via CanvasLayer.
- **`scenes/core_truths/`** — 7 Label3D pages laid out along X-axis (8 units apart). Camera pans with cubic easing. Swipe detection + button navigation.
- Scene transitions are signal-based: puzzle emits `puzzle_completed`, main.gd handles fade → scene swap → fade-in.

### iOS: SwiftUI wrapper

- **`GodotSwiftMessenger.swift`** — Singleton bridge registered with Godot engine. `SimpleSignal` for `puzzleCompleted`, `SignalWithArguments<String>` for `sceneTransition`.
- **`ContentView.swift`** — Full-screen `GodotAppView` loading `main.pck`.
- No `.xcodeproj` included — see `ios/README.md` for manual Xcode project setup (SwiftGodotKit package, `-lswiftGodot` linker flag, iOS 16.0+).

## Design Conventions

- **Colors:** Matrix green (`#00ff41` / `Color(0.0, 1.0, 0.255)`), cyan (`#00d4ff` / `Color(0.0, 0.831, 1.0)`), void black (`#030308`)
- **Visual effects:** Glow/bloom, scanline overlays, god rays, matrix rain shader, torch radial gradients
- **Fonts:** Doto (variable, ROND axis), Noto Sans Runic (Elder Futhark glyphs)
- **Web CSS:** Custom properties for theming, keyframe animations, media queries at `<748px` and `<560px`

## Code Conventions

- **Web:** ES modules (`import`/`export`), plain JavaScript (no TypeScript), CDN imports for Three.js (import maps) and GSAP (`<script>` tags)
- **Godot:** GDScript, tabs for indentation, metadata via `set_meta()`/`get_meta()` on nodes, tweens for animation
- **No backend.** Do not introduce server dependencies, databases, or API routes.

## Things to Watch Out For

- **Netlify redirect:** Must be status 301 (not 200). Status 200 is a rewrite that keeps the browser URL at `/`, breaking relative paths in `rune_puzzle/`.
- **Godot Mobile renderer:** Limited dynamic light support (8-16 before framerate drops on iOS). Per-glyph lights were intentionally removed — rely on emissive materials + bloom.
- **Godot .tscn `load_steps`:** Must equal total sub_resources + ext_resources + 1. Godot warns/errors on mismatch.
- **Scene transitions:** Handled by `main.gd` via signals, not by calling `change_scene_to_file()` from child scenes (which would destroy the fade overlay).
- **Konami code easter egg:** `Up Up Down Down Left Right Left Right B A` triggers rainbow/shake in core truths. Keyboard-only (intentionally unavailable on iOS touch).
- **Dead code:** `public/rune_puzzle/script.js` is not loaded by any HTML page. The active puzzle logic is `puzzle.js`.
- **`public/resources/`** contains 11 `.glb` 3D models not referenced by current code.
