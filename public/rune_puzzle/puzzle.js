/* global gsap */

// ---------- 1.  Guard for required globals ----------
if (typeof gsap === 'undefined') {
  console.error('[PUZZLE] GSAP unavailable – check CDN.');
  document.body.innerHTML = '<h1 style="color:#ff4800;text-align:center;margin-top:40vh">Could not load GSAP.</h1>';
  throw new Error('GSAP undefined');
}

// ---------- 2.  Constants ----------
const ANCIENT_WORD = 'ᚲᛟᚱᛖ';
const TARGET_GLYPHS = ANCIENT_WORD.split('');
const ALL_GLYPHS = ['ᚨ','ᛒ','ᛞ','ᛇ','ᚠ','ᚷ','ᚺ','ᛁ','ᛃ','ᚲ','ᛚ','ᛗ','ᚾ','ᛈ','ᚱ','ᛊ','ᛏ','ᚢ','ᚹ','ᛉ','ᛋ','ᛦ','ᛪ'];
const SOCKET_RADIUS_PERCENT = 33;
const GLYPH_PLACEMENT_ATTEMPTS = 200;
const REDIRECT_DELAY_MS = 3000;
const MOUSE_THROTTLE_MS = 16; // ~60fps throttle

// ---------- 3.  Create sockets ----------
const orreryContainer = document.getElementById('orrery-container');
TARGET_GLYPHS.forEach((char, idx) => {
  const angle = (idx / TARGET_GLYPHS.length) * 2 * Math.PI - Math.PI / 2;
  const x = 50 + SOCKET_RADIUS_PERCENT * Math.cos(angle);
  const y = 50 + SOCKET_RADIUS_PERCENT * Math.sin(angle);

  const socket = document.createElement('div');
  socket.className = 'constellation-socket';
  socket.style.left = `calc(${x}% - 6vmin)`;
  socket.style.top  = `calc(${y}% - 6vmin)`;
  socket.dataset.expectedGlyph = char;
  socket.dataset.index = idx;

  const placeholder = document.createElement('span');
  placeholder.className = 'socket-glyph-placeholder';
  placeholder.textContent = '✧';
  socket.appendChild(placeholder);
  orreryContainer.appendChild(socket);
});

// Cache socket elements after creation (Performance optimization)
const allSockets = document.querySelectorAll('.constellation-socket');

