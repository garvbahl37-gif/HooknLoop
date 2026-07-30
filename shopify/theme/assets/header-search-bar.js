theme.headerSearch = (function () {
  function searchOverlay(e) {
    // Tranaprent header
    // const headerHeight = document.querySelector('.header__area');
    // document.documentElement.style.setProperty('--header-height', `${headerHeight.clientHeight}px`);

    let input = e.querySelector('input[type="search"]');

    let drawerAction = (trigger, closeTrigger, wrapper) => {
      let offcanvasSearchTrigger = document.querySelectorAll(trigger),
        offcanvasSidebarSearch = document.querySelector(wrapper),
        offcanvasSearchClose = document.getElementById(closeTrigger);

      offcanvasSearchTrigger.forEach((singleTrigger) => {
        if (singleTrigger) {
          singleTrigger.addEventListener("click", (event) => {
            event.preventDefault();
            offcanvasSidebarSearch.classList.add("active");
            document
              .querySelector("body")
              .classList.add("added__overlay_search");

            offcanvasSidebarSearch.addEventListener(
              "transitionend",
              () => {
                trapFocus(offcanvasSidebarSearch);
                trapFocus(input);
              },
              { once: true }
            );
          });

          offcanvasSidebarSearch.addEventListener("keyup", (evt) => {
            if (evt.code === "Escape") {
              offcanvasSidebarSearch.classList.remove("active");
              document
                .querySelector("body")
                .classList.remove("added__overlay_search");
              removeTrapFocus(singleTrigger);
            }
          });

          if (offcanvasSearchClose) {
            offcanvasSearchClose.addEventListener("click", (event) => {
              event.preventDefault();
              offcanvasSidebarSearch.classList.remove("active");
              document
                .querySelector("body")
                .classList.remove("added__overlay_search");
              removeTrapFocus(singleTrigger);
            });
          }
        }
      });

      if (offcanvasSidebarSearch) {
        document.addEventListener("click", function (event) {
          let eventTarget = event.target;
          if (
            !eventTarget.closest("#predictive__search_overlay") &&
            !eventTarget.closest(".header__actions_btn--search")
          ) {
            offcanvasSidebarSearch.classList.remove("active");
            document
              .querySelector("body")
              .classList.remove("added__overlay_search");
          }
        });
      }
    };

    drawerAction(
      ".header__actions_btn--search",
      "search__close_btn",
      "#predictive__search_overlay"
    );
  }
  return searchOverlay;
})();
