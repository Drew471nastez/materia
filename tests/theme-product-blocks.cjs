// Product information blocks of Main product and Featured product.
//
// Static: both sections declare the same blocks with the same settings, in
// groups with headers; every visible_if is one simple comparison on a
// setting of its own block; every name the Buy buttons markup reads is
// declared; both sections draw their blocks from snippets/product-info-blocks;
// square images and the video player are set where the media is drawn.
//
// Browser, on fixtures drawn the way the snippets draw them with the theme's
// own CSS and JS:
//   - Buy buttons: icons sized with the label and painted in its colour,
//     custom text and price keep the icon and spinner, appearance per button,
//     full width on and off, quantity on the right, 375px.
//   - Add to wishlist: toggles with the theme's wishlist (and without it),
//     saves the product, fires materia:wishlist-change, the header count
//     follows, keyboard, reduced motion.
//   - Square product images: 1:1 slides and thumbnails, the picture covers
//     the square, nothing moves when it arrives.
//   - Video in the builder: inside a sandboxed canvas with design mode on and
//     a builder that cancels clicks, the gallery video plays and pauses, an
//     autoplay gallery plays muted, a Product videos card opens.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const schemaOf = f => JSON.parse(read(f).match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]);
const markupOf = f => { const text = read(f); return text.slice(0, text.lastIndexOf('</template>')); };
let checks = 0;

