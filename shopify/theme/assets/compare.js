class CompareProduct extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onAddCompare);
    this.LOCAL_STORAGE_COMPARE_KEY = "shopify-compare";
    this.LOCAL_STORAGE_DELIMITER = ",";
    this.BUTTON_ACTIVE_CLASS = "active";
    this.onAddActiveClass();
    this.CompareItemCounter();
    this.compareTable = document.querySelector("#compare-content");
    this.compareTable?.addEventListener("click", (event) => {
      if (event.target.classList.contains("cp_remove--button")) {
        let productHandle = event.target.dataset.productHandle || false;
        if (!productHandle)
          return console.error(
            "[compare] Missing `data-product-handle` attribute. Failed to update the Compare."
          );
        this.updateCompare(productHandle);
        let tbody = event.target.parentElement.parentElement.parentElement;
        let compareList = tbody.querySelectorAll("tr");
        compareList.forEach((cpItem) => {
          let singleTargeElementList = cpItem.querySelectorAll("td");
          singleTargeElementList.forEach((singleTargeElementItem) => {
            if (
              event.target.dataset.pid == singleTargeElementItem.dataset.pid
            ) {
              singleTargeElementItem.remove();
            }
          });
        });
        this.CompareItemCounter();

        /* Empty compare */
        let Compare_item_length = this.getCompare().length;
        if (Compare_item_length < 1) {
          document
            .querySelector(".compare-page")
            .classList.remove("compare_exists");
        }
      }
    });
  }

  CompareItemCounter() {
    let COMPARE_ITEM_COUNT = document.querySelectorAll(".compare__count");
    let Compare_item_length = this.getCompare().length;

    if (COMPARE_ITEM_COUNT) {
      COMPARE_ITEM_COUNT.innerText = Compare_item_length;
    }
    if (COMPARE_ITEM_COUNT) {
      COMPARE_ITEM_COUNT.forEach((singleItem) => {
        singleItem.innerText = Compare_item_length;
      });
    }
  }

  onAddActiveClass() {
    const CompareAddedButton = this.querySelector("button");
    if (CompareAddedButton != null) {
      let productHandle = CompareAddedButton.dataset.productHandle || false;
      if (!productHandle)
        return console.error(
          "[compare] Missing `data-product-handle` attribute. Failed to update the Compare."
        );
      if (this.CompareContains(productHandle))
        CompareAddedButton.classList.add(this.BUTTON_ACTIVE_CLASS);
    }
  }

  onAddCompare() {
    const CompareItem = this.querySelector("button");
    let productHandle = CompareItem.dataset.productHandle || false;
    if (!productHandle)
      return console.error(
        "[compare] Missing `data-product-handle` attribute. Failed to update the Compare."
      );

    this.updateCompare(productHandle);

    this.CompareItemCounter();

    let grid = document.querySelector("[grid-compare]") || false;

    if (grid) {
      this.closest(".product-grid-item").remove();
    } else {
      CompareItem.classList.add("loading", "adding");
      setTimeout(function () {
        CompareItem.classList.remove("loading");
        CompareItem.classList.toggle("active");
      }, 500);
      setTimeout(function () {
        document.querySelector(".adding").classList.remove("adding");
      }, 1000);
    }
    let Compare_item_length = this.getCompare().length;
    if (Compare_item_length <= 0) {
      grid.parentElement.classList.remove("compare_exists");
    }
  }

  getCompare() {
    let Compare = localStorage.getItem(this.LOCAL_STORAGE_COMPARE_KEY) || false;
    if (Compare) return Compare.split(this.LOCAL_STORAGE_DELIMITER);
    return [];
  }

  setCompare(array) {
    let Compare = array.join(this.LOCAL_STORAGE_DELIMITER);
    if (array.length)
      localStorage.setItem(this.LOCAL_STORAGE_COMPARE_KEY, Compare);
    else localStorage.removeItem(this.LOCAL_STORAGE_COMPARE_KEY);
    return Compare;
  }

  updateCompare(handle) {
    let Compare = this.getCompare();
    let indexInCompare = Compare.indexOf(handle);
    if (indexInCompare === -1) Compare.push(handle);
    else Compare.splice(indexInCompare, 1);
    return this.setCompare(Compare);
  }

  CompareContains(handle) {
    let Compare = this.getCompare();
    return Compare.indexOf(handle) !== -1;
  }
}
customElements.define("compare-item", CompareProduct);

let newCompareObj = new CompareProduct();

document.addEventListener("DOMContentLoaded", function () {
  steupCompare();
});

let steupCompare = function (grid) {
  let compare = newCompareObj.getCompare();
  let CompareExistBtn = document.querySelector(".compare-page");

  if (compare.length > 0) {
    if (CompareExistBtn) {
      CompareExistBtn.classList.add("compare_exists");
    }
  }

  let requests = compare.map(function (handle) {
    let productTileTemplateUrl = "/products/" + handle + "?view=compare";
    return fetch(productTileTemplateUrl).then(function (res) {
      if (res.status == 200) {
        return res.text();
      }
    });
  });

  Promise.all(requests).then(function (responses) {
    let compareProductCards = responses.join("");

    let compareHTML = new DOMParser().parseFromString(
      compareProductCards,
      "text/html"
    );

    let productThumbALl = compareHTML.querySelectorAll(
        ".product-grid-item__thumbnail"
      ),
      productPriceALl = compareHTML.querySelectorAll(".cp_prd-price"),
      productAvailability = compareHTML.querySelectorAll(
        ".cp_prd-availability"
      ),
      productDescription = compareHTML.querySelectorAll(".cp_prd_description"),
      productBrand = compareHTML.querySelectorAll(".cp_prd-brand"),
      productAddCart = compareHTML.querySelectorAll(".cp_prd_buy--proudct");

    let proudctThumbWrap = document.querySelector(".cp_prd-thumb"),
      designatgionPriceCompare = document.querySelector(".cp_prd-price"),
      designatgionAvailability = document.querySelector(".cp_prd-availability"),
      designatgionDescription = document.querySelector(".cp_prd_description"),
      destinationBrand = document.querySelector(".cp_prd-brand"),
      destinationAddCart = document.querySelector(".cp_prd_buy--proudct");

    if (proudctThumbWrap) {
      productThumbALl.forEach((item) => {
        proudctThumbWrap.appendChild(item);
      });
    }
    if (designatgionPriceCompare) {
      productPriceALl.forEach((item) => {
        designatgionPriceCompare.appendChild(item);
      });
    }

    if (designatgionAvailability) {
      productAvailability.forEach((item) => {
        designatgionAvailability.appendChild(item);
      });
    }
    if (designatgionDescription) {
      productDescription.forEach((item) => {
        designatgionDescription.appendChild(item);
      });
    }

    if (destinationBrand) {
      productBrand.forEach((item) => {
        destinationBrand.appendChild(item);
      });
    }
    if (destinationAddCart) {
      productAddCart.forEach((item) => {
        destinationAddCart.appendChild(item);
      });
    }
  });
};
