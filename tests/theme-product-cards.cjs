/* Run: node tests/theme-product-cards.cjs
   Product cards, product badges and the collection tabs section, rendered
   from the repository's own snippets/product-item, snippets/product-badges
   and sections/collection-tab through a small Liquid subset (below), then
   drawn in Chromium with the theme's real CSS (critical, theme, animation,
   product-card, theme-button-contract) and the real button sync script.
   Checks: add to cart alignment and height in every card style at 375, 768
   and 1366px, with and without variants, sold out and on sale; every
   Product badges setting; tab switching with no layout shift (a
   PerformanceObserver on layout-shift), no blank frame, keyboard and touch.
   It does not replace Storelib's renderer or a live-site check. */
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
  if (/^'[\s\S]*'$|^"[\s\S]*"$/.test(expr)) return expr.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
  if (expr === 'true') return true; if (expr === 'false') return false;
  if (expr === 'nil' || expr === 'null') return null;
  if (expr === 'blank') return BLANK; if (expr === 'empty') return EMPTY;
  const parts = expr.replace(/\[(\d+)\]/g, '.$1').replace(/\[['"]([^'"]+)['"]\]/g, '.$1').replace(/\[([A-Za-z_]\w*(?:\.\w+)*)\]/g, (_, key) => '.' + lookup(ctx,key)).split('.');
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
    case 'join': return (Array.isArray(v) ? v : v == null ? [] : [v]).join(a[0] ?? ' ');
    case 'remove': return String(v ?? '').split(a[0]).join('');
    case 'downcase': return String(v ?? '').toLowerCase();
    case 'truncate': { const s = String(v ?? ''), n = Number(a[0] ?? 50), e = a[1] ?? '...'; return s.length <= n ? s : s.slice(0, Math.max(0, n - e.length)) + e; }
    case 'truncatewords': { const w = String(v ?? '').split(/\s+/).filter(Boolean), n = Number(a[0] ?? 15), e = a[1] ?? '...'; return w.length <= n ? w.join(' ') : w.slice(0, n).join(' ') + e; }
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
    case 'newline_to_br': return String(v ?? '').replace(/\r?\n/g, '<br />');
    case 'money': return 'R$' + (Number(v || 0) / 100).toFixed(2);
    case 'date': return v === 'now' ? Math.floor(Date.now() / 1000) : Math.floor(new Date(v).getTime() / 1000);
    case 'where': return (v || []).filter(x => x[a[0]] === a[1]);
    case 'image_url': return v?.src ?? v;
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
  'scheme-color': a => (isBlank(a.color) || ['transparent', 'rgba(0,0,0,0)', 'rgba(0, 0, 0, 0)', '#00000000'].includes(String(a.color)) ? a.fallback : a.color) ?? '',
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
const CSS = ['critical.css', 'section-isolation.css', 'animation.css', 'product-card.css', 'theme.css', 'theme-button-contract.css', 'collection-tab.css'].map(f => read('shopify/assets/' + f)).join('\n');
// The collection tabs' script is a cached asset the section loads with <script defer>.
const TABS_JS = read('shopify/assets/collection-tab.js');
const EXPERIENCE = read('shopify/assets/materia-experience.js');
async function draw(page, html, s, extraCss = '') {
  await page.setContent(`<!doctype html><html dir="ltr" data-badge-custom="${s.enable_custom_badges === true}"><head><style>${themeRoot(s)}</style><style>${CSS}</style><style>${extraCss}</style></head><body ${bodyAttrs(s)}>${html}</body></html>`);
  await page.evaluate(() => { window.__materiaExperienceReady = false; });
  await page.addScriptTag({content: EXPERIENCE});
  await page.evaluate(() => document.fonts.ready);
}
const grid = cards => `<div class="container" style="padding:0 16px;box-sizing:border-box"><div style="display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:16px;--cols:2" class="fx-grid">${cards.map(c => `<div class="grid__item">${c}</div>`).join('')}</div></div>
<style>@media (min-width:768px){.fx-grid{--cols:3!important}}@media (min-width:1200px){.fx-grid{--cols:4!important}}</style>`;

