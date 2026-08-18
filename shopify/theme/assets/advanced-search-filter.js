if (!customElements.get("advanced-search-filter")) {
  class AdvancedSearchFilter extends HTMLElement {
    constructor() {
      super();

      this.advancedSearchForm = this.querySelector("form");
      this.advancedSearchSubmitButton = this.querySelector(
        'button[type="submit"]'
      );
      this.SearchCollection = this.querySelector(
        "select.search--filter-collection"
      );
      this.SearchFacets = this.querySelectorAll("select.facets--filter");

      this.setupEventListeners();

      if (!this.SearchCollection) {
        this.populateFacetsFilters(true);
      }
    }

    //  Setup Event Listener
    setupEventListeners() {
      this.advancedSearchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        window.location = this.advancedSearchForm.getAttribute("action");
      });
      this.SearchCollection?.addEventListener(
        "change",
        this.onColllectionFilter.bind(this)
      );
      this.SearchFacets.forEach((event) => {
        event.addEventListener("change", this.onFacetsFilter.bind(this));
      });
    }
    setupURL() {
      const collectionUrl = this.SearchCollection?.value ?? "/collections/all/";
      const url = new URL(collectionUrl, window.location.origin);
      this.querySelectorAll("select.facets--filter:enabled").forEach(
        (select) => {
          if (select.value === "") {
            return;
          }
          Array.from(select.selectedOptions).forEach((option) => {
            url.searchParams.set(option.dataset.paramName, option.value);
          });
        }
      );

      return url.toString();
    }

    formActionURL(url, background) {
      this.advancedSearchForm.setAttribute("action", url);

      // button loader
      if (!background) {
        this.advancedSearchSubmitButton.disabled = false;
      }
    }

    selectRemoveOptions(select) {
      const options = select.querySelectorAll("option:not(.default)");

      options.forEach((option) => {
        select.removeChild(option);
      });

      select.querySelector("option").selected = true;
    }

    onColllectionFilter() {
      this.SearchFacets.forEach((select) => {
        this.selectRemoveOptions(select);
        select.disabled = true;
        select.closest(".facets--filter-group").classList.add("disabled");
      });

      this.populateFacetsFilters();
    }

    toggleLoading() {
      this.advancedSearchSubmitButton.classList.toggle("loading");
    }

    onFacetsFilter(event) {
      const selectedIndex = event.target.dataset.index;

      this.SearchFacets.forEach((select) => {
        if (Number(select.dataset.index) <= Number(selectedIndex)) {
          return;
        }

        this.selectRemoveOptions(select);
        select.disabled = true;
        select.closest(".facets--filter-group").classList.add("disabled");
      });

      // formActionURL
      this.formActionURL(this.setupURL());

      const url = new URL(this.setupURL());
      url.searchParams.set("view", "search");
      this.toggleLoading();

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(response.status);
          }
          return response.text();
        })
        .then((text) => {
          this.toggleLoading();
          const parsedState = new DOMParser().parseFromString(
            text,
            "text/html"
          );

          this.SearchFacets.forEach((select) => {
            if (Number(select.dataset.index) <= Number(selectedIndex)) {
              return;
            }

            const options = parsedState.querySelectorAll(
              `select[data-label="${select.dataset.label}"] option`
            );
            if (options.length > 0) {
              const availableOptions = Array.from(options).filter(
                (option) => Number(option.dataset.count) > 0
              );
              select.append(...availableOptions);
              select.querySelector("option.default").selected = true;
            }

            if (Number(select.dataset.index) === Number(selectedIndex) + 1) {
              select.disabled = false;
              select
                .closest(".facets--filter-group")
                .classList.remove("disabled");
            }
          });
        })
        .catch((error) => {
          throw error;
        });
    }

    populateFacetsFilters(background = false) {
      this.formActionURL(this.setupURL(), background);

      const url = new URL(this.setupURL());
      url.searchParams.set("view", "search");

      // to show a loading spinner.
      if (!background) {
        this.toggleLoading();
      }

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(response.status);
          }

          return response.text();
        })
        .then((text) => {
          if (!background) {
            this.toggleLoading();
          }

          const parsedState = new DOMParser().parseFromString(
            text,
            "text/html"
          );

          this.SearchFacets.forEach((select) => {
            const options = parsedState.querySelectorAll(
              `select[data-label="${select.dataset.label}"] option`
            );
            if (options.length > 0) {
              select.append(...options);
              select.querySelector("option.default").selected = true;
            }

            if (Number(select.dataset.index) === 1) {
              select.disabled = false;
              select
                .closest(".facets--filter-group")
                .classList.remove("disabled");
            }
          });
        })
        .catch((error) => {
          throw error;
        });
    }
  }
  customElements.define("advanced-search-filter", AdvancedSearchFilter);
}
