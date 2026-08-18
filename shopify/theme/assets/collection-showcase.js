class FeaturedCollections extends HTMLElement {
  constructor() {
    super();
    this.activeIndex = 0;
    this.init();
  }

  init() {
    this.collections = this.querySelectorAll('.featured__collections-images');
    this.items = this.querySelectorAll('.featured__collections-item');
    
    this.items.forEach((item, index) => {
      // Find the actual link inside each collection item
      const link = item.querySelector('a.featured__collections-link');
      
      item.addEventListener('click', (e) => {
        // Prevent the default only if clicking on the item itself, not the link
        if (e.target === item) {
          e.preventDefault();
        }
        this.setActiveCollection(index);
      });

      item.addEventListener('mouseenter', () => {
        if (window.innerWidth >= 750) {
          this.setActiveCollection(index, false); // Pass false to indicate it's not a click
        }
      });
    });

    if (Shopify.designMode) {
      document.addEventListener('shopify:block:select', (event) => {
        const blockId = event.detail.blockId;
        const collectionIndex = Array.from(this.collections).findIndex(
          collection => collection.id === `tab-collection-${blockId}`
        );
        if (collectionIndex !== -1) {
          this.setActiveCollection(collectionIndex);
        }
      });
    }

    this.initMobileSwipe();
  }

  setActiveCollection(index, isClick = true) {
    // Update active states
    this.activeIndex = index;

    this.items.forEach((item, i) => {
      item.classList.toggle('is-active', i === index);
    });

    this.collections.forEach((collection, i) => {
      if (i === index) {
        collection.classList.add('is-active');
        collection.removeAttribute('hidden');
        
        // Reset image animations
        const images = collection.querySelectorAll('.collection__image');
        images.forEach(image => {
          image.style.transition = 'none';
          image.offsetHeight; // Force reflow
          image.style.transition = '';
        });
      } else {
        collection.classList.remove('is-active');
        collection.setAttribute('hidden', '');
      }
    });

    // Navigate to collection page after delay if clicked
    if (isClick && event?.type === 'click') {
      const activeItem = this.items[index];
      if (activeItem) {
        const link = activeItem.querySelector('a.featured__collections-link');
        if (link && link.href) {
          setTimeout(() => {
            window.location.href = link.href;
          }, 800);
        }
      }
    }
  }

  initMobileSwipe() {
    let touchStartX = 0;
    let touchEndX = 0;

    this.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    this.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
    }, { passive: true });
  }

  handleSwipe(startX, endX) {
    const SWIPE_THRESHOLD = 50;
    const diff = startX - endX;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0 && this.activeIndex < this.items.length - 1) {
        // Swipe left - next
        this.setActiveCollection(this.activeIndex + 1);
      } else if (diff < 0 && this.activeIndex > 0) {
        // Swipe right - previous
        this.setActiveCollection(this.activeIndex - 1);
      }
    }
  }
}

if (!customElements.get('featured-collections')) {
  customElements.define('featured-collections', FeaturedCollections);
}