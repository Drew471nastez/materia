/* Run: node tests/theme-cards-wishlist.cjs
   Product card wishlist hearts, the wishlist page, the Modern card, vendor
   and short description, and the cart drawer's "You may also like" button.
   The repository's own snippets/product-item, sections/page-wishlist,
   snippets/product-card-custom-actions, snippets/cart-recommend-custom-button
   and snippets/theme-controls are rendered through a small Liquid subset
   (the same one tests/theme-product-cards.cjs uses), then drawn in Chromium
   on a real origin (so localStorage works) with the theme's real CSS, the
   wishlist store and button-wishlist from assets/theme.js, and
   assets/wishlist.js. The wishlist page's product endpoint
   (/search?q=id:...&section_id=page-wishlist, which Storelib answers with
   the section drawn with search.results) is mocked by rendering that same
   section. It does not replace Storelib's renderer or a live-site check. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

/* ───────────── A small Liquid subset, enough for these templates ───────────── */
const T = {
  'products.product.actions.add_to_cart.default.label': 'Add to cart',
  'products.product.actions.add_to_cart.sold_out.label': 'Sold out',
  'products.product.actions.wishlist.add': 'Add to wishlist',
  'products.product.actions.wishlist.remove': 'Remove from wishlist',
  'products.product.actions.wishlist.redirect': 'Browse wishlist',
  'products.product.label.sale_label': 'Sale',
  'products.product.sold_out': 'Sold out',
  'products.product.pre_order': 'Pre-order',
  'products.product.label.new_label': 'New',
  'products.product.label.subscription': 'Subscription',
  'products.product.save': 'Save ',
  'accessibility.no_products_found': 'No products found',
  'accessibility.add_collection_tab_hint': 'Add a collection tab',
};
function tokenize(src) {
  const out = []; const re = /\{%-?([\s\S]*?)-?%\}|\{\{-?([\s\S]*?)-?\}\}/g; let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({t: 'text', v: src.slice(last, m.index)});
    const raw = m[0];
    const lt = raw.startsWith('{%-') || raw.startsWith('{{-'), rt = raw.endsWith('-%}') || raw.endsWith('-}}');
    if (m[1] !== undefined) {
      const body = m[1].trim();
      if (/^liquid\b/.test(body)) {
        body.replace(/^liquid\b/, '').split('\n').map(l => l.trim()).filter(Boolean).forEach(l => out.push({t: 'tag', v: l}));
      } else out.push({t: 'tag', v: body, lt, rt});
    } else out.push({t: 'out', v: m[2].trim(), lt, rt});
    last = re.lastIndex;
  }
  if (last < src.length) out.push({t: 'text', v: src.slice(last)});
  for (let i = 0; i < out.length; i++) {
    if (out[i].lt && out[i - 1]?.t === 'text') out[i - 1].v = out[i - 1].v.replace(/\s+$/, '');
    if (out[i].rt && out[i + 1]?.t === 'text') out[i + 1].v = out[i + 1].v.replace(/^\s+/, '');
  }
  return out;
}
function parse(tokens) {
  let i = 0;
  const name = tok => tok.v.split(/\s+/)[0];
  function block(ends) {
    const nodes = [];
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.t === 'tag' && ends.includes(name(tok))) return nodes;
      i++;
      if (tok.t !== 'tag') { nodes.push(tok); continue; }
      const n = name(tok), rest = tok.v.slice(n.length).trim();
      if (n === 'comment') { while (i < tokens.length && !(tokens[i].t === 'tag' && name(tokens[i]) === 'endcomment')) i++; i++; continue; }
      if (n === 'if' || n === 'unless') {
        const branches = [{cond: rest, neg: n === 'unless', body: block(['elsif', 'else', 'endif', 'endunless'])}];
        while (i < tokens.length) {
          const e = tokens[i++], en = name(e);
          if (en === 'elsif') branches.push({cond: e.v.slice(5).trim(), body: block(['elsif', 'else', 'endif', 'endunless'])});
          else if (en === 'else') branches.push({cond: null, body: block(['endif', 'endunless'])});
          else break;
        }
        nodes.push({t: 'if', branches});
      } else if (n === 'case') {
        const c = {t: 'case', expr: rest, whens: [], other: null}; block(['when', 'else', 'endcase']);
        while (i < tokens.length) {
          const e = tokens[i++], en = name(e);
          if (en === 'when') c.whens.push({vals: e.v.slice(4).trim(), body: block(['when', 'else', 'endcase'])});
          else if (en === 'else') c.other = block(['endcase']);
          else break;
        }
        nodes.push(c);
      } else if (n === 'for') { const body = block(['endfor', 'else']); if (name(tokens[i]) === 'else') { i++; block(['endfor']); } i++; nodes.push({t: 'for', expr: rest, body}); }
      else if (n === 'capture') { const body = block(['endcapture']); i++; nodes.push({t: 'capture', v: rest, body}); }
      else if (n === 'paginate') { const body = block(['endpaginate']); i++; nodes.push({t: 'block', body}); }
      else if (n === 'form') { const body = block(['endform']); i++; nodes.push({t: 'form', v: rest, body}); }
      else nodes.push({t: 'stmt', n, v: rest});
    }
    return nodes;
  }
  return block([]);
}
const isBlank = v => v == null || v === '' || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
const BLANK = Symbol('blank'), EMPTY = Symbol('empty');
function splitTop(s, sep) { const out = []; let cur = '', q = null; for (const ch of s) { if (q) { if (ch === q) q = null; cur += ch; continue; } if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; } if (ch === sep) { out.push(cur); cur = ''; continue; } cur += ch; } out.push(cur); return out; }
function lookup(ctx, expr) {
  expr = expr.trim();
  expr = expr.replace(/\[(\w+)\]/g, (_, key) => '.' + ctx[key]);
  if (/^'[\s\S]*'$|^"[\s\S]*"$/.test(expr)) return expr.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
  if (expr === 'true') return true; if (expr === 'false') return false;
  if (expr === 'nil' || expr === 'null') return null;
  if (expr === 'blank') return BLANK; if (expr === 'empty') return EMPTY;
  const parts = expr.replace(/\[(\d+)\]/g, '.$1').replace(/\[['"]([^'"]+)['"]\]/g, '.$1').split('.');
  let v = ctx[parts[0]];
  for (const p of parts.slice(1)) {
    if (v == null) return undefined;
    if (p === 'size' && (Array.isArray(v) || typeof v === 'string')) v = v.length;
    else if (p === 'first' && Array.isArray(v)) v = v[0];
    else if (p === 'last' && Array.isArray(v)) v = v[v.length - 1];
    else v = v[p];
  }
  return v;
}
function args(s) { return splitTop(s, ',').map(x => x.trim()).filter(Boolean); }
function filt(ctx, v, f) {
  const i = f.indexOf(':'); const n = (i < 0 ? f : f.slice(0, i)).trim(); const a = i < 0 ? [] : args(f.slice(i + 1)).map(x => lookup(ctx, x));
  switch (n) {
    case 't': return T[v] ?? v;
    case 'default': return isBlank(v) ? a[0] : v;
    case 'escape': return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    case 'strip_html': return String(v ?? '').replace(/<[^>]*>/g, '');
    case 'replace': return String(v ?? '').split(a[0]).join(a[1]);
    case 'split': return String(v ?? '').split(a[0]);
    case 'append': return String(v ?? '') + (a[0] ?? '');
    case 'prepend': return (a[0] ?? '') + String(v ?? '');
    case 'plus': return Number(v || 0) + Number(a[0] || 0);
    case 'minus': return Number(v || 0) - Number(a[0] || 0);
    case 'times': return Number(v || 0) * Number(a[0] || 0);
    case 'divided_by': { const r = Number(v || 0) / Number(a[0]); return Number.isInteger(a[0]) && Number.isInteger(Number(v)) ? Math.floor(r) : r; }
    case 'round': return Math.round(Number(v || 0));
    case 'size': return v == null ? 0 : v.length ?? 0;
    case 'json': return JSON.stringify(v ?? null);
    case 'strip': return String(v ?? '').trim();
    case 'strip_newlines': return String(v ?? '').replace(/\n/g, '');
    case 'money': return 'R$' + (Number(v || 0) / 100).toFixed(2);
    case 'date': return v === 'now' ? Math.floor(Date.now() / 1000) : Math.floor(new Date(v).getTime() / 1000);
    case 'where': return (v || []).filter(x => x[a[0]] === a[1]);
    case 'image_url': return v?.src ?? v;
    case 'truncatewords': { const w = String(v ?? '').split(/\s+/).filter(Boolean); const n = Number(a[0] ?? 15); return w.length > n ? w.slice(0, n).join(' ') + '...' : w.join(' '); }
    case 'stylesheet_tag': return `<link rel="stylesheet" href="${v}">`;
    case 'url': case 'asset_url': return v;
    default: return v;
  }
}
function value(ctx, expr) { const [head, ...fs] = splitTop(expr, '|'); return fs.reduce((v, f) => filt(ctx, v, f), lookup(ctx, head)); }
function cmp(ctx, s) {
  const m = s.match(/^(.+?)\s*(==|!=|>=|<=|>|<|\bcontains\b)\s*(.+)$/);
  if (!m) { const v = lookup(ctx, s); return !(v == null || v === false); }
  const l = lookup(ctx, m[1]), r = lookup(ctx, m[3]);
  const eq = (x, y) => y === BLANK || y === EMPTY ? isBlank(x) : x === BLANK || x === EMPTY ? isBlank(y) : x == y;
  switch (m[2]) {
    case '==': return eq(l, r); case '!=': return !eq(l, r);
    case '>': return l > r; case '<': return l < r; case '>=': return l >= r; case '<=': return l <= r;
    case 'contains': return l != null && String(l).includes(r);
  }
}
function cond(ctx, s) {
  // Liquid evaluates and/or from the right.
  const parts = s.replace(/\s+/g, ' ').trim().split(/ (and|or) /);
  let v = cmp(ctx, parts[parts.length - 1]);
  for (let k = parts.length - 2; k > 0; k -= 2) v = parts[k] === 'and' ? cmp(ctx, parts[k - 1]) && v : cmp(ctx, parts[k - 1]) || v;
  return v;
}
class Break {}
function run(nodes, ctx, env) {
  let out = '';
  for (const n of nodes) {
    if (n.t === 'text') out += n.v;
    else if (n.t === 'out') { const v = value(ctx, n.v); out += v == null || v === BLANK ? '' : String(v); }
    else if (n.t === 'if') {
      for (const b of n.branches) { const ok = b.cond == null ? true : (b.neg ? !cond(ctx, b.cond) : cond(ctx, b.cond)); if (ok) { out += run(b.body, ctx, env); break; } }
    } else if (n.t === 'case') {
      const v = value(ctx, n.expr); const w = n.whens.find(w => args(w.vals.replace(/ or /g, ',')).some(x => lookup(ctx, x) == v));
      out += run(w ? w.body : n.other || [], ctx, env);
    } else if (n.t === 'for') {
      const m = n.expr.match(/^(\w+) in (\S+)(?:\s+limit:\s*(\d+))?/); let list = lookup(ctx, m[2]) || [];
      { const r = m[2].match(/^\((\d+)\.\.(\d+)\)$/); if (r) list = Array.from({length: r[2] - r[1] + 1}, (_, k) => Number(r[1]) + k); }
      if (m[3]) list = list.slice(0, Number(m[3]));
      try { list.forEach((item, k) => { ctx[m[1]] = item; ctx.forloop = {index: k + 1, first: k === 0, last: k === list.length - 1}; out += run(n.body, ctx, env); }); } catch (e) { if (!(e instanceof Break)) throw e; }
    } else if (n.t === 'capture') ctx[n.v] = run(n.body, ctx, env);
    else if (n.t === 'block') out += run(n.body, ctx, env);
    else if (n.t === 'form') {
      const attrs = {}; args(n.v).slice(2).forEach(a => { const i = a.indexOf(':'); attrs[a.slice(0, i).trim()] = value(ctx, a.slice(i + 1)); });
      out += `<form method="post" action="/cart/add" ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}><input type="hidden" name="form_type" value="product">` + run(n.body, ctx, env) + '</form>';
    } else if (n.t === 'stmt') {
      if (n.n === 'assign') { const i = n.v.indexOf('='); ctx[n.v.slice(0, i).trim()] = value(ctx, n.v.slice(i + 1)); }
      else if (n.n === 'break') throw new Break();
      else if (n.n === 'render') out += render(n.v, ctx, env);
    }
  }
  return out;
}
function render(spec, ctx, env) {
  const first = spec.match(/^'([^']+)'\s*[,|]?\s*([\s\S]*)$/); const name = first[1];
  const local = {settings: ctx.settings, section: ctx.section, collections: ctx.collections, request: ctx.request, routes: ctx.routes, now: ctx.now};
  splitTop(first[2].replace(/\|/g, ','), ',').map(x => x.trim()).filter(Boolean).forEach(a => { const i = a.indexOf(':'); local[a.slice(0, i).trim()] = value(ctx, a.slice(i + 1)); });
  if (env.stubs[name]) return env.stubs[name](local);
  return renderTemplate(env.files[name] ??= templateOf(read(`snippets/${name}.storelib`)), local, env);
}
const templateOf = src => src.slice(src.indexOf('\n') + 1, src.lastIndexOf('</template>'));
const parsed = new Map();
function renderTemplate(src, ctx, env) { if (!parsed.has(src)) parsed.set(src, parse(tokenize(src))); return run(parsed.get(src), ctx, env); }

