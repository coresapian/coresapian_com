/**
 * App - Main application coordinator that manages all modules
 */

import { CONSTANTS, Utils, eventBus } from './Utils.js';
import { DependencyManager } from './DependencyManager.js';
import ThreeJSScene from './ThreeJSScene.js';
import { AudioManager } from './AudioManager.js';
import UIManager from './UIManager.js';
import VisualEffects from './VisualEffects.js';
import CanvasVisualizers from './CanvasVisualizers.js';

export class App {
  constructor() {
    this.isInitialized = false;
    this.modules = new Map();
    this.animationId = null;
    this.lastUpdateTime = 0;
    this.initializationAttempts = 0;
    this.maxInitializationAttempts = 3;
    
    // Performance monitoring
    this.performanceMetrics = {
      fps: 0,
      memoryUsage: 0,
      renderTime: 0,
      errors: 0,
      warnings: 0
    };
    
    // Error recovery state
    this.errorRecovery = {
      audioFailures: 0,
      threeJSFailures: 0,
      lastErrorTime: 0
    };
    
    // Initialize dependency manager
    this.dependencyManager = new DependencyManager();
  }

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      // Add fade out animation
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500); // Match this with CSS transition duration
    }
  }

  /**
   * Initialize the application with dependency management
   */
  async init() {
    try {
      this.initializationAttempts++;
      console.log(`🚀 CoreSapian Neural Interface - Initializing (Attempt ${this.initializationAttempts})...`);
      
      // Show loading screen
      this.showLoadingScreen();
      
      // Check device capabilities first
      const capabilities = Utils.getDeviceCapabilities();
      console.log('📱 Device Capabilities:', capabilities);
      
      if (!capabilities.webgl) {
        console.warn('⚠️ WebGL not supported - 3D features will be limited');
      }
      
      if (!capabilities.webAudio) {
        console.warn('⚠️ Web Audio API not supported - Audio features will be limited');
      }

      // Setup global error handling
      this.setupErrorHandling();
      
      // Setup dependency monitoring
      this.setupDependencyMonitoring();
      
      // Setup inter-module communication
      this.setupModuleCommunication();
      
      // Initialize modules using dependency manager
      await this.initializeModulesWithDependencies();
      
      // Start main update loop
      this.startUpdateLoop();
      
      // Setup cleanup on page unload
      this.setupCleanup();
      
      this.isInitialized = true;
      console.log('✅ CoreSapian Neural Interface - Initialized successfully');
      
      eventBus.emit('app:initialized', {
        capabilities,
        modules: Array.from(this.modules.keys()),
        attempts: this.initializationAttempts
      });
      
      // Hide loading screen after a short delay to ensure everything is rendered
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 1000);
      
    } catch (error) {
      await this.handleInitializationError(error);
    }
  }

  /**
   * Setup enhanced global error handling
   */
  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, 'Global Error', event);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'Unhandled Promise Rejection', event);
    });

    // Performance observer for monitoring
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.performanceMetrics.renderTime = entry.duration;
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance observer not available:', error);
      }
    }
  }

  /**
   * Setup dependency monitoring
   */
  setupDependencyMonitoring() {
    eventBus.on('dependency:initialized', (data) => {
      console.log(`✅ Module ${data.module} initialized`);
      this.modules.set(data.module, { status: 'initialized', timestamp: Date.now() });
    });

    eventBus.on('dependency:failed', (data) => {
      console.error(`❌ Module ${data.module} failed:`, data.error);
      this.modules.set(data.module, { status: 'failed', error: data.error, timestamp: Date.now() });
      this.performanceMetrics.errors++;
    });

    eventBus.on('dependency:initializing', (data) => {
      console.log(`🔧 Initializing ${data.module}...`);
      this.modules.set(data.module, { status: 'initializing', timestamp: Date.now() });
    });
  }

  /**
   * Setup inter-module communication with error handling
   */
  setupModuleCommunication() {
    // UI to Audio communication with error recovery
    eventBus.on('ui:loadAudioFile', async (data) => {
      try {
        if (!audioManager.isInitialized) {
          await this.initializeAudioWithRetry();
        }
        await audioManager.initAudioFile(data.file);
      } catch (error) {
        this.handleAudioError(error, 'UI->Audio File Load');
      }
    });

    eventBus.on('ui:loadAudioURL', async (data) => {
      try {
        if (!audioManager.isInitialized) {
          await this.initializeAudioWithRetry();
        }
        await audioManager.loadAudioFromURL(data.url);
      } catch (error) {
        this.handleAudioError(error, 'UI->Audio URL Load');
      }
    });

    // Audio to Visual Effects communication
    eventBus.on('audio:dataUpdated', (data) => {
      try {
        if (visualEffects && visualEffects.isInitialized) {
          visualEffects.updateAudioReactiveEffects(data);
        }
      } catch (error) {
        this.handleVisualError(error, 'Audio->Visual Effects');
      }
    });

    // Audio state changes
    eventBus.on('audio:play', () => {
      eventBus.emit('ui:zoomCamera', { zoom: true });
    });

    eventBus.on('audio:ended', () => {
      eventBus.emit('ui:zoomCamera', { zoom: false });
    });

    // Performance monitoring
    eventBus.on('threeJS:performanceUpdate', (data) => {
      this.performanceMetrics.fps = data.fps;
    });
  }

  /**
   * Initialize modules with dependency management
   */
  async initializeModulesWithDependencies() {
    // Use existing dependency manager instance
    const dependencyManager = this.dependencyManager;
    
    const moduleInitializers = {
      utils: () => Promise.resolve(), // Utils is already loaded
      audioManager: () => this.initializeAudioManager(),
      uiManager: () => this.initializeUIManager(),
      visualEffects: () => this.initializeVisualEffects(),
      canvasVisualizers: () => this.initializeCanvasVisualizers(),
      threeJSScene: () => this.initializeThreeJSScene()
    };

    // Mark utils as initialized since it's already loaded
    dependencyManager.markInitialized('utils');

    let attempts = 0;
    const maxAttempts = 10;

    while (!dependencyManager.isComplete() && attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Dependency resolution attempt ${attempts}/${maxAttempts}`);
      
      const readyModules = dependencyManager.getReadyModules();
      console.log('📋 Ready modules:', readyModules);
      
      if (readyModules.length === 0) {
        console.log('⏳ No modules ready, waiting...');
        await Utils.delay(100); // Wait a bit before checking again
        continue;
      }

      // Initialize ready modules in parallel
      const initPromises = readyModules.map(async (moduleName) => {
        if (moduleInitializers[moduleName]) {
          console.log(`🔧 Initializing ${moduleName}...`);
          dependencyManager.markInitializing(moduleName);
          try {
            await moduleInitializers[moduleName]();
            dependencyManager.markInitialized(moduleName);
            console.log(`✅ Module ${moduleName} initialized`);
          } catch (error) {
            console.error(`❌ Module ${moduleName} failed:`, error);
            dependencyManager.markFailed(moduleName, error);
            throw error;
          }
        }
      });

      await Promise.allSettled(initPromises);
      
      // Check if we're complete after this round
      if (dependencyManager.isComplete()) {
        console.log('🎉 All modules initialized successfully!');
        break;
      }
    }

    const status = dependencyManager.getStatus();
    console.log('📊 Module Initialization Status:', status);

    if (status.failed > 0) {
      console.warn(`⚠️ ${status.failed} modules failed to initialize`);
    }
    
    if (attempts >= maxAttempts && !dependencyManager.isComplete()) {
      console.warn('⚠️ Module initialization reached maximum attempts');
    }
    
    console.log('✅ Module initialization process completed');
  }

  /**
   * Individual module initializers with error handling
   */
  async initializeAudioManager() {
    try {
      await audioManager.initAudio();
    } catch (error) {
      console.warn('Audio initialization failed, continuing without audio:', error);
      // Don't throw - audio is optional
    }
  }

  async initializeUIManager() {
    await uiManager.init();
  }

  async initializeVisualEffects() {
    await visualEffects.init();
  }

  async initializeCanvasVisualizers() {
    await canvasVisualizers.init();
  }

  async initializeThreeJSScene() {
    try {
      await threeJSScene.init('three-container');
    } catch (error) {
      this.errorRecovery.threeJSFailures++;
      if (this.errorRecovery.threeJSFailures < 3) {
        console.warn('Three.js initialization failed, retrying...', error);
        await Utils.delay(1000);
        await threeJSScene.init('three-container');
      } else {
        throw error;
      }
    }
  }

  /**
   * Audio initialization with retry logic
   */
  async initializeAudioWithRetry() {
    if (this.errorRecovery.audioFailures >= 3) {
      throw new Error('Audio initialization failed too many times');
    }

    try {
      await audioManager.initAudio();
      this.errorRecovery.audioFailures = 0; // Reset on success
    } catch (error) {
      this.errorRecovery.audioFailures++;
      console.warn(`Audio initialization attempt ${this.errorRecovery.audioFailures} failed:`, error);
      
      if (this.errorRecovery.audioFailures < 3) {
        await Utils.delay(1000);
        return this.initializeAudioWithRetry();
      }
      throw error;
    }
  }

  /**
   * Handle initialization errors with retry logic
   */
  async handleInitializationError(error) {
    console.error('App initialization failed:', error);
    this.performanceMetrics.errors++;

    if (this.initializationAttempts < this.maxInitializationAttempts) {
      console.log(`🔄 Retrying initialization in 2 seconds... (${this.initializationAttempts}/${this.maxInitializationAttempts})`);
      await Utils.delay(2000);
      return this.init();
    } else {
      console.error('❌ Maximum initialization attempts reached. App startup failed.');
      eventBus.emit('app:initializationFailed', { 
        error: error.message, 
        attempts: this.initializationAttempts 
      });
      throw error;
    }
  }

  /**
   * Handle global errors with context
   */
  handleGlobalError(error, context, event) {
    this.performanceMetrics.errors++;
    this.errorRecovery.lastErrorTime = Date.now();
    
    Utils.handleError(error, context);
    
    // Try to recover from certain errors
    if (context.includes('Audio') || error.message.includes('audio')) {
      this.handleAudioError(error, context);
    } else if (context.includes('Three') || error.message.includes('WebGL')) {
      this.handleThreeJSError(error, context);
    }
    
    eventBus.emit('app:error', { 
      error: error.message, 
      context, 
      timestamp: Date.now(),
      recoverable: this.isRecoverableError(error)
    });
  }

  /**
   * Handle audio-specific errors
   */
  handleAudioError(error, context) {
    console.warn(`🎵 Audio error in ${context}:`, error);
    
    if (error.name === 'NotAllowedError') {
      eventBus.emit('ui:showNotification', {
        message: 'Audio access denied. Please allow audio permissions.',
        type: 'warning'
      });
    } else if (error.name === 'NotSupportedError') {
      eventBus.emit('ui:showNotification', {
        message: 'Audio format not supported.',
        type: 'error'
      });
    }
  }

  /**
   * Handle Three.js/WebGL errors
   */
  handleThreeJSError(error, context) {
    console.warn(`🎮 Three.js error in ${context}:`, error);
    
    if (error.message.includes('WebGL')) {
      eventBus.emit('ui:showNotification', {
        message: 'WebGL not available. 3D features disabled.',
        type: 'warning'
      });
    }
  }

  /**
   * Handle visual effects errors
   */
  handleVisualError(error, context) {
    console.warn(`✨ Visual effects error in ${context}:`, error);
    // Visual effects are non-critical, just log and continue
  }

  /**
   * Check if an error is recoverable
   */
  isRecoverableError(error) {
    const recoverableErrors = [
      'NotAllowedError',
      'NetworkError',
      'TimeoutError',
      'AbortError'
    ];
    
    return recoverableErrors.some(type => 
      error.name === type || error.message.includes(type)
    );
  }

  /**
   * Start main update loop with error handling
   */
  startUpdateLoop() {
    const update = (currentTime) => {
      try {
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // Update audio analysis if available
        if (audioManager.isInitialized && audioManager.isPlaying) {
          audioManager.updateAudioWave();
          audioManager.calculateAudioMetrics();
        }
        
        // Performance monitoring
        if (currentTime % 1000 < 16) { // Roughly every second
          this.updatePerformanceMetrics();
        }
        
        this.animationId = requestAnimationFrame(update);
        
      } catch (error) {
        this.handleGlobalError(error, 'App.update');
        // Continue the loop even if there's an error
        this.animationId = requestAnimationFrame(update);
      }
    };
    
    this.animationId = requestAnimationFrame(update);
  }

  /**
   * Update performance metrics with error tracking
   */
  updatePerformanceMetrics() {
    try {
      // Memory usage (if available)
      if (performance.memory) {
        this.performanceMetrics.memoryUsage = Math.round(
          performance.memory.usedJSHeapSize / 1024 / 1024
        );
      }
      
      // Calculate FPS
      const now = performance.now();
      if (this.lastFPSUpdate) {
        const delta = now - this.lastFPSUpdate;
        this.performanceMetrics.fps = Math.round(1000 / delta);
      }
      this.lastFPSUpdate = now;
      
      eventBus.emit('app:performanceUpdate', this.performanceMetrics);
      
    } catch (error) {
      // Performance monitoring shouldn't break the app
      console.warn('Performance monitoring error:', error);
    }
  }

  /**
   * Setup cleanup on page unload
   */
  setupCleanup() {
    const cleanup = () => {
      console.log('🧹 Cleaning up CoreSapian...');
      this.destroy();
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // Also cleanup on visibility change (mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  /**
   * Pause the application (for performance)
   */
  pause() {
    try {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      eventBus.emit('app:paused');
      
    } catch (error) {
      console.warn('Error pausing app:', error);
    }
  }

  /**
   * Resume the application
   */
  resume() {
    try {
      if (!this.animationId && this.isInitialized) {
        this.startUpdateLoop();
      }
      
      eventBus.emit('app:resumed');
      
    } catch (error) {
      console.warn('Error resuming app:', error);
    }
  }

  /**
   * Get comprehensive application state
   */
  getState() {
    return {
      initialized: this.isInitialized,
      modules: Object.fromEntries(this.modules),
      performance: this.performanceMetrics,
      errorRecovery: this.errorRecovery,
      dependencies: this.dependencyManager.getStatus(),
      audio: audioManager?.getState?.() || { available: false },
      ui: uiManager?.getState?.() || { available: false },
      threeJS: threeJSScene?.getState?.() || { available: false },
      visualEffects: visualEffects?.getState?.() || { available: false },
      canvasVisualizers: canvasVisualizers?.getState?.() || { available: false }
    };
  }

  /**
   * Update application settings with validation
   */
  updateSettings(newSettings) {
    try {
      // Validate settings first
      if (!this.validateSettings(newSettings)) {
        throw new Error('Invalid settings provided');
      }

      // Distribute settings to relevant modules
      if (newSettings.audio && audioManager.isInitialized) {
        if (newSettings.audio.reactivity !== undefined) {
          audioManager.setReactivity(newSettings.audio.reactivity);
        }
        if (newSettings.audio.sensitivity !== undefined) {
          audioManager.setSensitivity(newSettings.audio.sensitivity);
        }
      }
      
      if (newSettings.visual) {
        if (newSettings.visual.threeJS && threeJSScene.isInitialized) {
          threeJSScene.updateSettings(newSettings.visual.threeJS);
        }
        if (newSettings.visual.canvas && canvasVisualizers.isInitialized) {
          canvasVisualizers.updateSettings(newSettings.visual.canvas);
        }
      }
      
      eventBus.emit('app:settingsUpdated', newSettings);
      
    } catch (error) {
      this.handleGlobalError(error, 'App.updateSettings');
    }
  }

  /**
   * Validate settings object
   */
  validateSettings(settings) {
    if (typeof settings !== 'object' || settings === null) {
      return false;
    }

    // Validate audio settings
    if (settings.audio) {
      if (settings.audio.reactivity !== undefined && 
          (typeof settings.audio.reactivity !== 'number' || 
           settings.audio.reactivity < 0 || settings.audio.reactivity > 2)) {
        return false;
      }
      if (settings.audio.sensitivity !== undefined && 
          (typeof settings.audio.sensitivity !== 'number' || 
           settings.audio.sensitivity < 1 || settings.audio.sensitivity > 10)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Destroy the application and cleanup resources
   */
  destroy() {
    try {
      // Cancel animation loop
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      // Destroy modules in reverse dependency order
      const modules = [
        audioManager,
        threeJSScene,
        canvasVisualizers,
        visualEffects,
        uiManager
      ];
      
      modules.forEach(module => {
        try {
          if (module && typeof module.destroy === 'function') {
            module.destroy();
          }
        } catch (error) {
          console.warn('Error destroying module:', error);
        }
      });
      
      // Clear module registry
      this.modules.clear();
      
      // Reset dependency manager
      this.dependencyManager.reset();
      
      this.isInitialized = false;
      
      eventBus.emit('app:destroyed');
      console.log('🧹 CoreSapian cleanup complete');
      
    } catch (error) {
      console.error('Error during app destruction:', error);
    }
  }
}

// Create and export singleton instance
export const app = new App();

// Initialize all required modules
const threeJSScene = new ThreeJSScene();
const audioManager = new AudioManager();
const uiManager = new UIManager();
const visualEffects = new VisualEffects();
const canvasVisualizers = new CanvasVisualizers();

// Link components as needed
threeJSScene.setDependencies({ audioManager, uiManager });

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init().catch(error => {
      console.error('Failed to initialize CoreSapian:', error);
    });
  });
} else {
  // DOM is already ready
  app.init().catch(error => {
    console.error('Failed to initialize CoreSapian:', error);
  });
}
