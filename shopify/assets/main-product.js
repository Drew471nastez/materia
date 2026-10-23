/* Materia Themes. Developed By Materia Themes. */
"use-strict";

class StickyAddCart extends HTMLElement {
  /* The bar shows once the section's own Add to cart button has scrolled
     above the screen and hides when it comes back or a .product-sticky-hide
     section climbs in. It moves itself to <body> so position: fixed is
     always the viewport, sits on top of the phone navigation bar, and is set
     up again when the builder draws its section again (a new bar replaces
     the old one; a bar whose section is gone removes itself). */
  connectedCallback() {
    if (!this._mtReady) {
      this._mtReady = true;
      this.setup();
    } else if (!this._mtObserving) {
      this.observe();
    }
  }
  disconnectedCallback() {
    // Moving to <body> disconnects and connects again: keep running then.
    if (this.isConnected) return;
    this.teardown();
  }
  setup() {
    this.sectionId = this.getAttribute("data-section-id") || "";
    this._mainSection = this.closest(".sec__featured-product");
    if (this.sectionId) {
      document
        .querySelectorAll('sticky-add-cart[data-section-id="' + CSS.escape(this.sectionId) + '"]')
        .forEach((prior) => {
          if (prior !== this) prior.remove();
        });
    }
    if (this.parentElement && this.parentElement !== document.body) {
      document.body.appendChild(this);
    }
    this.mobileQuery = window.matchMedia("(max-width: 767.98px)");
    // Hidden until the section's button scrolls away: out of the tab order.
    this.setAttribute("aria-hidden", "true");
    if ("inert" in this) this.inert = true;
    this.prepareSelect();
    this.observe();
    const btnMinimal = this.querySelector("minimal-button");
    if (btnMinimal) btnMinimal.addEventListener("click", this.toggle.bind(this), false);
  }
  findMain() {
    if (this._mainSection && this._mainSection.isConnected) return this._mainSection;
    if (this._mainSection) {
      // The builder drew the section again: a bar it drew has replaced this
      // one already, so with none the bar is switched off.
      this.remove();
      return null;
    }
    const id = this.sectionId;
    this._mainSection =
      (id && document.getElementById("MainProduct-" + id)) ||
      (id && document.querySelector('.sec__featured-product[data-section="' + CSS.escape(id) + '"]')) ||
      null;
    return this._mainSection;
  }
  observe() {
    if (this._mtObserving) return;
    this._mtObserving = true;
    this._ticking = false;
    this._onScroll = () => {
      if (this._ticking) return;
      this._ticking = true;
      requestAnimationFrame(() => this.evaluate());
    };
    this._onResize = () => {
      this.placeAboveNav();
      this.layoutForWidth();
      this._onScroll();
    };
    window.addEventListener("scroll", this._onScroll, { passive: true });
    window.addEventListener("resize", this._onResize, { passive: true });
    this._onVariant = (e) => {
      const d = (e && e.detail) || {};
      if (d.sectionId != null && String(d.sectionId) !== String(this.sectionId)) return;
      requestAnimationFrame(() => this.syncPrice());
    };
    document.addEventListener("variant:change", this._onVariant);
    this._onRedraw = () => requestAnimationFrame(() => this.isConnected && this.evaluate());
    document.addEventListener("storelib:section-load", this._onRedraw);
    document.addEventListener("shopify:section:load", this._onRedraw);
    this._select = this.querySelector("select");
    if (this._select) {
      this._onSelect = () => this.syncPrice();
      this._select.addEventListener("change", this._onSelect);
    }
    if ("ResizeObserver" in window) {
      this._ro = new ResizeObserver(() => this.placeAboveNav());
      const nav = document.querySelector("mobile-navigation-bar");
      if (nav) this._ro.observe(nav);
    }
    this.placeAboveNav();
    this.layoutForWidth();
    this.evaluate();
  }
  teardown() {
    this._mtObserving = false;
    window.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("variant:change", this._onVariant);
    document.removeEventListener("storelib:section-load", this._onRedraw);
    document.removeEventListener("shopify:section:load", this._onRedraw);
    if (this._select && this._onSelect) this._select.removeEventListener("change", this._onSelect);
    if (this._ro) this._ro.disconnect();
    this._ro = null;
    document.documentElement.classList.remove("mt-sticky-cart-shown");
  }
  evaluate() {
    this._ticking = false;
    const main = this.findMain();
    if (!main) return this.setShown(false);
    const primaryBtn = main.querySelector(".button-trigger__sticky");
    if (!primaryBtn) return this.setShown(false);
    const vh = window.innerHeight;
    const rect = primaryBtn.getBoundingClientRect();
    let nearHide = false;
    const anchors = document.querySelectorAll(".product-sticky-hide");
    for (let i = 0; i < anchors.length; i++) {
      const r = anchors[i].getBoundingClientRect();
      if (r.top < vh - 220 && r.bottom > 0) {
        nearHide = true;
        break;
      }
    }
    this.setShown(rect.bottom <= 0 && !nearHide);
  }
  setShown(on) {
    if (this.classList.contains("show-sticky-cart") === on) return;
    this.classList.toggle("show-sticky-cart", on);
    this.setAttribute("aria-hidden", on ? "false" : "true");
    if ("inert" in this) this.inert = !on;
    document.documentElement.classList.toggle("mt-sticky-cart-shown", on);
    if (on) this.placeAboveNav();
  }
  // Sits on top of the phone navigation bar instead of under it; with no
  // bar below, its own padding clears the home indicator (safe area).
  placeAboveNav() {
    const nav = document.querySelector("mobile-navigation-bar");
    let offset = 0;
    if (nav) {
      const cs = getComputedStyle(nav);
      if (cs.display !== "none" && cs.visibility !== "hidden") {
        const r = nav.getBoundingClientRect();
        if (r.height > 0 && r.top < window.innerHeight) offset = Math.max(0, Math.round(window.innerHeight - r.top));
      }
    }
    if (offset !== this._navOffset) {
      this._navOffset = offset;
      this.style.setProperty("--mt-sticky-offset", offset + "px");
      this.classList.toggle("has-nav-below", offset > 0);
    }
  }
  // Phones show only the variant's name in the list and its price in the
  // button; larger screens keep "name - price".
  prepareSelect() {
    const select = this.querySelector("select");
    if (!select) {
      this.classList.add("no-picker");
      return;
    }
    Array.from(select.options).forEach((opt) => {
      if (opt.dataset.mtFull != null) return;
      const full = opt.textContent.replace(/\s+/g, " ").trim();
      opt.dataset.mtFull = full;
      const title = (opt.dataset.value || "").trim();
      let price = full;
      if (title && full.indexOf(title) === 0) price = full.slice(title.length).replace(/^\s*-\s*/, "");
      else if (full.lastIndexOf(" - ") > -1) price = full.slice(full.lastIndexOf(" - ") + 3);
      opt.dataset.mtPrice = price;
      opt.dataset.mtTitle = title && !/default title/i.test(title) ? title : "";
    });
    const real = Array.from(select.options).filter((o) => o.dataset.mtTitle);
    if (real.length < 2) this.classList.add("no-picker");
  }
  layoutForWidth() {
    const select = this.querySelector("select");
    if (!select) return this.syncPrice();
    const phone = !!(this.mobileQuery && this.mobileQuery.matches);
    if (phone !== this._phone) {
      this._phone = phone;
      Array.from(select.options).forEach((opt) => {
        if (opt.dataset.mtFull == null) return;
        const text = phone && opt.dataset.mtTitle ? opt.dataset.mtTitle : opt.dataset.mtFull;
        if (opt.textContent !== text) opt.textContent = text;
      });
    }
    this.syncPrice();
  }
  syncPrice() {
    const button = this.querySelector('button[name="add"], .product-form__submit');
    if (!button) return;
    const select = this.querySelector("select");
    const opt = select && select.options[select.selectedIndex];
    let price = opt ? opt.dataset.mtPrice || "" : "";
    if (!price) {
      const shown = this.querySelector(".price-regular .price, .price");
      price = shown ? shown.textContent.replace(/\s+/g, " ").trim() : "";
    }
    let tag = button.querySelector(".mt-sticky-price");
    if (!tag) {
      tag = document.createElement("span");
      tag.className = "mt-sticky-price hidden-on-load";
      const label = button.querySelector(".btn-label");
      if (label && label.nextSibling) button.insertBefore(tag, label.nextSibling);
      else button.appendChild(tag);
    }
    if (tag.textContent !== price) tag.textContent = price;
  }
  toggle(e) {
    const target = e.currentTarget;
    target.classList.toggle("opened");
    if (!target) return;
    const parent = target.closest("sticky-add-cart");
    if (!parent) return;
    const content = parent.querySelector(".content--expand");
    slideAnime({
      target: content,
      animeType: "slideToggle",
    });
  }
}
customElements.define("sticky-add-cart", StickyAddCart);
// js for fake sold
class SoldProduct extends HTMLElement {
  constructor() {
    super();
    this.sold = this.dataset.sold;
    this.hours = this.dataset.hours;
    this.message = this.dataset.message;
    this.init();
  }
  init() {
    if (this.message && this.sold && this.hours) {
      var message = "";
      message = this.message
        .replace("{{ sold }}", this.randomSelect(this.sold))
        .replace("{{ hours }}", this.randomSelect(this.hours));
      this.innerHTML += message;
    }
  }

