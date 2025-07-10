document.addEventListener("DOMContentLoaded", (event) => {
  // Loading progress tracking
  const loadingScreen = document.getElementById('loading-screen');
  const fallbackLoader = loadingScreen.querySelector('.loading-fallback');
  const progressBar = fallbackLoader.querySelector('progress');
  
  // Show fallback if WebGL/Three.js fails
  const showFallback = () => {
    fallbackLoader.style.display = 'block';
    
    // Simulate progress if actual loading fails
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      progressBar.value = Math.min(progress, 90);
      if (progress >= 90) clearInterval(interval);
    }, 300);
  };
  
  // Check for WebGL support
  const isWebGLAvailable = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch(e) {
      return false;
    }
  };
  
  if (!isWebGLAvailable()) {
    showFallback();
    return;
  }

  gsap.registerPlugin(SplitText);

  // Optimized Three.js loading
  const initThreeJS = () => {
    if (!window.THREE) {
      setTimeout(initThreeJS, 100);
      return;
    }

    // Existing Three.js initialization code
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // ... (rest of the Three.js initialization code remains the same)

    // --- ENHANCED TORCH EFFECT ---
    const torch = document.getElementById('torch-overlay');

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    } else {
      const torchPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      
      window.addEventListener('mousemove', (e) => {
        gsap.to(torchPos, { duration: 0.6, x: e.clientX, y: e.clientY, ease: "power2.out" });
      });
      
      gsap.ticker.add(() => {
        torch.style.setProperty('--torch-x', `${torchPos.x}px`);
        torch.style.setProperty('--torch-y', `${torchPos.y}px`);
      });

      gsap.to(torch, {
        '--torch-size': '200px', duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true
      });

      gsap.to(torch, {
          '--torch-brightness': 0.15,
          duration: 0.2,
          ease: "rough({ template: none.out, strength: 2, points: 25, taper: 'out', randomize: true, clamp: false})",
          repeat: -1,
          yoyo: true
      });
      
      gsap.to(torch, {
        '--torch-flicker-opacity': 0.2,
        duration: 0.1,
        ease: "rough({ template: none.out, strength: 1.5, points: 30, taper: 'none', randomize: true, clamp: false})",
        repeat: -1,
        yoyo: true
      });
    }

    // --- ON-LOAD TITLE ANIMATION ---
    const mainTitleSplit = new SplitText(".container > h1", { type: "chars" });
    gsap.from(mainTitleSplit.chars, {
        duration: 0.6, opacity: 0, scale: 0, y: 20, rotationX: -90,
        transformOrigin: "0% 50% -50", ease: "back.out", stagger: 0.05
    });

    // --- ON-SCROLL PAGE ANIMATIONS ---
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const truthNumberHeading = entry.target.querySelector(".truth-number h3");
          const truthText = entry.target.querySelector(".truth-text");
          const introHeading = entry.target.querySelector(".intro-heading");
          const introSubheadings = entry.target.querySelectorAll(".intro-subheading");
          const tl = gsap.timeline();

          if (truthNumberHeading) {
            const h3Split = new SplitText(truthNumberHeading, { type: "words,chars" });
            tl.from(h3Split.chars, {
                duration: 0.6, opacity: 0, scale: 0, ease: "back.out", stagger: 0.08
            }, 0.1);
          }
          if (truthText) {
            const pSplit = new SplitText(truthText, { type: "chars" });
            tl.from(pSplit.chars, {
                duration: 0.8, opacity: 0, ease: "power1.in",
                stagger: { each: 0.025, from: "start" }
            }, 0.3);
          }
          if (introHeading) {
            const h1Split = new SplitText(introHeading, { type: "chars" });
            tl.from(h1Split.chars, {
                duration: 0.6, opacity: 0, scale: 0.5, ease: "back.out", stagger: 0.05
            });
          }
          if (introSubheadings.length > 0) {
            introSubheadings.forEach((subheading) => {
              const h3Split = new SplitText(subheading, { type: "chars" });
              tl.from(h3Split.chars, {
                duration: 0.8, opacity: 0, ease: "power1.in",
                stagger: { each: 0.025, from: "start" }
              }, "-=0.2");
            });
          }
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.5
    });

    document.querySelectorAll('.carousel-item').forEach(item => observer.observe(item));

    // Add keyboard navigation for carousel
    document.querySelectorAll('.carousel-item').forEach(item => {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'group');
      item.setAttribute('aria-roledescription', 'slide');
      
      item.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          const next = item.nextElementSibling || document.querySelector('.carousel-item');
          next.focus();
        } else if (e.key === 'ArrowLeft') {
          const prev = item.previousElementSibling || document.querySelector('.carousel-item:last-child');
          prev.focus();
        }
      });
    });
  };

  // Start initialization when scripts are loaded
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initThreeJS);
  } else {
    setTimeout(initThreeJS, 0);
  }
});

// Add PWA install prompt
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }

  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button (you'll need to add this to your HTML)
    const installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.className = 'install-button';
    installButton.style.position = 'fixed';
    installButton.style.bottom = '20px';
    installButton.style.right = '20px';
    installButton.style.zIndex = '1000';
    document.body.appendChild(installButton);
    
    installButton.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted install');
        }
        deferredPrompt = null;
      });
    });
  });
});

// Konami code easter egg
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

window.addEventListener('keydown', (e) => {
  if (e.key === konamiCode[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      konamiIndex = 0;
      // Trigger easter egg
      document.body.classList.add('konami-activated');
      setTimeout(() => document.body.classList.remove('konami-activated'), 5000);
    }
  } else {
    konamiIndex = 0;
  }
});

// Mobile touch improvements
let touchStartX = 0;
let touchEndX = 0;

const carousel = document.querySelector('.carousel');
carousel.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  e.currentTarget.classList.add('touch-active');
}, {passive: true});

carousel.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  e.currentTarget.classList.remove('touch-active');
  
  // Swipe threshold (50px)
  if (Math.abs(touchEndX - touchStartX) > 50) {
    if (touchEndX < touchStartX) {
      // Swipe left - next item
      const current = document.querySelector('.carousel-item:focus') || 
                     document.querySelector('.carousel-item');
      const next = current.nextElementSibling || document.querySelector('.carousel-item');
      next.focus();
    } else {
      // Swipe right - previous item
      const current = document.querySelector('.carousel-item:focus') || 
                     document.querySelector('.carousel-item');
      const prev = current.previousElementSibling || document.querySelector('.carousel-item:last-child');
      prev.focus();
    }
  }
}, {passive: true});

// Add touch feedback for interactive elements
const addTouchFeedback = (selector) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.addEventListener('touchstart', () => {
      el.classList.add('touch-feedback');
    }, {passive: true});
    
    el.addEventListener('touchend', () => {
      setTimeout(() => el.classList.remove('touch-feedback'), 200);
    }, {passive: true});
  });
};

addTouchFeedback('.carousel-item');
addTouchFeedback('.install-button');

// Hidden pixel-art animation (triggered by clicking torch 5 times)
let torchClickCount = 0;
const torch = document.getElementById('torch-overlay');
torch.addEventListener('click', () => {
  torchClickCount++;
  if (torchClickCount >= 5) {
    torchClickCount = 0;
    document.body.classList.add('pixel-party');
    setTimeout(() => document.body.classList.remove('pixel-party'), 3000);
  }
});