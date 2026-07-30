class AddGiftWrap extends HTMLElement {
  constructor() {
    super();

    this.giftWrapProductId = parseInt(this.dataset.giftWrapProductId);
    this.cartDrawer = document.querySelector("cart-notification");

    // When the gift-wrapping checkbox is checked or unchecked.
    this.querySelector('[name="attributes[gift-wrapping]"]').addEventListener(
      "change",
      (event) => {
        if (event.target.checked) {
          this.setGiftWrap();
        } else {
          this.removeGiftWrap();
        }
      }
    );

    // Validation variable
    this.cartItemsSize = this.dataset.cartItemsSize;
    this.giftWrapsInCart = this.dataset.giftWrapInCart;
    this.giftWrapProduct =
      this.dataset.giftWrapProduct == "true" ? true : false;

    // If we have nothing but gift-wrap items in the cart.
    if (this.cartItemsSize == 1 && this.giftWrapsInCart > 0) {
      this.removeGiftWrap();
    }
    // If we have more than one gift-wrap item in the cart.
    else if (this.giftWrapsInCart > 1) {
      this.setGiftWrap();
    }
    // If we have a gift-wrap item in the cart but our gift-wrapping cart attribute has not been set.
    else if (this.giftWrapsInCart > 0 && this.giftWrapProduct === false) {
      this.setGiftWrap();
    }
    // If we have no gift-wrap item in the cart but our gift-wrapping cart attribute has been set.
    else if (this.giftWrapsInCart == 0 && this.giftWrapProduct) {
      this.setGiftWrap();
    }
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      let renderSelector = document.getElementById(section.id);
      if (renderSelector) {
        renderSelector.innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.id]
        );
      }
    });
  }
  setGiftWrap() {
    document
      .querySelector(".cart_action_drawer_overlay")
      .classList.add("active");
    const body = JSON.stringify({
      updates: {
        [this.giftWrapProductId]: 1,
      },
      attributes: {
        "gift-wrapping": true,
      },
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        let parsedState = JSON.parse(state);
        this.renderContents(parsedState);
      })
      .catch(() => {
        console.error(e);
      })
      .finally(() => {
        document
          .querySelector(".cart_action_drawer_overlay")
          .classList.remove("active");
      });
  }

  removeGiftWrap() {
    document
      .querySelector(".cart_action_drawer_overlay")
      .classList.add("active");

    const body = JSON.stringify({
      updates: {
        [this.giftWrapProductId]: 0,
      },
      attributes: {
        "gift-wrapping": "",
      },
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        let parsedState = JSON.parse(state);
        this.renderContents(parsedState);
      })
      .catch(() => {
        console.error(e);
      })
      .finally(() => {
        document
          .querySelector(".cart_action_drawer_overlay")
          .classList.remove("active");
      });
  }

  
  getSectionsToRender() {
    return [
      {
        id: "mini-cart-drawer",
      },
      {
        id: "cart-notification-count",
      },
      {
        id: "gift-wrapping",
      },
    ];
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }
}
customElements.define("add-gift-wrap", AddGiftWrap);
