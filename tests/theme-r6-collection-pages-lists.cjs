/* Round 6, Collections list page (sections/main-list-collections.storelib,
   templates/collections.json) and Subcollection list
   (sections/subcollection-list.storelib, shopify/templates/collection.json)
   with the real theme priority rules and shopify/assets/live-collection-pages.js.

   1. Schema: every id at c098384 kept, the shared group order, plain labels.
   2. Every visible setting at 375 and 1366: a redraw looks different, the
      same change sent live looks like the redraw (unless it changes which
      cards exist), the old value restores it.
   3. Theme first: the scheme and the theme fonts; the subcollection
      background waits for Enable custom styling.
   4. First paint equals the hydrated paint; two instances independent.
   5. The saved collections list (templates/collections.json main) looks as
      it did.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-collection-pages-lists.cjs [list|sub] [sweep|theme|life|saved] */
const L = require('./theme-r6-collection-pages-lib.cjs');
const {ok, eq, frames, settle, counter} = L;
const args = process.argv.slice(2);
const coll = (h, n) => ({id: n, title: h.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), handle: h, url: '/collections/' + h, products_count: n * 3, all_products_count: n * 3, published_at: '2026-01-0' + n, image: {src: 'https://theme.test/' + h + '.png', url: 'https://theme.test/' + h + '.png', width: 800, height: 800, aspect_ratio: 1, alt: h}, featured_image: {src: 'https://theme.test/' + h + '.png', url: 'https://theme.test/' + h + '.png', width: 800, height: 800, aspect_ratio: 1, alt: h}, products: []});
const ALL = ['sweaters', 't-shirts', 'tops', 'activewear', 'dress', 'shorts'].map((h, i) => coll(h, i + 1));
const G = {collections: ALL, template: 'list-collections'};
const SUBG = {template: 'collection', collection: {title: 'Pants', url: '/collections/pants', metafields: {custom: {subcollection: {value: ALL.slice(0, 4)}}}}};

const sigList = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-test [data-lcp]');
  if (!R) return null;
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const cards = [...R.querySelectorAll('.collection-item')].filter(c => c.getClientRects().length);
  const name = R.querySelector('.collection-item__name');
  return {cls: [...R.classList].sort().join(' '), inner: R.firstElementChild.className, root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']),
    rows: [...new Set(cards.map(c => Math.round(c.getBoundingClientRect().top)))].length, w: cards[0] && Math.round(cards[0].getBoundingClientRect().width), x2: cards[1] && Math.round(cards[1].getBoundingClientRect().left),
    n: cards.length, name: name && {t: name.textContent.trim(), ...cs(name, ['fontSize', 'fontFamily', 'color', 'backgroundColor'])}, info: cs(R.querySelector('.collection-item__information'), ['textAlign', 'justifyContent']),
    count: !!R.querySelector('.collection-item__count, [class*="count"]'), more: R.querySelector('loadmore-button')?.textContent.trim() || null, img: R.querySelector('.collection-item__media') && Math.round(R.querySelector('.collection-item__media').getBoundingClientRect().height)};
});
const sigSub = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-test [data-lcp]');
  if (!R) return null;
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const h = R.querySelector('.section__header-heading'), d = R.querySelector('.section__header-des');
  return {cls: [...R.classList].sort().join(' '), inner: R.firstElementChild.className, root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']),
    header: cs(R.querySelector('.section__header'), ['textAlign']), h: h && {t: h.textContent.trim(), cls: [...h.classList].sort().join(' '), ...cs(h, ['fontSize', 'fontFamily', 'color'])}, d: d && {t: d.textContent.trim(), ...cs(d, ['color', 'fontFamily'])},
    slider: (s => s && {...s.dataset})(R.querySelector('slide-section')), slides: R.querySelectorAll('.swiper-slide').length, arrows: !!R.querySelector('.swiper-button-next, .swiper-actions'),
    pag: (p => p && {cls: p.className.replace(/\s+/g, ' ').trim()})(R.querySelector('.swiper-pagination')), name: cs(R.querySelector('.collection-item__name'), ['fontSize']), info: cs(R.querySelector('.collection-item__information'), ['textAlign'])};
});

const CASES = {
  list: {name: 'main-list-collections', globals: G, sig: sigList, settings: {type: 'all', items_to_show: 6},
    sweep: {assets: ['section-collection.css', L.CTRL], pre: {font_size: {design: 'morden'}}, structural: new Set(['reset_spacing', 'type', 'sort_collections', 'show_product_count', 'items_to_show', 'design', 'pagination', 'button_show_more', 'image_ratio']),
      same: {all: new Set(['section_width:stretch_width', 'sort_collections', 'button_show_more', 'pagination', 'reset_spacing', 'items_to_show', 'image_ratio:square']), 375: new Set(['items_per_row', 'column_gap', 'section_width:container', 'section_width:fluid_container', 'section_width:full_width'])}, lenientSame: true}},
  sub: {name: 'subcollection-list', globals: SUBG, sig: sigSub, settings: {heading: 'Shop by type', description: '<p>Every cut we make.</p>', carousel_pagination: 'show_dots'},
    sweep: {structural: new Set(['reset_spacing', 'show_arrow', 'carousel_pagination', 'infinite', 'autoplay', 'autorotate_speed', 'items_per_row', 'items_per_row_mobile', 'column_gap', 'collection_information_position', 'design', 'image_ratio', 'custom_ratio', 'rounded_image', 'image_custom_width', 'image_width', 'show_product_count', 'reveal', 'information_spacing', 'font_weight', 'pagination_style']),
      pre: {font_size: {design: 'morden'}, section_bg: {enable_custom_style: true}, custom_ratio: {image_ratio: 'custom'}, image_width: {image_custom_width: true, collection_information_position: 'below_image'}, autorotate_speed: {autoplay: true}, pagination_position: {carousel_pagination: 'show_dots'}, pagination_style: {carousel_pagination: 'show_dots'}, rounded_image: {collection_information_position: 'below_image'}, image_custom_width: {collection_information_position: 'below_image'}, information_spacing: {collection_information_position: 'below_image'}},
      same: {all: new Set(['section_width:fluid_container', 'enable_custom_style', 'reset_spacing', 'infinite', 'autoplay', 'autorotate_speed', 'reveal', 'show_product_count', 'font_weight', 'pagination_style', 'image_ratio', 'custom_ratio', 'rounded_image', 'image_custom_width', 'image_width', 'design', 'information_spacing']), 375: new Set(['items_per_row', 'column_gap', 'pagination_position', 'show_arrow', 'section_width:container', 'section_width:stretch_width', 'section_width:full_width']), 1366: new Set(['items_per_row_mobile', 'carousel_pagination:show_dots_on_mobile'])}, lenientSame: true}},
};

