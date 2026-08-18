class ProductBundle extends HTMLElement {
  constructor() {
    super();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.form = this.querySelector("form.bundle-products");
    this.products = this.querySelectorAll(".bundle-product");
    this.submitButton = this.querySelector(".bundle-submit");
    this.hotspots = this.querySelectorAll(".bundle-hotspot");
    this.totalPrice = this.querySelector(".bundle-total__price");
    this.cart =
      document.querySelector("cart-notification") ||
      document.querySelector("cart-drawer");

    if (this.form) this.bindEvents();
  }

  bindEvents() {
    // Handle form submission
    if (this.form) {
      this.form.addEventListener("submit", (evt) => this.handleSubmit(evt));
    }

    // Handle variant changes
    this.querySelectorAll(".bundle-product__variants").forEach((select) => {
      select.addEventListener("change", (evt) => this.handleVariantChange(evt));
    });

    // Handle product selection
    this.querySelectorAll(".bundle-product__checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.handleProductSelection());
    });

    // Handle hotspot hover
    if (this.hotspots) {
      this.hotspots.forEach((hotspot) => {
        hotspot.addEventListener("mouseenter", (evt) =>
          this.handleHotspotHover(evt)
        );
        hotspot.addEventListener("mouseleave", () => this.handleHotspotLeave());
      });
    }

    // Calculate initial total price
    this.updateTotalPrice();
  }

  handleVariantChange(evt) {
    const select = evt.target;
    const option = select.options[select.selectedIndex];
    const productWrapper = select.closest(".bundle-product");
    const checkbox = productWrapper.querySelector(".bundle-product__checkbox");
    const priceElement = productWrapper.querySelector(".price");
    const comparePriceElement = productWrapper.querySelector(".compare-price");
    const price = option.dataset.price;
    const comparePrice = option.dataset.compare;

    // Update checkbox data
    checkbox.value = select.value;
    checkbox.dataset.initialPrice = price;

    // Update price display
    if (priceElement) {
      priceElement.innerHTML = this.formatMoney(price);
    }

    // Update compare price if it exists
    if (comparePriceElement) {
      if (comparePrice && parseInt(comparePrice) > parseInt(price)) {
        comparePriceElement.innerHTML = this.formatMoney(comparePrice);
        comparePriceElement.style.display = "";
      } else {
        comparePriceElement.style.display = "none";
      }
    }

    this.updateTotalPrice();
  }

  handleProductSelection() {
    this.updateTotalPrice();
  }

  updateTotalPrice() {
    if (!this.totalPrice) return;

    const total = Array.from(
      this.querySelectorAll(".bundle-product__checkbox:checked")
    ).reduce((sum, checkbox) => {
      const price = parseInt(checkbox.dataset.initialPrice) || 0;
      return sum + price;
    }, 0);

    this.totalPrice.innerHTML = this.formatMoney(total);
  }

  formatMoney(cents) {
    if (typeof window.Shopify.formatMoney === "function") {
      return window.Shopify.formatMoney(cents);
    }
    return `$${(cents / 100).toFixed(2)}`;
  }

  async handleSubmit(evt) {
    evt.preventDefault();

    if (this.submitButton) {
      this.submitButton.classList.add("loading");
      this.submitButton.setAttribute("disabled", true);
    }

    // Get selected products
    const selectedProducts = Array.from(
      this.querySelectorAll(".bundle-product__checkbox:checked")
    ).map((checkbox) => {
      const wrapper = checkbox.closest(".bundle-product");
      const variantSelect = wrapper.querySelector(
        '.bundle-product__variants, input[name="id[]"]'
      );
      return {
        id: parseInt(variantSelect.value),
        quantity: 1,
      };
    });

    if (selectedProducts.length === 0) {
      if (this.submitButton) {
        this.submitButton.classList.remove("loading");
        this.submitButton.removeAttribute("disabled");
      }
      return;
    }

    // Get Cart API
    let config = fetchConfig("javascript");
    config.headers["X-Requested-With"] = "XMLHttpRequest";
    delete config.headers["Content-Type"];

    const formData = new FormData();
    formData.append("form_type", "product");
    formData.append("utf8", "✓");

    // Add selected products
    selectedProducts.forEach((item, index) => {
      formData.append(`items[${index}][id]`, item.id);
      formData.append(`items[${index}][quantity]`, item.quantity);
    });

    // Add sections for cart drawer update
    const cartNotification = document.querySelector("cart-notification");
    if (cartNotification) {
      formData.append(
        "sections",
        cartNotification
          .getSectionsToRender()
          .map((section) => section.id)
          .join(",")
      );
      cartNotification.setActiveElement(document.activeElement);
    }

    // Add sections for cart items update
    const cartItems = document.querySelector("cart-items");
    if (cartItems) {
      formData.append(
        "sections",
        cartItems
          .getSectionsToRender()
          .map((section) => section.section)
          .join(",")
      );
    }

    formData.append("sections_url", window.location.pathname);
    config.body = formData;

    try {
      const response = await fetch(window.routes.cart_add_url, config);
      const data = await response.json();

      if (data.status) {
        throw new Error(data.description);
      }

      // Update cart notification
      if (cartNotification) {
        cartNotification.renderContents(data);
      }

      // Update cart items if they exist
      if (cartItems) {
        cartItems.renderContents(data);
      }
    } catch (error) {
      console.error("Error:", error);
      this.handleErrorMessage(error.message);
    } finally {
      if (this.submitButton) {
        this.submitButton.classList.remove("loading");
        this.submitButton.removeAttribute("disabled");
      }
    }
  }

  handleHotspotHover(evt) {
    const index = evt.target.dataset.productIndex;
    if (!this.products) return;

    this.products.forEach((product, i) => {
      if (i.toString() !== index) {
        product.style.opacity = "0.5";
      }
    });
  }

  handleHotspotLeave() {
    if (!this.products) return;
    this.products.forEach((product) => {
      product.style.opacity = "1";
    });
  }

  handleErrorMessage(errorMessage = false) {
    const errorElement = this.querySelector(".bundle-error");
    if (errorElement) {
      errorElement.textContent = errorMessage || "";
      errorElement.classList.toggle("hidden", !errorMessage);
    }
  }
}

customElements.define("product-bundle", ProductBundle);