  randomSelect(numbers) {
    const numberArray = numbers.split(",");
    const randomIndex = Math.floor(Math.random() * numberArray.length);
    const randomNumber = numberArray[randomIndex];
    return randomNumber;
  }
}
customElements.define("sold-product", SoldProduct);

/* Buy buttons enhancements:
   - data-atc-redirect-checkout: clicking ATC sends the customer to /checkout
   - data-price-in-atc / data-price-in-buy-now: shows the live variant price
     IN the button label as "<base text> $<price>" (clean, e.g. "Add to Cart $40")
   - data-atc-text / data-buy-text: custom user-defined button labels
   Re-runs on every DOM mutation, variant change, plus a polling burst at load. */
(function buyButtonsEnhancements() {
  // Strip everything after the base verb, then append " <price>".
  // Examples:
  //   "Add to cart Sale price\n$40.00 USD" -> "Add to cart $40.00"
  //   "Buy it now"                          -> "Buy Now $40.00"
  const cleanPrice = (text) => {
    if (!text) return "";
    // Take everything that looks like a price (currency symbol + digits/decimals).
    const m = text.match(/[$€£¥₹₽][\s]*[\d.,]+(\s*[A-Z]{0,3})?/);
    if (m) return m[0].replace(/\s+[A-Z]{2,3}$/, "").trim();
    return text.trim();
  };

  const baseAtcLabel = (wrapper) => {
    const custom = wrapper.dataset.atcText;
    if (custom && custom.trim()) return custom.trim();
    return "Add to Cart";
  };
  const baseBuyLabel = (wrapper) => {
    const custom = wrapper.dataset.buyText;
    if (custom && custom.trim()) return custom.trim();
    return "Buy Now";
  };

  const writeButton = (btn, label) => {
    if (!btn) return;
    if (btn.textContent.trim() === label.trim()) return;
    btn.textContent = label;
  };

  const updateLabels = (wrapper) => {
    if (!wrapper) return;
    const section = wrapper.closest(".sec__featured-product");
    if (!section) return;
    const priceEl = section.querySelector(
      ".product-detail__price .price-regular .price-item--last, " +
      ".product-detail__price .price-item--last, " +
      ".product-detail__price .price-regular"
    );
    const priceText = cleanPrice((priceEl?.textContent || "").trim());

    const wantATCprice = wrapper.dataset.priceInAtc === "true";
    const wantBuyPrice = wrapper.dataset.priceInBuyNow === "true";
    const customText = wrapper.dataset.customButtonText === "true";

    const atcBtn = wrapper.querySelector(
      ".product-form__submit, button[name='add']:not(.shopify-payment-button__button)"
    );
    const buyBtn = wrapper.querySelector(
      ".shopify-payment-button__button--unbranded, .shopify-payment-button__button"
    );

    // ----- ATC button -----
    if (atcBtn) {
      let label = baseAtcLabel(wrapper);
      if (wantATCprice && priceText) label = label + " " + priceText;
      if (customText || wantATCprice) writeButton(atcBtn, label);
    }
    // ----- Buy Now button -----
    if (buyBtn && !buyBtn.classList.contains("shopify-payment-button__button--branded")) {
      let label = baseBuyLabel(wrapper);
      if (wantBuyPrice && priceText) label = label + " " + priceText;
      if (customText || wantBuyPrice) writeButton(buyBtn, label);
    }
  };

  const interceptATC = (wrapper) => {
    if (wrapper.dataset.atcRedirectCheckout !== "true") return;
    if (wrapper.__atcRedirectAttached) return;
    wrapper.__atcRedirectAttached = true;
    const form = wrapper.querySelector("form[action*='/cart/add']");
    if (!form) return;
    form.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const submitBtn = form.querySelector(
          ".product-form__submit, button[name='add']:not(.shopify-payment-button__button)"
        );
        if (submitBtn) submitBtn.setAttribute("disabled", "disabled");
        const formData = new FormData(form);
        fetch("/cart/add.js", {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        })
          .then(() => { window.location.href = "/checkout"; })
          .catch(() => { window.location.href = "/checkout"; });
      },
      { capture: true }
    );
  };

  const apply = () => {
    document
      .querySelectorAll(".product-detail__buy-buttons[data-atc-redirect-checkout='true']")
      .forEach(interceptATC);
    document
      .querySelectorAll(
        ".product-detail__buy-buttons[data-price-in-atc='true']," +
        ".product-detail__buy-buttons[data-price-in-buy-now='true']," +
        ".product-detail__buy-buttons[data-custom-button-text='true']"
      )
      .forEach(updateLabels);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
  if ("MutationObserver" in window) {
    // At most once a frame: this ran two document-wide queries on every DOM
    // change anywhere on the page (timers, sliders, the cart drawer).
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; apply(); });
    });
    mo.observe(document.documentElement, { subtree: true, childList: true });
  }
  document.addEventListener("variant:change", apply);
  let n = 0;
  const i = setInterval(() => {
    apply();
    if (++n >= 30) clearInterval(i);
  }, 200);
})();

