# coresapian.com Redesign Specification
## From Cyberpunk Terminal to Organic Handmade Workshop

### Decisions
- **Loader**: User-initiated entry (tap/click), not auto-redirect
- **Rune puzzle**: Keep runic characters (they have a hand-carved feel)
- **Three.js 3D**: Keep the hourglass model, re-light warmly
- **Terminal AI**: Floating journal page (not bottom drawer)
- **Starting scope**: Core Truths Book page first

---

## 1. Shared Design System (`organic-theme.css`)

All pages will import a shared design system file. Create this first.

### 1.1 Color Palette

```css
:root {
  /* --- Organic Palette --- */
  --parchment:     #F5F0E8;  /* Primary background */
  --linen:         #EDE6D6;  /* Card/section backgrounds */
  --cream:         #FAF7F0;  /* Elevated surfaces, modals */
  --charcoal:      #3C3226;  /* Primary body text */
  --warm-gray:     #7A6F63;  /* Secondary text, captions */
  --terracotta:    #C4704B;  /* Primary accent - CTAs, active states */
  --sage:          #8B9F82;  /* Secondary accent - success, nature */
  --indigo:        #3D405B;  /* Tertiary accent - links, headings */
  --kraft:         #D4C5A9;  /* Borders, separators */
  --gold:          #D4A853;  /* Interactive glow, hover */
  --rose-dust:     #C9A8A1;  /* Soft highlight, selected states */
  --error-warm:    #B85450;  /* Error states (warm red, not neon) */

  /* --- Semantic Mappings --- */
  --bg-primary:    var(--parchment);
  --bg-secondary:  var(--linen);
  --bg-elevated:   var(--cream);
  --text-primary:  var(--charcoal);
  --text-secondary: var(--warm-gray);
  --accent-primary: var(--terracotta);
  --accent-secondary: var(--sage);
  --border-color:  var(--kraft);
}
```

### 1.2 Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Caveat:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'Lora', Georgia, serif;
  --font-accent:  'Caveat', cursive;
  --font-mono:    'JetBrains Mono', monospace;

  font-family: var(--font-body);
  color: var(--text-primary);
  line-height: 1.6;
  background: var(--bg-primary);
  color-scheme: light;
}

h1, h2, h3, h4 { font-family: var(--font-display); }
```

### 1.3 Paper Grain SVG Filter

Inline SVG filter applied globally via `body::before` or page-level pseudo-element:

```html
<svg style="position:absolute;width:0;height:0">
  <filter id="paper-grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5"
                  stitchTiles="stitch" result="noise"/>
    <feColorMatrix type="saturate" values="0" in="noise" result="gray-noise"/>
    <feBlend in="SourceGraphic" in2="gray-noise" mode="multiply" result="blended"/>
    <feComponentTransfer>
      <feFuncA type="linear" slope="0.08"/>
    </feComponentTransfer>
  </filter>
