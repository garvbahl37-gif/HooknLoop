// assets/theme-verification.js
class ThemeVerification {
  constructor() {
    this.baseUrl = "https://themihub.com/verify-purchase-token";
    this.isVerified = false;
    this.init();
  }

  // Get the actual store URL in both live and editor environments
  getStoreUrl() {
    let storeUrl = window.location.hostname;

    // If in Shopify admin/editor, use the actual shop URL
    if (window.Shopify?.shop) {
      storeUrl = window.Shopify.shop;
    }

    // Clean the URL (remove protocol, www, trailing slashes)
    storeUrl = storeUrl
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "");

    return storeUrl;
  }

  async init() {
    // Check if removal popup is enabled in theme settings
    this.enableRemovePopup =
      window.theme?.settings?.enable_remove_token_popup || false;

    // First check verification status
    await this.checkVerification();

    // If enabled in theme settings and verified, show removal popup
    if (this.enableRemovePopup && this.isVerified) {
      this.showVerificationOverlay(true);
    }
  }

  generateUniqueId() {
    return (
      "thv-" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  async checkVerification() {
    try {
      const storeUrl = this.getStoreUrl();
      const response = await fetch(
        `${this.baseUrl}/verify-purchase.php?store_url=${storeUrl}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      this.isVerified = result.verified;

      // If not verified, show verification popup
      if (!this.isVerified) {
        this.showVerificationOverlay(false);
      }
    } catch (error) {
      console.error("Verification check failed:", error);
      this.showVerificationOverlay(false);
    }
  }

  showVerificationOverlay(isRemoval = false) {
    // Don't show removal popup if not verified
    if (isRemoval && !this.isVerified) {
      return;
    }

    const overlayId = this.generateUniqueId();
    const formId = this.generateUniqueId();
    const purchaseCodeId = this.generateUniqueId();
    const buttonId = this.generateUniqueId();
    const messageId = this.generateUniqueId();

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.setAttribute("data-theme-verification", "true");

    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 1) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    `;
    // Modifying only the formHtml part where we create the popup content
    const formHtml = `
  <div style="background: white !important; padding: 20px !important; border-radius: 5px !important; text-align: center !important; max-width: 400px !important; box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;">
    ${
      !isRemoval
        ? `
      <a href="https://themihub.gitbook.io/suruchi-theme/getting-started/purchase-code-verify" 
         target="_blank" 
         style="color: #0066cc !important; text-decoration: none !important; display: block !important; margin-bottom: 15px !important; font-size: 14px !important;"
      >
        Need help? View documentation
      </a>
    `
        : ""
    }
    <h2 style="margin-bottom: 15px !important; font-size: 1.5rem !important;">
      ${isRemoval ? "Remove Purchase Token" : "Theme Verification Required"}
    </h2>
    <p style="margin-bottom: 20px !important;">
      ${
        isRemoval
          ? "Enter your purchase code to remove it from this store."
          : "Please verify your purchase to access the website."
      }
    </p>
    <form id="${formId}" style="display: flex !important; flex-direction: column !important; gap: 10px !important;">
      <input 
        type="text" 
        id="${purchaseCodeId}" 
        placeholder="Enter Purchase Code" 
        required
        style="padding: 8px !important; border: 1px solid #ddd !important; border-radius: 4px !important; width: 100% !important; box-sizing: border-box !important;"
      >
      <button 
        type="submit" 
        id="${buttonId}"
        style="padding: 8px 16px !important; background: ${
          isRemoval ? "#f44336" : "#4CAF50"
        } !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important;"
      >
        ${isRemoval ? "Remove Token" : "Verify Purchase"}
      </button>
    </form>
    <div id="${messageId}" style="margin-top: 10px !important; color: #f44336 !important;"></div>
  </div>
`;

    overlay.innerHTML = formHtml;
    document.body.appendChild(overlay);

    this.initializeFormListeners(formId, purchaseCodeId, messageId, isRemoval);
  }

  initializeFormListeners(formId, purchaseCodeId, messageId, isRemoval) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const purchaseCodeInput = document.getElementById(purchaseCodeId);
      if (!purchaseCodeInput) return;

      const purchaseCode = purchaseCodeInput.value.trim();
      if (!purchaseCode) {
        this.showMessage(messageId, "Please enter a purchase code");
        return;
      }

      if (isRemoval) {
        await this.removePurchaseToken(purchaseCode, messageId);
      } else {
        await this.verifyPurchase(purchaseCode, messageId);
      }
    });
  }

  showMessage(messageId, message, isError = true) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.style.color = isError ? "#f44336" : "#4CAF50";
    }
  }

  hideOverlay() {
    const overlays = document.querySelectorAll(
      '[data-theme-verification="true"]'
    );
    overlays.forEach((overlay) => overlay.remove());
  }

  async verifyPurchase(purchaseCode, messageId) {
    try {
      const storeUrl = this.getStoreUrl();
      const response = await fetch(`${this.baseUrl}/verify-purchase.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          purchase_code: purchaseCode,
          store_url: storeUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage(messageId, "Verification successful!", false);
        this.isVerified = true;
        setTimeout(() => this.hideOverlay(), 1000);
      } else {
        this.showMessage(messageId, result.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      this.showMessage(messageId, "Verification failed. Please try again.");
    }
  }

  async removePurchaseToken(purchaseCode, messageId) {
    try {
      const storeUrl = this.getStoreUrl();
      const response = await fetch(`${this.baseUrl}/remove-token.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          purchase_code: purchaseCode,
          store_url: storeUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage(messageId, "Token removed successfully!", false);
        this.isVerified = false;
        setTimeout(() => {
          this.hideOverlay();
          // Show verification popup after removing token
          this.showVerificationOverlay(false);
        }, 1000);
      } else {
        this.showMessage(messageId, result.message || "Failed to remove token");
      }
    } catch (error) {
      console.error("Remove token failed:", error);
      this.showMessage(messageId, "Failed to remove token. Please try again.");
    }
  }
}

// Initialize with a small delay to ensure Shopify data is loaded
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    window.themeVerification = new ThemeVerification();
  }, 100);
});
