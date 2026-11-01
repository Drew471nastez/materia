/* Round 6: the cart and search page sections. Shopping cart (main-cart-items)
   with every block type and Search page (main-search), live controller
   shopify/assets/live-cart-search.js, under the real theme priority.
   Also: the schemas of Cart upsell, Cart quick edit and Products grid, and
   the saved /cart and /search looks against commit c098384.

   LIQUIDJS=<liquidjs> LIVE=0 node tests/theme-r6-cart-search.cjs */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict'), {execFileSync} = require('child_process');
const {launch, mount, schemaOf, schemaProblems, PANTS, OTHER, themeControls, THEME_VARS} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const BASE = 'c098384';
let checks = 0;
const ok = (cond, msg) => { assert(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); checks++; };

const item = (p, q) => ({key: p.id + ':1', id: p.variants[0].id, product: p, variant: p.variants[0], quantity: q, title: p.title, url: p.url, image: p.featured_image, final_price: p.price, original_price: p.price, final_line_price: p.price * q, original_line_price: p.price * q, line_level_discount_allocations: [], properties: {}, options_with_values: [], product_id: p.id, variant_id: p.variants[0].id, handle: p.handle});
const CART = {item_count: 3, items: [item(PANTS, 2), item(OTHER, 1)], total_price: PANTS.price * 2 + OTHER.price, items_subtotal_price: PANTS.price * 2 + OTHER.price, cart_level_discount_applications: [], note: '', currency: {iso_code: 'USD'}};
const SEARCH = (results = [PANTS, OTHER]) => ({performed: true, terms: 'pants', results, results_count: results.length, filters: [], sort_options: [], sort_by: ''});
const IMG = {src: 'http://theme.test/a.png', url: 'http://theme.test/a.png', width: 200, height: 200, alt: ''};
const ALL_BLOCKS = [
  {type: 'simple_rating', settings: {text: 'Rated 4.5 by our buyers', filled_stars: 4.5}},
  {type: 'happy_customers', settings: {heading: 'Our customers', show_rating_text: true, rating_text: '4.6', avatar_1: IMG, avatar_2: IMG}},
  {type: 'benefits_pills', settings: {pill1_text: 'Ships in two days', pill2_text: 'Easy returns', pill3_text: 'Gift wrapping'}},
  {type: 'info_box', settings: {top_text: '<p>Orders leave the same day.</p>', top_show_icon: true, collapse_title: 'Delivery', collapse_body: '<p>Two to three days.</p>', collapse2_title: 'Returns', collapse2_body: '<p>Thirty days.</p>'}},
  {type: 'divider'},
  {type: 'guarantee_badge', settings: {render_in_sidebar: true}},
  {type: 'social_proof_avatars', settings: {referral_text: 'Rated 4.8 by our buyers', referral_accent_text: '4.8', ref_avatar_1: IMG, ref_avatar_2: IMG}},
  {type: 'payment_badges'},
  {type: 'faq_section'},
  {type: 'faq', settings: {question: 'When does it ship?', answer: '<p>Within two days.</p>'}},
  {type: 'faq', settings: {question: 'Can I return it?', answer: '<p>Yes, within thirty days.</p>'}},
];
const CART_GLOBALS = {cart: CART};
const SEARCH_GLOBALS = r => ({search: SEARCH(r), routes: {all_products_collection_url: '/collections/all', search_url: '/search', cart_url: '/cart', root_url: '/'}});
const ASSETS = ['collection-page.css', 'cart-drawer.css', 'live-cart-search.js'];

/* computed look of one element and its descendants */
const SIG_PROPS = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily', 'paddingTop', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'columnGap', 'rowGap', 'width', 'height', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRadius', 'justifyContent', 'textAlign', 'display', 'flexDirection', 'boxShadow', 'marginLeft', 'marginInlineStart', 'gridTemplateColumns', 'alignItems', 'flexBasis'];
async function sig(t, sel) {
  return t.page.evaluate(({sel, props}) => {
    const root = document.querySelector(sel); if (!root) return 'missing ' + sel;
    const out = [];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('template') || el.tagName === 'STYLE' || el.tagName === 'TEMPLATE') continue;
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      out.push([el.tagName, el.className && el.className.baseVal === undefined ? el.className : '', el.hidden, ['d', 'points', 'cx', 'r', 'x', 'width'].map(a => el.namespaceURI === 'http://www.w3.org/2000/svg' ? el.getAttribute(a) || '' : '').join(',') + (el.tagName === 'IMG' ? el.getAttribute('src') : ''), el.childElementCount ? '' : el.textContent.trim(), Math.round(r.width), Math.round(r.height), ...props.map(p => cs[p])].join('|'));
    }
    return out.join('\n');
  }, {sel, props: SIG_PROPS});
}
const sec = (uid, sel = '') => '#shopify-section-' + uid + ' ' + sel;
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

