/* Product data for the product information blocks (not a test itself).

   The products, shop data and per-setting needs that Main product and
   Featured product blocks read: a product with ratings and reviews, a sold
   count, a long description, more colours, a Storelib size chart and size
   table, Storelib offers (quantity breaks, bundles, checkout upsells), a
   product with ten sizes, a grouped product, and the test words a block's
   styling settings need to have something to style. Used by
   tests/theme-r6-product-block-data.cjs and by
   tests/theme-every-setting-sweep.cjs, which, for a product block setting it
   sees change nothing with its plain product, draws it again with what is
   here (bases()) before calling it dead. */
const {PANTS, OTHER, TALL} = require('./theme-featured-product-round5.cjs');

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
/* a gift card (the buy buttons then offer the recipient form) */
const GIFT = {...PANTS, handle: 'gift-card', title: 'Gift card', 'gift_card?': true, gift_card: true};
const WIDE = {
  ...PROD, options: ['Color'], options_with_values: [{name: 'Color', position: 1, values: many, selected_value: 'XS'}],
  variants: many.map((v, i) => ({...PANTS.variants[0], id: 'w' + i, title: v, option1: v, option2: null, options: [v], available: i !== 3})),
};
WIDE.selected_or_first_available_variant = WIDE.variants[0]; WIDE.first_available_variant = WIDE.variants[0];
const OFFERS = {quantityBreaks: [{offerId: 'q', title: 'Choose quantity', tiers: [{quantity: 1, freeQuantity: 0}, {quantity: 2, freeQuantity: 1}]}],
  bundles: [{offerId: 'b', title: 'Together', fullCents: 200, priceCents: 180, items: [{id: PANTS.id, title: 'Pants Down', priceCents: 100, variants: [{id: 'v', name: 'Small', priceCents: 100}]}, {id: 'o', title: 'Other Tee', priceCents: 100, variants: [{id: 'o1', name: 'S', priceCents: 100}]}]}],
  checkoutOffers: [{offerId: 'u', title: 'Add one', offerPriceCents: 100, product: {id: 'extra', title: 'Other Tee', priceCents: 100, variants: [{id: 'v2', name: 'Small', priceCents: 100}]}}]};
const OPROD = {...PROD, metafields: {...PROD.metafields, storelib: {offers: {value: OFFERS}}}};
/* PROD with what a product can carry beyond it: its Storelib rating and count, a sold count and a
   Storelib size chart (Products > Size charts); RICH_OFFERS adds the Storelib offers. */
const CHART = {name: 'Pants sizes', unit: 'cm', columns: [{key: 'size', label: 'Size'}, {key: 'waist', label: 'Waist', measurement: true}], rows: [{size: 'S', cells: ['76']}, {size: 'M', cells: ['81']}]};
const RICH = {...PROD, metafields: {...PROD.metafields, custom: {...PROD.metafields.custom, sold_count: {value: 34}}, reviews: {rating: {value: {rating: 4.6, scale_max: 5}}, rating_count: {value: 12}}, storelib: {reviews: {value: {average: 4.6, count: 12}}, size_chart: {value: CHART}}}};
/* the same offers with two sizes for each product, so their size pickers show */
const two = v => [v, {...v, id: v.id + '-l', name: 'Large'}];
const OFFERS2 = {...OFFERS, bundles: OFFERS.bundles.map(b => ({...b, items: b.items.map(i => ({...i, variants: two(i.variants[0])}))})),
  checkoutOffers: OFFERS.checkoutOffers.map(o => ({...o, product: {...o.product, variants: two(o.product.variants[0])}}))};
const RICH_OFFERS = {...RICH, metafields: {...RICH.metafields, storelib: {...RICH.metafields.storelib, offers: {value: OFFERS2}}}};
const G = {collections: {all: {title: 'All', handle: 'all', products: [OTHER, TALL, SOLD], products_count: 3}}, all_products: {'other-tee': OTHER, 'tall-coat': TALL, 'sold-coat': SOLD}};
const IMG = {src: '/img/red.svg', url: '/img/red.svg', width: 800, height: 1000, aspect_ratio: 0.8, alt: 'Red'};
const VIDEO = {media_type: 'video', sources: [{format: 'mp4', url: '/v.mp4'}], preview_image: IMG};
const PAGE = {title: 'Sizes', handle: 'sizes', url: '/pages/sizes', content: '<p>Our size guide.</p>'};

