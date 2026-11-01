/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r6-main-product.cjs
   Main product (sections/main-product + snippets/main-product-body), round 6.

   Static: the section's settings in the shared order (General with the
   colour scheme first, Layout, Media, Sticky add to cart, Appearance,
   Typography, Spacing, Mobile), plain labels, dependent controls hidden,
   every setting id of commit c098384 kept in the theme's schema and in the
   builder's panel, the new switches off by default, the blocks still the
   same as Featured product's.

   Rendered with liquidjs in the real layout (header, theme-controls, every
   theme asset) and drawn in Chromium at 375 and 1366, in the builder and on
   the storefront:
   - The product page as saved (templates/product.json) looks the same as at
     c098384: every drawn element's box, colours and fonts, and the sticky bar.
   - Theme first: the title in the theme's heading font and colour, the text
     in the body font; custom colours and fonts off by default.
   - Every section setting changes its element after a redraw, and the ones
     the controller paints change it live too (storelib:settings-change),
     the live value the same as the redrawn one; switching the custom
     colours and fonts off gives the theme's values back.
   - Title and price block sizes follow a live block edit.
   - Two Main product sections on one page stay independent.
   - Redraws: one controller state per section, no stale live values.
   - First paint is the hydrated paint; no sideways scroll at 375; content
     shown under reduced motion; no page errors. */
const assert = require('node:assert/strict');
const L = require('./theme-r6-main-product-lib.cjs');
const {schemaText, repo} = L;
const fs = require('node:fs'), path = require('node:path');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

/* ---------------------------------------------------------------- static */
const OLD = 'c098384';
{
  const now = schemaText(fs.readFileSync(path.join(repo, 'sections/main-product.storelib'), 'utf8'));
  const then = schemaText(fs.readFileSync(path.join(L.treeAt(OLD), 'sections/main-product.storelib'), 'utf8'));
  const feat = schemaText(fs.readFileSync(path.join(repo, 'sections/featured-product.storelib'), 'utf8'));
  eq(now.shopify.blocks, feat.shopify.blocks, 'the blocks are still the same as Featured product\'s');
  eq(now.shopify.blocks.map(b => b.type), then.shopify.blocks.map(b => b.type), 'every block type kept');
  for (const [name, list, old] of [['schema', now.shopify.settings, then.shopify.settings], ['panel', now.settings, then.settings]]) {
    const ids = list.filter(s => s.id && s.type !== 'header').map(s => s.id);
    ok(new Set(ids).size === ids.length, `${name}: every id once`);
    for (const s of old) if (s.id && s.type !== 'header') ok(ids.includes(s.id), `${name}: kept ${s.id}`);
    for (const s of old) if (s.id && s.type !== 'header') { const n = list.find(x => x.id === s.id); ok(n.type === s.type && JSON.stringify(n.default) === JSON.stringify(s.default), `${name}: ${s.id} keeps its type and default`); }
    ok(list.find(s => s.type !== 'header').id === 'color_scheme', `${name}: colour scheme first`);
    const heads = list.filter(s => s.type === 'header').map(s => s.content || s.label);
    eq(heads, ['General', 'Layout', 'Media', 'Sticky add to cart', 'Appearance', 'Typography', 'Spacing', 'Mobile'], `${name}: groups in the shared order`);
    for (const s of list) for (const t of [s.label, s.info, s.content, ...(s.options || []).map(o => o.label)]) if (typeof t === 'string') ok(!/^t:/.test(t) && !/shopify|liquid|\u2014/i.test(t), `${name}: plain words "${t}"`);
    for (const s of list) if (s.visible_if) { const ref = s.visible_if.match(/section\.settings\.([a-z0-9_]+)/); ok(ref && ids.includes(ref[1]), `${name}: ${s.id} depends on a declared setting`); }
    const S = id => list.find(s => s.id === id);
    for (const id of ['enable_custom_style', 'enable_custom_fonts']) ok(S(id).type === 'checkbox' && S(id).default === false, `${name}: ${id} off by default`);
    ok(S('sticky_use_theme_button').default === true, `${name}: the sticky button follows the theme by default`);
    for (const id of ['title_color', 'price_color', 'text_color', 'sticky_bar_bg', 'sticky_border_color']) eq(S(id).visible_if, '{{ section.settings.enable_custom_style }}', `${name}: ${id} shows with custom styling`);
    for (const id of ['heading_font', 'body_font']) ok(S(id).type === 'font_picker' && S(id).visible_if === '{{ section.settings.enable_custom_fonts }}', `${name}: ${id} is a font picker shown with custom fonts`);
    for (const id of ['padding_left_desktop', 'padding_right_desktop', 'padding_left_mobile', 'padding_right_mobile']) eq(S(id).visible_if, '{{ section.settings.enable_custom_padding }}', `${name}: ${id} shows with custom side padding`);
    eq(S('sticky_button_radius').visible_if, '{{ section.settings.sticky_use_theme_button == false }}', `${name}: the sticky button radius shows when the theme shape is off`);
    ok(!list.some(s => s.type === 'select' && (s.options || []).some(o => /^h[1-6]$/.test(o.value)) && !s.hidden), `${name}: no visible HTML tag select`);
  }
  ok(!/^t:/.test(now.shopify.name), 'the section has a plain name');
  ok(!('presets' in now.shopify), 'a page section: no preset');
  const body = fs.readFileSync(path.join(repo, 'snippets/main-product-body.storelib'), 'utf8');
  ok(/data-mp-root="\{\{ section\.id \}\}"/.test(body) && /<style data-mp-own=/.test(body) && /data-mp-settings=/.test(body), 'the root, its own style and its settings are marked for the controller');
}

