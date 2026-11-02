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

const {PANTS, OTHER, TALL} = L.R5;
const SOLD = {...TALL, handle: 'sold-coat', title: 'Sold Coat', id: 'sold-id', available: false, variants: TALL.variants.map(v => ({...v, available: false}))};
const LONG = '<p>' + 'Soft cotton, cut for an easy fit, washed for a broken in feel. '.repeat(8) + '</p>';
/* the product page's product, with what the blocks read */
const many = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
const PROD = {
  ...PANTS, rating: 4.6, review_count: 12, description: LONG,
  collections: [{title: 'All', handle: 'all', products: [OTHER, TALL, SOLD]}],
  metafields: {custom: {more_colors: {value: [OTHER, TALL]}, size_table: {value: 'Size,Chest\nS,90\nM,96'}}},
};
/* a product sold as a group of products (Product grouped reads it; the buy buttons then give way) */
const GROUPED = {...PANTS, metafields: {custom: {product_grouped: 'other-tee,tall-coat'}}};
const WIDE = {
  ...PROD, options: ['Color'], options_with_values: [{name: 'Color', position: 1, values: many, selected_value: 'XS'}],
  variants: many.map((v, i) => ({...PANTS.variants[0], id: 'w' + i, title: v, option1: v, option2: null, options: [v], available: i !== 3})),
};
WIDE.selected_or_first_available_variant = WIDE.variants[0]; WIDE.first_available_variant = WIDE.variants[0];
const OFFERS = {quantityBreaks: [{offerId: 'q', title: 'Choose quantity', tiers: [{quantity: 1, freeQuantity: 0}, {quantity: 2, freeQuantity: 1}]}],
  bundles: [{offerId: 'b', title: 'Together', fullCents: 200, priceCents: 180, items: [{id: PANTS.id, title: 'Pants Down', priceCents: 100, variants: [{id: 'v', name: 'Small', priceCents: 100}]}, {id: 'o', title: 'Other Tee', priceCents: 100, variants: [{id: 'o1', name: 'S', priceCents: 100}]}]}],
  checkoutOffers: [{offerId: 'u', title: 'Add one', offerPriceCents: 100, product: {id: 'extra', title: 'Other Tee', priceCents: 100, variants: [{id: 'v2', name: 'Small', priceCents: 100}]}}]};
const OPROD = {...PROD, metafields: {...PROD.metafields, storelib: {offers: {value: OFFERS}}}};
const G = {collections: {all: {title: 'All', handle: 'all', products: [OTHER, TALL, SOLD], products_count: 3}}, all_products: {'other-tee': OTHER, 'tall-coat': TALL, 'sold-coat': SOLD}};
const IMG = {src: '/img/red.svg', url: '/img/red.svg', width: 800, height: 1000, aspect_ratio: 0.8, alt: 'Red'};
const VIDEO = {media_type: 'video', sources: [{format: 'mp4', url: '/v.mp4'}], preview_image: IMG};
const PAGE = {title: 'Sizes', handle: 'sizes', url: '/pages/sizes', content: '<p>Our size guide.</p>'};
const CTX = [{design: false, product: PROD}, {design: true, product: PROD}, {design: false, product: OPROD}, {design: false, product: WIDE}];

