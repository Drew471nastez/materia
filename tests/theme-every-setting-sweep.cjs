/* Every setting, every section: a final sweep across the whole theme.

   For every sections/*.storelib with a "shopify" schema (the retired
   hero-product4, page-sale-banner and promo-banner-1 and the 11 native
   Storelib files are left out), the first preset (or the schema defaults) is
   drawn with tests/media-fixture.cjs render(), with one block of every block
   type the schema has, every picker given sample data (product, collection,
   blog, article, page, menu, image, video) and a page context with a
   product, a collection, a cart, a blog and a customer. Then every visible
   setting (not hidden, visible_if not "{{ false }}") of the section and of
   every block type is changed, its visible_if satisfied first:
   checkbox flipped, every other select option, range min and max, a colour,
   words, a link, another picked item.

   A change passes when the markup changes outside class and style (words,
   attributes, elements, data the scripts read). A change that only touches
   classes, style attributes or <style> is drawn in Chromium (1366 and 375;
   an id with _mobile counts at 375 only, _desktop at 1366 only) and passes
   when a computed style of the section changes, normally or with every
   :hover, :focus and :active rule forced on.

   The settings that change nothing are listed by section. Those in ALLOW
   carry the reason they stay; anything else fails the run.

   Run: LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-every-setting-sweep.cjs [section ...]
   JOBS=<n> splits the sections over n processes (default 4). OUT=<dir> keeps
   the full result as sweep.json there. */
