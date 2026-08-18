if (!customElements.get('mega-menu-slider')) {
customElements.define('mega-menu-slider', class MegamenuSlider extends HTMLElement {  
  constructor() {
    super();
    this.slider = this.querySelector('.mega__menu--products-slider');
    this.largeDesktop = parseInt(this.dataset.slideLargeDesktop);
    this.smallDesktop = parseInt(this.dataset.slideLargeDesktop);

    if (!this.slider ) return;

    this.initSlider();
  }

  initSlider() {
    
    let swiper = new Swiper(this.slider, {
      loop: false,
      slidesPerView: 1,
      spaceBetween: 20,
      navigation: {
        nextEl: this.querySelector(".swiper-button-next"),
        prevEl: this.querySelector(".swiper-button-prev"),
      },
      breakpoints: {
        640: {
          slidesPerView: 2,
        },
        750: {
          slidesPerView: 3,
        },
        992: {
          slidesPerView: this.smallDesktop,
        },
        1200: {
          slidesPerView: this.largeDesktop,
        },
      },
    });
  }



 });
}