</svg>
```

Applied as:
```css
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  filter: url(#paper-grain);
  background: var(--bg-primary);
  z-index: -1;
  pointer-events: none;
}
```

### 1.4 Shadows (warm, soft)

```css
:root {
  --shadow-sm:  0 1px 3px rgba(60,50,38,0.08), 0 1px 2px rgba(60,50,38,0.06);
  --shadow-md:  0 4px 12px rgba(60,50,38,0.08), 0 2px 4px rgba(60,50,38,0.05);
  --shadow-lg:  0 8px 24px rgba(60,50,38,0.10), 0 4px 8px rgba(60,50,38,0.06);
  --shadow-lifted: 0 12px 36px rgba(60,50,38,0.12), 0 6px 12px rgba(60,50,38,0.06);
}
```

### 1.5 Letterpress Text Effect

Replace neon glow text-shadows with embossed/letterpress look:
```css
.letterpress {
  color: var(--charcoal);
  text-shadow:
    0 1px 0 rgba(255,255,255,0.6),
    0 -1px 0 rgba(0,0,0,0.1);
}
.letterpress-deep {
  color: var(--indigo);
  text-shadow:
    0 2px 0 rgba(255,255,255,0.5),
    0 -1px 0 rgba(0,0,0,0.15),
    1px 1px 0 rgba(0,0,0,0.05);
}
```

---

## 2. Core Truths Book — Detailed Engineering Spec

**File**: `public/core_truths_book/index.html` + `public/core_truths_book/style.css`

### 2.1 Remove These Elements/Effects

| Element | File | Action |
|---------|------|--------|
| `#torch-overlay` div | `index.html` | Remove from HTML |
| `#matrix-canvas` canvas | `index.html` | Remove from HTML |
| Torch CSS (lines 54-82) | `style.css` | Delete all `#torch-overlay` rules |
| Matrix canvas CSS | `style.css` | Delete `#matrix-canvas` rules |
| Torch JS (lines 191-228) | `index.html` inline `<script>` | Remove entire torch script block |
| Matrix rain JS (lines 231-274) | `index.html` inline `<script>` | Remove entire matrix canvas script |
| `--matrix-*` CSS variables | `style.css` | Replace with organic palette vars |
| `--glow-*` CSS variables | `style.css` | Replace with warm shadow vars |
| Neon `text-shadow` glow effects | `style.css` | Replace with letterpress effect |
| `color-scheme: dark` | `style.css` | Change to `color-scheme: light` |
| Tailwind CDN | `index.html` | Remove (terminal used it; journal won't need it) |

### 2.2 Replace: Root CSS Variables

**Current** (style.css lines 7-52):
```css
:root {
  --void-black: #030308;
  --matrix-green: #00ff41;
  /* ... cyberpunk palette ... */
  font-family: 'Doto', 'Courier New', monospace;
  color-scheme: dark;
  color: var(--matrix-green);
  background: var(--matrix-darker);
}
```

**Replace with**:
```css
:root {
  /* Organic Palette */
  --parchment:     #F5F0E8;
  --linen:         #EDE6D6;
  --cream:         #FAF7F0;
  --charcoal:      #3C3226;
  --warm-gray:     #7A6F63;
  --terracotta:    #C4704B;
  --sage:          #8B9F82;
  --indigo:        #3D405B;
  --kraft:         #D4C5A9;
  --gold:          #D4A853;
  --rose-dust:     #C9A8A1;
  --error-warm:    #B85450;

  font-family: 'Lora', Georgia, serif;
  font-optical-sizing: auto;
  line-height: 1.6;
  font-weight: 400;
  color-scheme: light;
  color: var(--charcoal);
  background: var(--parchment);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;

  /* Keep sprite animation variables unchanged */
  --sprite-image: url(https://assets.codepen.io/36869/book.webp);
  --sprite-as: .8s;
  --sprite-ad: normal;
  --sprite-af: none;
  --sprite-ap: running;
  --sprite-ai: infinite;
  --sprite-at: linear;
  --sprite-fr: 12;
}
```

### 2.3 Replace: Body Background

**Current**: Solid `#030308` (near black) + dot pattern SVG
**Replace with**: Warm parchment + paper grain texture

```css
body {
  margin: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  position: relative;
  background: var(--parchment);
}

/* Paper grain via pseudo-element */
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0.4;
  z-index: -1;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.08'/%3E%3C/svg%3E");
}
```

### 2.4 Replace: Title Styling

**Current**: `Doto` monospace font with matrix-green neon glow
**Replace with**: `Playfair Display` with letterpress effect

```css
.container > h1 {
  font-family: 'Playfair Display', Georgia, serif;
  color: var(--indigo);
  margin: 0;
  width: fit-content;
  font-weight: 700;
  font-size: 2.5rem;
  text-align: center;
  text-shadow:
    0 2px 0 rgba(255,255,255,0.5),
    0 -1px 0 rgba(0,0,0,0.1);
  letter-spacing: 1px;
}
```

### 2.5 Replace: Book Page Styles

**Current**: Pages are `#ECEFF4` background with `var(--nord-bg)` text
**Replace with**: Cream paper with charcoal text

```css
& > .carousel-item {
  /* ... keep snap/scroll behavior ... */
  background-color: var(--cream);
  color: var(--charcoal);
  box-shadow: var(--shadow-md);
}
```

### 2.6 Replace: Truth Number Headings

**Current**: `Doto` monospace, `matrix-cyan`, neon glow text-shadow
**Replace with**: `Caveat` handwritten font, terracotta, letterpress

```css
.truth-number h3 {
  font-family: 'Caveat', cursive;
  font-size: 4rem;
  font-weight: 600;
  color: var(--terracotta);
  margin: 0;
  text-shadow:
    0 2px 0 rgba(255,255,255,0.5),
    0 -1px 0 rgba(0,0,0,0.08);
}
```

### 2.7 Replace: Truth Body Text

**Current**: Small font, uses parent `color: var(--nord-bg)`
**Replace with**: `Lora` serif, warm charcoal

```css
.truth-text {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.1em;
  line-height: 1.6;
  color: var(--charcoal);
}
```

### 2.8 Replace: Intro Heading & Subheading

```css
.intro-heading {
  font-family: 'Playfair Display', Georgia, serif;
  color: var(--indigo);
  font-size: 2rem;
  font-weight: 700;
}
.intro-subheading {
  font-family: 'Lora', Georgia, serif;
  color: var(--warm-gray);
  font-size: 1.1rem;
}
```

### 2.9 Floating Dust Particles (Replaces Matrix Rain)

Replace the matrix rain canvas with gentle floating golden dust particles:

```html
<canvas id="dust-canvas"></canvas>
```

```css
#dust-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  opacity: 0.6;
  pointer-events: none;
}
```

```javascript
// Warm golden dust particles (replaces matrix rain)
(function() {
  const canvas = document.getElementById('dust-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const PARTICLE_COUNT = 40;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Initialize particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -Math.random() * 0.2 - 0.05,
      opacity: Math.random() * 0.5 + 0.2,
      hue: Math.random() * 20 + 35 // Gold/amber range
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 60%, 65%, ${p.opacity})`;
      ctx.fill();

      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity += (Math.random() - 0.5) * 0.02;
      p.opacity = Math.max(0.1, Math.min(0.7, p.opacity));

      // Wrap around
      if (p.y < -5) p.y = canvas.height + 5;
      if (p.x < -5) p.x = canvas.width + 5;
      if (p.x > canvas.width + 5) p.x = -5;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();
```

### 2.10 Floating Journal (Replaces Bottom Terminal Drawer)

**Current structure** (index.html lines 168-181): Fixed bottom drawer with stone tablet styling
**Replace with**: Floating journal page that appears centered

#### HTML Structure

Replace the current terminal-container div:

```html
<!-- Floating Journal -->
<div id="journal-container" class="journal-closed">
  <button id="journal-toggle" class="journal-toggle-btn" aria-label="Open journal">
    <span class="journal-toggle-icon">&#x270E;</span>
    <span class="journal-toggle-text">Write a thought...</span>
  </button>

  <div id="journal-page" class="journal-page" role="dialog" aria-label="Journal">
    <div class="journal-header">
      <h3 class="journal-title">Journal</h3>
      <button id="journal-close" class="journal-close-btn" aria-label="Close journal">&times;</button>
    </div>
    <div id="journal-output" class="journal-output"></div>
    <div class="journal-input-area">
      <div class="journal-ruled-line"></div>
      <input id="journal-input" type="text"
             class="journal-input"
             placeholder="Write a thought or ask a question..."
             autocomplete="off" />
    </div>
  </div>
</div>
```

#### CSS for Floating Journal

```css
/* --- FLOATING JOURNAL --- */
#journal-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 500;
}

