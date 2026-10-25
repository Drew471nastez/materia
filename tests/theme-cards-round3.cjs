/* Run: node tests/theme-cards-round3.cjs
   Product cards, round 3: one corner stack for badges and the heart, a
   round 44px quick add on phones, every Product cards and Product badges
   setting on the drawn card at 375, 768 and 1366px, touch feedback for
   the image hover effects, the short description from Storelib's product
   description, the custom styling toggle, and clicks that always reach the
   card in the builder. The repository's own snippets are rendered through
   the small Liquid subset tests/theme-cards-wishlist.cjs uses, then drawn in
   Chromium with the theme's real CSS. It does not replace Storelib's
   renderer or a live-site check. */
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
  expr = expr.replace(/\[([A-Za-z_]\w*)\]/g, (_, key) => '.' + ctx[key]);
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
    case 'newline_to_br': return String(v ?? '').replace(/\n/g, '<br />\n');
    case 'join': return Array.isArray(v) ? v.join(a[0] ?? ' ') : v;
    case 'downcase': return String(v ?? '').toLowerCase();
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
  await page.setContent(`<!doctype html><html dir="ltr" data-badge-custom="${s.enable_custom_badges === true}"><head><style>${themeRoot(s)}</style><style>${CSS}</style><style>${extraCss}</style></head><body ${bodyAttrs(s)}>${html}</body></html>`);
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


/* ───────────── This file's fixtures ───────────── */
// Colour swatches and the rating are drawn by their own snippets (tested
// elsewhere); here they leave a marker, so Show colour swatches and Show
// rating have something to switch.
stubs['color-swatches'] = () => '<div class="product__color-swatches fx-swatches" style="height:24px"></div>';
const CARD_SETTINGS_JS = read('shopify/assets/product-card-settings.js');
const WIDTHS = [375, 768, 1366];
const overlap = (a, b, pad = 0) => a && b && a.x < b.r - pad && b.x < a.r - pad && a.y < b.b - pad && b.y < a.b - pad;
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
// Everything the first card on the page shows, for "did this setting change the card".
async function snapshot(page) {
  return page.$eval('.product-item', el => {
    const r = n => { if (!n) return null; const b = n.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(','); };
    const cs = (n, ...props) => n ? props.map(p => getComputedStyle(n)[p]).join('|') : null;
    const seen = n => n && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden' && n.getBoundingClientRect().width > 0;
    const name = el.querySelector('.product-item__name'), price = el.querySelector('.product-item__price'), btn = el.querySelector('button[name="add"]'), heart = el.querySelector('.pc-heart button-wishlist');
    return JSON.stringify({
      classes: el.className + ' ' + el.querySelector('.product-item__wrapper').className + ' ' + el.querySelector('.product-item__information').className,
      inner: r(el.querySelector('.product-item__inner')), name: [r(name), cs(name, 'fontSize', 'textTransform', 'webkitLineClamp')], price: price ? [seen(price), cs(price, 'fontSize')] : null,
      btn: btn ? [seen(btn), r(btn), cs(btn, 'backgroundColor', 'color', 'borderTopColor'), btn.dataset.themeButton, btn.dataset.buttonAppearance] : null,
      heart: heart ? [seen(heart), cs(heart, 'backgroundColor', 'color', 'borderTopColor')] : null,
      vendor: seen(el.querySelector('.product-item__vendor')), desc: el.querySelector('.product-item__short-description')?.textContent ?? null,
      swatches: seen(el.querySelector('.fx-swatches')), rating: !!el.querySelector('review-product'), second: !!el.querySelector('.secondary-image'),
    });
  });
}

