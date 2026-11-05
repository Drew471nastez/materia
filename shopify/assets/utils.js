/* Materia Themes. Developed By Materia Themes. */
"use-strict";
/* Safari 15.0-15.3 and older Firefox lack these two, which the theme's
   scripts use for the last item of a list and an own-key check. */
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, "at", { configurable: true, writable: true, value(index) {
    const n = Math.trunc(index) || 0;
    return this[n < 0 ? this.length + n : n];
  } });
}
if (!Object.hasOwn) {
  Object.defineProperty(Object, "hasOwn", { configurable: true, writable: true, value: (object, key) => Object.prototype.hasOwnProperty.call(object, key) });
}
/* The theme's own requests (cart, sections, search, recommendations, product
   pages) on a slow or broken connection. Each one gets a deadline, so a
   stalled request ends in its caller's error state instead of a spinner that
   never stops. A GET that fails on the network, or meets a busy server (429,
   502-504), is asked once more. A POST is never sent twice: the cart may
   already have taken it, so its caller shows the error and the shopper
   decides. A timeout is a TimeoutError, never an AbortError, so callers that
   ignore their own cancelled requests still show it. Success is untouched:
   the same response, at the same time. Other addresses (Storelib's own,
   other sites) go straight to the browser. */
(() => {
  const native = window.fetch;
  if (typeof native !== "function" || native.__materiaResilient || typeof AbortController !== "function") return;
  const THEME_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2,4})?\/)?(?:cart|products|collections|search|recommendations|variants|pages|blogs)(?:[/.?]|$)/i;
  const PLATFORM = /^\/(?:api|_|admin|checkout|apps|builder)(?:[/.?_-]|$)/i;
  const BUSY = [429, 502, 503, 504];
  const limits = () => Object.assign({ get: 15000, post: 25000, retryDelay: 600 }, window.materiaFetchLimits);
  const timeoutError = () => {
    try { return new DOMException("The request took too long.", "TimeoutError"); }
    catch (_) { const error = new Error("The request took too long."); error.name = "TimeoutError"; return error; }
  };
  const describe = (input, init) => {
    try {
      const isRequest = typeof Request === "function" && input instanceof Request;
      const url = new URL(isRequest ? input.url : String(input), location.href);
      const method = String((init && init.method) || (isRequest ? input.method : "GET")).toUpperCase();
      if (url.origin !== location.origin || (init && init.keepalive) || PLATFORM.test(url.pathname)) return null;
      if (!THEME_PATH.test(url.pathname) && !/[?&](section_id|sections)=/.test(url.search)) return null;
      if (method !== "GET" && method !== "HEAD" && method !== "POST") return null;
      return { method, signal: (init && init.signal) || (isRequest ? input.signal : null) };
    } catch (_) { return null; }
  };
  const once = (input, init, outer, ms) => {
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    const done = () => { clearTimeout(timer); if (outer) outer.removeEventListener("abort", cancel); };
    const timer = setTimeout(() => { timedOut = true; done(); controller.abort(); }, ms);
    if (outer) outer.addEventListener("abort", cancel, { once: true });
    const fail = error => { done(); throw timedOut ? timeoutError() : error; };
    return native.call(window, input, Object.assign({}, init, { signal: controller.signal })).then(response => {
      // The deadline covers reading the body too, and ends once it is read.
      ["text", "json", "blob", "arrayBuffer", "formData"].forEach(name => {
        const read = response[name];
        if (typeof read !== "function") return;
        try {
          Object.defineProperty(response, name, { configurable: true, writable: true, value() {
            return read.apply(response, arguments).then(value => { done(); return value; }, fail);
          } });
        } catch (_) {}
      });
      return response;
    }, fail);
  };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const resilient = function (input, init) {
    const request = describe(input, init);
    if (!request || (request.signal && request.signal.aborted)) return native.apply(window, arguments);
    const limit = limits();
    const ms = request.method === "POST" ? limit.post : limit.get;
    const outer = request.signal;
    const first = once(input, init, outer, ms);
    if (request.method === "POST") return first;
    const again = () => (outer && outer.aborted) ? Promise.reject(new DOMException("The request was cancelled.", "AbortError")) : once(input, init, outer, ms);
    return first.then(response => {
      if (BUSY.indexOf(response.status) === -1) return response;
      const after = Math.min(3000, (parseFloat(response.headers.get("Retry-After")) || 0) * 1000) || limit.retryDelay;
      return wait(after).then(again).catch(() => response);
    }, error => {
      // TypeError is a network failure in every browser; a timeout is not retried.
      if (!error || error.name !== "TypeError" || (outer && outer.aborted)) throw error;
      return wait(limit.retryDelay).then(again);
    });
  };
  resilient.__materiaResilient = true;
  window.fetch = resilient;
})();
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function deleteCookie(cname) {
  document.cookie = cname + "=;expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

function setCookie(cname, cvalue, exdays) {
  const date = new Date();
  date.setTime(date.getTime() + exdays * 24 * 60 * 60 * 1000);
  let expires = "expires=" + date.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function fetchConfig(type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
  };
}

let parser = new DOMParser();

const ON_CHANGE_DEBOUNCE_TIMER = 300;

const PUB_SUB_EVENTS = {
  cartUpdate: "cart-update",
  quantityUpdate: "quantity-update",
  variantChange: "variant-change",
};

let subscribers = {};
var root = document.body;

// The helpers below hang off a global `Shopify` object. Make sure it exists so
// a page without it does not stop this file before getScrollBarWidth,
// subscribe/publish and formatMoney are defined (theme.js relies on them).
window.Shopify = window.Shopify || {};

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target?.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent("on" + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options["method"] || "post";
  var params = options["parameters"] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for (var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
  country_domid,
  province_domid,
  options
) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(
    options["hideElement"] || province_domid
  );

  Shopify.addListener(
    this.countryEl,
    "change",
    Shopify.bind(this.countryHandler, this)
  );

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute("data-default");
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute("data-default");
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    if (!opt) return; // no countries listed (or none chosen): nothing to fill in
    var raw = opt.getAttribute("data-provinces");
    var provinces = JSON.parse(raw) || []; // a country listed without provinces

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = "none";
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement("option");
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement("option");
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

Shopify.formatMoney = function (cents, format) {
  if (typeof cents == "string") {
    cents = cents.replace(".", "");
  }
  var value = "";
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || this.money_format;

  function defaultOption(opt, def) {
    return typeof opt == "undefined" ? def : opt;
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ",");
    decimal = defaultOption(decimal, ".");
    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    var parts = number.split("."),
      dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands),
      cents = parts[1] ? decimal + parts[1] : "";
    return dollars + cents;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
  }
  return formatString.replace(placeholderRegex, value);
};
var getScrollBarWidth = (function () {
  return {
    init: function () {
      var scrollDiv = document.createElement("div");
      scrollDiv.style.width = "100px";
      scrollDiv.style.height = "100px";
      scrollDiv.style.overflow = "scroll";
      scrollDiv.style.position = "absolute";
      scrollDiv.style.top = "-9999px";
      document.body.appendChild(scrollDiv);
      var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return scrollbarWidth;
    },
  };
})();
function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach((callback) => {
      if (data) {
        callback(data);
      } else {
        callback();
      }
    });
  }
}
function initLazyloadItem() {
  const lazyVideos = document.querySelectorAll("video.lazy-video-item");

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const video = entry.target;
          const poster = video.dataset.poster;
          const src = video.dataset.src;

          if (poster) {
            video.setAttribute("poster", poster);
            video.removeAttribute("data-poster");
            video.setAttribute("src", src);
            video.removeAttribute("data-src");
          }

          video.querySelectorAll("source").forEach((source) => {
            const source_src = source.dataset.src;
            if (source_src) {
              source.setAttribute("src", source_src);
              source.removeAttribute("data-src");
            }
          });

          video.classList.remove("lazy-video-item");
          observer.unobserve(video); // Stop observing once loaded
        }
      });
    },
    { threshold: 0.1 } // Trigger when 10% of the video is visible
  );

  lazyVideos.forEach((video) => observer.observe(video));
}