/* Replace Shopify's locale-driven "Buy it now" label on the dynamic checkout
   button with a shorter "Buy Now". Re-runs whenever Shopify lazily renders
   or re-renders the payment button (variant change, drawer reopen, etc.). */
(function renameBuyNow() {
  const TARGET = "Buy Now";
  const REPLACE_RX = /^\s*(Buy it now|Buy now|Buy It Now|Acheter maintenant|Comprar ahora|Jetzt kaufen)\s*$/i;
  const apply = (root) => {
    if (!root || !root.querySelectorAll) return;
    root
      .querySelectorAll(
        ".shopify-payment-button__button--unbranded, .shopify-payment-button__button, .product__submit-buy-now, .button_buy-now, .buy-now-button"
      )
      .forEach((btn) => {
        if (!btn) return;
        // Skip Shop Pay / Apple Pay / Google Pay branded buttons.
        if (btn.classList.contains("shopify-payment-button__button--branded")) return;
        const text = (btn.textContent || "").trim();
        if (text && REPLACE_RX.test(text)) {
          btn.textContent = TARGET;
        }
      });
  };
  const run = () => apply(document);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  // Re-apply on DOM mutations (Shopify often renders the button asynchronously).
  if ("MutationObserver" in window) {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach((n) => apply(n));
        }
      }
    });
    mo.observe(document.documentElement, { subtree: true, childList: true });
  }
  // Last-resort polling for ~3s after load to catch slow Shopify hydration.
  let count = 0;
  const interval = setInterval(() => {
    run();
    if (++count >= 30) clearInterval(interval);
  }, 100);
})();

// js for live view
class LiveView extends HTMLElement {
  constructor() {
    super();
    this.min = this.dataset.min;
    this.max = this.dataset.max;
    this.interval = this.dataset.interval;
    this.message = this.dataset.message;
    this.init();
  }
  init() {
    if (this.message && this.max && this.min && this.interval) {
      this.handle();
      setInterval(() => {
        this.handle();
      }, this.interval * 1000);
    }
  }

  handle() {
    var message = "";
    message = this.message.replace(
      "[count]",
      this.randomSelect(parseInt(this.min), parseInt(this.max))
    );
    this.innerHTML = message;
  }

  randomSelect(min, max) {
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNumber;
  }
}
customElements.define("live-view", LiveView);



class CompareRadios extends SwatchInit {
  constructor() {
    super();
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    this.init();
    this.initFunction();
  }

  initFunction() {
    this.querySelectorAll(".product__color-swatches--js").forEach((btn) => {
      btn.addEventListener("click", this.onVariantChange.bind(this), false);
    });
  }

  onVariantChange(e) {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.toggle("active");
    this.handleWhenSwatchUpdate();
  }

  handleWhenSwatchUpdate() {
    this.updateOptions();
    const arrayItem = this.updateMasterId(this.variantData);
    this.handleMediaCompare(arrayItem);
  }

  handleMediaCompare(arrayItem) {
    if (!arrayItem) return;
    const html = `
            ${arrayItem
              .map((item) => {
                return `
                <div class="compare__items-inner">
                        <img width="300px" height="300px" src="${item.featured_media.preview_image.src}" alt="${item.featured_media.alt}">
                        <p class="mb-0 mt-10 heading-style capitalize">${item.title}</p></div>
                    `;
              })
              .join("")}
        `;
    const compareColorContent = this.closest(".compare-colors__content");
    if (!compareColorContent) return;
    const compareItems = compareColorContent.querySelector(".compare__items");
    if (!compareItems) return;
    compareItems.innerHTML = html;
  }