/* Toggle button (visible when journal is closed) */
.journal-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: var(--cream);
  border: 1px solid var(--kraft);
  border-radius: 2rem;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  font-family: var(--font-accent);
  font-size: 1.1rem;
  color: var(--warm-gray);
  transition: all 0.3s ease;
}
.journal-toggle-btn:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  color: var(--charcoal);
}
.journal-toggle-icon {
  font-size: 1.3rem;
}

/* Journal page (hidden when closed) */
.journal-closed .journal-page {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  pointer-events: none;
  visibility: hidden;
}
.journal-open .journal-toggle-btn {
  opacity: 0;
  pointer-events: none;
}

.journal-page {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 420px;
  max-width: calc(100vw - 2rem);
  max-height: 500px;
  background: var(--cream);
  border: 1px solid var(--kraft);
  border-radius: 4px;
  box-shadow: var(--shadow-lifted);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 1;
  transform: translateY(0) scale(1);
  visibility: visible;

  /* Subtle torn-edge top using clip-path */
  /* Deckled edge effect via pseudo-element */
}
.journal-page::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 100%;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 28px,
      var(--kraft) 28px,
      var(--kraft) 29px
    );
  background-position: 0 60px; /* Start below header */
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
}

.journal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--kraft);
  position: relative;
  z-index: 1;
}
.journal-title {
  font-family: 'Caveat', cursive;
  font-size: 1.4rem;
  color: var(--indigo);
  margin: 0;
  font-weight: 600;
}
.journal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--warm-gray);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: color 0.2s;
}
.journal-close-btn:hover {
  color: var(--charcoal);
}

