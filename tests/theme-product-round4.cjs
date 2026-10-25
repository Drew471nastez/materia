/* Run: node tests/theme-product-round4.cjs   (LIVE=0 skips the live site)
   Product page and Featured product, round 4.

   Static: both sections declare Show video controls beside autoplay and
   loop; the gallery's videos and YouTube / Vimeo players follow it; the
   Size Chart Popup is a <dialog class="mt-sheet"> opened by
   product-page-ui.js and is no longer moved to <body> (which lost the
   block's colours); the size table is an animated mt-acc.

   Rendered through the repository's Liquid test subset, then drawn in
   Chromium with the theme's own product-page-ui.css / .js:
   - Gallery video: a video brought into view by the slider gets its
     controls re-armed (Chrome left them dead on the live site: nothing
     played, nothing scrubbed); a tap on a paused video plays it on a phone;
     with controls off a tap pauses too; autoplay plays muted in view and
     every video pauses when its slide leaves.
   - Size Chart Popup at 375 and 1366: colours saved as "rgba(0, 0, 0, 0)"
     fall back to the scheme (the link and the panel were invisible), opens
     as a bottom sheet on phones and a centred panel on desktop, 44px close,
     Escape, backdrop, Tab stays inside, focus returns, tabs with arrow keys,
     an empty tab is left out, Storelib's own size chart is drawn as a table
     with a cm / in switch.
   - Size table: opens and closes with a steady height change, no jump.
   - Short description: Storelib description cut at a word with an ellipsis,
     paragraphs never run together, a cut excerpt does not hide the full
     description below it, a whole one does; builder notes when empty.
   - Pair With Upsell: the price follows the chosen option (Storelib has no
     /variants/<id>.js), Add puts that variant in the cart, Added takes it
     out again, 44px buttons.
   Live (LIVE unset): the real product page with this repository's assets,
   its gallery set to manual play: a click plays the video, a second pauses,
   the timeline scrubs, sliding away pauses. */
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), Module = require('module'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const schemaOf = f => JSON.parse(read(f).match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]);

/* the Liquid subset of theme-product-cards.cjs */
const helperFile = path.join(__dirname, 'theme-product-cards.cjs'), helperSrc = read('tests/theme-product-cards.cjs');
const helper = new Module(helperFile, module); helper.filename = helperFile; helper.paths = module.paths;
helper._compile(helperSrc.slice(0, helperSrc.indexOf('(async () => {')) + '\nmodule.exports={renderTemplate,templateOf,config,env,product};', helperFile);
const h = helper.exports;
const render = (name, ctx) => h.renderTemplate(h.templateOf(read('snippets/' + name + '.storelib')), {settings: h.config, pages: {}, request: {design_mode: false}, ...ctx}, h.env);
const block = (type, settings, ctx = {}) => render('product-info-blocks', {block: {id: 'b-' + type, type, settings, shopify_attributes: ''}, block_st: settings, pib_drawn: '', shop: {currency: 'BRL', locale: 'en', money_format: 'R${{amount}}'}, ...ctx});
const WEBM = read('tests/theme-product-blocks.cjs').match(/const WEBM = '([^']+)'/)[1];
let checks = 0;

