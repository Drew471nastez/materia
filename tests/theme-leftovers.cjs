// Leftovers from Storelib's push notes, kept fixed.
//
//  1. sections/testimon4: at most 120 settings (the builder shows the first
//     120), every setting read, nothing read that the schema does not declare.
//  2. sections/featured-blog-header: block types are names the builder can
//     store (lowercase letters, digits, _ and -), and the saved pages use them.
//  3. sections/main-product and featured-product: no "@app" block entry.
//  4. snippets/reel-tile and social-shop-tile: no picture or video from an
//     outside host; an empty tile draws snippets/placeholder-render. The only
//     outside addresses left are the YouTube and Vimeo players for a link the
//     creator pasted.
//  5. countdown-timer3, divider3, gallerysimple2: no CSS variable or class
//     written from a setting the schema does not declare.
//  6. snippets/upsell-pro: the Auto source fills the list after the manual
//     products, from recommendations, the product's collection or all
//     products, never the product itself or a manual pick twice. Rendered
//     with liquidjs when it can be loaded (LIQUIDJS=<path> or installed),
//     otherwise checked statically.
//
// node tests/theme-leftovers.cjs   exits 1 on any failure
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const split = f => {
  const text = read(f);
  const at = text.indexOf('\n<schema>');
  return { text, template: text.slice(0, at), schema: JSON.parse(text.slice(at).match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]) };
};
const strip = s => s.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, ' ');
const sectionReads = tpl => new Set([...strip(tpl).matchAll(/section\.settings\.(\w+)/g)].map(m => m[1]));
let checks = 0;

/* 1. testimon4 */
{
  const { template, schema } = split('sections/testimon4.storelib');
  const settings = schema.shopify.settings;
  assert.ok(settings.length <= 120, `testimon4 has ${settings.length} settings; the builder shows 120`);
  assert.ok(schema.settings.length <= 120, 'testimon4 panel has more than 120 settings');
  const ids = new Set(settings.filter(s => s.id).map(s => s.id));
  const reads = sectionReads(template);
  for (const id of ids) assert.ok(reads.has(id), `testimon4 setting ${id} is never read`);
  for (const id of reads) assert.ok(ids.has(id), `testimon4 reads ${id}, which it does not declare`);
  for (const preset of [...(schema.shopify.presets || []), ...(schema.presets || [])])
    for (const key of Object.keys(preset.settings || {})) assert.ok(ids.has(key), `testimon4 preset sets ${key}, which it does not declare`);
  for (const s of settings) if (s.visible_if)
    for (const [, id] of s.visible_if.matchAll(/section\.settings\.(\w+)/g)) assert.ok(ids.has(id), `testimon4 ${s.id} visible_if reads ${id}`);
  // The most used settings stay in the panel.
  for (const id of ['heading', 'rating_text', 'text', 'button', 'button_url', 'color_scheme', 'padding_top', 'padding_bottom'])
    assert.ok(ids.has(id), `testimon4 lost ${id}`);
  checks += 5;
}

/* 2. featured-blog-header block types */
{
  const { schema } = split('sections/featured-blog-header.storelib');
  const types = (schema.shopify.blocks || []).map(b => b.type);
  assert.ok(types.length > 0, 'featured-blog-header declares no block');
  for (const t of types) assert.match(t, /^[a-z][a-z0-9_-]*$/, `featured-blog-header block type ${t} is not a name the builder can store`);
  for (const f of fs.readdirSync(path.join(root, 'templates')).filter(f => f.endsWith('.json'))) {
    const page = JSON.parse(read('templates/' + f));
    for (const s of Object.values(page.sections || {})) if (s.type === 'featured-blog-header')
      for (const b of Object.values(s.blocks || {})) assert.ok(types.includes(b.type), `templates/${f} has a featured-blog-header block of type ${b.type}`);
  }
  checks += 2;
}

/* 3. no @app */
for (const f of ['sections/main-product.storelib', 'sections/featured-product.storelib']) {
  const { schema } = split(f);
  for (const list of [schema.blocks || [], schema.shopify.blocks || []])
    assert.ok(!list.some(b => b.type === '@app'), `${f} still accepts @app blocks`);
  checks++;
}