// Initialize lazy loading item
initLazyloadItem();

function initLazyload() {
  // Passive and at most once a frame: this used to query the whole document on
  // every scroll event.
  let lazyFrame = 0;
  window.addEventListener("scroll", () => {
    if (lazyFrame) return;
    lazyFrame = requestAnimationFrame(() => {
      lazyFrame = 0;
      scrollLazyload();
    });
  }, { passive: true });
  // Read in the first frame: reading the scroll position while the page's
  // scripts run forced a layout of the whole page (50-75ms on a phone).
  requestAnimationFrame(() => {
    if (window.pageYOffset > 40) scrollLazyload();
  });
}
initLazyload();

function scrollLazyload() {
  document.querySelectorAll("video.lazy-video").forEach((el) => {
    scrollLazyloadItem(el);
  });
}

function scrollLazyloadItem(el) {
  const poster = el.dataset.poster;
  const src = el.dataset.src;
  if (poster) {
    el.setAttribute("poster", poster);
    el.removeAttribute("data-poster");
    el.setAttribute("src", src);
    el.removeAttribute("data-src");
  }
  el.querySelectorAll("source").forEach((source) => {
    const source_src = source.dataset.src;
    if (source_src) {
      source.setAttribute("src", source_src);
      source.removeAttribute("data-src");
    }
  });
  el.classList.remove("lazy-video");
}