(async () => {
  const browser = await chromium.launch({executablePath: ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f)), headless: true, args: ['--no-sandbox']});
  let passed = 0;
  const errors = [];
  const ok = label => { passed++; if (process.env.VERBOSE) console.log('ok', label); };
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));

    /* Cleared pickers and deleted product records never get live actions. */
    for (const style of ['standard','morden']) for (const p of [null,{}, {title:'Deleted product'}, {id:'',title:'Deleted product'}]) {
      await page.setContent(card(p,{}, {...config,product_style:style,show_wishlist:true,show_add_cart:true}));
      assert.equal(await page.locator('button-wishlist,button-quickview,button[name="add"],product-form').count(),0,'missing product id cannot render actionable controls');
    }
    const bundleTemplate=templateOf(read('snippets/product-item-bundle.storelib'));
    await page.setContent(renderTemplate(bundleTemplate,{settings:{...config,show_wishlist:true,show_add_cart:true},card_product:{title:'Deleted bundle product'},section:{settings:{}},request:{locale:{iso_code:'en'}},pages:{}},env));
    assert.equal(await page.locator('button-wishlist,button[name="add"],product-form-bundle').count(),0);ok('missing product bindings');

    // Real custom element: clearing and restoring a binding on the same node
    // (as in the editor) must hide/restore its action, without touching storage.
    await page.setContent('<div class="ti-tabs__panel"><div class="ti-tabs__empty">No products found.</div><button-wishlist data-product-id="old">Heart</button-wishlist><div class="product-item">Stale card</div></div><div id="valid"><button-wishlist data-product-id="real">Heart</button-wishlist></div><button-wishlist id="missing">Heart</button-wishlist>');
    await page.addStyleTag({content:read('shopify/assets/materia-experience.css')});
    await page.evaluate(()=>{window.MateriaWishlist={has:()=>false,add(){throw Error('empty binding must never update wishlist')},remove(){}};});
    const wishlistSource=read('shopify/assets/theme.js');
    await page.addScriptTag({content:wishlistSource.slice(wishlistSource.indexOf('class ButtonWishlist extends HTMLElement'),wishlistSource.indexOf('customElements.define("button-wishlist", ButtonWishlist);')+'customElements.define("button-wishlist", ButtonWishlist);'.length)});
    assert.equal(await page.locator('.ti-tabs__panel button-wishlist').isVisible(),false);
    assert.equal(await page.locator('.ti-tabs__panel .product-item').isVisible(),false);
    assert.equal(await page.locator('#missing').isVisible(),false);
    assert.equal(await page.locator('#valid button-wishlist').isVisible(),true);
    await page.$eval('#valid button-wishlist',el=>{el.dataset.productId='';el.click();});
    assert.equal(await page.locator('#valid button-wishlist').isVisible(),false);
    assert.equal(await page.locator('#valid button-wishlist').getAttribute('tabindex'),'-1');
    await page.$eval('#valid button-wishlist',el=>el.dataset.productId='restored');
    assert.equal(await page.locator('#valid button-wishlist').isVisible(),true);
    assert.equal(await page.locator('#valid button-wishlist').getAttribute('tabindex'),'0');ok('empty collection redraw and restored wishlist binding');

    /* ── 1. Add to cart: every card style, width and product state ── */
    const states = [
      ['simple', product(1)],
      ['variants', product(2, {variants: [{title: 'S'}, {title: 'M'}, {title: 'L'}], title: 'Relaxed linen trousers with a much longer name that wraps'})],
      ['sold-out', product(3, {soldOut: true})],
      ['sale', product(4, {sale: true, new: true})],
    ];
    for (const style of ['standard', 'morden']) for (const wishlist of [false, true]) for (const width of [375, 768, 1366]) {
      const s = {...config, badges_position:'top_start', product_style: style, show_wishlist: wishlist, show_sale: true, show_sold_out: true, show_new: true, show_action_on_mobile: true};
      await page.setViewportSize({width, height: 900});
      await draw(page, grid(states.map(([, p], k) => card(p, {index: k + 1}, s))), s);
      const cards = await page.$$eval('.product-item', els => els.map(el => {
        // Resting place: the hidden-until-hover offset (translate) left out.
        const shift = n => { let x = 0, y = 0; for (let p = n; p && p !== el; p = p.parentElement) { const t = getComputedStyle(p).translate; if (t && t !== 'none') { const [a, b = '0'] = t.split(' '); x += parseFloat(a); y += parseFloat(b); } } return {x, y}; };
        const r = n => { if (!n) return null; const b = n.getBoundingClientRect(), d = shift(n); return {x: b.x - d.x, y: b.y - d.y, w: b.width, h: b.height, r: b.right - d.x, b: b.bottom - d.y}; };
        const btn = el.querySelector('button[name="add"]'), media = el.querySelector('.product-item__inner');
        const cs = getComputedStyle(btn);
        return {card: r(el), media: r(media), btn: r(btn), icon: r(btn.querySelector('.pc-atc__icon')), label: btn.querySelector('.pc-atc__label')?.textContent.trim(), name: btn.textContent.replace(/\s+/g, ' ').trim(),
          disabled: btn.disabled, role: btn.dataset.themeButton, appearance: btn.dataset.buttonAppearance, pos: cs.position, wish: r(el.querySelector('.product-item__button-action button-wishlist')),
          padding: cs.paddingLeft, bg: cs.backgroundColor, color: cs.color, form: r(btn.closest('product-form')), wrapper: r(el.querySelector('.product-item__wrapper'))};
      }));
      const tag = `${style} wishlist=${wishlist} @${width}`;
      for (const [k, c] of cards.entries()) {
        const where = `${tag} ${states[k][0]}`;
        assert.ok(c.role, `${where}: button carries data-theme-button in the markup`);
        // The icon buttons (+ and heart) are 44px circles on every width,
        // 8px from the edge on phones (two cards a row), 12px on tablets.
        const phone = width < 750, icon = 44, edge = phone ? 8 : 12, glyph = 16;
        const iconButton = style === 'standard' && width < 1025;
        assert.equal(c.btn.h, iconButton ? icon : 44, `${where}: one ${iconButton ? icon : 44}px height`);
        assert.ok(c.btn.w >= (iconButton ? icon : 44), `${where}: at least a ${iconButton ? icon : 44}px button`);
        if (style === 'standard') {
          if (width < 1025) {
            assert.equal(Math.round(c.btn.w), icon, `${where}: icon button is square`);
            assert.ok(c.icon && c.icon.w === glyph, `${where}: the + icon is drawn`);
            assert.ok(Math.abs(Math.round(c.btn.x + c.icon.w / 2 + (c.btn.w - c.icon.w) / 2) - Math.round(c.icon.x + c.icon.w / 2)) <= 1, `${where}: icon centred`);
            assert.ok(Math.abs(c.media.r - c.btn.r - edge) <= 1 && Math.abs(c.media.b - c.btn.b - edge) <= 1, `${where}: ${edge}px from the image's bottom end corner (got ${c.media.r - c.btn.r}, ${c.media.b - c.btn.b})`);
            if (wishlist) assert.ok(Math.abs(c.wish.x - c.btn.x) <= 1 && c.wish.w === icon && Math.abs(c.wish.y - c.media.y - edge) <= 1, `${where}: the heart in the top end corner, in the +'s column`);
          } else {
            assert.ok(Math.abs(c.btn.x - c.media.x - 15) <= 1 && Math.abs(c.media.r - c.btn.r - 15) <= 1, `${where}: full width with 15px sides`);
            assert.ok(Math.abs(c.media.b - c.btn.b - 15) <= 1, `${where}: 15px above the image's bottom edge`);
            assert.ok(c.media.h > c.media.w, `${where}: the image box is not stretched by the button`);
            if (wishlist) assert.ok(c.wish.b < c.btn.y && c.wish.x > c.btn.x, `${where}: wishlist sits in the top end corner, clear of the button`);
          }
        } else {
          if (width >= 1025) {
            assert.ok(c.btn.y >= c.media.b, `${where}: modern button sits under the details`);
            assert.ok(Math.abs(c.btn.w - c.media.w) <= 1, `${where}: modern button spans the card`);
          }
        }
        assert.match(c.name, k === 2 ? /Sold out/ : /Add to cart/, `${where}: accessible label`);
        if (k === 2) assert.ok(c.disabled, `${where}: sold out is disabled`);
      }
      // Buttons in one row share one baseline and cards share one height.
      const rows = new Map(); cards.forEach(c => { const key = Math.round(c.card.y); rows.set(key, [...(rows.get(key) || []), c]); });
      for (const row of rows.values()) {
        if (row.length < 2) continue;
        assert.equal(new Set(row.map(c => Math.round(c.btn.y))).size, 1, `${tag}: add to cart buttons line up across the row`);
        assert.equal(new Set(row.map(c => Math.round(c.wrapper.h))).size, 1, `${tag}: equal card heights in a row`);
      }
      ok(tag);
    }

    /* ── 2. Desktop hover: reveal with opacity/translate, image swap with no blank frame ── */
    {
      const s = {...config, product_style: 'standard', show_wishlist: true, show_secondary_image: true};
      await page.setViewportSize({width: 1366, height: 900});
      await draw(page, grid([card(product(1), {}, s), card(product(2), {}, s)]), s);
      const before = await page.$eval('.grid__item:first-child .pc-form--media', el => ({o: getComputedStyle(el).opacity, p: getComputedStyle(el).pointerEvents, t: getComputedStyle(el).translate, tr: getComputedStyle(el).transitionProperty}));
      assert.equal(before.o, '0'); assert.equal(before.p, 'none'); assert.match(before.tr, /opacity/); assert.match(before.tr, /translate/);
      const layoutBefore = await page.$eval('.grid__item:first-child .product-item', el => el.getBoundingClientRect().height);
      // Sample the image swap every frame: one of the two images is always opaque.
      await page.evaluate(() => {
        window.__minCover = 1;
        const a = document.querySelector('.grid__item:first-child .first-image'), b = document.querySelector('.grid__item:first-child .secondary-image');
        const tick = () => { const oa = +getComputedStyle(a).opacity, ob = +getComputedStyle(b).opacity; window.__minCover = Math.min(window.__minCover, 1 - (1 - oa) * (1 - ob)); if (window.__sampling) requestAnimationFrame(tick); };
        window.__sampling = true; requestAnimationFrame(tick);
      });
      await page.hover('.grid__item:first-child .product-item__inner');
      await page.waitForTimeout(800);
      const after = await page.$eval('.grid__item:first-child .pc-form--media', el => ({o: getComputedStyle(el).opacity, p: getComputedStyle(el).pointerEvents, t: getComputedStyle(el).translate}));
      assert.equal(after.o, '1'); assert.equal(after.p, 'auto'); assert.ok(after.t === 'none' || after.t === '0px', 'button settles in place: ' + after.t);
      assert.equal(await page.$eval('.grid__item:first-child .secondary-image', el => getComputedStyle(el).opacity), '1');
      await page.mouse.move(5, 5); await page.waitForTimeout(800);
      const cover = await page.evaluate(() => { window.__sampling = false; return window.__minCover; });
      assert.ok(cover > 0.97, 'image swap never shows the empty box (min cover ' + cover + ')');
      assert.equal(await page.$eval('.grid__item:first-child .product-item', el => el.getBoundingClientRect().height), layoutBefore, 'hover does not change the card size');
      // Tab reaches the button and focus shows it.
      await page.focus('.grid__item:first-child .product__media');
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement.matches('button-wishlist'))) await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.name), 'add', 'Tab reaches add to cart');
      await page.waitForTimeout(400);
      assert.equal(await page.$eval('.grid__item:first-child .pc-form--media', el => getComputedStyle(el).opacity), '1', 'focus shows it');
      // Touch screens this wide: always shown.
      await page.emulateMedia({reducedMotion: 'reduce'});
      assert.equal(await page.$eval('.grid__item:first-child .pc-form--media', el => getComputedStyle(el).translate), 'none', 'reduced motion: no slide');
      await page.emulateMedia({reducedMotion: 'no-preference'});
      ok('hover');
    }

    /* ── 3. Theme Settings > Buttons reach the card buttons ── */
    {
      await page.setViewportSize({width: 1366, height: 900});
      for (const [style, expectBg] of [['solid', 'rgb(51, 51, 51)'], ['outline', 'rgba(0, 0, 0, 0)']]) {
        const s = {...config, product_style: 'standard', btn_style: style};
        await draw(page, grid([card(product(1), {}, s)]), s);
        const st = await page.$eval('button[name="add"]', el => ({a: el.dataset.buttonAppearance, bg: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderTopLeftRadius}));
        assert.equal(st.a, style); assert.equal(st.bg, expectBg); assert.equal(st.radius, '5px');
      }
      // Product cards > custom action colours go in as contract tokens.
      const s = {...config, product_style:'standard', btn_style:'solid', enable_custom_card_actions: true, card_atc_bg: '#fefefe', card_atc_color: '#111111'};
      const custom = renderTemplate(templateOf(read('snippets/product-card-custom-actions.storelib')), {settings: s}, env);
      await draw(page, custom + grid([card(product(1), {}, s), card(product(3, {soldOut: true}), {}, s)]), s);
      const c = await page.$$eval('button[name="add"]', els => els.map(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]));
      assert.deepEqual(c[0], ['rgb(254, 254, 254)', 'rgb(17, 17, 17)'], 'custom add to cart colours apply');
      assert.notDeepEqual(c[1], ['rgb(51, 51, 51)', 'rgb(255, 255, 255)'], 'sold out is not painted as a live primary button');
      ok('buttons');
    }

    /* ── 4. Badges: every Product badges setting ── */
    {
      const many = product(5, {sale: true, new: true, custom: 'Organic'});
      const base = {...config, enable_custom_badges:true, show_sale: true, show_new: true, show_sold_out: true, show_wishlist: true, sale_badge_type: 'text', badges_stack_max: 4};
      const measure = async (s, width = 1366, p = many) => {
        await page.setViewportSize({width, height: 900});
        await draw(page, grid([card(p, {}, s), card(product(6), {}, s)]), s);
        return page.$eval('.grid__item:first-child .product-item', el => {
          const r = n => n.getBoundingClientRect();
          const box = el.querySelector('.product__badges'), inner = el.querySelector('.product-item__inner');
          const items = [...box.querySelectorAll('.product__badges-inner')].filter(n => n.getClientRects().length);
          // Buttons drawn now (a hover-only button at rest has opacity 0 and is checked on hover below).
          const shown = n => { for (let p = n; p; p = p.parentElement) if (getComputedStyle(p).opacity === '0' || getComputedStyle(p).visibility === 'hidden') return false; return true; };
          const icons = [...el.querySelectorAll('.product-item__inner button-wishlist, .product-item__inner button[name="add"]')].filter(shown).map(r);
          return {box: r(box), inner: r(inner), items: items.map(n => ({r: r(n), cs: (({borderTopLeftRadius, paddingTop, paddingLeft, fontSize, textTransform, fontWeight, letterSpacing, color, backgroundColor, animationName, clipPath}) => ({borderTopLeftRadius, paddingTop, paddingLeft, fontSize, textTransform, fontWeight, letterSpacing, color, backgroundColor, animationName, clipPath}))(getComputedStyle(n)), text: n.textContent.trim()})), filter: getComputedStyle(box).filter, icons};
        });
      };
      const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      // Offsets and position
      for (const pos of ['top_start', 'top_end', 'bottom_start', 'bottom_end']) for (const width of [375, 1366]) {
        const m = await measure({...base, badges_position: pos, badges_offset_x: 14, badges_offset_y: 9}, width);
        const first = m.items[0].r;
        if (pos === 'top_start') assert.equal(Math.round(m.box.y - m.inner.y), 9, `${pos}@${width}: top offset`);
        else if (pos === 'top_end') assert.equal(Math.round(m.box.y - m.inner.y), 9, `${pos}@${width}: exact selected top offset`);
        else assert.ok(m.inner.bottom - m.box.bottom >= 9 - 0.5, `${pos}@${width}: bottom offset`);
        if (pos.endsWith('start')) assert.equal(Math.round(first.x - m.inner.x), 14, `${pos}@${width}: side offset`);
        else assert.ok(Math.abs(m.inner.right - first.right - 14) < 1, `${pos}@${width}: end badge stays at the selected image edge`);
        for (const it of m.items) for (const icon of m.icons) if (icon.width) assert.ok(!overlaps(it.r, icon), `${pos}@${width}: badge "${it.text}" clear of the card buttons ${JSON.stringify({badge:it.r,icon,inner:m.inner,box:m.box})}`);
        assert.ok(m.items.every(it => it.r.x >= m.inner.x && it.r.right <= m.inner.right + 0.5), `${pos}@${width}: badges inside the image`);
      }
      // Bottom badges step out of the add to cart strip on hover (desktop).
      {
        await measure({...base, badges_position: 'bottom_start'}, 1366);
        await page.hover('.grid__item:first-child .product-item__inner'); await page.waitForTimeout(650);
        const r = await page.$eval('.grid__item:first-child', el => ({b: [...el.querySelectorAll('.product__badges-inner')].map(n => n.getBoundingClientRect()), btn: el.querySelector('button[name="add"]').getBoundingClientRect()}));
        assert.ok(r.b.every(b => b.bottom <= r.btn.top + 0.5), 'bottom badges sit above the revealed button');
      }
      // Gap, stack max
      let m = await measure({...base, badges_gap: 11});
      assert.equal(Math.round(m.items[1].r.y - m.items[0].r.bottom), 11, 'gap between stacked badges');
      assert.equal(m.items.length, 3, 'sale, new and custom badge');
      m = await measure({...base, badges_stack_max: 2}); assert.equal(m.items.length, 2, 'max badges shown');
      m = await measure({...base, badges_stack_max: 1}); assert.equal(m.items.length, 1, 'max badges shown: 1');
      // Shape and corner
      for (const [shape, check] of [['rectangle', cs => cs.borderTopLeftRadius === '7px'], ['pill', cs => parseFloat(cs.borderTopLeftRadius) >= 999], ['square', cs => cs.borderTopLeftRadius === '0px'], ['ribbon', cs => cs.clipPath.startsWith('polygon')], ['circle', cs => cs.borderTopLeftRadius === '50%']]) {
        m = await measure({...base, badges_shape: shape, badges_rounded_corner: 7});
        assert.ok(check(m.items[0].cs), `shape ${shape}: ${JSON.stringify(m.items[0].cs)}`);
        if (shape === 'circle') assert.ok(Math.abs(m.items[0].r.width - m.items[0].r.height) < 1, 'circle badge is round');
      }
      // Size scales the font and the padding settings
      const sizes = {};
      for (const size of ['small', 'medium', 'large']) { m = await measure({...base, badges_size: size, badges_padding_x: 10, badges_padding_y: 4}); sizes[size] = m.items[0].cs; }
      assert.deepEqual([sizes.small.fontSize, sizes.medium.fontSize, sizes.large.fontSize], ['10px', '11px', '13px']);
      assert.deepEqual([sizes.small.paddingLeft, sizes.medium.paddingLeft, sizes.large.paddingLeft], ['8px', '10px', '12.5px'], 'padding setting scaled by size');
      assert.equal(sizes.medium.paddingTop, '4px', 'vertical padding setting');
      // Uppercase, weight, letter spacing, colours per type
      m = await measure({...base, badges_uppercase: false, badges_font_weight: '700', badges_letter_spacing: 3, sale_color: '#010203', sale_background: '#fafbfc', new_background: '#3456e6', custom_badge_background: '#123123'});
      assert.equal(m.items[0].cs.textTransform, 'none'); assert.equal(m.items[0].cs.fontWeight, '700'); assert.equal(m.items[0].cs.letterSpacing, '3px');
      assert.equal(m.items[0].cs.color, 'rgb(1, 2, 3)'); assert.equal(m.items[0].cs.backgroundColor, 'rgb(250, 251, 252)');
      assert.equal(m.items[1].cs.backgroundColor, 'rgb(52, 86, 230)', 'new badge colour'); assert.equal(m.items[2].cs.backgroundColor, 'rgb(18, 49, 35)', 'custom badge colour');
      m = await measure({...base, badges_uppercase: true}); assert.equal(m.items[0].cs.textTransform, 'uppercase');
      const soldOut = await measure({...base, sold_out_background: '#445566'}, 1366, product(7, {soldOut: true}));
      assert.equal(soldOut.items[0].text, 'Sold out'); assert.equal(soldOut.items[0].cs.backgroundColor, 'rgb(68, 85, 102)', 'sold out badge colour');
      // Shadow
      m = await measure({...base, badges_drop_shadow: true}); assert.match(m.filter, /drop-shadow/);
      m = await measure({...base, badges_drop_shadow: false}); assert.equal(m.filter, 'none');
      // Animation, and none under reduced motion
      for (const anim of ['pulse', 'bounce', 'wobble', 'slide', 'fade']) { m = await measure({...base, badges_animation: anim}); assert.match(m.items[0].cs.animationName, new RegExp('pc-badge-' + anim), anim); }
      m = await measure({...base, badges_animation: 'shine'});
      assert.equal(await page.$eval('.product__badges-inner', el => getComputedStyle(el, '::after').animationName), 'pc-badge-shine');
      await page.emulateMedia({reducedMotion: 'reduce'});
      m = await measure({...base, badges_animation: 'pulse'}); assert.equal(m.items[0].cs.animationName, 'none', 'reduced motion stops badge animation');
      await page.emulateMedia({reducedMotion: 'no-preference'});
      ok('badges');
    }

    /* ── 5. Collection tabs ── */
    {
      const section = read('sections/collection-tab.storelib');
      const schema = JSON.parse(section.slice(section.indexOf('<schema>') + 8, section.indexOf('</schema>'))).shopify;
      const defaults = Object.fromEntries(schema.settings.filter(x => x.id).map(x => [x.id, x.default]));
      const colA = {id:'a',title: 'New in', url: '/collections/a', products_count: 4, products: [1, 2, 3, 4].map(n => product(n, {sale: n === 2}))};
      const colB = {id:'b',title: 'Best sellers', url: '/collections/b', products_count: 8, products: [5, 6, 7, 8, 9, 10, 11, 12].map(n => product(n, {variants: n % 2 ? [{title: 'S'}, {title: 'M'}] : null}))};
      const colC = {id:'c',title: 'Accessories and small leather goods', url: '/collections/c', products_count: 2, products: [13, 14].map(n => product(n))};
      const blocks = [['b1', 'a'], ['b2', 'b'], ['b3', 'c'], ['b4', 'a'], ['b5', 'b']].map(([id, c]) => ({id, type: 'collection', settings: {collection: c, collection_title: '', tab_icon: null}, shopify_attributes: ''}));
      const drawTabs = async (settings, width) => {
        const st = {...defaults, show_load_more_button: false, rows: 2, items_to_show: 8, ...settings};
        const html = renderTemplate(templateOf(section), {settings: config, section: {id: 'tabs1', settings: st, blocks}, collections: {a: colA, b: colB, c: colC}, request: {locale: {iso_code: 'en'}}}, env);
        await page.setViewportSize({width, height: 800});
        await page.setContent(`<!doctype html><html dir="ltr"><head><style>${themeRoot(config)}</style><style>${CSS}</style></head><body ${bodyAttrs(config)}><div style="height:40px"></div><div id="shopify-section-tabs1" class="shopify-section">${html}</div><div id="below" style="height:600px">Below</div></body></html>`);
        // setContent keeps the window, so the once-per-page guard is reset for each new page.
        await page.evaluate(() => { delete window.MateriaCollectionTabs; });
        await page.addScriptTag({content: TABS_JS});
        await page.evaluate(() => { window.__materiaExperienceReady = false; });
        await page.addScriptTag({content: EXPERIENCE});
        await page.evaluate(() => document.fonts.ready);
        // Let the section's own entrance (theme scroll animation) finish first.
        await page.evaluate(() => Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))));
      };
      for (const tab_style of ['pill', 'underline', 'button', 'text']) for (const width of [375, 768, 1366]) {
        const where = `${tab_style}@${width}`;
        await drawTabs({tab_style, tab_switch_animation: 'fade'}, width);
        const tablist = await page.$eval('[role="tablist"]', el => ({tabs: [...el.querySelectorAll('[role="tab"]')].map(t => [t.id, t.tabIndex, t.getAttribute('aria-selected'), t.getAttribute('aria-controls')]), panels: [...document.querySelectorAll('[role="tabpanel"]')].map(p => [p.id, p.getAttribute('aria-labelledby'), p.inert])}));
        assert.equal(tablist.tabs.filter(t => t[1] === 0).length, 1, `${where}: one tab in the tab order`);
        tablist.panels.forEach((p, k) => { assert.ok(tablist.tabs.some(t => t[0] === p[1]), `${where}: panel labelled by its tab`); assert.equal(p[2], k !== 0, `${where}: hidden panels are inert`); });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${where}: no sideways page scroll`);
        const nav = await page.$eval('.ti-tabs__nav', el => ({sw: el.scrollWidth, cw: el.clientWidth, snap: getComputedStyle(el).scrollSnapType, ox: getComputedStyle(el).overflowX}));
        assert.equal(nav.ox, 'auto'); assert.match(nav.snap, /x/);
        if (width === 375) assert.ok(nav.sw > nav.cw, `${where}: the pill row scrolls on a phone`);
        const tabH = await page.$$eval('[role="tab"]', els => els.map(e => e.offsetHeight));
        assert.ok(tabH.every(h => h >= 44), `${where}: 44px tab targets`);
        // Watch layout shifts and sample every frame for a blank panel area.
        await page.evaluate(() => {
          window.__shifts = [];
          new PerformanceObserver(list => list.getEntries().forEach(e => window.__shifts.push(e.value))).observe({type: 'layout-shift', buffered: false});
          const wrap = document.querySelector('.ti-tabs__panels');
          window.__frames = []; window.__sample = true;
          const tick = () => {
            const visible = [...wrap.children].reduce((a, p) => Math.max(a, +getComputedStyle(p).opacity * (getComputedStyle(p).visibility === 'visible' ? 1 : 0)), 0);
            window.__frames.push({h: wrap.offsetHeight, below: document.getElementById('below').getBoundingClientRect().top, visible});
            if (window.__sample) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        const panelsH = await page.$eval('.ti-tabs__panels', el => el.offsetHeight);
        const tabs = await page.$$('[role="tab"]');
        // Click, then keyboard.
        await tabs[2].click(); await page.waitForTimeout(450);
        assert.equal(await tabs[2].getAttribute('aria-selected'), 'true', `${where}: click selects`);
        await tabs[2].focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(450);
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-block-id')), 'b4', `${where}: ArrowRight moves focus`);
        assert.equal(await tabs[3].getAttribute('aria-selected'), 'true', `${where}: ArrowRight opens the next tab`);
        await page.keyboard.press('End'); await page.waitForTimeout(100); await page.keyboard.press('Home'); await page.waitForTimeout(100);
        await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(450);
        assert.equal(await tabs[4].getAttribute('aria-selected'), 'true', `${where}: ArrowLeft from the first tab wraps to the last`);
        const frames = await page.evaluate(() => { window.__sample = false; return window.__frames; });
        const shifts = await page.evaluate(() => window.__shifts);
        assert.equal(shifts.reduce((a, b) => a + b, 0), 0, `${where}: no layout shift while switching (${shifts})`);
        assert.ok(frames.every(f => Math.abs(f.h - panelsH) < 0.5), `${where}: panel height never jumps`);
        assert.ok(frames.every(f => Math.abs(f.below - frames[0].below) < 0.5), `${where}: content below never moves`);
        assert.ok(frames.every(f => f.visible > 0.45), `${where}: no blank frame (min ${Math.min(...frames.map(f => f.visible))})`);
        // Nothing slides between pills: the active pill paints its own fill
        // in place, with a short colour fade.
        assert.equal(await page.locator('.ti-tabs__indicator').count(), 0, `${where}: no sliding indicator`);
        if (tab_style === 'pill' || tab_style === 'button') {
          const act = await page.$eval('[role="tab"][aria-selected="true"]', el => ({bg: getComputedStyle(el).backgroundColor, tr: getComputedStyle(el).transitionProperty}));
          assert.notEqual(act.bg, 'rgba(0, 0, 0, 0)', `${where}: the active pill has its fill`);
          assert.match(act.tr, /background-color/, `${where}: the fill fades in`);
        }
        // The active pill is scrolled into the row, the page is not.
        const vis = await page.$eval('[role="tab"][aria-selected="true"]', el => { const n = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect(); return r.left >= n.left - 1 && r.right <= n.right + 1; });
        assert.ok(vis, `${where}: active pill scrolled into view`);
        assert.equal(await page.evaluate(() => scrollY), 0, `${where}: switching never scrolls the page`);
      }
      // Clear the selected collection, then simulate a deleted collection Drop.
      // Both redraws must keep the empty message, with no live card actions.
      blocks[0].settings.collection='';
      await drawTabs({tab_style:'pill'},375);
      assert.equal(await page.locator('[role="tabpanel"]').first().locator('.ti-tabs__empty').count(),1);
      assert.equal(await page.locator('[role="tabpanel"]').first().locator('button-wishlist,product-form,.product-item').count(),0);
      assert(await page.locator('[role="tabpanel"]').nth(1).locator('.product-item').count()>0,'other collections keep their cards');
      blocks[0].settings.collection='a';colA.id=null;
      await drawTabs({tab_style:'pill'},1366);
      assert.equal(await page.locator('[role="tabpanel"]').first().locator('.ti-tabs__empty').count(),1);
      assert.equal(await page.locator('[role="tabpanel"]').first().locator('button-wishlist,product-form').count(),0);
      colA.id='a';ok('cleared and deleted collection rendering');
      // Touch: tap a pill, swipe the pill row; the page itself never scrolls sideways.
      {
        const ctx = await browser.newContext({hasTouch: true, isMobile: true, viewport: {width: 375, height: 800}});
        const tp = await ctx.newPage(); tp.on('pageerror', e => errors.push(e.message));
        const st = {...defaults, show_load_more_button: false, tab_style: 'pill'};
        const html = renderTemplate(templateOf(section), {settings: config, section: {id: 'tabs1', settings: st, blocks}, collections: {a: colA, b: colB, c: colC}, request: {locale: {iso_code: 'en'}}}, env);
        await tp.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${themeRoot(config)}</style><style>${CSS}</style></head><body ${bodyAttrs(config)}><div id="shopify-section-tabs1">${html}</div></body></html>`);
        await tp.addScriptTag({content: TABS_JS});
        const box = await tp.$eval('.ti-tabs__nav', el => { const r = el.getBoundingClientRect(); return {x: r.x, y: r.y + r.height / 2, w: r.width}; });
        const cdp = await ctx.newCDPSession(tp);
        const swipe = async (x0, x1) => {
          await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y: box.y}]});
          for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x0 + (x1 - x0) * k / 8, y: box.y}]});
          await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        };
        await swipe(box.x + box.w - 30, box.x + 30); await tp.waitForTimeout(700);
        assert.ok(await tp.$eval('.ti-tabs__nav', el => el.scrollLeft) > 0, 'touch: the pill row scrolls');
        assert.equal(await tp.evaluate(() => scrollX), 0, 'touch: the page does not scroll sideways');
        const last = await tp.$('[role="tab"]:last-of-type');
        await last.tap(); await tp.waitForTimeout(450);
        assert.equal(await last.getAttribute('aria-selected'), 'true', 'touch: tap selects');
        await ctx.close();
      }
      // Without the script: the first tab is shown with its own fill, nothing hidden is focusable.
      await page.setViewportSize({width: 1366, height: 800});
      const st = {...defaults, show_load_more_button: false, tab_style: 'pill'};
      const html = renderTemplate(templateOf(section), {settings: config, section: {id: 'tabs1', settings: st, blocks}, collections: {a: colA, b: colB, c: colC}, request: {locale: {iso_code: 'en'}}}, env).replace(/<script>[\s\S]*?<\/script>/g, '');
      await page.setContent(`<style>${themeRoot(config)}</style><style>${CSS}</style><body ${bodyAttrs(config)}><div id="shopify-section-tabs1">${html}</div></body>`);
      assert.notEqual(await page.$eval('.ti-tabs__btn.is-active', el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'no-JS: active tab keeps its fill');
      assert.equal(await page.$$eval('.ti-tabs__panel[inert]', els => els.length), 4, 'no-JS: hidden panels inert');
      // Reduced motion: switching is instant.
      await drawTabs({tab_style: 'pill'}, 1366);
      await page.emulateMedia({reducedMotion: 'reduce'});
      await page.click('[role="tab"]:nth-of-type(2)');
      assert.equal(await page.$eval('.ti-tabs__panel.is-active', el => getComputedStyle(el).transitionDuration), '0s');
      await page.emulateMedia({reducedMotion: 'no-preference'});
      ok('tabs');
    }

    /* ── 6. Filters: a newer request aborts the one in flight ── */
    {
      await page.route('http://fx.test/**', r => r.fulfill({contentType: 'text/html', body: '<div class="sec__collection-main" data-section-id="main"><grid-list></grid-list><div id="productgridcontainer">old</div></div>'}));
      await page.goto('http://fx.test/collections/all');
      await page.evaluate(() => { customElements.define('grid-list', class extends HTMLElement { hideGridItems() {} showGridItems() {} }); window.scrollTo = () => {}; history.pushState = () => {}; });
      await page.route('http://fx.test/collections/all?*', async route => {
        const slow = route.request().url().includes('slow');
        await new Promise(r => setTimeout(r, slow ? 600 : 50));
        await route.fulfill({contentType: 'text/html', body: `<div class="sec__collection-main" data-section-id="main"><grid-list></grid-list><div id="productgridcontainer">${slow ? 'stale' : 'fresh'}</div></div>`}).catch(() => {});
      });
      await page.addScriptTag({content: read('shopify/assets/collection.js')});
      await page.evaluate(() => { eventCollectionShopify.renderSectionFilter('/collections/all?section_id=main&slow=1', 'slow=1'); eventCollectionShopify.renderSectionFilter('/collections/all?section_id=main&fast=1', 'fast=1'); });
      await page.waitForTimeout(900);
      assert.equal(await page.$eval('#productgridcontainer', el => el.textContent), 'fresh', 'a slow older response never paints over the newer one');
      ok('filters');
    }

    assert.deepEqual(errors.filter(e => !/Motion|ionRangeSlider|cartStrings/.test(e)), [], 'no script errors');
    console.log(`theme-product-cards: ${passed} groups passed`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