/* -------------------------------------------------------------- rendered */
(async () => {
  if (!L.R5.Liquid) { console.log(`${checks} main product round 6 checks passed (render skipped: set LIQUIDJS=<path to liquidjs>)`); return; }
  const {chromium} = require('playwright');
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const old = L.treeAt(OLD);
  const config = JSON.parse(fs.readFileSync(path.join(repo, 'config/settings.json'), 'utf8')).shopify;
  const otherScheme = Object.keys(config.color_schemes).find(k => k !== 'default' && config.color_schemes[k].settings.background !== config.color_schemes.default.settings.background);
  const REVIEWED = {...L.R5.PANTS, rating: 4.6, review_count: 12};
  try {
    /* ---- the saved product page, old and new */
    for (const design of [false, true]) for (const width of [375, 1366]) {
      const looks = {};
      for (const [tag, tree] of [['old', old], ['new', repo]]) {
        const r = await L.renderMain({tree, design});
        const {p, ctx} = await L.open(browser, width, r.html, {tree, wait: 1500});
        looks[tag] = await L.look(p, r.id);
        looks[tag + 'Bar'] = await p.evaluate(() => { const s = document.querySelector('sticky-add-cart'); if (!s) return 'none'; const c = getComputedStyle(s), b = s.querySelector('button[name=add]'); return [c.backgroundColor, c.borderTopColor, c.paddingTop, c.display, b && getComputedStyle(b).borderRadius].join('|'); });
        eq(p.errors, [], `${tag} ${width} ${design ? 'builder' : 'storefront'}: no page errors`);
        await ctx.close();
      }
      ok(looks.old.length > 100, 'the saved section draws');
      eq(L.lookDiff(looks.old, looks.new), [], `saved product page at ${width} (${design ? 'builder' : 'storefront'}) looks as at ${OLD}`);
      eq(looks.newBar, looks.oldBar, `saved sticky bar at ${width} looks as before`);
    }

    /* ---- every section setting, live and after a redraw */
    const M = {
      rootBg: `getComputedStyle(R).backgroundColor + ' ' + [...R.classList].filter(c => c.startsWith('color-')).join()`,
      wrapWidth: `Math.round(W.getBoundingClientRect().width) + ' ' + getComputedStyle(W).paddingLeft`,
      rootClass: `R.className`,
      gallery: `(R.querySelector('media-gallery [data-thumb-direction]') || {}).outerHTML ? R.querySelector('media-gallery').getAttribute('data-mt-gallery-config') + ' ' + R.querySelector('[data-thumb-direction]').dataset.thumbDirection : R.querySelector('media-gallery').getAttribute('data-mt-gallery-config')`,
      mediaWidth: `Math.round(R.querySelector('.product-detail__media').getBoundingClientRect().width)`,
      sticky: `SEC.className + ' ' + !!R.querySelector('.product-detail__information > .sticky')`,
      stickyGap: `getComputedStyle(SEC).getPropertyValue('--mp-sticky-gap').trim()`,
      colGap: `getComputedStyle(R.querySelector('.main-product')).columnGap`,
      square: `(() => { const i = R.querySelector('.product-detail__media .swiper-slide img, .product-detail__media img'); const b = i.closest('[style*="--aspect"], .product-item__media--ratio, .media') || i; return getComputedStyle(b).getPropertyValue('--aspect') + ' ' + Math.round(i.getBoundingClientRect().height / i.getBoundingClientRect().width * 100); })()`,
      zoom: `R.dataset.zoom`,
      video: `(() => { const v = R.querySelector('.product-detail__media video'); const g = R.querySelector('[data-auto-play-video]'); return (v ? [v.loop, v.controls, v.autoplay, v.muted].join() : 'no video') + ' ' + (g && g.dataset.autoPlayVideo); })()`,
      barClass: `(document.querySelector('sticky-add-cart[data-section-id="' + ID + '"]') || {className: 'none'}).className`,
      barShown: sel => `(() => { const b = document.querySelector('sticky-add-cart[data-section-id="' + ID + '"]'); return b ? [...b.querySelectorAll(${JSON.stringify(sel)})].map(e => getComputedStyle(e).display).join() : 'none'; })()`,
      barReviews: `!!document.querySelector('sticky-add-cart[data-section-id="' + ID + '"] .sticky-cart-rating')`,
      barPad: `getComputedStyle(document.querySelector('sticky-add-cart[data-section-id="' + ID + '"]')).paddingTop`,
      barBtn: `getComputedStyle(document.querySelector('sticky-add-cart[data-section-id="' + ID + '"] button[name=add]')).borderRadius`,
      barPaint: `(() => { const c = getComputedStyle(document.querySelector('sticky-add-cart[data-section-id="' + ID + '"]')); return c.backgroundColor + ' ' + c.borderTopColor; })()`,
      title: `(() => { const c = getComputedStyle(R.querySelector('.product-detail__information .product-detail__title')); return c.color + ' ' + c.fontFamily; })()`,
      price: `getComputedStyle(R.querySelector('.product-detail__information .product-detail__price .price-regular .price')).color`,
      text: `(() => { const c = getComputedStyle(R.querySelector('.product-detail__information')); const p = R.querySelector('.product-detail__information .short-description p, .product-detail__information p'); return c.color + ' ' + getComputedStyle(p).fontFamily + ' ' + R.hasAttribute('data-own-font'); })()`,
      pad: `getComputedStyle(R).paddingTop + ' ' + getComputedStyle(R).paddingBottom`,
      thumbs: `[...R.querySelectorAll('.product-detail__media *')].filter(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden' && /thumb/.test(e.className)).length`,
      perView: `R.querySelector('media-gallery').getAttribute('data-mt-gallery-config').split('|')[3]`,
      dots: `!!SEC.querySelector('.nav-dots-row') || /nav-dots-row/.test(SEC.innerHTML)`,
    };
    const S = (id, value, m, {live = false, base = {}, widths = [375, 1366], product, editorRedraw} = {}) => ({id, value, m, live, base, widths, product, editorRedraw});
    /* In the builder product-page-ui.js puts the previous gallery back after a redraw when its
       data-mt-gallery-config is the same; loop and controls are not in it (snippets/media-gallery,
       shared with Featured product), so those two are checked in the builder only once they are. */
    const galleryKeysVideo = /enable_video_looping/.test(fs.readFileSync(path.join(repo, 'snippets/media-gallery.storelib'), 'utf8').match(/data-mt-gallery-config="[^"]*"/)[0]);
    const CASES = [
      S('color_scheme', otherScheme, M.rootBg, {live: true}),
      S('section_width', 'full_width', M.wrapWidth, {widths: [1366]}),
      S('reset_spacing', false, M.rootClass),
      S('desktop_layout', 'thumbnail_left', M.gallery),
      S('desktop_media_width', 60, M.mediaWidth, {live: true, widths: [1366]}),
      S('enable_sticky_content_on_desktop', false, M.sticky),
      S('sticky_top_gap', 60, M.stickyGap, {live: true}),
      S('enable_custom_media_gap', true, M.colGap, {live: true, widths: [1366], base: {content_gap_desktop: 100}}),
      S('content_gap_desktop', 100, M.colGap, {live: true, widths: [1366], base: {enable_custom_media_gap: true}}),
      S('media_square', false, M.square),
      S('image_zoom', 'external_zoom', M.zoom),
      S('enable_video_autoplay', false, M.video),
      S('enable_video_looping', false, M.video, {editorRedraw: galleryKeysVideo}),
      S('enable_video_controls', false, M.video, {editorRedraw: galleryKeysVideo}),
      S('enable_on_desktop', false, M.barClass),
      S('enable_on_mobile', false, M.barClass),
      S('sticky_show_image', false, M.barShown('.product-item__media'), {live: true, widths: [1366]}),
      S('sticky_show_title', false, M.barShown('.product-item__information'), {live: true, widths: [1366]}),
      S('sticky_show_reviews', true, M.barReviews, {product: REVIEWED}),
      S('sticky_show_variant_picker', false, M.barShown('.product-detail__variant-picker'), {live: true}),
      S('sticky_show_quantity', false, M.barShown('.product-form__quantity'), {live: true, widths: [1366]}),
      S('sticky_padding_y', 20, M.barPad, {live: true}),
      S('sticky_use_theme_button', false, M.barBtn, {live: true, base: {sticky_button_radius: 0}}),
      S('sticky_button_radius', 0, M.barBtn, {live: true, base: {sticky_use_theme_button: false}}),
      S('enable_custom_style', true, M.title, {live: true, base: {title_color: '#ff00aa'}}),
      S('title_color', '#ff00aa', M.title, {live: true, base: {enable_custom_style: true}}),
      S('price_color', '#00aa55', M.price, {live: true, base: {enable_custom_style: true}}),
      S('text_color', '#3355aa', M.text, {live: true, base: {enable_custom_style: true}}),
      S('sticky_bar_bg', '#ffeedd', M.barPaint, {live: true, base: {enable_custom_style: true}}),
      S('sticky_border_color', '#ff0000', M.barPaint, {live: true, base: {enable_custom_style: true}}),
      S('enable_custom_fonts', true, M.title, {live: true, base: {heading_font: {family: 'Georgia', fallback_families: 'serif'}}}),
      S('heading_font', {family: 'Georgia', fallback_families: 'serif'}, M.title, {live: true, base: {enable_custom_fonts: true}}),
      S('body_font', {family: 'Courier New', fallback_families: 'monospace'}, M.text, {live: true, base: {enable_custom_fonts: true}}),
      S('padding_top', 60, M.pad, {live: true}),
      S('padding_bottom', 20, M.pad, {live: true}),
      S('enable_custom_padding', true, M.wrapWidth, {live: true, base: {padding_left_desktop: 60, padding_left_mobile: 30}}),
      S('padding_left_desktop', 60, M.wrapWidth, {live: true, widths: [1366], base: {enable_custom_padding: true}}),
      S('padding_right_desktop', 60, `getComputedStyle(W).paddingRight`, {live: true, widths: [1366], base: {enable_custom_padding: true}}),
      S('padding_left_mobile', 30, M.wrapWidth, {live: true, widths: [375], base: {enable_custom_padding: true}}),
      S('padding_right_mobile', 30, `getComputedStyle(W).paddingRight`, {live: true, widths: [375], base: {enable_custom_padding: true}}),
      S('section_width_mobile', 'container', M.wrapWidth, {widths: [375]}),
      S('mobile_options', 'hidden_thumbnail', M.thumbs, {widths: [375]}),
      S('mobile_slides_per_view', '2', M.perView, {widths: [375]}),
      S('enable_nav_dots_mobile', true, M.dots, {widths: [375]}),
    ];
    const schema = L.mainSchema();
    for (const s of schema.settings) if (s.id && !s.hidden && s.visible_if !== '{{ false }}') ok(CASES.some(c => c.id === s.id), 'a check for every section setting: ' + s.id);

    const measure = (p, id, expr) => p.evaluate(([ID, expr]) => { const R = document.getElementById('MainProduct-' + ID), SEC = document.getElementById('shopify-section-' + ID), W = R.querySelector(':scope > :is(.container, .fluid_container, .stretch_width, .full_width, skeleton-page)'); return String(eval(expr)); }, [id, expr]);
    for (const design of [true, false]) for (const width of [375, 1366]) {
      const groups = new Map();
      for (const c of CASES) if (c.widths.includes(width) && !(design && c.editorRedraw === false)) { const k = JSON.stringify([c.base, c.product ? 1 : 0]); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
      for (const [, list] of groups) {
        const {base, product} = list[0];
        const r0 = await L.renderMain({settings: base, design, product});
        const {p, ctx} = await L.open(browser, width, r0.html, {wait: 1000});
        await p.evaluate(() => window.scrollTo(0, 400));
        for (const c of list) {
          const before = await measure(p, r0.id, c.m);
          if (c.live) {
            await L.emit(p, {section: r0.id, settings: {[c.id]: c.value}, live: false});
            const live = await measure(p, r0.id, c.m);
            ok(live !== before, `${c.id} live at ${width}: ${before} -> ${live}`);
            /* back again, live: the first value returns */
            const was = r0.settings[c.id];
            await L.emit(p, {section: r0.id, settings: {[c.id]: c.id === 'color_scheme' ? was.id : was}, live: false});
            eq(await measure(p, r0.id, c.m), before, `${c.id} live back at ${width}`);
            await L.emit(p, {section: r0.id, settings: {[c.id]: c.value}, live: false});
            const r1 = await L.renderMain({settings: {...base, [c.id]: c.value}, design, product});
            await L.redraw(p, r0.id, r1.sectionHtml);
            await p.waitForTimeout(80);
            const drawn = await measure(p, r0.id, c.m);
            eq(drawn, live, `${c.id} at ${width}: live value is the redrawn value`);
          } else {
            const r1 = await L.renderMain({settings: {...base, [c.id]: c.value}, design, product});
            await L.redraw(p, r0.id, r1.sectionHtml);
            await p.waitForTimeout(80);
            const drawn = await measure(p, r0.id, c.m);
            ok(drawn !== before, `${c.id} after a redraw at ${width}: ${before} -> ${drawn}`);
          }
          await L.redraw(p, r0.id, r0.sectionHtml);
          await p.waitForTimeout(80);
          eq(await measure(p, r0.id, c.m), before, `${c.id} at ${width}: a redraw with the old value restores it`);
        }
        eq(p.errors, [], `no page errors (${width}, ${design ? 'builder' : 'storefront'})`);
        await ctx.close();
      }
    }

    /* ---- theme first, then custom off gives the theme back */
    for (const width of [375, 1366]) {
      const r = await L.renderMain({});
      const {p, ctx} = await L.open(browser, width, r.html, {wait: 1000});
      const theme = await p.evaluate(id => {
        const R = document.getElementById('MainProduct-' + id), h = R.querySelector('.product-detail__information .product-detail__title'), root = getComputedStyle(document.documentElement);
        const c = getComputedStyle(h), bodyP = R.querySelector('.product-detail__information .short-description p, .product-detail__information p');
        const probe = document.createElement('span'); probe.style.color = 'var(--color-heading)'; R.appendChild(probe); const heading = getComputedStyle(probe).color; probe.remove();
        return {font: c.fontFamily, want: getComputedStyle(R).getPropertyValue('--heading-font').trim() || root.getPropertyValue('--heading-font').trim(), color: c.color, heading, own: R.hasAttribute('data-own-font'), p: getComputedStyle(bodyP).fontFamily};
      }, r.id);
      ok(theme.font.replace(/\s/g, '') === theme.want.replace(/\s/g, ''), `${width}: the title is in the theme's heading font (${theme.font})`);
      eq(theme.color, theme.heading, `${width}: the title in the scheme's heading colour`);
      ok(!theme.own, `${width}: no own font by default`);
      await L.emit(p, {section: r.id, settings: {enable_custom_fonts: true, heading_font: {family: 'Georgia', fallback_families: 'serif'}, body_font: {family: 'Courier New', fallback_families: 'monospace'}, enable_custom_style: true, title_color: '#ff00aa'}});
      const on = await p.evaluate(id => { const R = document.getElementById('MainProduct-' + id); return {t: getComputedStyle(R.querySelector('.product-detail__title')).fontFamily, c: getComputedStyle(R.querySelector('.product-detail__title')).color, p: getComputedStyle(R.querySelector('.product-detail__information .short-description p, .product-detail__information p')).fontFamily, own: R.hasAttribute('data-own-font')}; }, r.id);
      ok(/Georgia/.test(on.t) && on.c === 'rgb(255, 0, 170)' && /Courier New/.test(on.p) && on.own, `${width}: custom fonts and colours win over Theme settings > Typography (${JSON.stringify(on)})`);
      await L.emit(p, {section: r.id, settings: {enable_custom_fonts: false, enable_custom_style: false}});
      const off = await p.evaluate(id => { const R = document.getElementById('MainProduct-' + id); return {t: getComputedStyle(R.querySelector('.product-detail__title')).fontFamily, c: getComputedStyle(R.querySelector('.product-detail__title')).color, p: getComputedStyle(R.querySelector('.product-detail__information .short-description p, .product-detail__information p')).fontFamily, own: R.hasAttribute('data-own-font')}; }, r.id);
      eq(off, {t: theme.font, c: theme.color, p: theme.p, own: false}, `${width}: switching them off gives the theme's values back`);
      /* the same with the switches drawn on, then off */
      const r2 = await L.renderMain({settings: {enable_custom_fonts: true, heading_font: 'georgia_n4', body_font: 'courier_new_n4'}});
      ok(/data-own-font/.test(r2.sectionHtml.slice(r2.sectionHtml.indexOf('id="MainProduct-'), r2.sectionHtml.indexOf('id="MainProduct-') + 800)) && r2.sectionHtml.includes('font_face Georgia'), 'custom fonts: data-own-font and the font faces in the first paint');
      await ctx.close();
    }

    /* ---- block sizes live (title, price), at their widths */
    for (const width of [375, 1366]) {
      const r = await L.renderMain({});
      const {p, ctx} = await L.open(browser, width, r.html, {wait: 1000});
      const title = r.blocks.find(b => b.type === 'title'), price = r.blocks.find(b => b.type === 'price');
      const size = () => p.evaluate(id => { const R = document.getElementById('MainProduct-' + id); return [getComputedStyle(R.querySelector('.product-detail__title')).fontSize, getComputedStyle(R.querySelector('#price-' + id + ' .price-regular .price')).fontSize]; }, r.id);
      const before = await size();
      const desk = width >= 1024;
      await L.emit(p, {section: r.id, block: title.id, settings: {[desk ? 'title_font_size_desktop' : 'title_font_size_mobile']: 47}, live: true});
      await L.emit(p, {section: r.id, block: {id: price.id}, settings: {[desk ? 'price_font_size_desktop' : 'price_font_size_mobile']: 39}, live: true});
      eq(await size(), ['47px', '39px'], `${width}: title and price sizes follow a live block edit (was ${before})`);
      const r1 = await L.renderMain({blocks: r.blocks.map(b => b.id === title.id ? {...b, settings: {...b.settings, [desk ? 'title_font_size_desktop' : 'title_font_size_mobile']: 47}} : b.id === price.id ? {...b, settings: {...b.settings, [desk ? 'price_font_size_desktop' : 'price_font_size_mobile']: 39}} : b)});
      await L.redraw(p, r.id, r1.sectionHtml); await p.waitForTimeout(80);
      eq(await size(), ['47px', '39px'], `${width}: and the redraw draws the same`);
      await L.redraw(p, r.id, r.sectionHtml); await p.waitForTimeout(80);
      eq(await size(), before, `${width}: a redraw with the saved sizes takes the live ones away`);
      await ctx.close();
    }

    /* ---- two sections on one page, redraws, first paint, reduced motion, overflow */
    for (const width of [375, 1366]) for (const design of [true, false]) {
      const r = await L.renderMain({design, more: [{id: 'second'}]});
      const {p, ctx} = await L.open(browser, width, r.html, {wait: 1200});
      const read = id => p.evaluate(id => { const R = document.getElementById('MainProduct-' + id); return [getComputedStyle(R).paddingTop, getComputedStyle(R.querySelector('.product-detail__title')).color, R.className]; }, id);
      const b0 = await read('second');
      await L.emit(p, {section: r.id, settings: {padding_top: 77, enable_custom_style: true, title_color: '#ff00aa', color_scheme: otherScheme}});
      eq(await read('second'), b0, `${width}: an edit to one Main product leaves the other as it was`);
      ok((await read(r.id))[1] === 'rgb(255, 0, 170)', `${width}: and changes its own`);
      for (let i = 0; i < 3; i++) { await L.redraw(p, r.id, r.sectionHtml); await p.waitForTimeout(60); }
      const st = await p.evaluate(id => ({states: [...window.MateriaMainProduct.roots.values()].filter(s => s.id === id).length, live: document.querySelectorAll('style[data-mp-live="' + id + '"]').length, printed: document.querySelector('style[data-mp-own="' + id + '"]').media}), r.id);
      eq(st, {states: 1, live: 0, printed: ''}, `${width}: three redraws, one controller state and the printed values back`);
      eq((await read(r.id))[0], b0[0], `${width}: the redraw's padding, not the live one`);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}: no sideways scroll`);
      eq(p.errors, [], `${width}: no page errors with two sections`);
      await ctx.close();
      /* first paint (no controller) equals the hydrated paint */
      const looks = [];
      for (const script of [false, true]) {
        const rr = await L.renderMain({design, script});
        const o = await L.open(browser, width, rr.html, {wait: 1500});
        looks.push(await L.look(o.p, rr.id));
        await o.ctx.close();
      }
      eq(L.lookDiff(looks[0], looks[1]), [], `${width} ${design ? 'builder' : 'storefront'}: first paint is the hydrated paint`);
    }
    for (const width of [375, 1366]) {
      const r = await L.renderMain({});
      const {p, ctx} = await L.open(browser, width, r.html, {reduced: true, wait: 1200});
      const vis = await p.evaluate(id => { const i = document.querySelector('#MainProduct-' + id + ' .product-detail__information'); return [getComputedStyle(i).opacity, i.getBoundingClientRect().height > 100]; }, r.id);
      eq(vis, ['1', true], `${width}: reduced motion, the product information is shown`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} main product round 6 checks passed (schema order and ids, saved look vs ${OLD} at 375/1366, every section setting live and redrawn, theme first and custom off, block sizes live, two sections, redraws, first paint, reduced motion)`);
})().catch(e => { console.error(e); process.exit(1); });
