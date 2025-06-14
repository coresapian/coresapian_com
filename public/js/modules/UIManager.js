/**
 * UIManager - Handles UI interactions, terminal effects, notifications, and panel management
 */

import { CONSTANTS, Utils, eventBus } from './Utils.js';

export class UIManager {
  constructor() {
    this.lastUserActionTime = Date.now();
    this.currentMessageIndex = 0;
    this.messageQueue = [
      "SYSTEM INITIALIZED. AUDIO ANALYSIS READY.",
      "SCANNING FOR ANOMALIES IN FREQUENCY SPECTRUM."
    ];
    this.crypticMessageTimeout = null;
    this.timestampInterval = null;
    
    // Terminal elements
    this.terminalContent = null;
    this.typingLine = null;
    
    // Notification system
    this.notification = null;
    
    // Draggable panels
    this.draggableInstances = [];
    
    // Bind methods
    this.init = this.init.bind(this);
    this.addTerminalMessage = this.addTerminalMessage.bind(this);
    this.typeNextMessage = this.typeNextMessage.bind(this);
    this.updateTimestamp = this.updateTimestamp.bind(this);
    this.scheduleCrypticMessages = this.scheduleCrypticMessages.bind(this);
    this.createLiquidGlassPanel = this.createLiquidGlassPanel.bind(this);
    this.convertToLiquidGlass = this.convertToLiquidGlass.bind(this);
  }

  /**
   * Initialize UI Manager
   */
  init() {
    try {
      this.initTerminal();
      this.setupNotifications();
      this.setupEventListeners();
      this.setupDraggablePanels();
      this.startTimestamp();
      this.scheduleCrypticMessages();
      
      // Start typing messages after a delay
      setTimeout(() => {
        this.typeNextMessage();
      }, CONSTANTS.TIMING.MESSAGE_QUEUE_DELAY);
      
      eventBus.emit('ui:initialized');
      
    } catch (error) {
      Utils.handleError(error, 'UIManager.init');
    }
  }

  /**
   * Initialize terminal display
   */
  initTerminal() {
    this.terminalContent = document.getElementById("terminal-content");
    if (!this.terminalContent) {
      console.warn('Terminal content element not found');
      return;
    }

    // Store original terminal content before conversion
    const originalTerminalContent = this.terminalContent;
    
    // Convert terminal to liquid glass
    this.convertToLiquidGlass(this.terminalContent.parentElement || this.terminalContent);
    
    // After conversion, find the actual content area within the glass structure
    const glassContent = this.terminalContent.closest('.glass-container')?.querySelector('.glass-content');
    if (glassContent) {
      // Find the terminal content within the glass structure
      this.terminalContent = glassContent.querySelector('#terminal-content') || glassContent;
    }
    
    // Add initial system messages
    this.addTerminalMessage("CORESAPIAN NEURAL INTERFACE v2.1.7", false);
    this.addTerminalMessage("INITIALIZING QUANTUM AUDIO ANALYSIS...", false);
  }

  /**
   * Setup notification system
   */
  setupNotifications() {
    this.notification = document.getElementById("notification");
    if (!this.notification) {
      console.warn('Notification element not found');
    }
  }

  /**
   * Setup event listeners for user interactions
   */
  setupEventListeners() {
    // Track user activity
    const updateUserActivity = Utils.throttle(() => {
      this.lastUserActionTime = Date.now();
    }, 100);

    document.addEventListener("mousemove", updateUserActivity);
    document.addEventListener("click", updateUserActivity);
    document.addEventListener("keydown", updateUserActivity);
    document.addEventListener("scroll", updateUserActivity);

    // Audio controls
    this.setupAudioControls();
    
    // Analysis button
    this.setupAnalysisButton();
    
    // Demo track buttons
    this.setupDemoTrackButtons();
    
    // File input
    this.setupFileInput();

    // Listen to audio events
    eventBus.on('audio:initialized', () => {
      this.addTerminalMessage("AUDIO CONTEXT INITIALIZED.", true);
    });

    eventBus.on('audio:play', () => {
      this.addTerminalMessage("AUDIO PLAYBACK INITIATED.", true);
    });

    eventBus.on('audio:ended', () => {
      this.addTerminalMessage("AUDIO PLAYBACK COMPLETE.", true);
    });

    eventBus.on('audio:error', (data) => {
      this.addTerminalMessage(`ERROR: ${data.error}`, true);
    });

    eventBus.on('audio:fileLoaded', (data) => {
      this.addTerminalMessage(`FILE LOADED: ${data.file}`, true);
    });

    eventBus.on('audio:urlLoaded', (data) => {
      this.addTerminalMessage(`STREAM CONNECTED: ${data.url}`, true);
    });
  }