  updateMasterId(variantData) {
    let arrayItem = [];
    this.options.forEach((option) => {
      const matchingVariant = variantData.find((variant) => {
        return variant.options.includes(option);
      });
      if (matchingVariant) {
        arrayItem.push(matchingVariant);
      }
    });
    return arrayItem;
  }
}
customElements.define("compare-radios", CompareRadios);

class ProductRecommendations extends SlideSection {
  constructor() {
    super();
  }
  init() {
    this.call();
  }
  call() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement("div");
          html.innerHTML = text;
          const recommendations = html.querySelector("product-recommendations");
          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          } else {
            // No recommendations returned — collapse the whole section
            // (heading + padding included) quietly instead of showing
            // empty-state text or leaving skeleton ghosts behind. In the
            // theme editor only hide the grid so the section stays
            // selectable in the Customize sidebar.
            const sectionWrapper = this.closest(".shopify-section");
            if (sectionWrapper && !(window.Shopify && Shopify.designMode)) {
              sectionWrapper.style.display = "none";
            } else {
              this.style.display = "none";
            }
            if (document.querySelector(".product-recommendations-heading")) {
              document
                .querySelector(".product-recommendations-heading")
                .remove();
            }
          }
        })
        .finally(() => {
          if (this.querySelector(".swiper-wrapper")) {
            this.initSlide();
            BlsAnimations.init();
            BlsLazyloadImg.init();          
          }
          initLazyloadItem();
        })
        .catch((e) => {
          console.error(e);
          // Fetch failed — collapse the section so the skeleton ghosts
          // don't keep pulsing forever with nothing to replace them.
          const sectionWrapper = this.closest(".shopify-section");
          if (sectionWrapper && !(window.Shopify && Shopify.designMode)) {
            sectionWrapper.style.display = "none";
          } else {
            this.style.display = "none";
          }
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}
customElements.define("product-recommendations", ProductRecommendations);

// js for live view
class SkeletonPage extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    window.setTimeout(() => {
      this.classList.remove("skeleton");
    }, 1500);
  }
}
customElements.define("skeleton-page", SkeletonPage);

