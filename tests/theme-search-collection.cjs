/* Run: node tests/theme-search-collection.cjs
   The search page and the collection page: sections/main-search and
   sections/main-collection-product with snippets/facets-toolbar,
   facets-panel, pagination and the shared product card (product-item),
   rendered through a small Liquid subset (below) with the real locale, then
   served by a fixture shop that filters, sorts and pages the way the
   platform does (filter.v.* parameters, sort_by, page, ?section_id=) and
   drawn in Chromium with the theme's real CSS and shopify/assets/collection.js.
   Checks: no untranslated text or braces; Sort by as a dropdown on a computer
   and a bottom sheet on a phone, applied in place with the address updated
   and Back working; filters applied and removed from the drawer, the
   sidebar, the price fields and the pills, with the count updated and no
   layout shift; the empty states; grid columns; 44px targets and no
   sideways scroll at 375px; the collection template; then, on the live
   site, the platform behaviour these depend on.
   It does not replace Storelib's renderer. LIVE=0 skips the live requests. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const LIVE = 'https://andrewrullz.storelib.com';

/* ───────────── The theme's own words ───────────── */
const LOCALE = JSON.parse(read('shopify/locales/en.default.json'));
function translate(key, named) {
  let v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), LOCALE);
  if (v && typeof v === 'object') v = 'count' in named ? (Number(named.count) === 1 ? v.one ?? v.other : v.other) : v.other;
  if (typeof v !== 'string') return key;
  return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, n) => (n in named ? String(named[n] ?? '') : m));
}

/* ───────────── A small Liquid subset, enough for these templates ───────────── */
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
      if (n === 'comment') { let depth = 1; while (i < tokens.length) { const t = tokens[i++]; if (t.t !== 'tag') continue; if (name(t) === 'comment') depth++; if (name(t) === 'endcomment' && !--depth) break; } continue; }
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
      } else if (n === 'for') { const body = block(['endfor', 'else']); let other = []; if (name(tokens[i]) === 'else') { i++; other = block(['endfor']); } i++; nodes.push({t: 'for', expr: rest, body, other}); }
      else if (n === 'capture') { const body = block(['endcapture']); i++; nodes.push({t: 'capture', v: rest, body}); }
      else if (n === 'paginate') { const body = block(['endpaginate']); i++; nodes.push({t: 'paginate', v: rest, body}); }
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
  const parts = expr.replace(/\[(\d+)\]/g, '.$1').replace(/\[['"]([^'"]+)['"]\]/g, '.$1').replace(/\[(\w+)\]/g, (m, k) => '.' + String(ctx[k])).split('.');
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
const escapeHtml = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
function filt(ctx, v, f) {
  const i = f.indexOf(':'); const n = (i < 0 ? f : f.slice(0, i)).trim(); const raw = i < 0 ? [] : args(f.slice(i + 1)); const a = raw.map(x => lookup(ctx, x));
  switch (n) {
    case 't': { const named = {}; raw.forEach(x => { const k = x.indexOf(':'); if (k > 0) named[x.slice(0, k).trim()] = lookup(ctx, x.slice(k + 1)); }); return translate(v, named); }
    case 'default': return isBlank(v) ? a[0] : v;
    case 'escape': return escapeHtml(v);
    case 'url_encode': return encodeURIComponent(String(v ?? '')).replace(/%20/g, '+');
    case 'handleize': return String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    case 'downcase': return String(v ?? '').toLowerCase();
    case 'upcase': return String(v ?? '').toUpperCase();
    case 'strip_html': return String(v ?? '').replace(/<[^>]*>/g, '');
    case 'replace': return String(v ?? '').split(a[0]).join(a[1]);
    case 'remove': return String(v ?? '').split(a[0]).join('');
    case 'remove_first': return String(v ?? '').replace(a[0], '');
    case 'append': return String(v ?? '') + (a[0] ?? '');
    case 'prepend': return (a[0] ?? '') + String(v ?? '');
    case 'split': return String(v ?? '').split(a[0]);
    case 'slice': { const start=Number(a[0])||0, length=a[1]==null?1:Number(a[1]); const value=Array.isArray(v)?v:String(v??''); return value.slice(start,start+length); }
    case 'first': return Array.isArray(v) ? v[0] : v;
    case 'last': return Array.isArray(v) ? v[v.length - 1] : v;
    case 'join': return (v || []).join(a[0] ?? ' ');
    case 'plus': return Number(v || 0) + Number(a[0] || 0);
    case 'minus': return Number(v || 0) - Number(a[0] || 0);
    case 'times': return Number(v || 0) * Number(a[0] || 0);
    case 'divided_by': { const r = Number(v || 0) / Number(a[0]); return /\./.test(raw[0]) ? r : Math.floor(r); }
    case 'round': return Math.round(Number(v || 0));
    case 'ceil': return Math.ceil(Number(v || 0));
    case 'size': return v == null ? 0 : v.length ?? 0;
    case 'json': return JSON.stringify(v ?? null);
    case 'strip': return String(v ?? '').trim();
    case 'strip_newlines': return String(v ?? '').replace(/\n/g, '');
    case 'money': case 'money_with_currency': return 'R$' + (Number(v || 0) / 100).toFixed(2);
    case 'date': return v === 'now' ? Math.floor(Date.now() / 1000) : Math.floor(new Date(v).getTime() / 1000);
    case 'where': return (v || []).filter(x => x[a[0]] === a[1]);
    case 'image_url': return v?.src ?? v;
    case 'asset_url': return '/assets/' + v;
    case 'stylesheet_tag': return '';
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
    case 'contains': return l != null && (Array.isArray(l) ? l.includes(r) : String(l).includes(r));
  }
}
function cond(ctx, s) {
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
      const m = n.expr.match(/^(\w+) in (\S+)(?:\s+limit:\s*(\S+))?/); let list = lookup(ctx, m[2]) || [];
      if (m[3]) list = list.slice(0, Number(lookup(ctx, m[3])));
      if (!list.length) { out += run(n.other, ctx, env); continue; }
      try { list.forEach((item, k) => { ctx[m[1]] = item; ctx.forloop = {index: k + 1, index0: k, first: k === 0, last: k === list.length - 1}; out += run(n.body, ctx, env); }); } catch (e) { if (!(e instanceof Break)) throw e; }
    } else if (n.t === 'capture') ctx[n.v] = run(n.body, ctx, env);
    else if (n.t === 'paginate') {
      // {% paginate search.results by 9 %}: the page's slice and a paginate object.
      const m = n.v.match(/^(\S+)\s+by\s+(\S+)/); const objPath = m[1].split('.'); const owner = lookup(ctx, objPath.slice(0, -1).join('.')); const key = objPath[objPath.length - 1];
      const all = owner[key] || []; const per = Number(value(ctx, m[2])) || 12; const pages = Math.max(1, Math.ceil(all.length / per)); const cur = Math.min(pages, Math.max(1, ctx.__page || 1));
      const pageUrl = p => { const u = new URL(ctx.__url); if (p > 1) u.searchParams.set('page', p); else u.searchParams.delete('page'); return u.pathname + u.search; };
      owner[key] = all.slice((cur - 1) * per, cur * per);
      ctx.paginate = {pages, current_page: cur, items: all.length, parts: Array.from({length: pages}, (_, k) => ({title: k + 1, url: pageUrl(k + 1), is_link: k + 1 !== cur})), previous: cur > 1 ? {url: pageUrl(cur - 1)} : null, next: cur < pages ? {url: pageUrl(cur + 1)} : null};
      try { out += run(n.body, ctx, env); } finally { owner[key] = all; }
    } else if (n.t === 'stmt') {
      if (n.n === 'assign') { const i = n.v.indexOf('='); ctx[n.v.slice(0, i).trim()] = value(ctx, n.v.slice(i + 1)); }
      else if (n.n === 'break') throw new Break();
      else if (n.n === 'render') out += render(n.v, ctx, env);
      else if (!['#', 'echo', 'increment', 'decrement', 'cycle', 'layout'].includes(n.n) && !n.n.startsWith('#') && env.strict) throw new Error(`Unknown tag: ${n.n} ${n.v}`);
    }
  }
  return out;
}
const GLOBALS = ['settings', 'section', 'collections', 'collection', 'all_products', 'search', 'request', 'routes', 'cart', 'template', 'shop', 'now', 'pages', 'content_for_header', '__page', '__url'];
function render(spec, ctx, env) {
  const first = spec.match(/^'([^']+)'\s*[,|]?\s*([\s\S]*)$/); const name = first[1];
  const local = Object.fromEntries(GLOBALS.map(k => [k, ctx[k]]));
  splitTop(first[2].replace(/\|/g, ','), ',').map(x => x.trim()).filter(Boolean).forEach(a => { const i = a.indexOf(':'); local[a.slice(0, i).trim()] = value(ctx, a.slice(i + 1)); });
  env.rendered.add(name);
  if (env.stubs[name]) return env.stubs[name](local);
  return renderTemplate(env.files[name] ??= templateOf(read(`snippets/${name}.storelib`)), local, env);
}
const templateOf = src => src.slice(src.indexOf('\n') + 1, src.lastIndexOf('</template>'));
const parsed = new Map();
function renderTemplate(src, ctx, env) { if (!parsed.has(src)) parsed.set(src, parse(tokenize(src))); return run(parsed.get(src), ctx, env); }
const schemaOf = file => { const s = read(file); return JSON.parse(s.slice(s.indexOf('<schema>') + 8, s.indexOf('</schema>'))); };