async function themeFirst(browser, c) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await L.mount(browser, c.name, {width, editing, assets: [L.CTRL], settings: c.settings, globals: c.globals});
    eq(await t.css('[data-lcp]', 'backgroundColor'), 'rgb(24, 32, 40)', c.name + ' scheme background ' + width);
    if (c.name === 'subcollection-list') {
      eq([await t.css('.section__header-heading', 'fontFamily'), await t.css('.section__header-heading', 'color')], ['Georgia', 'rgb(255, 255, 255)'], 'theme heading ' + width);
      await t.redraw({settings: {...c.settings, section_bg: '#ff0000'}}); await frames(t.page);
      eq(await t.css('[data-lcp]', 'backgroundColor'), 'rgb(24, 32, 40)', 'background waits for Enable custom styling ' + width);
      await t.emit({enable_custom_style: true}); await frames(t.page);
      eq(await t.css('[data-lcp]', 'backgroundColor'), 'rgb(255, 0, 0)', 'background live ' + width);
      await t.emit({enable_custom_style: false}); await frames(t.page);
      eq(await t.css('[data-lcp]', 'backgroundColor'), 'rgb(24, 32, 40)', 'background off ' + width);
    }
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css('[data-lcp]', 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme live ' + width);
    ok(await t.noOverflow(), 'no sideways scroll ' + width);
    eq(t.errors, [], 'no errors ' + width);
    await t.page.close();
  }
}

const look = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-S .sec__collections-list');
  const cs = (el, p) => el ? p.map(k => getComputedStyle(el)[k]) : null, r = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  return {root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']), cards: [...R.querySelectorAll('.collection-item')].filter(c => c.getClientRects().length).map(c => [...r(c), c.textContent.replace(/\s+/g, ' ').trim()]),
    name: cs(R.querySelector('.collection-item__name'), ['fontSize', 'fontFamily', 'color', 'backgroundColor', 'borderTopLeftRadius']), more: R.querySelector('loadmore-button') && [R.querySelector('loadmore-button').textContent.trim(), ...r(R.querySelector('loadmore-button a'))]};
});

(async () => {
  const browser = await L.launch();
  const which = args.filter(a => CASES[a]), parts = args.filter(a => !CASES[a]);
  try {
    for (const k of which.length ? which : Object.keys(CASES)) {
      const c = CASES[k];
      if (!parts.length || parts.includes('schema')) L.schemaChecks(c.name);
      if (!parts.length || parts.includes('theme')) await themeFirst(browser, c);
      if (!parts.length || parts.includes('life')) {
        await L.firstPaint(browser, c.name, {settings: c.settings, globals: c.globals, sig: c.sig});
        await L.firstPaint(browser, c.name, {settings: {...c.settings, text_alignment: 'left', font_size: 13, items_per_row: 3, column_gap: 10, padding_top: 10, header_alignment: 'center'}, globals: c.globals, sig: c.sig, label: 'custom '});
        await L.twoInstances(browser, c.name, {settings: c.settings, globals: c.globals, edit: {padding_top: 77, text_alignment: 'right'}, read: (t, uid) => t.page.evaluate(uid => getComputedStyle(document.querySelector('#shopify-section-' + uid + ' [data-lcp]')).paddingTop, uid)});
      }
      if (k === 'list' && (!parts.length || parts.includes('saved'))) {
        const sec = JSON.parse(L.read('templates/collections.json')).sections.main;
        const byHandle = Object.fromEntries(Object.values(sec.blocks).map((b, i) => [b.settings.collection, coll(b.settings.collection, (i % 9) + 1)]));
        const blocks = (sec.block_order || Object.keys(sec.blocks)).map(id => sec.blocks[id]).map(b => ({type: b.type, settings: {...b.settings, collection: byHandle[b.settings.collection]}}));
        await L.saved(browser, c.name, {inst: {settings: sec.settings, blocks}, globals: G, look, label: 'templates/collections.json main'});
      }
      if (!parts.length || parts.includes('sweep')) await L.sweep(browser, c.name, {base: c.settings, globals: c.globals, sig: c.sig, ...c.sweep, values: {custom_ratio: ['2:1']},
        skip: new Set(['collection.collection', 'collection.collection_image', 'collection.collection_title', 'header_size:medium'])});
    }
  } finally { await browser.close(); }
  console.log(counter.checks + ' collections list and subcollection round 6 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