/* ---------------------------------------------------------------- static */
const MAIN = 'sections/main-product.storelib', FEAT = 'sections/featured-product.storelib';
const main = schemaOf(MAIN), feat = schemaOf(FEAT);
{
  assert.deepEqual(main.shopify.blocks, feat.shopify.blocks, 'both sections declare the same product information blocks');
  assert.deepEqual(main.blocks.map(b => b.type), feat.blocks.map(b => b.type), 'the builder panels list the same blocks');
  const COMPARISON = /^\{\{ (false|block\.settings\.[a-z0-9_]+( == ('[a-z0-9_]+'|true|false))?) \}\}$/;
  for (const [file, schema] of [[MAIN, main], [FEAT, feat]]) {
    for (const model of [schema.shopify, schema]) {
      for (const block of model.blocks) {
        const settings = block.settings || [];
        const ids = settings.filter(s => s.id && !['header', 'paragraph'].includes(s.type)).map(s => s.id);
        assert.equal(new Set(ids).size, ids.length, `${file} ${block.type}: setting ids are unique`);
        const shown = settings.filter(s => !['header', 'paragraph'].includes(s.type) && s.visible_if !== '{{ false }}');
        if (shown.length > 3) assert(settings.some(s => s.type === 'header'), `${file} ${block.type}: settings are grouped under headers`);
        settings.forEach((s, i) => {
          if (s.visible_if) {
            assert.match(s.visible_if, COMPARISON, `${file} ${block.type}.${s.id}: visible_if is one simple comparison`);
            for (const [, ref] of s.visible_if.matchAll(/block\.settings\.([a-z0-9_]+)/g)) assert(ids.includes(ref), `${file} ${block.type}.${s.id}: visible_if reads a declared setting (${ref})`);
          }
          if (s.type === 'header') {
            const rest = settings.slice(i + 1);
            const next = rest.findIndex(x => x.type === 'header');
            const group = next === -1 ? rest : rest.slice(0, next);
            assert(group.some(x => x.visible_if !== '{{ false }}'), `${file} ${block.type}: header "${s.content || s.label}" introduces a visible setting`);
          }
          if (s.label && s.type !== 'paragraph' && !String(s.label).startsWith('t:')) assert(s.label.length <= 60, `${file} ${block.type}.${s.id}: short label`);
        });
      }
    }
  }
  checks++;
}
{
  const block = main.shopify.blocks.find(b => b.type === 'buy_buttons');
  const ids = block.settings.map(s => s.id).filter(Boolean);
  for (const id of ['show_quantity', 'show_variant_picker', 'show_add_to_cart', 'show_dynamic_checkout', 'atc_appearance', 'buy_appearance',
    'atc_icon_enable', 'atc_icon', 'atc_icon_color', 'buy_icon_enable', 'buy_icon', 'buy_icon_color', 'show_gift_card_recipient',
    'enable_custom_button_typography', 'enable_estimated_delivery', 'enable_custom_button_text', 'show_price_in_atc', 'show_price_in_buy_now',
    'enable_custom_colors', 'estimated_delivery_text', 'atc_hover_text', 'buy_hover_text', 'atc_font_weight', 'buy_font_weight', 'atc_text_color',
    'buy_text_color', 'atc_button_text', 'buy_button_text', 'estimated_delivery_color', 'atc_bg_color', 'atc_hover_bg', 'buy_bg_color', 'buy_hover_bg',
    'quantity_right_of_atc', 'atc_redirect_checkout', 'show_wishlist_button', 'wishlist_display', 'wishlist_label', 'wishlist_added_label',
    'buttons_full_width', 'icon_custom_color']) assert(ids.includes(id), 'buy_buttons declares ' + id);
  assert.deepEqual(block.settings.filter(s => s.type === 'header').map(s => s.content), ['Buttons', 'Layout', 'Style', 'Text', 'Icons', 'Delivery note', 'Checkout']);
  // Every name the Buy buttons markup reads is declared.
  const blocks = markupOf('snippets/product-info-blocks.storelib');
  const branch = blocks.slice(blocks.indexOf("{%- when 'buy_buttons' -%}"), blocks.indexOf("{%- when 'upsell_pro' -%}"));
  const snippet = markupOf('snippets/buy-buttons.storelib');
  const read1 = [...branch.matchAll(/\bblock_st\.([a-z0-9_]+)/g), ...snippet.matchAll(/\bbb\.([a-z0-9_]+)/g)].map(m => m[1]);
  for (const id of new Set(read1)) assert(ids.includes(id), 'buy_buttons reads undeclared ' + id);
  for (const id of ids) assert(read1.includes(id), 'buy_buttons setting is drawn: ' + id);
  checks++;
}
{
  for (const file of ['snippets/main-product-body.storelib', 'snippets/product-single-layout.storelib']) {
    const text = read(file);
    assert(text.includes("{%- include 'product-info-blocks' -%}"), file + ' draws the shared blocks');
    assert(!/\{%-?\s*when 'buy_buttons'/.test(text), file + ' has no block markup of its own');
  }
  // Liquid tags balance in every changed snippet.
  for (const file of ['snippets/product-info-blocks.storelib', 'snippets/buy-buttons.storelib', 'snippets/product-media-layout.storelib',
    'snippets/media-gallery.storelib', 'snippets/main-product-body.storelib', 'snippets/product-single-layout.storelib', 'snippets/size-chart-popup-import.storelib']) {
    const text = markupOf(file).replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '').replace(/\{%-?\s*raw\s*-?%\}[\s\S]*?\{%-?\s*endraw\s*-?%\}/g, '');
    const stack = [];
    for (const m of text.matchAll(/\{%-?\s*(\w+)([\s\S]*?)-?%\}/g)) {
      const names = m[1] === 'liquid' ? m[2].split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean) : [m[1]];
      for (const name of names) {
        if (['if', 'unless', 'for', 'case', 'capture', 'form', 'style', 'comment'].includes(name)) stack.push(name);
        else if (/^end(if|unless|for|case|capture|form|style|comment)$/.test(name)) assert.equal(stack.pop(), name.slice(3), `${file}: ${name} closes its own tag`);
      }
    }
    assert.deepEqual(stack, [], file + ': every Liquid tag closed');
    assert(!/<[a-z][^>]*\son[a-z]+\s*=/i.test(text), file + ': no inline event handlers');
  }
  const layout = read('snippets/product-media-layout.storelib');
  assert(/if section_st\.media_square or section_st\.enable_image_square\s+assign media_ratio = '1\/1'/.test(layout), 'square images are set where the media is drawn');
  assert(!/--aspect-ratio: \{\{ ratio \}\}/.test(layout), 'every slide and thumbnail takes the square ratio');
  assert.equal((layout.match(/<iframe/g) || []).length, (layout.match(/referrerpolicy="strict-origin-when-cross-origin"/g) || []).length, 'video players send the site as referrer, also from the builder canvas');
  assert(read('snippets/media-gallery.storelib').includes('{% if section_st.media_square or section_st.enable_image_square %}data-square{% endif %}'));
  // One set of product options and one product description per section.
  const pib = read('snippets/product-info-blocks.storelib');
  assert.equal((pib.match(/pib_drawn contains 'variants,'/g) || []).length, 2, 'Variant picker and Variant selector pro draw the options once');
  assert.equal((pib.match(/pib_drawn contains 'description,'/g) || []).length, 2, 'Product description and Short description draw the description once');
  for (const file of ['snippets/main-product-body.storelib', 'snippets/product-single-layout.storelib']) assert(read(file).includes("{%- assign pib_drawn = '' -%}"), file + ' starts the block loop clean');
  assert(!pib.includes('link_to_type'), 'product type links to a real collection, not a type search');
  assert.equal(feat.shopify.settings.find(s => s.id === 'show_view_link').default, false, 'the featured product link is off unless chosen');
  for (const file of [MAIN, FEAT]) assert(!/Force all product media|Square product images — overrides/.test(read(file)), file + ': no square override CSS left');
  assert(!read('snippets/main-product-body.storelib').includes('Force all product media to a square'));
  checks++;
}

