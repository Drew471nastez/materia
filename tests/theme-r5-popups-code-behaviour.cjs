/* Round 5, Popups and Custom Code: behaviour, run by
   shopify/assets/live-popups-code.js.

   Promotion popup: opens with showModal() after its delay on the chosen
   pages (and phones only when allowed), Escape, the 44px close button and
   the backdrop close it, focus goes to the close button and back, the page
   does not scroll behind it, once per visit, "don't show again" and copying
   the code are remembered, the copy button says Copied; in the builder it
   is drawn in the page (not modal, the page still works), opens on select,
   closes on deselect, Escape and its close button, never on a timer; the
   legacy section settings still draw. Size Chart Popup: the same dialog
   rules, the product's own Storelib size chart first (snippets/
   product-size-chart-content) and the typed rows otherwise, legacy rows,
   a phone-width table that scrolls in its own box. Order notification:
   per-card timers (first delay, shown time, gap), products and buyers from
   the settings only, paused while the tab is hidden, the close button and
   Escape, two cards independent, redraws set up once, reduced motion, the
   builder preview without timers, nothing without products on the live
   site. Custom HTML and Custom code: the creator's code printed and run
   untouched, wrapper edits never touch it, Show on, reveal. The saved Order
   Notification Pro 1 (sections/overlay-group.json) against the section as
   it was (HEAD) at 375 and 1366.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r5-popups-code-behaviour.cjs [promo|size|order|code|saved ...] */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const L = require('./theme-r5-popups-code-lib.cjs');
const {launch, mount, schemaOf, PANTS, OTHER, ok, eq, opts, frames, clone} = L;
const {THEME_VARS} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const wait = (t, ms) => t.page.waitForTimeout(ms);
const sel = (t, s, uid = 'test') => t.page.locator('#shopify-section-' + uid + ' ' + s);
const dlgState = (t, s, uid = 'test') => t.page.evaluate(([q, u]) => { const d = document.querySelector('#shopify-section-' + u + ' ' + q); return {open: d.open, modal: d.open && d.matches(':modal'), position: getComputedStyle(d).position, lock: document.documentElement.classList.contains('pc-lock'), active: document.activeElement && (document.activeElement.getAttribute('class') || document.activeElement.tagName)}; }, [s, uid]);
const fire = (t, type, detail, target) => t.page.evaluate(([type, detail, target]) => (target ? document.querySelector(target) : document).dispatchEvent(new CustomEvent(type, {bubbles: true, detail})), [type, detail, target]);

