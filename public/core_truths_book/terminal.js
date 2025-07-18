// Get references to terminal elements
const terminalContainer = document.getElementById('terminal-container');
const terminalHeader = document.getElementById('terminal-header');
const terminalContent = document.getElementById('terminal-content');
const terminalToggle = document.getElementById('terminal-toggle');
const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');

// --- State Management ---
let modelLoaded = false;
let messages = []; // Holds the conversation history
let currentResponseElement = null; // The DOM element for the streaming response
let fullAssistantResponse = ''; // The complete text of the assistant's response

// --- Worker Initialization ---
// Path to the bundled worker script from the build step.
const worker = new Worker('../deepseek-r1-webgpu/dist/assets/worker-Jy3fF0zp.js', { type: 'module' });

// --- Terminal UI Logic ---
terminalHeader.addEventListener('click', () => {
  terminalContent.classList.toggle('hidden');
  const isHidden = terminalContent.classList.contains('hidden');
  terminalContainer.style.height = isHidden ? '2.5rem' : '18rem';
  terminalToggle.textContent = isHidden ? '▲' : '▼';

  if (!isHidden && !modelLoaded) {
    addTerminalOutput('AI: Loading model, please wait...', false);
    worker.postMessage({ type: 'load' });
    modelLoaded = true;
  }
});

// --- Input Handling ---
terminalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && terminalInput.value.trim()) {
    const command = terminalInput.value.trim();
    terminalInput.value = '';

    addTerminalOutput(`$ ${command}`, true);
    messages.push({ role: 'user', content: command });

    fullAssistantResponse = ''; // Reset for the new response

    worker.postMessage({ type: 'generate', data: messages });
  }
});

// --- Worker Message Handling ---
worker.onmessage = (e) => {
  const { status, data, output, file } = e.data;

  switch (status) {
    case 'loading':
    case 'initiate':
    case 'done':
      // You can add more detailed loading indicators here if desired
      break;

    case 'ready':
      addTerminalOutput('AI: Model loaded and ready.', false);
      break;

    case 'start':
      // Create a new element for the streaming response
      currentResponseElement = document.createElement('div');
      currentResponseElement.className = 'text-green-300 whitespace-pre-wrap';
      terminalOutput.appendChild(currentResponseElement);
      break;

    case 'update':
      if (currentResponseElement) {
        // Append the new token to our full response and update the element
        fullAssistantResponse += output;
        currentResponseElement.textContent = fullAssistantResponse;
        terminalContent.scrollTop = terminalContent.scrollHeight;
      }
      break;

    case 'complete':
      // Finalize the conversation history
      messages.push({ role: 'assistant', content: fullAssistantResponse });
      currentResponseElement = null; // Reset for the next turn
      break;

    case 'error':
      addTerminalOutput(`Error: ${data}`, false);
      break;
  }
};

// --- Helper Functions ---
function addTerminalOutput(text, isCommand) {
  const line = document.createElement('div');
  line.className = isCommand ? 'text-green-400' : 'text-green-300';
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalContent.scrollTop = terminalContent.scrollHeight;
}

// Initial message
addTerminalOutput('AI Terminal ready. Expand to load model, then type a command and press Enter.');