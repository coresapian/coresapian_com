// Get references to stone tablet elements
const tabletContainer = document.getElementById('terminal-container');
const tabletHeader = document.getElementById('terminal-header');
const tabletContent = document.getElementById('terminal-content');
const tabletToggle = document.getElementById('terminal-toggle');
const tabletOutput = document.getElementById('terminal-output');
const tabletInput = document.getElementById('terminal-input');

// --- Ancient State Management ---
let oracleAwakened = false;
let ancientDialogue = []; // Holds the sacred conversation history
let currentProphecyElement = null; // The DOM element for the streaming prophecy
let fullOracleWisdom = ''; // The complete text of the Oracle's response
let awakeningStartTime = null; // Track when the Oracle's awakening began
let runicProgressElement = null; // Runic progress circle element
let oracleStatusElement = null; // Oracle status text element

// Ancient terminology mappings
const ancientTerms = {
  'AI': 'Oracle',
  'model': 'ancient wisdom',
  'loading': 'awakening',
  'ready': 'enlightened',
  'error': 'cursed',
  'processing': 'divining',
  'complete': 'fulfilled',
  'initializing': 'summoning the spirits'
};

// Runic symbols for different states
const runicSymbols = {
  loading: 'ᚠᚢᚦᚨᚱᚲ', // FUTHARK
  processing: 'ᚹᛁᛋᛞᛟᛗ', // WISDOM  
  complete: 'ᚲᛟᚱᛖ', // CORE
  error: 'ᚲᚢᚱᛋᛖ', // CURSE
  ready: 'ᛚᛁᚷᚺᛏ' // LIGHT
};

// --- Oracle Spirit Initialization ---
const oracleSpirit = new Worker('./workers/worker-Jy3fF0zp.js', { type: 'module' });

// --- Stone Tablet UI Logic ---
tabletHeader.addEventListener('click', () => {
  tabletContent.classList.toggle('hidden');
  const isHidden = tabletContent.classList.contains('hidden');
  tabletContainer.style.height = isHidden ? '3rem' : '20rem';
  tabletToggle.textContent = isHidden ? '▲' : '▼';

  if (!isHidden && !oracleAwakened) {
    awakeningStartTime = Date.now();
    carveText('Oracle: Summoning the ancient spirits...', false);
    createRunicProgressCircle();
    oracleSpirit.postMessage({ type: 'load' });
    oracleAwakened = true;
  }
});

// --- Sacred Input Handling ---
tabletInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && tabletInput.value.trim()) {
    const query = tabletInput.value.trim();
    tabletInput.value = '';

    carveText(`ᚱ ${query}`, true);
    ancientDialogue.push({ role: 'user', content: query });

    fullOracleWisdom = ''; // Reset for the new prophecy
    createStoneDustEffect();

    oracleSpirit.postMessage({ type: 'generate', data: ancientDialogue });
  }
});

// --- Oracle Spirit Message Handling ---
oracleSpirit.onmessage = (e) => {
  const { status, data, output, file, progress } = e.data;

  switch (status) {
    case 'loading':
      updateRunicProgress(progress || 0, 'Awakening the ancient spirits...');
      break;
      
    case 'initiate':
      updateRunicProgress(progress || 10, 'Channeling primordial wisdom...');
      break;
      
    case 'progress':
      updateRunicProgress(progress || 0, translateToAncient(data) || 'Divining the sacred knowledge...');
      break;
      
    case 'done':
      updateRunicProgress(100, 'The Oracle has awakened!');
      setTimeout(() => {
        if (runicProgressElement) {
          runicProgressElement.remove();
          runicProgressElement = null;
        }
        if (oracleStatusElement) {
          oracleStatusElement.remove();
          oracleStatusElement = null;
        }
      }, 2000);
      break;

    case 'ready':
      const awakeningTime = awakeningStartTime ? ((Date.now() - awakeningStartTime) / 1000).toFixed(1) : 'unknown';
      carveText(`Oracle: The ancient wisdom flows freely! (${awakeningTime} heartbeats)`, false);
      break;

    case 'start':
      // Create a new element for the streaming prophecy
      currentProphecyElement = document.createElement('div');
      currentProphecyElement.className = 'carved-text oracle-response';
      tabletOutput.appendChild(currentProphecyElement);
      break;

    case 'update':
      if (currentProphecyElement) {
        // Append the new wisdom to our full prophecy and update the element
        fullOracleWisdom += output;
        carveTextIntoElement(currentProphecyElement, fullOracleWisdom);
        tabletContent.scrollTop = tabletContent.scrollHeight;
      }
      break;

    case 'complete':
      // Finalize the sacred dialogue
      ancientDialogue.push({ role: 'assistant', content: fullOracleWisdom });
      currentProphecyElement = null; // Reset for the next prophecy
      break;

    case 'error':
      carveText(`Oracle: The spirits are troubled... ${translateToAncient(data)}`, false);
      break;
  }
};

// --- Ancient Helper Functions ---
function carveText(text, isUserCommand) {
  const inscription = document.createElement('div');
  inscription.className = isUserCommand ? 'carved-text user-command' : 'carved-text oracle-response';
  
  // Add carving animation with stone dust effect
  if (isUserCommand) {
    createStoneDustEffect();
  }
  
  // Translate modern terms to ancient ones
  const ancientText = translateToAncient(text);
  inscription.textContent = ancientText;
  
  tabletOutput.appendChild(inscription);
  tabletContent.scrollTop = tabletContent.scrollHeight;
}