async function promoStorefront(browser) {
  for (const width of [375, 1366]) {
    const tag = 'promotion-popup @' + width;
    const base = {delay: 0, show_promotion_select: 'show_promotion_all_page', show_promotion_mobile: true};
    let t = await mount(browser, 'promotion-popup', {...opts('promotion-popup'), width, editing: false, settings: base});
    ok(!/data-pp-dialog open/.test(t.rendered[0].html), tag + ' closed in the first paint');
    await wait(t, 250);
    let s = await dlgState(t, '[data-pp-dialog]');
    ok(s.open && s.modal, tag + ' opens as a modal dialog after its delay');
    ok(s.lock, tag + ' the page does not scroll behind it');
    ok(/pp__close/.test(s.active), tag + ' focus on the close button (' + s.active + ')');
    const close = await sel(t, '.pp__close').boundingBox();
    ok(close.width >= 44 && close.height >= 44, tag + ' close button 44px');
    const card = await sel(t, '.pp__card').boundingBox();
    ok(card.x >= 0 && card.x + card.width <= width && card.height <= 900, tag + ' card fits the screen');
    ok(await t.noOverflow(), tag + ' no sideways scroll while open');
    await t.page.keyboard.press('Escape'); await wait(t, 60);
    s = await dlgState(t, '[data-pp-dialog]');
    ok(!s.open && !s.lock, tag + ' Escape closes it and frees the page');
    /* once per visit: a redraw (or another page) does not open it again */
    await t.redraw({settings: base}); await wait(t, 250);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' once per visit');
    await t.page.close();

    t = await mount(browser, 'promotion-popup', {...opts('promotion-popup'), width, editing: false, settings: base});
    await wait(t, 250);
    await sel(t, '.pp__close').click(); await wait(t, 60);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' close button closes it');
    await t.page.evaluate(() => sessionStorage.clear());
    await t.redraw({settings: base}); await wait(t, 250);
    ok((await dlgState(t, '[data-pp-dialog]')).open, tag + ' opens again in a new visit');
    await t.page.mouse.click(3, 3); await wait(t, 60);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' a click on the backdrop closes it');
    await t.page.evaluate(() => sessionStorage.clear());
    await t.redraw({settings: base}); await wait(t, 250);
    /* copy the code */
    await sel(t, '.pp__code').click(); await wait(t, 80);
    ok(await sel(t, '.pp__code').evaluate(el => el.hasAttribute('data-copied')), tag + ' copy shows Copied');
    eq((await sel(t, '[data-pp-status]').textContent()).trim(), 'Copied', tag + ' copy is announced');
    const until = +await t.page.evaluate(() => localStorage.getItem('materia:pp:test'));
    ok(until > Date.now() + 864e5 * 0.9, tag + ' a copied code is remembered for Ask again after');
    await t.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await t.redraw({settings: {...base, hide_days: 3}}); await wait(t, 250);
    await sel(t, '.pp__dismiss').click(); await wait(t, 60);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + " don't show again closes it");
    const until3 = +await t.page.evaluate(() => localStorage.getItem('materia:pp:test'));
    ok(until3 > Date.now() + 864e5 * 2.9, tag + " don't show again lasts Ask again after days");
    await t.page.evaluate(() => sessionStorage.clear());
    await t.redraw({settings: base}); await wait(t, 250);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' a dismissed popup stays closed');
    await t.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await t.redraw({settings: {...base, show_promotion_select: 'hide_promotion'}}); await wait(t, 250);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' Show on: Nowhere');
    await t.redraw({settings: {...base, show_promotion_select: 'show_promotion_homepage'}}); await wait(t, 250);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' Show on: Home page, not on another page');
    await t.redraw({settings: {...base, show_promotion_mobile: false}}); await wait(t, 250);
    eq((await dlgState(t, '[data-pp-dialog]')).open, width >= 768, tag + ' Show on phones off keeps it closed on a phone only');
    await t.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await t.redraw({settings: {...base, delay: 1}}); await wait(t, 300);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' waits for Open after');
    await wait(t, 900);
    ok((await dlgState(t, '[data-pp-dialog]')).open, tag + ' opens after Open after');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
    t = await mount(browser, 'promotion-popup', {...opts('promotion-popup'), width, editing: false, settings: {...base, show_promotion_select: 'show_promotion_homepage'}, globals: {request: {design_mode: false, page_type: 'index'}}});
    await wait(t, 250);
    ok((await dlgState(t, '[data-pp-dialog]')).open, tag + ' Show on: Home page opens on the home page');
    await t.page.close();
    t = await mount(browser, 'promotion-popup', {...opts('promotion-popup'), width, editing: false, settings: base, reducedMotion: 'reduce'});
    await wait(t, 250);
    eq(await sel(t, '[data-pp-dialog]').evaluate(el => getComputedStyle(el).animationName), 'none', tag + ' no entrance under reduced motion');
    await t.page.close();
  }
}

