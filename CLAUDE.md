# CLAUDE.md - AI Assistant Guide for coRE Sapian

## Project Overview

**coRE Sapian** is an interactive web experience that presents philosophical truths about AI and human collaboration through an immersive, gamified journey. The project combines mythological Norse aesthetics with modern AI concepts, featuring:

1. **Loading Screen** - A 3D hourglass animation with orbital orbs
2. **Rune Puzzle** - A drag-and-drop constellation puzzle using Elder Futhark runes
3. **Core Truths Book** - An animated flip-book presenting six philosophical "truths"
4. **Oracle Terminal** - An AI chatbot styled as an ancient Nordic stone tablet
5. **DeepSeek Chatbot** - A separate WebGPU-powered reasoning AI interface

The central philosophy ("coRE Truths") explores themes of AI-augmented human agency, cognitive leverage, and the evolving relationship between humans and AI systems.

## Codebase Structure

```
coresapian/
├── public/                          # Static web assets (Netlify publish dir)
│   ├── loader.html                  # Entry point - 3D hourglass loading screen
│   ├── favicon.ico
│   ├── loading_screen_hourglass_animation_model.glb  # 3D model
│   │
│   ├── js/
│   │   └── loader.js                # Alternative loader with god-rays effect
│   │
│   ├── rune_puzzle/                 # Phase 2: Interactive rune constellation puzzle
│   │   ├── index.html               # Puzzle page
│   │   ├── puzzle.js                # Drag-drop mechanics, glyph generation
│   │   ├── godrays.js               # Three.js god-rays visual effect
│   │   └── style.css                # Puzzle styling with cosmic-nordic palette
│   │
│   ├── core_truths_book/            # Phase 3: Animated philosophy book
│   │   ├── index.html               # Book interface with torch effect
│   │   ├── script.js                # GSAP animations, Konami code easter egg
│   │   ├── terminal.js              # Web Worker-based AI Oracle chatbot
│   │   ├── style.css                # Book carousel, stone tablet terminal
│   │   └── workers/
│   │       └── worker-*.js          # AI model web worker
│   │
│   ├── deepseek-r1-webgpu/          # Standalone React app: WebGPU AI chatbot
│   │   ├── src/
│   │   │   ├── App.jsx              # Main React component
│   │   │   ├── worker.js            # Transformers.js text generation worker
│   │   │   └── components/          # Chat UI components
│   │   ├── package.json             # Vite + React + Transformers.js
│   │   └── dist/                    # Built production files
│   │
│   └── fonts/                       # Custom typography
│       ├── Doto/                    # Variable font for modern UI text
│       └── Noto_Sans_Runic/         # Elder Futhark rune characters
│
├── assets/
│   └── core.PNG                     # Architecture diagram for README
│
├── README.md                        # Project philosophy and coRE Truths
├── netlify.toml                     # Deployment config (root -> loader.html)
├── .gitignore
└── CLAUDE.md                        # This file
```

## Technology Stack

### Core Technologies
- **Three.js v0.138.0** - 3D graphics, model loading (GLTFLoader), post-processing effects
- **GSAP v3.13.0** - Animations, SplitText plugin, torch flicker effects
- **Tailwind CSS** - Utility-first styling (via CDN)
- **CSS Custom Properties** - Unified cosmic-nordic color palette

### AI/ML Integration
- **Transformers.js v3.5.0** - Browser-based ML inference (@huggingface/transformers)
- **WebGPU** - GPU-accelerated model inference
- **ONNX Runtime Web** - Model execution backend
- **DeepSeek-R1-Distill-Qwen-1.5B** - Reasoning LLM for the chatbot

### Build Tools (deepseek-r1-webgpu only)
- **Vite v6** - Fast dev server and bundler
- **React v18.3** - UI framework
- **ESLint v9** - Code linting

## User Flow

```
loader.html (9s) → rune_puzzle/ (puzzle complete) → core_truths_book/
                                                            │
                                                            └── Oracle Terminal (expandable)
```

1. User lands on `loader.html` - sees 3D animated hourglass
2. After 9 seconds, redirects to `rune_puzzle/`
3. User drags correct rune glyphs (ᚲᛟᚱᛖ = "CORE") to constellation sockets
4. Upon completion, redirects to `core_truths_book/`
5. User scrolls through the animated book of 6 philosophical truths
6. Optionally expands the stone tablet terminal to interact with the AI Oracle

## Key Components

### 1. Loading Screen (`loader.html`, `js/loader.js`)

The entry point features a 3D animated hourglass model with WebGL2 post-processing:

- **Model**: `loading_screen_hourglass_animation_model.glb`
- **Effects**: Unreal Bloom pass, god-rays shader
- **Fallback**: Displays error message if WebGL2 unavailable
- **Auto-redirect**: After 7-9 seconds to rune puzzle