.journal-output {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  font-family: 'Lora', Georgia, serif;
  font-size: 0.95rem;
  line-height: 1.6;
  position: relative;
  z-index: 1;
}

/* User messages */
.journal-user-entry {
  color: var(--charcoal);
  font-family: 'Caveat', cursive;
  font-size: 1.15rem;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--kraft);
  margin-bottom: 0.5rem;
}

/* AI responses */
.journal-ai-entry {
  color: var(--indigo);
  font-family: 'Lora', Georgia, serif;
  font-size: 0.95rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  background: rgba(245,240,232,0.5);
  border-left: 3px solid var(--terracotta);
  border-radius: 0 4px 4px 0;
}

/* Loading indicator */
.journal-loading {
  display: inline-flex;
  gap: 4px;
  padding: 0.5rem;
}
.journal-loading span {
  width: 6px;
  height: 6px;
  background: var(--terracotta);
  border-radius: 50%;
  animation: journalDot 1.2s ease-in-out infinite;
}
.journal-loading span:nth-child(2) { animation-delay: 0.2s; }
.journal-loading span:nth-child(3) { animation-delay: 0.4s; }
@keyframes journalDot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

.journal-input-area {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--kraft);
  position: relative;
  z-index: 1;
}
.journal-input {
  width: 100%;
  border: none;
  border-bottom: 1px dashed var(--kraft);
  background: transparent;
  font-family: 'Caveat', cursive;
  font-size: 1.15rem;
  color: var(--charcoal);
  padding: 0.5rem 0;
  outline: none;
  transition: border-color 0.3s;
}
.journal-input:focus {
  border-bottom-color: var(--terracotta);
}
.journal-input::placeholder {
  color: var(--kraft);
  font-style: italic;
}