async function promoEditor(browser) {
  for (const width of [375, 1366]) {
    const tag = 'promotion-popup editor @' + width;
    const t = await mount(browser, 'promotion-popup', {...opts('promotion-popup'), width, editing: true, settings: {delay: 0, show_promotion_select: 'show_promotion_all_page'}});
    await t.page.evaluate(() => { const b = document.createElement('button'); b.id = 'outside'; b.textContent = 'Outside'; b.onclick = () => { window.__outside = 1; }; document.body.prepend(b); });
    let s = await dlgState(t, '[data-pp-dialog]');
    ok(s.open && !s.modal && s.position === 'relative' && !s.lock, tag + ' preview drawn in the page, not modal');
    await t.page.click('#outside');
    ok(await t.page.evaluate(() => window.__outside === 1), tag + ' the page still works under the preview');
    await sel(t, '.pp__close').click(); await wait(t, 40);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' close button closes the preview');
    await fire(t, 'shopify:section:select', {sectionId: 'test'}); await wait(t, 40);
    ok((await dlgState(t, '[data-pp-dialog]')).open, tag + ' selecting the section shows it');
    await t.page.keyboard.press('Escape'); await wait(t, 40);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' Escape closes the preview');
    await t.redraw({settings: {editor_preview: false}});
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' Show in the builder off: closed');
    await wait(t, 250);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' no timer in the builder');
    await fire(t, 'shopify:block:select', {sectionId: 'test', blockId: t.blockId('heading')}, '[data-pc-block="' + t.blockId('heading') + '"]'); await wait(t, 40);
    s = await dlgState(t, '[data-pp-dialog]');
    ok(s.open && !s.modal, tag + ' selecting a block shows it in the page');
    await fire(t, 'shopify:section:deselect', {sectionId: 'test'}); await wait(t, 40);
    eq((await dlgState(t, '[data-pp-dialog]')).open, false, tag + ' deselect closes it');
    await t.emit({text: 'Live words'}, t.blockId('heading')); await frames(t.page);
    ok((await dlgState(t, '[data-pp-dialog]')).open, tag + ' an edit shows it');
    eq((await sel(t, '.pp__heading').textContent()).trim(), 'Live words', tag + ' heading live');
    /* an empty code: a note in the builder, nothing on the live site */
    await t.emit({code: ''}, t.blockId('coupon')); await frames(t.page);
    ok(/Add a code/.test(await sel(t, '.pp__coupon').textContent()), tag + ' empty code: builder note');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
  /* legacy: a section saved before the blocks keeps its words */
  const legacy = {promotion_sub_title: 'Old sub', promotion_title: 'Old <br/> title', promotion_content: 'Up to <span>half</span> with [promotion_code]', promotion_code: 'OLD5'};
  for (const editing of [true, false]) {
    const t = await mount(browser, 'promotion-popup', {width: 1366, editing, blocks: [], settings: legacy, assets: [L.ASSET]});
    await t.page.evaluate(() => { const d = document.querySelector('[data-pp-dialog]'); if (!d.open) d.show(); });
    eq((await sel(t, '[data-pc-legacy="promotion_sub_title"]').textContent()).trim(), 'Old sub', 'legacy subheading');
    eq((await sel(t, 'h2.pp__heading').innerText()).replace(/\s+/g, ' ').trim(), 'Old title', 'legacy heading');
    eq((await sel(t, '[data-pc-legacy="promotion_content"]').textContent()).trim(), 'Up to half with OLD5', 'legacy content with the code');
    eq(await sel(t, '[data-pc-legacy="promotion_code"] [data-pp-copy]').getAttribute('data-code'), 'OLD5', 'legacy code button');
    ok(await sel(t, '[data-pc-legacy="dismiss"]').count() === 1, 'legacy dismiss link');
    eq(await L.audit(t), [], 'legacy markup matches controller');
    eq(t.errors, [], 'legacy errors');
    await t.page.close();
  }
  const t = await mount(browser, 'promotion-popup', {...opts('promotion-popup'), width: 1366, editing: true, settings: legacy});
  eq(await sel(t, '[data-pc-legacy]').count(), 0, 'blocks win over the legacy settings');
  await t.page.close();
  const {schema} = schemaOf('promotion-popup');
  for (const id of ['promotion_sub_title', 'promotion_title', 'promotion_content', 'promotion_code']) eq(schema.settings.find(x => x.id === id).hidden, true, 'legacy ' + id + ' hidden');
  const defaults = JSON.stringify(schema.blocks.map(b => b.settings.map(x => x.default)));
  ok(!/\d+\s*%|\$\d|off\b/i.test(defaults), 'no invented discount in the block defaults');
}