const fs = require('fs'), path = require('path'), os = require('os'), {fork} = require('child_process'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FP = require('./theme-featured-product-round5.cjs');
if (!FP.Liquid) { console.log('every setting sweep skipped: liquidjs not installed (LIQUIDJS=<path to liquidjs>)'); return; }

/* One engine for the whole run, parsing every snippet and section once. */
const baseEngine = FP.engine;
let shared = null;
FP.engine = (...a) => {
  if (a.length) return baseEngine(...a);
  if (shared) return shared;
  const e = baseEngine();
  e.registerFilter('format_address', a => a ? [a.name, a.address1, a.city, a.country].filter(Boolean).join('<br>') : '');
  e.registerFilter('default_errors', () => '');
  e.registerFilter('default_pagination', () => '');
  e.registerFilter('highlight', v => v);
  e.registerFilter('link_to', (v, u) => `<a href="${u}">${v}</a>`);
  e.registerFilter('payment_button', () => '');
  e.registerFilter('time_tag', v => `<time>${v}</time>`);
  /* a picked video draws its own source and poster, so a different video is a different drawing */
  const vtag = v => { if (!v || typeof v !== 'object') return ''; const src = (v.sources && v.sources[0] && v.sources[0].url) || v.url || ''; const poster = v.preview_image && (v.preview_image.src || v.preview_image.url) || ''; return `<video playsinline muted src="${src}" poster="${poster}"></video>`; };
  e.registerFilter('video_tag', vtag);
  e.registerFilter('media_tag', vtag);
  const m = new Map();
  e.options.cache = {read: k => m.get(k), write: (k, v) => m.set(k, v), remove: k => m.delete(k), clear: () => m.clear()};
  e.parser.cache = e.options.cache;
  e.parser.parseFile = e.parser._parseFileCached;
  const tpls = new Map(), par = e.parseAndRender.bind(e);
  const clean = t => t.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
  e.parseAndRender = (src, ctx, opts) => { if (!tpls.has(src)) tpls.set(src, e.parse(clean(src))); return e.render(tpls.get(src), ctx, opts); };
  void par;
  shared = e;
  return e;
};
const {render, schemaOf, THEME_VARS, themeControls, PANTS, OTHER} = require('./media-fixture.cjs');

const RETIRED = ['hero-product4', 'page-sale-banner', 'promo-banner-1'];
/* Bump when the sweep's checks change, so CACHE results are drawn again. */
const SWEEP_VERSION = '13';

/* ------------------------------------------------------------ sample data */
const IMG = {id: 'img1', src: 'https://theme.test/pic-a.png', url: 'https://theme.test/pic-a.png', width: 1600, height: 1000, aspect_ratio: 1.6, alt: 'Sample picture', presentation: {focal_point: '50% 50%'}};
const IMG2 = {id: 'img2', src: 'https://theme.test/pic-b.png', url: 'https://theme.test/pic-b.png', width: 900, height: 1200, aspect_ratio: 0.75, alt: 'Other picture', presentation: {focal_point: '50% 50%'}};
const IMG3 = {id: 'img3', src: 'https://theme.test/pic-c.png', url: 'https://theme.test/pic-c.png', width: 1200, height: 800, aspect_ratio: 1.5, alt: 'Collection picture', presentation: {focal_point: '50% 50%'}};
const VIDEO = {id: 'vid1', media_type: 'video', alt: 'Clip', aspect_ratio: 1.78, sources: [{format: 'mp4', url: 'https://theme.test/clip.mp4', mime_type: 'video/mp4', width: 1280, height: 720}], preview_image: IMG};
const VIDEO2 = {...VIDEO, id: 'vid2', sources: [{format: 'mp4', url: 'https://theme.test/clip-b.mp4', mime_type: 'video/mp4', width: 720, height: 1280}], preview_image: IMG2, aspect_ratio: 0.56};
class VideoUrl { constructor(type, id) { this.type = type; this.id = id; } toString() { return this.type === 'youtube' ? 'https://www.youtube.com/watch?v=' + this.id : 'https://vimeo.com/' + this.id; } }
const FILTERS = [
  {label: 'Availability', type: 'list', param_name: 'filter.v.availability', active_values: [], inactive_values: [], values: [{label: 'In stock', value: '1', count: 8, active: false, param_name: 'filter.v.availability', url_to_add: '?filter.v.availability=1', url_to_remove: '?'}, {label: 'Out of stock', value: '0', count: 2, active: false, param_name: 'filter.v.availability', url_to_add: '?filter.v.availability=0', url_to_remove: '?'}], url_to_remove: '?'},
  {label: 'Price', type: 'price_range', param_name: 'filter.v.price', range_max: 21193, min_value: {param_name: 'filter.v.price.gte', value: null}, max_value: {param_name: 'filter.v.price.lte', value: null}, active_values: [], values: [], url_to_remove: '?'},
];
const SORTS = ['relevance', 'manual', 'best-selling', 'price-ascending', 'price-descending', 'title-ascending', 'title-descending', 'created-ascending', 'created-descending'].map(value => ({value, name: value.replace(/-/g, ' ')}));
const coll = (handle, title, products) => ({id: 'c-' + handle, handle, title, url: '/collections/' + handle, description: '<p>Cut and sewn in small runs.</p>', image: IMG3, featured_image: IMG3, products, products_count: products.length, all_products_count: products.length, filters: FILTERS, sort_options: SORTS, sort_by: 'manual', default_sort_by: 'manual', all_tags: ['Cotton'], tags: [], all_types: ['Bottoms'], all_vendors: ['Materia'], metafields: {}});
/* Ten products, so a grid with a "load more" or a second page has more to show than its first rows. */
const MANY = [PANTS, OTHER, ...Array.from({length: 8}, (_, i) => { const b = i % 2 ? OTHER : PANTS; return {...b, id: b.id + '-' + i, handle: b.handle + '-' + i, title: b.title + ' ' + (i + 2), url: '/products/' + b.handle + '-' + i}; })];
const COLL = coll('pants', 'Pants', MANY);
/* the collection's own sub collections (Collection > metafield custom.subcollection) */
COLL.metafields = {custom: {subcollection: {value: [coll('jeans', 'Jeans', MANY.slice(0, 3)), coll('shorts', 'Shorts', MANY.slice(3, 6)), coll('chinos', 'Chinos', MANY.slice(6))]}}};
const COLL2 = coll('tees', 'Tees', [OTHER]);
const article = (handle, title) => ({id: 'a-' + handle, handle, title, url: '/blogs/news/' + handle, author: 'Ana Lima', published_at: '2026-03-02', created_at: '2026-03-02', excerpt: '<p>How the new fabric is woven.</p>', excerpt_or_content: '<p>How the new fabric is woven.</p>', content: '<p>How the new fabric is woven, and why it lasts.</p>', image: IMG, tags: ['News'], comments_count: 1, comments: [{author: 'Joe', content: 'Nice', created_at: '2026-03-03'}], comments_enabled: true, blog: {title: 'News', handle: 'news', url: '/blogs/news'}, user: {first_name: 'Ana', last_name: 'Lima', bio: 'Editor', image: IMG}, metafields: {}});
const ARTICLE = article('fabric', 'The new fabric'), ARTICLE2 = article('care', 'Care guide');
const ARTICLES = [ARTICLE, ARTICLE2, ...['dye', 'fit', 'wash', 'repair'].map(h => article(h, 'On ' + h))];
const BLOG = {id: 'b-news', handle: 'news', title: 'News', url: '/blogs/news', articles: ARTICLES, articles_count: ARTICLES.length, all_tags: ['News', 'Care'], tags: [], comments_enabled: true};
const BLOG2 = {...BLOG, id: 'b-journal', handle: 'journal', title: 'Journal', url: '/blogs/journal', articles: [ARTICLE2]};
const PAGE = {id: 'pg1', handle: 'about', title: 'About us', url: '/pages/about', content: '<p>We make clothes in Porto.</p>'};
const PAGE2 = {...PAGE, id: 'pg2', handle: 'care', title: 'Care', url: '/pages/care', content: '<p>Wash cold.</p>'};
const link = (title, url, links = []) => ({title, url, links, active: false, current: false, child_active: false, levels: links.length ? 1 : 0, type: 'http_link', handle: title.toLowerCase()});
const MENU = {handle: 'main-menu', title: 'Main menu', links: [link('Home', '/'), link('Shop', '/collections/all', [link('Pants', '/collections/pants'), link('Tees', '/collections/tees')]), link('About', '/pages/about')]};
/* The header reads a badge from a tag in a link's title ([hot], [new] ...): one link for each. */
const MENU_TAGGED = {...MENU, links: [...MENU.links.map(l => l.title === 'Home' || l.links.length ? l : {...l, links: [link('Our story', '/pages/story'), link('Stores', '/pages/stores')]}), link('Help', '/pages/help', [link('Shipping', '/pages/shipping'), link('Returns', '/pages/returns')]), ...['hot', 'new', 'sale', 'popular', 'custom_1', 'custom_2'].map(k => link('Tagged ' + k + ' [' + k + ']', '/collections/' + k, [link('First ' + k, '/collections/' + k + '-1'), link('Second ' + k, '/collections/' + k + '-2')]))]};
/* Per section data the base drawing needs beyond the defaults. */
const DATA = {
  'theme-header': {settings: {mega_menu: MENU_TAGGED}, withBlocks: ['menu_badges']},
  /* how many pictures fit a row only shows with more pictures than one */
  'image-with-text-benefits': {repeat: {media: 3}},
  /* a column's 6th to 8th values fill the 6th to 8th rows */
  'comparison-table-2': {repeat: {row: 8}},
};
/* A block that names the top-level link it belongs to gets a link of its own, one after the other. */
const TOP_TITLES = MENU_TAGGED.links.map(l => l.title.replace(/\s*\[.*\]$/, '')).filter(t => t !== 'Home' && t !== 'Help');
let topN = 0;
const MENU2 = {handle: 'footer', title: 'Footer', links: [link('Contact', '/pages/contact'), link('Shipping', '/pages/shipping')]};
const LINE = {id: 1, key: 'k1', quantity: 1, title: 'Pants Down - S / Black', product: PANTS, variant: PANTS.variants[0], variant_id: PANTS.variants[0].id, price: 13777, final_price: 13777, original_price: 13777, line_price: 13777, final_line_price: 13777, original_line_price: 13777, url: PANTS.variants[0].url, image: IMG, options_with_values: [{name: 'Size', value: 'S'}], properties: {}, discounts: [], line_level_discount_allocations: [], selling_plan_allocation: null, unit_price_measurement: null};
const CART = {item_count: 1, items: [LINE], total_price: 13777, original_total_price: 13777, items_subtotal_price: 13777, total_discount: 0, cart_level_discount_applications: [], note: '', currency: {iso_code: 'USD'}, requires_shipping: true, attributes: {}};
/* A customer with two orders and two addresses, and one order of theirs (as tests/theme-r6-account-pages.cjs gives them), cancelled, taxed and sent with tracking. */
const ADDR = {id: 1, name: 'Ana Lima', first_name: 'Ana', last_name: 'Lima', address1: '1 Main St', city: 'Lisbon', zip: '1000', country: 'Portugal', phone: '+351 555', url: '/account/addresses/1'};
const ADDR2 = {...ADDR, id: 2, address1: '9 Side Rd', city: 'Porto', url: '/account/addresses/2'};
const CUSTOMER = {id: 7, first_name: 'Ana', last_name: 'Lima', name: 'Ana Lima', email: 'ana@example.com', orders_count: 2, addresses_count: 2, default_address: ADDR, addresses: [ADDR, ADDR2], tags: [],
  orders: [{name: '#1002', created_at: '2026-03-04', total_price: 4500, financial_status_label: 'Paid', fulfillment_status_label: 'Shipped', customer_url: '/account/orders/2'}, {name: '#1001', created_at: '2026-01-02', total_price: 2500, financial_status_label: 'Paid', fulfillment_status_label: 'Delivered', customer_url: '/account/orders/1'}]};
const FULFILLMENT = {created_at: '2026-03-05', tracking_company: 'CTT', tracking_number: 'RR123', tracking_url: 'https://track.test/RR123', tracking_numbers: ['RR123'], tracking_urls: ['https://track.test/RR123']};
const ORDER = {name: '#1002', created_at: '2026-03-04', cancelled: true, cancelled_at: '2026-03-06', cancel_reason_label: 'Customer changed their mind', financial_status_label: 'Refunded', fulfillment_status_label: 'Shipped', currency: 'USD', total_price: 4700, subtotal_price: 4000, line_items_subtotal_price: 4000, tax_price: 200, shipping_price: 500,
  line_items: [{title: 'Pants Down', sku: 'PD-1', quantity: 2, original_price: 2000, final_price: 2000, final_line_price: 4000, product: PANTS, variant: PANTS.variants[0], url: PANTS.url, properties: {}, fulfillment: FULFILLMENT, line_level_discount_allocations: []}],
  shipping_methods: [{title: 'Standard', price: 500}], tax_lines: [{title: 'VAT', price: 200, rate: 0.05, rate_percentage: 5}], discounts: [], discount_applications: [], fulfillments: [FULFILLMENT], billing_address: ADDR, shipping_address: ADDR, customer_url: '/account/orders/2'};
const GLOBALS = {
  product: PANTS, collection: COLL, collections: {all: COLL, pants: COLL, tees: COLL2}, all_products: {'pants-down': PANTS, 'other-tee': OTHER},
  paginate: {current_page: 1, current_offset: 0, items: 30, page_size: 10, pages: 3, previous: null, next: {title: 'Next', url: '?page=2', is_link: true}, parts: [{title: '1', url: '?page=1', is_link: false}, {title: '2', url: '?page=2', is_link: true}, {title: '3', url: '?page=3', is_link: true}]},
  order: ORDER, cart: CART, blog: BLOG, blogs: {news: BLOG, journal: BLOG2}, article: ARTICLE, page: PAGE, pages: {about: PAGE, care: PAGE2}, customer: CUSTOMER,
  linklists: {'main-menu': MENU, footer: MENU2}, template: {name: 'index', suffix: null},
  /* the home page in the builder (a transparent or pill header is a home page header) */
  request: {design_mode: true, page_type: 'index', host: 'theme.test', path: '/', locale: {iso_code: 'en'}}, page_title: 'Materia', content_for_header: '',
  localization: {available_countries: [], available_languages: [], country: {iso_code: 'US', name: 'United States', currency: {iso_code: 'USD', symbol: '$'}}, language: {iso_code: 'en', endonym_name: 'English'}},
  recommendations: {performed: true, products: [OTHER], products_count: 1}, search: {performed: true, terms: 'pants', results: MANY, results_count: MANY.length, filters: FILTERS, sort_options: SORTS, sort_by: 'relevance', default_sort_by: 'relevance', types: ['product']},
  routes: {all_products_collection_url: '/collections/all', cart_add_url: '/cart/add', cart_url: '/cart', cart_change_url: '/cart/change', root_url: '/', account_url: '/account', account_login_url: '/account/login', account_logout_url: '/account/logout', account_register_url: '/account/register', account_addresses_url: '/account/addresses', search_url: '/search', predictive_search_url: '/search/suggest', product_recommendations_url: '/recommendations/products', collections_url: '/collections'},
};

/* A value to change a setting to, given what it holds now. */
function values(x, cur) {
  const idOf = o => o && (o.id || o.handle || o.src); const other = (a, b) => cur && (cur === a || idOf(cur) === idOf(a)) ? b : a;
  switch (x.type) {
    case 'range': case 'number': { const out = []; if (x.type === 'number') return [cur === 7 ? 3 : 7]; if (cur !== x.min) out.push(x.min); if (cur !== x.max) out.push(x.max); return out; }
    case 'select': case 'radio': case 'text_alignment': return (x.options || [{value: 'left'}, {value: 'center'}, {value: 'right'}]).map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return [cur === '#ab12cd' ? '#12cdab' : '#ab12cd'];
    case 'color_background': return ['linear-gradient(90deg, #ab12cd, #12cdab)'];
    case 'color_scheme': { const ids = Object.keys((JSON.parse(read('config/settings.json')).shopify || {}).color_schemes || {}); return [ids.find(i => i !== cur && i !== 'default') || ids[0]]; }
    case 'text': case 'textarea': {
      if (/(^|_)css$/.test(x.id)) return ['#shopify-section-test .sweep-none, #shopify-section-test > * { outline: 3px solid #ab12cd; }', 'outline: 3px solid #ab12cd; background: #ab12cd;'];
      const w = [cur === 'Edited words' ? 'Other words' : 'Edited words'];
      /* a length, a ratio or a shadow typed as words */
      if (/width|height|size|gap|radius|ratio|shadow|spacing|offset/.test(x.id)) w.push('640', '640px', '2/1', '2:1', '0 6px 18px #ab12cd');
      return w;
    }
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <em>text</em></p>'];
    case 'html': case 'liquid': return ['<p class="sweep-edited">Edited</p>'];
    case 'font_picker': return [{family: 'Verdana', fallback_families: 'sans-serif', style: 'normal', weight: 400}];
    case 'url': return ['/pages/edited'];
    case 'image_picker': return [other(IMG2, IMG)];
    case 'video': return [other(VIDEO2, VIDEO)];
    case 'video_url': return [new VideoUrl('vimeo', '76979871')];
    case 'product': return [other(OTHER, PANTS)];
    case 'collection': return [other(COLL2, COLL)];
    case 'blog': return [other(BLOG2, BLOG)];
    case 'article': return [other(ARTICLE2, ARTICLE)];
    case 'page': return [other(PAGE2, PAGE)];
    case 'link_list': return [other(MENU2, MENU)];
    case 'product_list': return [[OTHER]];
    case 'collection_list': return [[COLL2]];
    default: return [];
  }
}
/* What an empty picker or text holds in the base drawing, so what depends on it is drawn. */
function fill(x, cur) {
  const empty = cur === undefined || cur === null || cur === '';
  if (typeof cur === 'string' && cur && /^(product|collection|blog|article|page|link_list)$/.test(x.type)) return {product: PANTS, collection: COLL, blog: BLOG, article: ARTICLE, page: PAGE, link_list: MENU}[x.type];
  if (!empty && !(Array.isArray(cur) && !cur.length)) return cur;
  switch (x.type) {
    case 'image_picker': return IMG;
    case 'video': return VIDEO;
    case 'video_url': return new VideoUrl('youtube', 'dQw4w9WgXcQ');
    case 'product': return PANTS;
    case 'collection': return COLL;
    case 'blog': return BLOG;
    case 'article': return ARTICLE;
    case 'page': return PAGE;
    case 'link_list': return MENU;
    case 'product_list': return [PANTS, OTHER];
    case 'collection_list': return [COLL, COLL2];
    case 'text': return /top-level (menu )?link/i.test(x.info || '') ? TOP_TITLES[topN++ % TOP_TITLES.length] : 'Sample words';
    case 'textarea': case 'inline_richtext': return /iframe|embed/.test(x.id) ? '<iframe src="https://www.google.com/maps?q=Lisbon&output=embed" width="600" height="450" title="Map"></iframe>' : 'Sample words';
    case 'richtext': return '<p>Sample text with <a href="/pages/about">a link</a></p>';
    case 'url': return '/collections/all';
    default: return cur;
  }
}

/* ------------------------------------------------------------ the sweep */
/* The saved Theme settings, with the body, heading and subheading weights made different so a "use the heading weight" choice can show. */
const THEME = (() => { const t = {...(JSON.parse(read('config/settings.json')).shopify || {})}; Object.assign(t, {body_font_weight: 400, heading_font_weight: 700, subheading_font_weight: 600}); if (!t.store_address) t.store_address = '12 Market Street, Lisbon'; if (!t.menu_hover_style || t.menu_hover_style === 'none') t.menu_hover_style = 'underline'; return t; })();
const SCHEME_IDS = Object.keys(THEME.color_schemes || {});
const def = a => Object.fromEntries((a || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
const visible = x => x.id && !x.hidden && !/\{\{\s*false\s*\}\}/.test(x.visible_if || '');
const clone = o => o === undefined ? o : JSON.parse(JSON.stringify(o, (k, v) => v instanceof VideoUrl ? {__video_url: [v.type, v.id]} : v), (k, v) => v && v.__video_url ? new VideoUrl(...v.__video_url) : v);
const widthsOf = id => /(^|_)mobile($|_)/.test(id) ? [375] : /(^|_)desktop($|_)/.test(id) ? [1366] : /(^|_)tablet($|_)/.test(id) ? [900] : [1366, 375];
/* a class the creator names for their own CSS: a different class in the markup is what it does */
const CLASS_ID = /(^|_)(class|classes|css_class|html_class|custom_class)$/;

function sectionList() {
  return fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib')).map(f => f.slice(0, -9)).filter(n => {
    if (RETIRED.includes(n)) return false;
    const raw = read('sections/' + n + '.storelib');
    if (!raw.startsWith('<template compat="shopify">')) return false;
    try { return !!JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify; } catch (_) { return false; }
  });
}

function presetBlocks(preset) {
  let bl = preset.blocks || [];
  if (!Array.isArray(bl)) bl = (preset.block_order || Object.keys(bl)).map(k => bl[k]);
  return bl.filter(b => b && b.type);
}

/* The base drawing: the first preset over the defaults, one block of every type, pickers and empty words filled. */
function baseState(schema) {
  topN = 0;
  const preset = (schema.presets || [])[0] || {};
  const types = (schema.blocks || []).filter(b => b.type && !b.type.startsWith('@'));
  const blocks = presetBlocks(preset).filter(b => types.some(t => t.type === b.type)).map(b => ({type: b.type, settings: {...def(types.find(t => t.type === b.type).settings), ...(b.settings || {})}}));
  for (const t of types) if (!blocks.some(b => b.type === t.type)) blocks.push({type: t.type, settings: def(t.settings)});
  for (const [t, n] of Object.entries((DATA[schema.__name] || {}).repeat || {})) { const one = blocks.find(b => b.type === t); while (one && blocks.filter(b => b.type === t).length < n) blocks.splice(blocks.indexOf(one) + 1, 0, clone(one)); }
  const settings = {...def(schema.settings), ...(preset.settings || {})};
  const fillAll = (list, s) => { for (const x of list || []) if (x.id) {
    /* accent words are words of the heading they colour; a reference names a real article or product */
    if (x.type === 'text' && /accent/.test(x.id) && !s[x.id]) { const t = String(s.text || s.heading || s.title || s.title_text || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/)[0]; if (t) { s[x.id] = t; continue; } }
    if (x.type === 'text' && /reference|handle/.test(x.id) && !s[x.id]) { s[x.id] = ARTICLE.handle; continue; } const v = x.type === 'link_list' && typeof s[x.id] === 'string' ? (GLOBALS.linklists[s[x.id]] || MENU) : fill(x, s[x.id]); if (v !== undefined) s[x.id] = v; } };
  fillAll(schema.settings, settings);
  Object.assign(settings, (DATA[schema.__name] || {}).settings || {});
  for (const b of blocks) fillAll(types.find(t => t.type === b.type).settings, b.settings);
  return {settings, blocks};
}

/* visible_if, read the way the builder reads it. */
async function shows(x, settings, blockSettings) {
  if (!x.visible_if) return true;
  const expr = x.visible_if.replace(/^\{\{\s*|\s*\}\}$/g, '');
  const e = FP.engine();
  const ctx = {section: {settings}, block: {settings: blockSettings || {}}, settings: THEME};
  try { return (await e.parseAndRender(`{%- if ${expr} -%}1{%- endif -%}`, ctx, {globals: ctx})) === '1'; } catch (_) { return true; }
}
function candidates(x) {
  if (!x) return [];
  switch (x.type) {
    case 'checkbox': return [true, false];
    case 'select': case 'radio': return (x.options || []).map(o => o.value);
    case 'range': return [x.default, x.min, x.max].filter(v => v !== undefined);
    case 'color_scheme': return SCHEME_IDS;
    case 'text': case 'url': case 'textarea': return ['Sample words', ''];
    case 'color': return ['#ab12cd', ''];
    case 'image_picker': return [IMG, ''];
    case 'product': return [PANTS, ''];
    case 'collection': return [COLL, ''];
    case 'video': return [VIDEO, ''];
    case 'video_url': return [new VideoUrl('youtube', 'dQw4w9WgXcQ'), ''];
    case 'link_list': return [MENU, ''];
    default: return [x.default];
  }
}
/* Settings that make x shown, changing as few others as it can. null when nothing does. */
async function satisfy(x, scope, state, list, blockList) {
  const cur = scope === 'section' ? state.settings : state.block;
  if (await shows(x, state.settings, state.block)) return {};
  const refs = [...new Set([...x.visible_if.matchAll(/\b(section|block)\.settings\.(\w+)/g)].map(m => m[1] + '.' + m[2]))];
  const opts = refs.map(r => { const [sc, id] = r.split('.'); return [r, candidates((sc === 'section' ? list : blockList || []).find(y => y.id === id))]; }).filter(([, c]) => c.length);
  const combos = [];
  const walk = (i, acc) => { if (combos.length > 400) return; if (i === opts.length) { combos.push(acc); return; } walk(i + 1, acc); for (const v of opts[i][1]) walk(i + 1, {...acc, [opts[i][0]]: v}); };
  walk(0, {});
  combos.sort((a, b) => Object.keys(a).length - Object.keys(b).length);
  for (const c of combos) {
    const s = {...state.settings}, b = {...(state.block || {})};
    for (const [k, v] of Object.entries(c)) { const [sc, id] = k.split('.'); (sc === 'section' ? s : b)[id] = v; }
    if (await shows(x, s, b)) return c;
  }
  void cur;
  return null;
}

/* Which css files a drawing asks for (render() takes the link tags out). */
const cssSeen = new Set(), jsSeen = new Set();
let WRAP_CLASS = '';
{
  const e = FP.engine();
  e.registerFilter('asset_url', k => { if (/\.css$/.test(k)) cssSeen.add(k); if (/\.js$/.test(k)) jsSeen.add(k); return '/assets/' + k; });
}
async function draw(name, state) {
  const r = await render(name, {uid: 'test', settings: state.settings, blocks: state.blocks, theme: THEME, globals: GLOBALS, editing: true});
  return r.html + '\n<!--scripts-->\n' + r.scripts.join('\n<!--script-->\n');
}
/* A data attribute holding the section's or a block's settings as JSON (the live preview controllers read it) is not a change a visitor sees: it is taken out before the markup is compared. */
const decode = v => v.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let IDS = new Set();
const isDump = v => { if (!/^\s*\{/.test(v)) return false; try { const o = JSON.parse(decode(v)); const k = Object.keys(o); return k.length >= 5 && k.filter(x => IDS.has(x)).length >= k.length * 0.6; } catch (_) { return false; } };
const undump = h => h.replace(/\s(data-[\w-]+)=("([^"]*)"|'([^']*)')/g, (m, n, q, a, b) => isDump(a !== undefined ? a : b) ? ' ' + n + '=""' : m).replace(/(<script type="application\/json"[^>]*>)([\s\S]*?)(<\/script>)/g, (m, o, body, c) => isDump(body) ? o + c : m);
const strip = h => h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '<style></style>').replace(/\s(style|class)="[^"]*"/g, '').replace(/\s(style|class)='[^']*'/g, '');
const hash = s => crypto.createHash('sha1').update(s).digest('hex');

/* The scripts that read a settings JSON attribute of this drawing (by its name or its dataset name), from shopify/assets. */
const JS = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'shopify/assets')).filter(f => f.endsWith('.js') && !/\.min\.js$/.test(f)).map(f => [f, read('shopify/assets/' + f)]));
const LAYOUT_CSS = [...new Set([...read('layout/theme.storelib').matchAll(/'([\w.-]+\.css)' \| asset_url/g)].map(m => m[1]))].filter(f => fs.existsSync(path.join(ROOT, 'shopify/assets', f)) && !/^(rtl|design-mode)\.css$/.test(f));
function readersOf(html) {
  const names = new Set();
  html.replace(/\s(data-[\w-]+)=("([^"]*)"|'([^']*)')/g, (m, n, q, a, b) => { if (isDump(a !== undefined ? a : b)) names.add(n); return m; });
  const out = new Set();
  for (const n of names) { const bare = n.slice(5), camel = bare.replace(/-(\w)/g, (m, c) => c.toUpperCase()); for (const [f, src] of Object.entries(JS)) if (src.includes(n) || src.includes(bare) || src.includes('.' + camel) || src.includes("'" + camel + "'")) out.add(f); }
  return [...out];
}

