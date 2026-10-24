// Upsells, bundles and offers, round 4: Upsell Pro, Bundle, Quantity offer
// (with Buy X get Y free tiers), Pair with and the product add-on, on the
// product information and featured product sections.
//
// Static: each block's schema is grouped under headers, has a Style select
// and a Custom style toggle (off) that every custom colour hangs on, keeps
// every setting id it had, and declares every name its snippet reads; the
// scripts keep variant ids as strings and send the offer properties the
// Storelib contract names (docs/upsells-storelib.md); Pair with no longer
// converts prices with a typed rate or asks /variants/<id>.js.
//
// Browser (when liquidjs loads: LIQUIDJS=<path>): the real snippets drawn
// with a store's products, a mocked /cart/add.js, /cart.js, /cart/update.js
// and Storelib's /api/offers/bundles, at 375 and 1366 wide: prices and
// savings from the variants, the store's bundle saving and offer id, tier
// selection setting the quantity added and the form, Add selected adding
// every ticked card with its chosen option, the drawer redrawn and opened,
// 44px targets, no sideways scroll, contrast on the bold preset, reduced
// motion.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const schemaOf = f => JSON.parse(read(f).match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]);
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
let checks = 0;

/* ---------- static ---------- */
const SECTIONS = ['sections/main-product.storelib', 'sections/featured-product.storelib'];
const BEFORE = {
  upsell_pro: ['hide_current_product', 'hide_unavailable', 'show_image', 'show_subtitle', 'show_price', 'show_compare_at', 'show_sale_badge', 'show_variant_selector', 'heading', 'subheading', 'manual_product_1', 'manual_product_2', 'manual_product_3', 'manual_product_4', 'manual_product_5', 'manual_product_6', 'custom_subtitle', 'added_text', 'soldout_text', 'image_size_px', 'heading_gap', 'gap', 'padding_top', 'padding_bottom', 'max_products', 'heading_size', 'text_color', 'bg_color', 'card_bg', 'border_color', 'muted_color', 'show_border', 'show_shadow', 'card_radius', 'upsell_button_text', 'button_radius', 'button_bg', 'button_text_color', 'image_shape', 'subtitle_source', 'source', 'open_drawer_after_add'],
  bundle: ['heading', 'text', 'product_1', 'product_2', 'product_3', 'this_item_label', 'option_label', 'discount_percent', 'discount_code', 'total_label', 'savings_label', 'button_label', 'error_text', 'show_images', 'show_compare', 'accent_color', 'padding_top', 'padding_bottom'],
  quantity_offer: ['heading', 'default_tier', 'per_item_label', 'save_label', 'show_button', 'button_label', 'error_text', 'sync_form_quantity', 'show_compare', 'accent_color', 'padding_top', 'padding_bottom',
    ...[1, 2, 3, 4].flatMap(t => ['enable', 'quantity', 'label', 'discount', 'badge', 'code'].map(k => `tier_${t}_${k}`))],
  pair_with_upsell: ['heading', 'p1', 'p2', 'p3', 'p4', 'p5', 'currency_rate', 'btn_label', 'btn_label_added', 'price_currency'],
};
const STYLES = {upsell_pro: ['cards', 'list', 'tiles', 'bold'], bundle: ['cards', 'list', 'bold'], quantity_offer: ['cards', 'list', 'bold']};
const CUSTOM = {
  upsell_pro: ['text_color', 'bg_color', 'card_bg', 'border_color', 'muted_color', 'show_border', 'show_shadow', 'card_radius', 'button_radius', 'button_bg', 'button_text_color'],
  bundle: ['custom_bg', 'custom_text', 'custom_heading', 'custom_border', 'custom_selected', 'custom_save', 'custom_badge_bg', 'custom_badge_text', 'custom_radius', 'custom_border_width', 'custom_gap'],
};
CUSTOM.quantity_offer = CUSTOM.bundle;
const blocksOf = file => Object.fromEntries(schemaOf(file).shopify.blocks.map(b => [b.type, b]));
for (const file of SECTIONS) {
  const schema = schemaOf(file);
  const outer = Object.fromEntries(schema.blocks.map(b => [b.type, b]));
  const mine = blocksOf(file);
  for (const [type, before] of Object.entries(BEFORE)) {
    const block = mine[type];
    assert(block, `${file} declares ${type}`);
    const ids = block.settings.map(s => s.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, `${file} ${type}: ids unique`);
    for (const id of before) assert(ids.includes(id), `${file} ${type} keeps ${id}`);
    assert.deepEqual(outer[type].settings.map(s => s.id).filter(id => id && !/^(hdr|para)_\d+$/.test(id)), ids, `${file} ${type}: builder panel lists the same settings`);
    if (!STYLES[type]) continue;
    const style = block.settings.find(s => s.id === 'style');
    assert.equal(style.type, 'select');
    assert.deepEqual(style.options.map(o => o.value), STYLES[type], `${type} style presets`);
    assert.equal(style.default, 'cards');
    const custom = block.settings.find(s => s.id === 'custom_style');
    assert.equal(custom.type, 'checkbox'); assert.equal(custom.default, false, `${type} custom style starts off`);
    for (const id of CUSTOM[type]) assert.equal(block.settings.find(s => s.id === id).visible_if, '{{ block.settings.custom_style }}', `${type} ${id} shows with Custom style`);
    const headers = block.settings.filter(s => s.type === 'header').map(s => s.content);
    for (const h of ['Content', 'Style', 'Custom style']) assert(headers.includes(h), `${type} has a ${h} header`);
    // the order is: a header before any setting, custom style last
    assert.equal(block.settings.filter(s => s.type !== 'paragraph')[0].type, 'header', `${type} starts with a header`);
    assert(block.settings.findIndex(s => s.content === 'Custom style') > block.settings.findIndex(s => s.content === 'Style'));
    // select labels short enough for buttons where there are three or fewer
    for (const s of block.settings.filter(x => x.type === 'select' && x.options.length <= 3)) for (const o of s.options) assert(o.label.split(' ').length <= 3, `${type} ${s.id}: ${o.label}`);
    const words = JSON.stringify(block.settings.filter(s => !before.includes(s.id)));
    assert(!/shopify|liquid|—|unlock|seamless|elevate|effortless/i.test(words), `${type}: new settings say nothing of the old platform and no filler`);
  }
  for (let t = 1; t <= 4; t++) {
    const free = mine.quantity_offer.settings.find(s => s.id === `tier_${t}_free`);
    assert.equal(free.type, 'range'); assert.equal(free.default, 0, 'no free items unless the creator sets them');
  }
  for (const id of ['add_mode', 'preselect', 'add_selected_label', 'total_label', 'sale_badge_text', 'error_text']) assert(mine.upsell_pro.settings.some(s => s.id === id), `upsell_pro declares ${id}`);
  for (const id of ['currency_rate', 'price_currency']) assert.equal(mine.pair_with_upsell.settings.find(s => s.id === id).visible_if, '{{ false }}', `pair with ${id} is retired`);
  checks++;
}
{
  // every block.settings name each snippet reads is declared on its block
  const mine = blocksOf(SECTIONS[0]);
  const has = type => new Set(mine[type].settings.map(s => s.id).filter(Boolean));
  const offers = body(read('snippets/product-offers.storelib'));
  const split = offers.indexOf("{%- else -%}\n  {%- liquid\n    assign v0 = product.selected_or_first_available_variant");
  assert(split > 0);
  const head = offers.slice(0, offers.indexOf("{%- if kind == 'bundle' -%}"));
  const parts = {bundle: head + offers.slice(0, split), quantity_offer: head + offers.slice(split)};
  for (const [type, part] of Object.entries(parts)) for (const [, id] of part.matchAll(/\bbs\.([a-z_0-9]+)/g)) assert(has(type).has(id), `${type} reads undeclared ${id}`);
  for (const t of [1, 2, 3, 4]) assert(has('quantity_offer').has(`tier_${t}_free`));
  const up = body(read('snippets/upsell-pro.storelib')) + body(read('snippets/upsell-pro-card.storelib'));
  for (const [, id] of up.matchAll(/\bs\.([a-z_0-9]+)/g)) assert(has('upsell_pro').has(id), `upsell_pro reads undeclared ${id}`);
  const blocks = read('snippets/product-info-blocks.storelib');
  const pair = blocks.slice(blocks.indexOf("{%- when 'pair_with_upsell' -%}"), blocks.indexOf("{%- when 'lod_testimonials_block' -%}"));
  for (const [, id] of pair.matchAll(/\bs\.([a-z_0-9]+)/g)) assert(has('pair_with_upsell').has(id), `pair with reads undeclared ${id}`);
  assert(!/\/variants\/|currency_rate|price_currency|parseInt\((sel|v|variant)/.test(pair), 'pair with prices come from the options, in the store currency');
  assert(pair.includes('<pair-with') && pair.includes('data-price="{{ v.price }}"'), 'pair with options carry their prices');
  const addon = blocks.slice(blocks.indexOf("{%- when 'product_addon' -%}"), blocks.indexOf("{%- when 'size_chart_popup' -%}"));
  assert(!/parseInt/.test(addon) && /display_variant\.id \| json/.test(addon), 'add-on keeps its variant id a string');
  assert(!/productForm\.addEventListener\('submit'/.test(addon), 'add-on is not added a second time with the product');
  assert(!/<script>/.test(read('snippets/upsell-pro.storelib')), 'Upsell Pro has no inline script');
  checks++;
}
{
  const js = read('shopify/assets/product-offers.js');
  for (const name of ['_sl_offer', '_sl_offer_id', '_sl_group', '_sl_block', '_sl_source', '_sl_tier', '_sl_paid_qty', '_sl_free_qty', '_sl_discount']) assert(js.includes(name), `script sends ${name}`);
  for (const el of ['product-bundle', 'quantity-offer', 'upsell-pro', 'pair-with']) assert(js.includes(`customElements.define('${el}'`), `${el} defined`);
  assert(js.includes('/api/offers/bundles?product='), 'reads the store\'s own bundles');
  assert(!/parseInt\([^)]*(variant|\.id)/i.test(js), 'variant ids never parsed as numbers');
  const doc = read('docs/upsells-storelib.md');
  for (const name of ['_sl_offer', '_sl_group', '_sl_paid_qty', '_sl_free_qty', '/api/offers/bundles', '/api/offers/quantity-breaks', 'Prompt for the Storelib platform']) assert(doc.includes(name), `docs name ${name}`);
  checks++;
}

/* ---------- browser ---------- */
let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({Liquid} = require(p)); break; } catch { /* try the next */ }
}

