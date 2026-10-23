/* Materia Themes — Cart-drawer safety net.
   ─────────────────────────────────────────────────────────────────────
   Document-level capture-phase listener for trash-icon clicks in the
   cart drawer. The original <mini-cart-remove-button> custom element
   handler still exists as a feature target — but a single broken
   render or a JS error there has historically left the drawer stuck,
   requiring a full page reload to recover. This file is the
   bulletproof backup that always runs and always wins.

   Why capture phase + stopImmediatePropagation?
   - Capture-phase listeners fire BEFORE the inner <a href> default
     action and BEFORE any bubble-phase listeners on the custom
     element. We call preventDefault to kill the link navigation, then
     stopImmediatePropagation when we own the delete so the custom-
     element handler can't double-fire and double-decrement the cart.

   Why we still defer to the custom element for wishlist-mode clicks:
   - When `show_message_when_remove` is enabled in settings, the trash
     button gets `.action-add-wishlist` and the first click shows a
     "remove and save to wishlist?" confirmation panel instead of
     deleting. If the product isn't yet in the wishlist we let the
     custom-element handler take over by NOT stopping propagation.
*/
"use-strict";

(function () {
  function findCartContainer() {
    return (
      document.querySelector("cart-notification") ||
      document.querySelector("cart-drawer")
    );
  }
  function isInWishlist(productHandle) {
    try {
      const raw = localStorage.getItem("materia__wishlist-items");
      if (!raw) return false;
      const list = JSON.parse(raw);
      return Array.isArray(list) && list.indexOf(productHandle) !== -1;
    } catch (_) {
      // Corrupt storage — clear so the wishlist flow self-heals on the
      // next interaction.
      try { localStorage.removeItem("materia__wishlist-items"); } catch (_) {}
      return false;
    }
  }
  function fallbackDelete(lineKey) {
    return fetch("/cart/change.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ id: lineKey, quantity: 0 }),
    })
      .catch(() => null)
      .then(() => {
        try { window.location.reload(); } catch (_) {}
      });
  }
  /* Force-clear any sticky CSS state that would block clicks. The
     `cart-items.cart-refreshing` rule sets `pointer-events: none`, so
     if a prior interaction left this class on, the user can't click
     anything. Self-heal on every trash click. */
  function selfHeal() {
    document.querySelectorAll("cart-items.cart-refreshing")
      .forEach((el) => el.classList.remove("cart-refreshing"));
    document.querySelectorAll("mini-cart-remove-button.loading")
      .forEach((el) => el.classList.remove("loading"));
  }

  document.addEventListener(
    "click",
    function (event) {
      const target = event.target;
      if (!target || !target.closest) return;
      const trash = target.closest("mini-cart-remove-button");
      if (!trash) return;

      /* Always kill the link's default navigation so a misfire never
         dumps the shopper onto /cart. */
      event.preventDefault();

      /* Wishlist-confirmation mode: first click on a not-yet-wishlisted
         product should show the confirmation panel, not delete. Let
         the custom-element handler take over by returning WITHOUT
         calling stopImmediatePropagation. */
      const wishlistMode = trash.classList.contains("action-add-wishlist");
      if (wishlistMode && !isInWishlist(trash.dataset.productHandle)) {
        return;
      }

      /* This is a real delete. Take over: stop the custom-element
         handler from also firing so we don't double-decrement. */
      event.stopImmediatePropagation();

      const lineKey = trash.dataset.index;
      if (!lineKey) {
        console.warn("[cart] trash button missing data-index", trash);
        return;
      }

      selfHeal();

      const cartEl = findCartContainer();
      if (cartEl && typeof cartEl.updateQuantity === "function") {
        try {
          cartEl.updateQuantity(lineKey, 0);
          return;
        } catch (err) {
          console.warn(
            "[cart] updateQuantity threw — falling back to direct delete",
            err
          );
        }
      }

      /* Last-resort fallback: post directly to /cart/change.js and
         reload. Guarantees the line is removed even if every other
         path is broken. */
      fallbackDelete(lineKey);
    },
    true /* capture phase */
  );
})();
