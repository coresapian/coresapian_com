# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**coresapian.com** is a fully static interactive web experience deployed on Netlify. It combines interactive puzzles, narrative content, and god-ray 3D effects — all with a matrix/cyberpunk hacker aesthetic. There is no backend server; everything runs client-side.

## Development Commands

All pages are static HTML/CSS/JS with no build step — they are served as-is from `public/`.

**No testing framework** is configured. There are no unit or integration tests.

## Architecture

### Deployment & Directory Layout

- **Netlify** serves `public/` as the deploy root (configured in `netlify.toml`).
- Root redirect: `/ → /rune_puzzle/` (status 200).

### User Flow

1. **`/rune_puzzle/`** — Drag-and-drop Elder Futhark rune puzzle. On completion (all 4 glyphs placed), redirects after 3s (`puzzle.js:121`).
2. **`/core_truths_book/`** — Scrollable book carousel with 6 core truths about AI. Includes a terminal/oracle chat powered by a local ONNX worker. End of main flow.

### Dead Code Files

These files exist but are **not loaded by any HTML page** — they are legacy:
- `public/rune_puzzle/script.js` — the active puzzle logic is in `puzzle.js` (which dynamically imports `godrays.js`)

## Design & Styling Conventions

- **Theme:** Matrix/cyberpunk terminal aesthetic throughout
- **Primary colors:** Matrix green (`#00ff41`), cyan (`#00d4ff`), void black (`#030308`)
- **Visual effects:** Glow text-shadows, scanline overlays, torch radial gradients, god rays, bloom
- **CSS approach:** CSS custom properties for theming; hand-written CSS with keyframe animations
- **Fonts:** Doto (variable, ROND axis), Noto Sans Runic (for Nordic rune glyphs)
- **Responsive:** Media queries for mobile breakpoints (`<748px`, `<560px`)

## Code Conventions

- **ES modules** everywhere — use `import`/`export`, not `require`.
- **No TypeScript** — all source is plain JavaScript.
- **Web Workers** for heavy computation (AI inference runs off main thread).
- **CDN imports** for Three.js (import maps) and GSAP (`<script>` tags) in static pages — not bundled.

## Things to Watch Out For

- **No backend:** There are no API routes, databases, or server processes. Do not introduce server dependencies.
- **Konami code easter egg:** `Up Up Down Down Left Right Left Right B A` triggers a rainbow/shake animation in the core truths book.