/* ------------------------------------------------------------ the browser */
const PROPS = ['color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'outlineColor', 'outlineWidth', 'outlineStyle', 'outlineOffset', 'boxShadow', 'textShadow', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'textDecorationLine', 'textDecorationColor', 'whiteSpace', 'webkitLineClamp', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'rowGap', 'columnGap', 'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'display', 'flexDirection', 'flexWrap', 'flexBasis', 'flexGrow', 'justifyContent', 'alignItems', 'alignSelf', 'justifySelf', 'order', 'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'transform', 'translate', 'scale', 'rotate', 'opacity', 'visibility', 'filter', 'backdropFilter', 'mixBlendMode', 'objectFit', 'objectPosition', 'aspectRatio', 'overflow', 'transitionDuration', 'transitionTimingFunction', 'animationName', 'animationDuration', 'animationDelay', 'animationTimingFunction', 'animationIterationCount', 'fill', 'stroke', 'strokeWidth', 'cursor', 'content', 'clipPath', 'scrollSnapType', 'webkitTextStrokeWidth', 'webkitTextStrokeColor', 'accentColor', 'caretColor', 'columnCount', 'textUnderlineOffset', 'verticalAlign', 'boxSizing', 'pointerEvents', 'wordBreak', 'fontVariantCaps', 'textIndent'];
const PSEUDO = ['transitionDuration', 'transitionTimingFunction', 'borderLeftColor', 'borderLeftStyle', 'borderLeftWidth', 'borderTopStyle', 'borderBottomColor', 'borderBottomStyle', 'borderBottomWidth', 'borderRightColor', 'content', 'color', 'backgroundColor', 'backgroundImage', 'width', 'height', 'opacity', 'borderTopColor', 'borderTopWidth', 'transform', 'display', 'boxShadow', 'top', 'left', 'borderTopLeftRadius'];
let layoutHtml = null, liveHtml = null;
/* The real layout with an empty page: its <head> styles and links for the still drawings, and with its scripts too for the live ones. */
async function pageShell(live) {
  if (layoutHtml) return live ? liveHtml : layoutHtml;
  const e = FP.engine({'header-group': '', 'footer-group': '', 'overlay-group': ''});
  const theme = {...THEME, color_schemes: Object.entries(THEME.color_schemes || {}).map(([id, v]) => ({id, settings: v.settings}))};
  const base = {...GLOBALS, settings: theme, request: {host: 'theme.test', locale: {iso_code: 'en'}, page_type: 'index', design_mode: true, path: '/'}, shop: {name: 'Materia Themes', domain: 'theme.test', url: 'https://theme.test', currency: 'USD', money_format: '${{amount}}'}, content_for_header: '', content_for_layout: '<div id="shopify-section-prev" class="shopify-section"><section class="section"><div style="height:40px"></div></section></div><div id="shopify-section-test" class="shopify-section"></div><div id="shopify-section-next" class="shopify-section" style="margin-top:24px"><section class="section"><div style="height:40px"></div></section></div>'};
  const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
  const src = clean(read('layout/theme.storelib').replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, ''));
  let html;
  try { html = await e.parseAndRender(src, base, {globals: base}); } catch (err) { if (process.env.VERBOSE) console.error('layout: ' + err.message); html = `<!doctype html><html><head><style>${THEME_VARS}</style><style>${await themeControls()}</style>${['critical.css', 'theme.css', 'theme-button-contract.css', 'animation.css'].map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('')}</head><body><div id="shopify-section-test" class="shopify-section"></div></body></html>`; }
  html = html.replace(/media="print"\s*onload="[^"]*"/g, '');
  liveHtml = html.replace('<html', '<html class="shopify-design-mode"').replace('</head>', '<script>window.Shopify = window.Shopify || {}; window.Shopify.designMode = true;</script></head>');
  html = html.replace(/<script\b[\s\S]*?<\/script>/g, '');
  html = html.replace('</head>', '<style>*,*::before,*::after{animation-play-state:paused!important;transition-property:none!important}</style><style id="sw-force"></style></head>');
  html = html.replace('<html', '<html class="shopify-design-mode"');
  layoutHtml = html;
  return live ? liveHtml : html;
}
async function openPage(browser, width, live) {
  const ctx = await browser.newContext({viewport: {width, height: 900}, javaScriptEnabled: true});
  const page = await ctx.newPage();
  const shell = await pageShell(live);
  await page.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'theme.test') return r.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return r.fulfill({contentType: 'text/html', body: shell});
    if (u.pathname.startsWith('/assets/')) { const f = path.join(ROOT, 'shopify/assets', path.basename(u.pathname)); if (/\.(css|js)$/.test(f) && fs.existsSync(f)) return r.fulfill({path: f, contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript'}); return r.fulfill({status: 204, body: ''}); }
    if (/\.(png|jpe?g|webp|gif|svg)/.test(u.pathname)) return r.fulfill({contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
    return r.fulfill({status: 204, body: ''});
  });
  await page.goto('http://theme.test/');
  if (live) await page.evaluate(() => { window.Shopify = {designMode: true}; document.body.classList.add('shopify-design-mode'); });
  await page.evaluate(probe, {PROPS, PSEUDO});
  return page;
}
/* Runs in the page: the computed-style probe. */
function probe({PROPS, PSEUDO}) {
    const W = () => document.getElementById('shopify-section-test');
    if (!document.getElementById('sw-force')) { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition-property:none!important}'; document.head.append(st); const f = document.createElement('style'); f.id = 'sw-force'; document.head.append(f); }
    window.__wrapCls = '';
    const loaded = new Set([...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')));
    window.__css = async list => { const add = list.filter(h => !loaded.has(h)); await Promise.all(add.map(h => new Promise(res => { loaded.add(h); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; l.onload = l.onerror = res; document.head.append(l); }))); if (add.length) themeForced = null; };
    let themeForced = null;
    const STATE = /:(hover|focus-visible|focus-within|focus|active)\b/g;
    const forcedOf = sheets => {
      const out = [];
      const walk = (rules, wrap) => { for (const r of rules) {
        if (r instanceof CSSStyleRule) { if (STATE.test(r.selectorText)) { STATE.lastIndex = 0; out.push(wrap(r.selectorText.replace(STATE, '[data-sw-force]') + '{' + r.style.cssText + '}')); } STATE.lastIndex = 0; if (r.cssRules && r.cssRules.length) walk(r.cssRules, t => wrap(r.selectorText.replace(STATE, '[data-sw-force]') + '{' + t + '}')); }
        else if (r instanceof CSSMediaRule) walk(r.cssRules, t => wrap('@media ' + r.conditionText + '{' + t + '}'));
        else if (window.CSSLayerBlockRule && r instanceof CSSLayerBlockRule) walk(r.cssRules, t => wrap('@layer ' + r.name + '{' + t + '}'));
        else if (window.CSSContainerRule && r instanceof CSSContainerRule) walk(r.cssRules, t => wrap('@container ' + r.conditionText + '{' + t + '}'));
        else if (r instanceof CSSSupportsRule) walk(r.cssRules, t => wrap('@supports ' + r.conditionText + '{' + t + '}'));
        else if (r instanceof CSSStyleRule === false && r.cssRules) walk(r.cssRules, wrap);
      } };
      for (const s of sheets) { try { walk(s.cssRules, t => t); } catch (_) {} }
      return out.join('\n');
    };
    /* transitions run to their end (the button contract's transition is !important in a layer, so it cannot be switched off), animations hold their first frame */
    const settleAll = () => { if (document.getAnimations) for (const a of document.getAnimations()) { try { if (window.CSSTransition && a instanceof CSSTransition) a.finish(); else { a.pause(); a.currentTime = 0; } } catch (_) {} } };
    const snap = ref => {
      settleAll();
      const w = W(), out = [];
      /* the section, and the sections before and after it (space between sections) */
      const nb = [w.previousElementSibling, w.nextElementSibling].filter(Boolean).flatMap(n => [n, ...n.querySelectorAll('*')]);
      const els = [w, ...w.querySelectorAll('*'), ...nb].filter(e => !/^(STYLE|SCRIPT|TEMPLATE|LINK|META)$/.test(e.tagName)).slice(0, 4000);
      if (ref && ref.length !== els.length) return {len: els.length};
      for (const el of els) {
        const cs = getComputedStyle(el), row = [el.tagName];
        for (const p of PROPS) row.push(cs[p]);
        for (const ps of ['::before', '::after']) { const b = getComputedStyle(el, ps); if (b.content && b.content !== 'none' && b.content !== 'normal') { row.push(ps); for (const p of PSEUDO) row.push(b[p]); } }
        if (el.matches('input,textarea')) row.push(getComputedStyle(el, '::placeholder').color, el.value || '');
        for (const a of ['href', 'src', 'alt', 'hidden', 'target', 'aria-label', 'aria-hidden', 'placeholder', 'srcset']) if (el.hasAttribute(a)) row.push(a + '=' + el.getAttribute(a));
        let own = ''; for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent; own = own.replace(/\s+/g, ' ').trim(); if (own) row.push('"' + own.slice(0, 200));
        const line = row.join('|');
        if (ref && ref[out.length] !== line) return {at: out.length, line};
        out.push(line);
      }
      return out;
    };
    const kept = new Map();
    /* Draws a, then b, and says where b's computed styles first differ from a's ('' when nothing does). a's styles are kept by key. */
    window.__cmp = (ka, a, b, forced) => {
      const k = ka + (forced ? 'f' : 'n');
      let A = kept.get(k);
      if (!A) { A = window.__snap(a, forced); if (kept.size > 30) kept.clear(); kept.set(k, A); }
      const B = window.__snap(b, forced, A);
      if (Array.isArray(B)) return '';
      if (B.len !== undefined) return 'elements ' + A.length + ' / ' + B.len;
      const x = A[B.at].split('|'), y = B.line.split('|'), j = x.findIndex((v, n) => v !== y[n]);
      return x[0] + ' ' + (PROPS[j - 1] || 'pseudo') + ': ' + x[j] + ' / ' + y[j];
    };
    window.__snapNow = forced => window.__snap(null, forced);
    /* The builder's redraw: the new markup in place, the section's inline scripts run, storelib:section-load fired; the scripts it needs are loaded the first time. */
    const have = new Set();
    window.__run = async (html, inline, files, cls, forced) => {
      const w = W();
      w.innerHTML = html; w.className = 'shopify-section ' + cls;
      for (const f of files) if (!have.has(f)) { have.add(f); await new Promise(res => { const sc = document.createElement('script'); sc.src = '/assets/' + f; sc.onload = sc.onerror = res; document.body.append(sc); }); }
      for (const body of inline) { const sc = document.createElement('script'); sc.textContent = body; try { document.body.append(sc); } catch (_) {} sc.remove(); }
      w.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 'test'}}));
      document.dispatchEvent(new CustomEvent('shopify:section:load', {detail: {sectionId: 'test'}}));
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await Promise.race([Promise.all([...w.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 400))]);
      await new Promise(r => setTimeout(r, 80));
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return window.__snapNow(!!forced);
    };
    window.__snap = (html, forced, ref) => {
      const w = W();
      if (html !== null) { w.innerHTML = html; w.className = 'shopify-section ' + window.__wrapCls; }
      const f = document.getElementById('sw-force');
      if (forced) {
        if (themeForced === null) themeForced = forcedOf([...document.styleSheets].filter(s => !(s.ownerNode && w.contains(s.ownerNode)) && s.ownerNode !== f));
        f.textContent = themeForced + '\n' + forcedOf([...document.styleSheets].filter(s => s.ownerNode && w.contains(s.ownerNode)));
        for (const el of w.querySelectorAll('*')) el.setAttribute('data-sw-force', '');
      } else f.textContent = '';
      return snap(ref);
    };
}
async function compare(page, A, B, forced) {
  await page.evaluate(({list, cls}) => { window.__wrapCls = cls; return window.__css(list); }, {list: [...new Set([...LAYOUT_CSS, ...A.css, ...B.css])].map(c => '/assets/' + c), cls: WRAP_CLASS});
  const body = h => h.split('\n<!--scripts-->\n')[0];
  return page.evaluate(({ka, a, b, forced}) => window.__cmp(ka, a, b, forced), {ka: hash(A.html), a: body(A.html), b: body(B.html), forced});
}