/* ---------- saved-look renderer (old file from git or the current one) ---------- */
function themeSettings() {
  const c = JSON.parse(read('config/settings.json')).shopify || {};
  const schemes = Object.entries(c.color_schemes || {}).map(([id, v]) => ({id, settings: v.settings || {}}));
  const cartScheme = schemes.find(s => s.id === c.cart_page_cart_color_scheme) || '';
  return {...c, color_schemes: schemes, cart_page_cart_color_scheme: cartScheme, scroll_animation: 'none'};
}
async function renderRaw(raw, {uid, settings, blocks, globals, editing = false}) {
  const s = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify;
  const def = a => Object.fromEntries((a || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  const bdef = t => def((s.blocks || []).find(x => x.type === t)?.settings);
  const list = blocks || [];
  const section = {id: uid, settings: {...def(s.settings), ...settings}, blocks: list.map((b, i) => ({id: b.id || uid + '-b' + i, type: b.type, settings: {...bdef(b.type), ...(b.settings || {})}, shopify_attributes: ''}))};
  const e = engine();
  e.registerFilter('script_tag', () => '');
  e.registerFilter('img_url', v => v?.url || v?.src || v || '');
  const theme = themeSettings();
  const ctx = {section, settings: theme, request: {design_mode: editing}, shop: {name: 'Materia Themes', currency: 'USD', money_format: '${{amount}}'}, routes: {all_products_collection_url: '/collections/all', cart_add_url: '/cart/add', cart_url: '/cart', root_url: '/', search_url: '/search'}, ...globals};
  /* Liquid comments inside {% liquid %} with backticks (no-ops in Shopify) do not tokenise in liquidjs */
  const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '').replace(/`/g, '');
  const html = await e.parseAndRender(tpl, ctx, {globals: ctx});
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, '');
}
async function shot(browser, html, width, css) {
  const page = await browser.newPage({viewport: {width, height: 900}});
  await page.route('**/*', r => r.request().url() === 'http://theme.test/' ? r.fulfill({body: '<!doctype html><html><head></head><body class="template-cart"></body></html>', contentType: 'text/html'}) : r.fulfill({body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), contentType: 'image/png'}));
  await page.goto('http://theme.test/');
  await page.addStyleTag({content: THEME_VARS});
  await page.addStyleTag({content: await themeControls()});
  for (const f of css) await page.addStyleTag({content: read('shopify/assets/' + f)});
  await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-saved'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, html);
  await page.waitForTimeout(100);
  const png = await page.screenshot({fullPage: true, animations: 'disabled'});
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  await page.close();
  return {png, text};
}
async function savedLooks(browser) {
  for (const [tplName, sectionName, globals, css] of [['cart', 'main-cart-items', CART_GLOBALS, ['critical.css', 'theme.css', 'theme-button-contract.css', 'cart-page.css', 'cart-drawer.css']], ['search', 'main-search', SEARCH_GLOBALS(), ['critical.css', 'theme.css', 'theme-button-contract.css', 'collection-page.css']], ['search', 'main-search', SEARCH_GLOBALS([]), ['critical.css', 'theme.css', 'theme-button-contract.css', 'collection-page.css']]]) {
    const saved = JSON.parse(read('templates/' + tplName + '.json'));
    const key = Object.keys(saved.sections).find(k => saved.sections[k].type === sectionName), inst = saved.sections[key];
    const blocks = (inst.block_order || []).map(id => ({id, ...inst.blocks[id]}));
    const oldRaw = execFileSync('git', ['show', BASE + ':sections/' + sectionName + '.storelib'], {cwd: path.join(__dirname, '..')}).toString();
    const oldHtml = await renderRaw(oldRaw, {uid: 'saved', settings: inst.settings, blocks, globals});
    const newHtml = await renderRaw(read('sections/' + sectionName + '.storelib'), {uid: 'saved', settings: inst.settings, blocks, globals});
    for (const w of [375, 1366]) {
      const a = await shot(browser, oldHtml, w, css), b = await shot(browser, newHtml, w, css);
      if (process.env.LCS_DUMP) { fs.writeFileSync(process.env.LCS_DUMP + '/old-' + tplName + w + '.png', a.png); fs.writeFileSync(process.env.LCS_DUMP + '/new-' + tplName + w + '.png', b.png); fs.writeFileSync(process.env.LCS_DUMP + '/old-' + tplName + '.html', oldHtml); fs.writeFileSync(process.env.LCS_DUMP + '/new-' + tplName + '.html', newHtml); }
      eq(b.text, a.text, `${tplName} ${key} ${w}: same words`);
      ok(Buffer.compare(a.png, b.png) === 0, `${tplName} ${key} (${globals.search && !globals.search.results.length ? 'no results' : 'results'}) ${w}: same pixels as ${BASE}`);
    }
  }
}

/* ---------- the generic control loop ---------- */
function changed(x, cur) {
  switch (x.type) {
    case 'checkbox': return !cur;
    case 'range': { const mid = Math.round((x.min + (x.max - x.min) / 2) / x.step) * x.step; const v = cur === x.max ? x.min : cur === mid ? x.max : mid; return +v.toFixed(2); }
    case 'select': return x.options.map(o => o.value).find(v => v !== cur);
    case 'text': return 'Changed words 7';
    case 'richtext': return '<p>Changed body 7</p>';
    case 'textarea': return '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
    case 'color': return '#ab1234';
    case 'font_picker': return {family: 'Courier New', fallback_families: 'monospace'};
    case 'image_picker': return cur && /a\.png/.test(cur.src || '') ? {...IMG, src: 'http://theme.test/b.png', url: 'http://theme.test/b.png'} : IMG;
    case 'url': return '/pages/changed';
  }
  return undefined;
}
/* settings under which a control is visible and has something to act on */
function context(type, id) {
  const b = {enable_custom_style: true, custom_style: true, enable_custom_fonts: true, font: {family: 'Georgia', fallback_families: 'serif'}, show_avatars: true, show_stars: true, show_rating_text: true, show_heading: true, top_show_icon: true, show_badges: true, show_payment_badges: true, show_faq: true, pill_border_style: 'solid', pill_border_width: 2, pill_shadow: false, filled_stars: 3, avatar_count: 4};
  const m = /^pill(\d)_(.+)$/.exec(id);
  if (m) { b['pill' + m[1] + '_enable'] = true; b['pill' + m[1] + '_text'] = 'Pill ' + m[1]; if (m[2] !== 'icon_svg') b['pill' + m[1] + '_icon_svg'] = '<svg viewBox="0 0 10 10"><rect width="3" height="10"/></svg>'; if (m[2] !== 'icon_image') b['pill' + m[1] + '_icon_image'] = IMG; if (m[2] === 'icon_image') b['pill' + m[1] + '_icon_source'] = 'image'; if (m[2] === 'icon_svg') b['pill' + m[1] + '_icon_source'] = 'svg'; }
  if (type === 'happy_customers') for (let i = 1; i <= 6; i++) b['avatar_' + i] = IMG;
  if (type === 'social_proof_avatars') for (let i = 1; i <= 2; i++) b['ref_avatar_' + i] = IMG;
  if (id === 'collapse2_body' || id === 'collapse2_open') b.collapse2_title = 'Second row';
  if (id === 'collapse2_title') b.collapse2_body = '<p>Second body</p>';
  if (id === 'muted_color' || id === 'collapse_body' || id === 'collapse2_body') { b.collapse_open = true; b.collapse2_open = true; }
  return b;
}
/* settings that need the server: checked after a redraw only */
const SERVER = new Set(['render_in_sidebar', 'show_avatars:image', 'collapse_open', 'collapse2_open', 'top_icon', 'top_show_icon']);
const isServer = (type, x) => SERVER.has(x.id) || x.type === 'image_picker' || x.type === 'font_picker' || /icon_source$|icon_svg$/.test(x.id) || (type === 'info_box' && /^(collapse2?_title|badge_|show_badges$)/.test(x.id)) || (type === 'happy_customers' && x.id === 'avatar_count' && false);
/* where a control shows: _desktop at 1366 only, _mobile at 375 only */
const shows = (id, width) => /_desktop$/.test(id) ? width >= 750 : /_mobile$/.test(id) || id === 'mobile_layout' ? width < 750 : true;

async function blockControls(browser, width) {
  const {schema} = schemaOf('main-cart-items');
  const types = ['simple_rating', 'happy_customers', 'benefits_pills', 'info_box', 'divider', 'guarantee_badge', 'social_proof_avatars', 'payment_badges', 'faq_section', 'faq'];
  for (const type of types) {
    const bs = schema.blocks.find(b => b.type === type);
    const controls = bs.settings.filter(x => x.id && !x.hidden);
    for (const x of controls) {
      const base = {...context(type, x.id), ...(ALL_BLOCKS.find(b => b.type === type)?.settings || {})};
      if (type === 'faq') Object.assign(base, {});
      const blocks = [{type: 'faq_section', settings: {show_faq: true}}, {type, settings: base}];
      if (type === 'faq' || type === 'faq_section') blocks.push({type: 'faq', settings: {question: 'Second', answer: '<p>Two</p>'}});
      const t = await mount(browser, 'main-cart-items', {width, editing: true, blocks, globals: CART_GLOBALS, assets: ASSETS});
      const bid = t.blockId(type), sel = type === 'payment_badges' ? sec('test', '[data-lcs-type="payment_badges"]') : type === 'faq_section' ? sec('test', 'cart-faq') : sec('test', `[data-lcs-block="${bid}"]`);
      const before = await sig(t, sel);
      const v = changed(x, base[x.id] ?? x.default);
      const want = shows(x.id, width);
      const redrawn = await t.redraw({blocks: blocks.map(b => b.type === type ? {type, settings: {...base, [x.id]: v}} : b)});
      const afterRedraw = await sig(t, sel.replace(bid, redrawn.section.blocks.find(b => b.type === type).id));
      if (want) ok(afterRedraw !== before, `${type}.${x.id} at ${width}: a redraw with ${JSON.stringify(v)} changes the block`);
      else eq(afterRedraw, before, `${type}.${x.id} at ${width}: not shown at this width`);
      const audit = await t.page.evaluate(() => [...window.MateriaCartSearch.roots.keys()].flatMap(r => window.MateriaCartSearch.audit(r)));
      eq(audit, [], `${type}.${x.id}: first paint equals the controller's derive after a redraw`);
      if (!isServer(type, x)) {
        /* back to the base, then the same change live: the live look equals the redrawn look */
        await t.redraw({blocks});
        const b2 = t.rendered[0].section.blocks.find(b => b.type === type).id;
        const s2 = sel.replace(bid, b2);
        await t.emit({[x.id]: v}, b2); await frames(t.page);
        const live = await sig(t, s2);
        if (afterRedraw.startsWith('missing')) { ok(await t.page.$eval(s2, el => getComputedStyle(el).display === 'none'), `${type}.${x.id} at ${width}: live edit hides what the server leaves out`); }
        else eq(live, afterRedraw.replace(new RegExp(redrawn.section.blocks.find(b => b.type === type).id, 'g'), b2), `${type}.${x.id} at ${width}: live edit looks like the redraw`);
      }
      eq(t.errors, [], `${type}.${x.id}: no errors`);
      await t.page.close();
    }
  }
}