const CHART = {name: 'Tops', unit: 'cm', columns: [{name: 'Size'}, {name: 'Chest', measure: true}], rows: [['S', '86'], ['M', '92']]};
async function sizeChart(browser) {
  for (const width of [375, 1366]) {
    const tag = 'size-chart-popup @' + width;
    let t = await mount(browser, 'size-chart-popup', {...opts('size-chart-popup'), width, editing: false});
    const trig = sel(t, '.scs__trigger');
    let b = await trig.boundingBox();
    ok(b.height >= 44, tag + ' trigger 44px tall');
    eq(await trig.getAttribute('aria-expanded'), 'false', tag + ' trigger collapsed');
    await trig.click(); await wait(t, 80);
    let s = await dlgState(t, '[data-scs-dialog]');
    ok(s.open && s.modal && s.lock, tag + ' trigger opens a modal dialog');
    ok(/scs__close/.test(s.active), tag + ' focus on the close button');
    eq(await trig.getAttribute('aria-expanded'), 'true', tag + ' trigger expanded');
    b = await sel(t, '.scs__close').boundingBox();
    ok(b.width >= 44 && b.height >= 44, tag + ' close button 44px');
    eq(await sel(t, '.scs__table tbody tr').count(), 4, tag + ' four rows from the Row blocks');
    eq(await sel(t, '.scs__table thead th').count(), 4, tag + ' four column headers');
    ok(await t.noOverflow(), tag + ' no sideways page scroll');
    const wrap = await sel(t, '.scs__table-wrap').evaluate(el => ({w: el.getBoundingClientRect().width, overflow: getComputedStyle(el).overflowX}));
    ok(wrap.w <= width - 32 + 1 && wrap.overflow === 'auto', tag + ' the table scrolls in its own box');
    await t.page.keyboard.press('Escape'); await wait(t, 60);
    s = await dlgState(t, '[data-scs-dialog]');
    ok(!s.open && !s.lock, tag + ' Escape closes it');
    ok(/scs__trigger/.test(s.active), tag + ' focus back on the trigger');
    eq(await trig.getAttribute('aria-expanded'), 'false', tag + ' trigger collapsed again');
    await trig.click(); await wait(t, 60); await sel(t, '.scs__close').click(); await wait(t, 60);
    eq((await dlgState(t, '[data-scs-dialog]')).open, false, tag + ' close button closes it');
    await trig.click(); await wait(t, 60); await t.page.mouse.click(2, 2); await wait(t, 60);
    eq((await dlgState(t, '[data-scs-dialog]')).open, false, tag + ' backdrop click closes it');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
    /* the product's own size chart from Storelib comes first */
    const product = {...PANTS, metafields: {storelib: {size_chart: CHART}}};
    t = await mount(browser, 'size-chart-popup', {...opts('size-chart-popup'), width, editing: false, globals: {product}});
    await sel(t, '.scs__trigger').click(); await wait(t, 80);
    ok(await sel(t, '[data-scs-product-chart] .mt-size-chart table').count() === 1, tag + " the product's Storelib chart is shown");
    ok(/Tops/.test(await sel(t, '[data-scs-product-chart]').textContent()) && /92/.test(await sel(t, '[data-scs-product-chart]').textContent()), tag + ' with its own name and rows');
    eq(await sel(t, '.scs__table').count(), 0, tag + ' the typed rows wait');
    ok(await t.noOverflow(), tag + ' product chart: no sideways scroll');
    await t.page.keyboard.press('Escape');
    await t.redraw({settings: {use_product_chart: false}});
    await sel(t, '.scs__trigger').click(); await wait(t, 80);
    eq(await sel(t, '.scs__table tbody tr').count(), 4, tag + " Use the product's size chart off: the typed rows");
    eq(t.errors, [], tag + ' product chart errors');
    await t.page.close();
  }
  /* the builder: open in the page on select and on edits to the dialog */
  const t = await mount(browser, 'size-chart-popup', {...opts('size-chart-popup'), width: 1366, editing: true});
  eq((await dlgState(t, '[data-scs-dialog]')).open, false, 'size chart editor: closed at first');
  await t.emit({trig_text: 'Sizes'}); await frames(t.page);
  eq((await dlgState(t, '[data-scs-dialog]')).open, false, 'size chart editor: a trigger edit leaves it closed');
  eq((await sel(t, '.scs__label').textContent()).trim(), 'Sizes', 'size chart editor: trigger text live');
  await fire(t, 'shopify:section:select', {sectionId: 'test'}); await wait(t, 40);
  let s = await dlgState(t, '[data-scs-dialog]');
  ok(s.open && !s.modal && s.position === 'relative' && !s.lock, 'size chart editor: select opens it in the page');
  await t.page.keyboard.press('Escape'); await wait(t, 40);
  eq((await dlgState(t, '[data-scs-dialog]')).open, false, 'size chart editor: Escape closes it');
  await t.emit({cells: 'XS|30|24|30'}, t.blockId('row')); await frames(t.page);
  ok((await dlgState(t, '[data-scs-dialog]')).open, 'size chart editor: a row edit opens it');
  eq((await sel(t, '[data-pc-block="' + t.blockId('row') + '"] th').textContent()), 'XS', 'size chart editor: row live');
  await fire(t, 'shopify:section:deselect', {sectionId: 'test'}); await wait(t, 40);
  eq((await dlgState(t, '[data-scs-dialog]')).open, false, 'size chart editor: deselect closes it');
  eq(t.errors, [], 'size chart editor errors');
  await t.page.close();
  /* saved before rows were blocks */
  const old = await mount(browser, 'size-chart-popup', {width: 1366, editing: false, blocks: [], assets: [L.ASSET]});
  await sel(old, '.scs__trigger').click(); await wait(old, 60);
  eq(await sel(old, '[data-pc-legacy^="row_"]').count(), 4, 'legacy rows drawn');
  ok(/inches/.test(await sel(old, '[data-pc-legacy="notes"]').textContent()), 'legacy notes drawn');
  await old.page.close();
  const rm = await mount(browser, 'size-chart-popup', {...opts('size-chart-popup'), width: 1366, editing: false, reducedMotion: 'reduce'});
  await sel(rm, '.scs__trigger').click(); await wait(rm, 60);
  eq(await sel(rm, '[data-scs-dialog]').evaluate(el => getComputedStyle(el).animationName), 'none', 'size chart: no entrance under reduced motion');
  await rm.page.close();
}

