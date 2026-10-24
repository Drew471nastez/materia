/* Materia Themes. Developed By Materia Themes. */
/* Wishlist page (sections/page-wishlist.storelib).
   The saved list is product ids in localStorage ("materia__wishlist-items",
   read through window.MateriaWishlist from theme.js when it is there). The
   page asks Storelib for the saved products' cards with the Section
   Rendering API on the search page:
     /search?q=id:<id> OR id:<id>&type=product&section_id=page-wishlist
   which answers this section drawn with search.results: the theme's own
   product cards, with the theme's card settings. Cards come back in the
   order they were saved. A remove (the card's X, or a heart anywhere,
   another tab) takes the card out with a short fade; the empty state shows
   when none are left. Runs again when the list changes in another tab and
   when the page comes back from the back/forward cache. */
"use strict";

(function () {
  if (window.__materiaWishlistPage) return;
  window.__materiaWishlistPage = true;

  var KEY = "materia__wishlist-items";
  var BATCH = 20;

  function store() {
    if (window.MateriaWishlist) return window.MateriaWishlist;
    return {
      read: function () {
        try {
          var v = JSON.parse(window.localStorage.getItem(KEY) || "[]");
          return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
        } catch (e) { return []; }
      },
      sync: function () {},
    };
  }
  function reduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function searchUrl() {
    return (window.routes && window.routes.search_url) || "/search";
  }

  function WishlistPage(root) {
    this.root = root;
    this.main = root.querySelector(".wishlist-page-main");
    this.list = root.querySelector("[data-wishlist-items]");
    this.empty = root.querySelector("[data-wishlist-empty]");
    this.loading = root.querySelector("[data-wishlist-loading]");
    this.status = root.querySelector("[data-wishlist-status]");
    this.section = root.dataset.renderSection || "page-wishlist";
    this.request = 0;
    this.shown = [];
  }

  WishlistPage.prototype.ids = function () { return store().read(); };

  WishlistPage.prototype.setLoading = function (on) {
    if (this.list) this.list.setAttribute("aria-busy", on ? "true" : "false");
    if (this.loading) this.loading.hidden = !on;
  };

  WishlistPage.prototype.showEmpty = function (on) {
    if (this.empty) this.empty.hidden = !on;
    this.root.classList.toggle("is-empty", !!on);
  };

  WishlistPage.prototype.cards = function () {
    return this.list ? Array.prototype.slice.call(this.list.querySelectorAll("[data-wishlist-card]:not([data-wishlist-sample])")) : [];
  };

  WishlistPage.prototype.fetchBatch = function (ids) {
    var q = ids.map(function (id) { return "id:" + id; }).join(" OR ");
    var url = searchUrl() + "?q=" + encodeURIComponent(q) + "&type=product&options%5Bunavailable_products%5D=last&section_id=" + encodeURIComponent(this.section);
    return fetch(url, { credentials: "same-origin", headers: { Accept: "text/html" } })
      .then(function (response) {
        if (!response.ok) throw new Error("wishlist " + response.status);
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var found = {};
        doc.querySelectorAll("[data-wishlist-card][data-wishlist-id]").forEach(function (card) {
          found[String(card.dataset.wishlistId)] = card;
        });
        return found;
      });
  };

  /* Draw the saved products. Each run supersedes the one before it. */
  WishlistPage.prototype.render = function () {
    var self = this;
    var ids = this.ids();
    var run = ++this.request;
    if (!this.list) return Promise.resolve();
    var samples = this.list.querySelectorAll("[data-wishlist-sample]");
    if (!ids.length) {
      this.cards().forEach(function (card) { card.remove(); });
      this.shown = [];
      this.setLoading(false);
      // In the builder the sample cards stay so the creator can style them.
      this.showEmpty(!samples.length);
      return Promise.resolve();
    }
    samples.forEach(function (card) { card.remove(); });
    // Cards already drawn are kept; only products not drawn yet are asked for.
    var have = {};
    this.cards().forEach(function (card) {
      var id = String(card.dataset.wishlistId);
      if (ids.indexOf(id) === -1) card.remove();
      else have[id] = card;
    });
    var missing = ids.filter(function (id) { return !have[id]; });
    this.showEmpty(false);
    this.setLoading(!!missing.length && !Object.keys(have).length);
    var batches = [];
    for (var i = 0; i < missing.length; i += BATCH) batches.push(missing.slice(i, i + BATCH));
    return Promise.all(batches.map(function (b) { return self.fetchBatch(b); }))
      .then(function (results) {
        if (run !== self.request) return;
        var found = Object.assign.apply(Object, [{}].concat(results));
        var frag = document.createDocumentFragment();
        var shown = [];
        // In the order saved.
        ids.forEach(function (id) {
          var card = have[id] || (found[id] && document.importNode(found[id], true));
          if (!card) return;
          frag.appendChild(card);
          shown.push(id);
        });
        self.list.appendChild(frag);
        self.shown = shown;
        self.setLoading(false);
        self.showEmpty(!shown.length);
        store().sync(self.root);
        if (typeof window.initLazyloadItem === "function") {
          try { window.initLazyloadItem(); } catch (e) {}
        }
      })
      .catch(function (error) {
        if (run !== self.request) return;
        console.warn("[wishlist] could not load the saved products", error);
        self.setLoading(false);
        self.showEmpty(!self.cards().length);
      });
  };

  /* A product taken out: fade its card out, then show the empty state if
     it was the last. */
  WishlistPage.prototype.removeCard = function (id) {
    var self = this;
    var card = this.list && this.list.querySelector('[data-wishlist-card][data-wishlist-id="' + String(id).replace(/"/g, '\\"') + '"]:not([data-wishlist-sample])');
    if (!card) return;
    var done = function () {
      // The cards after it slide into its place instead of jumping.
      var rest = self.cards().filter(function (c) { return c !== card; });
      var before = rest.map(function (c) { return c.getBoundingClientRect(); });
      card.remove();
      self.shown = self.shown.filter(function (x) { return x !== String(id); });
      if (!self.cards().length) { self.showEmpty(true); return; }
      if (reduced()) return;
      rest.forEach(function (c, i) {
        var now = c.getBoundingClientRect();
        var dx = before[i].left - now.left, dy = before[i].top - now.top;
        if ((dx || dy) && typeof c.animate === "function") {
          c.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
        }
      });
    };
    var message = this.root.dataset.removedMessage;
    if (message && this.status) {
      var status = this.status;
      clearTimeout(this.statusTimer);
      status.classList.remove("is-leaving");
      status.textContent = message;
      status.classList.remove("visually-hidden");
      status.classList.add("is-shown");
      // Fade out, then back to a screen reader only status line.
      this.statusTimer = setTimeout(function () {
        status.classList.add("is-leaving");
        self.statusTimer = setTimeout(function () {
          status.classList.remove("is-shown", "is-leaving");
          status.classList.add("visually-hidden");
        }, reduced() ? 0 : 220);
      }, 2600);
    }
    if (reduced() || typeof card.animate !== "function") { done(); return; }
    card.style.pointerEvents = "none";
    card.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.96)" }], { duration: 220, easing: "ease-out", fill: "forwards" }).finished.then(done, done);
  };

  function setup() {
    var pages = Array.prototype.map.call(document.querySelectorAll("[data-wishlist-page]"), function (root) {
      if (root.__wishlistPage) return root.__wishlistPage;
      var page = new WishlistPage(root);
      root.__wishlistPage = page;
      page.render();
      return page;
    });
    return pages;
  }

  document.addEventListener("materia:wishlist-change", function (event) {
    var detail = event.detail || {};
    document.querySelectorAll("[data-wishlist-page]").forEach(function (root) {
      var page = root.__wishlistPage;
      if (!page) return;
      if (detail.added === false && detail.id && !detail.source) page.removeCard(detail.id);
      else page.render();
    });
  });
  // theme.js reports another tab's change as materia:wishlist-change; this
  // covers a page where theme.js is not loaded.
  window.addEventListener("storage", function (event) {
    if (window.MateriaWishlist || (event.key !== KEY && event.key !== null)) return;
    document.querySelectorAll("[data-wishlist-page]").forEach(function (root) { if (root.__wishlistPage) root.__wishlistPage.render(); });
  });
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    document.querySelectorAll("[data-wishlist-page]").forEach(function (root) { if (root.__wishlistPage) root.__wishlistPage.render(); });
  });
  document.addEventListener("storelib:section-load", function () { setup(); });
  document.addEventListener("shopify:section:load", function () { setup(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
  window.MateriaWishlistPage = { setup: setup };
})();
