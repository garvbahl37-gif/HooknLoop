class CartRemoveButton2 extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      this.closest("cart-notification").updateQuantity(this.dataset.index, 0);
      this.closest(".cart-notification-product").classList.add("loading");
      this.closest(
        ".cart-notification-product"
      ).firstElementChild.classList.remove("hidden");
    });
  }
}
customElements.define("cart-remove-button-2", CartRemoveButton2);


class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById("mini-cart-drawer");
    this.header = document.querySelector("sticky-header");
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );

    this.notification?.addEventListener("click", (event) => {
      if (!event.target.classList.contains("cart-notification__close")) return;
      this.close();
    });

    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );
    

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener("change", this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    if (
      !event.target.closest("select") &&
      !event.target.closest('[name="attributes[gift-wrapping]"]') &&
      !event.target.closest('[name="note"]') &&
      !event.target.closest("shipping-calculator") &&
      !event.target.closest("discount-code") &&
      !event.target.closest("gift-wrap-message")
    ) {
      this.updateQuantity(
        event.target.dataset.index,
        event.target.value,
        document.activeElement.getAttribute("name"),
        event.target.dataset.quantityVariantId
      );
      document
        .querySelector(".cart_action_drawer_overlay")
        .classList.add("active");
    }
  }

  open() {
    this.notification.classList.add("animate", "active");
    document.querySelector("body").classList.add("added__overlay");

    this.notification.addEventListener(
      "transitionend",
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener("click", this.onBodyClick);
  }

  close() {
    document.getElementById("mini-cart-drawer").classList.remove("active");
    document.querySelector("body").classList.remove("added__overlay");

    document.body.removeEventListener("click", this.onBodyClick);
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      let renderSelector = document.getElementById(section.id);
      let renderCartItemCount = document.getElementById(
        "cart-notification-count-mobile"
      );
      if (renderSelector) {
        renderSelector.innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.id]
        );
      }

      if (renderCartItemCount)
        renderCartItemCount.innerHTML = this.getSectionInnerHTML(
          parsedState.sections["cart-notification-count"]
        );
    });

    if (this.header) this.header.reveal();
    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: "mini-cart-drawer",
      },
      {
        id: "cart-notification-count",
      },
    ];
  }


  updateQuantity(line, quantity, name, variantId) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });

    document
      .querySelector(".cart_action_drawer_overlay")
      .classList.add("active");
    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement = document.getElementById(`Quantity-${line}`);
        const items = document.querySelectorAll(".cart-notification-product");

        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute("value");
          
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.renderContents(parsedState);

        const updatedValue = parsedState.items[line - 1]
          ? parsedState.items[line - 1].quantity
          : undefined;
        let message = "";
        if (
          items.length === parsedState.items.length &&
          updatedValue !== parseInt(quantityElement.value)
        ) {
          if (typeof updatedValue === "undefined") {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace(
              "[quantity]",
              updatedValue
            );
          }
        }
        this.updateLiveRegions(line, message);
        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: "cart-notification",
          cartData: parsedState,
          variantId: variantId,
        });
      })
      .catch(() => {})
      .finally(() => {
        document
          .querySelector(".cart_action_drawer_overlay")
          .classList.remove("active");
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError = document.getElementById(`Line-item-error-${line}`);
    if (lineItemError) {
      lineItemError.classList.remove("d-none");
      lineItemError.querySelector(".cart-item__error-text").innerHTML = message;
    }
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (
      target !== this.notification &&
      !target.closest("cart-notification") &&
      !target.closest("#quickViewWrapper")
    ) {
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-notification", CartNotification);

class OpenMiniCart extends HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", (event) => {
      event.preventDefault();
      this.onClickMiniCart();
    });

    this.notification = document.getElementById("mini-cart-drawer");
    this.onBodyClassRemove = this.handleBodyClass.bind(this);

    this.notification.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.miniCartClose()
    );
  }

  onClickMiniCart() {
    document
      .getElementById("mini-cart-drawer")
      .classList.add("animate", "active");
    document.querySelector("body").classList.add("added__overlay");

    this.notification.addEventListener(
      "transitionend",
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener("click", this.onBodyClassRemove);
  }

  miniCartClose() {
    document.getElementById("mini-cart-drawer").classList.remove("active");
    document.querySelector("body").classList.remove("added__overlay");

    document.body.removeEventListener("click", this.onBodyClassRemove);
    removeTrapFocus(document.querySelector(".header__actions_btn--cart"));
  }

  handleBodyClass(evt) {
    let eventTarget = evt.target;
    //console.log(eventTarget);
    if (
      !eventTarget.closest("cart-notification") &&
      !eventTarget.closest("open-minicart") &&
      !eventTarget.closest("button")
    ) {
      this.miniCartClose();
    }
  }
}
customElements.define("open-minicart", OpenMiniCart);