// js for live view
class ProductGrouped extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    var group = this.querySelector('.productGroup[type="application/json"]');
    if (!group) return;
    var variantData = JSON.parse(group.innerText);
    var query = "";
    variantData.forEach((e, key, variantData) => {
      if (!Object.is(variantData.length - 1, key)) {
        query += e + "%20OR%20id:";
      } else {
        query += e;
      }
    });
    var productAjaxURL = "?q=id:" + query + "&section_id=product-grouped";
    fetch(`${window.routes.search_url}${productAjaxURL}`)
      .then((response) => response.text())
      .then(async (responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        this.innerHTML = html.querySelector(".product-group").innerHTML;
      })
      .catch((e) => {
        throw error;
      })
      .finally(() => {
        this.eventProductGroupAction();
      });
  }

  eventProductGroupAction() {
    document
      .querySelectorAll(".product-group-list .product-variant-option")
      .forEach((select) => {
        select.addEventListener(
          "change",
          (event) => {
            var target = event.target;
            var image =
                target.options[target.selectedIndex].getAttribute("data-image"),
              price =
                target.options[target.selectedIndex].getAttribute("data-price"),
              pro_handle = target.getAttribute("data-handle"),
              image =
                target.options[target.selectedIndex].getAttribute("data-image"),
              price =
                target.options[target.selectedIndex].getAttribute("data-price"),
              pro_handle = target.getAttribute("data-handle"),
              compare_price =
                target.options[target.selectedIndex].getAttribute(
                  "data-compare-price"
                );
            var img = target
              .closest(".product-group-list")
              .querySelector(".product-group-item ." + pro_handle + "")
              .querySelector("img");
            if (img) {
              img.removeAttribute("srcset");
              img.setAttribute("src", image);
            }
            const productTarget = target.closest(".product-group-item");
            const bls__price = productTarget.querySelector(
              ".product-item__price .card-product-price"
            );
            if (bls__price) {
              if (!bls__price.querySelector(".compare-price")) {
                var ps = document.createElement("div");
                var sp = document.createElement("span");
                var cp = document.createElement("s");
                cp.classList.add("price-item", "compare-price");
                sp.appendChild(cp);
                ps.appendChild(sp);
                ps.classList.add("price-regular");
                if (productTarget.querySelector(".card-product-price")) {
                  productTarget
                    .querySelector(".card-product-price")
                    .appendChild(ps);
                }
              }
              const cpp = bls__price.querySelector(".compare-price");

              if (cpp) {
                if (compare_price && compare_price > price) {
                  const compare_format = Shopify.formatMoney(
                    compare_price,
                    themeGlobalVariables.settings.money_format
                  );
                  cpp.innerHTML = compare_format;
                  if (bls__price.querySelector(".price-regular")) {
                    bls__price
                      .querySelector(".price-regular")
                      .classList.add("primary-color");
                  }
                  if (bls__price.querySelector(".price-regular .price")) {
                    bls__price
                      .querySelector(".price-regular .price")
                      .classList.add("price--special");
                  }
                } else {
                  cpp.innerHTML = "";
                  if (bls__price.querySelector(".price-regular")) {
                    bls__price
                      .querySelector(".price-regular")
                      .classList.remove("primary-color");
                  }
                  if (bls__price.querySelector(".price-regular .price")) {
                    bls__price.querySelector(
                      ".price-regular .price"
                    ).innerHTML = Shopify.formatMoney(
                      price,
                      cartStrings.money_format
                    );
                    bls__price
                      .querySelector(".price-regular .price")
                      .classList.remove("price--special");
                  }
                }
              }
            }
            target.setAttribute("data-price", price);
            target.setAttribute("data-compare-price", compare_price);
          },
          false
        );
      });

    let totalQty = 0;
    const classQty = document.querySelectorAll(
      ".quantity__input-product-group"
    );
    classQty.forEach((input) => {
      let valueQtyDefault = input.value;
      let valueAsDefault = parseFloat(valueQtyDefault);
      if (!isNaN(valueAsDefault)) {
        totalQty += valueAsDefault;
      }
      input.addEventListener("change", () => {
        totalQty = 0;
        classQty.forEach((value) => {
          let valueQty = value.value;
          let valueAsQty = parseFloat(valueQty);
          if (!isNaN(valueAsQty)) {
            totalQty += valueAsQty;
          }
        });
      });
    });
    document.querySelectorAll(".product-group-submit").forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          if (totalQty === 0) {
            const content = document.querySelector(
              ".form-infor .add-cart-error"
            );
            const messageErrQty = button.getAttribute("data-add-cart-err-qty");
            handleErrorMessagePopup(messageErrQty);
            if (!content) return;
          } else {
            this.submitProductGroup(event);
          }
        },
        false
      );
    });

    document.querySelectorAll(".product-group-buy-now").forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          if (totalQty === 0) {
            const content = document.querySelector(
              ".form-infor .add-cart-error"
            );
            const messageErrQty = button.getAttribute("data-add-cart-err-qty");
            handleErrorMessagePopup(messageErrQty);
            if (!content) return;
          } else {
            this.submitNowProductGroup(event);
          }
        },
        false
      );
    });
  }

  submitNowProductGroup(event) {
    event.preventDefault();
    const form = document.getElementById("form-product-grouped");
    const config = fetchConfig("json");
    config.headers["X-Requested-With"] = "XMLHttpRequest";
    delete config.headers["Content-Type"];
    const formData = new FormData(form);
    config.body = formData;
    fetch(`${routes.cart_add_url}.js`, config)
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        if (parsedState.items) {
          window.location.href = "/checkout";
        } else {
          const content = document.querySelector(".form-infor .add-cart-error");
          if (!content) return;
        }
      })
      .catch((e) => {
        throw e;
      });
  }

  submitProductGroup(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const cart =
      document.querySelector("cart-notification") ||
      document.querySelector("cart-drawer");
    const form = document.getElementById("form-product-grouped");
    const config = fetchConfig("json");
    config.headers["X-Requested-With"] = "XMLHttpRequest";
    delete config.headers["Content-Type"];
    let openMiniCart = 0;
    const formData = new FormData(form);
    if (cart) {
      formData.append(
        "sections",
        cart.getSectionsToRender().map((section) => section.id)
      );
      formData.append("sections_url", window.location.pathname);
    }
    config.body = formData;
    target.classList.add("loading");
    fetch(`${routes.cart_add_url}.js`, config)
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        fetch("/cart.json")
          .then((res) => res.json())
          .then((cart) => {
            if (cart.item_count != undefined) {
              document.querySelectorAll(".cart-count").forEach((el) => {
                if (el.classList.contains("cart-count-drawer")) {
                  el.innerHTML = `(${cart.item_count})`;
                } else {
                  el.innerHTML = cart.item_count > 100 ? '~' : cart.item_count;
                }
              });
              if (document.querySelector("header-total-price")) {
                document.querySelector("header-total-price").updateTotal(cart);
              }
              const cart_free_ship = document.querySelector(
                "free-ship-progress-bar"
              );
              if (cart_free_ship) {
                cart_free_ship.init(cart.items_subtotal_price);
              }
            }
          })
          .catch((error) => {
            throw error;
          });
        const parsedState = JSON.parse(state);
        if (parsedState.message) {
          handleErrorMessagePopup(parsedState.description);
          if (!content) return;
        } else {
          parsedState.items.forEach((e) => {
            if (e.quantity > 0) {
              openMiniCart = 1;
            }
          });
          cart.getSectionsToRender().forEach((section) => {
            const elementToReplace = document.getElementById(section.id);
            const html = new DOMParser().parseFromString(
              parsedState.sections[section.id],
              "text/html"
            );
            elementToReplace.innerHTML =
              html.querySelector("#minicart-form").innerHTML;
            const countdown = cart.querySelector(".cart-countdown-time");
            const html_countdown = html.querySelector(".cart-countdown-time");
            if (countdown && html_countdown) {
              countdown.innerHTML = html_countdown.innerHTML;
            }
          });
          cart.cartAction();
        }
      })
      .catch((e) => {
        throw e;
      })
      .finally(() => {
        target.classList.remove("loading");
        if (openMiniCart === 1) {
          cart.open();
        }
        const cartRecommend = document.querySelector(".cart-recommend");
        if (
          cartRecommend &&
          !cartRecommend.classList.contains("hidden-recommend")
        ) {
          if (cartRecommend.classList.contains('cart-recommend-custom')) {
            const cartUpsellItem = document.querySelectorAll('.cart-upsell-item');
            const cartUpsellSlide = document.querySelectorAll('.swiper-cart-upsell .swiper-slide');
            if (cartUpsellItem.length > 0) {
              setTimeout(function () {
                cartRecommend.classList.add("open");
              }, 800);
            } else if (cartUpsellSlide.length === 0){
              cartRecommend.classList.remove('block');
              cartRecommend.classList.add('hidden');
            }
          }else{
            setTimeout(function () {
              cartRecommend.classList.add("open");
            }, 800);
          }
        }
      });
  }
}
customElements.define("product-group", ProductGrouped);

// js for product addons
class ProductAddons extends PopupBase {
  constructor() {
    super();
    this.productPopupDiv = this.querySelector(".product-addons__content");
    this.init();
  }
  init() {
    if (this.productPopupDiv) {
      this.addEventListener("click", this.onClick.bind(this));
    }
  }
  onClick() {
    const html = this.productPopupDiv;
    if (!html) return;
    html.classList.remove("hidden");
    this.initPopup(
      html,
      `<h3 class="title-popup h5 my-0 px-20 px-md-30 py-20 border-bottom">${this.dataset?.textHeader}</h3>`
    );
  }
}
customElements.define("product-addons", ProductAddons);