/* --------------------------------------------------------------- browser */
const CSS = ['critical.css', 'theme.css', 'theme-button-contract.css', 'materia-experience.css', 'main-product.css', 'product-page-ui.css'];
const ICON = {
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};
// The markup snippets/buy-buttons and the buy_buttons branch draw.
const buyButtons = ({id, atcAppearance = 'theme', buyAppearance = 'theme', width = 'full', quantity = 'left', icons = true, iconColor = '',
  customText = false, price = false, wishlist = '', productId = 'p-1'}) => `
<div class="product-detail__buy-buttons button-trigger__sticky mb-20" id="${id}"
  data-atc-appearance="${atcAppearance}" data-buy-appearance="${buyAppearance}" data-bb-width="${width}" data-bb-quantity="${quantity}"
  ${price ? 'data-price-in-atc="true" data-price-in-buy-now="true"' : ''} ${customText ? 'data-custom-button-text="true" data-atc-text="Add to bag" data-buy-text="Buy it today"' : ''}>
  <div class="product__submit-form buy-btn-js d-flex flex-wrap btn-large"><product-form class="d-block product-form flex-1">
  <form method="post" action="/cart/add" id="product-form-${id}" class="feature-product-form"><input type="hidden" name="id" value="v-1">
  <div class="product-form__buttons btn-large flex flex-wrap gap-10">
    <div class="product__submit-form-cart flex flex-wrap gap-10 gap-lg-20 align-center grow-1">
      <div class="product-form__input product-form__quantity"><quantity-input class="quantity btn-rounded overflow-hidden border inline-flex text-center grey-bg">
        <button class="quantity__button inline-flex content-center pointer border-0 no-js-hidden w-custom grey-bg" name="minus" type="button" style="--custom-width: 4.5rem"><span class="visually-hidden">Decrease</span>-</button>
        <label class="visually-hidden" for="Quantity-${id}">Quantity</label>
        <input class="quantity-input bg-unset text-center appearance-none p-0-important w-custom" type="number" name="quantity" style="--input-padding: 0;--inputs-border-width: 0;--input-height: 4.8rem;--custom-width: 3.8rem;--input-border-radius: 0;--input-bg: transparent" min="1" step="1" value="1" form="product-form-${id}" id="Quantity-${id}">
        <button class="quantity__button inline-flex content-center pointer border-0 no-js-hidden w-custom grey-bg" name="plus" type="button" style="--custom-width: 4.5rem"><span class="visually-hidden">Increase</span>+</button>
      </quantity-input></div>
      <div class="button_buy-now grow-1">
        <button type="submit" name="add" class="btn btn-primary w-full product_submit_button product-form__submit word-wrap relative" data-sl-button data-button-role="primary" data-theme-button="primary"
          ${atcAppearance !== 'theme' ? `data-button-local-appearance="${atcAppearance}" data-button-appearance="${atcAppearance}"` : ''} style="--btn-padding-x: 2.5rem;">
          ${icons ? `<svg class="btn-icon hidden-on-load" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${iconColor ? ` style="stroke: ${iconColor} !important"` : ''}>${ICON.bag}</svg>` : ''}
          <span class="btn-label hidden-on-load" data-btn-label>Add to cart</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="spin opacity-0 icon-load"><use href="#icon-load"></use></svg>
        </button>
      </div>
      ${wishlist === 'icon' ? wishlistButton(productId, 'icon') : ''}
    </div>
    <div class="btn-checkout-dynamic w-full"><div class="shopify-payment-button" data-shopify="payment-button">
      <button type="submit" name="checkout" value="1" formnovalidate class="shopify-payment-button__button shopify-payment-button__button--unbranded" data-storelib-buy-now data-sl-button data-button-role="secondary" data-theme-button="secondary"
        ${buyAppearance !== 'theme' ? `data-button-local-appearance="${buyAppearance}" data-button-appearance="${buyAppearance}"` : ''}>
        ${icons ? `<svg class="btn-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON.lock}</svg>` : ''}
        <span class="btn-label" data-btn-label>Buy it Now</span>
      </button></div></div>
    ${wishlist === 'text' ? wishlistButton(productId, 'text') : ''}
  </div></form></product-form></div>
