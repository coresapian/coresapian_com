/**
 * Utility functions and constants for the CoreSapian project
 */

// Constants
export const CONSTANTS = {
  AUDIO: {
    FFT_SIZE: 2048,
    SMOOTHING_TIME: 0.8,
    MIN_DECIBELS: -90,
    MAX_DECIBELS: -10,
    REACTIVITY: 1.0,
    SENSITIVITY: 5.0
  },
  VISUAL: {
    PIXEL_SIZE: 20,
    PARTICLE_COUNT: 100,
    ACTIVE_PIXELS_RATIO: 0.05,
    CLEAR_PIXELS_RATIO: 0.04
  },
  COLORS: {
    LOADER: ['#00ffff', '#00dddd', '#00bbbb', '#009999', 'rgba(0, 255, 255, 0.5)', 'rgba(0, 200, 200, 0.4)'],
    TERMINAL: '#00ff00',
    ERROR: '#ff0000',
    WARNING: '#ffff00'
  },
  TIMING: {
    NOTIFICATION_DURATION: 3000,
    MESSAGE_QUEUE_DELAY: 3000,
    ANALYSIS_DURATION: 3000,
    TIMESTAMP_UPDATE_INTERVAL: 1000
  }
};

// Utility functions
export class Utils {
  /**
   * Debounce function to limit function calls
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function to limit function calls
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Generate random value within range
   */
  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Clamp value between min and max
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation
   */
  static lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  /**
   * Map value from one range to another
   */
  static map(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  /**
   * Get CSS custom property value
   */
  static getCSSProperty(property) {
    return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  }

  /**
   * Format timestamp
   */
  static formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Delay execution for specified milliseconds
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate cryptic messages
   */
  static getCrypticMessages() {
    return [
      "QUANTUM FLUCTUATIONS DETECTED IN AUDIO STREAM",
      "HARMONIC RESONANCE APPROACHING CRITICAL THRESHOLD",
      "SPECTRAL ANOMALY IDENTIFIED AT 432.7 HZ",
      "TEMPORAL DISPLACEMENT IN WAVEFORM DETECTED",
      "NEURAL PATTERN RECOGNITION: 97.3% MATCH",
      "FREQUENCY MODULATION BEYOND EXPECTED PARAMETERS",
      "ACOUSTIC SIGNATURE SUGGESTS NON-TERRESTRIAL ORIGIN",
      "PHASE COHERENCE BREAKDOWN IMMINENT",
      "DIMENSIONAL BLEED-THROUGH IN LOWER FREQUENCIES",
      "CONSCIOUSNESS RESONANCE PATTERN DETECTED"
    ];
  }

  /**
   * Error handler with logging
   */
  static handleError(error, context = '') {
    console.error(`[CoreSapian Error${context ? ` - ${context}` : ''}]:`, error);
    
    // Optional: Send to error tracking service
    if (window.errorTracker) {
      window.errorTracker.log(error, context);
    }
  }

  /**
   * Performance monitoring
   */
  static performanceMonitor(name, fn) {
    return function(...args) {
      const start = performance.now();
      const result = fn.apply(this, args);
      const end = performance.now();
      
      if (end - start > 16) { // Log if over 16ms (60fps threshold)
        console.warn(`[Performance] ${name} took ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    };
  }

  /**
   * Check if device supports WebGL
   */
  static supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if device supports Web Audio API
   */
  static supportsWebAudio() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Device capability detection
   */
  static getDeviceCapabilities() {
    return {
      webgl: this.supportsWebGL(),
      webAudio: this.supportsWebAudio(),
      touchDevice: 'ontouchstart' in window,
      highDPI: window.devicePixelRatio > 1,
      mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };
  }
}

// Event emitter for module communication
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        Utils.handleError(error, `EventEmitter - ${event}`);
      }
    });
  }
}

// Global event bus for module communication
export const eventBus = new EventEmitter();