/* ------------------------------------------------------------ one section */
async function sweepSection(name, pages) {
  const {schema} = schemaOf(name);
  const out = [];
  IDS = new Set([...(schema.settings || []), ...(schema.blocks || []).flatMap(b => b.settings || [])].filter(x => x.id).map(x => x.id));
  schema.__name = name;
  const full = baseState(schema);
  const presetCount = presetBlocks((schema.presets || [])[0] || {}).filter(b => (schema.blocks || []).some(t => t.type === b.type)).length;
  const types = (schema.blocks || []).filter(b => b.type && !b.type.startsWith('@'));
  const items = [];
  for (const x of schema.settings || []) if (visible(x)) items.push({scope: 'section', x});
  for (const t of types) { const n = full.blocks.findIndex(b => b.type === t.type); for (const x of t.settings || []) if (visible(x)) items.push({scope: t.type, n, x, list: t.settings}); }
  const drawn = new Map();
  const drawState = async st => { const k = hash(JSON.stringify(st)); if (!drawn.has(k)) { cssSeen.clear(); jsSeen.clear(); let h; try { h = await draw(name, st); } catch (err) { h = {error: String(err.message || err).split('\n')[0].slice(0, 200)}; } drawn.set(k, {html: h, css: [...cssSeen], js: [...jsSeen], st: clone(st)}); if (drawn.size > 60) drawn.delete(drawn.keys().next().value); } return drawn.get(k); };
  WRAP_CLASS = schema.class || '';
  /* Only the settings JSON the section's scripts read changed: both drawn with the section's scripts running (tests/media-fixture.cjs mount), compared after they ran. null when the first drawing is not stable. */
  const ran = new Map();
  let lastUnstable = '';
  async function runSnap(D, w, check, forced) {
    const k = w + (forced ? 'f' : 'n') + hash(D.html);
    if (ran.has(k)) return ran.get(k);
    const page = pages['live' + w];
    const [body, scripts] = D.html.split('\n<!--scripts-->\n');
    const once = async () => {
      await page.evaluate(list => window.__css(list), [...new Set([...LAYOUT_CSS, ...D.css])].map(c => '/assets/' + c));
      return page.evaluate(({body, inline, files, cls, forced}) => window.__run(body, inline, files, cls, forced), {forced: !!forced, body, inline: scripts ? scripts.split('\n<!--script-->\n') : [], files: [...new Set([...D.js, ...readersOf(D.html)])], cls: WRAP_CLASS});
    };
    let v = await once();
    if (check) { let again = await once(); if (JSON.stringify(again) !== JSON.stringify(v)) { v = again; again = await once(); } const i = again.findIndex((x, n) => x !== v[n]); if (again.length !== v.length || i >= 0) { lastUnstable = again.length !== v.length ? 'elements ' + v.length + ' / ' + again.length : (() => { const x = v[i].split('|'), y = again[i].split('|'), j = x.findIndex((q, n) => q !== y[n]); return x[0] + ' ' + (PROPS[j - 1] || 'more') + ': ' + x[j] + ' / ' + y[j]; })(); v = null; } }
    if (ran.size > 40) ran.clear();
    ran.set(k, v);
    return v;
  }
  async function runtime(A, B, id) {
    let d = '';
    for (const w of widthsOf(id)) for (const forced of [false, true]) {
      const a = await runSnap(A, w, true, forced);
      if (a === null) return null;
      const b = await runSnap(B, w, false, forced);
      if (b === null) return null;
      if (a.length !== b.length) return 'elements ' + a.length + ' / ' + b.length;
      const i = a.findIndex((x, n) => x !== b[n]);
      if (i >= 0) { const x = a[i].split('|'), y = b[i].split('|'), j = x.findIndex((v, n) => v !== y[n]); return x[0] + ' ' + (PROPS[j - 1] || 'more') + ': ' + x[j] + ' / ' + y[j]; }
    }
    return d;
  }
  /* First drawn light (a section setting with the preset's blocks, a block setting with its block alone), then, when that shows nothing, with every block. */
  for (const it of items) {
    if (process.env.ONLY && !process.env.ONLY.split(",").includes((it.scope === "section" ? "" : it.scope + ".") + it.x.id)) continue;
    const extra = ((DATA[name] || {}).withBlocks || []).filter(t => t !== it.scope).map(t => full.blocks.find(b => b.type === t)).filter(Boolean);
    const light = it.scope === 'section' ? {settings: full.settings, blocks: (DATA[name] || {}).repeat ? full.blocks : full.blocks.slice(0, presetCount)} : {settings: full.settings, blocks: [full.blocks[it.n], ...extra]};
    let r = await one({...it, n: it.scope === 'section' ? undefined : 0}, light);
    if (r.status !== 'pass' && (light.blocks.length !== full.blocks.length)) r = await one(it, full);
    out.push(r);
  }
  return out;
  async function one(it, base) {
    const {x} = it, key = (it.scope === 'section' ? '' : it.scope + '.') + x.id;
    const st0 = clone(base);
    const blockS = it.scope === 'section' ? null : st0.blocks[it.n].settings;
    const pre = await satisfy(x, it.scope, {settings: st0.settings, block: blockS}, schema.settings, it.list);
    if (pre === null) return {key, type: x.type, status: 'hidden', detail: 'its visible_if is never true: ' + x.visible_if};
    for (const [k, v] of Object.entries(pre)) { const [sc, id] = k.split('.'); (sc === 'section' ? st0.settings : blockS)[id] = v; }
    const target = it.scope === 'section' ? st0.settings : blockS;
    const vals = values(x, target[x.id]);
    if (!vals.length) return {key, type: x.type, status: 'skip', detail: 'no value to try for type ' + x.type};
    const A = await drawState(st0);
    if (A.html.error) return {key, type: x.type, status: 'error', detail: 'base: ' + A.html.error, pre};
    const res = [];
    for (const v of vals) {
      const st = clone(st0); (it.scope === 'section' ? st.settings : st.blocks[it.n].settings)[x.id] = v;
      const B = await drawState(st);
      const label = typeof v === 'object' && v ? (v.handle || v.id || v.family || (Array.isArray(v) ? 'list' : 'object')) : JSON.stringify(v);
      if (B.html.error) { res.push({v: label, r: 'error', d: B.html.error}); continue; }
      if (process.env.DUMP) { fs.writeFileSync(path.join(process.env.DUMP, 'A.html'), A.html); fs.writeFileSync(path.join(process.env.DUMP, 'B.html'), B.html); }
      if (A.html === B.html) { res.push({v: label, r: 'same'}); continue; }
      const ua = undump(A.html), ub = undump(B.html);
      if (strip(ua) !== strip(ub) || CLASS_ID.test(x.id)) { res.push({v: label, r: 'markup'}); continue; }
      if (A.html.split('\n<!--scripts-->\n')[1] !== B.html.split('\n<!--scripts-->\n')[1]) { res.push({v: label, r: 'markup'}); continue; }
      /* one value seen working is enough for the costly checks */
      if (res.some(r => /^(style|state|script|behaviour)$/.test(r.r))) { res.push({v: label, r: 'unchecked'}); continue; }
      if (ua === ub) {
        const d = await runtime(A, B, x.id);
        if (d === null) { res.push({v: label, r: 'unstable', d: lastUnstable}); continue; }
        if (d) { res.push({v: label, r: 'script', d}); continue; }
        /* a timer, a loop, a pause: behaviour the section's script reads from that JSON and no still picture shows */
        const reads = readersOf(A.html).filter(f => new RegExp('[.\'"\\[]' + x.id + '\\b|\\b' + x.id.replace(/_(\w)/g, (m, c) => c.toUpperCase()) + '\\b').test(JS[f]));
        res.push({v: label, r: reads.length ? 'behaviour' : 'dump', d: reads.join(' ')});
        continue;
      }
      let r = 'nostyle', d = '';
      for (const w of widthsOf(x.id)) {
        d = await compare(pages[w], A, B, false);
        if (d) { r = 'style'; break; }
        d = await compare(pages[w], A, B, true);
        if (d) { r = 'state'; break; }
      }
      /* the theme's scripts may paint what the markup only declares */
      if (r === 'nostyle') { const e2 = await runtime(A, B, x.id); if (e2) { r = 'script'; d = e2; } }
      res.push({v: label, r, d});
    }
    const GOOD = /^(markup|style|state|gate|script|behaviour)$/;
    if (!res.some(r => GOOD.test(r.r) || r.r === 'error')) {
      /* A switch other settings hang on (their visible_if reads it): flipped with those settings changed too. */
      const list = it.scope === 'section' ? schema.settings : it.list;
      const ref = new RegExp('\\b' + (it.scope === 'section' ? 'section' : 'block') + '\\.settings\\.' + x.id + '\\b');
      const deps = (list || []).filter(y => visible(y) && y !== x && ref.test(y.visible_if || ''));
      if (deps.length) {
        for (const v of vals) {
          const on = clone(st0), off = clone(st0);
          const T = st => it.scope === 'section' ? st.settings : st.blocks[it.n].settings;
          off && (T(off)[x.id] = v);
          const g = (await shows(deps[0], T(on), T(on))) ? on : off;
          for (const y of deps) { const yv = values(y, T(g)[y.id])[0]; if (yv !== undefined) { T(on)[y.id] = yv; T(off)[y.id] = yv; } }
          const P = await drawState(on), Q = await drawState(off);
          if (P.html.error || Q.html.error) continue;
          const up = undump(P.html), uq = undump(Q.html);
          let r = P.html === Q.html ? 'same' : up === uq ? ((await runtime(P, Q, x.id)) ? 'gate' : 'same') : strip(up) !== strip(uq) ? 'gate' : '';
          if (!r) { r = 'same'; for (const w of widthsOf(x.id)) { if (await compare(pages[w], P, Q, false) || await compare(pages[w], P, Q, true)) { r = 'gate'; break; } } }
          if (r === 'gate') { res.push({v: 'with ' + deps.length + ' dependent settings changed', r}); break; }
        }
      }
    }
    const good = res.filter(r => GOOD.test(r.r));
    const status = res.some(r => r.r === 'error') ? 'error' : good.length ? 'pass' : res.some(r => r.r === 'unstable') ? 'unstable' : 'dead';
    const deadOptions = (x.type === 'select' || x.type === 'radio') && good.length ? res.filter(r => !GOOD.test(r.r) && r.r !== 'unchecked').map(r => r.v) : [];
    return {key, type: x.type, status, pre: Object.keys(pre).length ? pre : undefined, how: [...new Set(good.map(r => r.r))].join(','), deadOptions: deadOptions.length ? deadOptions : undefined, detail: res.filter(r => r.r === 'error' || (r.r === 'unstable' && !good.length)).map(r => r.v + ': ' + r.d).join('; ') || undefined, tried: res.map(r => r.v + '=' + r.r).join(' ')};
  }
}