/* What a setting needs to show, beyond its block's defaults (and the switch its visible_if names). */
/* The shipped defaults of these blocks carry no ratings, counts or promises (an empty block draws
   nothing on the storefront), so the settings that style their words get test words here. */
const CONTENT = {
  delivery_pills: {pill_1_title: 'Zq one', pill_2_title: 'Zq two', pill_3_title: 'Zq three'},
  specs_badge: {text: 'Zq specs'},
  happy_customers: {heading: 'Zq heading', rating_text: '4', filled_stars: 4},
  simple_rating: {text: 'Zq rating', filled_stars: 4},
  low_stock_badge: {units_count: 3},
  in_stock: {label_text: 'Zq label', middle_text: 'Zq middle'},
  money_back_guarantee: {primary_text: 'Zq guarantee'},
  buy_buttons: {estimated_delivery_text: '<p>Zq delivery</p>'},
  lod_rating_badge: {label_text: 'Zq rating', rating: 4},
  lod_donation_badge: {badge_text_d: 'Zq desktop', badge_text_m: 'Zq mobile'},
  stock_pulse_notice: {text_template: 'Zq stock'},
  social_proof_inline: {label_text: 'Zq proof', rating: 4},
  info_box: {top_text: '<p>Zq top</p>', collapse_body: '<p>Zq body</p>'},
  infotables: {row3_lead: 'Zq lead'},
  horizontal_benefits: {item1_title: 'Zq one', item1_subtitle: 'Zq sub one', item2_title: 'Zq two', item2_subtitle: 'Zq sub two'},
  vertical_benefits: {item1_title: 'Zq one', item2_title: 'Zq two', item3_title: 'Zq three'},
};
/* [pattern on "block.setting", block settings it needs, the value to try (the data test), the product it needs] */
const RULES = [
  [/^([a-z_]+)\./, m => ({...(CONTENT[m[1]] || {})})],
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
  /* the text in a colour dot shows only for a colour with no picture and no colour of its own */
  [/^variant_selector_pro\.placeholder_/, () => ({enable_vsp_custom: true, swatch_style: 'color', ...Object.fromEntries(Array.from({length: 10}, (_, i) => [[`variant_${i + 1}_image`, ''], [`variant_${i + 1}_color`, '']]).flat())})],
  /* the cap acts on swatches larger than it */
  [/^variant_selector_pro\.thumb_max_size$/, () => ({enable_vsp_custom: true, swatch_style: 'image', option_size_d: 240, option_size_m: 200})],
  /* a divider sits between two rows; centring shows on a card narrower than its column */
  [/^infotables\.divider_/, () => ({row2_enable: true, row2_code: 'Zq code'})],
  [/^infotables\.center_card$/, () => ({max_width: 480})],
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
  [/^buy_buttons\.show_gift_card_recipient$/, () => ({}), undefined, GIFT],
  [/\.(enable_custom_style|custom_style)$/, (m, id) => ({own_text_color: '#123456'})],
  [/^product_description\.enable_custom_description$/, () => ({custom_description: '<p>Our own words.</p>'})],
];

/* ------------------------------------------------------------ for the every setting sweep */
/* The sections whose blocks are the product information blocks. */
const SECTIONS = ['main-product', 'featured-product'];
/* The products a block is drawn with, by name (a drawing's state names one in __ctx, as JSON keeps it). */
const PRODUCTS = {prod: PROD, rich: RICH, offers: RICH_OFFERS, wide: WIDE, grouped: GROUPED};
/* The block settings and product a setting needs (RULES), for the sweep. */
function needs(key) {
  const out = {settings: {}, product: null};
  for (const [re, f, , p] of RULES) { const m = key.match(re); if (!m) continue; Object.assign(out.settings, f(m, key.split('.')[1])); if (p) out.product = p; }
  return out;
}
/* The other drawings of a light state (a section setting, or one block at index 0) to try: the product's
   own data, with Storelib offers, on the storefront too, and what RULES says the setting needs. */
