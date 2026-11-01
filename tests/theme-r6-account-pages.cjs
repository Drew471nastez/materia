/* Round 6, account and page group: the signed in pages and the small
   pieces. Account (main-account), Addresses (main-addresses), Order
   (main-order), Sign in popup (login-popup), Password header and footer
   (main-password-header, main-password-footer) and Form message
   (form-message), run by shopify/assets/live-account-pages.js. The shared
   checks are in tests/theme-r6-account-lib.cjs; this file adds: the
   customer's real orders and details (Storelib's customer object), log out
   as a form posted to Storelib's logout address, addresses listed and not
   edited (checkout saves them), the order's lines and totals in the store's
   money, the popup's forms (customer_login and create_customer with an
   email and no password, the tab hooks assets/theme.js reads), the password
   footer's owner link and social links (44px), and the toast wrappers
   theme.js copies from Form message.
   Saved: the password footer in shopify/config/settings_data.json (the
   Shopify only "powered by" line is now the owner sign in link).

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-account-pages.cjs */
const fs = require('fs'), path = require('path');
const L = require('./theme-r6-account-lib.cjs');
const {ok, eq, FONT} = L;
const ROUTES = {root_url: '/', account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/login', account_logout_url: '/account/logout', account_addresses_url: '/account/addresses', all_products_collection_url: '/collections/all', wishlist_url: '/wishlist'};
const ADDR = {name: 'Ana Lima', address1: '1 Main St', city: 'Lisbon', zip: '1000', country: 'Portugal', phone: '+351 555'};
const CUSTOMER = {name: 'Ana Lima', first_name: 'Ana', email: 'ana@store.test', orders_count: 2, addresses_count: 2, default_address: ADDR, addresses: [ADDR, {name: 'Ana Lima', address1: '9 Side Rd', city: 'Porto', country: 'Portugal'}],
  orders: [{name: '#1002', created_at: '2026-03-04', total_price: 4500, fulfillment_status_label: 'Shipped', customer_url: '/account/orders/2'}, {name: '#1001', created_at: '2026-01-02', total_price: 2500, fulfillment_status_label: 'Delivered', customer_url: '/account/orders/1'}]};
const ORDER = {name: '#1002', created_at: '2026-03-04', financial_status_label: 'Paid', fulfillment_status_label: 'Shipped', currency: 'EUR', total_price: 4500, line_items_subtotal_price: 4000,
  line_items: [{title: 'Linen pants', sku: 'LP-1', quantity: 2, original_price: 2000, final_price: 2000, final_line_price: 4000, product: {url: '/products/linen-pants'}, properties: {}}],
  shipping_methods: [{title: 'Standard', price: 500}], tax_lines: [], discounts: [], billing_address: ADDR, shipping_address: ADDR};
const G = {routes: ROUTES, shop: {name: 'Materia Themes'}, customer: CUSTOMER, order: ORDER};
const SAME = {375: [['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width'], ['container', 'full_width'], ['fluid_container', 'full_width'], ['container-fluid', 'strecth-width'], ['container', 'container-fluid'], ['container', 'strecth-width'], ['container', 'full-width'], ['container-fluid', 'full-width'], ['strecth-width', 'full-width']], 1366: []};
const NOOP = {375: ['reset_spacing', 'padding_top', 'padding_bottom'], 1366: ['reset_spacing']};
const head = sel => async (t, {ok, css, tag}) => {
  ok(/Georgia/.test(await css(sel, 'fontFamily')) && await css(sel, 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme font and colour');
  ok(/Arial/.test(await css('[data-ap-root]', 'fontFamily')), tag + ': the theme body font');
};
const fonts = sel => ({name: 'section fonts', section: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: FONT}, checks: [[sel, 'fontFamily', /Courier New/], ['[data-ap-root]', 'fontFamily', /Verdana/]], off: {section: {enable_custom_fonts: false}}});
const colours = sel => ({name: 'custom colours', section: {enable_custom_style: true, heading_color: '#00ff00', text_color: '#ff00ff'}, checks: [[sel, 'color', 'rgb(0, 255, 0)'], ['[data-ap-root]', 'color', 'rgb(255, 0, 255)']], off: {section: {enable_custom_style: false}}});
const page = (name, extra) => L.suite(name, {mountOpts: {globals: G}, noop: NOOP, same: SAME, twoInstances: {padding_top: 90}, theme: head('h1'), priority: [fonts('h1'), colours('h1')], ...extra});

(async () => {
  const results = [];
  const nav = async (browser, name) => {
    const t = await L.mount(browser, name, {assets: L.ASSETS, width: 375, editing: false, globals: G});
    const n = await t.page.evaluate(() => { const W = document.getElementById('shopify-section-test'), f = W.querySelector('.ap-nav form'); return {links: [...W.querySelectorAll('.ap-nav a')].map(a => a.getAttribute('href')), form: f && {method: f.method, action: f.getAttribute('action'), native: f.dataset.storelibForm, btn: f.querySelector('button[type=submit]').getBoundingClientRect().height}, current: W.querySelector('.ap-nav [aria-current]')?.getAttribute('href')}; });
    eq(n.links, ['/account', '/account/addresses', '/wishlist'], name + ': the account menu links');
    ok(n.form && n.form.method === 'post' && n.form.action === '/account/logout' && n.form.native === 'native' && n.form.btn >= 44, name + ': log out posts to Storelib ' + JSON.stringify(n.form));
    ok(await t.noOverflow(), name + ': no sideways scroll at 375 with the menu');
    return t;
  };
  results.push(['main-account', await page('main-account', {
    noop: {375: ['reset_spacing', 'padding_top', 'padding_bottom', 'pagination'], 1366: ['reset_spacing', 'pagination']},
    skip: ['no_orders_text', 'shop_link_label'],
    extra: async browser => {
      const t = await nav(browser, 'main-account');
      const rows = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test tbody tr')].map(r => [...r.cells].map(c => c.textContent.trim())));
      eq(rows, [['#1002', '2026-03-04', 'Shipped', 'R$45.00'], ['#1001', '2026-01-02', 'Delivered', 'R$25.00']], 'main-account: the orders in the store money');
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .ap-account__details').textContent.includes('ana@store.test')), 'main-account: the customer email');
      await t.page.close();
      const e = await L.mount(browser, 'main-account', {assets: L.ASSETS, width: 375, globals: {...G, customer: {...CUSTOMER, orders: [], orders_count: 0}}});
      ok(await e.page.evaluate(() => /not placed/.test(document.querySelector('#shopify-section-test .ap-account__none').textContent)), 'main-account: no orders text');
      await e.emit({no_orders_text: 'Nothing yet.', shop_link_label: 'Shop now'}); await L.frames(e.page);
      ok(await e.page.evaluate(() => { const n = document.querySelector('#shopify-section-test .ap-account__none'); return n.querySelector('p').textContent === 'Nothing yet.' && n.querySelector('a').textContent === 'Shop now'; }), 'main-account: no orders text and link live');
      eq(e.errors, [], 'main-account: no orders, no errors');
      await e.page.close();
    },
  })]);
  results.push(['main-addresses', await page('main-addresses', {
    skip: ['empty_text'],
    extra: async browser => {
      const t = await nav(browser, 'main-addresses');
      const a = await t.page.evaluate(() => ({cards: document.querySelectorAll('#shopify-section-test .ap-addr__card').length, def: document.querySelectorAll('#shopify-section-test .ap-addr__default').length, forms: document.querySelectorAll('#shopify-section-test form:not(.ap-nav__form)').length}));
      eq(a, {cards: 2, def: 1, forms: 0}, 'main-addresses: every saved address listed, the default marked, nothing to edit');
      await t.page.close();
      const e = await L.mount(browser, 'main-addresses', {assets: L.ASSETS, width: 375, globals: {...G, customer: {...CUSTOMER, addresses: [], default_address: null}}});
      await e.emit({empty_text: 'None yet.'}); await L.frames(e.page);
      ok(await e.page.evaluate(() => document.querySelector('#shopify-section-test .ap-addr__none').textContent === 'None yet.'), 'main-addresses: no addresses text live');
      await e.page.close();
    },
  })]);
  results.push(['main-order', await page('main-order', {
    skip: ['cancelled_label', 'track_label', 'tax_label'],
    extra: async browser => {
      const t = await L.mount(browser, 'main-order', {assets: L.ASSETS, width: 375, editing: false, globals: G});
      const o = await t.page.evaluate(() => ({h: document.querySelector('#shopify-section-test h1').textContent.replace(/\s+/g, ' ').trim(), line: [...document.querySelector('#shopify-section-test tbody tr').cells].map(c => c.textContent.replace(/\s+/g, ' ').trim()), foot: [...document.querySelectorAll('#shopify-section-test tfoot tr')].map(r => r.textContent.replace(/\s+/g, ''))}));
      eq(o.h, 'Order #1002', 'main-order: the order number');
      eq(o.line, ['Linen pantsLP-1', 'R$20.00', '2', 'R$40.00'], 'main-order: the line in the store money');
      eq(o.foot, ['SubtotalR$40.00', 'Shipping(Standard)R$5.00', 'TotalR$45.00EUR'], 'main-order: the totals');
      ok(await t.noOverflow(), 'main-order: the table scrolls inside its column at 375');
      await t.page.close();
    },
  })]);
  results.push(['login-popup', await L.suite('login-popup', {
    mountOpts: {globals: G},
    twoInstances: {login_title: 'Only in a'},
    skip: ['error_message'],
    theme: async (t, {ok, css, tag}) => {
      ok(/Georgia/.test(await css('h2', 'fontFamily')) && await css('h2', 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme');
      ok(await css('button[type=submit]', 'backgroundColor') === 'rgb(18, 52, 86)', tag + ': the theme button');
    },
    priority: [fonts('h2'), {name: 'custom colours', section: {enable_custom_style: true, heading_color: '#00ff00', text_color: '#ff00ff'}, checks: [['h2', 'color', 'rgb(0, 255, 0)'], ['.ap__t', 'color', 'rgb(255, 0, 255)']], off: {section: {enable_custom_style: false}}}],
    vals: {register_title: ['Join'], register_text: ['Add your name.'], first_name_label: ['Given name'], last_name_label: ['Family name'], register_button_label: ['Join now'], login_link_label: ['Back']},
    noop: {375: ['register_title', 'register_text', 'first_name_label', 'last_name_label', 'register_button_label', 'login_link_label'], 1366: ['register_title', 'register_text', 'first_name_label', 'last_name_label', 'register_button_label', 'login_link_label']},
    extra: async browser => {
      const raw = fs.readFileSync(path.join(__dirname, '../sections/login-popup.storelib'), 'utf8').split('<schema>')[0];
      ok(/\{%- form 'customer_login'/.test(raw) && /\{%- form 'create_customer'/.test(raw) && !/type="password"|customer\[password/.test(raw), 'login-popup: the store forms, no password field');
      ok(/id="login-popup"/.test(raw) && /class="ap__h login-heading"/.test(raw) && /data-login-show=/.test(raw) && /data-login-hidden=/.test(raw), 'login-popup: the hooks theme.js reads (#login-popup, .login-heading, data-login-show / data-login-hidden)');
      /* the register tab: shown when theme.js flips aria-hidden, labelled, and live */
      const t = await L.mount(browser, 'login-popup', {assets: L.ASSETS, width: 375, globals: G});
      await t.page.evaluate(() => { document.querySelector('.bls-login').setAttribute('aria-hidden', 'true'); document.querySelector('.bls-register').setAttribute('aria-hidden', 'false'); });
      const reg = await t.page.evaluate(() => [...document.querySelectorAll('.bls-register input')].map(i => [i.name, !!document.querySelector('label[for="' + i.id + '"]'), i.getBoundingClientRect().height >= 44]));
      eq(reg, [['customer[first_name]', true, true], ['customer[last_name]', true, true], ['customer[email]', true, true]], 'login-popup: the create account tab');
      await t.emit({first_name_label: 'Given name', register_button_label: 'Join now'}); await L.frames(t.page);
      ok(await t.page.evaluate(() => document.querySelector('label[for^="PopupFirstName"]').textContent === 'Given name' && document.querySelector('.bls-register button[type=submit]').textContent.trim() === 'Join now'), 'login-popup: create account words live');
      eq(t.errors, [], 'login-popup: no errors');
      await t.page.close();
    },
  })]);
  results.push(['main-password-header', await L.suite('main-password-header', {
    mountOpts: {globals: G},
    twoInstances: {padding_top: 90},
    noop: {375: ['padding_top', 'padding_bottom', 'logo_width', 'show_logo'], 1366: ['show_logo']},
    theme: async (t, {ok, css, tag}) => { ok(/Georgia/.test(await css('.ap__h', 'fontFamily')) && await css('.ap__h', 'color') === 'rgb(255, 255, 255)', tag + ': the store name in the theme heading'); },
    priority: [{name: 'name color', section: {enable_custom_style: true, heading_color: '#00ff00'}, checks: [['.ap__h', 'color', 'rgb(0, 255, 0)']], off: {section: {enable_custom_style: false}}}, fonts('.ap__h')].map(p => p.name === 'section fonts' ? {...p, checks: [p.checks[0]]} : p),
    extra: async browser => {
      const logo = {url: 'https://theme.test/logo.png', src: 'https://theme.test/logo.png', width: 600, height: 200, alt: 'Logo'};
      const t = await L.mount(browser, 'main-password-header', {assets: L.ASSETS, width: 1366, theme: {logo}, globals: G});
      const w = () => t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .password-logo').getBoundingClientRect().width));
      eq(await w(), 160, 'main-password-header: the logo at its desktop width');
      await t.emit({logo_width: 250}); await L.frames(t.page);
      eq(await w(), 250, 'main-password-header: the logo width live');
      await t.emit({show_logo: false}); await L.frames(t.page);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test img').hidden && !document.querySelector('#shopify-section-test [data-ap-hide]').hidden), 'main-password-header: the store name instead of the logo, live');
      await t.page.setViewportSize({width: 375, height: 800}); await t.emit({show_logo: true, logo_width_mobile: 90}); await L.frames(t.page);
      eq(await w(), 90, 'main-password-header: the phone logo width');
      eq(t.errors, [], 'main-password-header: no errors');
      await t.page.close();
    },
  })]);
  results.push(['main-password-footer', await L.suite('main-password-footer', {
    mountOpts: {globals: G},
    twoInstances: {padding_top: 90},
    noop: {375: ['padding_top', 'padding_bottom', 'footer_text'], 1366: ['footer_text']},
    vals: {footer_text: ['<p>Opening in spring.</p>']},
    theme: async (t, {ok, css, tag}) => { ok(/Arial/.test(await css('[data-ap-root]', 'fontFamily')) && await css('[data-ap-root]', 'color') === 'rgb(204, 204, 204)', tag + ': the theme text'); },
    priority: [{name: 'text size', section: {text_size: 18}, checks: [['.ap__link', 'fontSize', '18px']], off: {section: {text_size: 13}}}],
    extra: async browser => {
      const t = await L.mount(browser, 'main-password-footer', {assets: L.ASSETS, width: 375, theme: {social_instagram_link: 'https://instagram.com/x', social_facebook_link: 'https://facebook.com/x'}, globals: G, settings: {footer_text: '<p>Opening soon.</p>'}});
      const s = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .list-social__link')].map(a => { const r = a.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), !!a.querySelector('.visually-hidden')]; }));
      ok(s.length === 2 && s.every(([w, h, l]) => w >= 44 && h >= 44 && l), 'main-password-footer: social links are 44px and named ' + JSON.stringify(s));
      ok(!/shopify\.com/.test(await t.page.content()), 'main-password-footer: no link to the old platform');
      await t.emit({show_footer: false}); await L.frames(t.page);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test [data-ap-root]').hidden), 'main-password-footer: Show footer off live');
      await t.page.close();
    },
  })]);
  results.push(['form-message', await L.suite('form-message', {
    mountOpts: {globals: G},
    twoInstances: {color_scheme: 'alt-scheme'},
    noop: {375: ['success_text', 'error_text', 'section_width', 'color_scheme'], 1366: ['success_text', 'error_text', 'section_width', 'color_scheme']},
    vals: {section_width: ['full_width']},
    skip: ['color_scheme'],
    extra: async browser => {
      const t = await L.mount(browser, 'form-message', {assets: L.ASSETS, width: 375, globals: G});
      const w = await t.page.evaluate(() => ['.product-form__error-message-wrapper', '.newsletter-form__success-message-wrapper', '.newsletter-form__error-message-wrapper'].map(s => { const e = document.querySelector('#shopify-section-test ' + s); return e && [e.hidden, e.getAttribute('role'), e.querySelector('.form__message') ? 1 : 0]; }));
      eq(w, [[true, 'alert', 1], [true, 'status', 1], [true, 'alert', 1]], 'form-message: the three wrappers theme.js copies');
      await t.emit({success_text: 'Welcome aboard.'}); await L.frames(t.page);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .newsletter-form__success-message-wrapper .newsletter-form__message').textContent === 'Welcome aboard.'), 'form-message: the success words live');
      await t.page.close();
    },
  })]);
  for (const [n, r] of results) console.log(n + ': controls live ' + r.covered.live + ', after redraw ' + r.covered.redraw + ', option pairs ' + r.covered.options);
  console.log(L.count() + ' account page checks passed');
})().catch(e => { console.error(e); process.exit(1); });