/* ------------------------------------------------------------ workers */
async function worker() {
  const {launch} = require('./media-fixture.cjs');
  const browser = await launch();
  const pages = {1366: await openPage(browser, 1366), 375: await openPage(browser, 375), 900: await openPage(browser, 900), live1366: await openPage(browser, 1366, true), live375: await openPage(browser, 375, true), live900: await openPage(browser, 900, true), browser};
  process.on('message', async m => {
    if (m.done) { await browser.close(); process.exit(0); }
    const t = Date.now();
    let res;
    try { res = await sweepSection(m.name, pages); } catch (err) { res = [{key: '(section)', status: 'error', detail: String(err.stack || err).slice(0, 300)}]; }
    process.send({name: m.name, res, ms: Date.now() - t});
  });
  process.send({ready: true});
}

if (process.env.SWEEP_WORKER) {
  worker().catch(err => { console.error(err); process.exit(1); });
  return;
}
module.exports = {values, fill, GLOBALS, sweepSection, sectionList, baseState, openPage};
if (require.main !== module) return;

(async () => {
  const only = process.argv.slice(2);
  const names = sectionList().filter(n => !only.length || only.includes(n));
  const size = n => fs.statSync(path.join(ROOT, 'sections', n + '.storelib')).size;
  const jobs = Math.max(1, Math.min(+(process.env.JOBS || 4), names.length));
  const results = {};
  /* CACHE=<dir> keeps each section's result there and reuses it while the section file and this test are unchanged (snippets are not part of the key: leave CACHE out for a clean run). */
  const cache = process.env.CACHE, me = SWEEP_VERSION;
  const keyOf = n => hash(me + read('sections/' + n + '.storelib'));
  const queue = [];
  for (const n of names.sort((a, b) => size(b) - size(a))) {
    const f = cache && path.join(cache, n + '.json');
    if (f && fs.existsSync(f)) { const c = JSON.parse(fs.readFileSync(f, 'utf8')); if (c.key === keyOf(n)) { results[n] = c.res; continue; } }
    queue.push(n);
  }
  if (cache) fs.mkdirSync(cache, {recursive: true});
  const t0 = Date.now();
  await Promise.all(Array.from({length: Math.min(jobs, queue.length)}, () => new Promise((res, rej) => {
    const c = fork(__filename, [], {env: {...process.env, SWEEP_WORKER: '1'}});
    const next = () => { const n = queue.shift(); if (n) c.send({name: n}); else c.send({done: true}); };
    c.on('message', m => {
      if (m.name) { results[m.name] = m.res; if (cache) fs.writeFileSync(path.join(cache, m.name + '.json'), JSON.stringify({key: keyOf(m.name), res: m.res})); if (process.env.VERBOSE) console.error(m.name, m.res.length, m.ms + 'ms', queue.length + ' left'); }
      next();
    });
    c.on('exit', code => code ? rej(new Error('worker exited ' + code)) : res());
  })));
  const all = Object.entries(results).sort(([a], [b]) => a.localeCompare(b));
  if (process.env.OUT) fs.writeFileSync(path.join(process.env.OUT, 'sweep.json'), JSON.stringify(Object.fromEntries(all), null, 1));
  let checked = 0, passing = 0, allowed = 0, owned = 0;
  const bad = [], known = {};
  const why = (n, key) => { const k = n + ':' + key; const hit = ALLOW.find(([re]) => re.test(k)); return hit && hit[1]; };
  for (const [n, res] of all) {
    const rows = [];
    for (const r of res) {
      if (r.key === '(section)') { bad.push(n + ': ' + r.detail); continue; }
      checked++;
      if (r.status === 'pass') { passing++; continue; }
      const line = '  ' + r.key + ' (' + r.type + '): ' + r.status + (r.detail ? ' - ' + r.detail : '') + (r.pre ? ' with ' + JSON.stringify(r.pre).slice(0, 120) : '');
      if (why(n, r.key)) { allowed++; continue; }
      /* a section another change owns right now: listed, not failed */
      if (OWNED.includes(n)) { owned++; (known[n] = known[n] || []).push(line); continue; }
      rows.push(line);
    }
    if (rows.length) bad.push(n + '\n' + rows.join('\n'));
  }
  console.log(`${names.length} sections, ${checked} settings checked, ${passing} change the section, ${allowed} allowed with a reason, ${owned} in sections owned elsewhere (listed), ${checked - passing - allowed - owned} change nothing (${Math.round((Date.now() - t0) / 1000)}s)`);
  if (process.env.VERBOSE || process.env.SHOW_OWNED) for (const [n, rows] of Object.entries(known)) console.log('owned elsewhere: ' + n + '\n' + rows.join('\n'));
  if (bad.length) { console.log('Settings that change nothing, by section:\n' + bad.join('\n')); process.exitCode = 1; }
})().catch(err => { console.error(err); process.exitCode = 1; });

