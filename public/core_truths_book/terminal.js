// Terminal functionality
const terminalContainer = document.getElementById('terminal-container');
const terminalHeader = document.getElementById('terminal-header');
const terminalContent = document.getElementById('terminal-content');
const terminalToggle = document.getElementById('terminal-toggle');
const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');

// Toggle terminal expansion
terminalHeader.addEventListener('click', () => {
  terminalContent.classList.toggle('hidden');
  terminalContainer.style.height = terminalContent.classList.contains('hidden') 
    ? '2.5rem' 
    : '18rem';
  terminalToggle.textContent = terminalContent.classList.contains('hidden') ? '▲' : '▼';
});

// Initialize transformers.js worker
const worker = new Worker('../deepseek-r1-webgpu/src/worker.js');

// Handle terminal input
terminalInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const command = terminalInput.value.trim();
    terminalInput.value = '';
    
    if (command) {
      addTerminalOutput(`$ ${command}`);
      
      // Send command to AI model
      worker.postMessage({
        type: 'generate',
        data: [{
          role: 'user',
          content: command
        }]
      });
    }
  }
});

// Handle worker responses
worker.onmessage = (e) => {
  if (e.data.status === 'update') {
    addTerminalOutput(e.data.output, false);
  } else if (e.data.status === 'error') {
    addTerminalOutput(`Error: ${e.data.data}`, false);
  }
};

// Load the model when terminal is first expanded
let modelLoaded = false;
terminalHeader.addEventListener('click', () => {
  if (!modelLoaded) {
    addTerminalOutput('Loading AI model...');
    worker.postMessage({ type: 'load' });
    modelLoaded = true;
  }
}, { once: true });

// Helper function to add output to terminal
function addTerminalOutput(text, isCommand = true) {
  const line = document.createElement('div');
  line.className = isCommand ? 'text-green-400' : 'text-green-300';
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalContent.scrollTop = terminalContent.scrollHeight;
}

// Initial message
addTerminalOutput('AI Terminal ready. Type a command and press Enter.');