/* select options pairwise distinct */
async function selectsDistinct(browser) {
  const {schema} = schemaOf('main-cart-items');
  for (const bs of schema.blocks) for (const x of bs.settings.filter(y => y.type === 'select' && !y.hidden)) {
    const width = x.id === 'mobile_layout' ? 375 : 1366, looks = [];
    for (const o of x.options) {
      const base = {...context(bs.type, x.id), ...(ALL_BLOCKS.find(b => b.type === bs.type)?.settings || {}), [x.id]: o.value};
      if (bs.type === 'benefits_pills') Object.assign(base, {pill4_enable: true, pill4_text: 'Fourth pill text', });
      for (let i = 1; i <= 6; i++) if (bs.type === 'benefits_pills') Object.assign(base, {['pill' + i + '_icon_svg']: '<svg viewBox="0 0 10 10"><rect width="3" height="10"/></svg>', ['pill' + i + '_icon_image']: IMG});
      const t = await mount(browser, 'main-cart-items', {width, editing: false, blocks: [{type: bs.type, settings: base}], globals: CART_GLOBALS, assets: ASSETS});
      looks.push(await sig(t, sec('test', `[data-lcs-block="${t.blockId(bs.type)}"]`)));
      await t.page.close();
    }
    eq(new Set(looks).size, looks.length, `${bs.type}.${x.id}: every option looks different (${x.options.length})`);
  }
}

