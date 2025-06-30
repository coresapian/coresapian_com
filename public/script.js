document.addEventListener("DOMContentLoaded", (event) => {
  // Register the necessary GSAP plugin
  gsap.registerPlugin(SplitText);
  
  // --- ANIMATION FOR THE MAIN TITLE ON PAGE LOAD ---
  // Make sure the container h1 is visible before splitting
  gsap.set(".container > h1", { autoAlpha: 1 }); 
  const mainTitle = document.querySelector(".container > h1");
  const mainTitleSplit = new SplitText(mainTitle, { type: "chars" });
  
  gsap.from(mainTitleSplit.chars, {
    duration: 0.6,
    opacity: 0,
    scale: 0,
    y: 20,
    rotationX: -90,
    transformOrigin: "0% 50% -50",
    ease: "back.out",
    stagger: 0.05
  });

  // --- INTERSECTION OBSERVER TO ANIMATE ITEMS ON SCROLL ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Find all animatable elements within the visible slide
        const truthNumber = entry.target.querySelector(".truth-number h1");
        const truthText = entry.target.querySelector(".truth-text");
        const introHeading = entry.target.querySelector(".intro-heading");
        const introSubheadings = entry.target.querySelectorAll(".intro-subheading");

        // Create a GSAP timeline for better control
        const tl = gsap.timeline();

        // Animate the big number if it exists
        if (truthNumber) {
          tl.from(truthNumber, {
            duration: 0.8,
            opacity: 0,
            scale: 0.7,
            ease: "back.out(1.4)"
          }, 0.1);
        }
        
        // Animate the main paragraph with a human-like typewriter effect
        if (truthText) {
          const pSplit = new SplitText(truthText, { type: "chars" });
          tl.from(pSplit.chars, {
            duration: 0.8,
            opacity: 0,
            ease: "power1.in",
            // This creates the typing effect
            stagger: {
              each: 0.03, // Base speed
              from: "start"
            }
          }, 0.3); // Start slightly after the number appears
        }

        // Animate the introduction heading
        if (introHeading) {
          const h1Split = new SplitText(introHeading, { type: "chars" });
          tl.from(h1Split.chars, {
              duration: 0.6,
              opacity: 0,
              scale: 0.5,
              ease: "back.out",
              stagger: 0.05
          });
        }
        
        // Animate introduction subheadings
        if (introSubheadings.length > 0) {
          introSubheadings.forEach((subheading) => {
            const h3Split = new SplitText(subheading, { type: "chars" });
            tl.from(h3Split.chars, {
              duration: 0.8,
              opacity: 0,
              ease: "power1.in",
              stagger: {
                each: 0.03,
                from: "start"
              }
            }, "-=0.2"); // Overlap animations slightly
          });
        }
        
        // Stop observing this element so the animation only plays once.
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.5 // Trigger when 50% of the slide is visible
  });

  // Tell the observer to watch each carousel item
  document.querySelectorAll('.carousel-item').forEach((item) => {
    observer.observe(item);
  });
});