### 2. Rune Puzzle (`rune_puzzle/`)

An interactive drag-and-drop puzzle where users arrange Elder Futhark runes:

- **Target Word**: ᚲᛟᚱᛖ (CORE in runes)
- **Mechanics**: Touch/mouse drag, collision detection, socket snapping
- **Visual Effects**: Torch overlay, matrix rain canvas, god-rays (optional)
- **Decoys**: Extra rune glyphs that cannot be placed

### 3. Core Truths Book (`core_truths_book/`)

A CSS-powered flip-book carousel with GSAP animations:

- **Carousel**: CSS scroll-snap with custom scroll buttons
- **Animations**: Character-by-character text reveal, SplitText effects
- **Easter Egg**: Konami code (↑↑↓↓←→←→BA) triggers visual effects
- **Torch Effect**: Mouse-following light overlay with flicker

### 4. Oracle Terminal (`core_truths_book/terminal.js`)

An AI chatbot styled as an ancient Nordic stone tablet:

- **Web Worker**: Runs Transformers.js model in background thread
- **Theming**: Ancient terminology mapping (AI → Oracle, loading → awakening)
- **Progress UI**: Runic symbols and progress circle during model loading
- **Streaming**: Real-time text generation display

### 5. DeepSeek WebGPU App (`deepseek-r1-webgpu/`)

A standalone React application for AI reasoning:

- **Model**: DeepSeek-R1-Distill-Qwen-1.5B (1.5B parameter LLM)
- **Inference**: WebGPU with quantized weights (q4f16)
- **Features**: Thinking/answering state detection, interrupt support, token metrics

## Development Workflows

### Local Development

```bash
# Serve the static site (from project root)
npx serve public

# Or use any static file server
python -m http.server 8000 --directory public

# For the DeepSeek React app
cd public/deepseek-r1-webgpu
npm install
npm run dev
```

### Building DeepSeek App

```bash
cd public/deepseek-r1-webgpu
npm run build    # Output to dist/
npm run preview  # Preview production build
npm run lint     # ESLint check
```

### Deployment

The project deploys to **Netlify** with configuration in `netlify.toml`:

- **Publish directory**: `public/`
- **Root redirect**: `/` → `/loader.html`

## Coding Conventions

### CSS Variables (Color Palette)

All pages share a unified cosmic-nordic palette defined in `:root`:

```css
--void-black: #0a0a1f;      /* Deep space background */
--stellar-dark: #1a1a3a;    /* Secondary background */
--nordic-slate: #2E3440;    /* Nord theme base */
--cosmic-orange: #ff4800;   /* Primary accent */
--stellar-gold: #ffc700;    /* Secondary accent */
--frost-blue: #88C0D0;      /* Nord frost */
--frost-white: #ECEFF4;     /* Text/highlight */
```

### JavaScript Patterns

1. **Error Handling**: Guard clauses at file start for required globals (THREE, GSAP)
2. **Web Workers**: Used for AI inference to avoid blocking UI
3. **Module Imports**: ES modules with import maps for Three.js CDN

### Visual Effects

1. **Torch Overlay**: Fixed div with radial gradient, animated via CSS variables
2. **Matrix Rain**: Canvas-based character rain with runic/alchemical symbols
3. **God-rays**: Three.js post-processing shader effect

### Rune Glyphs

The project uses Elder Futhark runes extensively:
- ᚲ (K), ᛟ (O), ᚱ (R), ᛖ (E) = "CORE"
- Font: Noto Sans Runic (`public/fonts/Noto_Sans_Runic/`)

## Important Notes for AI Assistants

### Browser Requirements
- **WebGL2** required for 3D rendering
- **WebGPU** required for DeepSeek AI chatbot
- Touch device detection disables torch effect and shows native scroll

### File Dependencies
- Three.js loaded via CDN import map (v0.138.0)
- GSAP loaded via CDN (v3.13.0)
- Fonts must be present in `public/fonts/`

### Common Tasks

**Adding a new "Truth" to the book:**
1. Add new `carousel-item` div in `core_truths_book/index.html`
2. Update `--slides: 7;` to new count in `.carousel` element
3. Follow existing Truth HTML structure

**Modifying the rune puzzle target:**
1. Edit `ANCIENT_WORD` constant in `rune_puzzle/puzzle.js`
2. Ensure target glyphs are in `ALL_GLYPHS` array

**Changing auto-redirect timing:**
1. Loading screen: `setTimeout` in `loader.html` (default 9000ms)
2. Puzzle completion: `setTimeout` in `puzzle.js` (default 3000ms)

### Performance Considerations
- 3D models are loaded from GitHub raw URL as fallback
- AI models are ~1.5GB and cached in browser
- Use `preconnect` hints for external font resources

## Git Workflow

- Main development on designated feature branches
- Commits should reference specific files/components changed
- Test locally with static server before pushing
