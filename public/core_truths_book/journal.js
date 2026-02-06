// Journal UI - Floating conversation interface
const journalContainer = document.getElementById('journal-container');
const journalToggle = document.getElementById('journal-toggle');
const journalClose = document.getElementById('journal-close');
const journalPage = document.getElementById('journal-page');
const journalOutput = document.getElementById('journal-output');
const journalInput = document.getElementById('journal-input');

// State
let modelLoaded = false;
let conversation = [];
let currentResponseElement = null;
let fullResponseText = '';
let loadStartTime = null;
let progressElement = null;
let statusElement = null;

// AI Worker
const worker = new Worker('./workers/worker-Jy3fF0zp.js', { type: 'module' });

// --- Journal open/close ---
journalToggle.addEventListener('click', () => {
  journalContainer.classList.remove('journal-closed');
  journalContainer.classList.add('journal-open');
  journalInput.focus();

  if (!modelLoaded) {
    loadStartTime = Date.now();
    writeEntry('Opening journal and preparing the model...', false);
    createProgressIndicator();
    worker.postMessage({ type: 'load' });
    modelLoaded = true;
  }
});

journalClose.addEventListener('click', () => {
  journalContainer.classList.remove('journal-open');
  journalContainer.classList.add('journal-closed');
});

// --- Input handling ---
journalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && journalInput.value.trim()) {
    const query = journalInput.value.trim();
    journalInput.value = '';

    writeEntry(query, true);
    conversation.push({ role: 'user', content: query });

    fullResponseText = '';
    worker.postMessage({ type: 'generate', data: conversation });
  }
});

// --- Worker message handling ---
worker.onmessage = (e) => {
  const { status, data, output, progress } = e.data;

  switch (status) {
    case 'loading':
      updateProgress(progress || 0, 'Loading model...');
      break;

    case 'initiate':
      updateProgress(progress || 10, 'Initializing...');
      break;

    case 'progress':
      updateProgress(progress || 0, data || 'Preparing...');
      break;

    case 'done':
      updateProgress(100, 'Ready');
      setTimeout(() => {
        if (progressElement) {
          progressElement.remove();
          progressElement = null;
        }
        if (statusElement) {
          statusElement.remove();
          statusElement = null;
        }
      }, 1500);
      break;

    case 'ready': {
      const loadTime = loadStartTime ? ((Date.now() - loadStartTime) / 1000).toFixed(1) : '?';
      writeEntry(`Model ready (${loadTime}s)`, false);
      break;
    }

    case 'start':
      currentResponseElement = document.createElement('div');
      currentResponseElement.className = 'journal-ai-entry';
      journalOutput.appendChild(currentResponseElement);
      break;

    case 'update':
      if (currentResponseElement) {
        fullResponseText += output;
        currentResponseElement.textContent = fullResponseText;
        journalOutput.scrollTop = journalOutput.scrollHeight;
      }
      break;

    case 'complete':
      conversation.push({ role: 'assistant', content: fullResponseText });
      currentResponseElement = null;
      break;

    case 'error':
      writeEntry(`Error: ${data}`, false);
      break;
  }
};

// --- Helper functions ---
function writeEntry(text, isUser) {
  const entry = document.createElement('div');
  entry.className = isUser ? 'journal-user-entry' : 'journal-ai-entry';
  entry.textContent = text;
  journalOutput.appendChild(entry);
  journalOutput.scrollTop = journalOutput.scrollHeight;
}

function createProgressIndicator() {
  const container = document.createElement('div');
  container.className = 'journal-progress-container';

  const circle = document.createElement('div');
  circle.className = 'journal-progress-circle';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100');
  svg.setAttribute('height', '100');

  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', '50');
  bgCircle.setAttribute('cy', '50');
  bgCircle.setAttribute('r', '40');
  bgCircle.setAttribute('class', 'journal-progress-ring');

  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.setAttribute('cx', '50');
  progressCircle.setAttribute('cy', '50');
  progressCircle.setAttribute('r', '40');
  progressCircle.setAttribute('class', 'journal-progress-fill');
  progressCircle.setAttribute('id', 'journal-progress-fill');

  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);
  circle.appendChild(svg);

  statusElement = document.createElement('div');
  statusElement.className = 'journal-progress-status';
  statusElement.textContent = 'Preparing...';

  const eta = document.createElement('div');
  eta.className = 'journal-progress-eta';
  eta.innerHTML = '<span id="journal-eta-text"></span>';

  container.appendChild(circle);
  container.appendChild(statusElement);
  container.appendChild(eta);

  progressElement = container;
  journalOutput.appendChild(container);
  journalOutput.scrollTop = journalOutput.scrollHeight;
}

function updateProgress(percent, statusText) {
  if (!progressElement || !statusElement) return;

  const fill = document.getElementById('journal-progress-fill');
  if (fill) {
    const circumference = 2 * Math.PI * 40; // radius = 40
    const offset = circumference - (percent / 100) * circumference;
    fill.style.strokeDashoffset = offset;
  }

  statusElement.textContent = statusText;

  const etaEl = document.getElementById('journal-eta-text');
  if (etaEl && loadStartTime && percent > 0) {
    const elapsed = (Date.now() - loadStartTime) / 1000;
    const estimated = (elapsed / percent) * 100;
    const remaining = Math.max(0, estimated - elapsed);

    if (remaining > 60) {
      const mins = Math.round(remaining / 60);
      const secs = Math.round(remaining % 60);
      etaEl.textContent = `~${mins}m ${secs}s remaining`;
    } else if (remaining > 1) {
      etaEl.textContent = `~${Math.round(remaining)}s remaining`;
    } else {
      etaEl.textContent = 'Almost ready...';
    }
  }

  journalOutput.scrollTop = journalOutput.scrollHeight;
}

// Welcome message
writeEntry('Welcome to the journal. Open it to begin a conversation.', false);
