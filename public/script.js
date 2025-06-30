document.addEventListener("DOMContentLoaded", (event) => {
  gsap.registerPlugin(SplitText);

  // --- IMPROVED TORCH EFFECT ---
  const torch = document.getElementById('torch-overlay');

  // Check for touch-only devices to disable the effect
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
  } else {
      const torchProps = { x: 0, y: 0 };
      const quickSetX = gsap.quickSetter(torch, "style", "--torch-x");
      const quickSetY = gsap.quickSetter(torch, "style", "--torch-y");

      // Use a GSAP tween for smooth, delayed movement (inertia)
      window.addEventListener('mousemove', (e) => {
          gsap.to(torchProps, {
              duration: 0.5,
              x: e.clientX,
              y: e.clientY,
              ease: "power3.out",
              onUpdate: () => {
                  quickSetX(`${torchProps.x}px`);
                  quickSetY(`${torchProps.y}px`);
              }
          });
      });

      // Torch "breathing" effect (gently changing size)
      gsap.to(torch, {
          '--torch-size': '200px',
          duration: 4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true
      });

      // Torch "flickering" effect
      gsap.to(torch, {
          '--torch-flicker-opacity': 0.1,
          duration: 0.1,
          ease: "rough({ template: none.out, strength: 1.5, points: 30, taper: 'none', randomize: true, clamp: false})",
          repeat: -1,
          yoyo: true
      });
  }

  // --- ON-LOAD TITLE ANIMATION ---
  gsap.set(".container > h1", { autoAlpha: 1 });
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

        // UPDATED: Animate "Truth X" heading with typing effect
        if (truthNumberHeading) {
          const h3Split = new SplitText(truthNumberHeading, { type: "words,chars" });
          tl.from(h3Split.chars, {
              duration: 0.6, opacity: 0, scale: 0, ease: "back.out",
              stagger: 0.08
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
});