function bases(name, it, light) {
  if (!SECTIONS.includes(name)) return [];
  const key = (it.scope === 'section' ? '' : it.scope + '.') + it.x.id;
  const {settings: need, product} = it.scope === 'section' ? {settings: {}, product: null} : needs(key);
  let named = null;
  if (product) { named = Object.keys(PRODUCTS).find(k => PRODUCTS[k] === product); if (!named) { named = 'p' + Object.keys(PRODUCTS).length; PRODUCTS[named] = product; } }
  const ctxs = named ? [{product: named}, {product: named, design: false}] : [{product: 'rich'}, {product: 'offers'}, {product: 'rich', design: false}, {product: 'offers', design: false}, {product: 'wide'}];
  /* a product picker of the block holds another product than the page's own (as the data test gives it), so a list that leaves the current product out has one to show */
  const picks = Object.fromEntries((it.list || []).filter(x => x.type === 'product' && x.id !== it.x.id).map(x => [x.id, TALL]));
  const withNeeds = st => { const s = JSON.parse(JSON.stringify(st)); if (it.scope !== 'section' && s.blocks[0]) { const b = s.blocks[0].settings; for (const k of Object.keys(picks)) if (!b[k] || b[k].handle === PANTS.handle) b[k] = picks[k]; Object.assign(b, need); } return s; };
  const out = [];
  for (const c of ctxs) { const s = withNeeds(light); s.__ctx = c; out.push(s); }
  return out;
}
/* What draw() gives render(): the named product as the page's product (Main product) or the picked
   one (Featured product, while its pick is the plain product), the shop's other products, and the
   storefront when the state says so. */
function drawWith(name, state, globals) {
  const c = state.__ctx;
  if (!c || !SECTIONS.includes(name)) return {settings: state.settings, blocks: state.blocks, globals, editing: true};
  const p = PRODUCTS[c.product] || RICH;
  const settings = {...state.settings};
  if (name === 'featured-product' && settings.product && settings.product.handle === PANTS.handle) settings.product = p;
  const design = c.design !== false;
  return {settings, blocks: state.blocks, editing: design, globals: {...globals, ...G, collections: {...globals.collections, ...G.collections}, product: p, request: {...globals.request, design_mode: design}}};
}

/* Product block settings that stay although the sweep sees no change, each with why ([pattern on "section:key", reason], read into the sweep's ALLOW). */
const ALLOW = [
  [/^(main-product|featured-product):pair_with_upsell\.btn_(bg|text)_added$/, 'Colours of the button once its product is in the cart, a state set by a click.'],
  [/^(main-product|featured-product):product_addon\.active_border_color$/, 'Border of the add-on once it is ticked, a state set by a click.'],
  [/^(main-product|featured-product):stock_pulse_notice\.pulse_scale$/, 'How far the dot pulses: motion, which the sweep holds on its first frame.'],
  [/^(main-product|featured-product):payment_badges\.sub_uline_w$/, 'Underline thickness (text-decoration-thickness), a style the sweep does not read; shown with Underline on.'],
  [/^main-product:(enable_on_desktop|enable_on_mobile)$/, 'The sticky add to cart bar shows once the page scrolls past the buy buttons, which a still drawing never does; tests/theme-r6-main-product.cjs checks the class of the bar.'],
];

module.exports = {ALLOW, PANTS, OTHER, TALL, SOLD, LONG, PROD, GROUPED, GIFT, WIDE, OFFERS, OFFERS2, OPROD, CHART, RICH, RICH_OFFERS, G, IMG, VIDEO, PAGE, CONTENT, RULES, SECTIONS, PRODUCTS, needs, bases, drawWith};