// ---------- 4.  Generate draggable glyphs ----------
const usedRects = [];
const createRect = () => {
  const w = 12, h = 12;
  let x, y, ok;
  let tries = 0;
  do {
    x = Math.random() * (100 - w);
    y = Math.random() * (100 - h);
    ok = !usedRects.some(r => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
    if (ok && Math.hypot(x + w/2 - 50, y + h/2 - 50) <= 45) ok = false;
    tries++;
  } while (!ok && tries < GLYPH_PLACEMENT_ATTEMPTS);
  usedRects.push({x, y, w, h});
  return {x, y};
};

const glyphs = [...ALL_GLYPHS].sort(() => Math.random() - 0.5);
glyphs.forEach((char, i) => {
  const {x, y} = createRect();
  const el = document.createElement('div');
  el.className = 'starlight-glyph' + (TARGET_GLYPHS.includes(char) ? '' : ' decoy');
  el.textContent = char;
  el.dataset.glyphChar = char;
  el.style.left = x + 'vw';
  el.style.top  = y + 'vh';
  el.style.animationDelay = -i * 0.6 + 's';
  document.body.appendChild(el);
});

// ---------- 5.  Drag-drop mechanics ----------
let dragging = null;
let offsetX = 0;
let offsetY = 0;
let lastMoveTime = 0;

const startDrag = (e) => {
  try {
    const el = e.target.closest('.starlight-glyph');
    if (!el || el.classList.contains('locked')) return;
    dragging = el;
    dragging.classList.add('dragging');
    const rect = el.getBoundingClientRect();
    const client = e.touches ? e.touches[0] : e;
    offsetX = client.clientX - rect.left;
    offsetY = client.clientY - rect.top;
    e.preventDefault();
  } catch (err) {
    console.error('[PUZZLE] Drag start error:', err);
  }
};

const moveDrag = (e) => {
  if (!dragging) return;

  // Throttle to ~60fps
  const now = performance.now();
  if (now - lastMoveTime < MOUSE_THROTTLE_MS) return;
  lastMoveTime = now;

  try {
    e.preventDefault();
    const client = e.touches ? e.touches[0] : e;
    let x = client.clientX - offsetX;
    let y = client.clientY - offsetY;
    x = Math.max(0, Math.min(x, innerWidth - dragging.offsetWidth));
    y = Math.max(0, Math.min(y, innerHeight - dragging.offsetHeight));
    dragging.style.left = x + 'px';
    dragging.style.top  = y + 'px';

    // Use cached socket elements
    allSockets.forEach(sock => {
      if (sock.classList.contains('filled')) return;
      const isCorrect = sock.dataset.expectedGlyph === dragging.dataset.glyphChar;
      sock.classList.toggle('resonating', isOver(dragging, sock) && isCorrect);
    });
  } catch (err) {
    console.error('[PUZZLE] Drag move error:', err);
  }
};

const endDrag = () => {
  if (!dragging) return;

  try {
    let placed = false;
    allSockets.forEach(sock => {
      sock.classList.remove('resonating');
      if (sock.classList.contains('filled')) return;

      if (isOver(dragging, sock) &&
          sock.dataset.expectedGlyph === dragging.dataset.glyphChar &&
          TARGET_GLYPHS.includes(dragging.dataset.glyphChar)) {

        sock.appendChild(dragging);
        dragging.classList.replace('dragging', 'locked');
        dragging.style.left = dragging.style.top = '';
        sock.classList.add('filled');
        placed = true;
        drawSegment(sock);

        const filledCount = document.querySelectorAll('.constellation-socket.filled').length;
        if (filledCount === TARGET_GLYPHS.length) {
          setTimeout(() => {
            location.href = '../core_truths_book/index.html';
          }, REDIRECT_DELAY_MS);
        }
      }
    });

    if (!placed) dragging.classList.remove('dragging');
    dragging = null;
  } catch (err) {
    console.error('[PUZZLE] Drag end error:', err);
    dragging = null;
  }
};

const isOver = (a, b) => {
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
};

document.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', moveDrag);
document.addEventListener('mouseup',   endDrag);
document.addEventListener('touchstart', startDrag, {passive: false});
document.addEventListener('touchmove',  moveDrag,  {passive: false});
document.addEventListener('touchend',   endDrag);

// ---------- 6.  SVG drawing helpers ----------
const svg = document.getElementById('orrery-energy-lines-svg');
const NS = 'http://www.w3.org/2000/svg';
let pathId = 0;

const createPath = (d, delay = 0) => {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('class', 'orrery-energy-line');
  p.id = 'path' + pathId++;
  svg.appendChild(p);
  setTimeout(() => p.classList.add('visible'), delay * 1000);
  return p;
};

const drawSegment = (socket) => {
  const {x, y} = socket.getBoundingClientRect();
  const centerX = x + socket.offsetWidth / 2;
  const centerY = y + socket.offsetHeight / 2;
  const heart = document.getElementById('orrery-heart').getBoundingClientRect();
  const hx = heart.x + heart.width / 2;
  const hy = heart.y + heart.height / 2;
  createPath(`M${hx},${hy} L${centerX},${centerY}`, 0.2);
};

// ---------- 7.  Background effects ----------

// --- TORCH EFFECT ---
(function setupTorchEffect() {
  const torch = document.querySelector('#torch-overlay');
  if (!torch) return;

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
    return;
  }

  gsap.to(torch, {
    '--torch-flicker-opacity': 'random(0.1, 0.4)',
    '--flicker-size': 'random(450, 550)px',
    duration: 'random(0.05, 0.15)',
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut'
  });

  let lastTorchMove = 0;
  window.addEventListener('mousemove', e => {
    const now = performance.now();
    if (now - lastTorchMove < MOUSE_THROTTLE_MS) return;
    lastTorchMove = now;

    gsap.to(torch, {
      '--torch-x': `${e.clientX}px`,
      '--torch-y': `${e.clientY}px`,
      '--torch-brightness': '0.6',
      duration: 0.4,
      ease: 'power2.out'
    });
  });

  document.body.addEventListener('mouseleave', () => {
    gsap.to(torch, { '--torch-brightness': '0', duration: 1 });
  });
  document.body.addEventListener('mouseenter', () => {
    gsap.to(torch, { '--torch-brightness': '0.6', duration: 1 });
  });
})();

// --- MATRIX RAIN (Optimized with requestAnimationFrame + visibility) ---
(function setupMatrixRain() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const letters = 'ᚠᚢᚦᚩᚱᚳᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛟᛞ';
  const fontSize = 14;
  const frameInterval = 50;
  let drops = [];
  let lastFrameTime = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const columns = Math.floor(canvas.width / fontSize);
    drops = Array.from({ length: columns }, () => 1);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function drawMatrix() {
    ctx.fillStyle = 'rgba(10, 10, 31, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#88C0D0';
    ctx.font = `${fontSize}px 'Noto Sans Runic', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = letters[Math.floor(Math.random() * letters.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  function matrixLoop(timestamp) {
    if (document.hidden) {
      requestAnimationFrame(matrixLoop);
      return;
    }

    if (timestamp - lastFrameTime >= frameInterval) {
      drawMatrix();
      lastFrameTime = timestamp;
    }

    requestAnimationFrame(matrixLoop);
  }

  requestAnimationFrame(matrixLoop);
})();

// ---------- 8.  God-rays (optional) ----------
import('./godrays.js').catch(() => {});