</div>`;
const wishlistButton = (id, display) => `<button-wishlist class="pdp-wishlist pdp-wishlist--${display}" role="button" tabindex="0" aria-pressed="false" aria-label="Add to wishlist"
  data-product-id="${id}" data-action="remove" data-tooltip-add="Add to wishlist" data-tooltip-remove="Saved to wishlist" data-tooltip-redirect="Saved to wishlist" data-mt-wishlist>
  <svg class="pdp-wishlist__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20"><path d="M12 20.3 4.6 13a4.8 4.8 0 0 1 0-6.8 4.7 4.7 0 0 1 6.7 0l.7.7.7-.7a4.7 4.7 0 0 1 6.7 0 4.8 4.8 0 0 1 0 6.8z"/></svg>
  <span class="pdp-wishlist__label tooltip-content${display === 'icon' ? ' visually-hidden' : ''}">Add to wishlist</span></button-wishlist>`;

const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--color-text:#333;--color-heading:#111;--color-background:#fff;--color-border:#ddd;--btn-primary-bg-color:#111;--btn-primary-color:#fff;--btn-secondary-bg-color:#2a4dff;--btn-secondary-color:#fff;--btn-font-size:16px;--btn-radius:8px}body{margin:0;padding:0 16px;font:15px/1.5 sans-serif}</style>
${CSS.map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('')}</head>`;
const themeJs = read('shopify/assets/theme.js');
const slice = (text, from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a); return a === -1 || b === -1 ? '' : text.slice(a, b + (to.startsWith('customElements') ? to.length : 0)); };
const themeWishlist = slice(themeJs, 'var MateriaWishlist', 'function HoverIntent') + '\n' + slice(themeJs, 'class ButtonWishlist', 'customElements.define("button-wishlist", ButtonWishlist);');
// The header's count bubble (shopify/assets/header-section.js, linked by sections/theme-header): it follows materia:wishlist-change.
const headerText = read('shopify/assets/header-section.js');
const headerCount = (headerText.match(/(\(function \(\) \{[\s\S]*?__materiaCountBubbles[\s\S]*?\n\}\)\(\);)/) || [])[1] || '';
const mainJs = read('shopify/assets/main-product.js');
const buyLabels = slice(mainJs, '/* Buy buttons enhancements:', '// js for live view');
const productPage = ({body, theme = true, bodyAttrs = 'data-btn-style="solid" data-btn-secondary-style="solid" data-btn-hover="fade"'}) => `${head}<body ${bodyAttrs}>
<header><a href="/wishlist">Wishlist <span class="wishlist-count h-count">0</span></a></header>
<section class="sec__featured-product" id="shopify-section-main"><div class="product-detail__information">
<div class="product-detail__price"><div class="price-regular"><span class="price-item price-item--last">R$ 137,77</span></div></div>
${body}</div></section>
<script>window.wishlistEvents=[];document.addEventListener('materia:wishlist-change',e=>window.wishlistEvents.push(e.detail));</script>
<script>${headerCount}</script>
${theme ? `<script>${themeWishlist}</script>` : ''}
<script src="/assets/materia-experience.js"></script>
<script src="/assets/product-page-ui.js"></script>
<script>${buyLabels}</script>
</body></html>`;

// A tiny VP8 clip (3 s, 64px, made with ffmpeg) for the video checks.
const WEBM = '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';
const canvasPage = ({builder = 'cancel', ui = true, autoplay = false}) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/critical.css"><link rel="stylesheet" href="/assets/main-product.css"><link rel="stylesheet" href="/assets/product-page-ui.css">
<script>window.Shopify={designMode:true};document.documentElement.classList.add('shopify-design-mode');</script>
<style>body{margin:0;width:640px}</style></head><body>
<section id="shopify-section-main" class="shopify-section"><div class="product-detail__media">
<media-gallery class="block" data-layout="thumbnail" data-mt-video="${autoplay ? 'autoplay' : 'manual'}">
  <div class="media-gallery__local-video swiper-slide media-item rounded-5 w-full" style="--aspect-ratio: 1/1">
    <div class="mt-video-frame"><video class="rounded-5 block w-full h-full absolute inset-0 media-video" src="/clip.webm" playsinline controls preload="metadata" loop ${autoplay ? 'muted autoplay' : ''}></video></div>
  </div>
</media-gallery></div>
<div class="product-detail__information" data-block-id="product_videos_1">
  <div id="PV-product_videos_1"><div class="pv-card" role="listitem" data-item style="width:300px;height:160px;position:relative"><span class="pv-hit" data-hit role="button" tabindex="0" aria-label="Play video" style="position:absolute;inset:0"></span></div></div>
</div></section>
<script>
  // The builder's own canvas script: a click inside a section selects it, and
  // the click's default action is cancelled${builder === 'stop' ? ' and stopped' : ''}.
  window.addEventListener('click', e => { if (e.target.closest('.shopify-section')) { e.preventDefault(); ${builder === 'stop' ? 'e.stopImmediatePropagation();' : ''} window.selected = (window.selected || 0) + 1; } }, true);
  const card = document.querySelector('.pv-card');
  card.__pvOpen = () => { window.cardOpened = (window.cardOpened || 0) + 1; };
  card.addEventListener('click', () => { document.getElementById('PV-product_videos_1').__pvLast = Date.now(); card.__pvOpen(); });