class SwatchDropdown extends HTMLElement {
  constructor() {
    super();
    this.spanFor = this.dataset.spanFor;
    this.init();
  }
  init() {
    if (!this.spanFor) return;
    this.addEventListener("click", this.activeFilterSort.bind(this), false);
  }
  activeFilterSort() {
    if (this.querySelector(`#${this.spanFor}`).classList.contains("active")) {
      this.querySelector(`#${this.spanFor}`).classList.remove("active");
    } else {
      this.querySelector(`#${this.spanFor}`).classList.add("active");
    }
  }
}
customElements.define("swatch-dropdown", SwatchDropdown);

class ProductBoughtTogether extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    const boughTogether = document.querySelector(
      '.productBoughTogether[type="application/json"]'
    );
    if (!boughTogether) return;
    const variantData = JSON.parse(boughTogether.innerText);
    let query = "";
    variantData.forEach((e, key, variantData) => {
      if (!Object.is(variantData.length - 1, key)) {
        query += e + "%20OR%20id:";
      } else {
        query += e;
      }
    });
    const productAjaxURL =
      "?q=id:" + query + "&section_id=product-bough-together";
    fetch(`${window.routes.search_url}${productAjaxURL}`)
      .then((response) => response.text())
      .then(async (responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        document.getElementById("product-bought-together").innerHTML =
          html.querySelector(".bought-together").innerHTML;
      })
      .catch((e) => {
        throw error;
      })
      .finally(() => {
        this.eventProductBoughTogetherAction();
      });
  }
  eventProductBoughTogetherAction() {
    var _this = this;
    document
      .querySelectorAll(".bought-together-checkbox")
      .forEach((checkbox) => {
        checkbox.addEventListener(
          "change",
          (event) => {
            var target = event.target;
            var total_price = 0,
              total_compare_price = 0,
              save_price = 0,
              price,
              compare_price,
              pro_handle = event.target.getAttribute("data-handle");
            var img = target
              .closest("#product-bought-together")
              .querySelector(".product-bought-image-item." + pro_handle + "");
            if (target.checked) {
              img.classList.add("select");
              target
                .closest(".product-bought-together-item")
                .classList.add("select");
              target
                .closest(".product-bought-together-item")
                .querySelector(".product-variant-option")
                .removeAttribute("disabled");
              target
                .closest(".product-bought-together-item")
                .querySelector(".quantity")
                .removeAttribute("disabled");
            } else {
              img.classList.remove("select");
              target
                .closest(".product-bought-together-item")
                .classList.remove("select");
              target
                .closest(".product-bought-together-item")
                .querySelector(".product-variant-option")
                .setAttribute("disabled", true);
              target
                .closest(".product-bought-together-item")
                .querySelector(".quantity")
                .setAttribute("disabled", true);
            }
            setTimeout(function () {
              var bought_together_select = document.querySelectorAll(
                ".product-bought-together-item.select"
              );
              bought_together_select.forEach((item) => {
                var option = item.querySelector(".product-variant-option");
                price = option.getAttribute("data-price");
                compare_price = option.getAttribute("data-compare-price");
                total_price = total_price + Number(price);
                total_compare_price =
                  total_compare_price + Number(compare_price);
              });
              save_price = total_compare_price - total_price;
              _this.eventProductBoughTogetherUpdatePrice(
                total_price,
                total_compare_price,
                save_price
              );
              if (bought_together_select.length <= 1) {
                document
                  .querySelector(".bought-together-submit")
                  .setAttribute("disabled", true);
              } else {
                document
                  .querySelector(".bought-together-submit")
                  .removeAttribute("disabled");
              }
            }, 50);
          },
          false
        );
      });
    document
      .querySelectorAll("#product-bought-together .product-variant-option")
      .forEach((select) => {
        select.addEventListener(
          "change",
          (event) => {
            var target = event.target;
            var total_price = 0,
              total_compare_price = 0,
              save_price = 0,
              image =
                target.options[target.selectedIndex].getAttribute("data-image"),
              price =
                target.options[target.selectedIndex].getAttribute("data-price"),
              pro_handle = target.getAttribute("data-handle"),
              compare_price =
                target.options[target.selectedIndex].getAttribute(
                  "data-compare-price"
                );
            var img = target
              .closest("#product-bought-together")
              .querySelector(".product-bought-image-item." + pro_handle + "")
              .querySelector("img");
            if (img) {
              img.removeAttribute("srcset");
              img.setAttribute("src", image);
            }
            const productTarget = target.closest(
              ".product-bought-together-item"
            );
            const bls__price = productTarget.querySelector(
              ".product-item__price .card-product-price"
            );
            if (bls__price) {
              if (!bls__price.querySelector(".compare-price")) {
                var ps = document.createElement("div");
                var sp = document.createElement("span");
                var cp = document.createElement("s");
                cp.classList.add("price-item", "compare-price");
                sp.appendChild(cp);
                ps.appendChild(sp);
                ps.classList.add("price-regular");
                if (productTarget.querySelector(".card-product-price")) {
                  productTarget
                    .querySelector(".card-product-price")
                    .appendChild(ps);
                }
              }
              const cpp = bls__price.querySelector(".compare-price");

              if (cpp) {
                if (compare_price && compare_price > price) {
                  const compare_format = Shopify.formatMoney(
                    compare_price,
                    themeGlobalVariables.settings.money_format
                  );
                  cpp.innerHTML = compare_format;
                  if (bls__price.querySelector(".price-regular")) {
                    bls__price
                      .querySelector(".price-regular")
                      .classList.add("primary-color");
                  }
                  if (bls__price.querySelector(".price-regular .price")) {
                    bls__price
                      .querySelector(".price-regular .price")
                      .classList.add("price--special");
                  }
                } else {
                  cpp.innerHTML = "";
                  if (bls__price.querySelector(".price-regular")) {
                    bls__price
                      .querySelector(".price-regular")
                      .classList.remove("primary-color");
                  }
                  if (bls__price.querySelector(".price-regular .price")) {
                    bls__price.querySelector(
                      ".price-regular .price"
                    ).innerHTML = Shopify.formatMoney(
                      price,
                      cartStrings.money_format
                    );
                    bls__price
                      .querySelector(".price-regular .price")
                      .classList.remove("price--special");
                  }
                }
              }
            }
            target.setAttribute("data-price", price);
            target.setAttribute("data-compare-price", compare_price);
            document
              .querySelectorAll(".product-bought-together-item.select")
              .forEach((item) => {
                var option = item.querySelector(".product-variant-option");
                price = option.getAttribute("data-price");
                compare_price = option.getAttribute("data-compare-price");
                total_price = total_price + Number(price);
                total_compare_price =
                  total_compare_price + Number(compare_price);
              });
            save_price = total_compare_price - total_price;
            _this.eventProductBoughTogetherUpdatePrice(
              total_price,
              total_compare_price,
              save_price
            );
          },
          false
        );
      });

    document.querySelectorAll(".bought-together-submit").forEach((button) => {
      button.addEventListener(
        "click",
        this.submitBoughtTogether.bind(this),
        false
      );
    });
  }
  submitBoughtTogether(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const cart =
      document.querySelector("cart-notification") ||
      document.querySelector("cart-drawer");
    const form = document.getElementById("bought-together-form");
    const config = fetchConfig("json");
    config.headers["X-Requested-With"] = "XMLHttpRequest";
    delete config.headers["Content-Type"];
    const formData = new FormData(form);
    if (cart) {
      formData.append(
        "sections",
        cart.getSectionsToRender().map((section) => section.id)
      );
      formData.append("sections_url", window.location.pathname);
    }
    config.body = formData;
    target.classList.add("loading");
    fetch(`${routes.cart_add_url}.js`, config)
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        fetch("/cart.json")
          .then((res) => res.json())
          .then((cart) => {
            if (cart.item_count != undefined) {
              document.querySelectorAll(".cart-count").forEach((el) => {
                if (el.classList.contains("cart-count-drawer")) {
                  el.innerHTML = `(${cart.item_count})`;
                } else {
                  el.innerHTML = cart.item_count > 100 ? '~' : cart.item_count;
                }
              });
              if (document.querySelector("header-total-price")) {
                document.querySelector("header-total-price").updateTotal(cart);
              }
              const cart_free_ship = document.querySelector(
                "free-ship-progress-bar"
              );
              if (cart_free_ship) {
                cart_free_ship.init(cart.items_subtotal_price);
              }
            }
          })
          .catch((error) => {
            throw error;
          });
        const parsedState = JSON.parse(state);
        cart.getSectionsToRender().forEach((section) => {
          const elementToReplace = document.getElementById(section.id);
          const html = new DOMParser().parseFromString(
            parsedState.sections[section.id],
            "text/html"
          );
          elementToReplace.innerHTML =
            html.querySelector("#minicart-form").innerHTML;
          const countdown = cart.querySelector(".cart-countdown-time");
          const html_countdown = html.querySelector(".cart-countdown-time");
          if (countdown && html_countdown) {
            countdown.innerHTML = html_countdown.innerHTML;
          }
        });
        cart.cartAction();
      })
      .catch((e) => {
        throw e;
      })
      .finally(() => {
        target.classList.remove("loading");
        cart.open();
        const cartRecommend = document.querySelector(".cart-recommend");
        if (
          cartRecommend &&
          !cartRecommend.classList.contains("hidden-recommend")
        ) {
          if (cartRecommend.classList.contains('cart-recommend-custom')) {
            const cartUpsellItem = document.querySelectorAll('.cart-upsell-item');
            const cartUpsellSlide = document.querySelectorAll('.swiper-cart-upsell .swiper-slide');
            if (cartUpsellItem.length > 0) {
              setTimeout(function () {
                cartRecommend.classList.add("open");
              }, 800);
            } else if (cartUpsellSlide.length === 0){
              cartRecommend.classList.remove('block');
              cartRecommend.classList.add('hidden');
            }
          }else{
            setTimeout(function () {
              cartRecommend.classList.add("open");
            }, 800);
          }
        }
      });
  }

  eventProductBoughTogetherUpdatePrice(
    total_price,
    total_compare_price,
    save_price
  ) {
    var total = document.querySelector("#product-bought-together .box-total");
    if (total) {
      total.querySelector(".saved-price .price").innerHTML =
        Shopify.formatMoney(save_price, cartStrings.money_format);
      total.querySelector(".total-price .price__sale .price-item").innerHTML =
        Shopify.formatMoney(total_compare_price, cartStrings.money_format);
      total.querySelector(".total-price .price").innerHTML =
        Shopify.formatMoney(total_price, cartStrings.money_format);
      if (total_compare_price > total_price) {
        total.querySelector(".total-price").classList.add("price--on-sale");
        total
          .querySelector(".total-price .price")
          .classList.add("special-price");
      } else {
        total.querySelector(".total-price").classList.remove("price--on-sale");
        total
          .querySelector(".total-price .price")
          .classList.remove("special-price");
      }
      if (save_price > 1) {
        total.querySelector(".saved-price").classList.remove("hidden");
      } else {
        total.querySelector(".saved-price").classList.add("hidden");
      }
    }
  }
}
customElements.define("product-bought-together", ProductBoughtTogether);

