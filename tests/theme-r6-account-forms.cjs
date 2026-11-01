/* Round 6, account and page group: the sign in forms. Sign in
   (main-login), Create account (main-register), Activate account
   (main-activate-account) and Reset password (main-reset-password), run by
   shopify/assets/live-account-pages.js. The shared checks are in
   tests/theme-r6-account-lib.cjs; this file adds the forms' own: the store's
   customer forms on their paths (customer_login, create_customer,
   activate_customer_password, reset_customer_password), an email field and
   no password field (Storelib signs in with an emailed code), every field
   labelled, the error message as a setting where the form prints its
   errors, and the sign in and register links to Storelib's routes.
   No page has these sections saved (the theme has no customers templates).

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-account-forms.cjs */
const fs = require('fs'), path = require('path');
const L = require('./theme-r6-account-lib.cjs');
const {ok, eq, FONT} = L;
const ROUTES = {root_url: '/', account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/login', account_logout_url: '/account/logout', account_addresses_url: '/account/addresses', all_products_collection_url: '/collections/all'};
const G = {routes: ROUTES, shop: {name: 'Materia Themes'}};
const SAME = {375: [['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width'], ['container', 'full_width'], ['fluid_container', 'full_width']], 1366: []};
const theme = async (t, {ok, css, tag}) => {
  ok(/Georgia/.test(await css('h1', 'fontFamily')) && await css('h1', 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme font and colour');
  ok(/Arial/.test(await css('label', 'fontFamily')) && await css('label', 'color') === 'rgb(204, 204, 204)', tag + ': labels in the theme body font and text colour');
  ok(/Arial/.test(await css('input[type=email]', 'fontFamily')), tag + ': the field in the theme body font');
  ok(await css('button[type=submit]', 'backgroundColor') === 'rgb(18, 52, 86)' && await css('button[type=submit]', 'borderTopLeftRadius') === '12px', tag + ': the theme button');
  await t.page.hover('#shopify-section-test button[type=submit]'); await t.page.waitForTimeout(80);
  ok(await css('button[type=submit]', 'backgroundColor') === 'rgb(255, 0, 0)', tag + ': the theme button hover');
  await t.page.mouse.move(0, 0);
};
const fontsCheck = {name: 'section fonts reach the heading, labels, field and button', section: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: FONT},
  checks: [['h1', 'fontFamily', /Courier New/], ['label', 'fontFamily', /Verdana/], ['label span', 'fontFamily', /Verdana/], ['input[type=email]', 'fontFamily', /Verdana/], ['button[type=submit]', 'fontFamily', /Verdana/]], off: {section: {enable_custom_fonts: false}}};
const colours = (h, t) => ({name: 'custom colours', section: {enable_custom_style: true, [h]: '#00ff00', [t]: '#ff00ff'}, checks: [['h1', 'color', 'rgb(0, 255, 0)'], ['label', 'color', 'rgb(255, 0, 255)'], ['.ap__t p', 'color', 'rgb(255, 0, 255)']], off: {section: {enable_custom_style: false}}});
/* the form's own markup, read from the source and the drawn page */
async function forms(browser, name, {form, fields, links}) {
  const raw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8'), tpl = raw.split('<schema>')[0];
  ok(new RegExp("\\{%-? form '" + form + "'").test(tpl), name + ': the store form ' + form);
  ok(!/type="password"|customer\[password/.test(tpl), name + ': no password field (Storelib emails a code)');
  ok(/st\.error_message/.test(tpl) && /form\.errors/.test(tpl), name + ': the error message is a setting, printed with the form errors');
  const t = await L.mount(browser, name, {assets: L.ASSETS, width: 375, editing: false, globals: G});
  const got = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test input:not([type=hidden])')].map(i => ({name: i.name, type: i.type, label: (document.querySelector('label[for="' + i.id + '"]') || {}).textContent, ac: i.autocomplete})));
  eq(got.map(f => f.name), fields, name + ': the fields on their store names ' + JSON.stringify(got));
  ok(got.every(f => f.label && f.label.trim()), name + ': every field labelled');
  ok(got.filter(f => f.type === 'email').every(f => f.ac === 'email'), name + ': the email field autocompletes');
  const hrefs = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test a')].map(a => a.getAttribute('href')));
  for (const l of links) ok(hrefs.includes(l), name + ': links to ' + l + ' ' + JSON.stringify(hrefs));
  await t.page.close();
  /* the store's errors: the error message setting first, then the store's words */
  const errors = Object.assign(['email'], {messages: {form: 'Email is invalid', email: 'is invalid'}, translated_fields: {email: 'Email'}});
  const e = await L.mount(browser, name, {assets: L.ASSETS, width: 375, editing: false, settings: {error_message: 'Check your email.'}, globals: {...G, form: {errors}}});
  const msg = await e.page.evaluate(() => { const m = document.querySelector('#shopify-section-test [role=alert]'); return m && {text: m.textContent.replace(/\s+/g, ' ').trim(), cls: m.className}; });
  ok(msg && msg.text.startsWith('Check your email.') && /error/.test(msg.cls), name + ': the error message shows with the store errors ' + JSON.stringify(msg));
  await e.emit({error_message: 'Try again.'}); await L.frames(e.page);
  ok(await e.page.evaluate(() => document.querySelector('#shopify-section-test [role=alert] [data-ap-text]').textContent === 'Try again.'), name + ': the error message live');
  eq(e.errors, [], name + ': errors state, no errors');
  await e.page.close();
}

(async () => {
  const results = [];
  /* Sign in */
  results.push(['main-login', await L.suite('main-login', {
    mountOpts: {globals: G},
    skip: ['error_message'],
    noop: {375: ['reset_spacing', 'column_gap', 'padding_top', 'padding_bottom'], 1366: ['reset_spacing']},
    same: SAME,
    vals: {register_heading: ['New here'], register_button_label: ['Make one']},
    twoInstances: {padding_top: 90},
    theme,
    priority: [fontsCheck, colours('heading_color', 'subtext_color'),
      {name: 'heading weight', section: {enable_custom_font_weight_heading: true, font_weight_heading: '300'}, checks: [['h1', 'fontWeight', '300'], ['h2', 'fontWeight', '300']], off: {section: {enable_custom_font_weight_heading: false}}},
      {name: 'sizes', section: {heading_font_size_desktop: 50, heading_font_size_mobile: 20, subtext_font_size_desktop: 21, subtext_font_size_mobile: 12}, checks: [['h1', 'fontSize', w => w < 768 ? '20px' : '50px'], ['.ap__t', 'fontSize', w => w < 768 ? '12px' : '21px']], off: {section: {heading_font_size_desktop: 30, heading_font_size_mobile: 24, subtext_font_size_desktop: 16, subtext_font_size_mobile: 14}}}],
    extra: async browser => {
      await forms(browser, 'main-login', {form: 'customer_login', fields: ['customer[email]'], links: ['/account/login']});
      /* the margins: phone and computer values, reset wins */
      const t = await L.mount(browser, 'main-login', {assets: L.ASSETS, width: 1366, globals: G, settings: {section_margin_top_desktop: 40, section_margin_top_mobile: 12}});
      const mt = () => t.page.evaluate(() => getComputedStyle(document.getElementById('shopify-section-test')).marginTop);
      eq(await mt(), '40px', 'main-login: desktop top margin');
      await t.emit({section_margin_top_desktop: 64}); await L.frames(t.page);
      eq(await mt(), '64px', 'main-login: desktop top margin live');
      await t.emit({reset_spacing: true}); await L.frames(t.page);
      eq(await mt(), '0px', 'main-login: remove space wins live');
      await t.page.setViewportSize({width: 375, height: 900}); await t.emit({reset_spacing: false}); await L.frames(t.page);
      eq(await mt(), '12px', 'main-login: phone top margin after a resize');
      await t.page.close();
    },
  })]);
  /* Create account, Activate account, Reset password */
  for (const [name, form, fields] of [['main-register', 'create_customer', ['customer[first_name]', 'customer[last_name]', 'customer[email]']], ['main-activate-account', 'activate_customer_password', ['customer[email]']], ['main-reset-password', 'reset_customer_password', ['customer[email]']]]) {
    results.push([name, await L.suite(name, {
      mountOpts: {globals: G},
      skip: ['error_message'],
      noop: {375: ['reset_spacing', 'padding_top', 'padding_bottom'], 1366: ['reset_spacing']},
      same: SAME,
      twoInstances: {padding_top: 90},
      theme,
      priority: [fontsCheck, colours('heading_color', 'text_color'),
        {name: 'sizes', section: {heading_size_desktop: 50, heading_size_mobile: 20, text_size_desktop: 21, text_size_mobile: 12}, checks: [['h1', 'fontSize', w => w < 768 ? '20px' : '50px'], ['.ap__t', 'fontSize', w => w < 768 ? '12px' : '21px']], off: {section: {heading_size_desktop: 30, heading_size_mobile: 24, text_size_desktop: 16, text_size_mobile: 14}}}],
      extra: async browser => forms(browser, name, {form, fields, links: ['/account/login']}),
    })]);
  }
  for (const [n, r] of results) console.log(n + ': controls live ' + r.covered.live + ', after redraw ' + r.covered.redraw + ', option pairs ' + r.covered.options);
  console.log(L.count() + ' sign in form checks passed');
})().catch(e => { console.error(e); process.exit(1); });
