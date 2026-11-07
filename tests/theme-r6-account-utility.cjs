/* Round 6, account and page group: the utility pages. 404 page (page-404),
   Contact page (page-contact), Page content (page-default), Wishlist
   (page-wishlist), Compare products (page-compare), Store locations
   (pages-store-location) and Coming soon (coming-soon), run by
   shopify/assets/live-account-pages.js. The shared checks are in
   tests/theme-r6-account-lib.cjs; this file adds the saved instances
   (templates/404.json, contact.json, page.json, wishlist.json and
   password.json) against the sections at c098384, the contact form on its
   store path with labelled fields and its messages as settings, every 404
   block setting, the store cards' call and directions links, and the
   Coming soon page's single h1, signup and countdown.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-account-utility.cjs */
const fs = require('fs'), path = require('path');
const L = require('./theme-r6-account-lib.cjs');
const {ok, eq, FONT, IMG} = L;
const ROUTES = {root_url: '/', account_url: '/account', account_login_url: '/account/login', all_products_collection_url: '/collections/all', search_url: '/search'};
const G = {routes: ROUTES, shop: {name: 'Materia Themes'}, page: {title: 'About the store', content: '<p>We sew <strong>linen</strong> pants in small runs.</p>'}};
const SAME = {375: [['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width'], ['container', 'full_width'], ['fluid_container', 'full_width']], 1366: []};
const NOOP = {375: ['reset_spacing'], 1366: ['reset_spacing']};
const fonts = (h, b) => ({name: 'section fonts', section: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: FONT}, checks: [[h, 'fontFamily', /Courier New/], [b, 'fontFamily', /Verdana/]], off: {section: {enable_custom_fonts: false}}});
const colours = (h, b) => ({name: 'custom colours', section: {enable_custom_style: true, heading_color: '#00ff00', text_color: '#ff00ff'}, checks: [[h, 'color', 'rgb(0, 255, 0)'], [b, 'color', 'rgb(255, 0, 255)']], off: {section: {enable_custom_style: false}}});
const themeHead = (h, b) => async (t, {ok, css, tag}) => {
  ok(/Georgia/.test(await css(h, 'fontFamily')) && await css(h, 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme font and colour');
  if (b) ok(/Arial/.test(await css(b, 'fontFamily')), tag + ': text in the theme body font');
};
const B404 = [{type: 'image'}, {type: 'heading', settings: {heading: 'Oops, that link is broken.'}}, {type: 'subheading', settings: {subheading: 'Error 404'}}, {type: 'description'}, {type: 'button', settings: {first_button_label: 'Back to homepage', first_button_link: '/'}}];
const BCONTACT = [{type: 'contact', settings: {heading: 'Contact us', description: '<p>Write to us.</p>', button_label: 'Send'}}, {type: 'text_block', settings: {heading_text_block: 'Help', description_text_block: '<p>We answer every day.</p>', content: '<p><strong>Email</strong><br>Use the form.</p>'}}];
const BSTORES = [{type: 'item', settings: {store_name: 'Main shop', store_address: '1 Main St, Lisbon', store_phone: '+351 (21) 555-0100'}}, {type: 'item', settings: {store_name: 'Market stall', store_lat: '38.7', store_lng: '-9.1'}}];
const BLAUNCH = [{type: 'countdown', settings: {countdown_date: '2099-12-31'}}, {type: 'heading', settings: {heading: 'Opening soon'}}, {type: 'subheading', settings: {subheading: '<p>New pants in spring.</p>'}}, {type: 'email'}];

(async () => {
  const results = [];
  const browser = await L.launch();
  let saved = 0;
  try {
    /* saved instances look the same as at c098384 */
    saved += await L.savedLook(browser, {name: 'page-404', template: 'templates/404.json', key: 'main'});
    saved += await L.savedLook(browser, {name: 'page-default', template: 'templates/page.json', key: 'main'});
    /* the headings are h2 now (h3 before, the same size from the h4 class) and the intro is a div (a <p> around the rich text before, which the browser split): the same text, sizes and places */
    saved += await L.savedLook(browser, {name: 'page-contact', template: 'templates/contact.json', key: 'main', assets: ['page-contact.css'], tolerate: v => v.replace(/^H[23]\|/, 'H|'), drop: /^(DIV|P)\|\||^LABEL\|policies/});  /* the privacy label's box grew to a 44px target with a negative margin; its text stays put */
    saved += await L.savedLook(browser, {name: 'page-wishlist', template: 'templates/wishlist.json', key: 'main', assets: ['wishlist-page.css']});
    saved += await L.savedLook(browser, {name: 'coming-soon', template: 'templates/password.json', key: 'main', assets: ['password-launch.css', 'materia-forms.css']});
  } finally { await browser.close(); }

  results.push(['page-404', await L.suite('page-404', {
    blocks: B404, mountOpts: {globals: G},
    structural: ['custom_404_image', 'image.image'],
    noop: {375: ['reset_spacing', 'padding_top', 'padding_bottom'], 1366: ['reset_spacing']},
    same: {...SAME, 375: SAME[375].concat([['primary', 'outline']])},
    vals: {'heading.font_weight': ['body_weight', 'subheading_weight'], 'subheading.font_weight': ['body_weight', 'heading_weight'], 'button.first_button_link': ['/pages/probe']},
    bctx: {'image.image': {}},
    twoInstances: {padding_top: 90},
    blockEdit: ['heading', {heading: 'Only in a'}],
    extraBlock: ['heading', {heading: 'Another heading'}, {heading: 'Changed live'}],
    theme: themeHead('h1', '.sec__content-des'),
    priority: [fonts('h1', '.sec__content-des p'), colours('h1', '.sec__content-des'),
      {name: 'heading weight', blocks: {heading: {custom_weight: true, font_weight: 'body_weight'}}, checks: [['h1', 'fontWeight', '400']], off: {blocks: {heading: {custom_weight: false, font_weight: 'heading_weight'}}}},
      {name: 'uppercase heading', blocks: {heading: {uppercase: true}}, checks: [['h1', 'textTransform', 'uppercase']], off: {blocks: {heading: {uppercase: false}}}}],
    extra: async browser => {
      const t = await L.mount(browser, 'page-404', {assets: L.ASSETS, width: 375, editing: false, blocks: B404, globals: G});
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test [data-ap-type=image]').hidden), 'page-404: an empty picture block draws nothing on the storefront');
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .sec__content-btn a').getAttribute('href') === '/'), 'page-404: the button link');
      await t.emit({first_button_link: ''}, t.blockId('button')); await L.frames(t.page);
      ok(await t.page.evaluate(() => { const a = document.querySelector('#shopify-section-test .sec__content-btn a'); return !a.hasAttribute('href') && a.getAttribute('aria-disabled') === 'true'; }), 'page-404: a button with no link is marked disabled, live');
      await t.page.close();
    },
  })]);
  results.push(['page-contact', await L.suite('page-contact', {
    blocks: BCONTACT, mountOpts: {globals: G}, css: ['page-contact.css'],
    structural: ['iframe'], messages: undefined,
    vals: {column_gap: [20]}, dimmed: '.form_action button[type=submit]',  /* the send button waits at 0.4 until the privacy box is ticked */
    skip: ['contact.success_message', 'contact.error_message'],
    noop: {375: ['reset_spacing', 'column_gap'], 1366: ['reset_spacing']},
    same: SAME, twoInstances: {padding_top: 90}, blockEdit: ['contact', {heading: 'Only in a'}],
    theme: themeHead('h2', 'label'),
    priority: [fonts('h2', 'label'), colours('h2', '.section__header-des')],
    extra: async browser => {
      const raw = fs.readFileSync(path.join(__dirname, '../sections/page-contact.storelib'), 'utf8').split('<schema>')[0];
      ok(/\{% form 'contact' %\}/.test(raw) && /name="contact\[email\]"/.test(raw) && /name="contact\[body\]"/.test(raw), 'page-contact: the store contact form and its field names');
      ok(/block_st\.success_message/.test(raw) && /block_st\.error_message/.test(raw), 'page-contact: success and error messages are settings');
      for (const [form, sel, text] of [[{'posted_successfully?': true, posted_successfully: true}, '[role=status]', 'Thanks, got it.'], [{errors: {messages: {email: 'is invalid'}}}, '[role=alert]', 'Not sent.']]) {
        const blocks = [{type: 'contact', settings: {success_message: 'Thanks, got it.', error_message: 'Not sent.'}}];
        const t = await L.mount(browser, 'page-contact', {assets: L.ASSETS, width: 375, editing: false, blocks, globals: {...G, form}});
        const got = await t.page.evaluate(sel => document.querySelector('#shopify-section-test ' + sel)?.textContent.replace(/\s+/g, ' ').trim(), sel);
        ok(got && got.startsWith(text), 'page-contact: ' + sel + ' shows the setting\'s words: ' + got);
        await t.page.close();
      }
      const t = await L.mount(browser, 'page-contact', {assets: L.ASSETS, width: 375, editing: false, blocks: BCONTACT, globals: G});
      ok(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test input, #shopify-section-test textarea')].every(c => { const l = document.querySelector('label[for="' + c.id + '"]'); return l && l.textContent.trim(); })), 'page-contact: every field labelled');
      await t.emit({show_privacy: false}, t.blockId('contact')); await L.frames(t.page);
      ok(await t.page.evaluate(() => { const b = document.querySelector('#shopify-section-test .contact-privacy__input'); return !b.required && b.closest('[hidden]'); }), 'page-contact: privacy off live: not required, hidden');
      await t.emit({name: ''}, t.blockId('contact')); await L.frames(t.page);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test label[for^="ContactName"]').textContent.trim() === 'your name'), 'page-contact: an empty label falls back to the theme words live');
      await t.page.close();
    },
  })]);
  results.push(['page-default', await L.suite('page-default', {
    mountOpts: {globals: G},
    noop: {375: ['reset_spacing', 'text_width'], 1366: ['reset_spacing']},
    same: SAME, twoInstances: {padding_top: 90},
    theme: themeHead('h1', '.rte p'),
    priority: [fonts('h1', '.rte p'), colours('h1', '.rte p')],
  })]);
  results.push(['page-wishlist', await L.suite('page-wishlist', {
    mountOpts: {globals: G}, css: ['wishlist-page.css'],
    skip: ['empty_text', 'empty_button_label', 'empty_button_url', 'removed_message'],
    noop: {375: ['reset_spacing'], 1366: ['reset_spacing']},
    same: SAME, twoInstances: {padding_top: 90}, hiddenContent: true,
    extra: async browser => {
      const t = await L.mount(browser, 'page-wishlist', {assets: L.ASSETS.concat(['wishlist-page.css']), width: 375, globals: G});
      await t.page.evaluate(() => { document.querySelector('#shopify-section-test [data-wishlist-empty]').hidden = false; });
      const read = () => t.page.evaluate(() => { const e = document.querySelector('#shopify-section-test [data-wishlist-empty]'); return [e.querySelector('p').textContent.trim(), e.querySelector('a').textContent.trim(), e.querySelector('a').getAttribute('href')]; });
      eq(await read(), ['empty des', 'redirect', '/collections/all'], 'page-wishlist: the theme words when the settings are empty');
      await t.emit({empty_text: 'Nothing saved yet.', empty_button_label: 'Shop pants', empty_button_url: '/collections/pants'}); await L.frames(t.page);
      eq(await read(), ['Nothing saved yet.', 'Shop pants', '/collections/pants'], 'page-wishlist: the empty state words and link live');
      await t.emit({empty_text: '', empty_button_label: '', empty_button_url: ''}); await L.frames(t.page);
      eq(await read(), ['empty des', 'redirect', '/collections/all'], 'page-wishlist: and back to the theme words');
      eq(t.errors, [], 'page-wishlist: no errors');
      await t.page.close();
    },
  })]);
  results.push(['page-compare', await L.suite('page-compare', {
    mountOpts: {globals: G}, hiddenContent: true,
    skip: ['row_product', 'row_review', 'row_vendor', 'row_color', 'row_size', 'row_availability', 'in_stock_label', 'sold_out_label', 'empty_text', 'empty_button_label', 'empty_button_url'],
    noop: {375: ['reset_spacing'], 1366: ['reset_spacing']},
    same: SAME, twoInstances: {padding_top: 90},
    extra: async browser => {
      const t = await L.mount(browser, 'page-compare', {assets: L.ASSETS, width: 1366, globals: G});
      await t.emit({row_vendor: 'Maker', empty_text: 'Nothing here.', empty_button_url: '/collections/pants'}); await L.frames(t.page);
      ok(await t.page.evaluate(() => { const W = document.getElementById('shopify-section-test'); return W.querySelector('.compare-row-vendor .compare-field').textContent.trim() === 'Maker' && W.querySelector('.compare-no-product-js p').textContent === 'Nothing here.' && W.querySelector('.compare-no-product-url').getAttribute('href') === '/collections/pants'; }), 'page-compare: row names and empty state live');
      ok(!/#008A00|#907341/i.test(fs.readFileSync(path.join(__dirname, '../sections/page-compare.storelib'), 'utf8')), 'page-compare: stock icons follow the text colour');
      eq(t.errors, [], 'page-compare: no errors');
      await t.page.close();
    },
  })]);
  results.push(['pages-store-location', await L.suite('pages-store-location', {
    blocks: BSTORES, mountOpts: {globals: G},
    /* latitude and longitude only count together (the second card has both, checked below) */
    noop: {375: ['reset_spacing', 'item.store_lat', 'item.store_lng'], 1366: ['reset_spacing', 'item.store_lat', 'item.store_lng']},
    same: SAME, twoInstances: {padding_top: 90}, blockEdit: ['item', {store_name: 'Only in a'}],
    extraBlock: ['item', {store_name: 'Third shop', store_address: 'Rua 3'}, {store_phone: '555 0101'}],
    vals: {store_lat: ['40.1'], store_lng: ['-8.2']},
    theme: themeHead('h2', '.store-card__address'),
    priority: [fonts('h2', '.store-card__address'), {name: 'custom colours', section: {enable_custom_style: true, heading_color: '#00ff00', text_color: '#ff00ff', card_background: '#0000ff', card_border: '#ffff00'}, checks: [['h2', 'color', 'rgb(0, 255, 0)'], ['h3', 'color', 'rgb(0, 255, 0)'], ['.store-card', 'color', 'rgb(255, 0, 255)'], ['.store-card', 'backgroundColor', 'rgb(0, 0, 255)'], ['.store-card', 'borderTopColor', 'rgb(255, 255, 0)']], off: {section: {enable_custom_style: false}}}],
    extra: async browser => {
      const t = await L.mount(browser, 'pages-store-location', {assets: L.ASSETS, width: 375, editing: false, blocks: BSTORES, globals: G});
      const l = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .store-card')].map(c => [...c.querySelectorAll('a:not([hidden])')].map(a => a.getAttribute('href'))));
      eq(l, [['tel:+351215550100', 'https://www.google.com/maps/search/?api=1&query=1+Main+St%2C+Lisbon'], ['https://www.google.com/maps/search/?api=1&query=38.7,-9.1']], 'page store cards: call and directions links');
      ok(!/mapbox-gl|page-store-location\.js/.test(fs.readFileSync(path.join(__dirname, '../sections/pages-store-location.storelib'), 'utf8').split('<schema>')[0]), 'pages-store-location: no map script that needs a key the store does not have');
      const tall = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .ap__link:not([hidden])')].every(a => a.getBoundingClientRect().height >= 44));
      ok(tall, 'pages-store-location: links are 44px targets');
      await t.page.close();
    },
  })]);
  results.push(['coming-soon', await L.suite('coming-soon', {
    blocks: BLAUNCH, mountOpts: {globals: G}, css: ['password-launch.css', 'materia-forms.css'],
    structural: ['custom_bg_image', 'custom_bg_video', 'custom_bg_video_url', 'enable_custom_bg_image', 'enable_custom_video_background', 'bg_image_brightness', 'video_brightness', 'logo_image', 'countdown.countdown_date'],
    skip: ['success_text', 'error_text', 'preview_success_text', 'preview_subscribed_label', 'preview_submit_mode', 'enable_logo', 'logo_size_desktop', 'logo_size_mobile', 'custom_bg_image', 'custom_bg_video', 'custom_bg_video_url', 'enable_custom_bg_image', 'enable_custom_video_background', 'bg_image_brightness', 'video_brightness'],
    noop: {375: ['reset_spacing', 'viewport_height', 'fill_screen', 'content_width', 'vertical_alignment', 'email_gap_top', 'heading.heading_font_size'], 1366: ['reset_spacing', 'viewport_height', 'fill_screen', 'vertical_alignment']},
    same: {375: SAME[375].concat([['start', 'center'], ['start', 'end'], ['center', 'end']]), 1366: [['start', 'center'], ['start', 'end'], ['center', 'end'], ['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width'], ['container', 'full_width'], ['fluid_container', 'full_width']]},
    vals: {content_alignment: ['start', 'end'], 'countdown.countdown_size_mobile': [1.2]},
    ctx: {bg_gradient_degree: {bg_gradient_color1: '#ff0000', bg_gradient_color2: '#0000ff'}},
    bctx: {'heading.heading_gradient_degree': {heading_gradient_color1: '#ff0000', heading_gradient_color2: '#0000ff'}},
    twoInstances: {padding_top_desktop: 90},
    blockEdit: ['heading', {heading: 'Only in a'}],
    theme: async (t, {ok, css, tag}) => {
      ok(/Georgia/.test(await css('h1', 'fontFamily')) && await css('h1', 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme');
      ok(await css('button[type=submit]', 'backgroundColor') === 'rgb(18, 52, 86)', tag + ': the theme button');
      ok(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test h1').length === 1), tag + ': one h1');
    },
    priority: [fonts('h1', '.pw-launch__description p'),
      {name: 'heading and text styling', section: {enable_custom_style: true}, blocks: {heading: {heading_color: '#00ff00', heading_font_size: 90}, subheading: {subheading_color: '#ff00ff', subheading_font_size: 22}},
        checks: [['h1', 'color', 'rgb(0, 255, 0)'], ['.pw-launch__description', 'color', 'rgb(255, 0, 255)'], ['.pw-launch__description', 'fontSize', '22px']], off: {section: {enable_custom_style: false}}}],
    extra: async browser => {
      const t = await L.mount(browser, 'coming-soon', {assets: L.ASSETS.concat(['password-launch.css']), width: 375, editing: false, blocks: BLAUNCH, globals: G});
      const f = await t.page.evaluate(() => { const W = document.getElementById('shopify-section-test'), i = W.querySelector('input[type=email]'), form = i.closest('form'); return {name: i.name, label: !!W.querySelector('label[for="' + i.id + '"]'), h1: W.querySelectorAll('h1').length, units: W.querySelectorAll('[data-launch-unit]').length}; });
      eq(f, {name: 'contact[email]', label: true, h1: 1, units: 4}, 'coming-soon: the signup and the countdown');
      ok(/form 'customer'[^%]*data-storelib-form: 'subscribe'/.test(fs.readFileSync(path.join(__dirname, '../snippets/password-launch-content.storelib'), 'utf8')), 'coming-soon: the signup is the store newsletter form (Storelib subscribers)');
      await t.emit({days_label: 'Tage', button_label: 'Notify me'}); await L.frames(t.page);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test [data-ap-text=days_label]').textContent === 'Tage' && document.querySelector('#shopify-section-test [data-inline-label]').textContent === 'Notify me'), 'coming-soon: countdown label and button live');
      await t.emit({countdown_date: '2098-01-01'}, t.blockId('countdown')); await L.frames(t.page);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .pw-launch__countdown').dataset.launchDate === '2098-01-01'), 'coming-soon: launch date live');
      eq(t.errors, [], 'coming-soon: no errors');
      await t.page.close();
    },
  })]);
  for (const [n, r] of results) console.log(n + ': controls live ' + r.covered.live + ', after redraw ' + r.covered.redraw + ', option pairs ' + r.covered.options);
  console.log(L.count() + ' utility page checks passed (saved instances compared at ' + saved + ' widths)');
})().catch(e => { console.error(e); process.exit(1); });