/* ---------------------------------------------------------------- static */
{
  for (const file of ['sections/main-product.storelib', 'sections/featured-product.storelib']) {
    const s = schemaOf(file);
    for (const list of [s.settings, s.shopify.settings]) {
      const ids = list.map(x => x.id);
      const c = list.find(x => x.id === 'enable_video_controls');
      assert(c && c.type === 'checkbox' && c.default === true, file + ': Show video controls, on by default');
      assert(ids.includes('enable_video_autoplay') && ids.includes('enable_video_looping'), file + ': autoplay and loop settings');
    }
    for (const model of [s, s.shopify]) {
      assert(!model.blocks.some(b=>b.type==='size_chart_popup'),file+': legacy popup retired');
      assert(model.blocks.some(b=>b.type==='size_guide'),file+': assigned-product size guide available');
    }
  }
  const layout = read('snippets/product-media-layout.storelib');
  assert.equal((layout.match(/\{% if enable_video_controls %\}controls\{% endif %\}/g) || []).length, 2, 'both gallery video tags follow the setting');
  assert.equal((layout.match(/controls: enable_video_controls/g) || []).length, 2, 'video_tag follows the setting');
  assert.equal((layout.match(/&controls=\{% if enable_video_controls %\}1\{% else %\}0\{% endif %\}/g) || []).length, 4, 'YouTube and Vimeo follow the setting');
  assert(!/\bcontrols\n/.test(layout.replace(/\{% if enable_video_controls %\}controls\{% endif %\}/g, '')), 'no unconditional controls attribute');
  const popup = read('snippets/size-chart-popup-import.storelib');
  assert(popup.includes('<dialog id="SCDialog-{{ block.id }}"') && popup.includes('class="mt-sheet scp__dialog"'), 'the popup is a dialog sheet');
  assert(popup.includes('data-mt-sheet-open') && popup.includes('data-mt-sheet-close'), 'opened and closed by product-page-ui');
  assert(!/appendChild/.test(popup), 'the dialog stays in place, so it keeps the section colours');
  assert(read('snippets/size-table-render.storelib').includes('class="sz-wrap mt-acc"'), 'the size table opens smoothly like the info rows');
  const ui = read('shopify/assets/product-page-ui.js');
  assert(/function rearmControls/.test(ui) && /if \(visible && !el\._mtVisible\) rearmControls\(el\)/.test(ui), 'gallery video controls re-armed when they come into view');
  checks++;
}

/* scheme-color: Storelib writes the transparent default with spaces */
{
  const real = h.renderTemplate(h.templateOf(read('snippets/scheme-color.storelib')), {color: 'rgba(0, 0, 0, 0)', fallback: 'var(--color-text)'}, h.env);
  assert.equal(real.trim(), 'var(--color-text)');
  assert.equal(h.renderTemplate(h.templateOf(read('snippets/scheme-color.storelib')), {color: '#123456', fallback: 'x'}, h.env).trim(), '#123456');
  checks++;
}

/* Storelib's own size chart */
const STORELIB_CHART = {name: 'Pants', unit: 'cm', columns: ['Size', 'Waist', 'Hips'], rows_cm: [['S', '72', '94'], ['M', '78', '100']], rows_in: [['S', '28', '37'], ['M', '31', '39']], notes: 'Measured flat.'};
{
  const html = render('product-size-chart-content', {product: {id: 7, metafields: {storelib: {size_chart: {value: STORELIB_CHART}}}}});
  assert(html.includes('<th scope="col">Waist (cm)</th>') && html.includes('<th scope="col">Waist (in)</th>'), 'both units drawn');
  assert(html.includes('<th scope="row">M</th><td>78</td>') && html.includes('Measured flat.'), 'rows and notes');
  const one = render('product-size-chart-content', {product: {id: 8, metafields: {storelib: {size_chart: {value: {columns: ['Size', 'Chest'], rows: ['S|90', 'M|96'], unit: 'cm'}}}}}});
  assert(one.includes('<th scope="row">S</th><td>90</td>') && !one.includes('mt-size-chart__units'), 'one unit, rows written as text');
  assert.equal(render('product-size-chart-content', {product: {id: 9, metafields: {}}}).trim(), '', 'no chart, nothing drawn');
  checks++;
}

