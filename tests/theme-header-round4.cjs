/* Run: node tests/theme-header-round4.cjs   (exits 1 on any failure)
   Header round 4: Menu link hover in the header, dropdown speed and
   smoothness, the mega menu / banner / collection settings, the phone drawer
   (submenu header, rows, banner) and the footer's phone accordion.

   Static checks always run. The rendered checks need liquidjs (set
   LIQUIDJS=<path to liquidjs>, or have it installed): the real
   layout/theme, sections/theme-header and sections/theme-footer are rendered
   with the repository's snippets and shopify/assets, then driven in Chromium
   at 375px and 1366px. liquidjs stands in for Storelib's renderer; filters it
   lacks (image_url, t, ...) are stubbed. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
const schemaOf = f => { const t = read(f); return JSON.parse(t.slice(t.indexOf('\n<schema>') + 9, t.lastIndexOf('</schema>'))).shopify; };
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

/* ---------- static ---------- */
const hs = schemaOf('sections/theme-header.storelib');
const S = id => hs.settings.find(x => x.id === id);
const B = type => hs.blocks.find(b => b.type === type);
{
  const ids = hs.settings.filter(s => s.id).map(s => s.id);
  ok(new Set(ids).size === ids.length, 'header setting ids are unique');
  const order = ['menu_hover_style', 'menu_hover_color', 'dropdowns_animation', 'dropdowns_speed', 'dropdowns_smoothness'].map(id => ids.indexOf(id));
  ok(order.every(i => i >= 0) && order[1] === order[0] + 1 && order[3] === order[2] + 1 && order[4] === order[2] + 2, 'hover colour follows Menu link hover; speed and smoothness sit right under Dropdown animation');
  ok(S('menu_hover_style').default === 'inherit' && S('menu_hover_style').options.some(o => o.value === 'highlight'), 'Menu link hover keeps the previous choice by default and offers Soft highlight');
  ok(S('dropdowns_speed').type === 'range' && S('dropdowns_speed').unit === 'ms' && S('dropdowns_smoothness').type === 'range', 'speed and smoothness are sliders');
  for (const id of ['dropdown_width', 'dropdown_padding', 'dropdown_link_spacing', 'dropdown_radius', 'dropdown_shadow', 'mega_column_gap', 'mega_column_dividers', 'mega_card_radius', 'mega_card_label', 'mega_card_label_bg', 'mega_card_label_color', 'menu_mobile_dividers', 'menu_mobile_chevrons']) ok(S(id), `header setting ${id}`);
  ok(B('menu_promotion').settings.some(s => s.id === 'promotion_label_1') && B('menu_promotion').settings.some(s => s.id === 'promotion_label_2'), 'banners have a label on the image');
  ok(B('menu_link_style') && ['text', 'item_label', 'link_color', 'link_hover_color'].every(id => B('menu_link_style').settings.some(s => s.id === id)), 'Menu link: badge & colour block');
  ok(B('menu_mobile_banner') && ['text', 'image', 'label', 'heading', 'body', 'divider', 'button_label', 'button_link', 'banner_bg', 'banner_text', 'button_bg', 'button_color', 'radius'].every(id => B('menu_mobile_banner').settings.some(s => s.id === id)), 'Mobile menu banner block');
  // the creator's existing ids are all still there
  for (const id of ['mega_menu', 'menu_hover_style', 'dropdowns_animation', 'uppercase_first', 'redirect_to_link', 'menu_dropdown_tinted_bg', 'menu_mobile_color', 'menu_mobile_background']) ok(S(id), `kept ${id}`);
  for (const id of ['text', 'item_label', 'promotion_image_width', 'promotion_image_1', 'promotion_link_1', 'promotion_link_newtab_1', 'promotion_image_2', 'promotion_link_2', 'promotion_link_newtab_2', 'promotion_menu_column', 'mega_custom_width', 'full_width', 'promotion_position', 'open-link-newtab', 'center_submenu']) ok(B('menu_promotion').settings.some(s => s.id === id), `kept menu_promotion ${id}`);

  const ts = JSON.parse(read('shopify/config/settings_schema.json'));
  const typo = ts.flatMap(g => g.settings || []).find(s => s.id === 'menu_hover_style');
  ok(typo && typo.visible_if === '{{ false }}', 'Typography > Menu link hover is retired (hidden), its value still read as the fallback');
  const visibleIfs = ts.flatMap(g => g.settings || []).filter(s => s.visible_if && s.visible_if !== '{{ false }}');
  ok(visibleIfs.length === 0, 'Theme settings use no visible_if other than {{ false }}');

  const header = body(read('sections/theme-header.storelib'));
  ok(/settings\.menu_hover_style \| default: 'underline'/.test(header), 'header falls back to the theme value for Keep previous choice');
  ok(/--dd-duration/.test(header) && /--dd-ease: cubic-bezier\(/.test(header), 'header writes the dropdown timing variables');
  const nav = read('shopify/assets/navigation.css');
  ok(/var\(--dd-duration/.test(nav) && /var\(--dd-ease/.test(nav), 'navigation.css animates dropdowns with the header timing');
  ok(!/transition: opacity 0\.42s cubic-bezier\(\.2,\.7,\.2,1\)/.test(nav) && !/transition: transform 1s cubic-bezier/.test(nav), 'no fixed-time dropdown transitions left');
  ok(/prefers-reduced-motion: reduce\)[\s\S]*navigation\.horizontal :is\(\.submenu, \.sub-children-menu\)/.test(nav), 'dropdowns stop under reduced motion');
  const hm = body(read('snippets/horizontal-menu.storelib'));
  ok((hm.match(/for link in section_st\.mega_menu\.links/g) || []).length === 1 && (hm.match(/\{\{- menu_items -\}\}/g) || []).length === 2, 'the menu items are built once and drawn in both navs');
  const sl = body(read('snippets/submenu-list.storelib'));
  ok(!/section_st\[label_setting\]/.test(sl) && /render 'menu-link-title'/.test(sl), 'submenu badges read the Menu badges block through menu-link-title');
  const hd = body(read('snippets/header-dimensions.storelib'));
  ok(!/data-menu-hover/.test(hd), 'header-dimensions no longer draws its own hover line');
  const footer = read('sections/theme-footer.storelib');
  ok(!/<collapsible-block/.test(footer) && /data-footer-acc-toggle/.test(footer) && /grid-template-rows: 0fr/.test(footer), 'footer columns use the grid-rows accordion, not the theme slide script');
  ok(/storelib:section-load/.test(footer) && /window\.MateriaFooterAccordion/.test(footer), 'footer accordion binds once and resyncs after a builder redraw');
}

/* ---------- rendered ---------- */
let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({ Liquid } = require(p)); break; } catch { /* next */ }
}
if (!Liquid) {
  console.log(`${checks} header round 4 checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
  process.exit(0);
}

const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
function engine(groups = {}) {
  const e = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, strictVariables: false, jsTruthy: false, lenientIf: true,
    fs: {
      readFileSync: f => clean(body(fs.readFileSync(f, 'utf8'))), readFile: async f => clean(body(fs.readFileSync(f, 'utf8'))),
      existsSync: f => fs.existsSync(f), exists: async f => fs.existsSync(f),
      resolve: (dir, file, ext) => path.join(dir, file + ext), contains: () => true, dirname: path.dirname, sep: '/',
    },
  });
  const block = (name, write) => ({
    parse(tok, remain) { this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:end' + name, () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed ' + name); }); s.start(); },
    * render(ctx, em) { if (!write) return; em.write(write[0]); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em); em.write(write[1]); },
  });
  e.registerTag('style', block('style', ['<style>', '</style>']));
  e.registerTag('stylesheet', block('stylesheet', ['<style>', '</style>']));
  e.registerTag('javascript', block('javascript', null));
  e.registerTag('form', block('form', ['<form>', '</form>']));
  e.registerTag('paginate', block('paginate', ['', '']));
  for (const tag of ['sections', 'section']) e.registerTag(tag, { parse(tok) { this.name = tok.args.replace(/['"]/g, '').trim(); }, * render(ctx, em) { em.write(groups[this.name] || ''); } });
  e.registerFilter('t', k => String(k).split('.').pop().replace(/_/g, ' '));
  e.registerFilter('asset_url', k => '/assets/' + k);
  e.registerFilter('stylesheet_tag', u => `<link rel="stylesheet" href="${u}">`);
  e.registerFilter('image_url', (v, ...a) => {
    const src = typeof v === 'string' ? v : (v && (v.src || v.url)) || '';
    const w = a.find(x => Array.isArray(x) && x[0] === 'width');
    return src + (w && w[1] ? '?width=' + w[1] : '');
  });
  e.registerFilter('image_tag', (u, ...a) => `<img src="${u}" ${a.filter(Array.isArray).filter(([k]) => k !== 'widths').map(([k, v]) => `${k}="${v ?? ''}"`).join(' ')}>`);
  e.registerFilter('json', v => JSON.stringify(v));
  for (const f of ['font_face', 'font_url', 'payment_type_svg_tag', 'inline_asset_content']) e.registerFilter(f, () => '');
  for (const f of ['font_modify', 'color_to_rgb', 'color_modify', 'color_mix', 'url', 'within']) e.registerFilter(f, v => v);
  e.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
  e.registerFilter('color_brightness', () => 128);
  e.registerFilter('money', v => '$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('handleize', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return e;
}
const L = (title, url, links = []) => ({ title, url, links, handle: title.toLowerCase().replace(/\W+/g, '-') });
const img = (n, w = 800, h = 1000) => ({ src: `/img/${n}.svg`, width: w, height: h, aspect_ratio: w / h, alt: n });
const coll = t => ({ title: t, url: '/collections/' + t.toLowerCase(), handle: t.toLowerCase(), featured_image: img(t, 600, 800) });
const MENU = {
  handle: 'main-menu', title: 'Main menu', links: [
    L('Home', '/'),
    L('Shop', '/collections/all', [
      L('Shop Layouts', '/collections/all', [L('Grid [new]', '/l/grid'), L('List', '/l/list'), L('Masonry [HOT]', '/l/masonry')]),
      L('Shop Pages', '/collections/all', [L('Filters', '/l/filters'), L('Infinite scroll [new]', '/l/infinite')]),
      L('Product Pages', '/collections/all', [L('Gallery', '/l/gallery'), L('Sticky cart [hot]', '/l/sticky')]),
    ]),
    L('Collections', '/collections', [L('Coats', '/c/coats'), L('Bags', '/c/bags')]),
    L('Pages', '/pages', [L('About us', '/pages/about'), L('Contact us', '/pages/contact'), L('FAQ', '/pages/faq')]),
    L('Buy Theme!', '/pages/buy'),
  ],
};
const BLOCKS = [
  { type: 'menu_badges', settings: { hot: 'Hot', new: 'New', label_background_hot: '#e03131', label_color_hot: '#ffffff', label_background_new: '#3b5bdb', label_color_new: '#ffffff', menu_badge_style: 'pill' } },
  { type: 'menu_promotion', settings: { text: 'Shop', full_width: true, promotion_menu_column: 3, promotion_image_width: 40, promotion_image_1: img('Sweaters'), promotion_image_2: img('Handbags'), promotion_link_1: '/collections/sweaters', promotion_label_1: 'Sweaters', promotion_label_2: 'Handbags', promotion_position: 'right', mega_custom_width: 1030 } },
  { type: 'menu_collection', settings: { text: 'Collections', full_width: false, center_submenu: true, collection_menu_column: 1, collection_width: 60, collection_1: coll('Coats'), collection_2: coll('Bags'), mega_custom_width: 900 } },
  { type: 'menu_link_style', settings: { text: 'Buy Theme!', item_label: 'hot', link_color: '#e03131' } },
  { type: 'menu_mobile_banner', settings: { text: 'Shop', image: img('Promo', 800, 500), label: 'New in', heading: 'The winter edit', body: 'Coats and knitwear for colder days.', divider: 'wave', button_label: 'Shop the edit', button_link: '/collections/winter', radius: 16, button_bg: '#111111', button_color: '#ffffff' } },
];

async function renderPage(header = {}) {
  const all = JSON.parse(read('config/settings.json'));
  const theme = { ...all.shopify };
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({ id, settings: v.settings }));
  theme.color_schemes = schemes;
  const group = JSON.parse(read('sections/header-group.json'));
  const hset = { ...group.sections.header.settings, logo_position: 'left', ...header, mega_menu: MENU };
  hset.color_scheme = { ...(schemes.find(s => s.id === hset.color_scheme) || schemes[0]) };
  const base = {
    settings: theme, request: { host: 'x.test', locale: { iso_code: 'en' }, page_type: 'page', design_mode: false },
    routes: { account_url: '/account', account_login_url: '/account/login', account_logout_url: '/account/logout', root_url: '/', cart_url: '/cart', search_url: '/search' },
    shop: { name: 'Materia', domain: 'x.test', url: 'https://x.test' }, template: { name: 'page' }, cart: { item_count: 0, items: [] }, customer: null,
  };
  const e = engine();
  const hctx = { ...base, section: { id: 'header', settings: hset, blocks: BLOCKS.map((b, i) => ({ id: 'b' + i, shopify_attributes: '', ...b })) } };
  const hdr = await e.parseAndRender(clean(body(read('sections/theme-header.storelib'))), hctx, { globals: hctx });
  const fg = JSON.parse(read('sections/footer-group.json'));
  const [fid, fsec] = Object.entries(fg.sections).find(([, s]) => s.type === 'theme-footer');
  const fmenu = { handle: 'footer', title: 'Footer', links: ['About us', 'Contact', 'FAQ', 'Shipping', 'Returns'].map(t => L(t, '/pages/' + t.toLowerCase().replace(/\W+/g, '-'))) };
  const fblocks = (fsec.block_order || []).map(k => ({ id: k, shopify_attributes: '', type: fsec.blocks[k].type, settings: { ...fsec.blocks[k].settings, ...(typeof fsec.blocks[k].settings.menu === 'string' ? { menu: fmenu } : {}) } }));
  const fctx = { ...base, section: { id: fid, settings: fsec.settings, blocks: fblocks } };
  const ftr = `<div id="shopify-section-${fid}" class="shopify-section">${await e.parseAndRender(clean(body(read('sections/theme-footer.storelib'))), fctx, { globals: fctx })}</div>`;
  const le = engine({ 'header-group': `<div id="shopify-section-header" class="shopify-section section-header">${hdr}</div>`, 'footer-group': ftr });
  return le.parseAndRender(clean(body(read('layout/theme.storelib'))), { ...base, content_for_header: '', content_for_layout: '<main style="min-height:1200px;padding:40px"><h1>Page</h1></main>' }, { globals: base });
}

const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const open = async (header, width, opts = {}) => {
    const html = await renderPage(header);
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 812 : 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}), reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    await p.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.hostname !== 'fixture.test') return r.fulfill({ status: 204, body: '' });
      if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: html });
      if (u.pathname.startsWith('/assets/')) {
        const f = path.join(root, 'shopify/assets', u.pathname.slice(8));
        return fs.existsSync(f) ? r.fulfill({ path: f, contentType: f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : undefined }) : r.fulfill({ status: 404, body: '' });
      }
      if (u.pathname.startsWith('/img/')) return r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#c9b8a6"/></svg>' });
      return r.fulfill({ status: 204, body: '' });
    });
    await p.goto('https://fixture.test/');
    await p.waitForTimeout(900);
    return { p, ctx };
  };
  const topLink = (p, name) => p.locator('.navigation:not(.mobile) .horizontal-list > .level0 > menu-item > a', { hasText: name }).first();
  try {
    /* Desktop: mega menu, badges, banners, dividers, cards. */
    {
      const { p, ctx } = await open({ menu_hover_style: 'underline', menu_hover_color: '#2f6fdb', dropdown_radius: 14, dropdown_shadow: 'medium', mega_card_label: 'pill', mega_column_dividers: true, mega_card_radius: 12, mega_column_gap: 40, dropdowns_speed: 300, dropdowns_smoothness: 100 }, 1366);
      const nav = await p.evaluate(() => {
        const t = document.querySelector('.navigation:not(.mobile)').innerText;
        return { tokens: /\[(hot|new)\]/i.test(document.body.innerText), text: t };
      });
      ok(!nav.tokens, 'no [hot] / [new] tag text reaches the page');
      await topLink(p, 'Shop').hover();
      await p.waitForTimeout(700);
      const mega = await p.evaluate(() => {
        const li = document.querySelector('.navigation:not(.mobile) .level0.visible');
        const sub = li.querySelector(':scope > .submenu');
        const cs = getComputedStyle(sub);
        const labels = [...sub.querySelectorAll('.menu-link .menu_label')].map(l => [l.closest('a').querySelector('.menu-link-text').textContent.trim(), l.textContent.trim(), getComputedStyle(l).backgroundColor, getComputedStyle(l).position]);
        const grid = sub.querySelector('.subchildmenu.grid');
        const cards = [...sub.querySelectorAll('.col-mega .menu-collection')].map(c => {
          const lab = c.querySelector('.menu-card__label'); const im = c.querySelector('img'); const m = c.querySelector('.collection-media');
          return { label: lab && lab.textContent.trim(), labelBg: lab && getComputedStyle(lab).backgroundColor, labelRadius: lab && getComputedStyle(lab).borderTopLeftRadius, radius: getComputedStyle(m).borderTopLeftRadius, h: m.getBoundingClientRect().height, lazy: im && im.getAttribute('loading'), sizes: im && im.getAttribute('sizes'), w: im && im.naturalWidth };
        });
        return { visible: cs.visibility, opacity: cs.opacity, radius: cs.borderBottomLeftRadius, shadow: cs.boxShadow, dur: cs.transitionDuration, ease: cs.transitionTimingFunction, labels, cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length, colGap: getComputedStyle(grid).columnGap, lines: getComputedStyle(grid).backgroundImage, cards };
      });
      ok(mega.visible === 'visible' && mega.opacity === '1', 'the mega menu opens on hover');
      ok(mega.radius === '14px' && /rgba\(0, 0, 0, 0\.16\)/.test(mega.shadow), 'Corner radius and Shadow reach the mega menu');
      ok(/^0\.3s/.test(mega.dur) && /cubic-bezier\(0\.16, 1, 0\.3, 1\)/.test(mega.ease), `Animation speed 300 and Smoothness 100 drive the mega menu (${mega.dur} ${mega.ease})`);
      ok(mega.cols === 3 && mega.colGap === '40px', 'Columns (desktop) and column spacing');
      ok(/repeating-linear-gradient/.test(mega.lines), 'Lines between mega menu columns');
      const byText = Object.fromEntries(mega.labels.map(l => [l[0], l]));
      ok(byText.Grid && byText.Grid[1] === 'New' && byText.Grid[2] === 'rgb(59, 91, 219)', 'a [new] link shows the blue New pill');
      ok(byText.Masonry && byText.Masonry[1] === 'Hot' && byText.Masonry[2] === 'rgb(224, 49, 49)', 'a [HOT] link (any case) shows the red Hot pill');
      ok(mega.labels.every(l => l[3] === 'static'), 'badges in a mega menu sit beside their link, not over it');
      ok(mega.cards.length === 2 && mega.cards.every(c => c.label && c.labelBg === 'rgb(255, 255, 255)' && parseFloat(c.labelRadius) > 100), 'banner labels are white pills on the image');
      ok(mega.cards.every(c => c.radius === '12px' && c.h > 100), 'Image card corner radius, and the cards keep their height');
      ok(mega.cards.every(c => c.lazy === 'lazy' && /min-width: 1025px/.test(c.sizes || '') && c.w > 0), 'menu images load lazily with real sizes');
      // hover style on a mega column link and the top link
      const sub = p.locator('.navigation:not(.mobile) .level0.visible .menu_item-link', { hasText: 'Filters' }).first();
      await sub.hover();
      await p.waitForTimeout(600);
      const hv = await p.evaluate(() => {
        const a = [...document.querySelectorAll('.navigation:not(.mobile) .level0.visible .menu_item-link')].find(x => x.textContent.includes('Filters'));
        const top = document.querySelector('.navigation:not(.mobile) .level0.visible > menu-item > a');
        return { sub: getComputedStyle(a).color, subLine: getComputedStyle(a.querySelector('.menu-link-text'), '::after').transform, top: getComputedStyle(top).color, topLine: getComputedStyle(top.querySelector('span'), '::after').transform };
      });
      ok(hv.sub === 'rgb(47, 111, 219)' && hv.subLine === 'matrix(1, 0, 0, 1, 0, 0)', 'Underline + Hover colour on a mega column link');
      ok(hv.top === 'rgb(47, 111, 219)' && hv.topLine === 'matrix(1, 0, 0, 1, 0, 0)', 'the top link stays underlined while its mega menu is open');
      // top-level badge and colour from Menu link: badge & colour
      const buy = await p.evaluate(() => {
        const a = [...document.querySelectorAll('.navigation:not(.mobile) .horizontal-list > .level0 > menu-item > a')].find(x => x.textContent.includes('Buy Theme!'));
        const lab = a.querySelector('.menu_label'); const r = a.querySelector('span').getBoundingClientRect(); const lr = lab.getBoundingClientRect();
        return { color: getComputedStyle(a).color, label: lab.textContent.trim(), above: lr.bottom <= r.top + 2, tail: getComputedStyle(lab, '::after').display };
      });
      ok(buy.color === 'rgb(224, 49, 49)', 'Menu link: badge & colour paints its link');
      ok(buy.label === 'Hot' && buy.above && buy.tail === 'block', 'the Hot bubble sits above the top-level link and points at it');
      // simple dropdown: card look
      await p.mouse.move(5, 700); await p.waitForTimeout(500);
      await topLink(p, 'Pages').hover();
      await p.waitForTimeout(700);
      const dd = await p.evaluate(() => { const s = document.querySelector('.navigation:not(.mobile) .dropdown-menu.visible > .submenu'); const c = getComputedStyle(s); const a = s.querySelector('.menu_item-link'); return { r: c.borderTopLeftRadius, w: s.getBoundingClientRect().width, pt: c.paddingTop, pl: getComputedStyle(a).paddingLeft }; });
      ok(dd.r === '14px' && Math.round(dd.w) === 260 && dd.pt === '20px' && dd.pl === '30px', `simple dropdown is a rounded card with Dropdown width and padding (${JSON.stringify(dd)})`);
      await ctx.close();
    }
    /* Every hover style. */
    for (const [style, expect] of Object.entries({
      none: { color: false, line: false, fade: false, chip: false },
      underline: { color: true, line: true, fade: false, chip: false },
      underline_reverse: { color: true, line: true, fade: false, chip: false },
      fade: { color: false, line: false, fade: true, chip: false },
      color: { color: true, line: false, fade: false, chip: false },
      highlight: { color: true, line: false, fade: false, chip: true },
    })) {
      const { p, ctx } = await open({ menu_hover_style: style, menu_hover_color: '#2f6fdb' }, 1366);
      await topLink(p, 'Pages').hover();
      await p.waitForTimeout(600);
      await p.locator('.navigation:not(.mobile) .dropdown-menu.visible .menu_item-link', { hasText: 'Contact us' }).first().hover();
      await p.waitForTimeout(600);
      const r = await p.evaluate(() => {
        const links = [...document.querySelectorAll('.navigation:not(.mobile) .dropdown-menu.visible .menu_item-link')];
        const on = links.find(a => a.textContent.includes('Contact us')), off = links.find(a => a.textContent.includes('FAQ'));
        const top = document.querySelector('.navigation:not(.mobile) .level0.visible > menu-item > a');
        return { onColor: getComputedStyle(on).color, offOpacity: getComputedStyle(off).opacity, line: getComputedStyle(on.querySelector('.menu-link-text'), '::after').transform, topColor: getComputedStyle(top).color, chip: getComputedStyle(top.querySelector('span'), '::before').opacity, subBg: getComputedStyle(on).backgroundColor };
      });
      ok((r.onColor === 'rgb(47, 111, 219)') === expect.color && (r.topColor === 'rgb(47, 111, 219)') === expect.color, `${style}: hover colour on dropdown and top links (${r.onColor} / ${r.topColor})`);
      ok((r.line === 'matrix(1, 0, 0, 1, 0, 0)') === expect.line, `${style}: underline (${r.line})`);
      ok((Number(r.offOpacity) < 0.6) === expect.fade, `${style}: the other links fade (${r.offOpacity})`);
      ok((expect.chip ? r.chip === '1' && r.subBg !== 'rgba(0, 0, 0, 0)' : r.subBg === 'rgba(0, 0, 0, 0)'), `${style}: soft highlight (${r.chip} ${r.subBg})`);
      await ctx.close();
    }
    /* Keep previous choice reads Typography's saved value; reduced motion; label below. */
    {
      const { p, ctx } = await open({ menu_hover_style: 'inherit', mega_card_label: 'below', dropdowns_speed: 800 }, 1366, { reduced: true });
      const attr = await p.evaluate(() => document.querySelector('header.header').getAttribute('data-menu-hover'));
      const saved = JSON.parse(read('config/settings.json')).shopify.menu_hover_style || 'underline';
      ok(attr === saved, `Keep previous choice uses the saved theme value (${attr})`);
      await topLink(p, 'Collections').hover();
      await p.waitForTimeout(300);
      const r = await p.evaluate(() => { const s = document.querySelector('.navigation:not(.mobile) .level0.visible > .submenu'); const lab = s.querySelector('.menu-card__label'); return { dur: getComputedStyle(s).transitionDuration, op: getComputedStyle(s).opacity, pos: getComputedStyle(lab.closest('.collection-info')).position }; });
      ok(r.op === '1' && /^0s/.test(r.dur), 'under reduced motion the mega menu opens at once');
      ok(r.pos === 'static', 'Image card label: text under the image');
      await ctx.close();
    }
    /* Phone drawer: submenu header row, rows, banner; footer accordion. */
    {
      const { p, ctx } = await open({ menu_mobile_chevrons: true, menu_mobile_dividers: true }, 375);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= 375), 'no sideways scroll at 375px');
      await p.locator('button.nav-toggle').click();
      await p.waitForTimeout(800);
      await p.locator('.navigation.mobile .horizontal-list > .level0 > menu-item', { hasText: 'Shop' }).locator('> open-children-toggle').click();
      await p.waitForTimeout(800);
      const d = await p.evaluate(() => {
        const sub = document.querySelector('.navigation.mobile .is-open + .submenu');
        const bar = sub.querySelector('.mm-sub-title-bar');
        const back = bar.querySelector('back-menu'), close = bar.querySelector('close-menu');
        const rows = [...sub.querySelectorAll('.subchildmenu > .menu-link > menu-item')];
        const banner = sub.querySelector('.menu-mobile-banner');
        const btn = banner && banner.querySelector('.menu-mobile-banner__button');
        const r = el => el.getBoundingClientRect();
        return {
          bar: !!(back && close && back.textContent.trim() === 'Shop'), closeSize: [r(close).width, r(close).height],
          rows: rows.map(m => [getComputedStyle(m).borderBottomStyle, !!m.querySelector('open-children-toggle')]),
          banner: !!banner, parts: banner && ['.menu-mobile-banner__label', '.menu-mobile-banner__heading', '.menu-mobile-banner__text', '.menu-mobile-banner__wave', 'img'].every(s => banner.querySelector(s)),
          btn: btn && { h: r(btn).height, radius: getComputedStyle(btn).borderTopLeftRadius, bg: getComputedStyle(btn).backgroundColor, color: getComputedStyle(btn).color, href: btn.getAttribute('href') },
          scroll: getComputedStyle(sub).overflowY, desktopHidden: !!document.querySelector('.navigation:not(.mobile) .menu-mobile-banner.hidden-1025'),
        };
      });
      ok(d.bar && d.closeSize.every(n => n >= 44), 'submenu header: back chevron with the title and a 44px close');
      ok(d.rows.length === 3 && d.rows.every(([b, arrow]) => b === 'solid' && arrow), 'submenu rows have dividers and right arrows');
      ok(d.banner && d.parts, 'the Mobile menu banner shows under the Shop submenu: picture, label, heading, text, wave');
      ok(d.btn && d.btn.h >= 44 && parseFloat(d.btn.radius) > 20 && d.btn.bg === 'rgb(17, 17, 17)' && d.btn.color === 'rgb(255, 255, 255)' && d.btn.href === '/collections/winter', 'banner pill button with its colours and link');
      ok(d.scroll === 'auto', 'the submenu scrolls so the banner is reachable');
      ok(d.desktopHidden, 'the banner is phone-only');
      await p.locator('.navigation.mobile .is-open + .submenu back-menu').first().click();
      await p.waitForTimeout(600);
      await p.locator('.navigation.mobile .horizontal-list > .level0 > menu-item', { hasText: 'Pages' }).locator('> open-children-toggle').click();
      await p.waitForTimeout(800);
      const leafArrows = await p.evaluate(() => [...document.querySelectorAll('.navigation.mobile .is-open + .submenu .subchildmenu > .menu-link > menu-item')].map(m => getComputedStyle(m, '::after').borderTopWidth));
      ok(leafArrows.length === 3 && leafArrows.every(w => parseFloat(w) >= 1), 'Arrow on every row draws one on links with no submenu');
      await p.locator('.navigation.mobile .is-open + .submenu close-menu').first().click();
      await p.waitForTimeout(700);

      // footer accordion
      const heights = i => p.evaluate(n => Math.round(document.querySelectorAll('[data-footer-acc] .footer-acc__panel')[n].getBoundingClientRect().height), i);
      const toggles = p.locator('[data-footer-acc-toggle]');
      const n = await toggles.count();
      ok(n >= 2, 'footer columns have accordion buttons');
      const i = 1;
      await toggles.nth(i).scrollIntoViewIfNeeded();
      ok(await heights(i) === 0 && await toggles.nth(i).getAttribute('aria-expanded') === 'false', 'a footer column starts closed on phones');
      await toggles.nth(i).click();
      const seq = [];
      for (let k = 0; k < 8; k++) { seq.push(await heights(i)); await p.waitForTimeout(45); }
      await p.waitForTimeout(400);
      const full = await heights(i);
      ok(full > 100 && seq.some(h => h > 0 && h < full) && seq.every((h, k) => k === 0 || h >= seq[k - 1]), `the column opens smoothly on its height (${seq.join(' ')} -> ${full})`);
      ok(await toggles.nth(i).getAttribute('aria-expanded') === 'true', 'aria-expanded follows');
      await toggles.nth(i).click();
      await p.waitForTimeout(600);
      ok(await heights(i) === 0, 'a second tap closes it');
      await toggles.nth(i).click(); await toggles.nth(i).click();
      await p.waitForTimeout(600);
      ok(await heights(i) === 0 && await toggles.nth(i).getAttribute('aria-expanded') === 'false', 'two quick taps leave it closed, never stuck halfway');
      await p.evaluate(() => {
        const sec = document.querySelector('[data-footer-acc]').closest('.shopify-section');
        sec.innerHTML = sec.innerHTML;
        sec.querySelectorAll('script').forEach(o => { const s = document.createElement('script'); s.textContent = o.textContent; o.replaceWith(s); });
        sec.dispatchEvent(new CustomEvent('storelib:section-load', { bubbles: true, detail: { sectionId: sec.id } }));
      });
      await p.waitForTimeout(100);
      await toggles.nth(i).click();
      await p.waitForTimeout(600);
      ok(await heights(i) > 100, 'after a builder redraw one tap opens it (no double binding)');
      await ctx.close();
    }
    {
      const { p, ctx } = await open({}, 1366);
      const f = await p.evaluate(() => [...document.querySelectorAll('[data-footer-acc]')].map(a => { const panel = a.querySelector('.footer-acc__panel'); const b = a.querySelector('[data-footer-acc-toggle]'); return [panel ? panel.getBoundingClientRect().height : 1, b && b.getAttribute('tabindex')]; }));
      ok(f.every(([h, t]) => h > 0 && (t === null || t === '-1')), 'on desktop every footer column is open and its heading is not a tab stop');
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} header round 4 checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