async function cartChecks(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const tag = `cart ${width} ${editing ? 'editor' : 'storefront'}`;
    const t = await mount(browser, 'main-cart-items', {width, editing, blocks: ALL_BLOCKS, globals: CART_GLOBALS, assets: ASSETS});
    const {page} = t;
    eq(await page.evaluate(() => [...window.MateriaCartSearch.roots.keys()].flatMap(r => window.MateriaCartSearch.audit(r))), [], tag + ': first paint equals the controller');
    /* theme first */
    ok(await t.css('.lcs-rating .lcs-star.is-filled', 'color') === 'rgb(255, 255, 255)', tag + ': rating stars follow the scheme heading colour');
    ok(await t.css('.lcs-rating .lcs-text', 'color') === 'rgb(204, 204, 204)', tag + ': rating text follows the scheme text colour');
    ok(await t.css('hr.lcs-divider', 'borderTopColor') === 'rgb(68, 85, 102)', tag + ': divider follows the scheme border colour');
    ok(await t.css('.lcs-guarantee', 'color') === 'rgb(204, 204, 204)', tag + ': guarantee text follows the scheme');
    ok(/Arial/.test(await t.css('.lcs-pill', 'fontFamily')), tag + ': pills use the theme body font');
    ok(/Georgia/.test(await t.css('.cart-faq__heading', 'fontFamily')), tag + ': FAQ heading uses the theme heading font');
    eq(await t.css('.lcs-guarantee__text', 'display') !== 'none', true, tag + ': guarantee shows its default words');
    eq((await page.textContent(sec('test', '.lcs-guarantee__text'))).trim(), 'Secure checkout', tag + ': guarantee default is a plain fact');
    /* custom styling and fonts, live, then off */
    const rid = t.blockId('simple_rating'), pid = t.blockId('benefits_pills');
    await t.emit({enable_custom_style: true, filled_color: '#ff8800', text_color: '#00aa00', enable_custom_fonts: true, font: {family: 'Courier New', fallback_families: 'monospace'}}, rid); await frames(page);
    eq(await t.css('.lcs-rating .lcs-star.is-filled', 'color'), 'rgb(255, 136, 0)', tag + ': custom star colour live');
    eq(await t.css('.lcs-rating .lcs-text', 'color'), 'rgb(0, 170, 0)', tag + ': custom text colour live');
    ok(/Courier New/.test(await t.css('.lcs-rating .lcs-text', 'fontFamily')), tag + ': custom font live');
    await t.emit({custom_style: true, pill_bg: '#112233', pill1_bg_color: '#445566', enable_custom_fonts: true, font: {family: 'Courier New', fallback_families: 'monospace'}}, pid); await frames(page);
    eq(await t.css('.lcs-pill[data-lcs-pill="2"]', 'backgroundColor'), 'rgb(17, 34, 51)', tag + ': pill background live');
    eq(await t.css('.lcs-pill[data-lcs-pill="1"]', 'backgroundColor'), 'rgb(68, 85, 102)', tag + ': one pill\'s own background live');
    ok(/Courier New/.test(await t.css('.lcs-pill', 'fontFamily')), tag + ': pill custom font wins over the theme priority (li)');
    await t.emit({enable_custom_style: false, enable_custom_fonts: false}, rid); await t.emit({custom_style: false, enable_custom_fonts: false}, pid); await frames(page);
    eq(await t.css('.lcs-rating .lcs-star.is-filled', 'color'), 'rgb(255, 255, 255)', tag + ': custom styling off restores the scheme');
    ok(/Arial/.test(await t.css('.lcs-pill', 'fontFamily')), tag + ': custom fonts off restores the theme font');
    /* section settings */
    await t.emit({padding_top: 10, padding_bottom: 90, section_width: 'container'}); await frames(page);
    ok(await page.$eval(sec('test', '#main-cart-items'), el => el.classList.contains('pt-min') && !el.classList.contains('pb-min') && el.style.getPropertyValue('--section-pt').trim() === '10'), tag + ': padding live');
    ok(await page.$eval(sec('test', '[data-lcs-width]'), el => el.classList.contains('container') && !el.classList.contains('fluid_container')), tag + ': section width live');
    await t.emit({color_scheme: 'alt-scheme'}); await frames(page);
    eq(await t.css('#main-cart-items', 'backgroundColor'), 'rgb(250, 250, 250)', tag + ': colour scheme live');
    eq(await t.css('.lcs-rating .lcs-star.is-filled', 'color'), 'rgb(16, 16, 16)', tag + ': blocks follow the new scheme');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    ok(await page.$eval(sec('test', '#main-cart-items'), el => el.classList.contains('color-alt-scheme')), tag + ': colour scheme after redraw');
    await t.redraw({settings: {color_scheme: ''}});
    /* FAQ: one open at a time, keyboard, 44px, one listener after redraws */
    await t.redraw(); await t.redraw();
    eq(await page.evaluate(() => window.MateriaCartSearch.roots.size), 1, tag + ': one root after redraws');
    const q = page.locator(sec('test', '.cart-faq__question')).first();
    await q.click(); await page.waitForTimeout(450);
    eq(await q.getAttribute('aria-expanded'), 'true', tag + ': a question opens with one click after redraws');
    await page.locator(sec('test', '.cart-faq__question')).nth(1).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(450);
    eq([await q.getAttribute('aria-expanded'), await page.locator(sec('test', '.cart-faq__question')).nth(1).getAttribute('aria-expanded')], ['false', 'true'], tag + ': Enter opens the next and closes the first');
    if (width === 375) {
      const h = await q.evaluate(el => el.getBoundingClientRect().height);
      ok(h >= 44, tag + ': question target is at least 44px (' + h + ')');
      ok(await t.noOverflow(), tag + ': no sideways scroll at 375');
    }
    /* no picture reload on an unrelated edit */
    const hid = t.blockId('happy_customers');
    await page.$eval(sec('test', `[data-lcs-block="${hid}"] img`), el => { window.__img = el; window.__src = el.src; });
    await t.emit({heading: 'New words', font_size_mobile: 20, font_size_desktop: 20}, hid); await frames(page);
    ok(await page.$eval(sec('test', `[data-lcs-block="${hid}"] img`), el => el === window.__img && el.src === window.__src), tag + ': avatar not reloaded by an unrelated edit');
    eq(t.errors, [], tag + ': no errors');
    await page.close();
  }
  /* first paint without the controller equals the hydrated paint */
  for (const width of [375, 1366]) {
    const a = await mount(browser, 'main-cart-items', {width, editing: true, blocks: ALL_BLOCKS, globals: CART_GLOBALS, assets: ASSETS.filter(f => f.endsWith('.css'))});
    const b = await mount(browser, 'main-cart-items', {width, editing: true, blocks: ALL_BLOCKS, globals: CART_GLOBALS, assets: ASSETS});
    eq(await sig(b, sec('test', '#main-cart-items')), await sig(a, sec('test', '#main-cart-items')), `cart ${width}: first paint equals hydrated paint`);
    await a.page.close(); await b.page.close();
  }
  /* two instances stay independent */
  const two = await mount(browser, 'main-cart-items', {width: 1366, instances: [{uid: 'a', blocks: ALL_BLOCKS}, {uid: 'b', blocks: ALL_BLOCKS}], globals: CART_GLOBALS, assets: ASSETS});
  const sb = await sig(two, sec('b', '#main-cart-items'));
  await two.emit({enable_custom_style: true, color: '#ff0000', thickness: 6}, two.blockId('divider', 0, 'a'), 'a'); await two.emit({padding_top: 2}, undefined, 'a'); await frames(two.page);
  eq(await two.css('hr.lcs-divider', 'borderTopColor', 'a'), 'rgb(255, 0, 0)', 'two carts: the edited one changes');
  eq(await sig(two, sec('b', '#main-cart-items')), sb, 'two carts: the other one does not');
  await two.page.close();
  /* reduced motion: the FAQ opens without a transition */
  const rm = await mount(browser, 'main-cart-items', {width: 1366, blocks: ALL_BLOCKS, globals: CART_GLOBALS, assets: ASSETS, reducedMotion: 'reduce'});
  await rm.page.locator(sec('test', '.cart-faq__question')).first().click(); await frames(rm.page);
  eq(await rm.page.$eval(sec('test', '.cart-faq__panel'), el => el.style.maxHeight), 'none', 'reduced motion: the answer opens at once');
  await rm.page.close();
  /* the section without blocks keeps drawing the cart; storefront hides empty extra blocks */
  const bare = await mount(browser, 'main-cart-items', {width: 1366, editing: false, blocks: [{type: 'benefits_pills', settings: {pill1_text: '', pill2_text: '', pill3_text: ''}}, {type: 'social_proof_avatars'}, {type: 'happy_customers', settings: {show_stars: false}}], globals: CART_GLOBALS, assets: ASSETS});
  eq(await bare.page.$$eval(sec('test', '.lcs-pills, .lcs-spa'), els => els.map(e => e.hidden)), [true, true], 'storefront: blocks with no words are not drawn');
  eq(await bare.page.$$eval(sec('test', '.lcs-avatar'), els => els.length), 0, 'storefront: no placeholder faces without uploaded avatars');
  await bare.page.close();
}

