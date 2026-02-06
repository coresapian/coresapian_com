# CLAUDE.md

## Project Overview

**coresapian.com** is a fully static interactive web experience deployed on Netlify. It combines 3D graphics, interactive puzzles, narrative content, and an in-browser AI reasoning model (DeepSeek-R1) — all with a matrix/cyberpunk hacker aesthetic. There is no backend server; everything runs client-side.

## Repository Structure

```
coresapian_com/
├── CLAUDE.md              # This file
├── README.md              # Project philosophy and core truths
├── netlify.toml           # Netlify deployment config (publishes public/)
├── .gitignore             # Ignores: huggingface-transformers.txt
├── assets/
│   └── core.PNG           # Architecture diagram
└── public/                # Deployed root directory
    ├── loader.html         # Entry point — Three.js loading animation
    ├── loading_screen_hourglass_animation_model.glb  # 3D hourglass model
    ├── favicon.ico
    ├── js/
    │   └── loader.js       # UNUSED — legacy Three.js scene (not imported by loader.html)
    ├── fonts/              # Custom fonts (Doto, Noto Sans Runic)
    ├── rune_puzzle/         # Interactive drag-and-drop rune puzzle
    │   ├── index.html
    │   ├── puzzle.js        # Puzzle mechanics (drag-drop, SVG animations)
    │   ├── godrays.js       # God rays visual effects (dynamically imported by puzzle.js)
    │   └── script.js        # UNUSED — legacy god rays/torch/matrix code (not loaded by index.html)
    ├── core_truths_book/    # Scrollable book carousel with terminal
    │   ├── index.html
    │   ├── script.js        # GSAP animations, Konami code easter egg
    │   ├── style.css        # Matrix-themed styling, torch effect
    │   ├── terminal.js      # Oracle chat interface
    │   └── workers/
    └── deepseek-r1-webgpu/  # React app — in-browser AI chatbot
        ├── package.json
        ├── vite.config.js
        ├── eslint.config.js
        ├── index.html
        ├── dist/            # Built production output
        └── src/
            ├── main.jsx     # React entry point
            ├── App.jsx      # Main component (worker management, state)
            ├── index.css    # Global styles (Tailwind imports)
            ├── worker.js    # Web Worker for model inference
            └── components/
                ├── Chat.jsx      # Message display (markdown, MathJax)
                ├── Chat.css
                ├── Progress.jsx  # Loading progress bar
                └── icons/        # SVG icon components
```

## User Flow

**Main navigation path (3 steps, each auto-redirects to the next):**

1. **`/` (root)** → Netlify redirects to `/loader.html` (configured in `netlify.toml`)
2. **`/loader.html`** — 9-second Three.js loading animation with 3D hourglass. Auto-redirects via `setTimeout` in inline `<script>` (line 112).
3. **`/rune_puzzle/`** — Drag-and-drop Elder Futhark rune puzzle on an orrery layout. On completion (all 4 glyphs placed), redirects after 3s (`puzzle.js:126`).
4. **`/core_truths_book/`** — Scrollable book carousel presenting 6 core truths about AI. Includes an integrated terminal/oracle chat powered by a local ONNX worker. **This is the end of the main flow — there is no automatic redirect from here.**

**Standalone page (not linked from main flow):**

- **`/deepseek-r1-webgpu/dist/`** — React app running DeepSeek-R1 LLM entirely in-browser via WebGPU. Must be navigated to directly.

## Technology Stack

| Area | Technology |
|------|-----------|
| Static pages | Vanilla HTML/CSS/JS |
| 3D graphics | Three.js 0.138.0 (via CDN import-map) |
| Animations | GSAP 3.13.0 + SplitText plugin |
| AI chatbot app | React 18.3, Vite 6, Tailwind CSS 4 beta |
| AI inference | @huggingface/transformers 3.5.0 (ONNX Runtime / WebGPU) |
| Markdown rendering | marked 15.0.5 + DOMPurify 3.2.3 |
| Math rendering | better-react-mathjax 2.0.3 |
| Linting | ESLint 9 (React, hooks, refresh plugins) |
| Deployment | Netlify (static hosting) |
| Package manager | npm |
| Module system | ES modules (`"type": "module"`) |

## Development Commands

All commands below run from `public/deepseek-r1-webgpu/`:

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

The static pages (loader, rune_puzzle, core_truths_book) have no build step — they are served as-is from `public/`.

## Deployment

- **Platform:** Netlify
- **Publish directory:** `public/` (configured in `netlify.toml`)
- **Root redirect:** `/ → /loader.html` (status 200)
- The deepseek-r1-webgpu React app must be pre-built (`npm run build`) so that `dist/` is committed and deployed as static files.

## Design & Styling Conventions

- **Theme:** Matrix/cyberpunk terminal aesthetic throughout
- **Primary colors:** Matrix green (`#00ff41`), cyan (`#00d4ff`), void black (`#030308`)
- **Visual effects:** Glow text-shadows, scanline overlays, torch radial gradients, god rays, bloom
- **CSS approach:** CSS custom properties for theming; Tailwind utilities in the React app; hand-written CSS with keyframe animations elsewhere
- **Fonts:** Doto (variable, ROND axis), Noto Sans Runic (for Nordic rune glyphs)
- **Responsive:** Media queries for mobile breakpoints (`<748px`, `<560px`)

## Code Conventions

- **No testing framework** is configured. There are no unit or integration tests.
- **ES modules** everywhere — use `import`/`export`, not `require`.
- **Web Workers** for heavy computation (AI inference runs off main thread).
- **React components** use PascalCase filenames and functional components with hooks.
- **CSS class names** follow BEM-like conventions in static pages (e.g., `constellation-socket`, `torch-overlay`).
- **CDN imports** for Three.js and GSAP in static pages (via `<script>` tags and import maps).
- **No TypeScript** — all source is plain JavaScript/JSX (type declarations exist only as dev dependencies for editor support).

## Key Architecture Notes

- This is a **purely static site** with zero server-side logic. All AI inference happens client-side via WebGPU and Web Workers.
- The `public/` directory is the deploy root. Everything inside it is served directly.
- The deepseek-r1-webgpu app is a separate Vite project nested inside `public/`. Its `dist/` folder contains the production build that gets deployed.
- Three.js is loaded via CDN import maps in `loader.html`, not bundled.
- GSAP is loaded via CDN `<script>` tags in `core_truths_book/`.

## Things to Watch Out For

- **WebGPU requirement:** The deepseek AI chatbot requires WebGPU browser support. A fallback message is shown if unavailable.
- **WebGL2 requirement:** The loader animation checks for WebGL2 and shows an error if missing.
- **3D model URL:** The hourglass GLB model is loaded from a GitHub raw URL in the inline script within `loader.html`.
- **Pre-built dist:** The `deepseek-r1-webgpu/dist/` directory is committed to git. After making changes to the React app source, run `npm run build` and commit the updated `dist/`.
- **No backend:** There are no API routes, databases, or server processes. Do not introduce server dependencies.
- **Konami code easter egg:** The sequence `Up Up Down Down Left Right Left Right B A` triggers a rainbow/shake animation in the core truths book.
- **Dead code files:** `js/loader.js` and `rune_puzzle/script.js` are not loaded by any HTML page and appear to be legacy files. The active loader logic is inline in `loader.html`; the active puzzle logic is in `rune_puzzle/puzzle.js` (which dynamically imports `godrays.js`).