  /**
   * Setup audio control event listeners
   */
  setupAudioControls() {
    const audioPlayer = document.getElementById("audio-player");
    if (audioPlayer) {
      audioPlayer.addEventListener("ended", () => {
        this.addTerminalMessage("AUDIO PLAYBACK COMPLETE.");
        eventBus.emit('ui:audioEnded');
      });
    }
  }

  /**
   * Setup analysis button
   */
  setupAnalysisButton() {
    const analyzeBtn = document.getElementById("analyze-btn");
    if (!analyzeBtn) return;

    analyzeBtn.addEventListener("click", () => {
      if (analyzeBtn.disabled) return;

      analyzeBtn.textContent = "ANALYZING...";
      analyzeBtn.disabled = true;
      
      this.addTerminalMessage("INITIATING DEEP SPECTRAL ANALYSIS...", true);
      this.addTerminalMessage("SCANNING QUANTUM FREQUENCY SIGNATURES...", true);
      
      // Simulate analysis process
      setTimeout(() => {
        analyzeBtn.textContent = "ANALYZE";
        analyzeBtn.disabled = false;
        
        this.addTerminalMessage("ANALYSIS COMPLETE. ANOMALY SIGNATURE IDENTIFIED.", true);
        this.showNotification("ANOMALY ANALYSIS COMPLETE");
        
        // Update analysis data with random values
        this.updateAnalysisData();
        
      }, CONSTANTS.TIMING.ANALYSIS_DURATION);
    });
  }

