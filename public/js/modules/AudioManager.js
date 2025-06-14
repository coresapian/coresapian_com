/**
 * AudioManager - Handles all audio processing, analysis, and visualization data
 */

import { CONSTANTS, Utils, eventBus } from './Utils.js';

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.audioAnalyser = null;
    this.audioSource = null;
    this.audioData = null;
    this.frequencyData = null;
    this.audioReactivity = CONSTANTS.AUDIO.REACTIVITY;
    this.audioSensitivity = CONSTANTS.AUDIO.SENSITIVITY;
    this.isInitialized = false;
    this.isPlaying = false;
    this.contextStarted = false;
    this.sourceConnected = false;
    this.currentAudioElement = null;
    this.currentAudioSrc = null;
    
    // Bind methods
    this.initAudio = this.initAudio.bind(this);
    this.setupAudioSource = this.setupAudioSource.bind(this);
    this.calculateAudioMetrics = this.calculateAudioMetrics.bind(this);
  }

  /**
   * Initialize Web Audio API
   */
  async initAudio() {
    try {
      if (!Utils.supportsWebAudio()) {
        throw new Error('Web Audio API not supported');
      }

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioAnalyser = this.audioContext.createAnalyser();
        
        // Configure analyser
        this.audioAnalyser.fftSize = CONSTANTS.AUDIO.FFT_SIZE;
        this.audioAnalyser.smoothingTimeConstant = CONSTANTS.AUDIO.SMOOTHING_TIME;
        this.audioAnalyser.minDecibels = CONSTANTS.AUDIO.MIN_DECIBELS;
        this.audioAnalyser.maxDecibels = CONSTANTS.AUDIO.MAX_DECIBELS;
        
        // Initialize data arrays
        this.audioData = new Uint8Array(this.audioAnalyser.frequencyBinCount);
        this.frequencyData = new Uint8Array(this.audioAnalyser.frequencyBinCount);
        
        this.isInitialized = true;
        eventBus.emit('audio:initialized', { context: this.audioContext });
      }

      await this.ensureAudioContextStarted();
      
    } catch (error) {
      Utils.handleError(error, 'AudioManager.initAudio');
      eventBus.emit('audio:error', { error: error.message });
    }
  }

  /**
   * Ensure audio context is started (user interaction required)
   */
  async ensureAudioContextStarted() {
    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      if (this.audioContext && this.audioContext.state === 'running') {
        this.contextStarted = true;
        eventBus.emit('audio:contextStarted');
      }
    } catch (error) {
      Utils.handleError(error, 'AudioManager.ensureAudioContextStarted');
    }
  }

  /**
   * Clean up existing audio source
   */
  cleanupAudioSource() {
    try {
      if (this.audioSource) {
        this.audioSource.disconnect();
        this.audioSource = null;
        this.sourceConnected = false;
      }
      
      if (this.currentAudioElement) {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      }
    } catch (error) {
      Utils.handleError(error, 'AudioManager.cleanupAudioSource');
    }
  }

  /**
   * Create new audio element
   */
  createNewAudioElement() {
    try {
      if (this.currentAudioElement) {
        this.currentAudioElement.remove();
      }
      
      this.currentAudioElement = document.createElement('audio');
      this.currentAudioElement.crossOrigin = 'anonymous';
      this.currentAudioElement.preload = 'auto';
      
      // Add event listeners
      this.currentAudioElement.addEventListener('loadeddata', () => {
        eventBus.emit('audio:loaded', { element: this.currentAudioElement });
      });
      
      this.currentAudioElement.addEventListener('play', () => {
        this.isPlaying = true;
        eventBus.emit('audio:play');
      });
      
      this.currentAudioElement.addEventListener('pause', () => {
        this.isPlaying = false;
        eventBus.emit('audio:pause');
      });
      
      this.currentAudioElement.addEventListener('ended', () => {
        this.isPlaying = false;
        eventBus.emit('audio:ended');
      });
      
      this.currentAudioElement.addEventListener('error', (e) => {
        Utils.handleError(e.error || new Error('Audio loading failed'), 'AudioElement');
        eventBus.emit('audio:error', { error: 'Failed to load audio' });
      });
      
      return this.currentAudioElement;
    } catch (error) {
      Utils.handleError(error, 'AudioManager.createNewAudioElement');
      return null;
    }
  }

  /**
   * Setup audio source for analysis
   */
  setupAudioSource(audioElement) {
    try {
      if (!this.audioContext || !this.audioAnalyser) {
        throw new Error('Audio context not initialized');
      }

      this.cleanupAudioSource();
      
      this.audioSource = this.audioContext.createMediaElementSource(audioElement);
      this.audioSource.connect(this.audioAnalyser);
      this.audioAnalyser.connect(this.audioContext.destination);
      
      this.sourceConnected = true;
      eventBus.emit('audio:sourceConnected', { source: this.audioSource });
      
    } catch (error) {
      Utils.handleError(error, 'AudioManager.setupAudioSource');
      eventBus.emit('audio:error', { error: 'Failed to setup audio source' });
    }
  }

  /**
   * Load audio from file
   */
  async initAudioFile(file) {
    try {
      if (!this.isInitialized) {
        await this.initAudio();
      }

      const audioElement = this.createNewAudioElement();
      if (!audioElement) return;

      const url = URL.createObjectURL(file);
      audioElement.src = url;
      
      audioElement.addEventListener('loadeddata', () => {
        this.setupAudioSource(audioElement);
        audioElement.play().catch(error => {
          Utils.handleError(error, 'AudioManager.initAudioFile - play');
        });
        
        // Clean up object URL after loading
        URL.revokeObjectURL(url);
        
        eventBus.emit('audio:fileLoaded', { 
          file: file.name,
          duration: audioElement.duration 
        });
      }, { once: true });

    } catch (error) {
      Utils.handleError(error, 'AudioManager.initAudioFile');
      eventBus.emit('audio:error', { error: 'Failed to load audio file' });
    }
  }

  /**
   * Load audio from URL
   */
  async loadAudioFromURL(url) {
    try {
      if (!this.isInitialized) {
        await this.initAudio();
      }

      const audioElement = this.createNewAudioElement();
      if (!audioElement) return;

      this.currentAudioSrc = url;
      audioElement.src = url;
      
      audioElement.addEventListener('loadeddata', () => {
        this.setupAudioSource(audioElement);
        audioElement.play().catch(error => {
          Utils.handleError(error, 'AudioManager.loadAudioFromURL - play');
        });
        
        eventBus.emit('audio:urlLoaded', { 
          url: url,
          duration: audioElement.duration 
        });
      }, { once: true });

    } catch (error) {
      Utils.handleError(error, 'AudioManager.loadAudioFromURL');
      eventBus.emit('audio:error', { error: 'Failed to load audio from URL' });
    }
  }

  /**
   * Update audio analysis data
   */
  updateAudioWave() {
    if (!this.audioAnalyser || !this.audioData || !this.frequencyData) return;
    
    try {
      this.audioAnalyser.getByteTimeDomainData(this.audioData);
      this.audioAnalyser.getByteFrequencyData(this.frequencyData);
      
      // Emit updated data for visualizers
      eventBus.emit('audio:dataUpdated', {
        timeData: this.audioData,
        frequencyData: this.frequencyData
      });
      
    } catch (error) {
      Utils.handleError(error, 'AudioManager.updateAudioWave');
    }
  }

  /**
   * Calculate audio metrics for analysis
   */
  calculateAudioMetrics() {
    if (!this.frequencyData) return null;

    try {
      let sum = 0;
      let peak = 0;
      let peakFreq = 0;
      const dataLength = this.frequencyData.length;
      
      // Calculate RMS and find peak
      for (let i = 0; i < dataLength; i++) {
        const value = this.frequencyData[i];
        sum += value * value;
        
        if (value > peak) {
          peak = value;
          peakFreq = (i * this.audioContext.sampleRate) / (2 * dataLength);
        }
      }
      
      const rms = Math.sqrt(sum / dataLength);
      const normalizedRMS = rms / 255;
      
      // Calculate spectral centroid (brightness)
      let weightedSum = 0;
      let magnitudeSum = 0;
      
      for (let i = 0; i < dataLength; i++) {
        const magnitude = this.frequencyData[i];
        const frequency = (i * this.audioContext.sampleRate) / (2 * dataLength);
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;
      }
      
      const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
      
      // Calculate variance for complexity measure
      let variance = 0;
      const mean = sum / dataLength;
      
      for (let i = 0; i < dataLength; i++) {
        variance += Math.pow(this.frequencyData[i] - mean, 2);
      }
      variance /= dataLength;
      
      const metrics = {
        rms: normalizedRMS,
        peak: peak / 255,
        peakFrequency: peakFreq,
        spectralCentroid: spectralCentroid,
        variance: variance / (255 * 255),
        timestamp: Date.now()
      };
      
      eventBus.emit('audio:metricsCalculated', metrics);
      return metrics;
      
    } catch (error) {
      Utils.handleError(error, 'AudioManager.calculateAudioMetrics');
      return null;
    }
  }

  /**
   * Get current audio state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      contextStarted: this.contextStarted,
      sourceConnected: this.sourceConnected,
      currentSrc: this.currentAudioSrc,
      reactivity: this.audioReactivity,
      sensitivity: this.audioSensitivity
    };
  }

  /**
   * Set audio reactivity
   */
  setReactivity(value) {
    this.audioReactivity = Utils.clamp(value, 0.1, 5.0);
    eventBus.emit('audio:reactivityChanged', { reactivity: this.audioReactivity });
  }

  /**
   * Set audio sensitivity
   */
  setSensitivity(value) {
    this.audioSensitivity = Utils.clamp(value, 1.0, 10.0);
    eventBus.emit('audio:sensitivityChanged', { sensitivity: this.audioSensitivity });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      this.cleanupAudioSource();
      
      if (this.currentAudioElement) {
        this.currentAudioElement.remove();
        this.currentAudioElement = null;
      }
      
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      
      this.audioContext = null;
      this.audioAnalyser = null;
      this.audioData = null;
      this.frequencyData = null;
      this.isInitialized = false;
      
      eventBus.emit('audio:destroyed');
      
    } catch (error) {
      Utils.handleError(error, 'AudioManager.destroy');
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