document.addEventListener("DOMContentLoaded", function () {
  function addProductEntry(productJson, storedProducts) {
    if (storedProducts === null) storedProducts = [];

    var currentProductID = productJson.id.toString();
    if (!storedProducts.includes(currentProductID)) {
      storedProducts.unshift(currentProductID);
      if (storedProducts.length > 25) {
        storedProducts.pop();
      }
      localStorage.setItem(
        "materia__recently-viewed-products",
        JSON.stringify(storedProducts)
      );
    } else {
      const index = storedProducts.indexOf(currentProductID);
      if (index > -1) {
        storedProducts.splice(index, 1);
      }
      storedProducts.unshift(currentProductID);
      localStorage.setItem(
        "materia__recently-viewed-products",
        JSON.stringify(storedProducts)
      );
    }
  }

  const prodData = document.querySelector("[data-product-json]");
  if (prodData != null) {
    var productJson = JSON.parse(prodData.innerHTML);
    var storedProducts = JSON.parse(
      localStorage.getItem("materia__recently-viewed-products")
    );
    addProductEntry(productJson, storedProducts);
  }
});
var BlsDropDownProduct = (function () {
  return {
    innit: function () {
      var custom_select = document.querySelectorAll(".custom-select");
      if (custom_select) {
        custom_select.forEach((item) => {
          let select__selected = item.querySelector(".select__selected");
          select__selected.addEventListener("click", (e) => {
            let dropdown = e.target.nextElementSibling;
            dropdown.classList.toggle("hidden");
          });
        });
      }
      document.addEventListener("click", function (event) {
        if (!event.target.closest(".custom-select")) {
          document.querySelectorAll(".select__dropdown")?.forEach((item) => {
            item.classList.add("hidden");
          });
        }
      });
    },
  };
})();

