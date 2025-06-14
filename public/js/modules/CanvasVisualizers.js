/**
 * CanvasVisualizers - Handles canvas-based audio visualizations
 */

import { CONSTANTS, Utils, eventBus } from './Utils.js';

export default class CanvasVisualizers {
  constructor() {
    // Canvas elements and contexts
    this.circularCanvas = null;
    this.circularCtx = null;
    this.spectrumCanvas = null;
    this.spectrumCtx = null;
    this.waveformCanvas = null;
    this.waveformCtx = null;
    
    // Animation IDs
    this.circularAnimationId = null;
    this.spectrumAnimationId = null;
    this.waveformAnimationId = null;
    
    // Audio data
    this.audioData = null;
    this.frequencyData = null;
    
    // Visual settings
    this.visualSettings = {
      circularRadius: 100,
      spectrumBarWidth: 4,
      spectrumBarSpacing: 1,
      waveformLineWidth: 2,
      colorScheme: 'cyan'
    };
    
    // Performance optimization
    this.lastFrameTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.drawCircularVisualizer = this.drawCircularVisualizer.bind(this);
    this.drawSpectrumAnalyzer = this.drawSpectrumAnalyzer.bind(this);
    this.drawWaveform = this.drawWaveform.bind(this);
    this.resizeCanvases = this.resizeCanvases.bind(this);
  }

  /**
   * Initialize all canvas visualizers
   */
  init() {
    try {
      this.setupCanvases();
      this.setupEventListeners();
      this.startVisualizations();
      
      eventBus.emit('canvasVisualizers:initialized');
      
    } catch (error) {
      Utils.handleError(error, 'CanvasVisualizers.init');
    }
  }

  /**
   * Setup canvas elements and contexts
   */
  setupCanvases() {
    // Circular visualizer
    this.circularCanvas = document.getElementById("circular-canvas");
    if (this.circularCanvas) {
      this.circularCtx = this.circularCanvas.getContext("2d");
    }

    // Spectrum analyzer
    this.spectrumCanvas = document.getElementById("spectrum-canvas");
    if (this.spectrumCanvas) {
      this.spectrumCtx = this.spectrumCanvas.getContext("2d");
    }

    // Waveform visualizer
    this.waveformCanvas = document.getElementById("waveform-canvas");
    if (this.waveformCanvas) {
      this.waveformCtx = this.waveformCanvas.getContext("2d");
    }

    // Initial resize
    this.resizeCanvases();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener("resize", Utils.debounce(this.resizeCanvases, 100));

    // Audio data updates
    eventBus.on('audio:dataUpdated', (data) => {
      this.audioData = data.timeData;
      this.frequencyData = data.frequencyData;
    });

    // Audio state changes
    eventBus.on('audio:play', () => {
      this.startVisualizations();
    });

    eventBus.on('audio:pause', () => {
      this.pauseVisualizations();
    });

    eventBus.on('audio:ended', () => {
      this.stopVisualizations();
    });
  }

  /**
   * Resize all canvases
   */
  resizeCanvases() {
    try {
      // Circular canvas
      if (this.circularCanvas) {
        const container = this.circularCanvas.parentElement;
        this.circularCanvas.width = container.clientWidth;
        this.circularCanvas.height = container.clientHeight;
        this.visualSettings.circularRadius = Math.min(
          this.circularCanvas.width, 
          this.circularCanvas.height
        ) * 0.3;
      }

      // Spectrum canvas
      if (this.spectrumCanvas) {
        const container = this.spectrumCanvas.parentElement;
        this.spectrumCanvas.width = container.clientWidth;
        this.spectrumCanvas.height = container.clientHeight;
      }

      // Waveform canvas
      if (this.waveformCanvas) {
        const container = this.waveformCanvas.parentElement;
        this.waveformCanvas.width = container.clientWidth;
        this.waveformCanvas.height = container.clientHeight;
      }

    } catch (error) {
      Utils.handleError(error, 'CanvasVisualizers.resizeCanvases');
    }
  }

  /**
   * Start all visualizations
   */
  startVisualizations() {
    this.drawCircularVisualizer();
    this.drawSpectrumAnalyzer();
    this.drawWaveform();
  }

  /**
   * Pause visualizations
   */
  pauseVisualizations() {
    if (this.circularAnimationId) {
      cancelAnimationFrame(this.circularAnimationId);
      this.circularAnimationId = null;
    }
    if (this.spectrumAnimationId) {
      cancelAnimationFrame(this.spectrumAnimationId);
      this.spectrumAnimationId = null;
    }
    if (this.waveformAnimationId) {
      cancelAnimationFrame(this.waveformAnimationId);
      this.waveformAnimationId = null;
    }
  }

  /**
   * Stop visualizations and clear canvases
   */
  stopVisualizations() {
    this.pauseVisualizations();
    
    // Clear all canvases
    if (this.circularCtx) {
      this.circularCtx.clearRect(0, 0, this.circularCanvas.width, this.circularCanvas.height);
    }
    if (this.spectrumCtx) {
      this.spectrumCtx.clearRect(0, 0, this.spectrumCanvas.width, this.spectrumCanvas.height);
    }
    if (this.waveformCtx) {
      this.waveformCtx.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
    }
  }