const foBlocks = (anim = {}, prod = {}) => L.presetBlocks('fake-order').map(b => b.type === 'animation' ? {...b, settings: {...(b.settings || {}), delay_time: '500', animation_duration: 400, show_gap_seconds: 1, ...anim}} : b.type === 'products' ? {...b, settings: {...b.settings, fake_user: 'Ada | Ben', ...prod}} : b);
const foState = (t, uid = 'test') => t.page.evaluate(u => { const r = document.querySelector('#shopify-section-' + u + ' [data-pc-root]'); return r ? {state: r.dataset.foState, display: getComputedStyle(r).display, title: r.querySelector('[data-title-fake]').textContent.trim(), user: r.querySelector('[data-user]').textContent.trim(), time: r.querySelector('[data-time]').textContent.trim(), href: r.querySelector('[data-title-fake]').getAttribute('href'), anim: getComputedStyle(r).animationName} : null; }, uid);
async function fakeOrder(browser) {
  const {schema} = schemaOf('fake-order');
  const all = JSON.stringify(schema);
  ok(!/\((USA|UK|Canada|Italy|France|Germany)\)/.test(all), 'no invented buyers or countries in the schema defaults');
  eq(schema.blocks.find(b => b.type === 'products').settings.find(x => x.id === 'fake_user').default, '', 'Buyers is empty by default');
  for (const width of [375, 1366]) {
    const tag = 'fake-order @' + width;
    let t = await mount(browser, 'fake-order', {width, editing: false, blocks: foBlocks(), assets: [L.ASSET]});
    let s = await foState(t);
    eq([s.state, s.display], ['hidden', 'none'], tag + ' hidden at first');
    await wait(t, 450);
    s = await foState(t);
    eq([s.state, s.display], ['shown', 'block'], tag + ' shown after First one after');
    ok(['Pants Down', 'Other Tee'].includes(s.title), tag + ' a real product title (' + s.title + ')');
    ok(['/products/pants-down', '/products/other-tee'].includes(s.href), tag + ' its real link');
    ok(['Ada', 'Ben'].includes(s.user), tag + ' a buyer the creator typed (' + s.user + ')');
    ok(/^\d+$/.test(s.time), tag + ' minutes');
    ok(s.anim !== 'none', tag + ' animates');
    ok((await sel(t, '.fake-order-close').boundingBox()).width >= 44, tag + ' close 44px');
    ok(await t.noOverflow(), tag + ' no sideways scroll');
    const box = await sel(t, '[data-pc-root]').boundingBox();
    ok(box.x >= 0 && box.x + box.width <= width, tag + ' card inside the screen');
    await wait(t, 450);
    eq((await foState(t)).state, 'hidden', tag + ' hidden after Each shows for');
    await wait(t, 1100);
    eq((await foState(t)).state, 'shown', tag + ' shown again after Gap between');
    /* tab hidden: the timers stop */
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
    eq((await foState(t)).state, 'hidden', tag + ' hidden with the tab');
    ok(await t.page.evaluate(() => [...window.MateriaPopupsCode.roots.values()][0].timer === 0), tag + ' no timer while the tab is hidden');
    await wait(t, 1300);
    eq((await foState(t)).state, 'hidden', tag + ' stays hidden while the tab is hidden');
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); });
    await wait(t, 1150);
    eq((await foState(t)).state, 'shown', tag + ' resumes with the tab');
    await sel(t, '.fake-order-close').click();
    eq((await foState(t)).state, 'hidden', tag + ' close button hides it');
    await wait(t, 1600);
    eq((await foState(t)).state, 'hidden', tag + ' and it stays closed');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
    /* two cards: closing one leaves the other running; Escape closes */
    t = await mount(browser, 'fake-order', {width, editing: false, assets: [L.ASSET], instances: [{uid: 'a', blocks: foBlocks()}, {uid: 'b', blocks: foBlocks({delay_time: '550'}).map(x => x.type === 'layout' ? {...x, settings: {...(x.settings || {}), position: 'right'}} : x)}]});
    await wait(t, 600);
    eq([(await foState(t, 'a')).state, (await foState(t, 'b')).state], ['shown', 'shown'], tag + ' both cards run');
    await sel(t, '.fake-order-close', 'a').evaluate(el => el.click());
    await wait(t, 1700);
    eq((await foState(t, 'a')).state, 'hidden', tag + ' closed card a stays closed');
    ok(['shown', 'hidden'].includes((await foState(t, 'b')).state), tag + ' card b keeps its own timer');
    let seenB = 0; for (let i = 0; i < 16 && !seenB; i++) { await wait(t, 100); if ((await foState(t, 'b')).state === 'shown') seenB = 1; }
    ok(seenB, tag + ' card b still shows');
    await t.page.keyboard.press('Escape');
    eq((await foState(t, 'b')).state, 'hidden', tag + ' Escape closes a card');
    /* redraws: one root per card, set up once, at the same pace */
    const c0 = await t.page.evaluate(() => [...window.MateriaPopupsCode.roots.values()].map(s => s.cleanup.length).join());
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a', blocks: foBlocks({delay_time: '100', animation_duration: 300, show_gap_seconds: 2})});
    eq(await t.page.evaluate(() => window.MateriaPopupsCode.roots.size), 2, tag + ' one root per card after redraws');
    eq(await t.page.evaluate(() => [...window.MateriaPopupsCode.roots.values()].map(s => s.cleanup.length).join()), c0, tag + ' redraws add no listeners');
    let shows = 0, last = '';
    for (let i = 0; i < 26; i++) { const st = (await foState(t, 'a')).state; if (st === 'shown' && last !== 'shown') shows++; last = st; await wait(t, 50); }
    ok(shows <= 1, tag + ' a redrawn card runs one timer, not three (' + shows + ' shows in 1.3s)');
    eq(t.errors, [], tag + ' two cards errors');
    await t.page.close();
    /* reduced motion: shown, not moving */
    t = await mount(browser, 'fake-order', {width, editing: false, blocks: foBlocks(), assets: [L.ASSET], reducedMotion: 'reduce'});
    await wait(t, 500);
    s = await foState(t);
    eq([s.state, s.anim], ['shown', 'none'], tag + ' reduced motion: shown without moving');
    eq(await sel(t, '[data-progressbar]').evaluate(el => getComputedStyle(el).animationName), 'none', tag + ' reduced motion: the bar does not run');
    await t.page.close();
    /* no buyers typed: the fallback words, never a made-up name */
    t = await mount(browser, 'fake-order', {width, editing: false, blocks: foBlocks({}, {fake_user: ''}), assets: [L.ASSET]});
    await wait(t, 500);
    eq((await foState(t)).user, 'Someone', tag + ' no buyers typed: Someone');
    await t.page.close();
  }
  /* no products: nothing on the live site, a tidy card in the builder */
  const none = foBlocks().map(b => b.type === 'products' ? {...b, settings: {...b.settings, fake_product: []}} : b);
  let t = await mount(browser, 'fake-order', {width: 1366, editing: false, blocks: none, assets: [L.ASSET]});
  eq(await t.page.locator('[data-pc-root]').count(), 0, 'fake-order: no products, nothing on the live site');
  await t.page.close();
  t = await mount(browser, 'fake-order', {width: 1366, editing: true, blocks: none, assets: [L.ASSET]});
  ok(await t.page.locator('[data-pc-root] .fake-order-image svg').count() === 1, 'fake-order editor: placeholder picture');
  ok(/Pick products/.test(await t.page.locator('[data-title-fake]').textContent()), 'fake-order editor: says what to do');
  await t.page.close();
  for (const editing of [true, false]) {
    t = await mount(browser, 'fake-order', {width: 1366, editing, settings: {section_enabled: false}, blocks: foBlocks(), assets: [L.ASSET]});
    eq(await t.page.locator('[data-pc-root]').count(), 0, 'fake-order: Show notifications off draws nothing (' + (editing ? 'editor' : 'storefront') + ')');
    await t.page.close();
  }
  /* the builder: shown without timers, close, select, deselect */
  t = await mount(browser, 'fake-order', {width: 1366, editing: true, blocks: foBlocks(), assets: [L.ASSET]});
  eq((await foState(t)).state, 'shown', 'fake-order editor: shown while editing');
  await wait(t, 900);
  eq((await foState(t)).state, 'shown', 'fake-order editor: no timer hides it');
  eq((await foState(t)).user, 'Ada', 'fake-order editor: the first buyer typed');
  await sel(t, '.fake-order-close').click();
  eq((await foState(t)).state, 'hidden', 'fake-order editor: close hides it');
  await fire(t, 'shopify:block:select', {sectionId: 'test', blockId: t.blockId('text')}, '[data-pc-block="' + t.blockId('text') + '"]');
  eq((await foState(t)).state, 'shown', 'fake-order editor: selecting a block shows it');
  await fire(t, 'shopify:section:deselect', {sectionId: 'test'});
  eq((await foState(t)).state, 'hidden', 'fake-order editor: deselect hides it');
  await t.emit({fake_user: 'Cleo | Dan'}, t.blockId('products')); await frames(t.page);
  eq([(await foState(t)).state, (await foState(t)).user], ['shown', 'Cleo'], 'fake-order editor: an edit shows it with the new buyers');
  eq(t.errors, [], 'fake-order editor errors');
  await t.page.close();
}