(async () => {
  const browser = await chromium.launch({executablePath: ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f)), headless: true, args: ['--no-sandbox']});
  let passed = 0;
  const errors = [];
  const ok = label => { passed++; if (process.env.VERBOSE) console.log('ok', label); };
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const show = async (body, s, width, head = '') => {
      await page.setViewportSize({width, height: 1000});
      await serve(page, {'/': documentFor(body, s, head)});
      await page.goto(ORIGIN + '/');
      // No add to cart request leaves the fixture page.
      await page.evaluate(() => document.addEventListener('submit', e => e.preventDefault(), true));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(60);
    };
    const base = {...config, product_style: 'standard', show_wishlist: true, show_add_cart: true, show_action_on_mobile: true, enable_catalog_mode: false,
      enable_custom_card_actions: false, show_sale: true, show_new: true, show_sold_out: true, show_pre_order: true, sale_badge_type: 'percent',
      sale_badge_addons: 'none', badges_offset_x: 8, badges_offset_y: 8, badges_gap: 6, badges_stack_max: 4, badges_animation: 'none', product_hover_effect: 'hover_zoom'};
    const sale = product(1, {sale: true}), many = product(2, {sale: true, new: true, custom: 'Organic'}), plain = product(3);
    const corner = el => {
      const r = n => { if (!n) return null; const b = n.getBoundingClientRect(); return {x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom}; };
      const badges = [...el.querySelectorAll('.product__badges-inner')].filter(n => getComputedStyle(n).display !== 'none').map(r);
      const btn = el.querySelector('button[name="add"]');
      return {inner: r(el.querySelector('.product-item__inner')), stack: r(el.querySelector('.product__badges')), badges,
        heart: r(el.querySelector('.pc-heart button-wishlist') || el.querySelector('button-wishlist[data-wishlist-remove]')), plus: btn && getComputedStyle(btn.closest('product-form')).opacity !== '0' ? r(btn) : null,
        plusOnImage: !!btn?.closest('.pc-form--media')};
    };

    /* ── 1. One corner stack: badges top end, the heart right under them ── */
    for (const style of ['standard', 'morden']) for (const width of WIDTHS) for (const [ox, oy, gap] of [[8, 8, 6], [18, 24, 10]]) {
      const s = {...base, product_style: style, badges_position: 'top_end', badges_offset_x: ox, badges_offset_y: oy, badges_gap: gap};
      await show(grid([cardWith(sale, {}, s), cardWith(many, {}, s), cardWith(plain, {}, s)]), s, width);
      const cards = await page.evaluate(`[...document.querySelectorAll('.product-item')].map(${corner.toString()})`);
      const where = `${style}@${width} offsets ${ox}/${oy} gap ${gap}`;
      for (const [k, c] of cards.entries()) {
        if (k < 2) {
          const first = c.badges[0];
          assert.ok(near(c.inner.r - first.r, ox) && near(first.y - c.inner.y, oy), `${where} card ${k + 1}: the badge in the corner at the edge offsets (got ${c.inner.r - first.r}, ${first.y - c.inner.y})`);
          // A tall stack on a small card goes on in a second column; the heart is under the lowest badge.
          const lastBadge = c.badges.reduce((a, b) => b.b > a.b ? b : a);
          const wrapped = new Set(c.badges.map(b => Math.round(b.r))).size > 1;
          if (wrapped) assert.ok(c.heart.y - lastBadge.b >= gap - 1, `${where} card ${k + 1}: a wrapped stack keeps the heart under its lowest badge`);
          else assert.ok(near(c.heart.y - lastBadge.b, gap), `${where} card ${k + 1}: the heart right under the badges, ${gap}px apart (got ${c.heart.y - lastBadge.b})`);
          assert.ok(near(c.heart.r, first.r), `${where} card ${k + 1}: heart and badge on one edge (${c.heart.r} vs ${first.r})`);
          for (const b of c.badges) assert.ok(!overlap(b, c.heart) && !overlap(b, c.plus), `${where} card ${k + 1}: no badge under a button`);
          if (k === 1) assert.equal(c.badges.length, 3, `${where}: three badges stacked`);
        } else {
          assert.ok(near(c.inner.r - c.heart.r, ox) && near(c.heart.y - c.inner.y, oy), `${where}: no badge, the heart takes the same corner`);
        }
        assert.ok(!overlap(c.heart, c.plus), `${where} card ${k + 1}: heart and + apart`);
        assert.equal(Math.round(c.heart.w), 44); assert.equal(Math.round(c.heart.h), 44);
      }
      // The stack lets the pointer through to the picture; the heart takes it.
      const hit = await page.evaluate(() => { const b = document.querySelector('.product__badges-inner').getBoundingClientRect(), h = document.querySelector('.pc-heart button-wishlist').getBoundingClientRect();
        const at = (x, y) => document.elementFromPoint(x, y); return [at(b.x + b.width / 2, b.y + b.height / 2)?.closest('a.product__media') != null, at(h.x + h.width / 2, h.y + h.height / 2)?.closest('button-wishlist') != null]; });
      assert.deepEqual(hit, [true, true], `${where}: a badge click opens the product, a heart click reaches the heart`);
    }
    // Desktop hover: nothing in the stack moves or jumps; the bottom strip never reaches it.
    {
      const s = {...base, badges_position: 'top_end'};
      await show(grid([cardWith(many, {}, s)]), s, 1366);
      const before = await page.evaluate(`(${corner.toString()})(document.querySelector('.product-item'))`);
      await page.hover('.product-item__inner'); await page.waitForTimeout(600);
      const after = await page.evaluate(`(${corner.toString()})(document.querySelector('.product-item'))`);
      assert.deepEqual([after.heart.y, after.heart.r, after.badges[0].y], [before.heart.y, before.heart.r, before.badges[0].y], 'hover leaves the stack in place');
      assert.ok(after.plus && after.badges.every(b => !overlap(b, after.plus)) && !overlap(after.heart, after.plus), 'the add to cart strip clears the stack');
    }
    // The wishlist page's remove (X) stacks the same way.
    for (const width of [375, 1366]) {
      const s = {...base, badges_position: 'top_end'};
      await show(`<div class="wishlist-page-section-inner">${grid([cardWith(sale, {template_enable_remove_in_wishlist_page: true}, s)])}</div>`, s, width);
      const c = await page.evaluate(`(${corner.toString()})(document.querySelector('.product-item'))`);
      assert.ok(c.heart && near(c.heart.y - c.badges[0].b, 6) && near(c.heart.r, c.badges[0].r), `@${width}: the remove button right under the badge`);
      assert.equal(await page.locator('.pc-heart').count(), 0, `@${width}: no hidden heart beside the remove button`);
    }
    // Every other position: badges and buttons never collide, at rest and on hover.
    for (const pos of ['top_start', 'bottom_start', 'bottom_end']) for (const style of ['standard', 'morden']) for (const width of WIDTHS) {
      const s = {...base, product_style: style, badges_position: pos, product_hover_effect: 'none'};
      const narrow = product(4, {sale: true, new: true, custom: 'Organic cotton, garment dyed'});
      await show(grid([cardWith(many, {}, s), cardWith(narrow, {}, s)]), s, width);
      for (const hover of [false, true]) {
        if (hover) { await page.hover('.product-item__inner'); await page.waitForTimeout(650); }
        const c = await page.evaluate(`(${corner.toString()})(document.querySelector('.product-item'))`);
        const where = `${pos} ${style}@${width}${hover ? ' hovered' : ''}`;
        for (const b of c.badges) {
          assert.ok(!overlap(b, c.heart, .5), `${where}: badge clear of the heart`);
          assert.ok(!overlap(b, c.plus, .5), `${where}: badge clear of the +/add to cart`);
          assert.ok(b.x >= c.inner.x - .5 && b.r <= c.inner.r + .5, `${where}: badge on the picture`);
        }
        const first = c.badges[0], last = c.badges[c.badges.length - 1];
        if (pos.endsWith('_end')) assert.ok(near(c.inner.r - first.r, 8), `${where}: end edge offset`);
        else assert.ok(near(first.x - c.inner.x, 8), `${where}: start edge offset`);
        if (pos.startsWith('top')) assert.ok(near(first.y - c.inner.y, 8), `${where}: top offset`);
        else if (!hover || width < 1025) assert.ok(c.inner.b - last.b >= 8 - 1, `${where}: bottom offset`);
        if (pos === 'bottom_end' && width < 1025 && c.plusOnImage) {
          assert.ok(near(c.plus.y - last.b, 6) && near(c.plus.r, last.r), `${where}: badges right above the + on one edge`);
        }
      }
      await page.mouse.move(1, 1);
    }
    // Badges move smoothly when the strip arrives (translate transition, not a jump).
    assert.match(await page.$eval('.product__badges', el => getComputedStyle(el).transitionProperty), /translate/);
    ok('corner stack');

    /* ── 2. The + on phones and tablets: a perfect 44px circle, like the heart ── */
    for (const width of [375, 768]) for (const shape of ['rounded', 'square', 'pill']) for (const custom of [false, true]) {
      const s = {...base, badges_position: 'top_start', btn_shape: shape, enable_custom_card_actions: custom, card_atc_bg: custom ? '#ff0000' : 'transparent', card_atc_color: custom ? '#ffffff' : 'transparent'};
      await show(grid([cardWith(plain, {}, s), cardWith(sale, {}, s)]), s, width, custom ? '' : '');
      const m = await page.$eval('button[name="add"]', el => { const b = el.getBoundingClientRect(), i = el.querySelector('.pc-atc__icon').getBoundingClientRect(), cs = getComputedStyle(el), h = el.closest('.product-item').querySelector('.pc-heart button-wishlist').getBoundingClientRect();
        return {w: b.width, h: b.height, rx: cs.borderTopLeftRadius, ry: cs.borderBottomRightRadius, icx: i.x + i.width / 2 - b.x, icy: i.y + i.height / 2 - b.y, iw: i.width, bg: cs.backgroundColor, color: cs.color, heart: [h.width, h.height, h.x]}; });
      const where = `@${width} ${shape} custom=${custom}`;
      assert.equal(m.w, 44, `${where}: 44px wide`); assert.equal(m.h, 44, `${where}: 44px tall (no oval)`);
      assert.ok(m.rx === '50%' || parseFloat(m.rx) >= 22, `${where}: round (${m.rx})`); assert.equal(m.rx, m.ry);
      assert.ok(near(m.icx, 22) && near(m.icy, 22) && m.iw === 16, `${where}: the + centred (${m.icx}, ${m.icy})`);
      assert.deepEqual(m.heart.slice(0, 2), [44, 44], `${where}: the heart is the same circle`);
      assert.deepEqual([m.bg, m.color], custom ? ['rgb(255, 0, 0)', 'rgb(255, 255, 255)'] : ['rgb(51, 51, 51)', 'rgb(255, 255, 255)'], `${where}: Theme settings > Buttons (primary), or the custom colours when on`);
      // Pressing it does not squash it.
      await page.locator('button[name="add"]').first().hover();
      await page.mouse.down(); const pressed = await page.$eval('button[name="add"]', el => { const b = el.getBoundingClientRect(); return [b.width, b.height]; }); await page.mouse.up();
      assert.ok(near(pressed[0], pressed[1], .5), `${where}: still a circle while pressed`);
    }
    ok('round quick add');

    /* ── 3. Every Product cards setting changes the drawn card ── */
    {
      const rich = {...product(5, {sale: true, title: 'Relaxed linen trousers with a long name that wraps onto more lines'}), vendor: 'Materia', description: '<p>Designed for everyday wear, each piece combines comfort, clean details and easy styling for every day of the week.</p>'};
      rich.media = [rich.featured_media, image('#2c2c2c')];
      rich.metafields = {custom: {}, judgeme: {badge: '<div class="jdgm-prev-badge"></div>'}};
      rich.featured_media = {...rich.featured_media, aspect_ratio: 0.6};
      const on = {enable_custom_card_actions: true};
      const cases = [
        ['product_style', 'standard', 'morden'],
        ['product_alignment', 'start', 'center'],
        ['product_alignment', 'center', 'end'],
        ['show_action_on_mobile', true, false, w => w < 1025],
        ['product_image_ratio', 'adapt', 'square'],
        ['product_image_ratio', 'square', 'landscape'],
        ['product_image_ratio', 'portrait', 'custom', null, {product_custom_ratio: '2:1'}],
        ['show_secondary_image', true, false],
        ['product_hover_effect', 'hover_zoom', 'hover_blur'],
        ['product_size', 12, 18, null, on],
        ['product_name_text_transform', 'unset', 'uppercase', null, on],
        ['product_truncation_title', 'none', '1'],
        ['price_size', 12, 18, null, on],
        ['hidden_price', false, true],
        ['show_vendor', true, false],
        ['show_short_description', true, false],
        ['short_description_words', 5, 30, null, {show_short_description: true}],
        ['show_rate', true, false],
        ['show_variant', true, false],
        ['show_add_cart', true, false],
        ['card_atc_button', 'primary', 'outline', null, on],
        ['card_atc_button', 'outline', 'secondary', null, on],
        ['enable_catalog_mode', false, true],
        ['show_wishlist', true, false],
        ['enable_custom_card_actions', false, true, null, {card_atc_bg: '#ff0000', card_wish_bg: '#00ff00'}],
        ...['card_atc_bg', 'card_atc_color', 'card_wish_bg', 'card_wish_color', 'card_wish_border'].map(id => [id, 'transparent', '#ff00aa', null, on]),
      ];
      const group = JSON.parse(read('shopify/config/settings_schema.json')).find(g => g.name === 'Product cards');
      const ids = group.settings.filter(x => x.id).map(x => x.id);
      // Product page only (Quantity box), hover-only colours (checked below) and the wishlist page's remove button (checked in theme-cards-wishlist).
      const elsewhere = ['show_quantity_input', 'product_custom_ratio', 'card_wish_active_bg', 'card_wish_active_color', 'card_wish_active_border', 'card_wish_hover_bg', 'card_wish_hover_color', 'card_atc_hover_bg', 'card_atc_hover_color', 'card_close_bg', 'card_close_color', 'card_close_hover_bg', 'card_close_hover_color'];
      for (const id of ids) assert.ok(cases.some(c => c[0] === id) || elsewhere.includes(id), `Product cards > ${id} has a check`);
      for (const width of WIDTHS) for (const [id, a, b, when, extra] of cases) {
        if (when && !when(width)) continue;
        const shot = async v => { const s = {...base, badges_position: 'top_start', ...extra, [id]: v}; await show(grid([cardWith(rich, {template_enable_rate: true}, s)]), s, width); return snapshot(page); };
        const x = await shot(a), y = await shot(b);
        assert.notEqual(x, y, `Product cards > ${id}: ${JSON.stringify(a)} and ${JSON.stringify(b)} draw the same card at ${width}px`);
      }
      // Saved, hover colours and the hover effect: on a hovering pointer.
      const s = {...base, ...on, card_wish_active_bg: '#123456', card_wish_active_color: '#fedcba', card_wish_active_border: '#abcdef', card_wish_hover_bg: '#f0e0d0', card_wish_hover_color: '#0a0b0c', card_atc_hover_bg: '#0f0f0f', card_atc_hover_color: '#fafafa'};
      await show(grid([cardWith(rich, {}, s)]), s, 1366);
      await page.hover('.pc-heart button-wishlist'); await page.waitForTimeout(350);
      assert.deepEqual(await page.$eval('.pc-heart button-wishlist', el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]), ['rgb(240, 224, 208)', 'rgb(10, 11, 12)'], 'heart hover colours');
      await page.$eval('.pc-heart button-wishlist', el => el.classList.add('active')); await page.mouse.move(1, 1); await page.waitForTimeout(350);
      assert.deepEqual(await page.$eval('.pc-heart button-wishlist', el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color, getComputedStyle(el).borderTopColor]), ['rgb(18, 52, 86)', 'rgb(254, 220, 186)', 'rgb(171, 205, 239)'], 'saved heart colours');
      await page.hover('.product-item__inner'); await page.hover('button[name="add"]'); await page.waitForTimeout(400);
      const atc = await page.$eval('button[name="add"]', el => [getComputedStyle(el).getPropertyValue('--mb-hover-bg').trim(), getComputedStyle(el).getPropertyValue('--mb-hover-text').trim()]);
      assert.deepEqual(atc, ['#0f0f0f', '#fafafa'], 'add to cart hover colours');
      ok('every Product cards setting');
    }

    /* ── 4. Image hover effects answer a finger too ── */
    {
      const touch = await browser.newContext({viewport: {width: 375, height: 900}, hasTouch: true, isMobile: true});
      const tp = await touch.newPage();
      tp.on('pageerror', e => errors.push(e.message));
      for (const [effect, prop, rest] of [['hover_zoom', 'transform', 'none'], ['hover_blur', 'filter', 'none'], ['hover_brighten', 'filter', 'none'], ['hover_fade', 'opacity', '1'], ['hover_tilt', 'transform', 'none'], ['hover_lift', 'transform', 'none']]) {
        const s = {...base, product_hover_effect: effect, show_secondary_image: true, badges_position: 'top_end'};
        await touch.route(url => url.host === 'fx.test', route => route.fulfill({contentType: 'text/html', body: documentFor(grid([cardWith(product(6), {}, s), cardWith(product(7), {}, s)]), s)}));
        await tp.goto(ORIGIN + '/');
        await tp.evaluate(() => { window.__opens = 0; document.addEventListener('click', e => { if (e.target.closest('a.product__media')) { e.preventDefault(); window.__opens++; } }); });
        const target = effect === 'hover_lift' ? '.product-item__inner' : '.product-item__inner img.first-image';
        const read = () => tp.$eval(target, (el, prop) => getComputedStyle(el)[prop], prop);
        const box = await tp.locator('.product-item__inner').first().boundingBox();
        const cdp = await touch.newCDPSession(tp);
        const point = {x: box.x + box.width / 3, y: box.y + box.height / 2};
        assert.equal(await read(), rest, `${effect}: at rest`);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [point]});
        await tp.waitForTimeout(550);
        assert.equal(await tp.locator('[data-pc-press]').count(), 1, `${effect}: pressed while the finger is down`);
        assert.notEqual(await read(), rest, `${effect}: the effect plays on touch (${prop})`);
        if (effect === 'hover_zoom') assert.equal(await tp.$eval('.product-item__inner .secondary-image', el => getComputedStyle(el).opacity), '1', 'the second image shows on touch');
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        await tp.waitForTimeout(60);
        assert.equal(await tp.evaluate(() => window.__opens), 1, `${effect}: one tap opens the product`);
        await tp.waitForTimeout(500);
        assert.equal(await tp.locator('[data-pc-press]').count(), 0, `${effect}: released`);
        // A quick tap still shows it for a moment.
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [point]});
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        await tp.waitForTimeout(120);
        assert.equal(await tp.locator('[data-pc-press]').count(), 1, `${effect}: a quick tap gives feedback`);
        assert.equal(await tp.evaluate(() => window.__opens), 2, `${effect}: and opens once`);
        await tp.waitForTimeout(450);
        assert.equal(await tp.locator('[data-pc-press]').count(), 0);
      }
      // Pressing the heart or the + is their own press, not the picture's.
      const hb = await tp.locator('.pc-heart button-wishlist').first().boundingBox(), cdp = await touch.newCDPSession(tp);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: hb.x + 22, y: hb.y + 22}]});
      assert.equal(await tp.locator('[data-pc-press]').count(), 0, 'the heart is not the picture');
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      // Reduced motion: no movement, the press still reads (opacity/filter only).
      await tp.emulateMedia({reducedMotion: 'reduce'});
      await tp.$eval('.product-item__inner', el => el.setAttribute('data-pc-press', ''));
      assert.equal(await tp.$eval('.product-item__inner', el => getComputedStyle(el).transform), 'none', 'reduced motion: no lift');
      await touch.close();
      ok('touch hover effects');
    }

    /* ── 5. Short description: Storelib's HTML description as plain text ── */
    {
      const desc = {...product(8), description: '<p>Designed for everyday wear,</p><p>each&nbsp;piece combines comfort</p>\n<ul><li>clean details</li><li>easy styling</li></ul>'};
      const meta = {...product(9), description: '<p>Long text</p>', metafields: {custom: {short_description: 'Garment dyed cotton twill.'}}};
      const none = {...product(10), description: '<p> </p>'};
      for (const width of WIDTHS) {
        for (const [words, text] of [[6, 'Designed for everyday wear, each piece...'], [40, 'Designed for everyday wear, each piece combines comfort clean details easy styling']]) {
          const s = {...base, show_short_description: true, short_description_words: words};
          await show(grid([cardWith(desc, {}, s), cardWith(meta, {}, s), cardWith(none, {}, s)]), s, width);
          const got = await page.$$eval('.product-item', els => els.map(el => { const p = el.querySelector('.product-item__short-description'); if (!p) return null; const cs = getComputedStyle(p); return {text: p.textContent, html: p.innerHTML, clamp: cs.webkitLineClamp, h: p.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight)}; }));
          assert.equal(got[0].text, text, `@${width} ${words} words: plain text, paragraphs and list items keep their spaces`);
          assert.equal(got[0].html, text, 'no tags left');
          assert.equal(got[1].text, 'Garment dyed cotton twill.', 'the short description field first');
          assert.equal(got[2], null, 'an empty description draws nothing');
          assert.equal(got[0].clamp, '3', 'three lines at most');
          assert.ok(got[0].h <= 3 * got[0].lh + 1, `@${width}: clamped (${got[0].h}px)`);
        }
      }
      ok('short description');
    }

    /* ── 6. Enable custom card styling: off is the theme exactly; on, only what is set ── */
    {
      const colours = {card_atc_bg: '#ff0000', card_atc_color: '#00ff00', card_atc_hover_bg: '#0000ff', card_atc_hover_color: '#ffff00', card_wish_bg: '#ff00ff', card_wish_color: '#00ffff', card_wish_border: '#123123',
        card_wish_active_bg: '#321321', card_wish_active_color: '#abcabc', card_wish_active_border: '#cbacba', card_wish_hover_bg: '#999000', card_wish_hover_color: '#000999', product_size: 18, price_size: 18, product_name_text_transform: 'uppercase', card_atc_button: 'outline'};
      const unset = Object.fromEntries(Object.keys(colours).filter(k => k.startsWith('card_') && k !== 'card_atc_button').map(k => [k, 'transparent']));
      assert.equal(JSON.parse(read('shopify/config/settings_schema.json')).flatMap(g => g.settings || []).find(x => x.id === 'enable_custom_card_actions').default, false, 'off by default');
      for (const width of WIDTHS) for (const style of ['standard', 'morden']) {
        const shot = async s => { await show(grid([cardWith(product(11, {sale: true}), {}, s)]), s, width, `<script>${CARD_SETTINGS_JS}</script>`); return snapshot(page); };
        const theme = await shot({...base, product_style: style, enable_custom_card_actions: false, ...unset, product_size: 14, price_size: 14, product_name_text_transform: 'unset', card_atc_button: 'auto'});
        const offWithValues = await shot({...base, product_style: style, enable_custom_card_actions: false, ...colours});
        assert.equal(offWithValues, theme, `${style}@${width}: off, every custom value is ignored`);
        const onUnset = await shot({...base, product_style: style, enable_custom_card_actions: true, ...unset, card_atc_button: 'primary', product_size: 14, price_size: 14, product_name_text_transform: 'unset'});
        const a = JSON.parse(theme), b = JSON.parse(onUnset);
        assert.deepEqual([b.btn[2], b.heart[1]], [a.btn[2], a.heart[1]], `${style}@${width}: on with every colour transparent, the theme colours stay`);
        const onOne = JSON.parse(await shot({...base, product_style: style, enable_custom_card_actions: true, ...unset, card_atc_button: 'primary', product_size: 14, price_size: 14, card_wish_bg: '#ff00ff'}));
        assert.equal(onOne.heart[1].split('|')[0], 'rgb(255, 0, 255)', `${style}@${width}: the one colour set applies`);
        assert.equal(onOne.btn[2], a.btn[2], `${style}@${width}: and nothing else changes`);
      }
      // Storelib's colour objects reach the live script as colour strings.
      const object = (hex, alpha = 1) => ({hex, alpha, red: 0, green: 0, blue: 0, rgba: alpha === 1 ? '0 0 0 / 1' : `255 0 0 / ${alpha}`});
      const html = customActions({...base, enable_custom_card_actions: true, card_atc_bg: object('#ff0000'), card_atc_color: object('#000000', 0), card_wish_bg: object('#ff0000', .5), card_wish_color: 'transparent'});
      const data = JSON.parse(html.match(/data-card-style-settings>([\s\S]*?)<\/script>/)[1]);
      assert.deepEqual([data.card_atc_bg, data.card_atc_color, data.card_wish_bg, data.card_wish_color], ['#ff0000', '', 'rgb(255 0 0 / 0.5)', ''], 'colour objects become CSS colours, transparent becomes empty');
      ok('custom styling toggle');
    }

    /* ── 7. Every Product badges setting on the real card ── */
    {
      const two = product(12, {sale: true, new: true, custom: 'Organic'});
      const badge = async (s, width = 1366) => {
        await show(grid([cardWith(two, {}, s), cardWith({...product(13, {soldOut: true})}, {}, s)]), s, width);
        return page.$$eval('.product__badges', els => els.map(st => ({stack: (() => { const b = st.getBoundingClientRect(), i = st.closest('.product-item__inner').getBoundingClientRect(); return {x: b.x - i.x, y: b.y - i.y, r: i.right - b.right, b: i.bottom - b.bottom}; })(), filter: getComputedStyle(st).filter,
          items: [...st.querySelectorAll('.product__badges-inner')].map(n => { const cs = getComputedStyle(n), b = n.getBoundingClientRect(); return {cls: n.className.split(' ')[0], shown: cs.display !== 'none', text: n.textContent.trim(), radius: cs.borderTopLeftRadius, clip: cs.clipPath, fs: cs.fontSize, fw: cs.fontWeight, tt: cs.textTransform, ls: cs.letterSpacing, pl: cs.paddingLeft, pt: cs.paddingTop, bg: cs.backgroundColor, color: cs.color, anim: cs.animationName, y: b.y, b: b.bottom, h: b.height}; })})));
      };
      const s0 = {...base, enable_custom_badges:true, badges_position: 'top_start', badges_shape: 'rectangle', badges_rounded_corner: 4, badges_size: 'medium', badges_uppercase: true, badges_letter_spacing: 1, badges_font_weight: '600', badges_padding_x: 10, badges_padding_y: 5, sale_badge_type: 'text', sale_label: 'Sale', badges_drop_shadow: false};
      for (const width of WIDTHS) {
        const ref = await badge(s0, width);
        const first = ref[0].items[0];
        assert.equal(ref[0].items.filter(i => i.shown).length, 3, 'three badges');
        const check = async (patch, test, label) => { const got = await badge({...s0, ...patch}, width); assert.ok(test(got, ref), `@${width} ${label}: ${JSON.stringify(got[0].items[0])} ${JSON.stringify(got[0].stack)}`); };
        await check({badges_shape: 'pill'}, g => g[0].items[0].radius === '999px', 'Shape: pill');
        await check({badges_shape: 'square'}, g => g[0].items[0].radius === '0px', 'Shape: square chip');
        await check({badges_shape: 'ribbon'}, g => g[0].items[0].clip.startsWith('polygon'), 'Shape: ribbon');
        await check({badges_shape: 'circle'}, g => g[0].items[0].radius === '50%', 'Shape: circle');
        await check({badges_rounded_corner: 12}, g => g[0].items[0].radius === '12px', 'Rounded corner');
        await check({badges_padding_x: 20}, g => g[0].items[0].pl === '20px', 'Horizontal padding');
        await check({badges_padding_y: 10}, g => g[0].items[0].pt === '10px', 'Vertical padding');
        await check({badges_offset_x: 20}, g => near(g[0].stack.x, 20), 'Edge offset (sides)');
        await check({badges_offset_y: 20}, g => near(g[0].stack.y, 20), 'Edge offset (top / bottom)');
        await check({badges_gap: 14}, g => near(g[0].items[1].y - g[0].items[0].b, 14), 'Gap between stacked badges');
        await check({badges_size: 'small'}, (g, r) => parseFloat(g[0].items[0].fs) < parseFloat(r[0].items[0].fs), 'Size: small');
        await check({badges_size: 'large'}, (g, r) => parseFloat(g[0].items[0].fs) > parseFloat(r[0].items[0].fs), 'Size: large');
        await check({badges_font_weight: '400'}, g => g[0].items[0].fw === '400', 'Font weight');
        await check({badges_uppercase: false}, g => g[0].items[0].tt === 'none', 'Uppercase off');
        await check({badges_letter_spacing: 4}, g => g[0].items[0].ls === '4px', 'Letter spacing');
        await check({badges_animation: 'pulse'}, g => g[0].items[0].anim === 'pc-badge-pulse', 'Animation');
        await check({badges_drop_shadow: true}, g => g[0].filter.includes('drop-shadow'), 'Badge shadow');
        await check({badges_stack_max: 1}, g => g[0].items.filter(i => i.shown).length === 1, 'Max badges shown');
        await check({show_sale: false}, g => !g[0].items.some(i => i.cls === 'product__badges-sale'), 'Show sale badge');
        await check({sale_label: 'Deal'}, g => g[0].items[0].text === 'Deal', 'Sale label text');
        await check({sale_badge_type: 'percent'}, g => /-\s*37\s*%/.test(g[0].items[0].text), 'Sale badge format: percent');
        await check({sale_badge_type: 'price'}, g => /Save/.test(g[0].items[0].text), 'Sale badge format: amount');
        await check({sale_color: '#123456', sale_background: '#abcdef'}, g => g[0].items[0].color === 'rgb(18, 52, 86)' && g[0].items[0].bg === 'rgb(171, 205, 239)', 'Sale colours');
        await check({new_color: '#010203', new_background: '#a0b0c0'}, g => g[0].items[1].color === 'rgb(1, 2, 3)' && g[0].items[1].bg === 'rgb(160, 176, 192)', 'New colours');
        await check({show_new: false}, g => !g[0].items.some(i => i.cls === 'product__badges-new'), 'Show new');
        await check({custom_badge_color: '#111111', custom_badge_background: '#00aa00'}, g => g[0].items[2].bg === 'rgb(0, 170, 0)' && g[0].items[2].color === 'rgb(17, 17, 17)', 'Custom badge colours');
        await check({sold_out_color: '#222222', sold_out_background: '#dddddd'}, g => g[1].items[0].bg === 'rgb(221, 221, 221)' && g[1].items[0].color === 'rgb(34, 34, 34)', 'Sold out colours');
        await check({show_sold_out: false}, g => !g.some(st => st.items.some(i => i.cls === 'product__badges-sold-out')), 'Show sold out');
        for (const pos of ['top_end', 'bottom_start', 'bottom_end']) {
          await check({badges_position: pos}, g => (pos.startsWith('top') ? near(g[0].stack.y, 8) : g[0].stack.b >= 7) && (pos.endsWith('end') ? near(g[0].stack.r, 8) : near(g[0].stack.x, 8)), 'Position ' + pos);
        }
      }
      // Pre-order: tracked stock at zero that still sells.
      const pre = product(14); pre.variants = pre.variants.map(v => ({...v, inventory_quantity: 0, available: true})); pre.available = true;
      const got = await badge({...s0, pre_order_color: '#0a0a0a', pre_order_background: '#fafa00'});
      assert.ok(got, 'drawn');
      await show(grid([cardWith(pre, {}, {...s0, pre_order_color: '#0a0a0a', pre_order_background: '#fafa00'})]), {...s0, pre_order_color: '#0a0a0a', pre_order_background: '#fafa00'}, 1366);
      assert.deepEqual(await page.$eval('.product__badges-pre-order', el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]), ['rgb(10, 10, 10)', 'rgb(250, 250, 0)'], 'Pre-order colours');
      ok('every Product badges setting');
    }

    /* ── 8. Clicks always reach the card, hovered or not (storefront and builder) ── */
    for (const effect of ['hover_zoom', 'hover_tilt', 'hover_pan', 'hover_zoom_out', 'hover_lift', 'hover_blur']) {
      const s = {...base, product_hover_effect: effect, show_secondary_image: true, badges_position: 'top_end'};
      await show(`<div class="shopify-section">${grid([cardWith(many, {}, s), cardWith(plain, {}, s)])}</div>`, s, 1366);
      await page.evaluate(() => { window.__opens = 0; document.addEventListener('click', e => { if (e.target.closest('a.product__media')) { e.preventDefault(); window.__opens++; } }); });
      const box = await page.locator('.product-item__inner').first().boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3); await page.waitForTimeout(700);
      const hits = await page.evaluate(() => {
        const inner = document.querySelector('.product-item__inner'), b = inner.getBoundingClientRect();
        const pts = []; for (const fx of [.15, .5, .85]) for (const fy of [.1, .3, .5, .7]) pts.push([b.x + b.width * fx, b.y + b.height * fy]);
        return pts.map(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? (el.closest('button-wishlist, button, a.product__media') || el).tagName + (el.tagName === 'IMG' ? '!img' : '') : 'none'; });
      });
      assert.ok(hits.every(h => /^(A|BUTTON|BUTTON-WISHLIST)$/.test(h)), `${effect}: every point of a hovered card is the link or a button (${hits.join(' ')})`);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
      assert.equal(await page.evaluate(() => window.__opens), 1, `${effect}: a click on the hovered picture opens the product`);
      // Near the bottom edge the card stays hovered (Lift no longer drops it back under the pointer).
      await page.mouse.move(box.x + box.width / 2, box.y + box.height - 3); await page.waitForTimeout(500);
      const states = [];
      for (let k = 0; k < 6; k++) { states.push(await page.$eval('.product-item__inner', el => el.matches(':hover'))); await page.waitForTimeout(60); }
      assert.ok(states.every(Boolean), `${effect}: stays hovered near the bottom edge (${states})`);
      // Its own layer: nothing in the card paints over a builder outline laid on the section.
      const covered = await page.evaluate(() => {
        const sec = document.querySelector('.shopify-section'); sec.style.position = 'relative';
        const o = document.createElement('div'); o.style.cssText = 'position:absolute;inset:0;z-index:1;'; o.id = 'fx-outline'; sec.append(o);
        const h = document.querySelector('.pc-heart button-wishlist').getBoundingClientRect(), p = document.querySelector('.product-item__inner').getBoundingClientRect();
        const ids = [document.elementFromPoint(h.x + 22, h.y + 22)?.id, document.elementFromPoint(p.x + p.width / 2, p.bottom - 20)?.id]; o.remove(); return ids;
      });
      assert.deepEqual(covered, ['fx-outline', 'fx-outline'], `${effect}: the card's buttons stay under the builder's layer`);
      await page.mouse.move(1, 1);
    }
    // In the builder's canvas (an iframe), a click on a hovered card lands on the card.
    {
      const s = {...base, product_hover_effect: 'hover_tilt', show_secondary_image: true, badges_position: 'top_end'};
      await serve(page, {'/': `<!doctype html><body style="margin:0"><iframe src="/canvas" style="width:1366px;height:900px;border:0"></iframe></body>`, '/canvas': documentFor(`<div class="shopify-section" id="shopify-section-fx">${grid([cardWith(many, {}, s)])}</div>`, s)});
      await page.setViewportSize({width: 1366, height: 900});
      await page.goto(ORIGIN + '/');
      const frame = page.frames().find(f => f.url().endsWith('/canvas'));
      await frame.waitForSelector('.product-item__inner');
      await frame.evaluate(() => { window.__hits = []; document.addEventListener('click', e => { e.preventDefault(); window.__hits.push(e.target.closest('.shopify-section')?.id || 'none'); }, true); });
      const box = await frame.locator('.product-item__inner').boundingBox();
      for (const [fx, fy] of [[.5, .5], [.2, .8], [.9, .1], [.5, .95]]) {
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(400);
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
      }
      assert.deepEqual(await frame.evaluate(() => window.__hits), Array(4).fill('shopify-section-fx'), 'every click reaches the section');
      ok('clicks reach the card');
    }

    assert.deepEqual(errors, [], 'no page errors');
    console.log(`theme-cards-round3: ${passed} groups passed`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