/* 4. tiles without outside media */
for (const f of ['snippets/reel-tile.storelib', 'snippets/social-shop-tile.storelib']) {
  const text = strip(read(f));
  const hosts = [...text.matchAll(/(?:https?:)?\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map(m => m[1].toLowerCase());
  for (const h of hosts) assert.ok(/^(www\.youtube\.com|player\.vimeo\.com)$/.test(h), `${f} links ${h}`);
  assert.ok(/render 'placeholder-render'/.test(text), `${f} does not draw the inline placeholder`);
  assert.ok(!/<(?:img|video|source)[^>]+src="https?:/i.test(text), `${f} has a picture or video from an outside address`);
  checks++;
}

/* 5. no dead setting reads */
for (const f of ['sections/countdown-timer3.storelib', 'sections/divider3.storelib', 'sections/gallerysimple2.storelib']) {
  const { template, schema } = split(f);
  const ids = new Set((schema.shopify.settings || []).filter(s => s.id).map(s => s.id));
  const blockIds = new Set((schema.shopify.blocks || []).flatMap(b => (b.settings || []).map(s => s.id)));
  for (const id of sectionReads(template)) assert.ok(ids.has(id), `${f} reads section.settings.${id}, which it does not declare`);
  for (const [, id] of strip(template).matchAll(/block\.settings\.(\w+)/g)) assert.ok(blockIds.has(id), `${f} reads block.settings.${id}, which no block declares`);
  checks++;
}

/* 6. upsell Auto */
const upsell = read('snippets/upsell-pro.storelib');
assert.match(upsell, /s\.source == 'auto'/, 'upsell-pro does not read the source setting');
assert.match(upsell, /recommendations\.products/);
assert.match(upsell, /current_product\.collections\.first\.products/);
assert.match(upsell, /collections\.all\.products/);
assert.match(upsell, /\{%-?\s*for p in auto_source\s*-?%\}[\s\S]*?render 'upsell-pro-card'/, 'Auto picks are not drawn as upsell cards');
for (const f of ['sections/main-product.storelib', 'sections/featured-product.storelib']) {
  const source = split(f).schema.shopify.blocks.find(b => b.type === 'upsell_pro').settings.find(s => s.id === 'source');
  assert.ok(!/not added/.test(source.info || ''), `${f} upsell info still says recommendations are not added`);
}
checks++;

let Liquid = null;
try { ({ Liquid } = require(process.env.LIQUIDJS || 'liquidjs')); } catch { /* not installed */ }

(async () => {
  if (!Liquid) {
    console.log(`${checks} leftover checks passed (upsell Auto render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
    return;
  }
  const engine = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false,
  });
  engine.registerFilter('t', k => k);
  engine.registerFilter('money', v => '$' + (Number(v) / 100).toFixed(2));
  engine.registerFilter('image_url', v => String(v && v.src || v));
  engine.registerFilter('json', v => JSON.stringify(v));
  const product = (n, extra = {}) => ({
    id: 'id-' + n, handle: 'p' + n, title: 'Product ' + n, url: '/products/p' + n, available: true, type: 'Tops',
    featured_image: { src: '/img/' + n + '.webp' },
    variants: [{ id: 'v' + n, title: 'Default', price: 1000 + n, available: true }],
    selected_or_first_available_variant: { id: 'v' + n, price: 1000 + n }, ...extra,
  });
  const p1 = product(1), p2 = product(2), p3 = product(3, { available: false }), p4 = product(4), p5 = product(5);
  const base = {
    max_products: 3, hide_unavailable: true, hide_current_product: true, show_image: true, show_price: true,
    manual_product_1: '', manual_product_2: '', manual_product_3: '', manual_product_4: '', manual_product_5: '', manual_product_6: '',
  };
  // liquidjs takes no comment block inside {% liquid %}; Storelib does.
  const source = upsell.replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '');
  const render = (settings, ctx) => engine.parseAndRender(source, {
    block: { id: 'b1', settings: { ...base, ...settings }, shopify_attributes: '' },
    current_product: p1, all_products: { p4, p5 }, ...ctx,
  });
  const cards = html => [...html.matchAll(/data-product-handle="([^"]+)"/g)].map(m => m[1]);

  // Auto from the product's collection: never itself, skips the unavailable one.
  let html = await render({ source: 'auto' }, { collections: { all: { products: [] } }, current_product: { ...p1, collections: [{ products: [p1, p2, p3, p4, p5] }] } });
  assert.deepEqual(cards(html), ['p2', 'p4', 'p5'], 'Auto fills from the product collection');
  // Auto with a manual pick first; the manual pick is not drawn twice.
  html = await render({ source: 'auto', manual_product_1: p4 }, { current_product: { ...p1, collections: [{ products: [p4, p2, p5] }] } });
  assert.deepEqual(cards(html), ['p4', 'p2', 'p5'], 'Auto keeps the manual pick first and fills the rest');
  // No collection: all products.
  html = await render({ source: 'auto' }, { current_product: { ...p1, collections: [] }, collections: { all: { products: [p1, p5, p2] } } });
  assert.deepEqual(cards(html), ['p5', 'p2'], 'Auto falls back to all products');
  // Drawn through /recommendations/products: the recommendations win.
  html = await render({ source: 'auto' }, { recommendations: { performed: true, products_count: 2, products: [p5, p4] }, current_product: { ...p1, collections: [{ products: [p2] }] } });
  assert.deepEqual(cards(html), ['p5', 'p4'], 'Auto uses the recommendations when they were performed');
  // Manual adds nothing of its own; with no picks the block draws nothing.
  html = await render({ source: 'manual' }, { current_product: { ...p1, collections: [{ products: [p2, p4] }] } });
  assert.deepEqual(cards(html), [], 'Manual with no picks draws no cards');
  assert.ok(!/upsell-pro__list/.test(html), 'Manual with no picks draws nothing');
  checks += 5;
  console.log(`${checks} leftover checks passed (upsell Auto rendered with liquidjs)`);
})().catch(err => { console.error(err); process.exit(1); });
