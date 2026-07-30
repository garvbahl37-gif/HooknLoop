theme.headerCategoryMenu = (function () {
  function categoryMenu(e) {
    const CATEGORY_ACTION_BUTTON = document.querySelector(
      ".categories__menu--button"
    );
    const CAETGORYE_MENU_WRAPPER = document.querySelector(".categories__menu");
    CATEGORY_ACTION_BUTTON?.addEventListener("click", (event) => {
      if (CAETGORYE_MENU_WRAPPER.classList.contains("menu_open")) {
        CAETGORYE_MENU_WRAPPER.classList.remove("menu_open");
        document.body.removeEventListener("click", bodyEventClass.bind(this));
      } else {
        CAETGORYE_MENU_WRAPPER.classList.add("menu_open");
        document.body.addEventListener("click", bodyEventClass.bind(this));
      }
    });

    // Toggle Cagtegories all items
    const ALL_CAT_TOGGLE_BTN = document.querySelector(
      ".all-categories--toggle-btn"
    );
    const ALL_COLLAPSIBLE_ITEMS = document.querySelectorAll(
      ".collapsible--categories-item"
    );
    if (ALL_COLLAPSIBLE_ITEMS.length > 0) {
      ALL_CAT_TOGGLE_BTN?.addEventListener("click", (event) => {
        let dataLabelFirst = ALL_CAT_TOGGLE_BTN.dataset.labelFirst;
        let dataLabelSecond = ALL_CAT_TOGGLE_BTN.dataset.label;
        ALL_COLLAPSIBLE_ITEMS.forEach((item) => {
          if (item.classList.contains("d-none")) {
            item.classList.remove("d-none");
            ALL_CAT_TOGGLE_BTN.querySelector(
              ".all-categories--toggle-btn-label"
            ).innerText = dataLabelSecond;
            slideDown(item);
          } else {
            item.classList.add("d-none");
            ALL_CAT_TOGGLE_BTN.querySelector(
              ".all-categories--toggle-btn-label"
            ).innerText = dataLabelFirst;
            slideUp(item);
          }
        });
      });
    }

    // Body Event Class
    function bodyEventClass(evt) {
      let eventTarget = evt.target;
      if (!eventTarget.closest(".categories__menu")) {
        if (CAETGORYE_MENU_WRAPPER.classList.contains("menu_open")) {
          CAETGORYE_MENU_WRAPPER.classList.remove("menu_open");
        }
      }
    }
  }
  return categoryMenu;
})();