/* ───────────── Fixture data ───────────── */
// Theme settings as the site has them: schema defaults, then saved values.
const schemaDefaults = Object.fromEntries(JSON.parse(read('shopify/config/settings_schema.json')).flatMap(g => g.settings || []).filter(x => x.id && ('default' in x || x.type === 'checkbox')).map(x => [x.id, x.default ?? false]));
const config = {...schemaDefaults, ...JSON.parse(read('config/settings.json')).shopify};
const image = n => ({src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${n}"/></svg>`)}`, alt: '', aspect_ratio: 0.75, media_type: 'image'});
function product(id, o = {}) {
  const variants = (o.variants || [{title: 'Default'}]).map((v, k) => ({id: id * 100 + k, option1: v.title, available: o.soldOut ? false : true, inventory_quantity: o.soldOut ? 0 : 9, inventory_management: 'shopify', price: 4900, compare_at_price: o.sale ? 7900 : null, ...v}));
  return {
    id, handle: 'p' + id, url: '/products/p' + id, title: o.title || 'Garment-dyed pants ' + id, vendor: 'Materia',
    featured_media: image('#c9c3b5'), media: [image('#c9c3b5'), image('#2c2c2c')],
    available: !o.soldOut, has_only_default_variant: !o.variants, price: 4900, compare_at_price: o.sale ? 7900 : null,
    variants, selected_or_first_available_variant: variants[0], options_with_values: o.variants ? [{name: 'Size', values: variants.map(v => v.option1)}] : [{name: 'Title', values: ['Default']}],
    created_at: new Date(Date.now() - (o.new ? 1 : 40) * 864e5).toISOString(), metafields: {custom: o.custom ? {custom_product_badge: o.custom} : {}}, selling_plan_groups: [],
  };
}
const stubs = {
  'responsive-image': a => `<img class="${a.class} bls-loaded-image" src="${a.image.src}" alt="${a.image_alt || ''}" width="300" height="400" loading="lazy" decoding="async">`,
  'placeholder-render': () => '<svg class="placeholder-svg"></svg>',
  'price': a => `<div class="card-product-price flex gap-5"><span class="price">R$49.00</span>${a.product?.compare_at_price ? '<s class="compare-price">R$79.00</s>' : ''}</div>`,
  'color-swatches': () => '',
  'review': () => '',
  'theme-type': () => '',
  'scheme-color': a => (isBlank(a.color) ? a.fallback : a.color) ?? '',
};
const env = {stubs, files: {}};
const cardTemplate = templateOf(read('snippets/product-item.storelib'));
function card(p, opts = {}, settings = {}) {
  const s = {...config, ...settings};
  return renderTemplate(cardTemplate, {
    settings: s, request: {locale: {iso_code: 'en'}}, pages: {}, card_product: p, section_id: 'fx', class: opts.class || '',
    type: opts.type, template_enable_action: true, template_enable_add_cart: true, template_enable_price: true,
    template_enable_product_badges: true, template_enable_product_vendor: false, template_enable_color_swatches: true,
    template_enable_rate: false, indexFor: opts.index || 1, scroll_animation: 'none', colunm: 4, colunm_mobile: 2,
  }, env);
}
function themeRoot(s) {
  // The values layout/theme.storelib writes on :root and <body>.
  return `:root{--color-background:#fff;--color-heading:#111;--color-text:#444;--color-border:#e5e5e5;--color-white:#fff;--color-dark:#111;
  --btn-primary-bg-color:#333;--btn-primary-color:#fff;--btn-primary-hover-bg-color:#000;--btn-primary-hover-color:#fff;--btn-secondary-bg-color:#fff;--btn-secondary-color:#111;--btn-secondary-border-color:#111;
  --btn-radius:${s.btn_radius ?? 5}px;--btn-font-size:16px;--btn-padding-y:14px;--btn-padding-x:26px;--btn-border-width:${s.btn_border_width ?? 0}px;--btn-anim-duration:0ms;--body-font:Arial,sans-serif;--heading-font:Arial,sans-serif;
  --bages-radius:${s.badges_rounded_corner}px;--badges-font-weight:${s.badges_font_weight};--badges-letter-spacing:${s.badges_letter_spacing}px;--badges-transform:${s.badges_uppercase === false ? 'none' : 'uppercase'};
  --badges-padding-x:${s.badges_padding_x}px;--badges-padding-y:${s.badges_padding_y}px;--badges-offset-x:${s.badges_offset_x}px;--badges-offset-y:${s.badges_offset_y}px;--badges-gap:${s.badges_gap}px;
  --badges-shadow:${s.badges_drop_shadow ? '0 2px 6px rgba(0,0,0,.18)' : 'none'};--bages-sale-color:${s.sale_color};--bages-sale-bg-color:${s.sale_background};--bages-new-color:${s.new_color};--bages-new-bg-color:${s.new_background};
  --bages-sold-out-color:${s.sold_out_color};--bages-sold-out-bg-color:${s.sold_out_background};--bages-pre-order-color:${s.pre_order_color};--bages-pre-order-bg-color:${s.pre_order_background};--bages-custom-color:${s.custom_badge_color};--bages-custom-bg-color:${s.custom_badge_background};}
  html{font-size:62.5%}body{margin:0;font:14px/1.4 Arial,sans-serif}`;
}
const bodyAttrs = s => `data-btn-style="${s.btn_style || 'solid'}" data-btn-secondary-style="${s.btn_secondary_style || 'outline'}" data-btn-hover="${s.btn_hover_effect || 'fade'}" data-btn-shape="${s.btn_shape || 'rounded'}" data-badge-shape="${s.badges_shape}" data-badge-size="${s.badges_size}" data-badge-position="${s.badges_position}" data-badge-anim="${s.badges_animation}"`;
const CSS = ['critical.css', 'section-isolation.css', 'animation.css', 'product-card.css', 'theme.css', 'theme-button-contract.css'].map(f => read('shopify/assets/' + f)).join('\n');
const EXPERIENCE = read('shopify/assets/materia-experience.js');
async function draw(page, html, s, extraCss = '') {
  await page.setContent(`<!doctype html><html dir="ltr"><head><style>${themeRoot(s)}</style><style>${CSS}</style><style>${extraCss}</style></head><body ${bodyAttrs(s)}>${html}</body></html>`);
  await page.evaluate(() => { window.__materiaExperienceReady = false; });
  await page.addScriptTag({content: EXPERIENCE});
  await page.evaluate(() => document.fonts.ready);
}
const grid = cards => `<div class="container" style="padding:0 16px;box-sizing:border-box"><div style="display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:16px;--cols:2" class="fx-grid">${cards.map(c => `<div class="grid__item">${c}</div>`).join('')}</div></div>
<style>@media (min-width:768px){.fx-grid{--cols:3!important}}@media (min-width:1200px){.fx-grid{--cols:4!important}}</style>`;

/* ───────────── This file's fixtures ───────────── */
Object.assign(T, {
  'templates.wishlist.empty_des': 'No products were added to the wishlist page.',
  'templates.wishlist.redirect': 'Back to Shopping',
  'templates.wishlist.wishlist': 'Wishlist',
});
// The wishlist store and the heart element, cut from assets/theme.js (a
// module that imports other files) between their own markers.
const THEME_JS = read('shopify/assets/theme.js');
const cut = (from, to) => { const a = THEME_JS.indexOf(from), b = THEME_JS.indexOf(to, a); assert.ok(a >= 0 && b > a, 'theme.js has ' + from); return THEME_JS.slice(a, b + to.length); };
const STORE_JS = cut('/* ── Wishlist store', 'console.error("[theme] wishlist init", e); }') + '\n' +
  cut('class ButtonWishlist extends HTMLElement', 'customElements.define("button-wishlist", ButtonWishlist);') + '\n' +
  cut('document.addEventListener("animationend", (event) => {\n  // The card plays the pop on the heart inside the button.', '});');
const WISHLIST_JS = read('shopify/assets/wishlist.js');
const WL_CSS = read('shopify/assets/wishlist-page.css');
const SPRITE = templateOf(read('snippets/sprite-svg.storelib'));
const controls = s => renderTemplate(templateOf(read('snippets/theme-controls.storelib')), {settings: s, request: {design_mode: false}}, env);
const customActions = s => renderTemplate(templateOf(read('snippets/product-card-custom-actions.storelib')), {settings: s}, env);
const recommendButton = s => renderTemplate(templateOf(read('snippets/cart-recommend-custom-button.storelib')), {settings: s}, env);
// The drawer polish snippet's CSS and JS are parts of the cached drawer assets.
const assetPart = (file, name) => { const src = read(file), a = src.indexOf(`/* == ${name} == */`), b = src.indexOf(`/* == end ${name} == */`); assert.ok(a >= 0 && b > a, `${file}: ${name}`); return src.slice(a, b); };
const drawerPolish = () => `<style>${assetPart('shopify/assets/cart-drawer.css', 'snippets/cart-drawer-polish')}</style><script>${assetPart('shopify/assets/cart-drawer.js', 'snippets/cart-drawer-polish')}</script>`;
function cardWith(p, flags = {}, s = config) {
  return renderTemplate(cardTemplate, {
    settings: s, request: {locale: {iso_code: 'en'}}, pages: {}, card_product: p, section_id: 'fx', class: '',
    template_enable_action: true, template_enable_add_cart: true, template_enable_price: true, template_enable_product_badges: true,
    template_enable_product_vendor: true, template_enable_product_short_description: true, template_enable_color_swatches: true,
    template_enable_rate: false, indexFor: 1, scroll_animation: 'none', colunm: 4, colunm_mobile: 2, ...flags,
  }, env);
}
const ORIGIN = 'http://fx.test';
function documentFor(body, s, head = '') {
  return `<!doctype html><html dir="ltr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${themeRoot(s)}</style><style>${CSS}</style><style>${WL_CSS}</style>${controls(s)}${customActions(s)}${head}</head>
  <body ${bodyAttrs(s)}>${SPRITE}<header><a href="/wishlist" class="header-icon"><span class="wishlist-count h-count">0</span></a></header>
  <main><div id="shopify-section-fx" class="shopify-section">${body}</div></main><script>${STORE_JS}</script></body></html>`;
}
// Serves `pages` ({path: html}) on a real origin, so localStorage and storage events work.
async function serve(page, pages, extra) {
  // On the context, so a second tab on the same origin is served too.
  const context = page.context();
  await context.unrouteAll({behavior: 'ignoreErrors'}).catch(() => {});
  await context.route(url => url.host === 'fx.test', async route => {
    const url = new URL(route.request().url());
    if (extra) { const r = await extra(url, route); if (r) return; }
    if (url.pathname.endsWith('/wishlist.js')) return route.fulfill({contentType: 'text/javascript', body: WISHLIST_JS});
    const html = pages[url.pathname];
    if (html == null) return route.fulfill({status: 404, body: ''});
    return route.fulfill({contentType: 'text/html', body: html});
  });
}
const rect = el => { const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom}; };

(async () => {
  const browser = await chromium.launch({executablePath: ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f)), headless: true, args: ['--no-sandbox']});
  let passed = 0;
  const errors = [];
  const ok = label => { passed++; if (process.env.VERBOSE) console.log('ok', label); };
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));

    /* ── 1. The heart: shown on every card, 44px, toggles, persists, syncs ── */
    const a = product(11, {title: 'Pants Down'}), b = product(12, {variants: [{title: 'S'}, {title: 'M'}]}), c = product(13, {soldOut: true});
    for (const style of ['standard', 'morden']) for (const width of [375, 768, 1366]) {
      const s = {...config, badges_position:'top_start', product_style: style, show_wishlist: true, show_action_on_mobile: true, enable_custom_card_actions: true};
      const where = `${style}@${width}`;
      await page.setViewportSize({width, height: 900});
      // The same product twice (a grid and a carousel on one page).
      await serve(page, {'/': documentFor(grid([cardWith(a, {}, s), cardWith(b, {}, s), cardWith(c, {}, s), cardWith(a, {}, s)]), s)});
      await page.goto(ORIGIN + '/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      const hearts = await page.$$eval('.product-item__button-action button-wishlist', els => els.map(el => {
        const r = el.getBoundingClientRect(), svg = el.querySelector('svg').getBoundingClientRect(), img = el.closest('.product-item__inner').getBoundingClientRect();
        let shown = true; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') shown = false; }
        return {w: r.width, h: r.height, x: r.x, y: r.y, r: r.right, b: r.bottom, svgW: svg.width, svgH: svg.height, shown, img: {x: img.x, y: img.y, r: img.right, b: img.bottom},
          role: el.getAttribute('role'), pressed: el.getAttribute('aria-pressed'), label: el.getAttribute('aria-label'), pad: getComputedStyle(el).paddingLeft};
      }));
      assert.equal(hearts.length, 4, `${where}: a heart on every card`);
      for (const h of hearts) {
        assert.ok(h.shown, `${where}: the heart is in view at rest, without hovering`);
        // Phones (two cards a row) draw the heart at 36px; a ring around it
        // keeps the 44px tap area.
        const size = width < 750 ? 36 : 44;
        assert.equal(Math.round(h.w), size, `${where}: ${size}px wide`); assert.equal(Math.round(h.h), size, `${where}: ${size}px tall`);
        assert.equal(h.pad, '0px', `${where}: the theme's button padding does not squeeze the icon`);
        assert.ok(h.svgW >= 14 && h.svgH >= 14, `${where}: the heart icon is drawn (${h.svgW}x${h.svgH})`);
        assert.ok(h.x >= h.img.x && h.r <= h.img.r + 0.5 && h.y >= h.img.y && h.b <= h.img.b + 0.5, `${where}: on the picture`);
        assert.ok(h.r > (h.img.x + h.img.r) / 2, `${where}: on the end side`);
        if (width >= 1025) assert.ok(h.y - h.img.y < 40, `${where}: top end corner`);
        assert.equal(h.role, 'button'); assert.equal(h.pressed, 'false'); assert.match(h.label, /Add to wishlist: /);
      }
      // Click: saved, filled, pressed, every card of that product, the count and the event.
      await page.evaluate(() => { window.__events = []; document.addEventListener('materia:wishlist-change', e => window.__events.push(e.detail)); });
      const first = page.locator('.product-item__button-action button-wishlist').first();
      await first.click();
      const st = await page.evaluate(() => ({ls: JSON.parse(localStorage.getItem('materia__wishlist-items')), ev: window.__events, count: document.querySelector('.wishlist-count').textContent.trim(),
        pressed: [...document.querySelectorAll('.product-item__button-action button-wishlist')].map(el => el.getAttribute('aria-pressed') + (el.classList.contains('active') ? '+' : '-'))}));
      assert.deepEqual(st.ls, ['11'], `${where}: saved in localStorage`);
      assert.equal(st.ev.length, 1); assert.equal(st.ev[0].count, 1); assert.equal(st.ev[0].id, '11'); assert.equal(st.ev[0].added, true, `${where}: materia:wishlist-change says added`);
      assert.equal(st.count, '1', `${where}: header count updated`);
      assert.deepEqual(st.pressed, ['true+', 'false-', 'false-', 'true+'], `${where}: both cards of the same product show saved`);
      await page.waitForTimeout(450);
      const look = await page.$eval('.product-item__button-action button-wishlist.active', el => ({fill: getComputedStyle(el.querySelector('svg use')).fill, bg: getComputedStyle(el).backgroundColor, t: getComputedStyle(el.querySelector('svg use')).transitionProperty}));
      assert.notEqual(look.fill, 'none', `${where}: the saved heart is filled`);
      assert.match(look.t, /fill/, `${where}: fill changes with a transition`);
      // Keyboard: Enter on the same heart takes it out again.
      await page.locator('.product-item__button-action button-wishlist').nth(3).focus();
      await page.keyboard.press('Enter');
      const st2 = await page.evaluate(() => ({ls: JSON.parse(localStorage.getItem('materia__wishlist-items')), ev: window.__events.at(-1), count: document.querySelector('.wishlist-count').textContent.trim(), pressed: [...document.querySelectorAll('.product-item__button-action button-wishlist')].map(el => el.getAttribute('aria-pressed'))}));
      assert.deepEqual(st2.ls, [], `${where}: Enter removes`); assert.equal(st2.ev.added, false); assert.equal(st2.count, '0');
      assert.deepEqual(st2.pressed, ['false', 'false', 'false', 'false'], `${where}: every copy back to outline`);
      assert.equal(await page.$eval('.product-item__button-action button-wishlist', el => getComputedStyle(el.querySelector('svg use')).fill), 'none', `${where}: outline when not saved`);
      ok('heart ' + where);
    }
    // Persists across navigation, another tab, and the back/forward cache.
    {
      const s = {...config, show_wishlist: true, show_action_on_mobile: true};
      await page.setViewportSize({width: 1366, height: 900});
      const html = documentFor(grid([cardWith(a, {}, s), cardWith(b, {}, s)]), s);
      await serve(page, {'/': html, '/other': html});
      await page.goto(ORIGIN + '/'); await page.evaluate(() => localStorage.clear());
      await page.goto(ORIGIN + '/');
      await page.locator('button-wishlist[data-product-id="12"]').click();
      await page.goto(ORIGIN + '/other');
      assert.equal(await page.getAttribute('button-wishlist[data-product-id="12"]', 'aria-pressed'), 'true', 'saved after navigating');
      assert.equal(await page.$eval('.wishlist-count', el => el.textContent.trim()), '1', 'count after navigating');
      // Another tab takes it out: this tab's hearts and count follow (storage event).
      const tab = await context.newPage();
      await tab.goto(ORIGIN + '/');
      await tab.locator('button-wishlist[data-product-id="12"]').click();
      await page.waitForFunction(() => document.querySelector('button-wishlist[data-product-id="12"]').getAttribute('aria-pressed') === 'false');
      assert.equal(await page.$eval('.wishlist-count', el => el.textContent.trim()), '0', 'count follows another tab');
      await tab.close();
      // Back/forward cache: the page comes back from memory after the list changed.
      await page.evaluate(() => { localStorage.setItem('materia__wishlist-items', JSON.stringify(['11'])); window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})); });
      assert.equal(await page.getAttribute('button-wishlist[data-product-id="11"]', 'aria-pressed'), 'true', 'pageshow from the cache re-reads the list');
      // Storage blocked or corrupt: no error, the click still works for this page.
      await page.evaluate(() => localStorage.setItem('materia__wishlist-items', '{not json'));
      await page.reload();
      assert.equal(await page.getAttribute('button-wishlist[data-product-id="11"]', 'aria-pressed'), 'false', 'a corrupt list reads as empty');
      await page.evaluate(() => { Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }}); });
      await page.locator('button-wishlist[data-product-id="11"]').click();
      assert.equal(await page.getAttribute('button-wishlist[data-product-id="11"]', 'aria-pressed'), 'true', 'blocked storage: still toggles on the page');
      ok('persistence');
    }

    /* ── 2. The wishlist page ── */
    {
      const section = read('sections/page-wishlist.storelib');
      const schema = JSON.parse(section.slice(section.indexOf('<schema>') + 8, section.indexOf('</schema>'))).shopify;
      const defaults = Object.fromEntries(schema.settings.filter(x => x.id).map(x => [x.id, x.default]));
      const all = [a, b, c, product(14, {sale: true, title: 'Linen shirt'})];
      const drawSection = (s, results, extra = {}) => renderTemplate(templateOf(section), {
        settings: s, section: {id: 'main', settings: {...defaults, ...extra}}, search: {results}, request: {design_mode: false, locale: {iso_code: 'en'}},
        routes: {all_products_collection_url: '/collections/all', search_url: '/search'}, collections: {all: {products: all}}, template: {name: 'page'},
      }, env);
      const s = {...config, show_wishlist: true, show_message_when_remove: true, show_action_on_mobile: true};
      const shell = documentFor(drawSection(s, []), s);
      const requests = [];
      await serve(page, {'/pages/wishlist': shell}, async (url, route) => {
        if (url.pathname !== '/search') return false;
        requests.push(url.search);
        assert.equal(url.searchParams.get('section_id'), 'page-wishlist', 'asks for this section by its type');
        const ids = (url.searchParams.get('q') || '').split(' OR ').map(x => x.replace(/^id:/, ''));
        const results = all.filter(p => ids.includes(String(p.id)));
        await route.fulfill({contentType: 'text/html', body: `<div id="shopify-section-page-wishlist" class="shopify-section">${drawSection(s, results)}</div>`});
        return true;
      });
      for (const width of [375, 1366]) {
        await page.setViewportSize({width, height: 900});
        await page.goto(ORIGIN + '/pages/wishlist');
        await page.evaluate(() => localStorage.setItem('materia__wishlist-items', JSON.stringify(['14', '11', '999'])));
        await page.reload();
        await page.waitForSelector('[data-wishlist-card]');
        const view = await page.evaluate(() => ({
          ids: [...document.querySelectorAll('[data-wishlist-card]')].map(el => el.dataset.wishlistId),
          titles: [...document.querySelectorAll('[data-wishlist-card] .product-item__name')].map(el => el.textContent.trim()),
          x: [...document.querySelectorAll('[data-wishlist-card] [data-wishlist-remove]')].map(el => { const r = el.getBoundingClientRect(); return {w: r.width, h: r.height, label: el.getAttribute('aria-label'), icon: el.querySelector('svg').getBoundingClientRect().width}; }),
          hearts: [...document.querySelectorAll('[data-wishlist-card] .product-item__button-action button-wishlist')].filter(el => getComputedStyle(el).display !== 'none').length,
          empty: document.querySelector('[data-wishlist-empty]').hidden, busy: document.querySelector('[data-wishlist-items]').getAttribute('aria-busy'),
          loading: document.querySelector('[data-wishlist-loading]').hidden, scheme: document.querySelector('[data-wishlist-page]').className,
        }));
        assert.deepEqual(view.ids, ['14', '11'], `@${width}: the saved products, in the order saved (an unknown id is skipped)`);
        assert.deepEqual(view.titles, ['Linen shirt', 'Pants Down'], `@${width}: drawn with the theme's product card`);
        const xSize = width < 750 ? 36 : 44;
        assert.ok(view.x.every(x => Math.round(x.w) === xSize && Math.round(x.h) === xSize && x.icon > 8 && /Remove from wishlist/.test(x.label)), `@${width}: a ${xSize}px remove button on each: ${JSON.stringify(view.x)}`);
        assert.equal(view.hearts, 0, `@${width}: no heart next to the remove button`);
        assert.equal(view.empty, true); assert.equal(view.busy, 'false'); assert.equal(view.loading, true, 'loading cards gone');
        assert.match(view.scheme, /color-default-color-scheme gradient/, 'on the section colour scheme');
        // Remove the first: it fades out, the list and count follow, a message is announced.
        await page.evaluate(() => { window.__events = []; document.addEventListener('materia:wishlist-change', e => window.__events.push(e.detail)); });
        await page.locator('[data-wishlist-card][data-wishlist-id="14"] [data-wishlist-remove]').click();
        await page.waitForFunction(() => !document.querySelector('[data-wishlist-card][data-wishlist-id="14"]'));
        const after = await page.evaluate(() => ({ls: JSON.parse(localStorage.getItem('materia__wishlist-items')), ids: [...document.querySelectorAll('[data-wishlist-card]')].map(el => el.dataset.wishlistId), count: document.querySelector('.wishlist-count').textContent.trim(), status: document.querySelector('[data-wishlist-status]').textContent, ev: window.__events}));
        assert.deepEqual(after.ls, ['11', '999']); assert.deepEqual(after.ids, ['11']); assert.equal(after.count, '2');
        assert.equal(after.status, 'Removed from your wishlist', 'Show a message when removed');
        assert.equal(after.ev[0].added, false);
        // Remove the last shown, and the unknown one from another place: the empty state.
        await page.locator('[data-wishlist-card][data-wishlist-id="11"] [data-wishlist-remove]').click();
        await page.evaluate(() => window.MateriaWishlist.remove('999'));
        await page.waitForFunction(() => !document.querySelector('[data-wishlist-empty]').hidden);
        const empty = await page.$eval('[data-wishlist-empty]', el => ({text: el.querySelector('p').textContent.trim(), href: el.querySelector('a').getAttribute('href'), label: el.querySelector('a').textContent.trim(), btn: el.querySelector('a').dataset.themeButton, h: el.querySelector('a').getBoundingClientRect().height, color: getComputedStyle(el.querySelector('p')).color}));
        assert.deepEqual([empty.text, empty.href, empty.label, empty.btn], ['No products were added to the wishlist page.', '/collections/all', 'Back to Shopping', 'primary'], 'empty state with a link to shop');
        assert.ok(empty.h >= 44, 'empty state button is a 44px target');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `@${width}: no sideways scroll`);
        // Saved in another tab while this page is open: the card arrives.
        const tab = await context.newPage();
        await tab.goto(ORIGIN + '/pages/wishlist');
        await tab.evaluate(() => window.MateriaWishlist.add('12'));
        await page.waitForSelector('[data-wishlist-card][data-wishlist-id="12"]');
        assert.equal(await page.$eval('[data-wishlist-empty]', el => el.hidden), true, 'empty state hides again');
        await tab.close();
        await page.evaluate(() => localStorage.clear());
      }
      assert.ok(requests.every(q => new URLSearchParams(q).get('type') === 'product'), 'product search');
      // Section settings: the empty state's own words and link.
      const own = documentFor(drawSection(s, [], {empty_text: 'Nothing saved yet.', empty_button_label: 'Shop the pants', empty_button_url: '/collections/pants'}), s);
      await serve(page, {'/pages/wishlist': own});
      await page.goto(ORIGIN + '/pages/wishlist'); await page.evaluate(() => localStorage.clear()); await page.reload();
      await page.waitForFunction(() => !document.querySelector('[data-wishlist-empty]').hidden);
      assert.deepEqual(await page.$eval('[data-wishlist-empty]', el => [el.querySelector('p').textContent.trim(), el.querySelector('a').textContent.trim(), el.querySelector('a').getAttribute('href')]), ['Nothing saved yet.', 'Shop the pants', '/collections/pants']);
      ok('wishlist page');
    }

    /* ── 3. Modern cards at 375, 768 and 1366 ── */
    {
      const ps = [product(21), product(22, {variants: [{title: 'S'}, {title: 'M'}], title: 'Relaxed linen trousers with a much longer name that wraps'}), product(23, {soldOut: true}), product(24, {sale: true})];
      ps[0].description = '<p>Designed for everyday wear, each piece combines comfort and clean details.</p>';
      const swatchStub = {...stubs, 'color-swatches': () => '<div class="product__color-swatches flex gap-5"><span class="swatch" style="width:20px;height:20px;background:#000;display:inline-block"></span><span class="swatch" style="width:20px;height:20px;background:#c9c3b5;display:inline-block"></span></div>'};
      const envS = {stubs: swatchStub, files: {}};
      for (const alignment of ['center', 'start']) for (const width of [375, 768, 1366]) {
        const s = {...config, card_atc_button: 'auto', product_style: 'morden', product_alignment: alignment, show_wishlist: true, show_action_on_mobile: true, show_variant: true, show_short_description: true, enable_custom_card_actions: true, card_atc_bg: '#fefefe', card_atc_color: '#111111'};
        const where = `modern ${alignment}@${width}`;
        await page.setViewportSize({width, height: 1000});
        const html = ps.map(p => renderTemplate(cardTemplate, {settings: s, request: {locale: {iso_code: 'en'}}, pages: {}, card_product: p, section_id: 'm', class: '', template_enable_action: true, template_enable_add_cart: true, template_enable_price: true, template_enable_product_badges: true, template_enable_product_vendor: true, template_enable_product_short_description: true, template_enable_color_swatches: true, indexFor: 1, scroll_animation: 'none'}, envS));
        await serve(page, {'/': documentFor(grid(html), s)});
        await page.goto(ORIGIN + '/');
        const cards = await page.$$eval('.product-item', els => els.map(el => {
          const r = n => { if (!n) return null; const b = n.getBoundingClientRect(); return {x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom, cx: b.x + b.width / 2}; };
          const btn = el.querySelector('.pc-atc--below'), cs = getComputedStyle(btn);
          return {card: r(el), wrap: r(el.querySelector('.product-item__wrapper')), img: r(el.querySelector('.product-item__inner')), info: r(el.querySelector('.product-item__information')),
            title: r(el.querySelector('.product-item__name')), price: r(el.querySelector('.product-item__price')), sw: r(el.querySelector('.product__color-swatches')), desc: r(el.querySelector('.product-item__short-description')),
            btn: r(btn), border: cs.borderTopColor, bw: cs.borderTopWidth, bg: cs.backgroundColor, color: cs.color, overflow: el.scrollWidth > el.clientWidth + 1,
            heart: r(el.querySelector('.product-item__button-action button-wishlist'))};
        }));
        for (const [k, m] of cards.entries()) {
          const at = `${where} card ${k + 1}`;
          assert.ok(m.title.y >= m.img.b, `${at}: title under the picture`);
          assert.ok(m.price.y >= m.title.b - 1, `${at}: price under the title`);
          if (m.sw) assert.ok(m.sw.y >= m.price.b - 1 && m.sw.b <= m.btn.y + 1, `${at}: swatches between price and button`);
          if (m.desc) assert.ok(m.desc.y >= m.price.b - 1 && m.desc.b <= m.btn.y + 1, `${at}: description above the button`);
          assert.ok(m.btn.y >= m.price.b, `${at}: button under the details`);
          assert.ok(Math.abs(m.btn.x - m.card.x) <= 1 && Math.abs(m.btn.w - m.card.w) <= 1, `${at}: button spans the card`);
          assert.equal(Math.round(m.btn.h), 44, `${at}: 44px button`);
          assert.ok(!m.overflow, `${at}: nothing spills sideways`);
          if (alignment === 'center') { assert.ok(Math.abs(m.title.cx - m.card.cx) <= 1.5 && Math.abs(m.price.cx - m.card.cx) <= 1.5, `${at}: title and price centred`); if (m.sw) assert.ok(Math.abs(m.sw.cx - m.card.cx) <= 1.5, `${at}: swatches centred`); }
          else assert.ok(Math.abs(m.title.x - m.card.x) <= 1 && Math.abs(m.price.x - m.card.x) <= 1, `${at}: title and price start-aligned`);
          if (k !== 2) {
            assert.notEqual(m.border, 'rgb(254, 254, 254)', `${at}: the outline is visible on the page (custom light colour)`);
            assert.equal(m.bw, '1px', `${at}: outline drawn`);
          }
          assert.ok(m.heart && m.heart.w === (width < 750 ? 36 : 44) && m.heart.x >= m.img.x && m.heart.r <= m.img.r + .5, `${at}: heart on the picture`);
        }
        const rows = new Map(); cards.forEach(c => { const key = Math.round(c.card.y); rows.set(key, [...(rows.get(key) || []), c]); });
        for (const row of rows.values()) if (row.length > 1) {
          assert.equal(new Set(row.map(c => Math.round(c.btn.y))).size, 1, `${where}: buttons on one line across the row`);
          assert.equal(new Set(row.map(c => Math.round(c.title.y))).size, 1, `${where}: titles on one line across the row`);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${where}: no sideways page scroll`);
      }
      ok('modern');
    }

    /* ── 4. Vendor and short description ── */
    {
      const s = {...config, show_vendor: true, show_short_description: true, short_description_words: 6};
      const withData = product(31, {title: 'Pants Down'}); withData.vendor = 'Atelier Nord'; withData.description = '<p>Designed for <strong>everyday</strong> wear, each piece combines comfort, clean details and easy styling.</p>';
      const storelib = product(32); storelib.vendor = ''; storelib.description = '';
      const metafield = product(33); metafield.vendor = ''; metafield.metafields.custom.short_description = 'Garment dyed cotton twill.'; metafield.description = '<p>Longer text.</p>';
      await page.setViewportSize({width: 1366, height: 900});
      await serve(page, {'/': documentFor(grid([cardWith(withData, {}, s), cardWith(storelib, {}, s), cardWith(metafield, {}, s), cardWith(withData, {template_enable_product_vendor: false, template_enable_product_short_description: false}, s)]), s)});
      await page.goto(ORIGIN + '/');
      const info = await page.$$eval('.product-item', els => els.map(el => ({vendor: el.querySelector('.product-item__vendor')?.textContent.trim() ?? null, desc: el.querySelector('.product-item__short-description')?.textContent.trim() ?? null, h: el.querySelector('.product-item__short-description')?.getBoundingClientRect().height ?? 0})));
      assert.equal(info[0].vendor, 'Atelier Nord', 'vendor shown when the product has one');
      assert.equal(info[0].desc, 'Designed for everyday wear, each piece...', 'plain text, cut to Description length');
      assert.ok(info[0].h > 10, 'description drawn');
      assert.equal(info[1].vendor, null, 'no empty vendor line'); assert.equal(info[1].desc, null, 'no empty description');
      assert.equal(info[2].desc, 'Garment dyed cotton twill.', 'the short description field first');
      assert.deepEqual([info[3].vendor, info[3].desc], [null, null], 'a section that turns them off (menus, drawers) keeps them off');
      await serve(page, {'/': documentFor(grid([cardWith(withData, {}, {...s, show_vendor: false, show_short_description: false})]), s)});
      await page.goto(ORIGIN + '/');
      assert.equal(await page.$$eval('.product-item__vendor, .product-item__short-description', els => els.length), 0, 'theme settings off: neither');
      // Every Product cards setting is one the card or a template reads.
      const group = JSON.parse(read('shopify/config/settings_schema.json')).find(g => g.name === 'Product cards');
      const used = ['snippets/product-item.storelib', 'snippets/product-card-custom-actions.storelib', 'snippets/buy-buttons.storelib'].map(read).join('\n');
      for (const st of group.settings.filter(x => x.id)) assert.ok(new RegExp(`(settings|theme_st|s)\\.${st.id}\\b`).test(used), `Product cards > ${st.id} is read`);
      const headers = group.settings.map((x, k) => x.type === 'header' ? k : -1).filter(k => k >= 0);
      for (const k of headers) assert.ok(group.settings[k + 1] && group.settings[k + 1].type !== 'header' || group.settings[k + 1]?.type === 'header' && group.settings[k - 1]?.id === 'enable_custom_card_actions', `header "${group.settings[k].content}" has settings under it`);
      for (const setting of group.settings.filter(s=>s.id?.startsWith('card_') || ['product_size','price_size','product_name_text_transform'].includes(s.id))) assert.equal(setting.visible_if,'{{ settings.enable_custom_card_actions }}',setting.id+' is opt-in');
      ok('vendor and description');
    }

    /* ── 5. Cart drawer "You may also like": a painted theme button at rest ── */
    {
      const s = {...config, enable_custom_card_actions: true, card_atc_bg: '#fefefe', card_atc_color: '#111111', enable_custom_recommend_btn: false};
      const rec = cardWith(product(41, {title: 'Linen shirt'}), {type: 'list', template_enable_action: false, template_enable_product_vendor: false, template_enable_product_short_description: false}, s);
      const drawer = s2 => `<div id="minicart_wrapper" class="open_drawer"><div class="minicart__wrapper"><div class="cart-recommend inside"><div class="cart-upsell-item">${rec}</div></div></div></div>`;
      // The cart page's own list: Cart page > Recommendations has its own colours.
      const cartPage = () => `<div class="template-cart"><div class="page-cart"><minicart-recommendations class="block cart_page-recommend cart-recommend mt-60 inside"><div class="cart-upsell-item">${rec}</div></minicart-recommendations></div></div>`;
      const cartPageButton = st => renderTemplate(templateOf(read('snippets/cart-recommend-custom-button.storelib')), {settings: st, cart_page: true}, env);
      const cases = [
        ['drawer, theme Buttons', s, drawer, drawerPolish(s) + recommendButton(s), 'rgb(51, 51, 51)', 'rgb(255, 255, 255)'],
        ['drawer, Recommendations custom colours', {...s, enable_custom_recommend_btn: true, recommend_btn_bg: '#242424', recommend_btn_color: '#fafafa'}, drawer, null, 'rgb(36, 36, 36)', 'rgb(250, 250, 250)'],
        ['cart page, theme Buttons', s, cartPage, cartPageButton(s), 'rgb(51, 51, 51)', 'rgb(255, 255, 255)'],
        ['cart page, its custom colours', {...s, cart_page_enable_custom_recommend_btn: true, cart_page_recommend_btn_bg: '#1f3a2e', cart_page_recommend_btn_color: '#fafafa'}, cartPage, null, 'rgb(31, 58, 46)', 'rgb(250, 250, 250)'],
      ];
      for (const [label, st, wrap, headIn, bg, color] of cases) {
        const head = headIn ?? (wrap === drawer ? drawerPolish(st) + recommendButton(st) : cartPageButton(st));
        await page.setViewportSize({width: 375, height: 800});
        await serve(page, {'/': documentFor(wrap(st), st, head)});
        await page.goto(ORIGIN + '/');
        await page.mouse.move(1, 1);
        const b = await page.$eval('.cart-recommend button[name="add"]', el => ({role: el.dataset.themeButton, bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, h: el.getBoundingClientRect().height, text: el.textContent.replace(/\s+/g, ' ').trim()}));
        assert.equal(b.role, 'primary', 'data-theme-button');
        assert.equal(b.bg, bg, `${label}: painted at rest (${b.bg})`);
        assert.equal(b.color, color, `${label}: text colour at rest`);
        assert.ok(b.h >= 44, `${label}: 44px target (${b.h})`); assert.match(b.text, /Add to cart/);
      }
      ok('recommend button');
    }

    assert.deepEqual(errors.filter(e => !/Motion|ionRangeSlider|cartStrings|initLazyloadItem/.test(e)), [], 'no script errors');
    console.log(`theme-cards-wishlist: ${passed} groups passed`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