(async () => {
  if (!Liquid) {
    console.log(`${checks} upsell and offer checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
    return;
  }
  const {chromium} = require('playwright');
  const engine = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, jsTruthy: false,
    fs: {
      readFileSync: f => body(fs.readFileSync(f, 'utf8')), readFile: async f => body(fs.readFileSync(f, 'utf8')),
      existsSync: f => fs.existsSync(f), exists: async f => fs.existsSync(f),
      resolve: (dir, file, ext) => path.join(dir, file + ext), contains: () => true, dirname: path.dirname, sep: '/',
    },
  });
  const money = c => '$' + (Number(c || 0) / 100).toFixed(2);
  engine.registerFilter('t', k => ({'products.product.sold_out': 'Sold out', 'accessibility.add': 'Add', 'accessibility.added': 'Added', 'accessibility.sold_out': 'Sold out', 'accessibility.try_again': 'Try again', 'accessibility.select_variant': 'Option'})[k] || String(k).split('.').pop());
  engine.registerFilter('money', money);
  engine.registerFilter('asset_url', k => '/assets/' + k);
  engine.registerFilter('stylesheet_tag', () => '');
  engine.registerFilter('image_url', v => String(v || ''));
  engine.registerFilter('placeholder_svg_tag', (_, cls) => `<svg class="${cls}" viewBox="0 0 10 10"></svg>`);
  const clean = s => s.replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '');
  const pic = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#c9bfae"/></svg>');
  const P = (id, title, variants, extra = {}) => {
    const vs = variants.map(([vid, vt, price, compare, available = true]) => ({id: vid, title: vt, price, compare_at_price: compare || 0, available}));
    return {id, title, handle: id, url: '/products/' + id, available: vs.some(v => v.available), variants: vs, has_only_default_variant: vs.length === 1,
      selected_or_first_available_variant: vs.find(v => v.available) || vs[0], featured_image: pic, type: 'Accessories', collections: [], ...extra};
  };
  const shirt = P('p-shirt', 'Linen shirt', [['v-s1', 'S', 3600, 4800], ['v-s2', 'M', 3600, 0], ['v-s3', 'L', 3800, 0, false]]);
  const belt = P('p-belt', 'Leather belt', [['v-b1', 'Default Title', 2000, 0]]);
  const cap = P('p-cap', 'Canvas cap with a longer name that wraps', [['v-c1', 'Sand', 1500, 0], ['v-c2', 'Olive', 1800, 2400], ['v-c3', 'Red', 1800, 0, false]]);
  const defaults = type => Object.fromEntries(blocksOf(SECTIONS[0])[type].settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));
  const shop = {money_format: '${{amount}}', currency: 'USD'};
  const ctx = (type, id, settings) => ({block: {id, type, settings: {...defaults(type), ...settings}, shopify_attributes: ''}, product: shirt, current_product: shirt, shop, request: {design_mode: false}, all_products: {}, product_form_id: 'product-form-main', section: {id: 'main'}, collections: {all: {products: []}}, recommendations: {performed: false}});
  const offers = clean(body(read('snippets/product-offers.storelib')));
  const upsell = clean(body(read('snippets/upsell-pro.storelib')));
  const blocks = [
    ['bundle', await engine.parseAndRender(offers, {...ctx('bundle', 'b1', {product_1: belt, product_2: cap, style: 'bold', caption: 'Bundle & save', badge: 'Best value', heading: 'Buy it together', discount_percent: 10, show_compare: true}), kind: 'bundle'})],
    ['qty', await engine.parseAndRender(offers, {...ctx('quantity_offer', 'q1', {
      style: 'bold', caption: 'Bundle & save', heading: '', default_tier: '1', you_save_label: 'You save',
      tier_1_label: 'Buy 1', tier_2_label: 'Buy 2 get 1 free', tier_2_free: 1, tier_2_badge: 'Most popular', tier_2_code: 'B2G1',
      tier_3_label: 'Buy 3 get 2 free', tier_3_free: 2, tier_3_badge: 'Best value'}), kind: 'quantity_offer'})],
    ['qty-list', await engine.parseAndRender(offers, {...ctx('quantity_offer', 'q2', {style: 'list', sync_form_quantity: false, show_button: false, tier_2_discount: 10, tier_2_badge: 'Most popular'}), kind: 'quantity_offer', product_form_id: 'product-form-other'})],
    ['up-selected', await engine.parseAndRender(upsell, ctx('upsell_pro', 'u1', {source: 'manual', manual_product_1: belt, manual_product_2: cap, add_mode: 'selected', style: 'tiles', show_variant_selector: true, heading: 'Goes well with'}))],
    ['up-each', await engine.parseAndRender(upsell, ctx('upsell_pro', 'u2', {source: 'manual', manual_product_1: cap, style: 'bold', show_variant_selector: true, heading: 'Add a cap'}))],
    ['up-custom', await engine.parseAndRender(upsell, ctx('upsell_pro', 'u3', {source: 'manual', manual_product_1: belt, style: 'list', custom_style: true, button_bg: '#123456', button_text_color: '#ffffff', card_radius: 3}))],
  ];
  {
    const src = read('snippets/product-info-blocks.storelib');
    const pairSrc = src.slice(src.indexOf("{%- when 'pair_with_upsell' -%}") + "{%- when 'pair_with_upsell' -%}".length, src.indexOf("{%- when 'lod_testimonials_block' -%}"));
    blocks.push(['pair', await engine.parseAndRender(clean(pairSrc), {...ctx('pair_with_upsell', 'pw1', {p1: 'p-belt', p2: 'p-cap', layout: 'grid', per_row_d: 2, per_row_m: 1}), all_products: {'p-belt': belt, 'p-cap': cap}})]);
  }
  for (const [name, html] of blocks) assert(/<(product-bundle|quantity-offer|upsell-pro|pair-with)\b/.test(html), `${name} drew`);
  if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, blocks.map(([n, h]) => `<!-- ${n} -->\n${h}`).join('\n'));
  checks++;

  const page = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--color-text:#3a3a3a;--color-heading:#141414;--color-background:#fbf8f3;--color-border:#e2dccf;--btn-primary-bg-color:#141414;--btn-primary-color:#fff;--btn-radius:8px}
body{margin:0;background:#fbf8f3;color:#3a3a3a;font:15px/1.5 system-ui,sans-serif}.wrap{max-width:520px;margin:0 auto;padding:0 16px}
.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}</style>
<link rel="stylesheet" href="/assets/theme-button-contract.css"><link rel="stylesheet" href="/assets/product-offers.css"></head><body>
<cart-notification id="drawer"><div id="minicart-form"><p>Empty</p></div></cart-notification><span class="cart-count">0</span>
<div class="wrap">
<form id="product-form-main" action="/cart/add"><input type="hidden" name="id" value="v-s1"><input name="quantity" type="number" value="1"><button type="submit">Add</button></form>
<form id="product-form-other" action="/cart/add"><input type="hidden" name="id" value="v-s1"></form>
${blocks.map(([name, html]) => `<section data-case="${name}">${html}</section>`).join('\n')}
</div>
<script>
  window.routes = {cart_add_url: '/cart/add', cart_update_url: '/cart/update', cart_change_url: '/cart/change', cart_url: '/cart'};
  window.Shopify = {formatMoney: c => '$' + (c / 100).toFixed(2)};
  customElements.define('cart-notification', class extends HTMLElement {
    getSectionsToRender() { return [{id: 'minicart-form'}]; }
    cartAction() { this.dataset.actions = String(Number(this.dataset.actions || 0) + 1); }
    open() { this.dataset.opened = String(Number(this.dataset.opened || 0) + 1); }
  });
</script></body></html>`;

  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    for (const width of [375, 1366]) {
      const tab = await (await browser.newContext({viewport: {width, height: 1000}})).newPage();
      const errors = [];
      tab.on('pageerror', e => errors.push(e.message));
      if (process.env.DUMP) tab.on('console', m => console.log('console:', m.text()));
      const requests = [];
      await tab.route('http://shop.test/**', async route => {
        const req = route.request();
        const url = new URL(req.url());
        const json = (b, status = 200) => route.fulfill({status, contentType: 'application/json', body: JSON.stringify(b)});
        if (url.pathname === '/products/linen-shirt') return route.fulfill({contentType: 'text/html', body: page});
        if (url.pathname.startsWith('/assets/')) return route.fulfill({contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', body: read('shopify/assets/' + url.pathname.slice(8))});
        const b = req.postData() ? JSON.parse(req.postData()) : null;
        requests.push({path: url.pathname + url.search, body: b});
        if (process.env.DUMP) console.log('request:', url.pathname + url.search);
        if (url.pathname === '/api/offers/bundles') return json({bundles: [
          {offerId: 'offer-other', discountType: 'percent', discountValue: 30, items: [{id: 'p-shirt'}, {id: 'p-belt'}]},
          {offerId: 'offer-set', title: 'Shirt, belt and cap', discountType: 'percent', discountValue: 15, fullCents: 7100, priceCents: 6035, items: [{id: 'p-cap'}, {id: 'p-shirt'}, {id: 'p-belt'}]},
        ]});
        if (url.pathname === '/api/offers/quantity-breaks') return route.fulfill({status: 404, body: ''});
        if (url.pathname === '/cart/add.js') return json({items: b.items, sections: b.sections ? {'minicart-form': `<div id="minicart-form"><p class="added">${b.items.length} added</p></div>`} : undefined});
        if (url.pathname === '/cart.js') return json({discount_codes: [], items: []});
        if (url.pathname === '/cart/change.js') return json({items: [], sections: {'minicart-form': '<div id="minicart-form"><p class="added">removed</p></div>'}});
        if (url.pathname === '/cart/update.js') return json({discount_codes: [{code: b.discount}], sections: {'minicart-form': '<div id="minicart-form"><p class="added">with code</p></div>'}});
        if (url.pathname === '/cart.json') return json({item_count: 4, items_subtotal_price: 100});
        return route.fulfill({status: 404, body: ''});
      });
      await tab.goto('http://shop.test/products/linen-shirt');
      await tab.waitForFunction(() => ['product-bundle', 'quantity-offer', 'upsell-pro'].every(n => customElements.get(n)));
      const text = sel => tab.$eval(sel, el => (el.hidden ? '' : el.textContent.replace(/\s+/g, ' ').trim()));
      const opened = () => tab.$eval('#drawer', d => Number(d.dataset.opened || 0));
      const adds = () => requests.filter(r => r.path === '/cart/add.js');

      // Bundle: the store's own bundle with exactly these products sets the saving and the offer id
      await tab.waitForFunction(() => document.getElementById('ProductBundle-b1').hasAttribute('data-storelib-offer'));
      const full = 3600 + 2000 + 1500;
      assert.equal(await text('#ProductBundle-b1 [data-total]'), money(full - Math.round(full * .15)), 'Storelib bundle saving, not the typed 10%');
      assert.equal(await text('#ProductBundle-b1 [data-saving-amount]'), money(Math.round(full * .15)));
      assert.equal(await text('#ProductBundle-b1 [data-total-compare]'), money(full));
      assert.equal(await text('#ProductBundle-b1 .po-caption'), 'Bundle & save');
      assert.equal(await text('#ProductBundle-b1 .po-box__badge'), 'Best value');
      assert.notEqual(await text('#ProductBundle-b1 [data-offer-note]'), '', 'says checkout takes it off');
      await tab.selectOption('#ProductBundle-b1 [data-line]:nth-child(3) select', 'v-c2');
      assert.equal(await text('#ProductBundle-b1 [data-line]:nth-child(3) [data-line-price]'), money(1800));
      assert.equal(await text('#ProductBundle-b1 [data-line]:nth-child(3) [data-line-compare]'), money(2400), 'option compare at price');
      const shut0 = await opened();
      await tab.click('#ProductBundle-b1 [data-offer-add]');
      await tab.waitForFunction(n => Number(document.getElementById('drawer').dataset.opened || 0) === n, shut0 + 1);
      let add = adds().at(-1).body;
      assert.deepEqual(add.items.map(i => [i.id, i.quantity]), [['v-s1', 1], ['v-b1', 1], ['v-c2', 1]]);
      const groups = new Set(add.items.map(i => i.properties._sl_group));
      assert.equal(groups.size, 1, 'one group for the set');
      for (const i of add.items) assert.deepEqual({o: i.properties._sl_offer, id: i.properties._sl_offer_id, b: i.properties._sl_block, s: i.properties._sl_source, d: i.properties._sl_discount}, {o: 'bundle', id: 'offer-set', b: 'b1', s: 'p-shirt', d: 'percent:15'});
      assert.deepEqual(add.sections, ['minicart-form']);
      assert.equal(await text('#minicart-form .added'), '3 added', 'drawer redrawn');
      checks++;

      // Quantity offer, bold tiers: Buy 1 / Buy 2 get 1 free / Buy 3 get 2 free
      const tier = (n, sel) => text(`#QuantityOffer-q1 .po-tier:nth-child(${n}) ${sel}`);
      assert.equal(await tier(1, '[data-tier-total]'), money(3600));
      assert.equal(await tier(1, '[data-tier-compare]'), money(4800), 'single item shows its compare at price');
      assert.equal(await tier(2, '[data-tier-total]'), money(7200));
      assert.equal(await tier(2, '[data-tier-compare]'), money(10800));
      assert.equal(await tier(2, '[data-tier-saving]'), 'You save ' + money(3600));
      assert.equal(await tier(3, '[data-tier-saving]'), 'You save ' + money(7200));
      assert.equal(await tier(2, '.po-tier__badge'), 'Most popular');
      assert.equal(await text('#QuantityOffer-q1 .po-caption'), 'Bundle & save');
      await tab.click('#QuantityOffer-q1 .po-tier:nth-child(2)');
      assert.equal(await tab.$eval('#product-form-main [name=quantity]', i => i.value), '3', 'form quantity is paid plus free');
      const formProps = await tab.$$eval('#product-form-main input[data-quantity-offer-property]', els => Object.fromEntries(els.map(e => [e.name, e.value])));
      assert.equal(formProps['properties[_sl_offer]'], 'quantity_break');
      assert.equal(formProps['properties[_sl_paid_qty]'], '2'); assert.equal(formProps['properties[_sl_free_qty]'], '1'); assert.equal(formProps['properties[_sl_tier]'], '2');
      await tab.evaluate(() => { const i = document.querySelector('#product-form-main [name=id]'); i.value = 'v-s2'; i.dispatchEvent(new Event('change', {bubbles: true})); });
      assert.equal(await tier(1, '[data-tier-compare]'), '', 'M has no compare at price');
      await tab.click('#QuantityOffer-q1 [data-offer-add]');
      await tab.waitForFunction(() => document.querySelector('#minicart-form .added')?.textContent === 'with code');
      add = adds().at(-1).body;
      assert.equal(add.items.length, 1);
      assert.equal(add.items[0].id, 'v-s2'); assert.equal(add.items[0].quantity, 3);
      assert.deepEqual([add.items[0].properties._sl_offer, add.items[0].properties._sl_paid_qty, add.items[0].properties._sl_free_qty, add.items[0].properties._sl_discount], ['quantity_break', '2', '1', 'free']);
      assert.equal(requests.filter(r => r.path === '/cart/update.js').at(-1).body.discount, 'B2G1', "the tier's code");
      await tab.click('#QuantityOffer-q1 .po-tier:nth-child(1)');
      assert.equal(await tab.$$eval('#product-form-main input[data-quantity-offer-property]', els => els.length), 0, 'a plain tier carries no offer');
      // bold contrast: tier title on its card
      const contrast = await tab.$eval('#QuantityOffer-q1 .po-tier:nth-child(2) .po-tier__label', el => {
        const rgb = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
        const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
        const a = lum(rgb(getComputedStyle(el).color)), b = lum(rgb(getComputedStyle(el.closest('.po-tier__card')).backgroundColor));
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
      assert(contrast >= 4.5, 'bold tier text contrast ' + contrast.toFixed(2));
      const panel = await tab.$eval('#ProductBundle-b1 .po-button', el => {
        const rgb = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
        const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
        const ratio = (x, y) => { const a = lum(rgb(x)), b = lum(rgb(y)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
        const s = getComputedStyle(el), box = getComputedStyle(el.closest('.po-box')).backgroundColor;
        return [ratio(s.backgroundColor, box), ratio(s.color, s.backgroundColor)];
      });
      assert(panel[0] >= 3 && panel[1] >= 4.5, 'bold bundle button stands out from its panel and reads: ' + panel.map(n => n.toFixed(2)));
      // list preset, a percent tier, and no form sync
      assert.equal(await text('#QuantityOffer-q2 .po-tier:nth-child(2) [data-tier-total]'), money(Math.round(3600 * .9) * 2));
      assert.equal(await text('#QuantityOffer-q2 .po-tier:nth-child(2) [data-tier-saving]'), 'You save ' + money(7200 - 6480));
      checks++;

      // Upsell Pro, tick and add: both start ticked, the cap's option changes its price, untick, add together
      assert.equal(await text('#upsell-pro-u1 [data-upsell-total]'), money(3500));
      await tab.selectOption('#upsell-pro-u1 [data-product-id="p-cap"] select', 'v-c2');
      assert.equal(await text('#upsell-pro-u1 [data-product-id="p-cap"] [data-upsell-price]'), money(1800));
      assert.equal(await text('#upsell-pro-u1 [data-product-id="p-cap"] [data-upsell-compare]'), money(2400));
      assert.equal(await text('#upsell-pro-u1 [data-upsell-total]'), money(3800));
      assert.equal(await tab.$eval('#upsell-pro-u1 [data-product-id="p-cap"] option[value="v-c3"]', o => o.disabled), true);
      await tab.click('#upsell-pro-u1 [data-product-id="p-belt"] .upsell-card__pick');
      assert.equal(await text('#upsell-pro-u1 [data-upsell-total]'), money(1800));
      await tab.click('#upsell-pro-u1 [data-product-id="p-belt"] .upsell-card__pick');
      const before = await opened();
      await tab.click('#upsell-pro-u1 [data-upsell-add-selected]');
      await tab.waitForFunction(n => Number(document.getElementById('drawer').dataset.opened || 0) === n, before + 1);
      add = adds().at(-1).body;
      assert.deepEqual(add.items.map(i => [i.id, i.quantity, i.properties._sl_offer, i.properties._sl_source]), [['v-b1', 1, 'upsell', 'p-shirt'], ['v-c2', 1, 'upsell', 'p-shirt']]);
      assert.equal(new Set(add.items.map(i => i.properties._sl_group)).size, 1);
      // none ticked: the button waits
      await tab.click('#upsell-pro-u1 [data-product-id="p-belt"] .upsell-card__pick');
      await tab.click('#upsell-pro-u1 [data-product-id="p-cap"] .upsell-card__pick');
      assert.equal(await tab.$eval('#upsell-pro-u1 [data-upsell-add-selected]', b => b.disabled), true);
      checks++;

      // Upsell Pro, an Add on each card: adds the chosen option, redraws the drawer, leaves it shut
      await tab.selectOption('#upsell-pro-u2 select', 'v-c2');
      const shut = await opened();
      await tab.click('#upsell-pro-u2 [data-upsell-add]');
      await tab.waitForFunction(() => document.querySelector('#upsell-pro-u2 .upsell-card').classList.contains('is-added'));
      add = adds().at(-1).body;
      assert.deepEqual(add.items.map(i => [i.id, i.quantity]), [['v-c2', 1]]);
      assert.equal(typeof add.items[0].id, 'string');
      assert.equal(await opened(), shut, 'Open cart drawer after add is off');
      assert.equal(await text('#minicart-form .added'), '1 added');
      assert.equal(await text('#upsell-pro-u2 [data-upsell-add]'), 'Added');
      // custom style reaches the button through the button contract
      const btn = await tab.$eval('#upsell-pro-u3 [data-upsell-add]', b => [getComputedStyle(b).backgroundColor, getComputedStyle(b).color]);
      assert.deepEqual(btn, ['rgb(18, 52, 86)', 'rgb(255, 255, 255)'], 'custom button colours');
      const themed = await tab.$eval('#upsell-pro-u2 [data-upsell-add]', b => getComputedStyle(b).backgroundColor);
      assert.notEqual(themed, 'rgb(18, 52, 86)');
      checks++;

      // Pair with: prices from the options, add then take out again
      assert.equal(await text('#PairWith-pw1 [data-product-id="p-cap"] .pw-price [data-price]'), money(1500));
      await tab.selectOption('#PairWith-pw1 [data-product-id="p-cap"] select', 'v-c2');
      assert.equal(await text('#PairWith-pw1 [data-product-id="p-cap"] .pw-price [data-price]'), money(1800));
      assert.equal(await text('#PairWith-pw1 [data-product-id="p-cap"] .pw-price [data-compare]'), money(2400));
      await tab.click('#PairWith-pw1 [data-product-id="p-cap"] [data-add-btn]');
      await tab.waitForFunction(() => document.querySelector('#PairWith-pw1 [data-product-id="p-cap"] [data-add-btn]').getAttribute('aria-pressed') === 'true');
      add = adds().at(-1).body;
      assert.deepEqual(add.items.map(i => [i.id, i.quantity, i.properties._sl_offer]), [['v-c2', 1, 'pair']]);
      await tab.click('#PairWith-pw1 [data-product-id="p-cap"] [data-add-btn]');
      await tab.waitForFunction(() => document.querySelector('#PairWith-pw1 [data-product-id="p-cap"] [data-add-btn]').getAttribute('aria-pressed') === 'false');
      assert.deepEqual(requests.filter(r => r.path === '/cart/change.js').at(-1).body.id, 'v-c2');
      assert.equal(await text('#minicart-form .added'), 'removed');
      checks++;

      // layout: no sideways scroll, 44px targets, gutter
      const layout = await tab.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        small: [...document.querySelectorAll('section [data-offer-add], section [data-upsell-add], section [data-upsell-add-selected], pair-with .pw-btn, pair-with .pw-variant, .po-line__label, .po-tier__card, .po-select select, .upsell-card__variant select, .upsell-card__pick')]
          .map(el => [el.className || el.tagName, Math.round(el.getBoundingClientRect().height), Math.round(el.getBoundingClientRect().width)]).filter(([, h, w]) => h < 44 || w < 44),
        overflow: [...document.querySelectorAll('section *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.right > innerWidth - 15 || r.left < 15); }).filter(el => !el.closest('.visually-hidden, .po-line__check, .po-tier__radio, .upsell-card__check')).map(el => el.className),
      }));
      assert(layout.scroll <= width, `no sideways scroll at ${width}: ${layout.scroll}`);
      assert.deepEqual(layout.small, [], `44px targets at ${width}`);
      assert.deepEqual(layout.overflow, [], `inside the gutter at ${width}`);
      checks++;

      await tab.screenshot({path: path.join(process.env.SHOTS || require('node:os').tmpdir(), `upsells-${width}.png`), fullPage: true});
      await tab.emulateMedia({reducedMotion: 'reduce'});
      assert.equal(await tab.$eval('.po-tier__card', el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await tab.$eval('.upsell-card', el => getComputedStyle(el).transitionDuration), '0s');
      assert.deepEqual(errors, []);
      checks++;
    }
  } finally { await browser.close(); }
  console.log(`${checks} upsell and offer checks passed`);
})().catch(error => { console.error(error); process.exit(1); });
