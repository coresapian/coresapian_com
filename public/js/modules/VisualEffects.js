/**
 * VisualEffects - Manages visual effects including pixel loader, particles, and glow effects
 */

import { CONSTANTS, Utils, eventBus } from './Utils.js';

// Utility function for random range
const rand = (min, max) => {
  return Math.random() * (max - min) + min;
};

// Enhanced Pixel class for sophisticated loading animation
class Pixel {
  constructor(x, y, color, speed, delay, delayHide, step, boundSize) {
    this.x = x;
    this.y = y;
    
    this.color = color;
    this.speed = rand(0.1, 0.9) * speed;

    this.size = 0;
    this.sizeStep = rand(0, 0.5);
    this.minSize = 0.5;
    this.maxSizeAvailable = boundSize || 2;
    this.maxSize = rand(this.minSize, this.maxSizeAvailable);
    this.sizeDirection = 1;
    
    this.delay = delay;
    this.delayHide = delayHide;
    this.counter = 0;
    this.counterHide = 0;
    this.counterStep = step;

    this.isHidden = false;
    this.isFlicking = false;
  }

  draw(ctx) {
    const centerOffset = this.maxSizeAvailable * 0.5 - this.size * 0.5;

    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x + centerOffset,
      this.y + centerOffset,
      this.size,
      this.size
    );
  }

  show() {
    this.isHidden = false;
    this.counterHide = 0;

    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }

    if (this.size >= this.maxSize) {
      this.isFlicking = true;
    }

    if (this.isFlicking) {
      this.flicking();
    } else {
      this.size += this.sizeStep;
    }
  }

  hide() {
    this.counter = 0;

    if (this.counterHide <= this.delayHide) {
      this.counterHide += this.counterStep;
      if (this.isFlicking) {
        this.flicking();
      }
      return;
    }
    
    this.isFlicking = false;

    if (this.size <= 0) {
      this.size = 0;
      this.isHidden = true;
      return;
    } else {
      this.size -= 0.05;
    }
  }

  flicking() {
    if (this.size >= this.maxSize) {
      this.sizeDirection = -1;
    } else if (this.size <= this.minSize) {
      this.sizeDirection = 1;
    }
    
    this.size += this.sizeDirection * this.speed; 
  }
}

export class VisualEffects {
  constructor() {
    this.isInitialized = false;
    this.pixelLoaderCanvas = null;
    this.pixelLoaderCtx = null;
    this.floatingParticlesContainer = null;
    this.audioWaveContainer = null;
    
    // Enhanced pixel loader properties
    this.pixels = [];
    this.pixelAnimationId = null;
    this.pixelLastTime = 0;
    this.pixelInterval = 1000 / 60; // 60 FPS
    this.pixelTicker = 0;
    this.pixelMaxTicker = 360;
    this.pixelAnimationDirection = 1;
    this.pixelWidth = 0;
    this.pixelHeight = 0;
    this.pixelResizeObserver = null;
    this.pixelLoaderActive = false;
    
    // Floating particles
    this.particles = [];
    this.particleAnimationId = null;
    
    // Audio reactive properties
    this.audioData = null;
    this.glowIntensity = 0;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.destroy = this.destroy.bind(this);
    this.animatePixelLoader = this.animatePixelLoader.bind(this);
    this.resizePixelLoader = this.resizePixelLoader.bind(this);
  }