async function customCode(browser) {
  const CODE = '<div id="mine" class="mine" style="color: rgb(1, 2, 3); padding: 7px">Mine <b>bold</b></div><script>window.__ran = (window.__ran || 0) + 1;</script>';
  for (const [name, key] of [['custom-html', 'html_custom'], ['custom-liquid', 'custom_liquid']]) {
    for (const width of [375, 1366]) {
      const tag = name + ' @' + width;
      const t = await mount(browser, name, {width, editing: true, settings: {[key]: CODE}, assets: [L.ASSET]});
      /* the fixture lifts inline scripts out of the markup to run them; everything else is the markup as rendered */
      ok(t.rendered[0].html.includes(CODE.split('<script>')[0]) && t.rendered[0].scripts.includes('window.__ran = (window.__ran || 0) + 1;'), tag + ': the code is printed exactly as typed');
      eq(await t.page.evaluate(() => window.__ran), 1, tag + ': its script ran once');
      eq(await t.page.locator('#mine').evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).paddingTop]), ['rgb(1, 2, 3)', '7px'], tag + ': its own styles kept');
      await t.page.evaluate(() => { document.getElementById('mine').__mark = 1; });
      await t.emit({padding_top: 60, padding_bottom: 12, section_width: 'full_width', color_scheme: 'alt-scheme', show_section_on: 'all', reset_spacing: false, section_margin_top_mobile: 8, section_margin_top_desktop: 8}); await frames(t.page);
      ok(await t.page.evaluate(() => document.getElementById('mine').__mark === 1), tag + ': wrapper edits never replace the code');
      eq(await t.page.evaluate(() => window.__ran), 1, tag + ': wrapper edits never run its script again');
      eq(await t.css('[data-pc-root]', 'backgroundColor'), 'rgb(250, 250, 250)', tag + ': the wrapper takes the scheme');
      const pt = parseFloat(await t.css('[data-pc-root]', 'paddingTop'));
      ok(pt >= 45 && pt <= 60 && (width < 600 ? pt === 45 : pt > 50), tag + ': padding top live (the theme scales it between 75% and 100%: ' + pt + ')');
      await t.emit({show_section_on: width < 768 ? 'desktop' : 'mobile'}); await frames(t.page);
      eq(await t.css('[data-pc-root]', 'display'), 'none', tag + ': Show on hides it at the other width');
      await t.emit({show_section_on: width < 768 ? 'mobile' : 'desktop'}); await frames(t.page);
      eq(await t.css('[data-pc-root]', 'display'), 'block', tag + ': Show on shows it at its width');
      eq(t.errors, [], tag + ' errors');
      await t.page.close();
    }
    /* empty: nothing on the live site, a note in the builder */
    let t = await mount(browser, name, {width: 1366, editing: false, settings: {[key]: ''}, assets: [L.ASSET]});
    eq(await t.page.locator('[data-pc-root]').count(), 0, name + ': empty code draws nothing on the live site');
    await t.page.close();
    t = await mount(browser, name, {width: 1366, editing: true, settings: {[key]: ''}, assets: [L.ASSET]});
    ok(/Only you see this note/.test(await t.page.locator('.pc-code__empty').textContent()), name + ': empty code shows a builder note');
    await t.page.close();
    /* reveal on scroll follows Theme settings > Animations */
    t = await mount(browser, name, {width: 1366, editing: false, settings: {[key]: CODE}, theme: {scroll_animation: 'fade_in'}, assets: [L.ASSET]});
    ok(await t.page.evaluate(() => document.getElementById('shopify-section-test').classList.contains('scroll-trigger')), name + ': reveal uses the theme animation');
    await t.page.close();
    t = await mount(browser, name, {width: 1366, editing: false, settings: {[key]: CODE, reveal: false}, theme: {scroll_animation: 'fade_in'}, assets: [L.ASSET]});
    ok(await t.page.evaluate(() => !document.getElementById('shopify-section-test').classList.contains('scroll-trigger')), name + ': Reveal on scroll off');
    await t.page.close();
  }
}

