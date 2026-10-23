/* Materia Themes. Developed By Materia Themes. */
"use strict";

const wishlist_items = JSON.parse(
  localStorage.getItem("materia__wishlist-items")
);
const wishlistDiv = document.querySelector(".wishlist-page-main");
var WishlistPageShopify = (function () {
  return {
    initWishlistItems: function () {
      if (window.location.search.indexOf("page=") == -1) {
        this.init();
      }
    },

    init: function () {
      const _this = this;
      if (wishlistDiv) {
        const div_no_product = wishlistDiv.querySelector(
          ".wishlist-no-product-js"
        );
        const local = wishlistDiv.querySelector("[data-wishlist-local]");
        if (local) {
          // Products are already on the page; show the saved ones.
          const saved = new Set((wishlist_items || []).map(String));
          const designMode = window.Shopify?.designMode || document.documentElement.classList.contains("shopify-design-mode");
          let shown = 0;
          local.querySelectorAll("[data-wishlist-id]").forEach((item) => {
            const on = saved.has(String(item.dataset.wishlistId));
            if (on) shown++;
            if (on || !designMode) item.hidden = !on;
          });
          if (!shown && !local.querySelector("[data-wishlist-id]:not([hidden])")) div_no_product.classList.remove("hidden");
          _this.skeletonFunction(0);
          return;
        }
        if (wishlist_items === null || wishlist_items.length === 0) {
          _this.skeletonFunction(0);
          div_no_product.classList.remove("hidden");
        } else {
          var query = "";
          wishlist_items.forEach((e, key, wishlist_items) => {
            if (!Object.is(wishlist_items.length - 1, key)) {
              query += e + "%20OR%20id:";
            } else {
              query += e;
            }
          });
          const section_id = document.querySelector(".wishlist-page-section")
            .dataset.sectionId;
          var productAjaxURL =
            "?section_id=" +
            section_id +
            "&type=product&options[unavailable_products]=last&q=id:" +
            query;

          fetch(`${window.routes.search_url}${productAjaxURL}`)
            .then((response) => response.text())
            .then((responseText) => {
              const html = parser.parseFromString(responseText, "text/html");
              const row = document.createElement("div");
              row.classList.add("wishlist-list-items");
              const exist_row = wishlistDiv.querySelector(
                ".wishlist-list-items"
              );
              if (exist_row) {
                exist_row.remove();
              }
              const er = html.querySelector(
                ".wishlist-page-main .wishlist-list-items"
              );
              if (wishlist_items.length !== 0 && er) {
                wishlistDiv.innerHTML = html.querySelector(
                  ".wishlist-page-main"
                ).innerHTML;
                _this.skeletonFunction(700);
              } else {
                _this.skeletonFunction(0);
                div_no_product.classList.remove("hidden");
              }
              _this.mergeItems();
            })
            .catch((e) => {
              console.error(e);
            })
            .finally((e) => {
              initLazyloadItem();
            });
        }
      }
    },
    mergeItems: function () {
      const arr = [];
      if (wishlistDiv) {
        wishlistDiv
          .querySelectorAll(".product-item__action button-wishlist")
          .forEach((e) => {
            arr.push(e?.dataset.productId);
          });
      }
      localStorage.setItem("materia__wishlist-items", JSON.stringify(arr));
    },
    skeletonFunction: function (timer) {
      window.setTimeout(function () {
        if (this.document.querySelector("skeleton-page")) {
          this.document.querySelector("skeleton-page").remove();
        }
        if (this.document.querySelector(".wishlist-page-section-inner")) {
          this.document
            .querySelector(".wishlist-page-section-inner")
            .classList.remove("hidden");
        }
      }, timer);
    },
  };
})();
WishlistPageShopify.initWishlistItems();