/* short description */
{
  const product = {id: 1, title: 'Pants', available: true, metafields: {},
    description: '<p>Designed for everyday wear, each piece combines comfort, clean details, and easy styling.</p><p>Second paragraph with more words.</p>'};
  const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const cut = text(block('short_description', {excerpt_length: 70}, {product}));
  assert.equal(cut, 'Designed for everyday wear, each piece combines comfort, clean…', 'cut at a word with an ellipsis');
  const whole = block('short_description', {excerpt_length: 400}, {product});
  assert(text(whole).includes('easy styling. Second paragraph'), 'paragraphs keep a space between them');
  // a cut excerpt leaves the full description to the block below it; a whole one does not repeat
  const seq = len => {
    const ctx = {product, pib_drawn: '', shop: {}, request: {design_mode: false}, settings: h.config, pages: {}};
    let out = '';
    for (const [type, settings] of [['short_description', {excerpt_length: len}], ['product_description', {}]]) {
      ctx.block = {id: type, type, settings, shopify_attributes: ''}; ctx.block_st = settings;
      out += h.renderTemplate(h.templateOf(read('snippets/product-info-blocks.storelib')), ctx, h.env);
    }
    return out;
  };
  assert((seq(70).match(/Second paragraph/g) || []).length === 1 && seq(70).includes('pd-content'), 'excerpt then the full description');
  assert(!seq(400).includes('pd-content'), 'a whole short description is not repeated by Product description');
  const none = {...product, description: ''};
  assert.equal(text(block('short_description', {excerpt_length: 150}, {product: none})), '', 'nothing on the live site without a description');
  assert(block('short_description', {excerpt_length: 150}, {product: none, request: {design_mode: true}}).includes('pib-note'), 'a note in the builder');
  assert(block('product_description', {}, {product: none, request: {design_mode: true}}).includes('pib-note'), 'Product description: a note in the builder');
  checks++;
}

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const pages = new Map();
    const base = body => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--color-text:#1d1d1d;--color-heading:#0f0f0f;--color-background:#fff;--color-border:#e5e5e5;--body-font-size:15px}body{margin:0;font:15px/1.5 system-ui;color:var(--color-text);background:#fff}</style><link rel="stylesheet" href="/assets/product-page-ui.css"></head><body>${body}<script src="/assets/product-page-ui.js"></script></body></html>`;
    const context = async (opts) => {
      const ctx = await browser.newContext(opts);
      await ctx.route('http://shop.test/**', route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/assets/')) return route.fulfill({contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', body: read('shopify/assets/' + url.pathname.slice(8))});
        if (url.pathname === '/clip.webm') return route.fulfill({contentType: 'video/webm', body: Buffer.from(WEBM, 'base64')});
        if (pages.has(url.pathname)) return route.fulfill({contentType: 'text/html', body: pages.get(url.pathname)});
        // The test renderer's asset_url gives a bare file name (product-offers.js).
        if (/^\/[\w.-]+\.(js|css)$/.test(url.pathname) && fs.existsSync(path.join(root, 'shopify/assets', url.pathname.slice(1)))) return route.fulfill({contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', body: read('shopify/assets/' + url.pathname.slice(1))});
        return route.fallback();
      });
      return ctx;
    };
    const open = async (ctx, name, html) => {
      pages.set('/' + name, html);
      const tab = await ctx.newPage();
      tab.errors = [];
      tab.on('pageerror', e => tab.errors.push(e.message));
      await tab.goto('http://shop.test/' + name);
      await tab.waitForTimeout(150);
      return tab;
    };

    /* Gallery video */
    {
      const gallery = (mode, controls, extra = '') => `<style>.track{display:flex;width:300px;overflow:hidden}.wrap{display:flex;transition:transform .2s}.slide{flex:0 0 300px;height:300px;position:relative}.slide video{position:absolute;inset:0;width:100%;height:100%}</style>
        <media-gallery data-mt-video="${mode}"><div class="track"><div class="wrap" id="wrap"><div class="slide" style="background:#ccc"></div>
        <div class="slide"><div class="mt-video-frame"><video id="v" class="media-video" src="/clip.webm" playsinline preload="auto" loop ${controls ? 'controls' : ''} ${extra}></video></div></div></div></div></media-gallery>`;
      for (const [w, touch] of [[1366, false], [375, true]]) {
        const ctx = await context({viewport: {width: w, height: 800}, hasTouch: touch, isMobile: touch});
        // manual play, controls on
        let tab = await open(ctx, 'video-' + w, base(gallery('manual', true)));
        await tab.evaluate(() => { window.flips = 0; new MutationObserver(r => { window.flips += r.filter(x => x.attributeName === 'controls').length; }).observe(document.getElementById('v'), {attributes: true}); });
        await tab.evaluate(() => { document.getElementById('wrap').style.transform = 'translateX(-300px)'; });
        await tab.waitForTimeout(500);
        assert(await tab.evaluate(() => window.flips >= 2 && document.getElementById('v').controls), `${w}: controls re-armed as the video slides into view`);
        assert(await tab.evaluate(() => document.getElementById('v').paused), `${w}: manual gallery does not start on its own`);
        const box = await tab.locator('#v').boundingBox();
        const press = () => touch ? tab.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2) : tab.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await press(); await tab.waitForTimeout(600);
        assert.equal(await tab.evaluate(() => document.getElementById('v').paused), false, `${w}: a press plays the video`);
        if (!touch) { await press(); await tab.waitForTimeout(500); assert(await tab.evaluate(() => document.getElementById('v').paused), `${w}: a second click pauses`); await press(); await tab.waitForTimeout(400); }
        await tab.evaluate(() => { document.getElementById('wrap').style.transform = 'translateX(0)'; });
        await tab.waitForTimeout(600);
        assert(await tab.evaluate(() => document.getElementById('v').paused), `${w}: sliding away pauses`);
        assert.deepEqual(tab.errors, []);
        await tab.close();
        // controls off: a tap plays and a second tap pauses, also on a phone
        tab = await open(ctx, 'video-bare-' + w, base(gallery('manual', false)));
        await tab.evaluate(() => { document.getElementById('wrap').style.transform = 'translateX(-300px)'; });
        await tab.waitForTimeout(400);
        const b2 = await tab.locator('#v').boundingBox();
        const tap = () => touch ? tab.touchscreen.tap(b2.x + 150, b2.y + 150) : tab.mouse.click(b2.x + 150, b2.y + 150);
        await tap(); await tab.waitForTimeout(600);
        assert.equal(await tab.evaluate(() => document.getElementById('v').paused), false, `${w}: no controls, a press plays`);
        await tap(); await tab.waitForTimeout(600);
        assert.equal(await tab.evaluate(() => document.getElementById('v').paused), true, `${w}: no controls, a press pauses`);
        await tab.close();
        // autoplay: muted, plays in view, pauses out of view
        tab = await open(ctx, 'video-auto-' + w, base(gallery('autoplay', true, 'muted autoplay')));
        await tab.evaluate(() => { document.getElementById('v').pause(); document.getElementById('wrap').style.transform = 'translateX(-300px)'; });
        await tab.waitForTimeout(700);
        assert(await tab.evaluate(() => !document.getElementById('v').paused && document.getElementById('v').muted), `${w}: autoplay plays muted in view`);
        await tab.evaluate(() => { document.getElementById('wrap').style.transform = 'translateX(0)'; });
        await tab.waitForTimeout(600);
        assert(await tab.evaluate(() => document.getElementById('v').paused), `${w}: autoplay pauses out of view`);
        await tab.close();
        await ctx.close();
      }
      checks++;
    }

    /* Size Chart Popup */
    {
      const T = 'rgba(0, 0, 0, 0)';
      const chart = '<table><tr><th>Size</th><th>Waist</th></tr><tr><td>S</td><td>72</td></tr></table>';
      const settings = {trig_text: 'Size Guide', underline_text: true, show_icon: true, trig_align: 'left', trig_color: T, icon_color: T, modal_bg: T, title_color: T, modal_title: 'Size Guide', enable_size_popup: true,
        tab_sizes_label: 'Sizes', tab_measure_label: 'How to measure', sizes_content: chart, h_a_title: 'CHEST', h_a_text: 'Around the fullest part.', h_b_title: 'WAIST', h_b_text: '', h_c_title: 'HIPS', h_c_text: '', modal_width_d: 880, modal_width_t: 720};
      const popup = (id, s, product = {metafields: {}}) => render('size-chart-popup-import', {block: {id, settings: s, shopify_attributes: ''}, product});
      // nothing to show: no link on the live site
      assert.equal(popup('none', {...settings, sizes_content: '', h_a_text: ''}).trim(), '', 'nothing to show, no link');
      assert(!popup('one', {...settings, h_a_text: ''}).includes('role="tablist"'), 'an empty tab is left out');
      const html = `<p style="padding:20px">Product</p>${popup('sc', settings)}${popup('sl', {...settings, sizes_content: ''}, {id: 3, metafields: {storelib: {size_chart: {value: STORELIB_CHART}}}})}`;
      for (const [w, touch] of [[1366, false], [375, true]]) {
        const ctx = await context({viewport: {width: w, height: 800}, hasTouch: touch, isMobile: touch});
        const tab = await open(ctx, 'sc-' + w, base(html));
        const trig = tab.locator('#SC-sc .scp__trigger');
        const tc = await trig.evaluate(e => ({color: getComputedStyle(e).color, h: e.getBoundingClientRect().height}));
        assert.equal(tc.color, 'rgb(29, 29, 29)', `${w}: the link takes the scheme text colour, not transparent`);
        assert(tc.h >= 44, `${w}: 44px link`);
        touch ? await trig.tap() : await trig.click();
        await tab.waitForTimeout(450);
        const st = await tab.evaluate(() => { const d = document.getElementById('SCDialog-sc'), p = d.querySelector('.scp__modal'), r = p.getBoundingClientRect(), c = d.querySelector('.scp__close').getBoundingClientRect();
          return {open: d.open, modal: d.matches(':modal'), bg: getComputedStyle(p).backgroundColor, title: getComputedStyle(d.querySelector('.scp__title')).color, top: r.top, bottom: r.bottom, left: r.left, right: r.right, close: [c.width, c.height], focus: d.contains(document.activeElement), lock: document.documentElement.classList.contains('mt-lock'), expanded: document.querySelector('#SC-sc .scp__trigger').getAttribute('aria-expanded'), inPlace: d.parentElement.id === 'SC-sc'}; });
        assert(st.open && st.modal && st.inPlace, `${w}: opens as a modal dialog where it is`);
        assert.equal(st.bg, 'rgb(255, 255, 255)', `${w}: panel on the scheme background`);
        assert.equal(st.title, 'rgb(15, 15, 15)', `${w}: title in the scheme heading colour`);
        assert(st.close[0] >= 44 && st.close[1] >= 44, `${w}: 44px close`);
        assert(st.focus && st.lock && st.expanded === 'true', `${w}: focus inside, page locked, aria-expanded`);
        if (w < 768) assert(Math.abs(st.bottom - 800) < 1 && st.left === 0 && Math.abs(st.right - w) < 1, `${w}: a bottom sheet`);
        else assert(Math.abs((st.top + st.bottom) / 2 - 400) < 2 && st.right - st.left <= 880, `${w}: a centred panel ${JSON.stringify(st)}`);
        // tabs
        const tabs = tab.locator('#SCDialog-sc [data-mt-tab]');
        touch ? await tabs.nth(1).tap() : await tabs.nth(1).click();
        await tab.waitForTimeout(100);
        assert.deepEqual(await tab.evaluate(() => [...document.querySelectorAll('#SCDialog-sc .scp__panel')].map(p => p.hidden)), [true, false], `${w}: How to measure shows`);
        await tabs.nth(1).focus();
        await tab.keyboard.press('ArrowRight');
        assert.deepEqual(await tab.evaluate(() => [document.activeElement.textContent.trim(), [...document.querySelectorAll('#SCDialog-sc .scp__panel')].map(p => p.hidden)]), ['Sizes', [false, true]], `${w}: arrow keys move between tabs`);
        // Tab stays inside
        for (let i = 0; i < 5; i++) await tab.keyboard.press('Tab');
        assert(await tab.evaluate(() => document.getElementById('SCDialog-sc').contains(document.activeElement)), `${w}: Tab stays inside`);
        await tab.keyboard.press('Escape');
        await tab.waitForTimeout(450);
        assert.deepEqual(await tab.evaluate(() => [document.getElementById('SCDialog-sc').open, document.activeElement.classList.contains('scp__trigger'), document.documentElement.classList.contains('mt-lock')]), [false, true, false], `${w}: Escape closes, focus returns, page unlocked`);
        // backdrop and close button
        touch ? await trig.tap() : await trig.click(); await tab.waitForTimeout(450);
        if (touch) await tab.touchscreen.tap(w / 2, 10); else await tab.mouse.click(10, 10);
        await tab.waitForTimeout(450);
        assert.equal(await tab.evaluate(() => document.getElementById('SCDialog-sc').open), false, `${w}: the backdrop closes`);
        touch ? await trig.tap() : await trig.click(); await tab.waitForTimeout(450);
        const close = tab.locator('#SCDialog-sc .scp__close');
        touch ? await close.tap() : await close.click(); await tab.waitForTimeout(450);
        assert.equal(await tab.evaluate(() => document.getElementById('SCDialog-sc').open), false, `${w}: the close button closes`);
        // Storelib's size chart with the unit switch
        const sl = tab.locator('#SC-sl .scp__trigger');
        touch ? await sl.tap() : await sl.click(); await tab.waitForTimeout(450);
        const shown = () => tab.evaluate(() => [...document.querySelectorAll('#SCDialog-sl .mt-size-chart__table')].map(t => getComputedStyle(t).display !== 'none'));
        assert.deepEqual(await shown(), [true, false], `${w}: cm first`);
        const inch = tab.locator('#SCDialog-sl .mt-size-chart__units label').nth(1);
        touch ? await inch.tap() : await inch.click();
        assert.deepEqual(await shown(), [false, true], `${w}: in on request`);
        assert(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w}: no sideways scroll`);
        assert.deepEqual(tab.errors, []);
        await ctx.close();
      }
      checks++;
    }

    /* Size table: smooth open and close */
    {
      const table = render('size-table-render', {block: {id: 'st', settings: {title: 'Size Guide', table_data: 'SIZE | CHEST\nS | 90\nM | 96\nL | 102\nXL | 108', collapsible: true}}, product: {metafields: {}}});
      const ctx = await context({viewport: {width: 375, height: 800}, hasTouch: true, isMobile: true});
      const tab = await open(ctx, 'size-table', base(table));
      const sample = () => tab.evaluate(() => new Promise(res => { const d = document.querySelector('#SizeTable-st details'), out = []; const t0 = performance.now();
        (function f() { out.push(d.getBoundingClientRect().height); if (performance.now() - t0 < 600) requestAnimationFrame(f); else res(out); })(); }));
      const summary = tab.locator('#SizeTable-st summary');
      await summary.tap();
      const opening = await sample();
      await tab.waitForTimeout(100);
      await summary.tap();
      const closing = await sample();
      const steady = (hs, up) => { const s = hs.slice(1).map((x, i) => x - hs[i]); return s.every(d => up ? d >= -0.5 : d <= 0.5) && new Set(hs.map(Math.round)).size > 4 && Math.max(...s.map(Math.abs)) < (hs[hs.length - 1] + hs[0]) / 2; };
      assert(steady(opening, true), 'the table opens with a steady height change: ' + opening.map(Math.round).join(','));
      assert(steady(closing, false), 'the table closes with a steady height change: ' + closing.map(Math.round).join(','));
      assert.equal(await tab.evaluate(() => document.querySelector('#SizeTable-st details').open), false);
      assert(await tab.evaluate(() => document.querySelector('#SizeTable-st summary').getBoundingClientRect().height >= 44), '44px row');
      await ctx.close();
      checks++;
    }

    /* Pair With Upsell */
    {
      const v = (id, title, price) => ({id, title, price, available: true});
      const all_products = {
        tee: {id: 't1', title: 'Black Sleeves', available: true, featured_image: {src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: ''}, variants: [v('t-s', 'S', 503), v('t-m', 'M', 503)], },
        pants: {id: 'p1', title: 'Pants Down', available: true, featured_image: null, variants: [v('p-s', 'S / Black', 13777), v('p-xl', 'XL / Black', 15900)]},
      };
      for (const p of Object.values(all_products)) p.selected_or_first_available_variant = p.variants[0];
      const markup = block('pair_with_upsell', {heading: 'Works well with', p1: 'tee', p2: 'pants', layout: 'grid', per_row_d: 1, per_row_m: 1, btn_label: 'Add product', btn_label_added: 'Added', price_currency: 'shop'}, {all_products, fb_accessibility_add_product: 'Add product'});
      const ctx = await context({viewport: {width: 375, height: 800}, hasTouch: true, isMobile: true});
      const cart = {items: [], item_count: 0};
      const posts = [];
      await ctx.route('http://shop.test/cart**', async route => {
        const req = route.request(), url = new URL(req.url());
        if (req.method() === 'POST') {
          const body = JSON.parse(req.postData() || '{}'); posts.push([url.pathname, body]);
          if (url.pathname === '/cart/add.js') for (const it of body.items || [body]) cart.items.push({id: it.id, quantity: it.quantity});
          if (url.pathname === '/cart/update.js') for (const [id, q] of Object.entries(body.updates || {})) if (!q) cart.items = cart.items.filter(i => i.id !== id);
          if (url.pathname === '/cart/change.js' && !body.quantity) cart.items = cart.items.filter(i => i.id !== body.id);
        }
        cart.item_count = cart.items.length;
        return route.fulfill({contentType: 'application/json', body: JSON.stringify(cart)});
      });
      const tab = await open(ctx, 'pair', base('<span class="cart-count">0</span>' + markup));
      const card = tab.locator('.pw-card').nth(1);
      const before = await card.locator('.pw-price').textContent();
      assert(/137/.test(before), 'first price drawn: ' + before);
      await card.locator('select').selectOption('p-xl');
      const after = await card.locator('.pw-price').textContent();
      assert(before !== after && /159/.test(after), 'the price follows the chosen option: ' + after);
      assert.deepEqual(await card.locator('option').evaluateAll(o => o.map(x => x.textContent.trim())), ['S / Black', 'XL / Black'], 'option names kept');
      const btn = card.locator('[data-add-btn]');
      assert((await btn.boundingBox()).height >= 44, '44px button');
      await btn.tap();
      await tab.waitForTimeout(400);
      assert.equal(posts[0][0], '/cart/add.js'); assert.deepEqual(posts[0][1].items.map(({id, quantity}) => ({id, quantity})), [{id: 'p-xl', quantity: 1}], 'Add puts the chosen variant in the cart'); assert.equal(posts[0][1].items[0].properties._sl_offer, 'pair', 'marked as a pair-with line');
      assert.equal((await btn.textContent()).trim(), 'Added');
      assert.equal(await btn.getAttribute('aria-pressed'), 'true');
      await tab.waitForFunction(() => document.querySelector('.cart-count').textContent.trim() === '1', null, {timeout: 3000}).catch(() => {});
      assert.equal((await tab.locator('.cart-count').textContent()).trim(), '1', 'the cart count follows');
      await btn.tap();
      await tab.waitForTimeout(400);
      assert.equal(posts[1][0], '/cart/change.js'); assert.equal(posts[1][1].id, 'p-xl'); assert.equal(posts[1][1].quantity, 0, 'Added takes it out again');
      assert.equal((await btn.textContent()).trim(), 'Add product');
      assert(await tab.evaluate(() => document.querySelector('.pw-card .pw-variant-wrap') && document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 375');
      assert.deepEqual(tab.errors, []);
      await ctx.close();
      checks++;
    }

    /* Live product page with this repository's assets */
    if (process.env.LIVE !== '0') {
      const URL = 'https://andrewrullz.storelib.com/products/pants-down';
      for (const [w, touch] of [[1366, false], [375, true]]) {
        const ctx = await browser.newContext({viewport: {width: w, height: 900}, hasTouch: touch, isMobile: touch});
        const tab = await ctx.newPage();
        await tab.route(URL, async r => { const res = await r.fetch(); const t = (await res.text()).replace(/data-mt-video="autoplay"/g, 'data-mt-video="manual"').replace(/muted autoplay/g, '').replace(/data-auto-play-video="true"/g, 'data-auto-play-video="false"'); r.fulfill({response: res, body: t}); });
        await tab.route(/\/api\/site-theme\/assets\/.*\/([a-z0-9._-]+\.(js|css))(\?.*)?$/, r => {
          const name = r.request().url().match(/\/([a-z0-9._-]+\.(js|css))(\?.*)?$/)[1];
          const file = path.join(root, 'shopify/assets', name);
          if (fs.existsSync(file)) return r.fulfill({body: fs.readFileSync(file), contentType: name.endsWith('.js') ? 'application/javascript' : 'text/css'});
          return r.continue();
        });
        await tab.goto(URL, {waitUntil: 'load', timeout: 60000});
        await tab.waitForTimeout(2500);
        const video = tab.locator('media-gallery .media-main-swiper video').first();
        if (!(await video.count())) { console.log('live: the product has no gallery video now, skipped'); await ctx.close(); break; }
        const index = await video.evaluate(v => [...v.closest('.swiper-wrapper').children].indexOf(v.closest('.swiper-slide')));
        await tab.evaluate(i => document.querySelector('media-gallery .media-main-swiper .swiper').swiper.slideTo(i), index);
        await tab.waitForTimeout(1200);
        await video.scrollIntoViewIfNeeded();
        await tab.waitForTimeout(300);
        const box = await video.boundingBox();
        const state = () => video.evaluate(v => ({paused: v.paused, t: v.currentTime}));
        const press = (x, y) => touch ? tab.touchscreen.tap(x, y) : tab.mouse.click(x, y);
        await press(box.x + box.width / 2, box.y + box.height / 2); await tab.waitForTimeout(1200);
        assert.equal((await state()).paused, false, `live ${w}: the gallery video plays`);
        if (!touch) {
          await press(box.x + box.width / 2, box.y + box.height / 2); await tab.waitForTimeout(600);
          assert.equal((await state()).paused, true, `live ${w}: and pauses`);
          await tab.mouse.move(box.x + box.width / 2, box.y + box.height - 30); await tab.waitForTimeout(300);
          await tab.mouse.click(box.x + box.width * 0.6, box.y + box.height - 22); await tab.waitForTimeout(500);
          assert((await state()).t > 1, `live ${w}: the timeline scrubs`);
          await press(box.x + box.width / 2, box.y + box.height / 2); await tab.waitForTimeout(600);
        }
        await tab.evaluate(() => document.querySelector('media-gallery .media-main-swiper .swiper').swiper.slideTo(0));
        await tab.waitForTimeout(1200);
        assert.equal((await state()).paused, true, `live ${w}: sliding away pauses`);
        await ctx.close();
      }
      checks++;
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} product page round 4 checks passed (video controls and play, size chart sheet, size table, short description, pair with upsell)`);
})().catch(e => { console.error(e); process.exit(1); });
