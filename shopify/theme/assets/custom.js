window.theme = window.theme || {};

theme.Sections = function Sections() {
  this.constructors = {};
  this.instances = [];

  document.addEventListener(
    "shopify:section:load",
    this._onSectionLoad.bind(this)
  );
  document.addEventListener(
    "shopify:section:unload",
    this._onSectionUnload.bind(this)
  );
  document.addEventListener(
    "shopify:section:select",
    this._onSelect.bind(this)
  );
  document.addEventListener(
    "shopify:section:deselect",
    this._onDeselect.bind(this)
  );
  document.addEventListener(
    "shopify:block:select",
    this._onBlockSelect.bind(this)
  );
  document.addEventListener(
    "shopify:block:deselect",
    this._onBlockDeselect.bind(this)
  );
};

theme.Sections.prototype = Object.assign({}, theme.Sections.prototype, {
  _createInstance: function (container, constructor) {
    var id = container.getAttribute("data-section-id");
    var type = container.getAttribute("data-section-type");

    constructor = constructor || this.constructors[type];

    if (typeof constructor === "undefined") {
      return;
    }

    var instance = Object.assign(new constructor(container), {
      id: id,
      type: type,
      container: container,
    });

    this.instances.push(instance);
  },

  _onSectionLoad: function (evt) {
    var container = document.querySelector(
      '[data-section-id="' + evt.detail.sectionId + '"]'
    );

    if (container) {
      this._createInstance(container);
    }
  },

  _onSectionUnload: function (evt) {
    this.instances = this.instances.filter(function (instance) {
      var isEventInstance = instance.id === evt.detail.sectionId;

      if (isEventInstance) {
        if (typeof instance.onUnload === "function") {
          instance.onUnload(evt);
        }
      }

      return !isEventInstance;
    });
  },

  _onSelect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = this.instances.find(function (instance) {
      return instance.id === evt.detail.sectionId;
    });

    if (
      typeof instance !== "undefined" &&
      typeof instance.onSelect === "function"
    ) {
      instance.onSelect(evt);
    }
  },

  _onDeselect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = this.instances.find(function (instance) {
      return instance.id === evt.detail.sectionId;
    });

    if (
      typeof instance !== "undefined" &&
      typeof instance.onDeselect === "function"
    ) {
      instance.onDeselect(evt);
    }
  },

  _onBlockSelect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = this.instances.find(function (instance) {
      return instance.id === evt.detail.sectionId;
    });

    if (
      typeof instance !== "undefined" &&
      typeof instance.onBlockSelect === "function"
    ) {
      instance.onBlockSelect(evt);
    }
  },

  _onBlockDeselect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = this.instances.find(function (instance) {
      return instance.id === evt.detail.sectionId;
    });

    if (
      typeof instance !== "undefined" &&
      typeof instance.onBlockDeselect === "function"
    ) {
      instance.onBlockDeselect(evt);
    }
  },

  register: function (type, constructor) {
    this.constructors[type] = constructor;

    document.querySelectorAll('[data-section-type="' + type + '"]').forEach(
      function (container) {
        this._createInstance(container, constructor);
      }.bind(this)
    );
  },
});

theme.collectionSlider = (function () {
  function sliderProduct(e) {
    let sliderContainer = "",
      extraLargeDesktopShow = 4,
      largeDesktopShow = 3,
      tabletShow = 3,
      mobileShow = 2,
      sliderRows = parseInt(e.dataset.sliderRows),
      sliderGrid = "column",
      sliderLoop = e.dataset.loop;

    if (sliderLoop === "true") {
      sliderLoop = true;
    } else {
      sliderLoop = false;
    }

    if (sliderRows > 1) {
      sliderGrid = "row";
      sliderLoop = false;
    }
    if (e.dataset.sliderEnable === "true") {
      sliderContainer = e.querySelector(".productSlider");
      extraLargeDesktopShow = parseInt(e.dataset.showExtraLarge);
      largeDesktopShow = parseInt(e.dataset.showLarge);
      tabletShow = parseInt(e.dataset.showTablet);
      mobileShow = parseInt(e.dataset.showMobile);
    }

    var swiper = new Swiper(sliderContainer, {
      loop: sliderLoop,
      slidesPerView: mobileShow,
      spaceBetween: 20,
      grid: {
        rows: sliderRows,
        fill: sliderGrid,
      },
      pagination: {
        el: e.querySelector(".swiper-pagination"),
        clickable: true,
      },
      navigation: {
        nextEl: e.querySelector(".product_slider_wrapper .swiper-button-next"),
        prevEl: e.querySelector(".product_slider_wrapper .swiper-button-prev"),
      },
      breakpoints: {
        640: {
          slidesPerView: mobileShow,
        },
        750: {
          slidesPerView: tabletShow,
        },
        992: {
          slidesPerView: largeDesktopShow,
        },
        1200: {
          slidesPerView: extraLargeDesktopShow,
        },
      },
    });
    // Slide thumbnail height
    const slideThumbHeight = () => {
      const proudctThumbnails = e.querySelectorAll(".card--client-height");
      if (proudctThumbnails.length > 0) {
        const productThumbnailHeight = proudctThumbnails[0];
        e.style.setProperty(
          "--slider-navigation-top-offset",
          `${productThumbnailHeight.clientHeight / 2}px`
        );
      }
    };
    slideThumbHeight();
    window.addEventListener("resize", () => {
      slideThumbHeight();
    });
  }
  return sliderProduct;
})();

document.addEventListener("DOMContentLoaded", function () {
  let sections = new theme.Sections(),
    headerSearchModule = new theme.Sections(),
    headerCartModule = new theme.Sections(),
    headerStickyModule = new theme.Sections();

  sections.register("announcement-bar", theme.announcement);
  sections.register("header", theme.headerSection);
  sections.register("header", theme.headerCategoryMenu);
  headerSearchModule.register("header", theme.headerSearch);
  headerStickyModule.register("header", theme.headerSticky);
  sections.register("footer", theme.footerSection);
  sections.register("slideShow", theme.SlideShow);
  sections.register("product-tab", theme.productTab);
  sections.register("collection-product", theme.collectionProduct);
  sections.register("product-slider", theme.collectionSlider);
  sections.register("counter_up", theme.counterup);
  sections.register("faq-collapse", theme.accordion);
  sections.register("popup-video", theme.video);
  sections.register("lookbook", theme.lookbookSlider);
  sections.register("timeline", theme.timelineSlider);
});
