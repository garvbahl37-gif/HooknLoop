class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateOptionsParent();
    this.updateMasterId();
    this.toggleAddButton(true, "", false);
    this.getPreOrderVariantData();
    this.updatePickupAvailability();
    this.updateContent();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll("select"),
      (select) => select.value
    );
  }

  updateOptionsParent() {
    Array.from(this.querySelectorAll(".product-form__input--dropdown")).map(
      (select, index) => {
        select.children[0].children[1].innerHTML = this.options[index];
      }
    );
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGallery = document.getElementById(
      `MediaGallery-${this.dataset.section}`
    );
    mediaGallery.setActiveMedia(
      `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
      true
    );
  }

  updateContent() {
    let variant = this.currentVariant;

    let variandID = this.currentVariant?.id ?? null;

    // Back In Stock Notification
    let notifyMeAvailableWrapperList = document.querySelectorAll(
      `.notify__me--available-${this.dataset.section}`
    );

    if (notifyMeAvailableWrapperList.length > 0) {
      notifyMeAvailableWrapperList.forEach((notifyMeAvailableWrapper) => {
        if (variandID != null && !variant.available) {
          let soldOurtProductURL = document.querySelector(
            ".soldout__product_url"
          );
          soldOurtProductURL.value = `${this.dataset.origin}${this.dataset.url}?variant=${this.currentVariant.id}`;
          if (notifyMeAvailableWrapper) {
            notifyMeAvailableWrapper.classList.remove("no-js-inline");
          }
        } else {
          if (notifyMeAvailableWrapper) {
            notifyMeAvailableWrapper.classList.add("no-js-inline");
          }
        }
      });
    }
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    window.history.replaceState(
      {},
      "",
      `${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(":checked").value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [
        ...option.querySelectorAll('input[type="radio"], option'),
      ];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(":checked").value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.innerText = input.getAttribute("value");
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace(
          "[value]",
          input.getAttribute("value")
        );
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  renderProductInfo() {
    fetch(
      `${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`
    )
      .then((response) => response.text())
      .then((responseText) => {
        let id = `price-${this.dataset.section}`,
          stockInventory = `inventory__stock--${this.dataset.section}`,
          barcodeId = `barcode__${this.dataset.section}`,
          skuId = `sku__${this.dataset.section}`;

        const html = new DOMParser().parseFromString(responseText, "text/html");

        let destination = document.getElementById(id),
          stockInventoryDestination = document.getElementById(stockInventory),
          barcodeDestination = document.getElementById(barcodeId),
          skuDestination = document.getElementById(skuId);

        let source = html.getElementById(id),
          stockInventorySource = html.getElementById(stockInventory),
          barcodeSource = html.getElementById(barcodeId),
          skuSource = html.getElementById(skuId);

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (stockInventorySource && stockInventoryDestination)
          stockInventoryDestination.innerHTML = stockInventorySource.innerHTML;
        if (barcodeSource && barcodeDestination)
          barcodeDestination.innerHTML = barcodeSource.innerHTML;
        if (skuSource && skuDestination)
          skuDestination.innerHTML = skuSource.innerHTML;

        const price = document.getElementById(`price-${this.dataset.section}`);
        if (price) price.classList.remove("no-js-inline");
        this.toggleAddButton(
          !this.currentVariant.available,
          window.variantStrings.soldOut
        );
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = addButton.querySelector(".cart--button-text");

    if (!addButton) return;

    if (disable) {
      addButton.setAttribute("disabled", true);
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute("disabled");
      addButtonText.innerHTML = `${window.variantStrings.addToCart}`;
    }

    // Preorder Button
    if (window.preorder_button) {
      let productVarArray = this.PreorderVariantData;
      let variant = this.currentVariant;
      let VarInventoryManagement =
        this.currentVariant?.inventory_management ?? null;
      let var_num = "";
      if (VarInventoryManagement != null) {
        for (let variant_id in productVarArray) {
          if (variant.id == variant_id) {
            var_num = productVarArray[variant_id].qty;
            var inventoryQuantity = parseInt(var_num);
            var inventoryPolicy = productVarArray[variant_id].inventory_policy;
          }
          if (inventoryQuantity <= 0 && inventoryPolicy === "continue") {
            addButton.removeAttribute("disabled");
            addButtonText.innerHTML = `${window.variantStrings.preorder}`;
          } else if (inventoryQuantity <= 0 && inventoryPolicy !== "continue") {
            addButton.setAttribute("disabled", true);
            addButtonText.textContent = window.variantStrings.soldOut;
          } else {
            addButton.removeAttribute("disabled");
            addButtonText.innerHTML = `${window.variantStrings.addToCart}`;
          }
        }
      }
    }
    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = addButton.querySelector(".cart--button-text");
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add("no-js-inline");
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector("[data-variant]").textContent);
    return this.variantData;
  }
  getPreOrderVariantData() {
    this.PreorderVariantData =
      this.PreorderVariantData ||
      JSON.parse(this.querySelector("[data-preorder]").textContent);
  }
}

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
    this.fieldsets = Array.from(this.querySelectorAll("fieldset"));
    this.onColorSwatches();
  }

  onColorSwatches() {
    const variantList = this.getVariantData() || [];
    const swatchButtonList = this.querySelectorAll(
      `fieldset.variant--swatch-${this.dataset.colorSwatch} > label`
    );
    const result = Object.values(
      variantList.reduce((total, item) => {
        let k = `${item[this.dataset.colorSwatch]}`;
        if (!total[k]) {
          total[k] = { ...item, count: 1 };
        } else {
          total[k].count += 1;
        }
        return total;
      }, {})
    );

    if (swatchButtonList.length > 0) {
      swatchButtonList.forEach((button) => {
        result.forEach((data) => {
          if (data[this.dataset.colorSwatch] === button.dataset.value) {
            if (
              this.dataset.colorSwatchStyle === "image" &&
              data.featured_image !== null
            ) {
              button.setAttribute(
                "style",
                `--swatch-background-image: url(${
                  data.featured_image.src
                }); --swatch-background-color: ${
                  data[this.dataset.colorSwatch]
                };`
              );
            } else {
              button.setAttribute(
                "style",
                `--swatch-background-color: ${data[this.dataset.colorSwatch]};`
              );
            }
          }
        });
      });
    }
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.classList.remove("disabled");
      } else {
        input.classList.add("disabled");
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll("fieldset"));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll("input")).find(
        (radio) => radio.checked
      ).value;
    });
  }

  updateOptionsParent() {
    this.fieldsets.map((fieldset, index) => {
      fieldset.children[0].children[1].innerHTML = this.options[index];
    });
  }
}
customElements.define("variant-radios", VariantRadios);
