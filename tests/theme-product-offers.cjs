// Bundle and Quantity offer blocks (snippets/product-offers.storelib,
// shopify/assets/product-offers.js/.css) on the product information and
// featured product sections.
//
// Static: the Shopify-era bundle blocks are gone from both schemas, every
// page and the render code; the two new blocks are declared in both sections,
// every block.settings name the snippet reads is declared, and its Liquid tags
// balance. Browser: a page drawn the way the snippet draws it, with a fake
// /cart/add.js, /cart.js and /cart/update.js, checks prices, variant follow,
// include/exclude, one items[] request, the discount code, the drawer
// redraw and open, keyboard use, 375px and reduced motion.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const schemaOf = f => JSON.parse(read(f).match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]);
const OLD = ['bundle_save', 'quantity_selector', 'bundle_deal'];
let checks = 0;

/* ---------- static ---------- */
const snippet = read('snippets/product-offers.storelib');
for (const file of ['sections/main-product.storelib', 'sections/featured-product.storelib']) {
  const schema = schemaOf(file);
  for (const model of [schema.shopify, schema]) {
    const types = model.blocks.map(b => b.type);
    for (const t of OLD) assert(!types.includes(t), `${file} still declares ${t}`);
    for (const t of ['bundle', 'quantity_offer']) assert.equal(types.filter(x => x === t).length, 1, `${file} declares ${t} once`);
  }
  for (const block of schema.shopify.blocks.filter(b => ['bundle', 'quantity_offer'].includes(b.type))) {
    const ids = block.settings.map(s => s.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, `${file} ${block.type} duplicate ids`);
    assert(!/shopify|liquid/i.test(JSON.stringify(block)), `${file} ${block.type} names the old platform`);
    assert(block.settings.some(s => s.type === 'paragraph' && /discount code/i.test(s.content)), `${file} ${block.type} explains how the saving is applied`);
  }
}
checks++;
{
  // every bs.<name> and bs[k_*] key the snippet reads is declared on the block it belongs to
  const blocks = Object.fromEntries(schemaOf('sections/main-product.storelib').shopify.blocks.filter(b => ['bundle', 'quantity_offer'].includes(b.type)).map(b => [b.type, new Set(b.settings.map(s => s.id).filter(Boolean))]));
  const markup = snippet.split('</template>')[0];
  const split = markup.indexOf("{%- else -%}\n  {%- liquid\n    assign v0 = product.selected_or_first_available_variant");
  assert(split > 0, 'snippet has the bundle and quantity offer branches');
  const parts = {bundle: markup.slice(0, split), quantity_offer: markup.slice(split)};
  const shared = ['accent_color'];
  for (const [type, part] of Object.entries(parts)) {
    for (const [, id] of part.matchAll(/\bbs\.([a-z_0-9]+)/g)) assert(blocks[type].has(id) || shared.includes(id) && blocks[type].has(id), `${type} reads undeclared ${id}`);
  }
  for (const id of shared) for (const t of Object.keys(blocks)) assert(blocks[t].has(id), `${t} declares ${id}`);
  for (const t of [1, 2, 3, 4]) for (const k of ['enable', 'quantity', 'label', 'discount', 'badge', 'code']) assert(blocks.quantity_offer.has(`tier_${t}_${k}`), `tier_${t}_${k}`);
  for (const k of ['product_1', 'product_2', 'product_3']) assert(blocks.bundle.has(k));
  // Liquid tags balance
  const text = markup.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
  const stack = [];
  const tags = [];
  for (const m of text.matchAll(/\{%-?\s*(\w+)[\s\S]*?-?%\}/g)) {
    if (m[1] === 'liquid') { for (const line of m[0].split('\n')) { const w = line.trim().split(/\s+/)[0]; if (w && w !== '{%-' && w !== 'liquid') tags.push(w.replace(/^\{%-?/, '')); } }
    else tags.push(m[1]);
  }
  for (const name of tags) {
    if (['if', 'unless', 'for', 'case', 'capture'].includes(name)) stack.push(name);
    else if (/^end(if|unless|for|case|capture)$/.test(name)) assert.equal(stack.pop(), name.slice(3), 'Liquid ' + name + ' closes its own tag');
  }
  assert.equal(stack.length, 0, 'every Liquid tag closed');
}
checks++;
{
  for (const file of ['snippets/main-product-body.storelib', 'snippets/product-single-layout.storelib']) {
    const text = read(file);
    for (const t of OLD) assert(!text.includes(`when '${t}'`), `${file} still renders ${t}`);
    for (const t of ['bundle', 'quantity_offer']) assert(text.includes(`{%- when '${t}' -%}`) && text.includes(`kind: '${t}'`), `${file} renders ${t}`);
  }
  for (const f of ['bundle-deal-line', 'bundle-deal-render', 'bundle-pro-render', 'bundle-save-render', 'quantity-selector-render']) {
    // Storelib keeps a deleted snippet on the site (and syncs it back here)
    // until it is deleted in the builder; what matters is that nothing draws it.
    const users = [...fs.readdirSync(path.join(root, 'sections')).map(n => 'sections/' + n), ...fs.readdirSync(path.join(root, 'snippets')).map(n => 'snippets/' + n), ...fs.readdirSync(path.join(root, 'layout')).map(n => 'layout/' + n)]
      .filter(n => n.endsWith('.storelib') && !/\/(bundle-deal-line|bundle-deal-render|bundle-pro-render|bundle-save-render|quantity-selector-render)\.storelib$/.test(n) && read(n).includes(`'${f}'`));
    assert.deepEqual(users, [], f + ' is no longer rendered');
  }
  const pages = [...fs.readdirSync(path.join(root, 'templates')).filter(f => f.endsWith('.json')).map(f => 'templates/' + f), 'sections/header-group.json', 'sections/footer-group.json'];
  for (const file of pages) {
    const page = JSON.parse(read(file));
    for (const [id, section] of Object.entries(page.sections || {})) {
      for (const block of Object.values(section.blocks || {})) assert(!OLD.includes(block.type), `${file} ${id} keeps a ${block.type} block`);
      for (const ref of section.block_order || []) assert(section.blocks && section.blocks[ref], `${file} ${id} orders a missing block ${ref}`);
    }
  }
  const js = read('shopify/assets/product-offers.js');
  assert(!/\son[a-z]+=/i.test(snippet), 'no inline handlers');
  assert(/\/cart\/add/.test(js) && /items/.test(js) && /discount/.test(js), 'adds items[] and applies a code');
}
checks++;

/* ---------- browser ---------- */
const money = c => '$' + (c / 100).toFixed(2);
const line = ({key, id, title, main, variants, sel = 0}) => {
  const v0 = variants[sel];
  const control = variants.length < 2
    ? `<input type="hidden" data-line-variant value="${v0.id}" data-price="${v0.price}" data-compare="${v0.compare || 0}" data-available="${v0.available !== false}">`
    : `<span class="po-select"><select data-line-variant aria-label="${title}: Option">${variants.map((v, i) => `<option value="${v.id}" data-price="${v.price}" data-compare="${v.compare || 0}" data-available="${v.available !== false}"${i === sel ? ' selected' : ''}${v.available === false ? ' disabled' : ''}>${v.title}</option>`).join('')}</select></span>`;
  return `<li class="po-line${main ? ' po-line--main' : ''}" data-line${main ? ' data-main-line' : ''} data-product-id="${id}" data-title="${title}">
    <input class="po-line__check" type="checkbox" id="B-${key}" data-line-check checked>
    <label class="po-line__label" for="B-${key}"><span class="po-check" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"></svg></span>
      <span class="po-line__media"><img alt="${title}" width="56" height="56" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></span>
      <span class="po-line__info">${main ? '<span class="po-line__tag">This item</span>' : ''}<span class="po-line__title">${title}</span></span></label>
    <span class="po-line__price"><span class="po-line__amount" data-line-price>${money(v0.price)}</span><s class="po-line__compare" data-line-compare hidden></s></span>
    ${control}</li>`;
};
const mainVariants = [{id: 'v-a1', title: 'S / Black', price: 13777, compare: 21193}, {id: 'v-a2', title: 'M / Black', price: 14000, compare: 21193}, {id: 'v-a3', title: 'L / Black', price: 14000, available: false}];
const page = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--color-text:#333;--color-heading:#111;--color-background:#fff;--color-border:#ddd}body{margin:0;padding:0 16px;font:15px/1.5 sans-serif}</style>
<link rel="stylesheet" href="/assets/theme-button-contract.css"><link rel="stylesheet" href="/assets/product-offers.css"></head><body>
<cart-notification id="drawer"><div class="minicart__wrapper"><div id="minicart-form"><p>Empty</p></div></div></cart-notification>
<span class="cart-count">0</span>
<form id="product-form-main" action="/cart/add"><input type="hidden" name="id" value="v-a1">
  <quantity-input><input name="quantity" type="number" value="1" form="product-form-main"></quantity-input><button name="add" type="submit">Add</button></form>
<product-bundle class="po po-bundle" id="ProductBundle-b1" data-form-id="product-form-main" data-discount="10" data-show-compare="true" data-discount-code="BUNDLE10" data-money-format="$\{\{amount\}\}" data-error="These could not be added.">
  <h2 class="po-heading h5" id="ProductBundle-b1-heading">Buy it together</h2>
  <ul class="po-bundle__lines" role="list" aria-labelledby="ProductBundle-b1-heading">
  ${line({key: 1, id: 'p-main', title: 'Pants Down', main: true, variants: mainVariants})}
  ${line({key: 2, id: 'p-belt', title: 'Leather belt', variants: [{id: 'v-b1', title: 'Default', price: 5000}]})}
  ${line({key: 3, id: 'p-cap', title: 'Canvas cap with a long name that wraps on a phone', variants: [{id: 'v-c1', title: 'Sand', price: 2500}, {id: 'v-c2', title: 'Olive', price: 3000}, {id: 'v-c3', title: 'Red', price: 3000, available: false}]})}
  </ul>
  <div class="po-summary" aria-live="polite"><span class="po-summary__label">Total</span><span class="po-summary__prices"><s class="po-summary__compare" data-total-compare></s><span class="po-summary__amount" data-total></span></span><span class="po-summary__saving" data-saving>You save <span data-saving-amount></span></span></div>
  <button type="button" class="btn btn-primary po-button" data-theme-button="primary" data-sl-button data-button-role="primary" data-offer-add><span class="po-button__text">Add selected to cart</span></button>
  <p class="po-message" role="status" data-message hidden></p>
</product-bundle>
<quantity-offer class="po po-qty" id="QuantityOffer-q1" data-form-id="product-form-main" data-sync-form="true" data-show-compare="true" data-money-format="" data-error="This could not be added." data-sold-out="Sold out">
  <h2 class="po-heading h5" id="QuantityOffer-q1-heading">Choose how many</h2>
  <div class="po-tiers" role="radiogroup" aria-labelledby="QuantityOffer-q1-heading">
  ${[[1, 0, '', ''], [2, 10, 'Most popular', 'PACK2'], [3, 15, '', '']].map(([q, d, badge, code], i) => `<label class="po-tier"><input class="po-tier__radio" type="radio" name="QuantityOffer-q1" value="${q}" data-discount="${d}"${code ? ` data-discount-code="${code}"` : ''}${i === 0 ? ' checked' : ''}>
    <span class="po-tier__card"><span class="po-tier__dot" aria-hidden="true"></span><span class="po-tier__main"><span class="po-tier__label">${q} item${q > 1 ? 's' : ''}</span>${d ? `<span class="po-tier__save">Save ${d}%</span>` : ''}</span>
    <span class="po-tier__prices"><span class="po-tier__total" data-tier-total></span><s class="po-tier__compare" data-tier-compare hidden></s>${q > 1 ? '<span class="po-tier__each"><span data-tier-each></span> each</span>' : ''}</span>${badge ? `<span class="po-tier__badge">${badge}</span>` : ''}</span></label>`).join('')}
  </div>
  <button type="button" class="btn btn-primary po-button" data-theme-button="primary" data-sl-button data-button-role="primary" data-offer-add><span class="po-button__text">Add to cart</span></button>
  <p class="po-message" role="status" data-message hidden></p>
  <script type="application/json" data-variants>${JSON.stringify(mainVariants.map(v => ({id: v.id, price: v.price, compare: v.compare || 0, available: v.available !== false})))}</script>
  <script type="application/json" data-selected>"v-a1"</script>
</quantity-offer>
<script>
  window.routes = {cart_add_url: '/cart/add', cart_update_url: '/cart/update', cart_url: '/cart'};
  window.Shopify = {formatMoney: c => '$' + (c / 100).toFixed(2)};
  window.cartUpdates = [];
  window.PUB_SUB_EVENTS = {cartUpdate: 'cart-update'};
  window.publish = (name, data) => window.cartUpdates.push(name);
  customElements.define('cart-notification', class extends HTMLElement {
    getSectionsToRender() { return [{id: 'minicart-form'}]; }
    cartAction() { this.dataset.actions = String(Number(this.dataset.actions || 0) + 1); }
    open() { this.classList.add('open'); this.dataset.opened = String(Number(this.dataset.opened || 0) + 1); }
  });
</script>
<script src="/assets/product-offers.js" defer></script>
</body></html>`;

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const ctx = await browser.newContext({viewport: {width: 375, height: 900}});
    const tab = await ctx.newPage();
    const errors = [];
    tab.on('pageerror', e => errors.push(e.message));
    const requests = [];
    let failAdd = false;
    await tab.route('http://shop.test/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      const json = (body, status = 200) => route.fulfill({status, contentType: 'application/json', body: JSON.stringify(body)});
      if (url.pathname === '/products/pants-down') return route.fulfill({contentType: 'text/html', body: page});
      if (url.pathname.startsWith('/assets/')) return route.fulfill({contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', body: read('shopify/assets/' + url.pathname.slice(8))});
      const body = req.postData() ? JSON.parse(req.postData()) : null;
      requests.push({path: url.pathname, method: req.method(), body});
      if (url.pathname === '/cart/add.js') {
        if (failAdd) return json({status: 422, message: 'Cart Error', description: 'Only 2 left'}, 422);
        return json({items: body.items, sections: body.sections ? {'minicart-form': '<div id="minicart-form"><p class="added">Added</p></div>'} : undefined});
      }
      if (url.pathname === '/cart.js') return json({discount_codes: [{code: 'WELCOME', applicable: true}], items: []});
      if (url.pathname === '/cart/update.js') return json({discount_codes: body.discount.split(',').map(code => ({code, applicable: true})), sections: {'minicart-form': '<div id="minicart-form"><p class="added">Added with code</p></div>'}});
      if (url.pathname === '/cart.json') return json({item_count: 3, items_subtotal_price: 100});
      return route.fulfill({status: 404, body: ''});
    });
    await tab.goto('http://shop.test/products/pants-down');
    await tab.waitForFunction(() => customElements.get('product-bundle') && customElements.get('quantity-offer'));
    const text = sel => tab.$eval(sel, el => el.hidden ? '' : el.textContent.trim());

    // Bundle: real prices, saving on the complete set
    assert.equal(await text('#ProductBundle-b1 [data-total]'), money(Math.round(21277 * .9)));
    assert.equal(await text('#ProductBundle-b1 [data-total-compare]'), money(21277));
    assert.equal(await text('#ProductBundle-b1 [data-saving-amount]'), money(Math.round(21277 * .1)));
    assert.equal(await text('#ProductBundle-b1 [data-main-line] [data-line-compare]'), money(21193), 'compare at price from the variant');
    checks++;

    // follows the product form's variant
    await tab.evaluate(() => { const i = document.querySelector('#product-form-main [name=id]'); i.value = 'v-a2'; i.dispatchEvent(new Event('change', {bubbles: true})); });
    assert.equal(await tab.$eval('#ProductBundle-b1 [data-main-line] select', s => s.value), 'v-a2');
    assert.equal(await text('#ProductBundle-b1 [data-total]'), money(Math.round(21500 * .9)));
    checks++;

    // exclude a line by keyboard: no saving on an incomplete set, total of what is ticked
    await tab.focus('#B-2');
    await tab.keyboard.press('Space');
    assert.equal(await tab.$eval('#B-2', c => c.checked), false);
    assert.equal(await text('#ProductBundle-b1 [data-total]'), money(16500));
    assert.equal(await text('#ProductBundle-b1 [data-saving]'), '', 'saving hidden for an incomplete set');
    assert.equal(await tab.$eval('#ProductBundle-b1 [data-line]:nth-child(2)', l => l.hasAttribute('data-excluded')), true);
    const ring = await tab.$eval('#B-2 + label .po-check', el => getComputedStyle(el).outlineStyle);
    assert.equal(ring, 'solid', 'focused checkbox shows a ring');
    await tab.click('label[for="B-2"]');
    await tab.selectOption('#ProductBundle-b1 [data-line]:nth-child(3) select', 'v-c2');
    assert.equal(await text('#ProductBundle-b1 [data-line]:nth-child(3) [data-line-price]'), money(3000));
    assert.equal(await tab.$eval('#ProductBundle-b1 [data-line]:nth-child(3) option[value="v-c3"]', o => o.disabled), true, 'sold out option disabled');
    checks++;

    // one items[] request, then the code, then the drawer redraws and opens
    await tab.click('#ProductBundle-b1 [data-offer-add]');
    await tab.waitForFunction(() => document.getElementById('drawer').dataset.opened === '1');
    const add = requests.find(r => r.path === '/cart/add.js');
    assert.deepEqual(add.body.items, [{id: 'v-a2', quantity: 1}, {id: 'v-b1', quantity: 1}, {id: 'v-c2', quantity: 1}], 'every ticked line in one request, ids kept as strings');
    assert.equal(requests.filter(r => r.path === '/cart/add.js').length, 1);
    const update = requests.find(r => r.path === '/cart/update.js');
    assert.equal(update.body.discount, 'WELCOME,BUNDLE10', 'code added to the codes already in the cart');
    assert.deepEqual(update.body.sections, ['minicart-form']);
    assert.equal(await text('#minicart-form .added'), 'Added with code');
    assert.equal(await tab.$eval('#drawer', d => d.dataset.actions), '1', 'drawer actions bound again');
    await tab.waitForFunction(() => document.querySelector('.cart-count').textContent === '3');
    assert.deepEqual(await tab.evaluate(() => window.cartUpdates), ['cart-update']);
    checks++;

    // an incomplete set is added without the code
    requests.length = 0;
    await tab.click('label[for="B-3"]');
    await tab.click('#ProductBundle-b1 [data-offer-add]');
    await tab.waitForFunction(() => document.getElementById('drawer').dataset.opened === '2');
    assert.equal(requests.filter(r => r.path === '/cart/update.js').length, 0, 'no code for an incomplete set');
    assert.deepEqual(requests.find(r => r.path === '/cart/add.js').body.sections, ['minicart-form']);
    await tab.click('label[for="B-3"]');
    checks++;

    // an add the cart refuses says why
    failAdd = true;
    await tab.click('#ProductBundle-b1 [data-offer-add]');
    await tab.waitForFunction(() => !document.querySelector('#ProductBundle-b1 [data-message]').hidden);
    assert.equal(await text('#ProductBundle-b1 [data-message]'), 'Only 2 left');
    assert.equal(await tab.$eval('#ProductBundle-b1 [data-offer-add]', b => b.hasAttribute('aria-busy')), false);
    failAdd = false;
    checks++;

    // Quantity offer: prices from the variant, the tier sets the form quantity
    const tierTotal = n => text(`#QuantityOffer-q1 .po-tier:nth-child(${n}) [data-tier-total]`);
    assert.equal(await tab.$eval('#product-form-main [name=quantity]', i => i.value), '1');
    assert.equal(await tierTotal(1), money(14000), 'follows the variant chosen before');
    await tab.click('#QuantityOffer-q1 .po-tier:nth-child(2)');
    assert.equal(await tab.$eval('#product-form-main [name=quantity]', i => i.value), '2');
    await tab.focus('#QuantityOffer-q1 .po-tier:nth-child(2) input');
    assert.equal(await tierTotal(2), money(12600 * 2));
    assert.equal(await text('#QuantityOffer-q1 .po-tier:nth-child(2) [data-tier-each]'), money(12600));
    assert.equal(await text('#QuantityOffer-q1 .po-tier:nth-child(2) [data-tier-compare]'), money(28000));
    await tab.keyboard.press('ArrowDown');
    assert.equal(await tab.$eval('#QuantityOffer-q1 .po-tier:nth-child(3) input', r => r.checked), true, 'arrow keys move between tiers');
    assert.equal(await tab.$eval('#product-form-main [name=quantity]', i => i.value), '3');
    const tierRing = await tab.$eval('#QuantityOffer-q1 .po-tier:nth-child(3) .po-tier__card', el => getComputedStyle(el).outlineStyle);
    assert.equal(tierRing, 'solid', 'focused tier shows a ring');
    await tab.evaluate(() => { const i = document.querySelector('#product-form-main [name=id]'); i.value = 'v-a1'; i.dispatchEvent(new Event('change', {bubbles: true})); });
    assert.equal(await tierTotal(3), money(Math.round(13777 * .85) * 3));
    checks++;

    requests.length = 0;
    await tab.click('#QuantityOffer-q1 .po-tier:nth-child(2)');
    await tab.click('#QuantityOffer-q1 [data-offer-add]');
    await tab.waitForFunction(() => document.getElementById('drawer').dataset.opened === '3');
    assert.deepEqual(requests.find(r => r.path === '/cart/add.js').body.items, [{id: 'v-a1', quantity: 2}]);
    assert.equal(requests.find(r => r.path === '/cart/update.js').body.discount, 'WELCOME,PACK2', "the tier's code");
    checks++;

    // a sold out variant cannot be added
    await tab.evaluate(() => { const i = document.querySelector('#product-form-main [name=id]'); i.value = 'v-a3'; i.dispatchEvent(new Event('change', {bubbles: true})); });
    assert.equal(await tab.$eval('#QuantityOffer-q1 [data-offer-add]', b => b.disabled), true);
    assert.equal(await text('#QuantityOffer-q1 .po-button__text'), 'Sold out');
    checks++;

    // 375px: no sideways scroll, 44px targets, theme button contract
    const layout = await tab.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      buttons: [...document.querySelectorAll('.po-button')].map(b => [b.getBoundingClientRect().height, b.getAttribute('data-theme-button')]),
      labels: [...document.querySelectorAll('.po-line__label, .po-tier__card, .po-select select')].map(el => Math.round(el.getBoundingClientRect().height)),
      overflow: [...document.querySelectorAll('.po *')].filter(el => el.getBoundingClientRect().right > 375 - 16 + 1).map(el => el.className),
    }));
    assert(layout.scroll <= 375, 'no sideways scroll at 375px: ' + layout.scroll);
    for (const [h, role] of layout.buttons) { assert(h >= 44, 'button 44px'); assert.equal(role, 'primary'); }
    assert(layout.labels.every(h => h >= 44), 'tap targets 44px: ' + layout.labels);
    assert.deepEqual(layout.overflow, [], 'everything inside the 16px gutter');
    checks++;

    // A section drawn again in place sets itself up again
    await tab.evaluate(() => { const el = document.getElementById('QuantityOffer-q1'); const copy = el.cloneNode(true); el.replaceWith(copy); });
    assert.equal(await tierTotal(1), money(14000), 'redrawn block reads its prices again');
    checks++;

    // Reduced motion stops the transitions
    await tab.emulateMedia({reducedMotion: 'reduce'});
    assert.equal(await tab.$eval('.po-tier__card', el => getComputedStyle(el).transitionDuration), '0s');
    checks++;

    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  console.log(`${checks} bundle and quantity offer checks passed`);
})().catch(error => { console.error(error); process.exit(1); });
