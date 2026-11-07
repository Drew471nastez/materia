/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r6-product-block-data.cjs
   Product information blocks, round 6: every block setting is drawn.

   For every setting of every product block (Main product and Featured
   product declare the same ones) a changed value changes the drawn block,
   given what the setting needs: the switch it sits under, the product data
   it reads (a product with a compare price, reviews, a sold out option, a
   long description, grouped and colour products, a size chart, Storelib
   offers, upsell products in the shop), or the text it styles. Settings that
   cannot have an effect are hidden with an info line (id kept). The check is
   on the markup Storelib draws, in the builder and on the storefront; the
   browser tests (theme-r6-product-blocks, theme-r6-main-product) cover how
   the custom colours and fonts look, live and after a redraw. */
const assert = require('node:assert/strict');
const L = require('./theme-r6-main-product-lib.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

/* the products, shop data and what each setting needs: shared with the every setting sweep */
const {OTHER, TALL, PROD, WIDE, OPROD, G, IMG, VIDEO, PAGE, RULES} = require('./theme-every-setting-product-data.cjs');
const CTX = [{design: false, product: PROD}, {design: true, product: PROD}, {design: false, product: OPROD}, {design: false, product: WIDE}];
const alt = (x, cur) => {
  switch (x.type) {
    case 'checkbox': return !cur;
    case 'range': return cur === x.max ? x.min : x.max;
    case 'number': return (Number(cur) || 0) + 7;
    case 'select': case 'radio': { const o = (x.options || []).find(o => o.value !== cur); return o && o.value; }
    case 'color': return '#ff00aa';
    case 'text': case 'textarea': case 'html': return 'Zq words';
    case 'richtext': return '<p>Zq words</p>';
    case 'inline_richtext': return 'Zq words';
    case 'url': return '/zq';
    case 'font_picker': return {family: 'Georgia', fallback_families: 'serif'};
    case 'image_picker': return cur && cur.src === IMG.src ? {...IMG, src: '/img/blue.svg', url: '/img/blue.svg'} : IMG;
    case 'product': return TALL;
    case 'video': return VIDEO;
    case 'page': return PAGE;
    default: return undefined;
  }
};
/* the switch a visible_if names */
const enable = (vif, base) => {
  let m;
  if (!vif) return;
  /* a visible_if of several switches joined with and: each one on */
  if (/ and /.test(vif) && !/ or /.test(vif)) { for (const part of vif.replace(/^\{\{\s*|\s*\}\}$/g, '').split(' and ')) enable('{{ ' + part.trim() + ' }}', base); return; }
  if ((m = vif.match(/^\{\{ block\.settings\.([a-z0-9_]+) != 'none' \}\}$/))) { if (base[m[1]] === 'none' || !base[m[1]]) base[m[1]] = 'solid'; return; }
  if ((m = vif.match(/^\{\{ block\.settings\.([a-z0-9_]+) > 0 \}\}$/))) { if (!(base[m[1]] > 0)) base[m[1]] = 2; return; }
  if ((m = vif.match(/^\{\{ block\.settings\.([a-z0-9_]+) \}\}$/))) base[m[1]] = base[m[1]] || (typeof base[m[1]] === 'string' ? 'Zq' : true);
  else if ((m = vif.match(/^\{\{ block\.settings\.([a-z0-9_]+) == '([^']*)' \}\}$/))) base[m[1]] = m[2];
  else if ((m = vif.match(/^\{\{ block\.settings\.([a-z0-9_]+) == (true|false) \}\}$/))) base[m[1]] = m[2] === 'true';
};
const strip = h => h.replace(/\s+/g, ' ').replace(/data-pib-own="[^"]*"/g, '');

(async () => {
  if (!L.R5.Liquid) { console.log('render skipped'); return; }
  const sch = L.mainSchema();
  const silent = [], memo = new Map();
  for (const b of sch.blocks) {
    const defs = L.defaultsOf(b.settings);
    for (const x of b.settings || []) if (x.id && x.type === 'product' && defs[x.id] == null) defs[x.id] = OTHER;
    for (const x of b.settings || []) {
      if (!x.id || x.hidden || x.type === 'header' || x.type === 'paragraph') continue;
      const key = b.type + '.' + x.id;
      const base = {...defs};
      const vif = (b.settings || []).find(s => s.id && x.visible_if && x.visible_if.includes('.' + s.id + ' '));
      if (vif) enable(vif.visible_if, base);
      enable(x.visible_if, base);
      if (x.visible_if === '{{ false }}') continue; /* never shown: kept for saved content */
      let ctxs = CTX, value;
      for (const rule of RULES.filter(([re]) => re.test(key))) { Object.assign(base, rule[1](key.match(rule[0]), x.id)); if (rule[2] !== undefined) value = rule[2]; if (rule[3]) ctxs = [{design: false, product: rule[3]}, {design: true, product: rule[3]}]; }
      if (value === undefined) value = alt(x, base[x.id]);
      if (value === undefined) { silent.push(key + ' (no test value for ' + x.type + ')'); continue; }
      let changed = false;
      for (const c of ctxs) {
        const r = async s => { const k = JSON.stringify([b.type, s, c.design, CTX.indexOf(c), c.product && c.product.handle, c.product === OPROD, c.product === WIDE]); if (!memo.has(k)) memo.set(k, strip((await L.renderMain({blocks: [{id: 'blk', type: b.type, settings: s}], sectionOnly: true, design: c.design, product: c.product, globals: G})).sectionHtml)); return memo.get(k); };
        if (await r(base) !== await r({...base, [x.id]: value})) { changed = true; break; }
      }
      if (changed) checks++; else silent.push(key);
    }
  }
  if (silent.length) { console.log(silent.join('\n')); }
  ok(!silent.length, silent.length + ' block settings draw nothing');
  console.log(`${checks} product block settings checked: each changes its block with the data it needs`);
})().catch(e => { console.error(e.message); process.exit(1); });