/* Progress circle for model loading */
.journal-progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background: var(--linen);
  border: 1px solid var(--kraft);
  border-radius: 8px;
  margin: 0.75rem 0;
}
.journal-progress-circle svg {
  transform: rotate(-90deg);
}
.journal-progress-ring {
  fill: none;
  stroke: var(--kraft);
  stroke-width: 3;
  opacity: 0.3;
}
.journal-progress-fill {
  fill: none;
  stroke: var(--terracotta);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 314;
  stroke-dashoffset: 314;
  transition: stroke-dashoffset 0.5s ease;
}
.journal-progress-status {
  font-family: 'Lora', Georgia, serif;
  color: var(--warm-gray);
  font-size: 0.9rem;
  text-align: center;
  margin-top: 0.75rem;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .journal-page {
    bottom: 0;
    right: 0;
    width: 100vw;
    max-height: 70vh;
    border-radius: 12px 12px 0 0;
  }
  #journal-container {
    bottom: 1rem;
    right: 1rem;
  }
}
```

### 2.11 terminal.js Refactoring

**File**: `public/core_truths_book/terminal.js`

Key changes:
1. Rename all element references from `tablet*` to `journal*`
2. Replace `carveText()` function with `writeEntry()`
3. Replace `createStoneDustEffect()` with a subtle ink-fade animation
4. Replace ancient/runic themed terminology:
   - "Oracle" -> "Journal" or no translation (just use the AI response directly)
   - Remove `translateToAncient()` function
   - Remove `ancientTerms` mapping
   - Remove `runicSymbols` mapping
5. Replace `createRunicProgressCircle()` with `createLoadingIndicator()`
6. Update welcome message:
   - From: "ᚹᛖᛚᚲᛟᛗᛖ ᛏᛟ ᚦᛖ ᛟᚱᚨᚲᛚᛖ..."
   - To: "Welcome to the journal. Open it to begin a conversation with the oracle."
7. Update all CSS class references:
   - `carved-text` -> `journal-entry`
   - `user-command` -> `journal-user-entry`
   - `oracle-response` -> `journal-ai-entry`
   - `stone-dust` -> remove entirely
   - `runic-progress-*` -> `journal-progress-*`

### 2.12 script.js (GSAP Animations) Updates

**File**: `public/core_truths_book/script.js`

1. **Remove**: Torch effect initialization (lines 5-40)
2. **Keep**: Title animation using SplitText (lines 42-47) — just works with new font
3. **Keep**: Intersection Observer for page animations (lines 49-94) — works as-is
4. **Keep**: Konami code easter egg (lines 96-120)
5. **Update**: Konami effect to be warm-themed (golden sparkles instead of rainbow)

### 2.13 index.html Updates

**File**: `public/core_truths_book/index.html`

1. **Remove**: `<script src="https://cdn.tailwindcss.com"></script>`
2. **Remove**: `<div id="torch-overlay"></div>`
3. **Remove**: `<canvas id="matrix-canvas"></canvas>`
4. **Remove**: Inline `<style>` block for torch + matrix (lines 12-52)
5. **Remove**: Inline `<script>` block for torch + matrix (lines 189-275)
6. **Add**: Google Fonts link for Playfair Display, Lora, Caveat
7. **Add**: `<canvas id="dust-canvas"></canvas>` (for golden dust particles)
8. **Add**: Paper grain SVG filter (inline, hidden)
9. **Replace**: Terminal HTML (lines 168-181) with floating journal HTML
10. **Keep**: Book carousel structure unchanged
11. **Keep**: GSAP CDN links
12. **Keep**: SplitText + EasePack CDN links

### 2.14 Stone Tablet CSS Removal

Delete these entire CSS sections from `style.css`:
- Lines 267-298: `.stone-tablet` (first definition, stone/brown)
- Lines 300-307: `.tablet-header` (stone/brown)
- Lines 309-314: `.tablet-content` (stone/brown)
- Lines 316-325: `.runic-text` (first definition)
- Lines 327-331: `.tablet-title`
- Lines 333-355: `.runic-glow` + `runicPulse` keyframes
- Lines 357-416: `.carved-text`, `.carved-input`, `.oracle-response`, `.user-command`
- Lines 418-527: Runic progress circle, oracle status, stone dust
- Lines 529-725: Second definitions (matrix cyberpunk overrides for terminal)

Replace with the floating journal CSS from section 2.10.

### 2.15 File Change Summary

| File | Changes |
|------|---------|
| `core_truths_book/style.css` | Major rewrite: palette, typography, remove dark theme, remove terminal styles, add journal styles |
| `core_truths_book/index.html` | Remove torch/matrix/tailwind, add fonts/grain/dust/journal HTML |
| `core_truths_book/terminal.js` | Refactor: rename to journal, remove runic theming, update element refs |
| `core_truths_book/script.js` | Minor: remove torch init, keep animations |

### 2.16 Scroll Button Styling

The book carousel scroll buttons (left/right arrows) are currently white SVGs. Update the filter on them for visibility against the light background:

```css
&::scroll-button(*) {
  /* ... keep sizing ... */
  filter: invert(0); /* Dark arrows on light background */
}
&::scroll-button(*):disabled {
  opacity: 0.3;
}
&::scroll-button(*):not(:disabled):is(:hover, :active) {
  filter: drop-shadow(2px 4px 6px rgba(60,50,38,0.3));
  transform: scale(1.1);
}
```

### 2.17 Carousel Progress Bar

**Current**: `--accent-orange` linear gradient
**Replace with**: Terracotta fill on kraft background

```css
&::scroll-marker-group {
  /* ... keep layout ... */
  border: 1px solid var(--kraft);
  box-shadow: inset 0 1px 2px rgba(60,50,38,0.1);
  background: linear-gradient(90deg, var(--terracotta) 0%) no-repeat left center;
  /* ... keep animation/sizing ... */
}
```

---

## 3. Implementation Checklist

### Phase 1: Core Truths Book
- [ ] Create `public/shared/organic-theme.css` with design tokens
- [ ] Rewrite `core_truths_book/style.css` `:root` vars (dark -> light)
- [ ] Remove torch overlay HTML/CSS/JS
- [ ] Remove matrix canvas HTML/CSS/JS
- [ ] Remove Tailwind CDN
- [ ] Add Google Fonts (Playfair Display, Lora, Caveat)
- [ ] Add paper grain SVG filter
- [ ] Restyle body background (dark -> parchment)
- [ ] Restyle title (neon glow -> letterpress)
- [ ] Restyle book pages (cold white -> warm cream)
- [ ] Restyle truth number headings (matrix cyan -> handwritten terracotta)
- [ ] Restyle truth body text (monospace -> serif)
- [ ] Add golden dust particle canvas
- [ ] Remove stone tablet terminal HTML
- [ ] Add floating journal HTML
- [ ] Add floating journal CSS
- [ ] Refactor terminal.js -> journal behavior
- [ ] Update script.js (remove torch, keep GSAP animations)
- [ ] Restyle carousel scroll buttons for light theme
- [ ] Restyle carousel progress bar
- [ ] Test responsive (mobile breakpoints)
- [ ] Test floating journal open/close
- [ ] Test AI model loading in journal
- [ ] Test AI chat in journal

### Future Phases (not in current scope)
- [ ] Phase 2: Loader page (user-initiated entry, warm Three.js lighting)
- [ ] Phase 3: Rune puzzle (ink stamps on paper, warm colors)
- [ ] Phase 4: DeepSeek chat (React Tailwind theme overhaul)
- [ ] Phase 5: Cross-page polish and performance

---

## 4. Notes

- The book sprite sheet (`book.webp` from CodePen) renders as-is regardless of CSS theme — it's a bitmap. The book animation will work unchanged.
- The Web Worker for the AI model (`workers/worker-Jy3fF0zp.js`) is unchanged. Only the UI presentation layer changes.
- GSAP's SplitText animations are font-agnostic and will work with the new serif fonts.
- The Konami code easter egg behavior should be updated in a polish pass (currently adds rainbow background and shaking — could add golden confetti instead).
- Keep `Noto Sans Runic` font loaded but unused on core_truths_book — it's needed by rune_puzzle which may link back.