/* ───────────── The fixture shop ───────────── */
const schemaDefaults = Object.fromEntries(JSON.parse(read('shopify/config/settings_schema.json')).flatMap(g => g.settings || []).filter(x => x.id && ('default' in x || x.type === 'checkbox')).map(x => [x.id, x.default ?? false]));
const config = {...schemaDefaults, ...JSON.parse(read('config/settings.json')).shopify, scroll_animation: 'none'};
const image = n => ({src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${n}"/></svg>`)}`, alt: '', aspect_ratio: 0.75, media_type: 'image', width: 300, height: 400});
const CATALOGUE = [
  ['Pleated wool pants', 12900, ['S', 'M'], 'Black', '#2b2b2b'],
  ['Linen drawstring pants', 6900, ['M', 'L'], 'Beige', '#d8cbb3'],
  ['Cotton chino pants', 4900, ['S', 'L'], 'Navy', '#27324a'],
  ['Cargo pants', 8900, ['M'], 'Black', '#1f1f1f'],
  ['Wide leg pants', 15900, ['L', 'XL'], 'Beige', '#cdbf9f'],
  ['Relaxed tee', 2900, ['S', 'M', 'L'], 'White', '#f1f1f1'],
].map(([title, price, sizes, color, fill], k) => {
  const id = k + 1; const variants = sizes.map((s, j) => ({id: id * 100 + j, title: s, option1: s, option2: color, available: true, inventory_quantity: 9, inventory_management: 'shopify', price, compare_at_price: null}));
  return {id, object_type: 'product', handle: 'p' + id, url: '/products/p' + id, title, vendor: 'Materia', featured_media: image(fill), media: [image(fill)], available: true, has_only_default_variant: false,
    price, price_min: price, compare_at_price: null, variants, selected_or_first_available_variant: variants[0], options_with_values: [{name: 'Size', values: sizes}, {name: 'Color', values: [color]}],
    sizes, color, created_at: new Date(Date.UTC(2026, 0, 1 + k)).toISOString(), metafields: {custom: {}}, selling_plan_groups: [], tags: []};
});
const SORTS = {
  'relevance': list => list, 'manual': list => list,
  'price-ascending': list => [...list].sort((a, b) => a.price - b.price), 'price-descending': list => [...list].sort((a, b) => b.price - a.price),
  'title-ascending': list => [...list].sort((a, b) => a.title.localeCompare(b.title)), 'title-descending': list => [...list].sort((a, b) => b.title.localeCompare(a.title)),
  'created-descending': list => [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)), 'created-ascending': list => [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)),
};
const COLLECTION_SORTS = [['manual', 'Featured'], ['title-ascending', 'Alphabetically, A-Z'], ['title-descending', 'Alphabetically, Z-A'], ['price-ascending', 'Price, low to high'], ['price-descending', 'Price, high to low'], ['created-descending', 'Date, new to old']];
const OPTIONS = [['Size', 'filter.v.option.size', p => p.sizes], ['Color', 'filter.v.option.color', p => [p.color]]];
// What the platform hands a page: the products that pass, and Shopify-shaped filters
// whose url_to_add / url_to_remove keep q, sort_by and every other filter.
function shop(urlString, kind) {
  const url = new URL(urlString); const params = url.searchParams;
  const link = (mutate) => { const u = new URL(url); u.searchParams.delete('section_id'); u.searchParams.delete('page'); mutate(u.searchParams); return u.pathname + u.search; };
  const q = (params.get('q') || '').trim().toLowerCase();
  let pool = kind === 'search' ? (q ? CATALOGUE.filter(p => p.title.toLowerCase().includes(q) || q === 'a') : []) : CATALOGUE;
  if (kind === 'search' && q === 'a') pool = CATALOGUE.filter(p => /a/i.test(p.title));
  const gte = params.has('filter.v.price.gte') ? Number(params.get('filter.v.price.gte')) * 100 : null;
  const lte = params.has('filter.v.price.lte') ? Number(params.get('filter.v.price.lte')) * 100 : null;
  const passes = (p, except) => OPTIONS.every(([, param, of]) => param === except || !params.getAll(param).length || params.getAll(param).some(v => of(p).includes(v)))
    && (except === 'price' || ((gte == null || p.price >= gte) && (lte == null || p.price <= lte)));
  const sortBy = params.get('sort_by') || '';
  const results = (SORTS[sortBy] || SORTS.relevance)(pool.filter(p => passes(p)));
  const filters = [];
  for (const [label, param, of] of OPTIONS) {
    const chosen = params.getAll(param); const values = [...new Set(pool.flatMap(of))].sort();
    filters.push({label, type: 'list', param_name: param, values: values.map(v => ({
      label: v, value: v, param_name: param, count: pool.filter(p => passes(p, param) && of(p).includes(v)).length, active: chosen.includes(v),
      url_to_add: link(s => s.append(param, v)), url_to_remove: link(s => { const keep = s.getAll(param).filter(x => x !== v); s.delete(param); keep.forEach(x => s.append(param, x)); }),
    })), get active_values() { return this.values.filter(v => v.active); }, url_to_remove: link(s => s.delete(param))});
  }
  filters.push({label: 'Price', type: 'price_range', range_max: Math.max(0, ...pool.map(p => p.price)), active_values: [],
    min_value: {param_name: 'filter.v.price.gte', value: gte}, max_value: {param_name: 'filter.v.price.lte', value: lte},
    url_to_remove: link(s => { s.delete('filter.v.price.gte'); s.delete('filter.v.price.lte'); })});
  return {results, filters: pool.length ? filters : [], sortBy, q: params.get('q') || ''};
}
const stubs = {
  'responsive-image': a => `<img class="${a.class || ''} bls-loaded-image" src="${a.image?.src}" alt="${a.image_alt || ''}" width="300" height="400" loading="lazy" decoding="async">`,
  'placeholder-render': () => '<svg class="placeholder-svg"></svg>',
  'price': a => `<div class="card-product-price flex gap-5"><span class="price">R$${((a.product?.price || 0) / 100).toFixed(2)}</span></div>`,
  'color-swatches': () => '', 'review': () => '', 'theme-type': () => '', 'breadcrumbs': () => '',
  'scheme-color': a => (isBlank(a.color) ? a.fallback : a.color) ?? '',
  'article-card': () => '',
};
function sectionSettings(file, saved) {
  const schema = schemaOf(file).shopify;
  return {...Object.fromEntries(schema.settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default])), ...saved};
}
const SEARCH_SAVED = JSON.parse(read('templates/search.json')).sections.main.settings;
const COLLECTION_JSON = JSON.parse(read('templates/collection.json'));
const COLLECTION_SAVED = COLLECTION_JSON.sections['main-collection-product'].settings;
let renderedSnippets = new Set();
function renderSection(kind, urlString, overrides = {}) {
  const file = kind === 'search' ? 'sections/main-search.storelib' : 'sections/main-collection-product.storelib';
  const settings = sectionSettings(file, {...(kind === 'search' ? SEARCH_SAVED : COLLECTION_SAVED), ...overrides});
  const data = shop(urlString, kind); const url = new URL(urlString);
  const env = {stubs, files: {}, rendered: renderedSnippets};
  const ctx = {
    settings: config, section: {id: kind === 'search' ? 'main' : 'main-collection-product', settings, blocks: []}, request: {locale: {iso_code: 'en'}, host: url.host, design_mode: false}, pages: {},
    routes: {search_url: '/search', all_products_collection_url: '/collections/all'}, cart: {currency: {symbol: 'R$', iso_code: 'BRL'}}, template: kind, collections: {}, content_for_header: '',
    __page: Number(url.searchParams.get('page')) || 1, __url: urlString,
  };
  if (kind === 'search') {
    ctx.search = {performed: url.searchParams.has('q'), terms: data.q, results: data.results, results_count: data.results.length, filters: data.filters, sort_options: [], sort_by: data.sortBy || null, default_sort_by: 'relevance'};
  } else {
    ctx.collection = {title: 'All products', handle: 'all', url: '/collections/all', products: data.results, products_count: data.results.length, all_products_count: CATALOGUE.length, filters: data.filters,
      sort_options: COLLECTION_SORTS.map(([value, name]) => ({value, name})), sort_by: data.sortBy || null, default_sort_by: 'manual'};
  }
  const html = renderTemplate(templateOf(read(file)), ctx, env);
  return `<div id="shopify-section-${ctx.section.id}" class="shopify-section">${html}</div>`;
}
function themeRoot() {
  return `:root{--color-background:#fff;--color-heading:#111;--color-heading-rgb:17,17,17;--color-text:#444;--color-border:#e2e2e2;--color-white:#fff;--color-dark:#111;--grey-color:#f5f5f5;
  --btn-primary-bg-color:#222;--btn-primary-color:#fff;--btn-primary-hover-bg-color:#000;--btn-primary-hover-color:#fff;--btn-secondary-bg-color:#fff;--btn-secondary-color:#111;--btn-secondary-border-color:#111;
  --btn-radius:6px;--btn-font-size:15px;--btn-padding-y:14px;--btn-padding-x:26px;--btn-border-width:1px;--btn-anim-duration:0ms;--body-font:Arial,sans-serif;--heading-font:Arial,sans-serif;
  --input-height:44px;--input-padding:8px 14px;--inputs-border-width:1px;--input-border-radius:6px;--input-bg:#fff;--input-color:#111;--input-font-size:15px}
  html{font-size:62.5%}body{margin:0;font:14px/1.4 Arial,sans-serif;background:#fff}
  .fluid_container{padding:0 16px;max-width:1400px;margin:0 auto;box-sizing:border-box}@media (min-width:1025px){.fluid_container{padding:0 40px}}
  footer.fx-footer{height:300px;background:#eee}`;
}
const CSS = ['critical.css', 'section-isolation.css', 'animation.css', 'product-card.css', 'theme.css', 'theme-button-contract.css', 'collection-page.css'].map(f => read('shopify/assets/' + f)).join('\n');
const COLLECTION_JS = read('shopify/assets/collection.js');
const page = (section) => `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${themeRoot()}</style><style>${CSS}</style></head>
<body data-btn-style="solid" data-btn-secondary-style="outline"><header style="height:60px;border-bottom:1px solid #eee">Header</header><main>${section}</main><footer class="fx-footer">Footer</footer>
<script>customElements.define('grid-list', class extends HTMLElement { showGridItems() { this.dataset.shown = String(Number(this.dataset.shown || 0) + 1); } });</script>
<script>${COLLECTION_JS.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;

/* ───────────── Browser helpers ───────────── */
async function open(context, url, {kind = url.includes('/search') ? 'search' : 'collection', overrides = {}, delay = 0} = {}) {
  const p = await context.newPage();
  const requests = [];
  p.on('pageerror', e => p.__errors.push(e.message));
  p.__errors = [];
  await p.route('https://shop.test/**', async route => {
    const u = route.request().url();
    if (/\/assets\//.test(u)) return route.fulfill({status: 200, body: ''});
    requests.push(u);
    if (delay) await new Promise(r => setTimeout(r, delay));
    const section = renderSection(kind, u, overrides);
    const isSection = new URL(u).searchParams.has('section_id');
    await route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: isSection ? section : page(section)});
  });
  p.__requests = requests;
  await p.goto(url);
  await p.evaluate(() => {
    window.__shifts = [];
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__shifts.push({value: e.value, recent: e.hadRecentInput, nodes: (e.sources || []).map(s => s.node && (s.node.className || s.node.nodeName))}); }).observe({type: 'layout-shift', buffered: false});
  });
  return p;
}
const settle = p => p.waitForFunction(() => !document.querySelector('facets-root[aria-busy]'), null, {timeout: 5000}).then(() => p.waitForTimeout(60));
const titles = p => p.$$eval('#product-grid .grid__item', els => els.map(el => (el.querySelector('.product-item__name, .product-item__title, h3, a[href*="/products/"]')?.textContent || '').replace(/\s+/g, ' ').trim()));
const productLinks = p => p.$$eval('#product-grid .grid__item', els => els.map(el => el.querySelector('a[href*="/products/"]')?.getAttribute('href')));
const rect = (p, sel) => p.$eval(sel, el => { const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom}; });
const visibleText = p => p.evaluate(() => document.querySelector('main').innerText);
const priceOf = href => CATALOGUE.find(p => p.url === href).price;
// SHOTS=<folder> saves a picture of each state for a person to look at.
const shot = (p, name) => process.env.SHOTS ? p.screenshot({path: path.join(process.env.SHOTS, `${name}.png`)}) : null;

(async () => {
  const browser = await chromium.launch({executablePath: ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f)), headless: true, args: ['--no-sandbox']});
  let passed = 0; const ok = label => { passed++; if (process.env.VERBOSE) console.log('ok', label); };
  try {
    /* ── 0. Files: formats, schema ids, the collection template ── */
    for (const f of ['sections/main-search.storelib', 'sections/main-collection-product.storelib', 'snippets/facets-toolbar.storelib', 'snippets/facets-panel.storelib', 'snippets/facets-sidebar-block.storelib']) {
      const src = read(f);
      assert.equal(src.split('\n')[0], '<template compat="shopify">', `${f}: first line`);
      assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(templateOf(src).replace(/<script[\s\S]*?<\/script>/g, '')), `${f}: no inline event handlers`);
      parse(tokenize(templateOf(src)));
    }
    for (const f of ['sections/main-search.storelib', 'sections/main-collection-product.storelib']) {
      const ids = schemaOf(f).shopify.settings.filter(s => s.id).map(s => s.id);
      assert.equal(new Set(ids).size, ids.length, `${f}: setting ids are unique`);
      for (const id of ['enable_filtering', 'sorting', 'filter_layout', 'items_per_row', 'items_per_row_mobile', 'number_products_per_page', 'show_filter_counts', 'price_min_label', 'price_max_label', 'empty_link_label', 'empty_link_url']) assert.ok(ids.includes(id), `${f}: has ${id}`);
    }
    assert.deepEqual(COLLECTION_JSON.order.slice(0, 2), ['main-collection-heading', 'main-collection-product'], 'collection page: heading and product grid first');
    // The creator's own sections (whatever the builder holds) stay after them.
    assert.ok(COLLECTION_JSON.order.slice(2).every(id => !['main-collection-heading', 'main-collection-product'].includes(id) && COLLECTION_JSON.sections[id]), 'collection page: the existing sections stay after them');
    for (const id of COLLECTION_JSON.order) {
      const s = COLLECTION_JSON.sections[id]; const f = `sections/${s.type}.storelib`;
      assert.ok(fs.existsSync(path.join(root, f)), `${id}: ${f} exists`);
      const declared = new Set(schemaOf(f).shopify.settings.filter(x => x.id).map(x => x.id));
      Object.keys(s.settings).forEach(k => assert.ok(declared.has(k), `${id}: setting ${k} is declared`));
    }
    const mcp = COLLECTION_JSON.sections['main-collection-product'].settings;
    assert.ok(mcp.enable_filtering && mcp.sorting, 'collection page: filters and sort on');
    ok('files');

    const context = await browser.newContext({viewport: {width: 1366, height: 900}});

    /* ── 1. Search, desktop: words, count, sort dropdown, URL and Back ── */
    {
      const p = await open(context, 'https://shop.test/search?q=pants', {delay: 650});
      const text = await visibleText(p);
      assert.ok(!/[{}]/.test(text), `search: no braces in the page text (${(text.match(/.{0,30}[{}].{0,30}/) || [])[0]})`);
      assert.ok(!/\b(templates|products|collections|general|sections)\.[a-z_]+\.[a-z_]+/.test(text), 'search: no untranslated locale keys');
      assert.match(await p.textContent('.facets-toolbar__count'), /^5 results found for “pants”$/, 'search: the count with the words searched');
      assert.ok(renderedSnippets.has('product-item'), 'search: results use the shared product card');
      assert.equal(await p.$$eval('#product-grid .grid__item .product-item', els => els.length), 5, 'search: five product cards');
      // Columns: the section's Columns on desktop (3, saved) and on mobile.
      const cols = await p.$eval('#product-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      assert.equal(cols, SEARCH_SAVED.items_per_row, 'search: desktop columns follow the setting');
      // Sort: a dropdown under its button.
      const trigger = await rect(p, '[data-facets-sort-trigger]');
      assert.ok(trigger.h >= 44, 'sort trigger is at least 44px');
      assert.equal(await p.$eval('[data-facets-sort-trigger]', el => el.classList.contains('input-style')), true, 'sort trigger follows the theme fields');
      assert.equal(await p.textContent('[data-facets-part="sort-current"]'), 'Relevance', 'search: current sort shown');
      await p.click('[data-facets-sort-trigger]');
      await p.waitForFunction(() => document.querySelector('[data-facets-sort-panel]').matches(':popover-open'));
      await p.waitForTimeout(250);
      const panel = await rect(p, '[data-facets-sort-panel]');
      assert.ok(Math.abs(panel.y - (trigger.b + 6)) <= 1, `sort dropdown opens under its button (${panel.y} vs ${trigger.b})`);
      assert.ok(Math.abs(panel.r - trigger.r) <= 1, 'sort dropdown lines up with its button');
      assert.ok(panel.h < 420 && panel.x >= 8, 'sort dropdown is a dropdown, not a sheet');
      await shot(p, 'search-desktop-sort');
      assert.equal(await p.getAttribute('[data-facets-sort-trigger]', 'aria-expanded'), 'true', 'sort trigger says it is open');
      const options = await p.$$eval('[data-facets-sort-panel] a[data-facets-sort]', els => els.map(el => [el.textContent.trim(), el.getBoundingClientRect().height]));
      assert.deepEqual(options.map(o => o[0]), ['Relevance', 'Price, low to high', 'Price, high to low', 'Alphabetically, A-Z', 'Alphabetically, Z-A', 'Date, new to old'], 'search: the sort options');
      options.forEach(o => assert.ok(o[1] >= 44, `${o[0]}: 44px option`));
      assert.equal(await p.evaluate(() => document.activeElement.getAttribute('aria-current')), 'true', 'focus starts on the current option');
      const before = await productLinks(p);
      await p.click('[data-facets-sort-panel] a[data-facets-sort="price-ascending"]');
      assert.equal(await p.textContent('[data-facets-part="sort-current"]'), 'Price, low to high', 'the choice shows at once');
      await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('sort_by'), 'price-ascending', 'sort is in the address');
      const after = await productLinks(p);
      assert.deepEqual(after.map(priceOf), [...after.map(priceOf)].sort((a, b) => a - b), 'results are sorted by price');
      assert.notDeepEqual(after, before, 'the grid was swapped');
      assert.equal(await p.evaluate(() => document.querySelector('[data-facets-sort-panel]').matches(':popover-open')), false, 'the dropdown closes');
      assert.equal(await p.evaluate(() => document.activeElement.matches('[data-facets-sort-trigger]')), true, 'focus goes back to Sort by');
      assert.ok(p.__requests.at(-1).includes('section_id=main'), 'only the section is fetched');
      await p.goBack(); await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('sort_by'), null, 'Back: address without sort');
      assert.deepEqual(await productLinks(p), before, 'Back: the first order again');
      assert.equal(await p.textContent('[data-facets-part="sort-current"]'), 'Relevance', 'Back: current sort label again');
      await p.goForward(); await settle(p);
      assert.deepEqual(await productLinks(p), after, 'Forward: the sorted order again');
      const shifts = await p.evaluate(() => window.__shifts.filter(s => !s.recent).reduce((a, s) => a + s.value, 0));
      assert.ok(shifts < 0.01, `search sort: no layout shift (${shifts})`);
      assert.deepEqual(p.__errors, [], 'no script errors');
      await p.close();
      ok('search desktop sort');
    }

    /* ── 2. Search, desktop: filters in the row of dropdowns, pills, price ── */
    {
      const p = await open(context, 'https://shop.test/search?q=pants', {delay: 650});
      assert.equal(await p.isVisible('[data-facets-open]'), false, 'horizontal layout: no Filter button on a computer');
      assert.equal(await p.isVisible('[data-facets-panel]'), true, 'horizontal layout: filters in the page');
      const gridTop = (await rect(p, '#product-grid')).y;
      await p.click('summary[data-facets-key="group-size"]');
      assert.equal(await p.isVisible('[data-facets-key="value-size-m"]'), true, 'size dropdown opens');
      await p.click('[data-facets-key="value-size-m"]');
      await settle(p);
      assert.deepEqual(new URL(p.url()).searchParams.getAll('filter.v.option.size'), ['M'], 'filter is in the address');
      assert.equal(await p.textContent('.facets-toolbar__count'), '3 results found for “pants”', 'count updates');
      assert.equal(await p.getAttribute('[data-facets-key="value-size-m"]', 'aria-checked'), 'true', 'the value is ticked');
      assert.equal(await p.evaluate(() => document.querySelector('details[data-facets-group="size"]').open), true, 'its dropdown stays open');
      assert.deepEqual(await p.$$eval('.facets-pill', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim())), ['M Clear', 'Clear All'], 'a pill for the filter and Clear all');
      await shot(p, 'search-desktop-filtered');
      const top2 = (await rect(p, '#product-grid')).y;
      assert.ok(top2 >= gridTop, 'pills sit above the grid');
      // Second value in another group, then the price.
      await p.click('summary[data-facets-key="group-color"]');
      await p.click('[data-facets-key="value-color-black"]');
      await settle(p);
      assert.equal(await p.textContent('.facets-toolbar__count'), '2 results found for “pants”', 'two filters: count');
      await p.click('summary[data-facets-key="group-price"]');
      await p.fill('[data-facets-key="price-max"]', '100');
      await p.press('[data-facets-key="price-max"]', 'Enter');
      await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('filter.v.price.lte'), '100', 'price is in the address');
      assert.equal(await p.textContent('.facets-toolbar__count'), '1 result found for “pants”', 'price: count (one result)');
      assert.ok((await p.$$eval('.facets-pill', els => els.map(e => e.textContent))).some(t => /R\$0\.00 – R\$100\.00/.test(t)), 'price pill');
      // A dropdown closes with Escape (and a click outside); then the pills.
      await p.keyboard.press('Escape');
      assert.equal(await p.$$eval('details[data-facets-group][open]', els => els.length), 0, 'Escape closes the dropdown');
      await p.click('summary[data-facets-key="group-size"]');
      await p.click('summary[data-facets-key="group-color"]');
      await p.waitForTimeout(50);
      assert.deepEqual(await p.$$eval('details[data-facets-group][open]', els => els.map(e => e.dataset.facetsGroup)), ['color'], 'one dropdown open at a time');
      await p.mouse.click(5, 5);
      assert.equal(await p.$$eval('details[data-facets-group][open]', els => els.length), 0, 'a click outside closes it');
      await p.click('.facets-pill[data-facets-key="pill-size-m"]');
      await settle(p);
      assert.deepEqual(new URL(p.url()).searchParams.getAll('filter.v.option.size'), [], 'pill removes its filter');
      assert.equal(new URL(p.url()).searchParams.get('filter.v.price.lte'), '100', 'other filters stay');
      await p.click('.facets-pill--clear');
      await settle(p);
      assert.equal(new URL(p.url()).search, '?q=pants', 'Clear all keeps the words searched');
      assert.equal(await p.$$eval('.facets-pill', els => els.length), 0, 'no pills left');
      assert.equal(await p.textContent('.facets-toolbar__count'), '5 results found for “pants”', 'count back');
      await p.goBack(); await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('filter.v.price.lte'), '100', 'Back restores the filters');
      assert.equal(await p.getAttribute('[data-facets-key="value-color-black"]', 'aria-checked'), 'true', 'Back restores the ticks');
      const shifts = await p.evaluate(() => window.__shifts.filter(s => !s.recent));
      assert.ok(shifts.reduce((a, s) => a + s.value, 0) < 0.01, `search filters: no layout shift ${JSON.stringify(shifts)}`);
      assert.deepEqual(p.__errors, [], 'no script errors');
      await p.close();
      ok('search desktop filters');
    }

    /* ── 3. Search at 375px: layout, bottom sheet sort, filter drawer ── */
    const phone = await browser.newContext({viewport: {width: 375, height: 740}, hasTouch: true, isMobile: true});
    {
      const p = await open(phone, 'https://shop.test/search?q=pants', {delay: 650});
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 375), 'no sideways scroll at 375px');
      const cols = await p.$eval('#product-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      assert.equal(cols, SEARCH_SAVED.items_per_row_mobile, 'phone columns follow the setting');
      const head = await rect(p, '.search-page-header h1'), field = await rect(p, '.search-page-header .field'), bar = await rect(p, '.facets-toolbar'), grid = await rect(p, '#product-grid');
      assert.ok(field.x >= 15 && field.r <= 360, 'the field keeps the 16px gutter');
      assert.ok(field.y - head.b <= 40 && bar.y - field.b <= 60 && grid.y - bar.b <= 40, `tidy spacing (${field.y - head.b}, ${bar.y - field.b}, ${grid.y - bar.b})`);
      const button = await p.$eval('[data-facets-open]', el => ({role: el.dataset.themeButton, icon: !!el.querySelector('svg'), h: el.getBoundingClientRect().height, text: el.textContent.trim()}));
      assert.deepEqual([button.role, button.icon, button.text], ['secondary', true, 'Filter'], 'Filter: a theme secondary button with an icon');
      assert.ok(button.h >= 44, 'Filter: 44px');
      await shot(p, 'search-phone');
      const filterBtn = await rect(p, '[data-facets-open]'), sortBtn = await rect(p, '[data-facets-sort-trigger]');
      assert.ok(Math.abs(filterBtn.y - sortBtn.y) <= 1 && sortBtn.r <= 360, 'Filter and Sort by on one row');
      // Sort: a bottom sheet.
      await p.tap('[data-facets-sort-trigger]');
      await p.waitForTimeout(400);
      await shot(p, 'search-phone-sort');
      const sheet = await rect(p, '[data-facets-sort-panel]');
      assert.ok(Math.abs(sheet.b - 740) <= 1 && Math.abs(sheet.w - 375) <= 1 && sheet.y > 300, `sort is a bottom sheet (${JSON.stringify(sheet)})`);
      assert.equal(await p.$$eval('[data-facets-sort-panel] a[data-facets-sort]', els => els.filter(e => e.getBoundingClientRect().height >= 44).length), 6, 'six options, 44px each');
      assert.equal(await p.isVisible('[data-facets-sort-panel] .facets-sheet__title'), true, 'the sheet has its title');
      assert.equal(await p.$$eval('[data-facets-sort-panel] input', els => els.length), 0, 'no search box in the sheet');
      await p.tap('[data-facets-sort-panel] a[data-facets-sort="title-ascending"]');
      await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('sort_by'), 'title-ascending', 'phone sort is in the address');
      const names = (await productLinks(p)).map(h => CATALOGUE.find(x => x.url === h).title);
      assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), 'phone sort applied');
      assert.equal(await p.textContent('[data-facets-part="sort-current"]'), 'Alphabetically, A-Z', 'phone: current sort shown');
      // Filter drawer.
      await p.tap('[data-facets-open]');
      await p.waitForTimeout(450);
      await shot(p, 'search-phone-filters');
      const drawer = await rect(p, '[data-facets-panel]');
      assert.ok(drawer.x === 0 && drawer.h >= 739 && drawer.w <= 375, `filter drawer from the side (${JSON.stringify(drawer)})`);
      assert.equal(await p.evaluate(() => document.documentElement.classList.contains('facets-locked')), true, 'page behind does not scroll');
      const targets = await p.$$eval('[data-facets-panel] :is(summary, a.facets-value:not([aria-disabled]), .facets-sheet__close, .facets-panel__done, .facets-panel__clear)', els => els.filter(e => e.getClientRects().length).map(e => [e.className, e.getBoundingClientRect().height]));
      targets.forEach(([c, h]) => assert.ok(h >= 44, `${c}: 44px target (${h})`));
      await p.tap('[data-facets-key="value-size-l"]');
      assert.equal(await p.textContent('[data-facets-part="badge"]'), '1', 'badge counts the choice at once');
      await settle(p);
      assert.equal(await p.evaluate(() => document.querySelector('[data-facets-panel]').matches(':popover-open')), true, 'drawer stays open while choosing');
      assert.equal(await p.getAttribute('[data-facets-key="value-size-l"]', 'aria-checked'), 'true', 'L ticked');
      assert.equal(await p.textContent('.facets-toolbar__count'), '3 results found for “pants”', 'phone count updates');
      assert.equal(new URL(p.url()).searchParams.get('sort_by'), 'title-ascending', 'the sort stays with the filter');
      await p.tap('.facets-panel__done');
      await p.waitForTimeout(400);
      assert.equal(await p.evaluate(() => document.querySelector('[data-facets-panel]').matches(':popover-open')), false, 'Apply closes the drawer');
      assert.equal(await p.evaluate(() => document.documentElement.classList.contains('facets-locked')), false, 'page scrolls again');
      assert.equal(await p.$$eval('.facets-pill', els => els.length), 2, 'pill and Clear all under the toolbar');
      await shot(p, 'search-phone-pills');
      const pills = await p.$$eval('.facets-pill', els => els.map(e => e.getBoundingClientRect().height));
      assert.ok(pills.every(h => h >= 40), 'pills are 40px with a 44px hit area');
      await p.tap('.facets-pill[data-facets-key="pill-size-l"]');
      await settle(p);
      assert.equal(await p.textContent('.facets-toolbar__count'), '5 results found for “pants”', 'pill removed on the phone');
      assert.equal(await p.textContent('[data-facets-part="badge"]'), '', 'badge cleared');
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 375), 'still no sideways scroll');
      const shifts = await p.evaluate(() => window.__shifts.filter(s => !s.recent));
      assert.ok(shifts.reduce((a, s) => a + s.value, 0) < 0.01, `phone: no layout shift ${JSON.stringify(shifts)}`);
      assert.deepEqual(p.__errors, [], 'no script errors');
      await p.close();
      ok('search phone');
    }

    /* ── 4. Empty states ── */
    {
      const p = await open(context, 'https://shop.test/search?q=velvet');
      const text = await visibleText(p);
      await shot(p, 'search-empty');
      assert.ok(!/[{}]/.test(text), 'empty: no braces');
      assert.match(await p.textContent('.facets-empty__title'), /No result found for “velvet”/, 'empty: says what was searched');
      assert.equal(await p.textContent('.facets-empty__text'), 'Check the spelling or try another word.', 'empty: suggests another word');
      assert.equal(await p.getAttribute('.facets-empty__action', 'href'), '/collections/all', 'empty: links to all products');
      assert.equal(await p.textContent('.facets-empty__action'), 'Browse all products', 'empty: the link says where it goes');
      assert.equal(await p.$$eval('.facets-toolbar, [data-facets-panel]', els => els.length), 0, 'empty: no toolbar or filters');
      assert.equal(await p.isVisible('[data-facets-clear-fallback]'), false, 'empty: no Clear all without filters');
      await p.close();
      const q = await open(context, 'https://shop.test/search?q=pants&filter.v.option.size=XL&filter.v.option.color=Navy');
      assert.equal(await q.textContent('.facets-empty__title'), 'Nothing matches those filters', 'filtered empty: says so');
      assert.equal(await q.isVisible('.facets-toolbar'), true, 'filtered empty: the toolbar stays');
      assert.equal(await q.$$eval('.facets-pill', els => els.length), 3, 'filtered empty: the pills stay');
      await q.click('.facets-empty__action');
      await settle(q);
      assert.equal(new URL(q.url()).search, '?q=pants', 'filtered empty: Clear all');
      assert.equal(await q.$$eval('#product-grid .grid__item', els => els.length), 5, 'filtered empty: results back');
      const r = await open(context, 'https://shop.test/search');
      assert.equal(await r.$$eval('facets-root', els => els.length), 0, 'no search yet: only the field');
      await q.close(); await r.close();
      ok('empty states');
    }

    /* ── 5. Collection page: sidebar, sort, pages ── */
    {
      const p = await open(context, 'https://shop.test/collections/all', {overrides: {items_to_show: 4}, delay: 650});
      assert.ok(!/[{}]/.test(await visibleText(p)), 'collection: no braces');
      assert.equal(await p.textContent('.facets-toolbar__count'), '6 products', 'collection: count');
      await shot(p, 'collection-desktop');
      assert.equal(await p.isVisible('[data-facets-open]'), false, 'sidebar layout: no Filter button on a computer');
      const side = await rect(p, '[data-facets-panel]'), grid = await rect(p, '#product-grid');
      assert.ok(side.r < grid.x && side.w >= 250, 'collection: filters in a sidebar beside the grid');
      assert.equal(await p.$eval('#product-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 4, 'collection: four columns');
      assert.equal(await p.$$eval('#product-grid .grid__item', els => els.length), 4, 'page one of two');
      assert.equal(await p.textContent('[data-facets-part="sort-current"]'), 'Featured', 'collection: current sort from the platform');
      await p.click('.pagination a[aria-label="Page 2"]');
      await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('page'), '2', 'page 2 in the address');
      assert.equal(await p.$$eval('#product-grid .grid__item', els => els.length), 2, 'page two');
      await p.click('[data-facets-key="value-color-beige"]');
      await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('page'), null, 'a filter starts again at page one');
      assert.equal(await p.textContent('.facets-toolbar__count'), '2 products', 'collection: filtered count');
      await p.click('[data-facets-sort-trigger]');
      await p.click('[data-facets-sort-panel] a[data-facets-sort="price-descending"]');
      await settle(p);
      const prices = (await productLinks(p)).map(priceOf);
      assert.deepEqual(prices, [...prices].sort((a, b) => b - a), 'collection: sorted, filter kept');
      assert.deepEqual(new URL(p.url()).searchParams.getAll('filter.v.option.color'), ['Beige'], 'collection: filter kept with the sort');
      await p.goBack(); await settle(p);
      assert.equal(new URL(p.url()).searchParams.get('sort_by'), null, 'collection: Back');
      assert.equal(await p.textContent('[data-facets-part="sort-current"]'), 'Featured', 'collection: Back restores the sort label');
      const shifts = await p.evaluate(() => window.__shifts.filter(s => !s.recent));
      assert.ok(shifts.reduce((a, s) => a + s.value, 0) < 0.01, `collection: no layout shift ${JSON.stringify(shifts)}`);
      assert.deepEqual(p.__errors, [], 'no script errors');
      await p.close();
      const m = await open(phone, 'https://shop.test/collections/all', {overrides: {items_per_row_mobile: '1'}});
      assert.equal(await m.$eval('#product-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1, 'collection: one column on a phone when set');
      assert.equal(await m.isVisible('[data-facets-open]'), true, 'collection phone: Filter button');
      assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= 375), 'collection phone: no sideways scroll');
      await m.close();
      ok('collection');
    }

    /* ── 6. Without the script: links and forms still work ── */
    {
      const ctx = await browser.newContext({viewport: {width: 1366, height: 900}, javaScriptEnabled: false});
      const p = await open(ctx, 'https://shop.test/search?q=pants');
      const sortHref = await p.getAttribute('a[data-facets-sort="price-descending"]', 'href');
      assert.equal(sortHref, '/search?q=pants&sort_by=price-descending', 'sort option is a real link');
      const valueHref = await p.getAttribute('[data-facets-key="value-size-s"]', 'href');
      assert.match(valueHref, /^\/search\?q=pants&filter\.v\.option\.size=S$/, 'filter value is a real link');
      await p.close(); await ctx.close();
      ok('no script');
    }

    /* ── 7. The live site: what the platform answers ── */
    if (process.env.LIVE !== '0') {
      let html = null;
      try {
        const res = await fetch(`${LIVE}/search?q=a&section_id=main`, {signal: AbortSignal.timeout(20000)});
        html = res.ok ? await res.text() : null;
      } catch (error) { console.log('live checks skipped:', error.message); }
      if (html) {
        assert.ok(html.startsWith('<div id="shopify-section-main"'), 'live: ?section_id= answers the section alone');
        const hrefs = [...html.matchAll(/(?:data-href|href)="(\/search\?q=a[^"]*filter\.v\.[^"]*)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
        assert.ok(hrefs.some(h => /filter\.v\.option\.size=/.test(h)), 'live: search.filters give option filters with url_to_add');
        assert.ok(/name="filter\.v\.price\.gte"/.test(html) && /name="filter\.v\.price\.lte"/.test(html), 'live: price range param names');
        const count = async q => { const r = await fetch(`${LIVE}${q}`, {signal: AbortSignal.timeout(20000)}); const t = await r.text(); return [...new Set([...t.matchAll(/href="(\/products\/[^"?#]+)/g)].map(m => m[1]))]; };
        const all = await count('/search?q=a&section_id=main');
        const cheap = await count('/search?q=a&filter.v.price.lte=20&section_id=main');
        assert.ok(all.length >= 2 && cheap.length < all.length, `live: a price filter narrows the results (${cheap.length} of ${all.length})`);
        const asc = await count('/search?q=a&sort_by=price-ascending&section_id=main');
        const desc = await count('/search?q=a&sort_by=price-descending&section_id=main');
        assert.deepEqual(desc, [...asc].reverse(), 'live: sort_by orders search results');
        const sorted = await (await fetch(`${LIVE}/search?q=a&sort_by=price-descending&filter.v.option.size=S&section_id=main`, {signal: AbortSignal.timeout(20000)})).text();
        assert.ok(/(?:data-href|href)="\/search\?q=a&(?:amp;)?sort_by=price-descending"/.test(sorted), 'live: url_to_remove keeps the sort');
        const col = await count('/collections/all?section_id=main-collection-product');
        const colCheap = await count('/collections/all?filter.v.price.lte=20&section_id=main-collection-product');
        assert.ok(col.length >= 2 && colCheap.length < col.length, 'live: collection filters narrow the products');
        const colHtml = await (await fetch(`${LIVE}/collections/all?section_id=main-collection-product`, {signal: AbortSignal.timeout(20000)})).text();
        assert.ok(/sort_by=price-ascending/.test(colHtml), 'live: collection.sort_options are given');
        if (process.env.LIVE_AFTER_PUSH === '1') {
          // Once this branch is published: the new markup on the live site.
          const page = await (await fetch(`${LIVE}/search?q=pants`)).text();
          const main = page.slice(page.indexOf('id="shopify-section-main"'), page.indexOf('id="shopify-section-footer"'));
          assert.ok(!/\{terms\}|\{count\}/.test(main), 'live: no braces in the search page');
          assert.ok(/<facets-root/.test(main) && /data-facets-sort="price-ascending"/.test(main), 'live: the new sort control');
        }
        ok('live');
      }
    }
    await context.close(); await phone.close();
  } finally {
    await browser.close();
  }
  console.log(`theme-search-collection: ${passed} groups passed`);
})().catch(e => { console.error(e); process.exit(1); });