/* The saved Order Notification Pro 1 against the section as it was. */
async function savedFakeOrder(browser) {
  let oldRaw;
  /* the newest committed version from before this change (round 5 may already be committed as work in progress) */
  const git = cmd => execSync(cmd, {cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
  try {
    for (const sha of git('git log --format=%H -- sections/fake-order.storelib').split('\n').filter(Boolean)) { const raw = git('git show ' + sha + ':sections/fake-order.storelib'); if (!raw.includes('data-pc-root')) { oldRaw = raw; break; } }
  } catch (_) { /* no history */ }
  if (!oldRaw) { console.log('saved: no earlier version in git, comparison skipped'); return; }
  const newRaw = fs.readFileSync(path.join(__dirname, '../sections/fake-order.storelib'), 'utf8');
  const group = JSON.parse(fs.readFileSync(path.join(__dirname, '../sections/overlay-group.json'), 'utf8'));
  const saved = group.sections.order_notification_pro_1;
  /* the toggles the lead sets in overlay-group.json so the saved colours keep applying */
  const toggles = sec => { const s = clone(sec); for (const b of Object.values(s.blocks)) if (['text', 'background', 'colors'].includes(b.type)) b.settings.enable_custom_style = true; return s; };
  const renderRaw = async (raw, sec) => {
    const schema = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify;
    const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v || '');
    const def = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
    const section = {id: 'S', settings: {...def(schema.settings), ...sec.settings}, blocks: sec.block_order.map(k => ({id: k, type: sec.blocks[k].type, settings: {...def((schema.blocks.find(b => b.type === sec.blocks[k].type) || {}).settings), ...sec.blocks[k].settings, ...(sec.blocks[k].type === 'products' ? {fake_product: [PANTS]} : {})}}))};
    const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}};
    const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
    return (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, '');
  };
  const SELS = ['.fake-order', '.fake-order-close path', '.fake-order-image img', '.product-fake-order', '.fake-order-image', '.fake-list', '.user-purchase', '.product-order-title a', '.minutes-ago', '.text-verify', '.verify-arrow', '.fake-order-progressbar'];
  const PROPS = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'borderTopWidth', 'marginTop', 'marginBottom', 'width', 'height', 'boxShadow', 'textAlign', 'textDecorationLine', 'left', 'right', 'bottom', 'filter', 'fill', 'stroke'];
  /* the progress track follows the card's text colour now (12% of it: #e2e2e2 on the saved white card, was #e0e0e0) */
  const LOOSE = {'.fake-order-progressbar': ['backgroundColor'], '.fake-order-close path': ['color']};
  const round = v => typeof v === 'string' ? v.replace(/(\d+\.\d+)px/g, (m, n) => Math.round(+n * 4) / 4 + 'px') : v;
  for (const width of [375, 1366]) {
    const look = async (html, old) => {
      const page = await browser.newPage({viewport: {width, height: 900}});
      const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      await page.route('**/*', r => r.request().url() === 'http://theme.test/' ? r.fulfill({body: '<!doctype html><html><head></head><body></body></html>', contentType: 'text/html'}) : /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(r.request().url()) ? r.fulfill({body: PNG, contentType: 'image/png'}) : r.fulfill({body: ''}));
      await page.goto('http://theme.test/');
      await page.addStyleTag({content: THEME_VARS});
      for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css']) await page.addStyleTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8')});
      await page.addStyleTag({content: '*{animation:none!important;transition:none!important}'});
      await page.evaluate(([h, old]) => {
        const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w);
        const r = w.querySelector('.fake-order'); if (old) r.style.display = 'block'; else r.dataset.foState = 'shown';
        /* the random parts: the same words in both */
        r.querySelector('[data-user]').textContent = 'Liam (USA)'; r.querySelector('[data-time]').textContent = '12'; r.querySelector('[data-title-fake]').textContent = 'Pants Down';
        const img = r.querySelector('[data-img]'); if (img) img.src = '/img/black.svg';
      }, [html, old]);
      await page.waitForTimeout(150);
      const out = await page.evaluate(({SELS, PROPS}) => Object.fromEntries(SELS.map(s => { const e = document.querySelector('#shopify-section-S ' + s); if (!e) return [s, 'missing']; const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return [s, [...PROPS.map(p => cs[p]), [b.x, b.y, b.width, b.height].map(Math.round).join(','), (e.innerText ?? e.textContent).trim().replace(/\s+/g, ' ').slice(0, 60)]]; })), {SELS, PROPS});
      await page.close();
      return out;
    };
    const was = await look(await renderRaw(oldRaw, saved), true), now = await look(await renderRaw(newRaw, toggles(saved)), false);
    for (const s of SELS) {
      const a = was[s], b = now[s];
      if (a === 'missing') continue;
      const d = PROPS.concat(['rect', 'text']).map((p, i) => [p, a[i], b[i]]).filter(([p, x, y]) => round(x) !== round(y) && !(LOOSE[s] || []).includes(p));
      eq(d, [], 'saved Order Notification Pro 1 @' + width + ' ' + s + ' looks as before');
    }
  }
}

(async () => {
  const browser = await launch();
  try {
    const only = process.argv.slice(2), run = n => !only.length || only.includes(n);
    if (run('promo')) { await promoStorefront(browser); console.log('promotion popup storefront', L.count()); }
    if (run('promo')) { await promoEditor(browser); console.log('promotion popup builder', L.count()); }
    if (run('size')) { await sizeChart(browser); console.log('size chart', L.count()); }
    if (run('order')) { await fakeOrder(browser); console.log('order notification', L.count()); }
    if (run('code')) { await customCode(browser); console.log('custom code', L.count()); }
    if (run('saved')) { await savedFakeOrder(browser); console.log('saved', L.count()); }
  } finally { await browser.close(); }
  console.log('theme-r5-popups-code-behaviour: ' + L.count() + ' checks passed');
})().catch(e => { console.error(e); process.exit(1); });