async function searchChecks(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const tag = `search ${width} ${editing ? 'editor' : 'storefront'}`;
    const t = await mount(browser, 'main-search', {width, editing, globals: SEARCH_GLOBALS(), assets: ASSETS});
    const {page} = t;
    eq(await page.evaluate(() => [...window.MateriaCartSearch.roots.keys()].flatMap(r => window.MateriaCartSearch.audit(r))), [], tag + ': first paint equals the controller');
    eq((await page.textContent(sec('test', 'h1'))).trim(), 'search', tag + ': empty heading falls back to the theme word');
    ok(/Georgia/.test(await t.css('h1', 'fontFamily')), tag + ': heading uses the theme heading font');
    eq(await t.css('h1', 'color'), 'rgb(255, 255, 255)', tag + ': heading follows the scheme');
    await t.emit({heading: 'Find a preset', enable_custom_style: true, heading_color: '#ff8800', text_color: '#00aa00', enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: {family: 'Verdana', fallback_families: 'sans-serif'}}); await frames(page);
    eq((await page.textContent(sec('test', 'h1'))).trim(), 'Find a preset', tag + ': heading words live');
    eq(await t.css('h1', 'color'), 'rgb(255, 136, 0)', tag + ': heading colour live');
    ok(/Courier New/.test(await t.css('h1', 'fontFamily')), tag + ': heading font live, over the theme priority');
    ok(/Verdana/.test(await t.css('.facets-toolbar__count', 'fontFamily')), tag + ': body font on the result count (a p) over the theme priority');
    eq(await t.css('.facets-toolbar__count', 'color'), 'rgb(0, 170, 0)', tag + ': text colour live');
    await t.redraw({settings: {heading: 'Find a preset', enable_custom_style: true, heading_color: '#ff8800', enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}}});
    ok(/Courier New/.test(await t.css('h1', 'fontFamily')) && await t.css('h1', 'color') === 'rgb(255, 136, 0)', tag + ': custom heading after redraw');
    await t.emit({enable_custom_style: false, enable_custom_fonts: false}); await frames(page);
    ok(/Georgia/.test(await t.css('h1', 'fontFamily')) && await t.css('h1', 'color') === 'rgb(255, 255, 255)', tag + ': custom off restores the theme');
    /* grid */
    await t.emit({items_per_row: 3, items_per_row_mobile: 1, column_gap: 12}); await frames(page);
    const cols = await t.css('#product-grid', 'gridTemplateColumns');
    eq(cols.split(' ').length, width >= 1025 ? 3 : width < 768 ? 1 : 3, tag + ': columns live (' + cols + ')');
    await t.emit({number_products_per_page: false, sorting: false}); await frames(page);
    eq([await t.css('.facets-toolbar__count', 'display'), await t.css('.facets-sort', 'display')], ['none', 'none'], tag + ': count and sort hide live');
    await t.emit({color_scheme: 'alt-scheme', padding_top: 50}); await frames(page);
    eq(await t.css('section', 'backgroundColor'), 'rgb(250, 250, 250)', tag + ': colour scheme live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css('section', 'backgroundColor'), 'rgb(250, 250, 250)', tag + ': colour scheme after redraw');
    if (width === 375) ok(await t.noOverflow(), tag + ': no sideways scroll');
    eq(await page.evaluate(() => window.MateriaCartSearch.roots.size), 1, tag + ': one root after redraws');
    eq(t.errors, [], tag + ': no errors');
    await page.close();
  }
  /* no results: suggestion and button, live */
  const e = await mount(browser, 'main-search', {width: 375, globals: SEARCH_GLOBALS([]), assets: ASSETS});
  await e.emit({empty_text: 'Try a shorter word.', empty_link_label: 'See every preset', empty_link_url: '/collections/presets'}); await frames(e.page);
  eq([(await e.page.textContent(sec('test', '.facets-empty__text'))).trim(), (await e.page.textContent(sec('test', '.facets-empty__action'))).trim(), await e.page.getAttribute(sec('test', '.facets-empty__action'), 'href')], ['Try a shorter word.', 'See every preset', '/collections/presets'], 'no results: words and link live');
  await e.emit({empty_link_label: ''}); await frames(e.page);
  eq(await e.css('.facets-empty__action', 'display'), 'none', 'no results: an empty label hides the button');
  ok((await e.page.locator(sec('test', '.facets-empty__action')).evaluate(el => el.getAttribute('data-theme-button'))) === 'secondary', 'no results: the button is on the theme button contract');
  await e.page.close();
  /* two search sections */
  const two = await mount(browser, 'main-search', {width: 1366, instances: [{uid: 'a'}, {uid: 'b'}], globals: SEARCH_GLOBALS(), assets: ASSETS});
  const before = await sig(two, sec('b', 'section'));
  await two.emit({heading: 'Only A', items_per_row: 2}, undefined, 'a'); await frames(two.page);
  eq((await two.page.textContent(sec('a', 'h1'))).trim(), 'Only A', 'two searches: the edited one changes');
  eq(await sig(two, sec('b', 'section')), before, 'two searches: the other one does not');
  await two.page.close();
}

