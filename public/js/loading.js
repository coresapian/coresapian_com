import { eventBus } from './modules/Utils.js';

// Loading UI Controller
class LoadingUI {
  constructor() {
    this.overlay = document.getElementById('loading-overlay');
    this.progressBar = document.querySelector('.loading-progress');
    this.loadingText = document.querySelector('.loading-text');
    
    // Setup event listeners
    eventBus.on('threeJS:loadingStart', (data) => this.onLoadingStart(data));
    eventBus.on('threeJS:loadingProgress', (data) => this.onProgress(data));
    eventBus.on('threeJS:loadingComplete', () => this.onComplete());
    eventBus.on('threeJS:loadingError', (data) => this.onError(data));
  }
  
  onLoadingStart(data) {
    this.overlay.style.display = 'flex';
    this.loadingText.textContent = `Loading ${data.total} assets...`;
  }
  
  onProgress(data) {
    this.progressBar.style.width = `${data.progress}%`;
    this.loadingText.textContent = `Loading... ${data.progress}%`;
  }
  
  onComplete() {
    this.progressBar.style.width = '100%';
    this.loadingText.textContent = 'Complete!';
    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 500);
  }
  
  onError(data) {
    this.loadingText.textContent = `Error loading: ${data.url}`;
    this.progressBar.style.background = '#f44336';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new LoadingUI();
});
