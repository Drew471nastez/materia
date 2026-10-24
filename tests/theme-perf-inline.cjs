/* Run: node tests/theme-perf-inline.cjs
   Inline weight of the cart drawer, sticky header and activation gate
   snippets. Their static CSS and JS are cached asset files (Storelib serves
   assets immutable, fingerprinted), so a page change no longer downloads and
   parses them inline. Static checks on the repository files, no browser. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };

// Bytes of inline <style>/<script> (not <script src>) a file draws.
const inlineBytes = src => [...src.matchAll(/<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
  .filter(m => !/\bsrc=/.test(m[2])).reduce((n, m) => n + Buffer.byteLength(m[3]), 0);
const part = (src, name) => {
  const a = src.indexOf(`/* == ${name} == */`), b = src.indexOf(`/* == end ${name} == */`);
  assert.ok(a >= 0 && b > a, `part ${name}`);
  return src.slice(a, b);
};

const files = {
  sticky: 'snippets/header-sticky-controller.storelib',
  presentation: 'snippets/cart-drawer-presentation.storelib',
  polish: 'snippets/cart-drawer-polish.storelib',
  sheets: 'snippets/cart-drawer-sheets.storelib',
  addons: 'snippets/cart-drawer-addons.storelib',
  minicart: 'snippets/minicart.storelib',
  body: 'snippets/minicart-form-body.storelib',
  guard: 'snippets/materia-guard.storelib',
};
const src = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, read(f)]));
const css = read('shopify/assets/cart-drawer.css');
const js = read('shopify/assets/cart-drawer.js');
const scheme = read('shopify/assets/cart-drawer-scheme.css');
const guardJs = read('shopify/assets/materia-guard.js');
const extras = read('shopify/assets/header-sticky-extras.js');

// 1. The moved blocks are gone from the snippets.
for (const k of ['presentation', 'polish', 'sheets', 'addons', 'body']) ok(inlineBytes(src[k]) === 0, `${files[k]} draws no inline CSS or JS`);
ok(!src.addons.includes('data-cda-styles') && !src.body.includes("slot: 'styles'"), 'add-on styles are not drawn per drawer render or cart refresh');
ok(!/HARD GUARANTEE|#shipping \.addon-actions \.btn-save/.test(src.minicart), 'the static scheme rules left snippets/minicart');
ok(/<style data-cart-drawer-style="scheme">\s*\{%- if settings\.cart_freeship_custom_color_enable[\s\S]*?\{%- endif -%\}\s*\{% comment %\}\{% endcomment %\}<\/style>/.test(src.minicart), 'only the free shipping fill colour stays inline, still named "scheme" for the editor');
ok(!/app\.materiathemes\.com\/api|function serverStatus/.test(src.guard) && inlineBytes(src.guard) < 400, 'the gate script left the snippet');
ok(!/StorelibOverlayFade|StorelibPageshowUnlock|StorelibMenuLayer/.test(src.sticky), 'shopper-only parts of the sticky controller left the snippet');

// 2. ...and are in the assets, in the order they were drawn, with their guards.
const order = (text, names) => names.map(n => text.indexOf(`/* == ${n} == */`));
const cssOrder = order(css, ['snippets/cart-drawer-addons', 'snippets/cart-drawer-presentation', 'snippets/cart-drawer-polish', 'snippets/cart-drawer-sheets']);
ok(cssOrder.every((v, i) => v >= 0 && (i === 0 || v > cssOrder[i - 1])), 'cart-drawer.css: addons, presentation, polish, sheets');
ok(part(css, 'snippets/cart-drawer-addons').includes('.cda-trust, .cda-urgency, .cda-announce'), 'add-on rules');
ok(part(css, 'snippets/cart-drawer-sheets').includes('#minicart_wrapper.open_drawer .minicart__wrapper .minicart-scroll { display: flex; flex-direction: column; }'), 'sheet rules');
ok(part(css, 'snippets/cart-drawer-polish').length > 4000 && part(css, 'snippets/cart-drawer-presentation').length > 60000, 'polish and presentation rules');
// The fill colour set inline after this file is !important; the only fill rule here is the plain base one.
ok(scheme.includes('cart-notification.minicart .minicart__wrapper') && (scheme.match(/cart_shipping__fill|percent_shipping_bar/g) || []).length === 2 &&
  scheme.includes('.minicart-form .cart_shipping__fill {\n    background: var(--color-text, #111111);\n  }'), 'cart-drawer-scheme.css holds the static scheme rules; the inline fill colour still wins');
const jsOrder = order(js, ['snippets/cart-drawer-addons', 'snippets/cart-drawer-polish', 'snippets/cart-drawer-sheets']);
ok(jsOrder.every((v, i) => v >= 0 && (i === 0 || v > jsOrder[i - 1])), 'cart-drawer.js: addons, polish, sheets');
ok(/window\.__cdaUrgencyInterval/.test(part(js, 'snippets/cart-drawer-addons')) && /window\.cdaTick = cdaTick/.test(js), 'urgency timer and window.cdaTick');
ok(/if \(window\.__materiaDrawerPresentationV6\) return;/.test(part(js, 'snippets/cart-drawer-polish')), 'polish keeps its window flag');
ok(/if \(window\.__materiaCartSheetsV2\) return;/.test(part(js, 'snippets/cart-drawer-sheets')), 'sheets keeps its window flag');
for (const name of ['snippets/cart-drawer-addons', 'snippets/cart-drawer-polish', 'snippets/cart-drawer-sheets']) ok(/^\/\* == [^\n]+\n try \{|^\/\* == [^\n]+\ntry \{/.test(part(js, name)) && js.includes(`} catch (error) { setTimeout(() => { throw error; }); }\n/* == end ${name} == */`), `${name}: an error is still reported and does not stop the next part`);
for (const [name, text] of [['cart-drawer.js', js], ['materia-guard.js', guardJs], ['header-sticky-extras.js', extras]]) { new Function(text); ok(true, name + ' parses'); }
for (const [name, text] of [['cart-drawer.css', css], ['cart-drawer-scheme.css', scheme], ['cart-drawer.js', js], ['materia-guard.js', guardJs], ['header-sticky-extras.js', extras]]) ok(!/\{\{|\{%/.test(text), name + ' reads no setting');
// The gate: same endpoints and fail-open paths, values from the inline config.
for (const s of ['https://app.materiathemes.com/api/heartbeat', 'https://app.materiathemes.com/api/theme', '__MATERIA_LICENSE_KEY__', 'finish("ok", false); }, 6000)', '.catch(function(){ finish("ok", false); })', 'if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);']) ok(guardJs.includes(s), 'materia-guard.js keeps ' + s.slice(0, 50));
ok(/var SHOP\s+= CFG\.shop;/.test(guardJs) && /var SHOPNAME = CFG\.name;/.test(guardJs) && /var THEME\s+= CFG\.theme/.test(guardJs), 'gate values come from window.__materiaGuard');
ok(/window\.__materiaGuard = \{ shop: \{\{ shop\.permanent_domain \| json \}\}, name: \{\{ shop\.name \| json \}\}, theme: \{ id: "\{\{ theme\.id \}\}", name: \{\{ theme\.name \| json \}\}, role: "\{\{ theme\.role \}\}" \} \};/.test(src.guard), 'the snippet passes the same values');
ok(['StorelibOverlayFade', 'StorelibPageshowUnlock', 'StorelibMenuLayer'].every(f => extras.includes(`window.${f}`)), 'header-sticky-extras.js keeps the guards');

// 3. The page loads them: the layout renders the snippets that link the assets.
const layout = read('layout/theme.storelib');
ok(/\{%- render 'minicart' -%\}/.test(layout) && /\{% render 'materia-guard' %\}/.test(layout), 'layout renders minicart and materia-guard');
ok(/\{%- unless carrier -%\}\s*\{% render 'cart-drawer-presentation' %\}[\s\S]*?\{% render 'cart-drawer-sheets' %\}\s*\{%- endunless -%\}/.test(src.minicart), 'the drawer renders the snippets that load its assets (not the editor copy)');
ok(src.presentation.includes("{{ 'cart-drawer.css' | asset_url | stylesheet_tag }}"), 'cart-drawer.css linked where the drawer styles were');
ok(src.sheets.includes(`<script src="{{ 'cart-drawer.js' | asset_url }}" defer="defer"></script>`), 'cart-drawer.js deferred');
ok(src.minicart.indexOf("{%- unless carrier -%}{{ 'cart-drawer-scheme.css' | asset_url | stylesheet_tag }}{%- endunless -%}") >= 0 &&
  src.minicart.indexOf("'cart-drawer-scheme.css'") < src.minicart.indexOf('<style data-cart-drawer-style="scheme">'), 'cart-drawer-scheme.css linked just before the inline scheme block');
ok(src.guard.indexOf('window.__materiaGuard =') < src.guard.indexOf(`<script src="{{ 'materia-guard.js' | asset_url }}" defer="defer"></script>`), 'gate config, then the deferred gate');
ok(src.sticky.includes(`<script src="{{ 'header-sticky-extras.js' | asset_url }}" defer="defer"></script>`), 'sticky extras deferred');
const sections = read('sections/theme-header.storelib');
ok(sections.includes("{% render 'header-sticky-controller'"), 'the header renders the sticky controller');

// 4. The sticky controller measures without forcing layout while the page arrives.
const stickyJs = src.sticky.match(/<script>([\s\S]*?)<\/script>/)[1];
ok(/borderBoxSize/.test(stickyJs) && !/const headerHeight = header\.offsetHeight/.test(stickyJs), 'header height from the ResizeObserver, not offsetHeight per frame');
ok(!/getComputedStyle\(document\.documentElement\)\.getPropertyValue\('--storelib-header-top'\)/.test(stickyJs) && /get top\(\)/.test(stickyJs), 'bar offset shared, not read back from computed style');
ok((stickyJs.match(/document\.readyState === 'loading'\) document\.addEventListener\('DOMContentLoaded'/g) || []).length === 2, 'page-wide childList observers start once the page has arrived');
ok(/let measured = document\.readyState === 'complete';/.test(stickyJs) && /addEventListener\('scroll', seen, \{passive: true, once: true\}\)/.test(stickyJs), 'scroll position not read before the page is scrolled or shown');
ok(!/subtree:\s*true,\s*childList:\s*true,\s*attributes:\s*true/.test(stickyJs.replace(/\s+/g, ' ')), 'no page-wide attribute observer');

// 5. Budget: inline CSS + JS these snippets put on every page.
const budget = 32000;
const total = Object.values(src).reduce((n, s) => n + inlineBytes(s), 0);
ok(total <= budget, `inline CSS+JS of these snippets is ${total} bytes, budget ${budget}`);
console.log(`${checks} inline weight checks passed (${total} inline bytes in the drawer, sticky header and gate snippets, budget ${budget})`);
