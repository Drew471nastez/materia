/* Round 6, Breadcrumbs (sections/breadcrumb.storelib), drawn on product pages
   (templates/product.json) with the real theme priority rules and
   shopify/assets/live-collection-pages.js.

   1. Schema: every id at c098384 kept, the shared group order, plain labels.
   2. Every visible setting at 375 and 1366: a redraw looks different, the
      same change sent live looks like the redraw, the old value restores it.
   3. Theme first: the scheme's colours and the theme body font; custom colours
      only while Enable custom styling is on; a custom font wins over the
      theme's "Use in every section" rule (data-own-font) and off restores it.
   4. 44px tap targets at 375 (the trail links and the product arrows), a
      visible focus ring, no sideways scroll.
   5. First paint equals the hydrated paint; two instances stay independent.
   6. The saved instance in templates/product.json looks as it did.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-collection-pages-breadcrumb.cjs */
const L = require('./theme-r6-collection-pages-lib.cjs');
const {PANTS, OTHER, TALL} = require('./media-fixture.cjs');
const {ok, eq, frames, settle, counter} = L;
const NAME = 'breadcrumb';
const COLL = {title: 'Pants & Jeans', handle: 'pants', url: '/collections/pants', products: [OTHER, PANTS, TALL], products_count: 3};
const G = {template: 'product', product: PANTS, collection: COLL, collections: {all: COLL}};
const BASE = {next_prev: true};

const sig = page => page.evaluate(() => {
  const nav = document.querySelector('#shopify-section-test nav.bc');
  if (!nav) return null;
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const item = nav.querySelectorAll('.bc__item')[1], btn = nav.querySelector('.bc__btn');
  return {
    cls: [...nav.classList].sort().join(' '), inner: nav.firstElementChild.className,
    nav: cs(nav, ['backgroundColor', 'paddingTop', 'paddingBottom', 'fontFamily', 'fontSize', 'textTransform', 'letterSpacing']),
    trail: cs(nav.querySelector('.bc__trail'), ['justifyContent']),
    link: cs(nav.querySelector('.bc__link'), ['color', 'fontFamily']), current: cs(nav.querySelector('.bc__current'), ['color']),
    sep: item && cs(item, []) && ['content', 'width', 'height', 'borderTopWidth'].map(k => getComputedStyle(item, '::before')[k]),
    btn: btn && [btn.getBoundingClientRect().width, btn.getBoundingClientRect().height],
    icons: [...nav.querySelectorAll('svg[data-bc-dir]')].map(s => s.innerHTML).join('|'),
    nb: nav.querySelectorAll('.bc__btn').length,
  };
});

async function themeFirst(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await L.mount(browser, NAME, {width, editing, assets: [L.CTRL], settings: BASE, globals: G});
    const read = async () => (await settle(t.page), {bg: await t.css('nav.bc', 'backgroundColor'), link: await t.css('.bc__link', 'color'), cur: await t.css('.bc__current', 'color'), f: await t.css('.bc__link', 'fontFamily'), li: await t.css('.bc__item', 'fontFamily')});
    const theme = await read();
    eq([theme.bg, theme.cur, theme.f, theme.li], ['rgb(24, 32, 40)', 'rgb(255, 255, 255)', 'Arial', 'Arial'], 'theme first ' + width);
    /* colours picked but custom styling off: still the scheme */
    await t.redraw({settings: {...BASE, link_color: '#ff0000', current_color: '#00ff00'}}); await frames(t.page); await settle(t.page);
    eq(await read(), theme, 'colours wait for Enable custom styling ' + width);
    const ON = {enable_custom_style: true, link_color: '#ee1122', current_color: '#11ee22', enable_custom_fonts: true, font: L.FONT};
    const want = async label => { const r = await read(); eq([r.link, r.cur], ['rgb(238, 17, 34)', 'rgb(17, 238, 34)'], label + ' colours'); ok(/Verdana/.test(r.f) && /Verdana/.test(r.li), label + ' font on the link and the list item ' + JSON.stringify(r)); ok(await t.page.locator('#shopify-section-test nav.bc[data-own-font]').count() === 1, label + ' data-own-font'); };
    const back = async label => { eq(await read(), theme, label + ' theme restored'); eq(await t.page.locator('#shopify-section-test [data-own-font]').count(), 0, label + ' attribute gone'); };
    await t.emit(ON); await frames(t.page); await want('live on ' + width);
    await t.emit({enable_custom_style: false, enable_custom_fonts: false}); await frames(t.page); await back('live off ' + width);
    await t.redraw({settings: {...BASE, ...ON}}); await frames(t.page); await want('redraw on ' + width);
    await t.redraw({settings: {...BASE, enable_custom_style: false, enable_custom_fonts: false}}); await frames(t.page); await back('redraw off ' + width);
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq([await t.css('nav.bc', 'backgroundColor'), await t.css('.bc__current', 'color')], ['rgb(250, 250, 250)', 'rgb(16, 16, 16)'], 'scheme live ' + width);
    if (width === 375) {
      const boxes = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .bc__link, #shopify-section-test .bc__btn')].map(el => { const a = el.getBoundingClientRect(), b = getComputedStyle(el, '::after'); return Math.max(a.height, parseFloat(b.height) || 0); }));
      ok(boxes.length >= 3 && boxes.every(h => h >= 44), '44px targets at 375 ' + JSON.stringify(boxes));
    }
    await t.page.keyboard.press('Tab'); await t.page.waitForTimeout(50);
    ok(await t.page.evaluate(() => { const a = document.activeElement; return !!a && a.matches('.bc__link') && getComputedStyle(a).outlineStyle !== 'none'; }), 'keyboard focus ring ' + width);
    ok(await t.noOverflow(), 'no sideways scroll ' + width);
    eq(t.errors, [], 'no errors ' + width);
    await t.page.close();
  }
  const t = await L.mount(browser, NAME, {width: 1366, assets: [L.CTRL], settings: BASE, globals: G, priority: 'off'});
  eq(await t.css('.bc__link', 'fontFamily'), 'Arial', 'priority off: theme body font');
  await t.page.close();
}

