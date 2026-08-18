if (!customElements.get("age-verifier-popup")) {
  customElements.define(
    "age-verifier-popup",
    class AgeVerifierPopup extends HTMLElement {
      constructor() {
        super();
        this.cookieName = "suruchi:age-verifier";
      }

      connectedCallback() {
        this.popupElement = this;
        this.agreeButton = this.querySelector(".confirm--age-button");
        this.cancelButton = this.querySelector(".cancel--age-button");
        this.goBackButton = this.querySelector(".go-back--age-button");
        this.mainPopup = this.querySelector("#age-verification-main-popup");
        this.failedPopup = this.querySelector("#age-verification-failed-popup");

        this.setupEventListeners();
        this.managePopupVisibility();
      }

      setupEventListeners() {
        this.agreeButton?.addEventListener(
          "click",
          this.handleAgreeClick.bind(this)
        );
        this.cancelButton?.addEventListener(
          "click",
          this.showFailedPopup.bind(this)
        );
        this.goBackButton?.addEventListener(
          "click",
          this.showMainPopup.bind(this)
        );
      }

      handleAgreeClick() {
        this.closePopup();
        this.setCookie(this.cookieName, this.dataset.expire);
      }

      showFailedPopup() {
        this.mainPopup.classList.add("hidden");
        this.failedPopup.classList.remove("hidden");
      }

      showMainPopup() {
        this.mainPopup.classList.remove("hidden");
        this.failedPopup.classList.add("hidden");
      }

      closePopup() {
        this.popupElement.classList.remove("open--popup");
        document.body.classList.remove("overflow-hidden");
      }

      managePopupVisibility() {
        const isVerified = JSON.parse(this.getCookie(this.cookieName));
        const shouldDisplay = this.dataset.display === "enable";

        if (isVerified && shouldDisplay) {
          this.closePopup();
        } else {
          this.popupElement.classList.add("open--popup");
          document.body.classList.add("overflow-hidden");
        }
      }

      getCookie(name) {
        const match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
        return match ? match[2] : null;
      }

      setCookie(name, expiryDays) {
        document.cookie = `${name}=true; max-age=${
          expiryDays * 24 * 60 * 60
        }; path=/`;
      }
    }
  );
}
