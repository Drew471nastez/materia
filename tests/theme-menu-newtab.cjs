/* Run: node tests/theme-menu-newtab.cjs   (exits 1 on any failure)
   "Open in a new tab" on menu links, per link, on every path that draws a
   menu: the desktop menu and its mega menus and dropdowns, the phone drawer
   (snippets/horizontal-menu + submenu-list), the vertical categories menu
   (vertical-menu + submenu-vertical) and the footer's menu columns
   (sections/theme-footer).

   Navigation stores a link's "Open in a new tab" as #_blank on its address
   (see config/settings.json "menus"). A menu block's own toggle
   (open_link_newtab) flags its one top link. A link gets
   target="_blank" rel="noopener noreferrer" only when it is flagged, on this
   site or another, and #_blank never reaches an href.

   Rendered with liquidjs when it can be loaded (LIQUIDJS=<path to liquidjs>
   or installed); the static checks run either way. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
let checks = 0;

/* Static: the snippet has no host gate, and every menu link goes through it. */
{
  const snippet = body(read('snippets/link-target.storelib'));
  assert.ok(!/external/.test(snippet.replace(/\{%-?\s*comment[\s\S]*?endcomment\s*-?%\}/, '')), 'link-target still gates the target on the link being external');
  assert.match(snippet, /#_blank/, 'link-target reads the Navigation flag (#_blank)');
  assert.match(snippet, /target="_blank" rel="noopener noreferrer"/, 'link-target writes target and rel together');
  checks += 3;
  const files = ['snippets/horizontal-menu.storelib', 'snippets/submenu-list.storelib', 'snippets/vertical-menu.storelib', 'snippets/submenu-vertical.storelib', 'sections/theme-footer.storelib'];
  for (const f of files) {
    const text = body(read(f));
    // every <a ...> whose href prints a menu link's url, up to the tag's own >
    // (a > inside {{ }} or {% %} is Liquid, not the end of the tag)
    const tagAt = i => {
      let j = text.lastIndexOf('<a', i);
      const start = j;
      while (j < text.length) {
        if (text.startsWith('{{', j) || text.startsWith('{%', j)) { j = text.indexOf(text[j + 1] === '{' ? '}}' : '%}', j) + 2; continue; }
        if (text[j] === '>') return text.slice(start, j + 1);
        j++;
      }
      return text.slice(start);
    };
    const anchors = [...text.matchAll(/href="\{\{\s*(link|child_link|grandchild_link)\.url/g)].map(m => [tagAt(m.index), m[1]]);
    assert.ok(anchors.length > 0, `${f}: no menu link found`);
    for (const [tag, v] of anchors) {
      assert.match(tag, new RegExp(`\\{\\{\\s*${v}\\.url \\| remove: '#_blank'\\s*\\}\\}`), `${f}: ${v}.url printed with the #_blank marker`);
      assert.match(tag, new RegExp(`render 'link-target',[^%]*link: ${v}\\b`), `${f}: a ${v} anchor skips link-target`);
      checks += 2;
    }
  }
}

let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({ Liquid } = require(p)); break; } catch { /* try the next */ }
}

(async () => {
  if (!Liquid) {
    console.log(`${checks} menu new-tab checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
    return;
  }
  const sep = '/';
  const engine = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, jsTruthy: false,
    fs: {
      readFileSync: f => body(fs.readFileSync(f, 'utf8')), readFile: async f => body(fs.readFileSync(f, 'utf8')),
      existsSync: f => fs.existsSync(f), exists: async f => fs.existsSync(f),
      resolve: (dir, file, ext) => path.join(dir, file + ext), contains: () => true, dirname: path.dirname, sep,
    },
  });
  for (const tag of ['style', 'stylesheet', 'javascript']) {
    engine.registerTag(tag, {
      parse(tok, remain) { this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:end' + tag, () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed ' + tag); }); s.start(); },
      * render() {},
    });
  }
  engine.registerFilter('t', k => String(k).split('.').pop());
  engine.registerFilter('asset_url', k => '/assets/' + k);
  engine.registerFilter('stylesheet_tag', () => '');
  engine.registerFilter('image_url', v => String(v || ''));
  engine.registerFilter('image_tag', () => '<img alt="">');
  // liquidjs takes no comment block inside {% liquid %}; Storelib does.
  const clean = s => s.replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '');

  const L = (title, url, links = [], extra = {}) => ({ title, url, links, ...extra });
  const menu = {
    handle: 'main-menu', title: 'Main menu',
    links: [
      L('Home', '/'),
      L('Shop', '/collections/all#_blank', [
        L('Tees', '/collections/tees'),
        L('Sale', '/collections/sale#_blank', [L('Last', '/collections/last#_blank'), L('Old', '/collections/old')]),
      ]),
      L('Blog', 'https://example.com/blog'),
      L('Insta', 'https://instagram.com/materia#_blank'),
      L('Mega', '/pages/mega', [L('Inside', '/pages/inside')]),
      L('Prop', '/pages/prop', [], { target: '_blank' }),
      L('Same host', 'https://andrewrullz.storelib.com/pages/a'),
    ],
  };
  // Flagged in Navigation (#_blank, or a target the engine hands over)...
  const navFlagged = new Set(['/collections/all', '/collections/sale', '/collections/last', 'https://instagram.com/materia', '/pages/prop']);
  // ...and, in the horizontal menu, Mega by its block's own toggle.
  const megaFlagged = new Set([...navFlagged, '/pages/mega']);
  const all = new Set();
  const walk = ls => ls.forEach(l => { all.add(l.url.replace('#_blank', '')); walk(l.links); });
  walk(menu.links);

  const verify = (name, html, mustSee, flagged = navFlagged) => {
    const seen = new Set();
    for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
      const href = (tag.match(/href="([^"]*)"/) || [])[1];
      if (href == null) continue;
      assert.ok(!href.includes('#_blank'), `${name}: ${href} still carries #_blank`);
      if (!all.has(href)) continue;
      seen.add(href);
      const target = /\btarget="_blank"/.test(tag);
      assert.equal(target, flagged.has(href), `${name}: ${href} ${flagged.has(href) ? 'should' : 'should not'} open in a new tab\n${tag}`);
      if (target) assert.match(tag, /rel="noopener noreferrer"/, `${name}: ${href} opens a new tab without rel`);
      checks++;
    }
    for (const href of mustSee) assert.ok(seen.has(href), `${name}: ${href} was not drawn`);
  };

  // Desktop and phone drawer: snippets/horizontal-menu (both navs) with a mega
  // block on "Mega" whose own toggle is on, and one on "Shop" whose toggle is off.
  const megaBlock = (id, text, newtab) => ({ id, type: 'menu_promotion', shopify_attributes: '', settings: { text, open_link_newtab: newtab, item_label: 'unset', promotion_menu_column: 2, promotion_image_width: 30, mega_custom_width: 900 } });
  const section = {
    id: 'header',
    settings: { mega_menu: menu, categories_menu: menu, redirect_to_link: false, dropdowns_animation: 'fade', section_width: 'container', menu_tab: 'unset', menu_mobile_title_type: 'text' },
    blocks: [megaBlock('m1', 'Mega', true), megaBlock('m2', 'Shop', false)],
  };
  const ctx = { section, settings: { menu_font: 'body_font' }, request: { host: 'andrewrullz.storelib.com', locale: { iso_code: 'en' } }, routes: { account_url: '/account', account_login_url: '/account/login' }, shop: { domain: 'andrewrullz.storelib.com', url: 'https://andrewrullz.storelib.com' }, template: { name: 'index' } };
  const hm = await engine.parseAndRender(clean(body(read('snippets/horizontal-menu.storelib'))), ctx);
  verify('horizontal-menu', hm, [...all], megaFlagged);
  // both the desktop and the phone navs drew the flagged top link
  assert.ok((hm.match(/href="\/collections\/all"[^>]*target="_blank"/g) || []).length >= 2, 'horizontal-menu: desktop and drawer both flag Shop');

  const vm = await engine.parseAndRender(clean(body(read('snippets/vertical-menu.storelib'))), ctx);
  verify('vertical-menu', vm, ['/', '/collections/all', 'https://instagram.com/materia']);
  const sv = await engine.parseAndRender(clean(body(read('snippets/submenu-vertical.storelib'))), { ...ctx, link: menu.links[1] });
  verify('submenu-vertical', sv, ['/collections/tees', '/collections/sale']);

  // Footer menu column: the loop as theme-footer draws it.
  const footer = body(read('sections/theme-footer.storelib'));
  const loop = footer.match(/\{%-?\s*for link in block_st\.menu\.links\s*-?%\}[\s\S]*?\{%-?\s*endfor\s*-?%\}/);
  assert.ok(loop, 'theme-footer menu loop not found');
  const ft = await engine.parseAndRender(loop[0], { ...ctx, block_st: { menu } });
  verify('theme-footer', ft, menu.links.map(l => l.url.replace('#_blank', '')));

  // The snippet alone: explicit toggles, legacy id, nothing flagged.
  const lt = (vars) => engine.parseAndRender(body(read('snippets/link-target.storelib')), vars).then(s => s.trim());
  assert.equal(await lt({ url: '/pages/a', new_tab: true }), 'target="_blank" rel="noopener noreferrer"', 'a same-site link with its toggle on opens a new tab');
  assert.equal(await lt({ url: 'https://example.com', new_tab: false }), '', 'an outside link with its toggle off stays');
  assert.equal(await lt({ url: '/pages/a', legacy_new_tab: true }), 'target="_blank" rel="noopener noreferrer"', 'the legacy id is read');
  assert.equal(await lt({ url: '/pages/a' }), '', 'nothing flagged, no target');
  assert.equal(await lt({ link: L('x', '/x', [], { new_tab: true }) }), 'target="_blank" rel="noopener noreferrer"', 'a link.new_tab property is read');
  checks += 5;
  console.log(`${checks} menu new-tab checks passed`);
})().catch(e => { console.error(e.message || e); process.exit(1); });