</script>
${ui ? '<script src="/assets/product-page-ui.js"></script>' : ''}
</body></html>`;

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const ctx = await browser.newContext({viewport: {width: 1200, height: 900}});
    const pages = new Map();
    await ctx.route('http://shop.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/assets/')) {
        const file = path.join(root, 'shopify/assets', url.pathname.slice(8));
        if (!fs.existsSync(file)) return route.fulfill({status: 404, body: ''});
        return route.fulfill({contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', body: fs.readFileSync(file, 'utf8')});
      }
      if (url.pathname === '/clip.webm') return route.fulfill({contentType: 'video/webm', body: Buffer.from(WEBM, 'base64')});
      if (pages.has(url.pathname)) return route.fulfill({contentType: 'text/html', body: pages.get(url.pathname)});
      return route.fulfill({status: 404, body: ''});
    });
    const open = async (name, html, viewport) => {
      pages.set('/' + name, html);
      const tab = await ctx.newPage();
      if (viewport) await tab.setViewportSize(viewport);
      tab.errors = [];
      tab.on('pageerror', e => tab.errors.push(e.message));
      await tab.goto('http://shop.test/' + name);
      await tab.waitForTimeout(150);
      return tab;
    };

    /* Buy buttons */
    {
      const tab = await open('buy', productPage({body: [
        buyButtons({id: 'bb-theme'}),
        buyButtons({id: 'bb-outline', atcAppearance: 'outline', buyAppearance: 'ghost', iconColor: '#ff0000'}),
        buyButtons({id: 'bb-auto', width: 'auto', quantity: 'right', icons: false}),
        buyButtons({id: 'bb-text', customText: true, price: true}),
      ].join('')}));
      const box = (sel) => tab.$eval(sel, el => { const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; });
      // icons: 1.15em of the label, in the label's colour, beside it
      for (const sel of ['#bb-theme button[name=add]', '#bb-theme .shopify-payment-button__button']) {
        const s = await tab.$eval(sel, b => { const i = b.querySelector('.btn-icon'), l = b.querySelector('.btn-label'); const ir = i.getBoundingClientRect(), lr = l.getBoundingClientRect();
          return {fs: parseFloat(getComputedStyle(b).fontSize), w: ir.width, h: ir.height, stroke: getComputedStyle(i).stroke, color: getComputedStyle(b).color, gap: lr.left - ir.right, mid: Math.abs((ir.top + ir.height / 2) - (lr.top + lr.height / 2))}; });
        assert(Math.abs(s.w - s.fs * 1.15) < 0.6 && Math.abs(s.h - s.fs * 1.15) < 0.6, `${sel}: icon sized with the text (${s.w} for ${s.fs}px)`);
        assert.equal(s.stroke, s.color, `${sel}: icon in the label colour`);
        assert(s.gap >= 6 && s.gap <= 10, `${sel}: icon sits beside the label (${s.gap})`);
        assert(s.mid < 1.5, `${sel}: icon centred on the label`);
      }
      assert.equal(await tab.$eval('#bb-outline button[name=add] .btn-icon', i => getComputedStyle(i).stroke), 'rgb(255, 0, 0)', 'custom icon colour');
      checks++;
      // appearance: Theme settings > Buttons by default, the block's own otherwise
      const look = sel => tab.$eval(sel, b => ({a: b.getAttribute('data-button-appearance'), bg: getComputedStyle(b).backgroundColor, role: b.getAttribute('data-theme-button')}));
      let l = await look('#bb-theme button[name=add]');
      assert.deepEqual([l.a, l.role, l.bg], ['solid', 'primary', 'rgb(17, 17, 17)']);
      l = await look('#bb-theme .shopify-payment-button__button');
      assert.deepEqual([l.a, l.role, l.bg], ['solid', 'secondary', 'rgb(42, 77, 255)']);
      l = await look('#bb-outline button[name=add]');
      assert.deepEqual([l.a, l.bg], ['outline', 'rgba(0, 0, 0, 0)']);
      l = await look('#bb-outline .shopify-payment-button__button');
      assert.deepEqual([l.a, l.bg], ['ghost', 'rgba(0, 0, 0, 0)']);
      await tab.evaluate(() => { document.body.dataset.btnSecondaryStyle = 'outline'; document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: {btn_secondary_style: 'outline'}}})); });
      await tab.waitForTimeout(60);
      assert.equal((await look('#bb-theme .shopify-payment-button__button')).a, 'outline', 'a theme change reaches Buy now');
      assert.equal((await look('#bb-outline .shopify-payment-button__button')).a, 'ghost', "the block's own appearance stays");
      checks++;
      // full width on: Add to cart fills the row beside quantity, Buy now the width; off: own widths
      const wrap = await box('#bb-theme .product-form__buttons'), qty = await box('#bb-theme .product-form__quantity'), atc = await box('#bb-theme button[name=add]'), buy = await box('#bb-theme .shopify-payment-button__button');
      assert(Math.abs(atc.x + atc.w - (wrap.x + wrap.w)) < 1.5 && atc.x > qty.x, 'full width: Add to cart fills the row after quantity');
      assert(Math.abs(buy.w - wrap.w) < 1.5, 'full width: Buy now spans the block');
      const awrap = await box('#bb-auto .product-form__buttons'), aatc = await box('#bb-auto button[name=add]'), aqty = await box('#bb-auto .product-form__quantity'), abuy = await box('#bb-auto .shopify-payment-button__button');
      assert(aatc.w < awrap.w / 2 && abuy.w < awrap.w / 2, 'full width off: buttons take their own width');
      assert(aqty.x > aatc.x, 'quantity on the right of Add to cart');
      assert(await tab.$eval('#bb-auto button[name=add]', b => !b.querySelector('svg.btn-icon')), 'no icon when off');
      checks++;
      // custom text and price: written into the label, the icon and spinner stay
      await tab.waitForTimeout(400);
      const t = await tab.$eval('#bb-text', w => ({atc: w.querySelector('button[name=add] .btn-label').textContent, buy: w.querySelector('.shopify-payment-button__button .btn-label').textContent,
        icons: w.querySelectorAll('.btn-icon').length, spinner: !!w.querySelector('button[name=add] .icon-load')}));
      assert.deepEqual(t, {atc: 'Add to bag R$ 137,77', buy: 'Buy it today R$ 137,77', icons: 2, spinner: true});
      assert.equal(await tab.$eval('#bb-theme .shopify-payment-button__button .btn-label', l => l.textContent), 'Buy Now', 'the default Buy now label is shortened in its label only');
      assert.equal(await tab.$$eval('#bb-theme .shopify-payment-button__button .btn-icon', n => n.length), 1);
      // loading: icon hidden, spinner centred, size kept
      const before = await box('#bb-theme button[name=add]');
      await tab.$eval('#bb-theme button[name=add]', b => b.classList.add('loading'));
      assert.equal(await tab.$eval('#bb-theme button[name=add] .btn-icon', i => getComputedStyle(i).visibility), 'hidden');
      assert.deepEqual(await box('#bb-theme button[name=add]'), before);
      await tab.$eval('#bb-theme button[name=add]', b => b.classList.remove('loading'));
      checks++;
      // 375px: no sideways scroll, every target 44px
      await tab.setViewportSize({width: 375, height: 800});
      await tab.waitForTimeout(50);
      assert(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 375px');
      for (const h of await tab.$$eval('#bb-theme :is(button[name=add], .shopify-payment-button__button)', n => n.map(b => b.getBoundingClientRect().height))) assert(h >= 44);
      assert.deepEqual(tab.errors, []);
      await tab.close();
      checks++;
    }

    /* Add to wishlist */
    for (const theme of [true, false]) {
      if (theme && !themeWishlist.includes('class ButtonWishlist')) continue;
      const tab = await open('wishlist-' + theme, productPage({theme, body: buyButtons({id: 'bb-w', wishlist: 'icon', productId: 'e3bd4d25'}) + buyButtons({id: 'bb-w2', wishlist: 'text', productId: 'e3bd4d25'})}), {width: 375, height: 800});
      const state = () => tab.evaluate(() => ({
        pressed: [...document.querySelectorAll('[data-mt-wishlist]')].map(b => b.getAttribute('aria-pressed')),
        label: document.querySelector('#bb-w2 .pdp-wishlist__label').textContent,
        saved: JSON.parse(localStorage.getItem('materia__wishlist-items') || '[]'),
        count: document.querySelector('.wishlist-count').textContent.trim(),
        events: window.wishlistEvents.length,
        fill: getComputedStyle(document.querySelector('#bb-w .pdp-wishlist__icon')).fill,
      }));
      let s = await state();
      assert.deepEqual([s.pressed, s.label, s.saved], [['false', 'false'], 'Add to wishlist', []]);
      const heart = await tab.$eval('#bb-w .pdp-wishlist', b => { const r = b.getBoundingClientRect(), a = b.parentElement.querySelector('button[name=add]').getBoundingClientRect(); return {w: r.width, h: r.height, ah: a.height, top: r.top - a.top}; });
      assert(heart.w >= 44 && heart.h >= 44 && Math.abs(heart.h - heart.ah) < 1 && Math.abs(heart.top) < 1, JSON.stringify(heart) + 'the heart sits beside Add to cart, as tall, 44px or more');
      assert(await tab.$eval('#bb-w .pdp-wishlist__icon', i => getComputedStyle(i).transitionProperty.includes('fill')), 'the heart fills smoothly');
      await tab.click('#bb-w .pdp-wishlist');
      await tab.waitForTimeout(80);
      s = await state();
      assert.deepEqual([s.pressed, s.label, s.saved, s.count], [['true', 'true'], 'Saved to wishlist', ['e3bd4d25'], '1'], `saved (${theme ? 'theme wishlist' : 'own fallback'})`);
      assert(s.events >= 1, 'materia:wishlist-change fired');
      assert.equal(await tab.evaluate(() => window.wishlistEvents.at(-1).added), true);
      assert.equal(await tab.$eval('#bb-w .pdp-wishlist', b => b.classList.contains('is-toggled')), true, 'adding plays the heart pop');
      assert.notEqual(s.fill, 'rgba(0, 0, 0, 0)');
      // keyboard on the text button takes it out again
      await tab.focus('#bb-w2 .pdp-wishlist');
      await tab.keyboard.press('Enter');
      await tab.waitForTimeout(80);
      s = await state();
      assert.deepEqual([s.pressed, s.label, s.saved, s.count], [['false', 'false'], 'Add to wishlist', [], '0']);
      assert.equal(await tab.evaluate(() => window.wishlistEvents.at(-1).added), false);
      assert(await tab.$eval('#bb-w2 .pdp-wishlist', b => b.getBoundingClientRect().width > 300), 'Icon and text spans the block on a phone');
      assert(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      // the form is never submitted by the heart
      assert.equal(await tab.evaluate(() => location.pathname), '/wishlist-' + theme);
      // another tab
      await tab.evaluate(() => { localStorage.setItem('materia__wishlist-items', '["e3bd4d25"]'); window.dispatchEvent(new StorageEvent('storage', {key: 'materia__wishlist-items'})); });
      await tab.waitForTimeout(40);
      assert.deepEqual((await state()).pressed, ['true', 'true'], 'another tab brings the state back');
      assert.deepEqual(tab.errors, []);
      await tab.evaluate(() => localStorage.clear());
      await tab.close();
      checks++;
    }
    {
      const ctxReduced = await browser.newContext({reducedMotion: 'reduce'});
      await ctxReduced.route('http://shop.test/**', route => { const u = new URL(route.request().url()); if (u.pathname.startsWith('/assets/')) return route.fulfill({contentType: 'text/css', body: read('shopify/assets/' + u.pathname.slice(8))}); return route.fulfill({contentType: 'text/html', body: productPage({theme: false, body: buyButtons({id: 'r', wishlist: 'icon'})})}); });
      const tab = await ctxReduced.newPage();
      await tab.goto('http://shop.test/r');
      await tab.$eval('.pdp-wishlist', b => b.classList.add('is-toggled'));
      assert.equal(await tab.$eval('.pdp-wishlist__icon', i => getComputedStyle(i).animationName), 'none', 'no pop under reduced motion');
      await ctxReduced.close();
      checks++;
    }

    /* Square product images */
    {
      const portrait = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#c33"/></svg>');
      const slide = (cls, i, ratio, css = '') => `<a class="media-gallery__image ${cls} rounded-5 pointer" data-position="${i}" style="${css}--aspect-ratio: ${ratio}"><img data-src="${portrait}" alt="Pants Down" width="600" height="900" loading="eager"></a>`;
      const gallery = (square, ratio) => `<div class="product-detail__media" style="width:520px"><media-gallery class="block" data-layout="thumbnail" data-mt-video="manual"${square ? ' data-square' : ''}>
        <div class="media-main-swiper"><div class="swiper-wrapper-preview"><div class="swiper-wrapper">${slide('swiper-slide media-item', 1, ratio)}
          <div class="media-gallery__local-video swiper-slide media-item rounded-5 w-full" style="--aspect-ratio: ${ratio}"><div class="mt-video-frame"><video class="rounded-5 block w-full h-full absolute inset-0 media-video" playsinline controls></video></div></div>
        </div></div></div>
        <div class="media-thumb-swiper"><div class="thumbnail-slide thumb-bottom" style="--gap: 15px;"><div class="swiper-wrapper" style="display:flex;gap:10px">
          ${[1, 2, 3].map(i => slide('swiper-slide', i, ratio, 'width:90px;flex:none;')).join('')}</div></div></div>
      </media-gallery></div>`;
      const tab = await open('square', `${head}<body>${gallery(true, '1/1')}<div id="adapt">${gallery(false, '0.6667')}</div></body></html>`);
      const boxes = () => tab.$$eval('media-gallery[data-square] :is(.media-gallery__image, .media-gallery__local-video)', n => n.map(el => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      const before = await boxes();
      for (const [w, h] of before) assert.equal(w, h, 'every slide and thumbnail is square before its picture arrives');
      await tab.$$eval('img[data-src]', n => n.forEach(img => { img.src = img.dataset.src; }));
      await tab.waitForTimeout(100);
      assert.deepEqual(await boxes(), before, 'nothing moves when the pictures arrive');
      const fill = await tab.$$eval('media-gallery[data-square] :is(.media-gallery__image img, video)', n => n.map(el => { const r = el.getBoundingClientRect(), p = el.closest('[style*="--aspect-ratio"]').getBoundingClientRect(); return {fit: getComputedStyle(el).objectFit, w: Math.round(r.width) - Math.round(p.width), h: Math.round(r.height) - Math.round(p.height)}; }));
      for (const f of fill) assert.deepEqual(f, {fit: 'cover', w: 0, h: 0}, 'the picture or video covers the square');
      const adapt = await tab.$eval('#adapt .media-gallery__image', el => { const r = el.getBoundingClientRect(); return r.height / r.width; });
      assert(Math.abs(adapt - 1.5) < 0.02, 'off: the picture keeps its own shape');
      assert.deepEqual(tab.errors, []);
      await tab.close();
      checks++;
    }

    /* Gallery: the main slider first, thumbnails in a later task, still linked */
    {
      const gallery = slice(themeJs, 'class SlideWithThumbs', 'customElements.define("slide-with-thumbs", SlideWithThumbs);');
      assert(gallery, 'theme.js has the gallery element');
      const pic = c => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${c}"/></svg>`);
      const slides = cls => ['#c33', '#3c3', '#33c'].map((c, i) => `<div class="media-gallery__image swiper-slide ${cls}" style="--aspect-ratio: 1/1"><img src="${pic(c)}" alt="Slide ${i + 1}" width="400" height="400"></div>`).join('');
      const tab = await open('gallery', `${head}<body><div style="width:500px"><media-gallery class="block" data-mt-video="manual"><slide-with-thumbs class="block relative" data-speed="0" data-mobile="1" data-tablet="1" data-desktop="1" data-thumb-direction="horizontal">
        <div class="media-main-swiper"><div class="swiper-wrapper-preview swiper"><div class="swiper-wrapper">${slides('media-item')}</div></div></div>
        <div class="media-thumb-swiper"><div class="thumbnail-slide swiper mt-10 thumb-bottom"><div class="swiper-wrapper">${slides('')}</div></div></div>
      </slide-with-thumbs></media-gallery></div>
      <script src="/assets/swiper-bundle.min.js"></script><script>window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>__lt.push(e.duration))).observe({type:'longtask'});</script>
      <script>${gallery}</script></body></html>`);
      await tab.waitForFunction(() => { const g = document.querySelector('slide-with-thumbs'); return g.globalSlide && g.thumbnailSlide && g.globalSlide.thumbs.swiper === g.thumbnailSlide; }, null, {timeout: 3000});
      await tab.click('.thumbnail-slide .swiper-slide:nth-child(3)');
      await tab.waitForTimeout(150);
      assert.equal(await tab.evaluate(() => document.querySelector('slide-with-thumbs').globalSlide.activeIndex), 2, 'a thumbnail still opens its slide');
      assert(await tab.$eval('.thumbnail-slide .swiper-slide:nth-child(3)', el => el.classList.contains('swiper-slide-thumb-active')), 'and is marked active');
      assert.deepEqual(tab.errors, []);
      await tab.close();
      checks++;
    }

    /* Video in the builder canvas */
    {
      const frameOf = async (name, opts) => {
        pages.set('/' + name, canvasPage(opts));
        pages.set('/builder-' + name, `<!doctype html><body style="margin:0"><iframe id="canvas" sandbox="allow-scripts" allow="autoplay; fullscreen" src="/${name}" style="width:700px;height:900px;border:0"></iframe></body>`);
        const tab = await ctx.newPage();
        tab.errors = [];
        tab.on('pageerror', e => tab.errors.push(e.message));
        await tab.goto('http://shop.test/builder-' + name);
        const frame = tab.frames().find(f => f.url().endsWith('/' + name));
        await frame.waitForFunction(() => document.querySelector('video').readyState >= 1);
        return {tab, frame};
      };
      const clickVideo = async (tab, frame) => {
        const r = await frame.$eval('video', v => { const b = v.getBoundingClientRect(); return {x: b.x + b.width / 2, y: b.y + b.height / 3}; });
        await tab.mouse.click(r.x, r.y);
        await tab.waitForTimeout(500);
      };
      // The problem: the builder cancels the click, so the video's own controls do nothing.
      let {tab, frame} = await frameOf('canvas-bare', {ui: false});
      await clickVideo(tab, frame);
      assert.equal(await frame.$eval('video', v => v.paused), true, 'without the fix a cancelled click leaves the video paused');
      assert(await frame.evaluate(() => window.selected >= 1));
      await tab.close();
      for (const builder of ['cancel', 'stop']) {
        ({tab, frame} = await frameOf('canvas-' + builder, {builder}));
        assert.equal(await frame.evaluate(() => window.Shopify.designMode && window.self !== window.top), true, 'design mode, in a sandboxed canvas');
        await clickVideo(tab, frame);
        assert.equal(await frame.$eval('video', v => v.paused), false, `the video plays in the builder (${builder})`);
        await frame.waitForFunction(() => document.querySelector('video').currentTime > 0.2);
        await clickVideo(tab, frame);
        assert.equal(await frame.$eval('video', v => v.paused), true, 'and pauses');
        // the control bar is left to the browser, except its play button
        const bar = await frame.$eval('video', v => { const b = v.getBoundingClientRect(); return {x: b.x + b.width - 30, y: b.y + b.height - 15}; });
        await tab.mouse.click(bar.x, bar.y);
        await tab.waitForTimeout(500);
        assert.equal(await frame.$eval('video', v => v.paused), true, 'a press on the control bar is not taken as play');
        // Product videos card
        const card = await frame.$eval('.pv-hit', el => { const b = el.getBoundingClientRect(); return {x: b.x + 20, y: b.y + 20}; });
        await tab.mouse.click(card.x, card.y);
        await tab.waitForTimeout(500);
        assert.equal(await frame.evaluate(() => window.cardOpened), 1, `a Product videos card opens once (${builder})`);
        assert.deepEqual(tab.errors, []);
        await tab.close();
      }
      ({tab, frame} = await frameOf('canvas-autoplay', {autoplay: true}));
      await frame.waitForFunction(() => !document.querySelector('video').paused, null, {timeout: 4000});
      assert.equal(await frame.$eval('video', v => v.muted), true, 'autoplay plays muted in the builder');
      await tab.close();
      checks++;
    }
    console.log(`${checks} product information block checks passed (schema parity and groups, buy buttons, wishlist, square images, video in the builder)`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
