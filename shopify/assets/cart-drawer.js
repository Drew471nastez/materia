/* Materia Themes. Cart drawer scripts, moved out of the drawer snippets so
   they are one cached file instead of inline script on every page. Loaded
   deferred by snippets/cart-drawer-sheets; each part runs in the order it was
   drawn (cart-drawer-addons, cart-drawer-polish, cart-drawer-sheets), keeps
   its own window flag, and an error in one does not stop the next. */
/* == snippets/cart-drawer-addons == */
try {
  (function(){
    function cdaTick(){
      var bars = document.querySelectorAll('[data-cd-urgency]');
      bars.forEach(function(el){
        var tpl = el.getAttribute('data-template') || '';
        var cutoff = (el.getAttribute('data-cutoff') || '16:00').split(':');
        var H = parseInt(cutoff[0],10), M = parseInt(cutoff[1],10) || 0;
        if (isNaN(H)) H = 16;
        var now = new Date();
        var end = new Date();
        end.setHours(H, M, 0, 0);
        var diff = (end - now) / 1000;
        if (diff <= 0) {
          /* Past cutoff in the user's local clock — fully hide the bar
             and remove it from the layout so no margin/space lingers. */
          if (!el.hidden) el.hidden = true;
          if (el.style.display !== 'none') el.style.display = 'none';
          return;
        }
        /* Pre-rendered bars come in visible already; make sure they
           stay visible if anything else flipped them off. */
        if (el.hidden) el.hidden = false;
        if (el.style.display === 'none') el.style.display = '';
        var h = Math.floor(diff / 3600);
        var m = Math.floor((diff % 3600) / 60);
        var s = Math.floor(diff % 60);
        var pad = function(n){ return n < 10 ? '0' + n : '' + n; };
        var time = (h > 0 ? pad(h) + ':' : '') + pad(m) + ':' + pad(s);
        var slot = el.querySelector('.cda-urgency__text');
        if (!slot) return;
        var hasPlaceholder = tpl.indexOf('{time}') !== -1;
        var html = hasPlaceholder
          ? tpl.replace('{time}', '<strong class="cda-urgency__timer">' + time + '</strong>')
          : tpl + ' <strong class="cda-urgency__timer">' + time + '</strong>';
        /* Only update the timer fragment so we don't fight the server-
           rendered initial markup on every tick (avoids a visible flash
           on first paint). */
        var existingTimer = slot.querySelector('.cda-urgency__timer');
        if (existingTimer) {
          /* Change the text in place: replacing it each second woke every
             page-wide DOM observer. */
          var tn = existingTimer.firstChild;
          if (tn && tn.nodeType === 3 && !tn.nextSibling) { if (tn.nodeValue !== time) tn.nodeValue = time; }
          else if (existingTimer.textContent !== time) existingTimer.textContent = time;
        } else {
          slot.innerHTML = html;
        }
      });
    }
    /* Always run a tick on each render so newly-injected addons refresh
       immediately when the cart drawer is re-rendered after add/remove. */
    cdaTick();
    /* Single global interval — set only once. */
    if (!window.__cdaUrgencyInterval) {
      window.__cdaUrgencyInterval = setInterval(cdaTick, 1000);
    }
    /* Expose so cart-update code can call it explicitly if needed */
    window.cdaTick = cdaTick;
  })();
} catch (error) { setTimeout(() => { throw error; }); }
/* == end snippets/cart-drawer-addons == */
/* == snippets/cart-drawer-polish == */
try {
(() => {
  if (window.__materiaDrawerPresentationV6) return;
  window.__materiaDrawerPresentationV6 = true;
  const editor = () => window.self !== window.top || !!window.Shopify?.designMode || document.documentElement.classList.contains('shopify-design-mode');
  // Editor state survives a live re-render or a reload of the preview frame.
  // A sandboxed frame can refuse sessionStorage, so window.name is the fallback.
  const key = 'materia.drawer.preview.v3';
  const read = () => {
    let raw = null;
    try { raw = sessionStorage.getItem(key); } catch (_) {}
    if (!raw && typeof window.name === 'string' && window.name.startsWith(key + '=')) raw = window.name.slice(key.length + 1);
    try { const saved = JSON.parse(raw); return saved && Date.now() - saved.time < 600000 ? saved : null; } catch (_) { return null; }
  };
  let state = editor() ? read() : null;
  let saveTimer = 0;
  const save = () => {
    const raw = JSON.stringify(state);
    try { sessionStorage.setItem(key, raw); } catch (_) {}
    try { if (!window.name || window.name.startsWith(key + '=')) window.name = key + '=' + raw; } catch (_) {}
  };
  const getCart = () => document.getElementById('minicart_wrapper');
  const isOpen = cart => !!cart && (cart.classList.contains('open') || !!cart.querySelector('.minicart__wrapper.open'));
  const restore = () => {
    if (!state?.open) return;
    const cart = getCart(); if (!cart) return;
    // Shown open in place, without sliding in again.
    const html = document.documentElement;
    html.classList.add('materia-drawer-restoring');
    cart.classList.add('open'); cart.querySelector('.minicart__wrapper')?.classList.add('open');
    html.classList.add('open-drawer', 'open-minicart');
    const scroll = cart.querySelector('.minicart-scroll'); if (scroll && state.scroll) scroll.scrollTop = state.scroll;
    if (state.sheet) {
      cart.querySelector('.cart__addon-content#' + state.sheet)?.classList.add('is-open');
      const opener = cart.querySelector('[data-open="' + state.sheet + '"]');
      opener?.classList.add('open'); opener?.setAttribute('aria-expanded', 'true');
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      html.classList.remove('materia-drawer-restoring');
      // open() was not called on a redrawn element: give it its click-away close.
      if (cart.isConnected && typeof cart.onBodyClick === 'function') {
        document.body.removeEventListener('click', cart.onBodyClick);
        document.body.addEventListener('click', cart.onBodyClick);
      }
    }));
  };
  // Editor only. The builder redraws sections with unsaved settings but not
  // the layout, where this drawer lives. The cart-drawer-live section holds an
  // inert copy of the drawer that the builder does redraw; after each redraw
  // the drawer takes the new settings from the copy, in place, keeping this
  // browser's items, the open state, the scroll position and an open sheet.
  if (editor()) {
    state = state || {open: false, scroll: 0, sheet: '', time: Date.now()};
    const persist = cart => {
      if (!cart) return;
      state = {open: isOpen(cart), scroll: cart.querySelector('.minicart-scroll')?.scrollTop || 0, sheet: cart.querySelector('.cart__addon-content.is-open')?.id || '', time: Date.now()};
      clearTimeout(saveTimer); saveTimer = setTimeout(save, 200);
    };
    const syncAttributes = (live, fresh, keep) => {
      for (const {name} of [...live.attributes]) if (!fresh.hasAttribute(name) && name !== 'tabindex') live.removeAttribute(name);
      for (const {name, value} of [...fresh.attributes]) {
        if (name === 'class') { const next = [value, ...keep.filter(c => live.classList.contains(c))].join(' '); if (live.className !== next) live.className = next; }
        else if (live.getAttribute(name) !== value) live.setAttribute(name, value);
      }
    };
    let lastSource = null, retry = 0;
    const applySource = () => {
      const source = document.querySelector('template[data-cart-drawer-source]');
      const cart = getCart();
      if (!source || !cart) return;
      const markup = source.innerHTML;
      if (lastSource === null) { lastSource = markup; return; }
      if (markup === lastSource) return;
      // Wait while the shopper is typing in the drawer or dragging a sheet.
      const active = document.activeElement;
      if ((cart.contains(active) && active.matches('input, textarea, select')) || cart.querySelector('.cart__addon-content.is-dragging, cart-item-variant-switch.is-loading')) { clearTimeout(retry); retry = setTimeout(applySource, 400); return; }
      const content = document.importNode(source.content, true);
      const fresh = content.querySelector('#minicart_wrapper');
      const wrapper = cart.querySelector('.minicart__wrapper'), next = fresh?.querySelector('.minicart__wrapper');
      if (!fresh || !wrapper || !next) return;
      lastSource = markup;
      const scroll = cart.querySelector('.minicart-scroll')?.scrollTop || 0;
      const sheet = cart.querySelector('.cart__addon-content.is-open')?.id || '';
      // The copy is drawn without this browser's cart: keep the items on screen.
      const liveBody = wrapper.querySelector('#minicart-form'), nextBody = next.querySelector('#minicart-form');
      const liveCount = liveBody?.querySelectorAll('.cart-item').length || 0, nextCount = nextBody?.querySelectorAll('.cart-item').length || 0;
      if (liveBody && nextBody && (liveCount !== nextCount || !liveCount)) {
        const liveList = liveBody.querySelector('#minicart .items'), nextList = nextBody.querySelector('#minicart .minicart-body .items');
        const items = liveBody.querySelector('#minicart .minicart-body');
        const target = nextBody.querySelector('#minicart .minicart-body, #minicart .cart-body');
        if (liveCount && liveList && nextList && nextBody.querySelector('.cart-footer')) {
          // Only the rows move; messages around them follow the new settings.
          nextList.replaceWith(liveList);
          nextBody.querySelector('.cart-editor-preview')?.remove();
          for (const selector of ['[data-cart-subtotal-price]', '[data-discounts-list]']) {
            const from = liveBody.querySelector(selector), to = nextBody.querySelector(selector);
            if (from && to) to.innerHTML = from.innerHTML;
          }
        } else if (liveCount && items && target && nextBody.querySelector('.cart-footer')) {
          target.replaceWith(items);
          nextBody.querySelector('.cart-editor-preview')?.remove();
          for (const selector of ['[data-cart-subtotal-price]', '[data-discounts-list]']) {
            const from = liveBody.querySelector(selector), to = nextBody.querySelector(selector);
            if (from && to) to.innerHTML = from.innerHTML;
          }
        } else {
          nextBody.replaceWith(liveBody);
        }
        const label = cart.querySelector('.cart-count-drawer')?.textContent;
        if (label) next.querySelectorAll('.cart-count-drawer').forEach(el => { el.textContent = label; });
        const bar = cart.querySelector('free-ship-progress-bar'), nextBar = next.querySelector('free-ship-progress-bar');
        if (bar && nextBar) nextBar.setAttribute('data-order', bar.dataset.order || '0');
      }
      // Colour blocks are tagged with data-cart-drawer-style; update each by
      // name, add a new one, remove one the new settings no longer write.
      const liveBlocks = new Map([...document.querySelectorAll('style[data-cart-drawer-style]')].filter(el => !el.closest('template')).map(el => [el.dataset.cartDrawerStyle, el]));
      const freshBlocks = [...content.querySelectorAll('style[data-cart-drawer-style]')];
      for (const style of freshBlocks) {
        const current = liveBlocks.get(style.dataset.cartDrawerStyle);
        if (current) { if (current.textContent !== style.textContent) current.textContent = style.textContent; liveBlocks.delete(style.dataset.cartDrawerStyle); }
        else cart.before(style.cloneNode(true));
      }
      liveBlocks.forEach(style => style.remove());
      syncAttributes(cart, fresh, ['open', 'cart-refreshing']);
      syncAttributes(wrapper, next, ['open']);
      wrapper.replaceChildren(...next.childNodes);
      const scroller = wrapper.querySelector('.minicart-scroll'); if (scroller) scroller.scrollTop = scroll;
      if (sheet) { wrapper.querySelector('#' + sheet)?.classList.add('is-open'); const opener = wrapper.querySelector('[data-open="' + sheet + '"]'); opener?.classList.add('open'); opener?.setAttribute('aria-expanded', 'true'); }
      cart.cartAction?.();
      window.cdaTick?.();
      document.querySelector('free-ship-progress-bar')?.init?.(document.querySelector('free-ship-progress-bar').dataset.order);
      document.dispatchEvent(new CustomEvent('materia:cart-drawer-updated'));
    };
    // Safety net: if the visible drawer itself is ever replaced, the new one
    // opens in place and keeps this browser's rows.
    const carry = (old, fresh) => {
      const oldList = old.querySelector('#minicart .items'), oldBody = old.querySelector('#minicart-form'), newBody = fresh.querySelector('#minicart-form');
      const had = old.querySelectorAll('.cart-item').length;
      if (!had || !oldBody || !newBody || fresh.querySelectorAll('.cart-item').length === had) return;
      const newList = newBody.querySelector('#minicart .minicart-body .items'), empty = newBody.querySelector('#minicart .cart-body');
      if (oldList && newList) newList.replaceWith(oldList);
      else if (empty && newBody.querySelector('.cart-footer')) empty.replaceWith(old.querySelector('#minicart .minicart-body'));
      else newBody.replaceChildren(...oldBody.childNodes);
      newBody.querySelector('.cart-editor-preview')?.remove();
      const label = old.querySelector('.cart-count-drawer')?.textContent;
      if (label) fresh.querySelectorAll('.cart-count-drawer').forEach(el => { el.textContent = label; });
      for (const selector of ['[data-cart-subtotal-price]', '[data-discounts-list]']) {
        const from = old.querySelector(selector), to = fresh.querySelector(selector);
        if (from && to) to.innerHTML = from.innerHTML;
      }
    };
    // Watch for the builder redrawing the copy, and the drawer for the shopper's own changes.
    let removed = null;
    new MutationObserver(records => {
      let replaced = false;
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node.nodeType !== 1 || node.isConnected) continue;
          const old = node.id === 'minicart_wrapper' ? node : (node.firstElementChild ? node.querySelector('#minicart_wrapper') : null);
          if (old && !old.closest('template')) { removed = old; replaced = true; }
        }
        for (const node of record.addedNodes) if (node.nodeType === 1 && (node.id === 'minicart_wrapper' || (node.firstElementChild && node.querySelector('#minicart_wrapper')))) replaced = true;
      }
      if (replaced) {
        const fresh = getCart();
        if (fresh && removed && fresh !== removed) { if (removed.classList.contains('open') || removed.querySelector('.minicart__wrapper.open')) persist(removed); carry(removed, fresh); }
        removed = null;
        restore(); watchCart();
      }
      if (records.some(r => r.target.closest?.('#shopify-section-cart-drawer-live') || [...r.addedNodes].some(n => n.nodeType === 1 && (n.id === 'shopify-section-cart-drawer-live' || n.querySelector?.('template[data-cart-drawer-source]'))))) applySource();
    }).observe(document.body || document.documentElement, {subtree: true, childList: true, characterData: true});
    const cartWatch = new MutationObserver(() => persist(getCart()));
    const watchCart = () => { cartWatch.disconnect(); const cart = getCart(); if (cart) cartWatch.observe(cart, {subtree: true, attributes: true, attributeFilter: ['class']}); };
    watchCart();
    window.addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(getCart()); save(); });
    document.addEventListener('scroll', event => { if (event.target.matches?.('.minicart-scroll')) persist(getCart()); }, {capture: true, passive: true});
    const boot = () => { applySource(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true}); else boot();
  }
  document.addEventListener('click', event => {
    const scrim = event.target.closest?.('.cart-drawer-sheet-scrim'); if (!scrim) return;
    event.preventDefault(); const cart = scrim.closest('cart-notification');
    cart.querySelectorAll('.cart__addon-content.is-open').forEach(sheet => sheet.classList.remove('is-open'));
    cart.querySelectorAll('.mini_cart_addon_btn.open').forEach(button => { button.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); });
  });
  if (editor()) restore();
})();
} catch (error) { setTimeout(() => { throw error; }); }
/* == end snippets/cart-drawer-polish == */
/* == snippets/cart-drawer-sheets == */
try {
(() => {
  if (window.__materiaCartSheetsV2) return;
  window.__materiaCartSheetsV2 = true;
  // Dragging a sheet down to close it is materiaSheetDrag in materia-experience.js,
  // shared with the country picker and the variant editor.
  const dragging = () => !!document.querySelector('#minicart_wrapper .cart__addon-content.is-dragging');

  function closeSheet(sheet) {
    const cart = sheet.closest('cart-notification');
    sheet.classList.remove('is-open');
    const opener = cart?.querySelector('.mini_cart_addon_btn[data-open="' + sheet.id + '"]');
    opener?.classList.remove('open');
    opener?.setAttribute('aria-expanded', 'false');
    if (sheet.contains(document.activeElement)) opener?.focus({preventScroll: true});
  }

  // Opening, cancelling and saving are handled here for every drawer render,
  // including bodies swapped in after a cart change. Capture phase, so the
  // older per-element listeners do not run a second time.
  function openSheet(button) {
    const cart = button.closest('cart-notification');
    const sheet = cart?.querySelector('#' + CSS.escape(button.dataset.open));
    if (!sheet) return;
    const wasOpen = sheet.classList.contains('is-open');
    cart.querySelectorAll('.cart__addon-content.is-open').forEach(open => closeSheet(open));
    if (wasOpen) return;
    sheet.classList.add('is-open');
    button.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    if (sheet.id === 'shipping') {
      const country = sheet.querySelector('#address_country');
      if (country?.options.length && !country.dataset.filled && typeof window.Shopify?.CountryProvinceSelector === 'function' && !country.dataset.ready) {
        try { new window.Shopify.CountryProvinceSelector('address_country', 'address_province', {hideElement: 'address_province_container'}); country.dataset.ready = 'true'; } catch (_) {}
      }
      fillCountries(sheet);
    }
    if (window.matchMedia('(pointer: coarse)').matches) {
      if (!sheet.hasAttribute('tabindex')) sheet.setAttribute('tabindex', '-1');
      sheet.focus({preventScroll: true});
    } else {
      sheet.querySelector('textarea, input:not([type="hidden"]), select')?.focus({preventScroll: true});
    }
  }
  async function saveNote(button) {
    const sheet = button.closest('.cart__addon-content');
    const field = sheet?.querySelector('textarea');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(window.routes?.cart_update_url || '/cart/update.js', {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({note: field ? field.value : ''})
      });
      if (!response.ok) throw new Error(String(response.status));
      if (field) field.defaultValue = field.value;
      closeSheet(sheet);
    } catch (_) {
      if (typeof window.showToast === 'function' && window.cartStrings?.error) window.showToast(window.cartStrings.error, 3000, 'modal-error');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }
  document.addEventListener('click', event => {
    const target = event.target;
    if (!target.closest?.('#minicart_wrapper')) return;
    const opener = target.closest('.mini_cart_addon_btn[data-open]');
    const cancel = !opener && target.closest('.cart__addon-content .btn-cancel');
    const note = !opener && !cancel && target.closest('.cart__addon-content [data-action="note"]');
    const gift = !opener && !cancel && !note && target.closest('.cart__addon-content .add-giftwrap');
    const leave = !opener && !cancel && !note && !gift && target.closest('#minicart-form .close-cart');
    if (!opener && !cancel && !note && !gift && !leave) return;
    event.preventDefault();
    event.stopPropagation();
    if (leave) { const cart = leave.closest('cart-notification'); if (typeof cart?.close === 'function') cart.close(); }
    else if (opener) openSheet(opener);
    else if (cancel) closeSheet(cancel.closest('.cart__addon-content'));
    else if (note) saveNote(note);
    else {
      const cart = gift.closest('cart-notification');
      if (typeof cart?.addGiftwrapClick === 'function') cart.addGiftwrapClick({preventDefault() {}, currentTarget: gift});
    }
  }, true);

  // Shipping estimate. Storelib may send no country list: fill one in the
  // shopper's language, with provinces where checkout asks for them.
  const COUNTRIES = 'AD AE AF AG AI AL AM AO AR AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
  const PROVINCES = {IT: "AG Agrigento|AL Alessandria|AN Ancona|AO Aosta|AR Arezzo|AP Ascoli Piceno|AT Asti|AV Avellino|BA Bari|BT Barletta-Andria-Trani|BL Belluno|BN Benevento|BG Bergamo|BI Biella|BO Bologna|BZ Bolzano|BS Brescia|BR Brindisi|CA Cagliari|CL Caltanissetta|CB Campobasso|CE Caserta|CT Catania|CZ Catanzaro|CH Chieti|CO Como|CS Cosenza|CR Cremona|KR Crotone|CN Cuneo|EN Enna|FM Fermo|FE Ferrara|FI Firenze|FG Foggia|FC Forlì-Cesena|FR Frosinone|GE Genova|GO Gorizia|GR Grosseto|IM Imperia|IS Isernia|AQ L'Aquila|SP La Spezia|LT Latina|LE Lecce|LC Lecco|LI Livorno|LO Lodi|LU Lucca|MC Macerata|MN Mantova|MS Massa-Carrara|MT Matera|ME Messina|MI Milano|MO Modena|MB Monza e Brianza|NA Napoli|NO Novara|NU Nuoro|OR Oristano|PD Padova|PA Palermo|PR Parma|PV Pavia|PG Perugia|PU Pesaro e Urbino|PE Pescara|PC Piacenza|PI Pisa|PT Pistoia|PN Pordenone|PZ Potenza|PO Prato|RG Ragusa|RA Ravenna|RC Reggio Calabria|RE Reggio Emilia|RI Rieti|RN Rimini|RM Roma|RO Rovigo|SA Salerno|SS Sassari|SV Savona|SI Siena|SR Siracusa|SO Sondrio|SU Sud Sardegna|TA Taranto|TE Teramo|TR Terni|TO Torino|TP Trapani|TN Trento|TV Treviso|TS Trieste|UD Udine|VA Varese|VE Venezia|VB Verbano-Cusio-Ossola|VC Vercelli|VR Verona|VV Vibo Valentia|VI Vicenza|VT Viterbo", US: "AL Alabama|AK Alaska|AZ Arizona|AR Arkansas|CA California|CO Colorado|CT Connecticut|DE Delaware|DC District of Columbia|FL Florida|GA Georgia|HI Hawaii|ID Idaho|IL Illinois|IN Indiana|IA Iowa|KS Kansas|KY Kentucky|LA Louisiana|ME Maine|MD Maryland|MA Massachusetts|MI Michigan|MN Minnesota|MS Mississippi|MO Missouri|MT Montana|NE Nebraska|NV Nevada|NH New Hampshire|NJ New Jersey|NM New Mexico|NY New York|NC North Carolina|ND North Dakota|OH Ohio|OK Oklahoma|OR Oregon|PA Pennsylvania|RI Rhode Island|SC South Carolina|SD South Dakota|TN Tennessee|TX Texas|UT Utah|VT Vermont|VA Virginia|WA Washington|WV West Virginia|WI Wisconsin|WY Wyoming", CA: "AB Alberta|BC British Columbia|MB Manitoba|NB New Brunswick|NL Newfoundland and Labrador|NT Northwest Territories|NS Nova Scotia|NU Nunavut|ON Ontario|PE Prince Edward Island|QC Quebec|SK Saskatchewan|YT Yukon"};
  function fillCountries(sheet) {
    const country = sheet.querySelector('#address_country');
    const province = sheet.querySelector('#address_province');
    const box = sheet.querySelector('#address_province_container');
    if (!country) return;
    const real = [...country.options].filter(option => option.value);
    if (!real.length) {
      let names = null;
      try { names = new Intl.DisplayNames([country.dataset.locale || document.documentElement.lang || 'en'], {type: 'region'}); } catch (_) {}
      const list = COUNTRIES.map(code => [code, names?.of(code) || code]).sort((a, b) => a[1].localeCompare(b[1]));
      country.replaceChildren(...list.map(([code, name]) => { const option = new Option(name, code); option.dataset.code = code; return option; }));
      const wanted = (country.dataset.defaultCountry || '').toUpperCase();
      if (COUNTRIES.includes(wanted)) country.value = wanted;
      country.dataset.filled = 'true';
    }
    const syncProvinces = () => {
      if (!province) return;
      const selected = country.selectedOptions[0];
      let entries = null;
      try { entries = JSON.parse(selected?.dataset.provinces || 'null'); } catch (_) {}
      if (!entries?.length) entries = (PROVINCES[selected?.dataset.code || country.value] || '').split('|').filter(Boolean).map(item => [item.slice(0, item.indexOf(' ')), item.slice(item.indexOf(' ') + 1)]);
      if (entries.length) province.replaceChildren(...entries.map(([value, name]) => new Option(name || value, value)));
      else province.replaceChildren();
      if (box) box.hidden = !entries.length;
    };
    if (!country.dataset.bound) {
      country.dataset.bound = 'true';
      country.addEventListener('change', syncProvinces);
    }
    if (!province?.options.length) syncProvinces();
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest?.('#minicart_wrapper [data-action="shipping"]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (button.disabled) return;
    const panel = button.closest('#shipping'), message = panel?.querySelector('.addon-message');
    if (!panel || !message) return;
    fillCountries(panel);
    const country = panel.querySelector('#address_country');
    const selected = country?.selectedOptions[0];
    const params = new URLSearchParams();
    // Shopify-style rates expect the country name; a filled list carries the code.
    params.set('shipping_address[zip]', panel.querySelector('#AddressZip')?.value.trim() || '');
    params.set('shipping_address[country]', country?.dataset.filled ? (selected?.textContent || '') : (country?.value || ''));
    params.set('shipping_address[country_code]', selected?.dataset.code || '');
    params.set('shipping_address[province]', panel.querySelector('#address_province')?.value || '');
    const showFallback = () => {
      message.classList.remove('error');
      const fallback = panel.querySelector('[data-shipping-fallback]');
      if (fallback) message.replaceChildren(...[...fallback.children].map(node => node.cloneNode(true)));
      else message.textContent = message.dataset.unavailable || '';
    };
    button.disabled = true; message.replaceChildren(); message.setAttribute('aria-busy', 'true');
    try {
      const base = String(window.routes?.cart_url || '/cart').replace(/\/$/, '');
      const response = await fetch(base + '/shipping_rates.json?' + params, {credentials: 'same-origin', headers: {Accept: 'application/json'}});
      let data = null;
      try { data = await response.json(); } catch (_) {}
      if (!data || response.status === 404 || response.status === 405 || (response.ok && !Array.isArray(data.shipping_rates))) { showFallback(); return; }
      if (!response.ok) throw new Error(Object.values(data).flat().join(' '));
      message.classList.remove('error');
      if (!data.shipping_rates.length) { showFallback(); return; }
      const list = document.createElement('ul'); list.className = 'shipping-rates';
      for (const rate of data.shipping_rates) {
        const li = document.createElement('li'); li.className = 'shipping-rate';
        const name = document.createElement('span'); name.className = 'shipping-rate__name'; name.textContent = rate.name;
        const price = document.createElement('span'); price.className = 'shipping-rate__price';
        price.textContent = window.Shopify?.formatMoney ? window.Shopify.formatMoney(Math.round(Number(rate.price) * 100), window.cartStrings?.money_format) : String(rate.price) + (window.cartStrings?.cart_symbol ? ' ' + window.cartStrings.cart_symbol : '');
        li.append(name, price);
        if (message.dataset.showDeliveryDays === 'true' && rate.delivery_days?.length) {
          const days = document.createElement('span'); days.className = 'shipping-rate__eta';
          days.textContent = rate.delivery_days.join('–') + ' ' + (rate.delivery_days.at(-1) === 1 ? message.dataset.deliveryDayOne : message.dataset.deliveryDaysOther);
          li.append(days);
        }
        list.append(li);
      }
      message.append(list);
    } catch (error) {
      message.classList.add('error'); message.textContent = window.cartStrings?.error || error.message;
    } finally { button.disabled = false; message.removeAttribute('aria-busy'); }
  }, true);

  // The dimmed page behind the drawer always closes it, even when the drawer
  // was re-rendered by the editor and its own listeners are not attached.
  // The close buttons always close the drawer, also after the builder redraws
  // it and the buttons it bound at start are gone.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('#minicart_wrapper :is(.close-cart-button, .close-cart)');
    if (!button || button.closest('.cart__addon-content')) return;
    const cart = button.closest('cart-notification') || document.getElementById('minicart_wrapper');
    if (typeof cart?.close !== 'function') return;
    event.preventDefault();
    cart.close();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest?.('.overlayminicart')) return;
    const cart = document.getElementById('minicart_wrapper');
    if (cart?.classList.contains('open') && typeof cart.close === 'function') cart.close();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || dragging()) return;
    const cart = document.getElementById('minicart_wrapper');
    if (!cart?.classList.contains('open') || cart.querySelector('.cart__addon-content.is-open, cart-item-variant-switch:not([hidden])')) return;
    if (typeof cart.close === 'function') cart.close();
  });

  // Readable text whatever scheme is picked. Some schemes are made for text
  // over dark photos (white text on a white background); in the drawer that
  // hides the title, products and quantities. When the scheme's text has less
  // than 3:1 contrast with its background, the drawer's text, headings, icons
  // and dividers switch to near black (or near white on a dark background).
  // Buttons keep their own colours.
  const rgb = value => { const m = String(value).match(/[\d.]+/g); return m && m.length >= 3 ? m.slice(0, 4).map(Number) : null; };
  const luminance = ([r, g, b]) => { const c = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * c(r) + .7152 * c(g) + .0722 * c(b); };
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  function ensureInk() {
    const cart = document.getElementById('minicart_wrapper');
    const panel = cart?.querySelector('.minicart__wrapper');
    if (!panel) return;
    const style = getComputedStyle(panel);
    const bg = rgb(style.backgroundColor), fg = rgb(style.color);
    let ink = document.getElementById('materia-cart-ink');
    if (!bg || (bg.length === 4 && bg[3] === 0)) { ink?.remove(); return; }
    const color = luminance(bg) > .35 ? '#1a1a1a' : '#f5f5f5';
    // A main button filled with the drawer's own background gets a thin edge.
    const button = cart.querySelector('.btn-checkout, .minicart-action.btn-primary');
    const fill = button && rgb(getComputedStyle(button).backgroundColor);
    const edge = fill && (fill.length < 4 || fill[3] > 0) && contrast(bg, fill) < 1.3
      ? `html body #minicart_wrapper.minicart :is(.btn-checkout, .minicart-action.btn-primary, .cart__addon-content :is(.btn-save, .coupon-apply)) { box-shadow: inset 0 0 0 1px ${color} !important; }` : '';
    const unreadable = fg && contrast(bg, fg) < 3;
    if (!unreadable && !edge) { ink?.remove(); return; }
    const css = edge + (unreadable ? `html body #minicart_wrapper.minicart, html body #minicart_wrapper.minicart :is(.minicart__wrapper, .minicart-form, .cart-footer, .drawer-bottom, .cart__addon-content) {
  --color-text: ${color} !important; --color-heading: ${color} !important; --color-border: color-mix(in srgb, ${color} 18%, transparent) !important; color: ${color} !important; }
html body #minicart_wrapper.minicart :is(.minicart-heading, .minicart-heading *, .cart-count, .cart-count-drawer, .close-cart-button, .close-cart-button svg, .close-cart-button svg path, .countdown-inner *, .cart-empty :is(h1, h2, h3, h4, h5, h6, .h6, p), .minicart__product-name, .minicart__product-name a, .minicart__item-variant, .product-option, .quantity-input, .quantity__button, .minicart__item-edit, .cart-remove, .cart-remove svg, .subtotal :is(h5, .subtotal-price), .cart-terms__text, .cart-tool-label, .cart-shipping-label, .mini_cart_addon_btn, .cart-recommend .minicart-heading, .cart-recommend .product-item__name, .cart-recommend .product-item__name a, .cart-recommend .price) {
  color: ${color} !important; }
html body #minicart_wrapper.minicart :is(.quantity-input, .minicart__actions, .minicart__item-edit, .cart-terms__check, .cart-addons, .cart-addons > div) { border-color: color-mix(in srgb, ${color} 22%, transparent) !important; }` : '');
    if (!ink) { ink = document.createElement('style'); ink.id = 'materia-cart-ink'; document.head.append(ink); }
    if (ink.textContent !== css) ink.textContent = css;
  }
  let inkFrame = 0;
  const queueInk = () => { cancelAnimationFrame(inkFrame); inkFrame = requestAnimationFrame(ensureInk); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queueInk, {once: true}); else queueInk();
  window.addEventListener('load', queueInk, {once: true});
  document.addEventListener('materia:cart-drawer-updated', queueInk);
  // Check again when the drawer opens and when its markup or colours arrive.
  new MutationObserver(queueInk).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  new MutationObserver(records => { if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.id === 'minicart_wrapper' || (n.tagName === 'STYLE' && n.id !== 'materia-cart-ink'))))) queueInk(); })
    .observe(document.body || document.documentElement, {subtree: true, childList: true});

})();
} catch (error) { setTimeout(() => { throw error; }); }
/* == end snippets/cart-drawer-sheets == */
