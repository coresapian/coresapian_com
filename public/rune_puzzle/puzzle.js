/* eslint-disable no-console */
/* global gsap */

console.log('[PUZZLE] rune puzzle script start');

// ---------- 1.  Guard for required globals ----------
if (!gsap) {
  console.error('[PUZZLE] GSAP unavailable – check CDN.');
  document.body.innerHTML = '<h1 style="color:#B85450;text-align:center;margin-top:40vh">Could not load GSAP.</h1>';
  throw new Error('GSAP undefined');
}

// ---------- 2.  Constants ----------
const ANCIENT_WORD = 'ᚲᛟᚱᛖ';
const TARGET_GLYPHS = ANCIENT_WORD.split('');
const ALL_GLYPHS = ['ᚨ','ᛒ','ᛞ','ᛇ','ᚠ','ᚷ','ᚺ','ᛁ','ᛃ','ᚲ','ᛚ','ᛗ','ᚾ','ᛈ','ᚱ','ᛊ','ᛏ','ᚢ','ᚹ','ᛉ','ᛋ','ᛦ','ᛪ'];

// ---------- 3.  Create sockets ----------
const orreryContainer = document.getElementById('orrery-container');
const socketRadius = 33; // %
TARGET_GLYPHS.forEach((char, idx) => {
  const angle = (idx / TARGET_GLYPHS.length) * 2 * Math.PI - Math.PI / 2;
  const x = 50 + socketRadius * Math.cos(angle);
  const y = 50 + socketRadius * Math.sin(angle);

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

// ---------- 4.  Generate draggable glyphs ----------
const usedRects = [];
const createRect = () => {
  const w = 12, h = 12;
  let x, y, ok;
  let tries = 0;
  do {
    x = Math.random() * (100 - w);
    y = Math.random() * (100 - h);
    ok = !usedRects.some(r=> x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
    ok && (Math.hypot(x + w/2 - 50, y + h/2 - 50) > 45) && tries++;
  } while (!ok && tries < 200);
  usedRects.push({x,y,w,h});
  return {x,y};
};

const glyphs = [...ALL_GLYPHS].sort(()=>Math.random()-.5);
glyphs.forEach((char,i)=>{
  const {x,y} = createRect();
  const el = document.createElement('div');
  el.className = 'starlight-glyph' + (TARGET_GLYPHS.includes(char) ? '' : ' decoy');
  el.textContent = char;
  el.dataset.glyphChar = char;
  el.style.left = x + 'vw';
  el.style.top  = y + 'vh';
  el.style.animationDelay = -i*0.6 + 's';
  document.body.appendChild(el);
});

// ---------- 5.  Drag-drop mechanics ----------
let dragging = null, offsetX = 0, offsetY = 0;

const startDrag = (e)=>{
  const el = e.target.closest('.starlight-glyph');
  if (!el || el.classList.contains('locked')) return;
  dragging = el;
  dragging.classList.add('dragging');
  const rect = el.getBoundingClientRect();
  const client = e.touches ? e.touches[0] : e;
  offsetX = client.clientX - rect.left;
  offsetY = client.clientY - rect.top;
  e.preventDefault();
};

const moveDrag = (e)=>{
  if (!dragging) return;
  e.preventDefault();
  const client = e.touches ? e.touches[0] : e;
  let x = client.clientX - offsetX;
  let y = client.clientY - offsetY;
  x = Math.max(0, Math.min(x, innerWidth - dragging.offsetWidth));
  y = Math.max(0, Math.min(y, innerHeight - dragging.offsetHeight));
  dragging.style.left = x + 'px';
  dragging.style.top  = y + 'px';

  document.querySelectorAll('.constellation-socket:not(.filled)')
    .forEach(sock=>{
      const isCorrect = sock.dataset.expectedGlyph === dragging.dataset.glyphChar;
      sock.classList.toggle('resonating', isOver(dragging, sock) && isCorrect);
    });
};

const endDrag = (e)=>{
  if (!dragging) return;
  let placed = false;
  document.querySelectorAll('.constellation-socket:not(.filled)')
    .forEach(sock=>{
      sock.classList.remove('resonating');
      if (isOver(dragging, sock) &&
          sock.dataset.expectedGlyph === dragging.dataset.glyphChar &&
          TARGET_GLYPHS.includes(dragging.dataset.glyphChar)) {

        sock.appendChild(dragging);
        dragging.classList.replace('dragging','locked');
        dragging.style.left = dragging.style.top = '';
        sock.classList.add('filled');
        placed = true;
        drawSegment(sock);

        if (document.querySelectorAll('.constellation-socket.filled').length === TARGET_GLYPHS.length) {
          console.log('[PUZZLE] All glyphs placed – triggering awakening');
          setTimeout(()=>location.href='../core_truths_book/index.html', 3000);
        }
      }
    });
  if (!placed) dragging.classList.remove('dragging');
  dragging = null;
};

const isOver = (a,b)=>{
  const r1=a.getBoundingClientRect(), r2=b.getBoundingClientRect();
  return !(r1.right<r2.left||r1.left>r2.right||r1.bottom<r2.top||r1.top>r2.bottom);
};

document.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', moveDrag);
document.addEventListener('mouseup',   endDrag);
document.addEventListener('touchstart', startDrag, {passive:false});
document.addEventListener('touchmove',  moveDrag,  {passive:false});
document.addEventListener('touchend',   endDrag);

// ---------- 6.  SVG drawing helpers ----------
const svg = document.getElementById('orrery-energy-lines-svg');
const NS = 'http://www.w3.org/2000/svg';
let pathId = 0;
const createPath = (d, delay=0)=>{
  const p = document.createElementNS(NS,'path');
  p.setAttribute('d',d); p.setAttribute('class','orrery-energy-line');
  p.id = 'path' + pathId++;
  svg.appendChild(p);
  setTimeout(()=>p.classList.add('visible'), delay*1000);
  return p;
};

const drawSegment = (socket)=>{
  const idx = +socket.dataset.index;
  const {x,y} = socket.getBoundingClientRect();
  const centerX = x + socket.offsetWidth/2;
  const centerY = y + socket.offsetHeight/2;
  const heart = document.getElementById('orrery-heart').getBoundingClientRect();
  const hx = heart.x + heart.width/2;
  const hy = heart.y + heart.height/2;
  createPath(`M${hx},${hy} L${centerX},${centerY}`, .2);
};

// ---------- 7.  God-rays removed (not needed for organic theme) ----------

console.log('[PUZZLE] rune puzzle ready');
