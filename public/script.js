// Wait for the DOM to be fully loaded before running any scripts
document.addEventListener("DOMContentLoaded", (event) => {
  // Register the necessary GSAP plugins
  gsap.registerPlugin(ScrambleTextPlugin);
  
  // Animate the main title on page load
  gsap.to(".container > h1", {
    duration: 1,
    scrambleText: {
        text: "coRE truths",
        chars: "lowerCase",
        revealDelay: 0.5,
    },
    ease: "power1.inOut"
  });

  // Use Intersection Observer to detect when a page is in view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // When an item becomes visible in the viewport...
      if (entry.isIntersecting) {
        // Find all the elements to animate within that visible item
        const h1 = entry.target.querySelector("h1");
        const h3 = entry.target.querySelectorAll("h3");
        const p = entry.target.querySelector("p");
        const asciiArt = entry.target.querySelector(".truth-number pre");

        // Use a GSAP timeline for better control and synchronization
        const tl = gsap.timeline();
        
        // Animate the ASCII art if it exists
        if (asciiArt) {
          tl.from(asciiArt, {
              duration: 1.2,
              scrambleText: {
                  text: "************************************************************", // Scramble from this text
                  chars: "!@#$%^&*", // Use these characters for scrambling
                  revealDelay: 0.5
              },
              ease: "power2.out"
          }, 0); // Start animation at 0 seconds in the timeline
        }
        
        // Animate the main paragraph text if it exists
        if (p) {
          tl.from(p, {
              duration: 1.5,
              scrambleText: {
                  text: "********************************************************************************************************************************",
                  chars: "lowerCase" // Use lowercase letters for a "decoding" effect
              },
              ease: "power1.inOut"
          }, 0.4); // Stagger the start of this animation
        }

        // Animate the introductory H1 if it exists
        if (h1) {
          tl.from(h1, {
              duration: 1,
              scrambleText: { text: "***************", chars: "lowerCase"},
              ease: "power1.inOut"
          }, 0);
        }
        
        // Animate the introductory H3s if they exist
        if (h3.length > 0) {
          tl.from(h3, {
              duration: 1.2,
              scrambleText: { text: "***********************************", chars: "lowerCase"},
              ease: "power1.inOut",
              stagger: 0.3 // Animate each H3 one after another
          }, 0.2);
        }
        
        // Animation should only play once per element.
        // Stop observing this item so the animation doesn't re-trigger.
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.6 // Trigger when 60% of the item is visible
  });

  // Tell the observer to watch each of the carousel items
  document.querySelectorAll('.carousel-item').forEach((item) => {
    observer.observe(item);
  });
});