(async () => {
  L.schemaChecks(NAME, ['General', 'Content', 'Layout', 'Appearance', 'Typography', 'Desktop spacing', 'Mobile']);
  const browser = await L.launch();
  const only = process.argv.slice(2);
  try {
    if (!only.length || only.includes('theme')) await themeFirst(browser);
    if (!only.length || only.includes('life')) {
      for (const settings of [BASE, {...BASE, enable_custom_style: true, link_color: '#ee1122', enable_custom_fonts: true, font: L.FONT, separator: 'slash', uppercase: true, enable_custom_padding: true, padding_top_mobile: 30}])
        await L.firstPaint(browser, NAME, {settings, globals: G, sig});
      await L.twoInstances(browser, NAME, {settings: BASE, globals: G, edit: {separator: 'slash', font_size: 17}, read: (t, uid) => t.page.evaluate(uid => { const n = document.querySelector('#shopify-section-' + uid + ' nav.bc'); return [getComputedStyle(n).fontSize, getComputedStyle(n.querySelectorAll('.bc__item')[1], '::before').content]; }, uid)});
    }
    if (!only.length || only.includes('saved')) {
      const sec = JSON.parse(L.read('templates/product.json')).sections.breadcrumb;
      await L.saved(browser, NAME, {inst: {settings: sec.settings}, globals: G, label: 'templates/product.json breadcrumb', look: page => page.evaluate(() => {
        const nav = document.querySelector('nav.bc'), cs = (el, p) => p.map(k => getComputedStyle(el)[k]), r = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
        return {nav: [...cs(nav, ['backgroundColor', 'paddingTop', 'paddingBottom', 'fontFamily', 'fontSize', 'textTransform']), ...r(nav)], text: nav.textContent.replace(/\s+/g, ' ').trim(),
          items: [...nav.querySelectorAll('.bc__item')].map(el => [...r(el), ...cs(el.firstElementChild, ['color']), getComputedStyle(el, '::before').content, getComputedStyle(el, '::before').width]),
          btns: [...nav.querySelectorAll('.bc__btn')].map(el => [el.getAttribute('href'), r(el)[0], getComputedStyle(el).color]).map(x => x.slice(0, innerWidth < 500 ? 1 : 3))};
      })});
    }
    if (!only.length || !['theme', 'life', 'saved'].includes(only[0])) await L.sweep(browser, NAME, {base: BASE, globals: G, sig, only: only.filter(x => x !== 'sweep'),
      pre: {link_color: {enable_custom_style: true}, current_color: {enable_custom_style: true}, enable_custom_fonts: {font: L.FONT}, font: {enable_custom_fonts: true, font: L.MONO}, padding_top_desktop: {enable_custom_padding: true}, padding_bottom_desktop: {enable_custom_padding: true}, padding_top_mobile: {enable_custom_padding: true}, padding_bottom_mobile: {enable_custom_padding: true}, next_prev_icon: {next_prev: true}},
      structural: new Set(['reset_spacing', 'next_prev']),
      same: {375: new Set(['padding_top_desktop', 'padding_bottom_desktop', 'enable_custom_padding']), 1366: new Set(['padding_top_mobile', 'padding_bottom_mobile']), all: new Set(['enable_custom_style', 'reset_spacing'])}});
  } finally { await browser.close(); }
  console.log(counter.checks + ' breadcrumb round 6 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
