document.addEventListener("DOMContentLoaded", (event) => {
  gsap.registerPlugin(SplitText);

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
        '--torch-brightness': 0.35,
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

  const initTextAnimations = () => {
    // Wait for fonts before splitting text to avoid stale glyph metrics.
    const mainTitleSplit = new SplitText(".container > h1", { type: "chars" });
    gsap.from(mainTitleSplit.chars, {
        duration: 0.6, opacity: 0, scale: 0, y: 20, rotationX: -90,
        transformOrigin: "0% 50% -50", ease: "back.out", stagger: 0.05
    });

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
  };

  const fontsReady = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : Promise.resolve();
  fontsReady.then(initTextAnimations).catch(initTextAnimations);

  // --- KONAMI CODE EASTER EGG ---
  const konamiCode = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a'
  ];
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        document.body.classList.add('konami-active');
        konamiIndex = 0; // Reset for next time
      }
    } else {
      konamiIndex = 0;
    }
  });
});
