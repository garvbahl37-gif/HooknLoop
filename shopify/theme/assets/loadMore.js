class loadMoreProduct extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onClickLoadMore);
  }
  onClickLoadMore = async (evt) => {
    let loadMoreBtnTarget = evt.target.classList.contains('loadMoreBtn');
    if(loadMoreBtnTarget){
      let loadMoreBtn = evt.target;
      let currentPage = loadMoreBtn.dataset.currentPage;
      let collectionUrl = loadMoreBtn.dataset.url;
      let SectionId = loadMoreBtn.dataset.sectionId;
      currentPage = parseInt(currentPage);

      let productWrapper = this.querySelector(".collection__product");
      let loadMoreBtnWrapper = this.querySelector(".loadMoreWrapper");
      loadMoreBtn.classList.add("loading");
      
      try {
        const response = await fetch(
          `${collectionUrl}?page=${currentPage + 1}&section_id=${SectionId}`
        );
        const resText = await response.text();

        let lodedProductWrapper = new DOMParser().parseFromString(
          resText,
          "text/html"
        );
        let lodedProduct = lodedProductWrapper.querySelector(
          ".collection__product"
        ).innerHTML;
        productWrapper.insertAdjacentHTML("beforeend", lodedProduct);

        let loadedBtn = "";
        if (lodedProductWrapper.querySelector(".loadMoreWrapper")) {
          loadedBtn =
            lodedProductWrapper.querySelector(".loadMoreWrapper").innerHTML;
        }
        loadMoreBtnWrapper.innerHTML = loadedBtn;
      } catch (error) {
        console.log("error", error);
      } finally {
        loadMoreBtn.classList.remove("loading");
      }

    }
    
  };
}
customElements.define("load-more-product", loadMoreProduct);