BlsDropDownProduct.innit();

var SyncQuantityInput = (() => {
  return {
    init: () => {
      const syncInputs = document.querySelectorAll(
        ".product-detail__buy-buttons input.quantity-input"
      );
      syncInputs.forEach((input) => {
        input.addEventListener("change", function () {
          const value = this.value;
          syncInputs.forEach((otherInput) => {
            if (otherInput !== input) {
              otherInput.value = value;
            }
          });
        });
      });
    },
  };
})();

SyncQuantityInput.init();

class SlideSectionProductSet extends HTMLElement {
  constructor() {
    super();
    this.globalSlide = null;
    this.init();
  }

  init() {
    if (document.body.classList.contains("index")) {
      let pos = window.pageYOffset;
      if (pos > 0 || document.body.classList.contains("swiper-lazy")) {
        this.initSlide();
      } else {
        if (this.classList.contains("lazy-loading-swiper-before")) {
          this.initSlide();
        } else {
          this.classList.add("lazy-loading-swiper-after");
        }
      }
    } else {
      this.initSlide();
    }
  }

  initSlide() {
    const _this = this;
    var autoplaying = _this?.dataset.autoplay === "true";
    const loop = _this?.dataset.loop === "true";
    const itemDesktop = _this?.dataset.desktop ? _this?.dataset.desktop : 4;
    var itemTablet = _this?.dataset.tablet ? _this?.dataset.tablet : "";
    const itemMobile = _this?.dataset.mobile ? _this?.dataset.mobile : 1;
    const direction = _this?.dataset.direction
      ? _this?.dataset.direction
      : "horizontal";
    var autoplaySpeed = _this?.dataset.autoplaySpeed
      ? _this?.dataset.autoplaySpeed * 1000
      : 3000;
    var speed = _this?.dataset.speed ? _this?.dataset.speed : 400;
    const effect = _this?.dataset.effect ? _this?.dataset.effect : "slide";
    const row = _this?.dataset.row ? _this?.dataset.row : 1;
    var spacing = _this?.dataset.spacing ? _this?.dataset.spacing : 30;
    const autoItem = _this?.dataset.itemMobile === "true";
    const arrowCenterimage = _this?.dataset.arrowCenterimage
      ? _this?.dataset.arrowCenterimage
      : 0;
    spacing = Number(spacing);
    autoplaySpeed = Number(autoplaySpeed);
    speed = Number(speed);
    if (autoplaying) {
      autoplaying = { delay: autoplaySpeed };
    }
    if (!itemTablet) {
      if (itemDesktop < 2) {
        itemTablet = 1;
      } else if (itemDesktop < 3) {
        itemTablet = 2;
      } else {
        itemTablet = 3;
      }
    }
    this.globalSlide = new Swiper(_this, {
      slidesPerView: autoItem ? "auto" : itemMobile,
      spaceBetween: spacing >= 15 ? 15 : spacing,
      autoplay: autoplaying,
      direction: direction,
      loop: loop,
      effect: effect,
      speed: speed,
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      grid: {
        rows: row,
        fill: "row",
      },
      navigation: {
        nextEl: _this.querySelector(".swiper-button-next"),
        prevEl: _this.querySelector(".swiper-button-prev"),
      },
      pagination: {
        clickable: true,
        el: document.querySelector(".swiper-pagination-product-set"),
        type: "custom",
        renderCustom: function (swiper, current, total) {
          return current + "/" + total;
        }
      },
      breakpoints: {
        768: {
          slidesPerView: itemTablet,
          spaceBetween: spacing >= 30 ? 30 : spacing,
        },
        1025: {
          slidesPerView: itemDesktop,
          spaceBetween: spacing,
        },
      },

      on: {
        init: function () {
          if (arrowCenterimage) {
            var items_slide = _this.querySelectorAll(
              ".product-item__media--ratio"
            );
            if (items_slide.length != 0) {
              var oH = [];
              items_slide.forEach((e) => {
                oH.push(e.offsetHeight / 2);
              });
              var max = Math.max(...oH);
              var arrowsOffset = "--arrows-offset-top: " + max + "px";
              if (_this.querySelectorAll(".swiper-arrow")) {
                _this.querySelectorAll(".swiper-arrow").forEach((arrow) => {
                  arrow.setAttribute("style", arrowsOffset);
                });
              }
            }
          }
        }
      },
    });
  }
}
customElements.define("slide-section-product-set", SlideSectionProductSet);