/* What a setting needs to show, beyond its block's defaults (and the switch its visible_if names). */
const RULES = [
  [/^benefits_pills\.pill(\d)_icon_(svg|image)$/, (m, id) => ({[`pill${m[1]}_enable`]: true, [`pill${m[1]}_text`]: 'Free returns', [`pill${m[1]}_icon_source`]: m[2]})],
  [/^benefits_pills\.pill(\d)_icon_source$/, m => ({[`pill${m[1]}_enable`]: true, [`pill${m[1]}_text`]: 'Free returns'}), 'none'],
  [/^benefits_pills\.pill(\d)_/, m => ({custom_style: true, [`pill${m[1]}_enable`]: true, [`pill${m[1]}_text`]: 'Free returns'})],
  [/^benefits_pills\.pill_border_/, () => ({custom_style: true, pill_border_style: 'solid', pill_border_width: 2})],
  [/^benefits_tab\.tab(\d)_icon_(svg|image)$/, m => ({[`tab${m[1]}_enable`]: true, [`tab${m[1]}_text`]: 'Free returns', [`tab${m[1]}_icon_source`]: m[2]})],
  [/^benefits_tab\.tab(\d)_icon_source$/, m => ({[`tab${m[1]}_enable`]: true, [`tab${m[1]}_text`]: 'Free returns'}), 'none'],
  [/^benefits_tab\.tab(\d)_/, m => ({enable_custom_style: true, [`tab${m[1]}_enable`]: true, [`tab${m[1]}_text`]: 'Free returns'})],
  [/^benefits_tab\.container_border_/, () => ({enable_custom_style: true, container_border_style: 'solid', container_border_width: 2})],
  [/^delivery_pills\.pill_border_color$/, () => ({pill_border_width: 2})],
  [/^benefits_stack\.icon_(\d)$/, m => ({[`text_${m[1]}`]: 'Free returns'})],
  [/^happy_customers\.avatar_(\d)$/, () => ({show_avatars: true, avatar_count: 6})],
  [/^money_back_guarantee\.secondary_/, () => ({secondary_text: 'Free returns for 30 days'})],
  [/^info_box\.top_icon/, () => ({top_show_icon: true})],
  [/^info_box\.collapse2_/, () => ({collapse2_title: 'Delivery'})],
  [/^infotables\.row(\d)_svg$/, m => ({[`row${m[1]}_enable`]: true, [`row${m[1]}_custom_icon`]: true})],
  [/^variant_selector_pro\.(title|subtitle)/, () => ({enable_vsp_custom: true, show_static_title: true, subtitle: 'Pick a size'})],
  [/^variant_selector_pro\.label_/, () => ({enable_vsp_custom: true, show_label: true})],
  [/^variant_selector_pro\.footer_color$/, () => ({enable_vsp_custom: true, footer_note: 'Ships in two days'})],
  [/^variant_selector_pro\.(selected_border)$/, () => ({enable_vsp_custom: true, accent: ''})],
  [/^variant_selector_pro\.(sold_out_|hide_unavailable)/, () => ({enable_vsp_custom: true}), undefined, WIDE],
  [/^variant_selector_pro\.thumb_max_size$/, () => ({enable_vsp_custom: true, swatch_style: 'image', swatch_size: 80}), 20],
  [/^stock_pulse_notice\.ref_product$/, () => ({auto_qty: true, auto_source: 'specific', ref_product: {...OTHER, selected_or_first_available_variant: {...OTHER.variants[0], inventory_quantity: 3}}})],
  [/^variant_selector_pro\.sold_out_badge_/, () => ({sold_out_label: 'Sold out'})],
  [/^countdown_timer\.date_source$/, () => ({end_date: ''}), 'product', {...PANTS, metafields: {custom: {countdown_timer: '2031-03-03'}}}],
  [/^custom_liquid\.custom_liquid$/, () => ({}), '<p>Our own note.</p>'],
  [/^variant_selector_pro\.variant_\d+_/, () => ({enable_vsp_custom: true, swatch_style: 'image'}), undefined, WIDE],
  [/^modern_collapsible_row\.icon_/, () => ({enable_left_icon: true})],
  [/^product_reviews\.(star_color|text_color)$/, () => ({enable_counter_custom: true})],
  [/^product_reviews\.manual_/, () => ({review_source: 'manual', manual_review_rating: 4, manual_review_count: 3})],
  [/^sold_counter\.(sold|hours)$/, () => ({sold_source: 'manual', sold: 34, hours: 24})],
  [/^sold_counter\.(sold_period_label|hours_label)$/, () => ({sold_source: 'manual', sold: 34, hours: 24})],
  [/^(countdown_timer|countdown_badge)\.(end_hour|end_minute|utc_offset)$/, () => ({timing_input: 'parts', end_date: '2030-01-01'})],
  [/^(countdown_timer|countdown_badge)\.timing_input$/, () => ({end_date: '2030-01-01', end_iso: '2031-02-02T10:00:00Z'})],
  [/^countdown_timer\.date_source$/, () => ({end_date: '2030-01-01'})],
  [/^lod_rating_badge\.enable_link$/, () => ({link_url: '/pages/reviews'})],
  [/^lod_donation_badge\.use_image$/, () => ({icon_image: IMG})],
  [/^lod_testimonials_block\.(custom_star_image|star_style)$/, () => ({star_style: 'custom', custom_star_image: IMG})],
  [/^pair_with_upsell\.main_/, () => ({purchase_action: 'main', p1: OTHER})],
  [/^payment_badges\.sub_newtab$/, () => ({sub_url: '/pages/delivery'})],
  [/^(horizontal_benefits|vertical_benefits)\.item(\d)_use_image$/, m => ({[`item${m[2]}_image`]: IMG, [`item${m[2]}_title`]: 'Free returns'})],
  [/^vertical_benefits\.item(\d)_image(_size)?$/, m => ({[`item${m[1]}_use_image`]: true, [`item${m[1]}_image`]: IMG, [`item${m[1]}_title`]: 'Free returns'})],
  [/^(size_guide|size_table)\.table_(data|unit)$/, () => ({table_data: 'Size,Chest\nS,90\nM,96', table_unit: 'cm'})],
  [/^size_table\.(use_metafield|metafield_namespace|metafield_key)$/, () => ({use_metafield: true})],
  [/^product_grouped\./, () => ({}), undefined, GROUPED],
  [/\.(enable_custom_style|custom_style)$/, (m, id) => ({own_text_color: '#123456'})],
  [/^product_description\.enable_custom_description$/, () => ({custom_description: '<p>Our own words.</p>'})],
];
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