/* Settings that stay although the sweep sees no change, each with why: [pattern on "section:key", reason]. */
var ALLOW = [
  [/:([\w-]+\.)?(error_message|success_message|error_text|success_text)$/, 'Shown only after the form is sent (form.errors or form.posted_successfully), which a first drawing never has.'],
  [/:structured_data$/, 'Prints JSON-LD for search engines; render() leaves application/ld+json out of the drawing.'],
  [/:([\w-]+\.)?(reveal|scroll_animation|pause_on_hover)$/, 'Storefront motion: the builder draws every section without its entrance or scroll motion, and the sweep holds animations on their first frame (tests/theme-animations.cjs runs them).'],
  [/^custom-colors:/, 'Paints the colour swatches of product cards and filters in other sections, not this one (tests/theme-r6-footer-lib.cjs draws them).'],
  [/^(countdown-promo-popup|coupon-promotion-newsletter-popup|spin-wheel-popup):overlay_opacity$/, 'The overlay is drawn only while the popup is open.'],
  [/^main-search:sort_/, 'Fallback sort labels, read only when the store gives no sort options (snippets/facets-toolbar).'],
  [/^(main-account:(no_orders_text|shop_link_label)|main-addresses:empty_text|collection-tab:empty_state_(font_size|text_color))$/, 'Empty state: shown only when there is nothing to list (no orders, no addresses, a collection with no products).'],
  [/^(hotspot-image-product-2:sold_out_label|hotspotsection:sold_out_text|page-compare:sold_out_label|shop-the-look:sold_out_label)$/, 'Shown only for a sold-out product.'],
  [/^hotspotsection:from_text$/, 'Shown only for a product whose variants have different prices.'],
  [/^(blog-posts|main-blog|main-collection-product|main-list-collections|main-search):items_to_show$/, 'The page size given to {% paginate %} (or a load more step), which the fixture does not cut into pages.'],
  [/^main-blog:blog_select$/, 'A blog handle typed as text (the builder has no blog picker): the sweep\'s words name no blog, so the blog being read shows; tests/theme-r6-collection-pages-blog.cjs types a real handle.'],
  [/^main-collection-product:popular_product\./, 'The sidebar looks its collection up as collections[handle] and shows only in the vertical filter layout with products; tests/theme-r6-collection-pages-products.cjs draws it.'],
  [/^breadcrumb:next_prev$/, 'Previous and next product links, drawn only on a product page reached from a collection.'],
  [/^(products-listing:(show_vendor|show_rating|show_short_description|show_add_to_cart)|related-products:(show_vendor|show_rating|show_add_to_cart))$/, 'A product card shows these only when Theme settings > Product card turns them on too (off in the saved theme); Storelib products have no vendor today.'],
  [/^related-products:custom_products$/, 'The cards are fetched by the section script (product recommendations) after the first paint, which the fixture does not serve.'],
  [/^(products-carousel|social-shop-grid):pagination_position$/, 'Not confirmed by the sweep: positions the slider dots Swiper draws at runtime; the dots row shows no move in its drawing.'],
  [/^scroll-text-banner:/, 'Scroll-driven reveal: in the builder the banner is drawn unpinned and fully shown (data-tx-editing), so its stage, speed and dimming act on the storefront only.'],
  [/^scrolling-collection:toggle_active_(bg|color)$/, 'Colours of the pause toggle while it is pressed, a state set by a click.'],
  [/^(scrolling-text:(edge_fade|separator_color|separator_size)|marquee-bar:marquee\.svg_icon_(color|size_desktop|size_mobile))$/, 'Not confirmed by the sweep: parts of a moving marquee (separators, faded edges, an uploaded SVG icon) show no change in its drawing.'],
  [/^(promonewsletterpopup-2:input_placeholder_color|promotional-popup:(form\.input_placeholder_color|form\.input_pad_y|form\.error_color|editor_preview_bg)|promotionalpopup2:form\.input_placeholder)$/, 'Not confirmed by the sweep: inside a popup it does not open (the closed form\'s placeholder, error and field padding, the builder preview backdrop).'],
  [/^promonewsletterpopup-2:form\.(input_size_desktop|input_size_mobile|input_weight)$/, 'Used with the section\'s Theme fields off, as its info says; the popup schemas keep a visible_if inside its own block (tests/theme-popups.cjs), so it cannot read the section.'],
  [/^theme-footer:enable_country_selector$/, 'The country selector appears only when the store sells in more than one country; the fixture store has none (available_countries is empty).'],
  [/^theme-footer:store_info\.show_logo$/, 'Draws the store logo only when the block has no image of its own (the sweep\'s block has one); tests/theme-r6-footer.cjs draws it without.'],
  [/^featured-product2:description\.(use_product_description|truncate_chars)$/, 'The product\'s description stands in only while the block\'s own text is empty (the sweep fills it); tests/theme-products-b.cjs draws it empty.'],
  [/^collection-list2:media_(left|right)\.(video_url|poster)$/, 'A video address and its poster, used only while no video file is picked (the sweep picks one); tests/theme-collections-r4.cjs draws them without.'],
  [/^products-carousel:video_url$/, 'A video address for the banner, used only while no video file is picked (the sweep picks one); tests/theme-products-b.cjs draws it without.'],
  [/^size-chart-popup:use_product_chart$/, 'Uses the product\'s own size chart (Products > Size charts), which the sweep\'s product does not have.'],
  [/^theme-header:pill_glass\.header_pill_border_(width|color)$/, 'The pill border needs both a width above 0 and a colour (snippet: pill_border_w > 0 and pill_border_color != blank); tests/theme-r5-header.cjs sets both.'],
  [/^theme-header:(menu_dropdown_tinted_bg|menu_badges\.badge_border|pill_glass\.glass_text_color)$/, 'Header parts the layout draws around the section: the tinted dropdown and glass text colour apply with the Pill and glass block on (a section setting cannot read a block), the badge border with an outlined badge style; tests/theme-header-*.cjs check them.'],
  /* Open: no change seen and no cause found in this round; each needs a closer look (data the fixture may lack, or a real bug). */
  [/^(before-and-after-image:pair_gap|benefits-bar-pro:icon_stroke|benefits2:feature\.svg_icon_size|image-with-text-benefits:text_max_width|image-with-text-steps:marker_text_color|steps:marker_text_color|page-404:icon_color|product-set:set\.products|product-showcase:slide\.product|subcollection-list:font_weight|video:link_color|wavyrichtextbanner:(text|buttons)\.enable_custom_style)$/, 'OPEN: no change seen by the sweep and no cause found yet.'],
];
/* Sections other changes own right now: what the sweep finds there is listed (VERBOSE or SHOW_OWNED=1), not failed. */
var OWNED = ['banner3', 'hero-benefits', 'featured-blog-header', 'collection-list', 'comparison-table', 'testimonials', 'testimonials3', 'testimonials4', 'testimonial2', 'testimonial-video', 'testimonial-logos', 'testimon4', 'fake-order', 'announcement-bar-pro-4', 'hero-section-pro', 'announcement-bar-basic', 'hero-image1', 'hero-pro-scrolling', 'heroproduct1', 'hero-product3', 'dynamic-pricing', 'promotion-popup', 'promotional-image-popup', 'slideshow', 'number-stats', 'image-with-text-stats', 'progress-benefits', 'progress-circles', 'stat-counter', 'stat-counter-pro', 'main-product', 'featured-product', 'main-cart-items'];
