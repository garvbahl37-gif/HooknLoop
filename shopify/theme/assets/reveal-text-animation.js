customElements.get("text-animation") ||
  customElements.define(
    "text-animation",
    class extends HTMLElement {
      constructor() {
        super();
        this.bannerHeading = this.querySelector(".reveal-text-animated-heading");
        if (!this.bannerHeading) {
          console.error("Element '.reveal-text-animated-heading' not found.");
          return;
        }
        this.sanitizeText = Array.from(this.bannerHeading.innerText);
        this.initPages();
        
        // Throttle scroll for better performance
        this.ticking = false;
        this.handleScroll = this.handleScroll.bind(this);
        
        window.addEventListener("scroll", () => {
          if (!this.ticking) {
            requestAnimationFrame(this.handleScroll);
            this.ticking = true;
          }
        });
        
        this.handleScroll();
      }
      
      initPages() {
        this.bannerHeading.innerText = ""; // Clear existing content
        this.sanitizeText.forEach((char) => {
          if (char === " ") {
            // Append a space as a text node
            this.bannerHeading.appendChild(document.createTextNode(" "));
          } else {
            // Wrap each character in a <span>
            const span = document.createElement("span");
            span.textContent = char;
            this.bannerHeading.appendChild(span);
          }
        });
      }
      
      handleScroll() {
        this.ticking = false;
        const spans = this.bannerHeading.querySelectorAll("span");
        
        // Check if we're near the bottom of the page (100-200px remaining)
        const scrollPosition = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const distanceFromBottom = documentHeight - (scrollPosition + windowHeight);
        const isNearBottom = distanceFromBottom <= 200 && distanceFromBottom >= 0;
        
        spans.forEach((char) => {
          const rect = char.getBoundingClientRect();
          const topOffset = rect.top - window.innerHeight * 0.5;
          
          // Your exact original calculations for top-to-bottom scrolling
          let opacityValue = Math.max(
            0,
            Math.min(1, 1 - (topOffset * 0.01 + rect.left * 0.001))
          );
          let translateY = Math.max(
            0,
            Math.min(1, 1 - (topOffset * 0.01 + rect.left * 0.001))
          );
          
          // Additional bottom-to-top animation when near page bottom
          if (isNearBottom && distanceFromBottom <= 150) {
            const bottomProgress = Math.max(0, Math.min(1, (150 - distanceFromBottom) / 150));
            
            // Enhance the animation when scrolling up near bottom
            opacityValue = Math.max(opacityValue, bottomProgress);
            translateY = Math.min(translateY, 1 - bottomProgress);
          }
          
          // Apply styles for animation - exactly as your original
          char.style.opacity = opacityValue.toFixed(4);
          char.style.display = "inline-block";
          char.style.position = "relative";
          char.style.transform = `translate3d(0px, ${translateY.toFixed(4)}px, 0px)`;
        });
      }
    }
  );