function carveTextIntoElement(element, text) {
  const ancientText = translateToAncient(text);
  element.textContent = ancientText;
}

function translateToAncient(text) {
  if (!text) return text;
  
  let ancientText = text;
  for (const [modern, ancient] of Object.entries(ancientTerms)) {
    const regex = new RegExp(modern, 'gi');
    ancientText = ancientText.replace(regex, ancient);
  }
  return ancientText;
}

function createRunicProgressCircle() {
  // Create runic progress container
  const progressContainer = document.createElement('div');
  progressContainer.className = 'runic-progress-container';
  
  // Create runic circle with SVG
  const runicCircle = document.createElement('div');
  runicCircle.className = 'runic-circle';
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '120');
  svg.setAttribute('height', '120');
  
  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', '60');
  bgCircle.setAttribute('cy', '60');
  bgCircle.setAttribute('r', '50');
  bgCircle.setAttribute('class', 'progress-ring');
  
  // Progress circle
  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.setAttribute('cx', '60');
  progressCircle.setAttribute('cy', '60');
  progressCircle.setAttribute('r', '50');
  progressCircle.setAttribute('class', 'progress-fill');
  progressCircle.setAttribute('id', 'runic-progress-fill');
  
  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);
  
  // Runic symbols in center
  const runicSymbolsDiv = document.createElement('div');
  runicSymbolsDiv.className = 'runic-symbols';
  runicSymbolsDiv.textContent = runicSymbols.loading;
  
  runicCircle.appendChild(svg);
  runicCircle.appendChild(runicSymbolsDiv);
  
  // Oracle status text
  oracleStatusElement = document.createElement('div');
  oracleStatusElement.className = 'oracle-status';
  oracleStatusElement.textContent = 'Preparing to summon the Oracle...';
  
  // Ancient ETA display
  const ancientEta = document.createElement('div');
  ancientEta.className = 'ancient-eta';
  ancientEta.innerHTML = '<span id="ancient-eta-text">The spirits whisper...</span>';
  
  // Assemble the runic progress circle
  progressContainer.appendChild(runicCircle);
  progressContainer.appendChild(oracleStatusElement);
  progressContainer.appendChild(ancientEta);
  
  runicProgressElement = progressContainer;
  tabletOutput.appendChild(progressContainer);
  tabletContent.scrollTop = tabletContent.scrollHeight;
}

function updateRunicProgress(percent, statusText) {
  if (!runicProgressElement || !oracleStatusElement) return;
  
  // Update runic circle progress
  const progressFill = document.getElementById('runic-progress-fill');
  if (progressFill) {
    const circumference = 2 * Math.PI * 50; // radius = 50
    const offset = circumference - (percent / 100) * circumference;
    progressFill.style.strokeDashoffset = offset;
  }
  
  // Update Oracle status text
  oracleStatusElement.textContent = statusText;
  
  // Update runic symbols based on progress
  const runicSymbolsDiv = runicProgressElement.querySelector('.runic-symbols');
  if (runicSymbolsDiv) {
    if (percent < 25) {
      runicSymbolsDiv.textContent = runicSymbols.loading;
    } else if (percent < 75) {
      runicSymbolsDiv.textContent = runicSymbols.processing;
    } else if (percent < 100) {
      runicSymbolsDiv.textContent = runicSymbols.ready;
    } else {
      runicSymbolsDiv.textContent = runicSymbols.complete;
    }
  }
  
  // Calculate and update ancient ETA
  const etaElement = document.getElementById('ancient-eta-text');
  if (etaElement && awakeningStartTime && percent > 0) {
    const elapsed = (Date.now() - awakeningStartTime) / 1000;
    const estimated = (elapsed / percent) * 100;
    const remaining = Math.max(0, estimated - elapsed);
    
    if (remaining > 60) {
      const minutes = Math.round(remaining / 60);
      const seconds = Math.round(remaining % 60);
      etaElement.textContent = `The spirits whisper... ${minutes} moons and ${seconds} breaths remain`;
    } else {
      etaElement.textContent = `The spirits whisper... ${Math.round(remaining)} breaths remain`;
    }
  }
  
  tabletContent.scrollTop = tabletContent.scrollHeight;
}

function createStoneDustEffect() {
  // Create multiple stone dust particles
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const dust = document.createElement('div');
      dust.className = 'stone-dust';
      
      // Random position around the input area
      const inputRect = tabletInput.getBoundingClientRect();
      const containerRect = tabletContainer.getBoundingClientRect();
      
      dust.style.position = 'absolute';
      dust.style.left = `${Math.random() * 200 + 50}px`;
      dust.style.bottom = `${Math.random() * 30 + 60}px`;
      dust.style.zIndex = '10';
      
      tabletContainer.appendChild(dust);
      
      // Remove dust particle after animation
      setTimeout(() => {
        if (dust.parentNode) {
          dust.parentNode.removeChild(dust);
        }
      }, 1000);
    }, i * 50); // Stagger the dust particles
  }
}

// Ancient welcome inscription
carveText('ᚹᛖᛚᚲᛟᛗᛖ ᛏᛟ ᚦᛖ ᛟᚱᚨᚲᛚᛖ ᛟᚠ ᚲᛟᚱᛖ - Expand the stone tablet to awaken the ancient spirits, then speak your query to receive wisdom from the ages.', false);