  /**
   * Initialize visual effects
   */
  async init() {
    try {
      console.log('🎨 Initializing Visual Effects...');
      
      await this.initPixelLoader();
      this.initFloatingParticles();
      this.initAudioWave();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Visual Effects initialized');
      
      eventBus.emit('visualEffects:initialized');
      
    } catch (error) {
      console.error('❌ Visual Effects initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize enhanced pixel loader
   */
  async initPixelLoader() {
    try {
      this.pixelLoaderCanvas = document.getElementById('pixel-loader-canvas');
      if (!this.pixelLoaderCanvas) {
        console.warn('Pixel loader canvas not found, creating one...');
        this.pixelLoaderCanvas = document.createElement('canvas');
        this.pixelLoaderCanvas.id = 'pixel-loader-canvas';
        this.pixelLoaderCanvas.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          pointer-events: none;
          background: var(--bg-color);
          transition: opacity 0.5s ease-out;
        `;
        document.body.appendChild(this.pixelLoaderCanvas);
      }
      
      this.pixelLoaderCtx = this.pixelLoaderCanvas.getContext('2d');
      this.pixelLoaderActive = true;
      
      // Setup resize observer for responsive behavior
      this.setupPixelLoaderResize();
      
      // Initial resize and start animation
      this.resizePixelLoader();
      
      // Listen for app initialization complete
      eventBus.on('app:initialized', () => {
        this.hidePixelLoader();
      });
      
    } catch (error) {
      console.error('Error initializing pixel loader:', error);
      throw error;
    }
  }

  /**
   * Hide pixel loader with smooth transition
   */
  hidePixelLoader() {
    if (!this.pixelLoaderCanvas || !this.pixelLoaderActive) return;
    
    console.log('🎨 Hiding pixel loader...');
    
    // Fade out the loader
    this.pixelLoaderCanvas.style.opacity = '0';
    
    // Remove after transition
    setTimeout(() => {
      if (this.pixelLoaderCanvas && this.pixelLoaderCanvas.parentElement) {
        this.pixelLoaderCanvas.remove();
        this.pixelLoaderCanvas = null;
      }
      this.pixelLoaderActive = false;
      
      // Stop animation loop
      if (this.pixelAnimationId) {
        cancelAnimationFrame(this.pixelAnimationId);
        this.pixelAnimationId = null;
      }
      
      console.log('✅ Pixel loader hidden');
    }, 500);
  }

  /**
   * Setup pixel loader resize handling
   */
  setupPixelLoaderResize() {
    if ('ResizeObserver' in window) {
      this.pixelResizeObserver = new ResizeObserver(() => {
        this.resizePixelLoader();
      });
      this.pixelResizeObserver.observe(document.body);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', Utils.debounce(this.resizePixelLoader, 100));
    }
    
    // Also trigger resize on click for testing
    document.addEventListener('click', this.resizePixelLoader);
  }

  /**
   * Get delay for wave effect
   */
  getPixelDelay(x, y, direction = false) {
    let dx = x - this.pixelWidth * 0.5;
    let dy = y - this.pixelHeight;
    
    if (direction) {
      dy = y;
    }
    
    return Math.sqrt(dx ** 2 + dy ** 2);
  }

  /**
   * Initialize pixels for animation
   */
  initPixels() {
    const h = Math.floor(rand(0, 360));
    const colorsLen = 5;
    const colors = Array.from({ length: colorsLen }, (_, index) => 
      `hsl(${Math.floor(rand(h, h + (index + 1) * 10))} 100% ${rand(50, 100)}%)`
    );
    
    const gap = 6;
    const step = (this.pixelWidth + this.pixelHeight) * 0.005;
    const speed = rand(0.008, 0.25);
    const maxSize = Math.floor(gap * 0.5);
    
    this.pixels = [];
    
    for (let x = 0; x < this.pixelWidth; x += gap) {
      for (let y = 0; y < this.pixelHeight; y += gap) {
        if (x + maxSize > this.pixelWidth || y + maxSize > this.pixelHeight) {
          continue;
        }

        const color = colors[Math.floor(Math.random() * colorsLen)];
        const delay = this.getPixelDelay(x, y);
        const delayHide = this.getPixelDelay(x, y);

        this.pixels.push(new Pixel(x, y, color, speed, delay, delayHide, step, maxSize));
      }
    }
  }

  /**
   * Animate pixel loader
   */
  animatePixelLoader() {
    this.pixelAnimationId = requestAnimationFrame(this.animatePixelLoader);
    
    const now = performance.now();
    const diff = now - (this.pixelLastTime || 0);

    if (diff < this.pixelInterval) {
      return;
    }

    this.pixelLastTime = now - (diff % this.pixelInterval);

    this.pixelLoaderCtx.clearRect(0, 0, this.pixelWidth, this.pixelHeight);

    if (this.pixelTicker >= this.pixelMaxTicker) {
      this.pixelAnimationDirection = -1;
    } else if (this.pixelTicker <= 0) {
      this.pixelAnimationDirection = 1;
    }
    
    let allHidden = true;

    this.pixels.forEach((pixel) => {
      if (this.pixelAnimationDirection > 0) {
        pixel.show();
      } else {
        pixel.hide();
        allHidden = allHidden && pixel.isHidden;
      }

      pixel.draw(this.pixelLoaderCtx);
    });
    
    this.pixelTicker += this.pixelAnimationDirection;
    
    if (this.pixelAnimationDirection < 0 && allHidden) {
      this.pixelTicker = 0;
    }
  }

  /**
   * Resize pixel loader
   */
  resizePixelLoader() {
    if (!this.pixelLoaderCanvas) return;
    
    // Cancel current animation
    if (this.pixelAnimationId) {
      cancelAnimationFrame(this.pixelAnimationId);
    }
    
    // Update canvas size
    this.pixelWidth = Math.floor(window.innerWidth);
    this.pixelHeight = Math.floor(window.innerHeight);
    
    this.pixelLoaderCanvas.width = this.pixelWidth;
    this.pixelLoaderCanvas.height = this.pixelHeight;
    
    // Reinitialize pixels
    this.initPixels();
    
    // Reset animation state
    this.pixelTicker = 0;
    
    // Start animation
    this.animatePixelLoader();
  }

  /**
   * Initialize floating particles
   */
  initFloatingParticles() {
    try {
      this.floatingParticlesContainer = document.getElementById('floating-particles');
      if (!this.floatingParticlesContainer) {
        console.warn('Floating particles container not found');
        return;
      }

      this.createFloatingParticles();
      this.animateFloatingParticles();
      
    } catch (error) {
      console.error('Error initializing floating particles:', error);
    }
  }

  /**
   * Create floating particles
   */
  createFloatingParticles() {
    const particleCount = 50;
    this.particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 + 180, // Blue-cyan range
        element: null
      };

      // Create DOM element for particle
      const element = document.createElement('div');
      element.className = 'floating-particle';
      element.style.cssText = `
        position: absolute;
        width: ${particle.size}px;
        height: ${particle.size}px;
        background: hsl(${particle.hue}, 70%, 60%);
        border-radius: 50%;
        opacity: ${particle.opacity};
        pointer-events: none;
        transform: translate(${particle.x}px, ${particle.y}px);
        box-shadow: 0 0 ${particle.size * 2}px hsl(${particle.hue}, 70%, 60%);
      `;

      particle.element = element;
      this.floatingParticlesContainer.appendChild(element);
      this.particles.push(particle);
    }
  }

  /**
   * Animate floating particles
   */
  animateFloatingParticles() {
    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around screen edges
      if (particle.x < 0) particle.x = window.innerWidth;
      if (particle.x > window.innerWidth) particle.x = 0;
      if (particle.y < 0) particle.y = window.innerHeight;
      if (particle.y > window.innerHeight) particle.y = 0;

      // Apply audio reactivity if available
      if (this.audioData) {
        const audioIntensity = this.audioData.average / 255;
        particle.opacity = Math.min(0.8, particle.opacity + audioIntensity * 0.1);
        particle.size = Math.max(1, particle.size + audioIntensity * 2);
      }

      // Update DOM element
      if (particle.element) {
        particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
        particle.element.style.opacity = particle.opacity;
        particle.element.style.width = particle.element.style.height = `${particle.size}px`;
      }
    });

    this.particleAnimationId = requestAnimationFrame(() => this.animateFloatingParticles());
  }

  /**
   * Initialize audio wave visualization
   */
  initAudioWave() {
    try {
      this.audioWaveContainer = document.getElementById('audio-wave');
      if (!this.audioWaveContainer) {
        console.warn('Audio wave container not found');
        return;
      }

      // Setup audio wave styles
      this.audioWaveContainer.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100px;
        background: linear-gradient(to top, rgba(0, 255, 255, 0.1), transparent);
        pointer-events: none;
        z-index: 10;
      `;
      
    } catch (error) {
      console.error('Error initializing audio wave:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for audio data updates
    eventBus.on('audio:dataUpdated', (data) => {
      this.updateAudioReactiveEffects(data);
    });

    // Window resize handling
    window.addEventListener('resize', Utils.debounce(() => {
      this.handleResize();
    }, 100));
  }

  /**
   * Update audio reactive effects
   */
  updateAudioReactiveEffects(audioData) {
    try {
      this.audioData = audioData;
      
      if (!audioData || !audioData.frequencyData) return;

      // Update glow intensity based on audio
      this.glowIntensity = audioData.average / 255;

      // Update audio wave visualization
      this.updateAudioWave(audioData);

      // Update particle effects
      this.updateParticleEffects(audioData);
      
    } catch (error) {
      console.error('Error updating audio reactive effects:', error);
    }
  }

  /**
   * Update audio wave visualization
   */
  updateAudioWave(audioData) {
    if (!this.audioWaveContainer || !audioData.frequencyData) return;

    const intensity = audioData.average / 255;
    const height = Math.max(20, intensity * 150);
    
    this.audioWaveContainer.style.height = `${height}px`;
    this.audioWaveContainer.style.background = `
      linear-gradient(to top, 
        rgba(0, 255, 255, ${intensity * 0.3}), 
        rgba(0, 150, 255, ${intensity * 0.1}),
        transparent
      )
    `;
  }

  /**
   * Update particle effects based on audio
   */
  updateParticleEffects(audioData) {
    if (!this.particles.length) return;

    const bassIntensity = audioData.bass / 255;
    const trebleIntensity = audioData.treble / 255;

    this.particles.forEach((particle, index) => {
      // Vary effects based on frequency ranges
      if (index % 3 === 0) {
        // Bass-reactive particles
        particle.vx += (bassIntensity - 0.5) * 0.1;
        particle.vy += (bassIntensity - 0.5) * 0.1;
      } else if (index % 3 === 1) {
        // Treble-reactive particles
        particle.size = Math.max(1, 2 + trebleIntensity * 3);
      } else {
        // Mid-range reactive particles
        particle.opacity = Math.min(0.8, 0.3 + audioData.average / 255 * 0.5);
      }
    });
  }

  /**
   * Handle window resize
   */
  handleResize() {
    try {
      // Recreate floating particles for new screen size
      if (this.floatingParticlesContainer) {
        this.floatingParticlesContainer.innerHTML = '';
        this.createFloatingParticles();
      }
      
    } catch (error) {
      console.error('Error handling resize:', error);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      initialized: this.isInitialized,
      pixelLoader: {
        active: this.pixelAnimationId !== null,
        pixelCount: this.pixels.length,
        animationDirection: this.pixelAnimationDirection,
        ticker: this.pixelTicker
      },
      particles: {
        count: this.particles.length,
        active: this.particleAnimationId !== null
      },
      audioReactive: {
        glowIntensity: this.glowIntensity,
        hasAudioData: !!this.audioData
      }
    };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    try {
      if (newSettings.particleCount && newSettings.particleCount !== this.particles.length) {
        this.floatingParticlesContainer.innerHTML = '';
        this.createFloatingParticles();
      }

      if (newSettings.pixelAnimation !== undefined) {
        if (newSettings.pixelAnimation && !this.pixelAnimationId) {
          this.animatePixelLoader();
        } else if (!newSettings.pixelAnimation && this.pixelAnimationId) {
          cancelAnimationFrame(this.pixelAnimationId);
          this.pixelAnimationId = null;
        }
      }
      
    } catch (error) {
      console.error('Error updating visual effects settings:', error);
    }
  }

  /**
   * Cleanup and destroy visual effects
   */
  destroy() {
    try {
      // Cancel animations
      if (this.pixelAnimationId) {
        cancelAnimationFrame(this.pixelAnimationId);
        this.pixelAnimationId = null;
      }

      if (this.particleAnimationId) {
        cancelAnimationFrame(this.particleAnimationId);
        this.particleAnimationId = null;
      }

      // Cleanup resize observer
      if (this.pixelResizeObserver) {
        this.pixelResizeObserver.disconnect();
        this.pixelResizeObserver = null;
      }

      // Clear particles
      if (this.floatingParticlesContainer) {
        this.floatingParticlesContainer.innerHTML = '';
      }

      // Clear pixel loader
      if (this.pixelLoaderCanvas && this.pixelLoaderCtx) {
        this.pixelLoaderCtx.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
      }

      // Reset state
      this.particles = [];
      this.pixels = [];
      this.audioData = null;
      this.isInitialized = false;

      console.log('🧹 Visual Effects destroyed');
      
    } catch (error) {
      console.error('Error destroying visual effects:', error);
    }
  }
}

// Create and export singleton instance
export const visualEffects = new VisualEffects();