  /**
   * Setup demo track buttons
   */
  setupDemoTrackButtons() {
    document.querySelectorAll(".demo-track-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const url = btn.dataset.url;
        if (!url) return;

        // Update active state
        document.querySelectorAll(".demo-track-btn").forEach((b) => {
          b.classList.remove("active");
        });
        btn.classList.add("active");

        // Load audio
        eventBus.emit('ui:loadAudioURL', { url });
        this.addTerminalMessage(`LOADING DEMO TRACK: ${btn.textContent}`, true);
      });
    });
  }

  /**
   * Setup file input
   */
  setupFileInput() {
    const fileBtn = document.getElementById("file-btn");
    const fileInput = document.getElementById("audio-file-input");
    
    if (fileBtn && fileInput) {
      fileBtn.addEventListener("click", () => {
        fileInput.click();
      });

      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          eventBus.emit('ui:loadAudioFile', { file });
          this.addTerminalMessage(`LOADING FILE: ${file.name}`, true);
        }
      });
    }
  }

  /**
   * Setup draggable panels using GSAP
   */
  setupDraggablePanels() {
    if (typeof Draggable === 'undefined') {
      console.warn('GSAP Draggable not available');
      return;
    }

    const panels = [
      { element: ".control-panel", handle: "#control-panel-handle" },
      { element: ".terminal-panel", handle: null },
      { element: ".spectrum-analyzer", handle: "#spectrum-handle" },
      { element: ".data-panel", handle: null }
    ];

    panels.forEach(({ element, handle }) => {
      const panelElement = document.querySelector(element);
      if (!panelElement) return;

      try {
        const draggableInstance = Draggable.create(panelElement, {
          type: "x,y",
          edgeResistance: 0.65,
          bounds: document.body,
          handle: handle || panelElement,
          inertia: true,
          throwResistance: 0.85,
          onDragStart: () => {
            this.bringPanelToFront(panelElement);
            this.addTerminalMessage(`PANEL DRAG INITIATED: ${element}`);
          },
          onDragEnd: function() {
            const velocity = {
              x: this.getVelocity("x").toFixed(2),
              y: this.getVelocity("y").toFixed(2)
            };
            this.addTerminalMessage(
              `DRAGGABLE.INERTIA({TARGET: '${element}', VELOCITY: {X: ${velocity.x}, Y: ${velocity.y}}});`,
              true
            );
          }.bind(this)
        });

        this.draggableInstances.push(...draggableInstance);
        
        // Convert panel to liquid glass
        this.convertToLiquidGlass(panelElement);
        
      } catch (error) {
        Utils.handleError(error, `UIManager.setupDraggablePanels - ${element}`);
      }
    });
  }

  /**
   * Bring panel to front
   */
  bringPanelToFront(element) {
    const panels = document.querySelectorAll(
      ".terminal-panel, .control-panel, .spectrum-analyzer, .data-panel"
    );
    
    let maxZ = 10;
    panels.forEach((panel) => {
      const z = parseInt(window.getComputedStyle(panel).zIndex) || 10;
      if (z > maxZ) maxZ = z;
    });
    
    element.style.zIndex = maxZ + 1;
  }

  /**
   * Add message to terminal
   */
  addTerminalMessage(message, isCommand = false) {
    try {
      if (!this.terminalContent) {
        console.warn('Terminal content not available');
        return;
      }

      // Find the actual terminal content area (might be within glass structure)
      let targetContainer = this.terminalContent;
      
      // If we're in a glass container, find the content area
      const glassContainer = this.terminalContent.closest('.glass-container');
      if (glassContainer) {
        const glassContent = glassContainer.querySelector('.glass-content');
        if (glassContent) {
          // Look for terminal-content within glass structure, or use glass-content itself
          targetContainer = glassContent.querySelector('#terminal-content') || glassContent;
        }
      }

      const messageElement = document.createElement("div");
      messageElement.className = isCommand ? "command" : "output";
      
      const timestamp = new Date().toLocaleTimeString();
      const prefix = isCommand ? ">" : "[SYS]";
      messageElement.textContent = `${timestamp} ${prefix} ${message}`;
      
      // Find typing line within the target container
      const typingLine = targetContainer.querySelector('.typing');
      
      // Insert before typing line if it exists, otherwise append
      if (typingLine && typingLine.parentElement === targetContainer) {
        targetContainer.insertBefore(messageElement, typingLine);
      } else {
        targetContainer.appendChild(messageElement);
      }
      
      // Auto-scroll to bottom
      targetContainer.scrollTop = targetContainer.scrollHeight;
      
      // Limit terminal history
      const messages = targetContainer.querySelectorAll('.command, .output');
      if (messages.length > 50) {
        messages[0].remove();
      }
      
    } catch (error) {
      Utils.handleError(error, 'UIManager.addTerminalMessage');
    }
  }

  /**
   * Type next message in queue
   */
  typeNextMessage() {
    if (!this.typingLine || this.currentMessageIndex >= this.messageQueue.length) {
      return;
    }

    try {
      const message = this.messageQueue[this.currentMessageIndex];
      let charIndex = 0;
      
      const typeChar = () => {
        if (charIndex < message.length) {
          this.typingLine.textContent = message.substring(0, charIndex + 1) + "_";
          charIndex++;
          setTimeout(typeChar, 50 + Math.random() * 50); // Variable typing speed
        } else {
          this.typingLine.textContent = message;
          this.currentMessageIndex++;
          
          // Schedule next message
          setTimeout(() => {
            this.typeNextMessage();
          }, CONSTANTS.TIMING.MESSAGE_QUEUE_DELAY);
        }
      };
      
      typeChar();
      
    } catch (error) {
      Utils.handleError(error, 'UIManager.typeNextMessage');
    }
  }

  /**
   * Show notification
   */
  showNotification(message) {
    if (!this.notification) return;

    try {
      this.notification.textContent = message;
      this.notification.style.opacity = 1;
      
      setTimeout(() => {
        if (this.notification) {
          this.notification.style.opacity = 0;
        }
      }, CONSTANTS.TIMING.NOTIFICATION_DURATION);
      
    } catch (error) {
      Utils.handleError(error, 'UIManager.showNotification');
    }
  }

  /**
   * Update timestamp display
   */
  updateTimestamp() {
    const timestampElement = document.getElementById("timestamp");
    if (timestampElement) {
      timestampElement.textContent = Utils.formatTimestamp();
    }
  }

  /**
   * Start timestamp updates
   */
  startTimestamp() {
    this.updateTimestamp();
    this.timestampInterval = setInterval(
      this.updateTimestamp, 
      CONSTANTS.TIMING.TIMESTAMP_UPDATE_INTERVAL
    );
  }

  /**
   * Schedule cryptic messages
   */
  scheduleCrypticMessages() {
    const scheduleNext = () => {
      const delay = Utils.randomRange(10000, 30000); // 10-30 seconds
      
      this.crypticMessageTimeout = setTimeout(() => {
        // Only show cryptic messages if user has been inactive
        const timeSinceLastAction = Date.now() - this.lastUserActionTime;
        
        if (timeSinceLastAction > 5000) { // 5 seconds of inactivity
          const messages = Utils.getCrypticMessages();
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          this.addTerminalMessage(randomMessage, false);
        }
        
        scheduleNext();
      }, delay);
    };
    
    scheduleNext();
  }

  /**
   * Update analysis data display
   */
  updateAnalysisData() {
    const updates = [
      { id: "mass-value", value: (Math.random() * 2 + 1).toFixed(3) },
      { id: "energy-value", value: (Math.random() * 9 + 1).toFixed(1) + "e8 J" },
      { id: "variance-value", value: (Math.random() * 0.01).toFixed(4) },
      { id: "peak-value", value: (Math.random() * 200 + 100).toFixed(1) + " HZ" },
      { id: "amplitude-value", value: (Math.random() * 0.5 + 0.3).toFixed(2) },
      { id: "phase-value", value: ["π/4", "π/2", "π/6", "3π/4"][Math.floor(Math.random() * 4)] }
    ];

    updates.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  /**
   * Create a new liquid glass panel
   */
  createLiquidGlassPanel(options = {}) {
    const {
      id = Utils.generateId(),
      className = '',
      size = 'medium',
      draggable = false,
      title = '',
      content = '',
      position = null
    } = options;

    // Create container
    const panel = document.createElement('div');
    panel.id = id;
    panel.className = `glass-container glass-container--${size} glass-container--panel ${className}`;
    
    if (draggable) {
      panel.classList.add('glass-container--draggable');
    }

    // Create glass layers
    const glassFilter = document.createElement('div');
    glassFilter.className = 'glass-filter';
    
    const glassOverlay = document.createElement('div');
    glassOverlay.className = 'glass-overlay';
    
    const glassSpecular = document.createElement('div');
    glassSpecular.className = 'glass-specular';
    
    // Create content structure
    const glassContent = document.createElement('div');
    glassContent.className = 'glass-content glass-content--column';
    
    if (title) {
      const header = document.createElement('div');
      header.className = 'glass-panel-header';
      header.innerHTML = `<h3 class="glass-panel-title">${title}</h3>`;
      glassContent.appendChild(header);
    }
    
    if (content) {
      const body = document.createElement('div');
      body.className = 'glass-panel-body';
      body.innerHTML = content;
      glassContent.appendChild(body);
    }
    
    // Assemble panel
    panel.appendChild(glassFilter);
    panel.appendChild(glassOverlay);
    panel.appendChild(glassSpecular);
    panel.appendChild(glassContent);
    
    // Set position if provided
    if (position) {
      panel.style.position = 'absolute';
      if (position.x !== undefined) panel.style.left = `${position.x}px`;
      if (position.y !== undefined) panel.style.top = `${position.y}px`;
    }
    
    return panel;
  }

  /**
   * Convert an element to liquid glass panel
   */
  convertToLiquidGlass(element) {
    if (!element || element.classList.contains('glass-container')) return;

    // Add glass container classes
    element.classList.add('glass-container', 'glass-container--panel');
    
    // Create glass layers
    const glassFilter = document.createElement('div');
    glassFilter.className = 'glass-filter';
    
    const glassOverlay = document.createElement('div');
    glassOverlay.className = 'glass-overlay';
    
    const glassSpecular = document.createElement('div');
    glassSpecular.className = 'glass-specular';
    
    // Wrap existing content
    const content = document.createElement('div');
    content.className = 'glass-content glass-content--column';
    
    // Move all children to content wrapper
    while (element.firstChild) {
      content.appendChild(element.firstChild);
    }
    
    // Add glass layers
    element.appendChild(glassFilter);
    element.appendChild(glassOverlay);
    element.appendChild(glassSpecular);
    element.appendChild(content);
    
    return element;
  }

  /**
   * Get current UI state
   */
  getState() {
    return {
      lastUserActionTime: this.lastUserActionTime,
      currentMessageIndex: this.currentMessageIndex,
      messageQueueLength: this.messageQueue.length
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      // Clear timeouts and intervals
      if (this.crypticMessageTimeout) {
        clearTimeout(this.crypticMessageTimeout);
      }
      
      if (this.timestampInterval) {
        clearInterval(this.timestampInterval);
      }
      
      // Destroy draggable instances
      this.draggableInstances.forEach(instance => {
        if (instance && typeof instance.kill === 'function') {
          instance.kill();
        }
      });
      this.draggableInstances = [];
      
      eventBus.emit('ui:destroyed');
      
    } catch (error) {
      Utils.handleError(error, 'UIManager.destroy');
    }
  }
}

// Export singleton instance
export const uiManager = new UIManager();