function schemaChecks() {
  for (const n of ['main-cart-items', 'main-search', 'cart-upsell', 'cart-quick-edit', 'products-grid']) eq(schemaProblems(n), [], n + ': schema problems');
  const banned = /\u2014|\bunlock|\belevate|\bseamless|\bpowerful|\beffortless|\bsupercharge|\btransform/i;
  for (const n of ['main-cart-items', 'main-search', 'cart-upsell', 'cart-quick-edit', 'products-grid']) {
    const {schema} = schemaOf(n);
    const all = [schema, ...(schema.settings || []), ...(schema.blocks || []), ...(schema.blocks || []).flatMap(b => b.settings || [])];
    eq(all.filter(x => /^t:/.test(x.label || x.name || x.content || '') || (x.options || []).some(o => /^t:/.test(o.label))).map(x => x.id || x.name), [], n + ': plain labels');
    eq(all.filter(x => typeof x.default === 'string' && banned.test(x.default)).map(x => x.id), [], n + ': plain defaults');
  }
  const {schema} = schemaOf('main-cart-items');
  const defaults = schema.blocks.flatMap(b => b.settings.filter(x => typeof x.default === 'string').map(x => x.default)).join(' ');
  ok(!/\d[\d,.]*\s*(\/\s*5|reviews|customers|K\+)|Texas|Money-Back|\$\d/.test(defaults), 'cart blocks: no invented ratings, counts, prices or places in defaults');
  for (const b of schema.blocks) for (const x of b.settings) if (x.type === 'color' && x.id) ok(/enable_custom_style|custom_style/.test(x.visible_if || ''), `${b.type}.${x.id}: colour hidden until custom styling is on`);
}

(async () => {
  const browser = await launch();
  try {
    if (process.env.LCS_ONLY !== 'blocks') { schemaChecks();
    await savedLooks(browser);
    await cartChecks(browser);
    await searchChecks(browser);
    await selectsDistinct(browser); }
    if (process.env.LCS_QUICK !== '1') for (const w of [375, 1366]) await blockControls(browser, w);
    console.log(`${checks} cart and search page checks passed`);
  } catch (e) { console.error(e); console.log(`failed after ${checks} checks`); process.exitCode = 1; }
  finally { await browser.close(); }
})();
