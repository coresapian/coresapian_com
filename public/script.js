document.addEventListener("DOMContentLoaded", (event) => {
  gsap.registerPlugin(SplitText);

  // --- ENHANCED TORCH EFFECT LOGIC ---
  const torch = document.getElementById('torch-overlay');

  // Disable the effect for touch-only devices for a better UX
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
  } else {
      const torchProps = { x: 0, y: 0 };
      // Use GSAP's quickSetter for optimized performance
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

      // Lifelike "breathing" effect for the torch size
      gsap.to(torch, {
          '--torch-size': '200px',
          duration: 4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true
      });

      // Lifelike "flickering" effect using a pseudo-element
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

  // --- ON-SCROLL PAGE ANIMATIONS (Intersection Observer) ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Query for all elements to animate in the visible slide
        const truthNumberHeading = entry.target.querySelector(".truth-number h3");
        const truthText = entry.target.querySelector(".truth-text");
        const introHeading = entry.target.querySelector(".intro-heading");
        const introSubheadings = entry.target.querySelectorAll(".intro-subheading");

        const tl = gsap.timeline();

        // Animate the "Truth X" heading if it exists
        if (truthNumberHeading) {
          const h3Split = new SplitText(truthNumberHeading, { type: "words,chars" });
          tl.from(h3Split.chars, {
              duration: 0.6, opacity: 0, scale: 0, ease: "back.out", stagger: 0.08
          }, 0.1);
        }
        
        // Animate the main paragraph text if it exists
        if (truthText) {
          const pSplit = new SplitText(truthText, { type: "chars" });
          tl.from(pSplit.chars, {
              duration: 0.8, opacity: 0, ease: "power1.in",
              stagger: { each: 0.025, from: "start" }
          }, 0.3);
        }

        // Animate the intro page H1 heading
        if (introHeading) {
          const h1Split = new SplitText(introHeading, { type: "chars" });
          tl.from(h1Split.chars, {
              duration: 0.6, opacity: 0, scale: 0.5, ease: "back.out", stagger: 0.05
          });
        }
        
        // Animate the intro page H3 subheadings
        if (introSubheadings.length > 0) {
          introSubheadings.forEach((subheading) => {
            const h3Split = new SplitText(subheading, { type: "chars" });
            tl.from(h3Split.chars, {
              duration: 0.8, opacity: 0, ease: "power1.in",
              stagger: { each: 0.025, from: "start" }
            }, "-=0.2");
          });
        }
        
        // The animation should only play once. Stop observing this element.
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.5 // Trigger when 50% of the slide is visible
  });

  document.querySelectorAll('.carousel-item').forEach(item => observer.observe(item));
});