  /**
   * Draw circular audio visualizer
   */
  drawCircularVisualizer() {
    if (!this.circularCtx || !this.frequencyData) {
      this.circularAnimationId = requestAnimationFrame(this.drawCircularVisualizer);
      return;
    }

    try {
      const now = performance.now();
      if (now - this.lastFrameTime < this.frameInterval) {
        this.circularAnimationId = requestAnimationFrame(this.drawCircularVisualizer);
        return;
      }
      this.lastFrameTime = now;

      const canvas = this.circularCanvas;
      const ctx = this.circularCtx;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = this.visualSettings.circularRadius;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw frequency bars in circular pattern
      const barCount = Math.min(this.frequencyData.length / 4, 128); // Optimize for performance
      const angleStep = (Math.PI * 2) / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = this.frequencyData[i];
        const normalizedValue = value / 255;
        const barHeight = normalizedValue * radius * 0.8;
        
        const angle = i * angleStep - Math.PI / 2; // Start from top
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        // Color based on frequency
        const hue = (i / barCount) * 360;
        const saturation = 70 + normalizedValue * 30;
        const lightness = 50 + normalizedValue * 30;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add glow effect for high values
        if (normalizedValue > 0.7) {
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Draw center dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffff';
      ctx.fill();

      this.circularAnimationId = requestAnimationFrame(this.drawCircularVisualizer);

    } catch (error) {
      Utils.handleError(error, 'CanvasVisualizers.drawCircularVisualizer');
      this.circularAnimationId = requestAnimationFrame(this.drawCircularVisualizer);
    }
  }

  /**
   * Draw spectrum analyzer
   */
  drawSpectrumAnalyzer() {
    if (!this.spectrumCtx || !this.frequencyData) {
      this.spectrumAnimationId = requestAnimationFrame(this.drawSpectrumAnalyzer);
      return;
    }

    try {
      const canvas = this.spectrumCanvas;
      const ctx = this.spectrumCtx;
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate bar dimensions
      const barCount = Math.min(this.frequencyData.length / 2, width / 5); // Optimize for screen width
      const barWidth = (width / barCount) - 1;

      // Draw frequency bars
      for (let i = 0; i < barCount; i++) {
        const value = this.frequencyData[i];
        const normalizedValue = value / 255;
        const barHeight = normalizedValue * height * 0.9;
        
        const x = i * (barWidth + 1);
        const y = height - barHeight;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(0.5, '#0080ff');
        gradient.addColorStop(1, '#ff00ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Add peak indicators
        if (normalizedValue > 0.8) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y - 2, barWidth, 2);
        }
      }

      // Draw frequency labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      
      const labelPositions = [0, barCount * 0.25, barCount * 0.5, barCount * 0.75, barCount - 1];
      const frequencies = ['20Hz', '200Hz', '2kHz', '20kHz', '22kHz'];
      
      labelPositions.forEach((pos, index) => {
        const x = pos * (barWidth + 1) + barWidth / 2;
        ctx.fillText(frequencies[index], x, height - 5);
      });

      this.spectrumAnimationId = requestAnimationFrame(this.drawSpectrumAnalyzer);

    } catch (error) {
      Utils.handleError(error, 'CanvasVisualizers.drawSpectrumAnalyzer');
      this.spectrumAnimationId = requestAnimationFrame(this.drawSpectrumAnalyzer);
    }
  }

  /**
   * Draw waveform visualizer
   */
  drawWaveform() {
    if (!this.waveformCtx || !this.audioData) {
      this.waveformAnimationId = requestAnimationFrame(this.drawWaveform);
      return;
    }

    try {
      const canvas = this.waveformCanvas;
      const ctx = this.waveformCtx;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw center line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw waveform
      ctx.beginPath();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = this.visualSettings.waveformLineWidth;

      const sliceWidth = width / this.audioData.length;
      let x = 0;

      for (let i = 0; i < this.audioData.length; i++) {
        const value = this.audioData[i] / 128.0; // Normalize to -1 to 1
        const y = (value * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, centerY + y);
        } else {
          ctx.lineTo(x, centerY + y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Add glow effect
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      this.waveformAnimationId = requestAnimationFrame(this.drawWaveform);

    } catch (error) {
      Utils.handleError(error, 'CanvasVisualizers.drawWaveform');
      this.waveformAnimationId = requestAnimationFrame(this.drawWaveform);
    }
  }

  /**
   * Update visual settings
   */
  updateSettings(newSettings) {
    try {
      this.visualSettings = { ...this.visualSettings, ...newSettings };
      eventBus.emit('canvasVisualizers:settingsUpdated', this.visualSettings);
    } catch (error) {
      Utils.handleError(error, 'CanvasVisualizers.updateSettings');
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      circularActive: !!this.circularAnimationId,
      spectrumActive: !!this.spectrumAnimationId,
      waveformActive: !!this.waveformAnimationId,
      settings: this.visualSettings
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      // Cancel all animations
      this.pauseVisualizations();
      
      // Remove event listeners
      window.removeEventListener('resize', this.resizeCanvases);
      
      // Clear references
      this.audioData = null;
      this.frequencyData = null;
      
      eventBus.emit('canvasVisualizers:destroyed');
      
    } catch (error) {
      Utils.handleError(error, 'CanvasVisualizers.destroy');
    }
  }
}

// Export singleton instance
export const canvasVisualizers = new CanvasVisualizers();
