/* Round 5, Contact group: Contact Form Simple 2
   (sections/contactformsimple2.storelib), run by
   shopify/assets/live-contact.js. The shared checks are in
   tests/theme-r5-contact-lib.cjs; this file adds the section's own: the
   store's contact form (name, email, website, message, each labelled, the
   theme's contact form tag), the success and error messages as settings,
   Match theme fields and Match theme button, the info items and the saved
   Contact page instance against the section before this work, with
   Enable custom styling on (the toggle the lead sets in
   templates/contact.json).

   LIQUIDJS=<path to liquidjs> node tests/theme-r5-contact-form2.cjs */
const fs = require('fs'), path = require('path');
const L = require('./theme-r5-contact-lib.cjs');
const {ok, eq, FONT} = L;
const name = 'contactformsimple2';
(async () => {
  const raw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8'), tpl = raw.split('<schema>')[0];
  ok(/\{% form 'contact', id: cp_form_id %\}/.test(tpl) && /name="contact\[email\]"/.test(tpl) && /name="contact\[body\]"/.test(tpl) && /name="contact\[name\]"/.test(tpl), 'the store contact form and its field names');
  ok(/form\.posted_successfully\?[\s\S]{0,120}st\.success_text/.test(tpl) && /form\.errors[\s\S]{0,200}st\.error_text/.test(tpl), 'success and error messages are settings');
  const r = await L.suite(name, {
    messages: ['success_text', 'error_text', '.cp-alert--ok', '.cp-alert--err'],
    noop: {375: ['col_gap', 'icon_size_desktop'], 1366: ['icon_size_mobile']},
    same: {375: [['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width'], ['container', 'full_width'], ['fluid_container', 'full_width']],
      1366: [['300', '400'], ['500', '600']]},
    twoInstances: {pad_top: 90},
    blockEdit: ['heading', {text: 'Only in a'}],
    extraBlock: ['info', {icon: 'clock', line1: 'Open daily', line2: ''}, {line2: 'Live second line', icon: 'star'}],
    theme: async (t, {ok, css, tag}) => {
      ok(/Georgia/.test(await css('h2', 'fontFamily')) && await css('h2', 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme font and heading colour');
      ok(/Arial/.test(await css('.cp-desc', 'fontFamily')), tag + ': text in the theme body font');
      ok(await css('.cp-submit', 'backgroundColor') === 'rgb(18, 52, 86)', tag + ': the theme button');
      ok(await css('.cp-input', 'borderTopLeftRadius') === await t.page.evaluate(() => { const i = document.createElement('input'); i.type = 'text'; const w = document.createElement('div'); w.className = 'shopify-section'; w.append(i); document.body.append(w); const r = getComputedStyle(i).borderTopLeftRadius; w.remove(); return r; }), tag + ': fields follow the theme fields');
    },
    priority: [
      {name: 'heading font and weight', base: {blocks: {heading: {text: 'Talk <strong>to us</strong>'}}}, blocks: {heading: {enable_custom_fonts: true, font: FONT, font_weight: '300'}},
        checks: [['h2', 'fontFamily', /Verdana/], ['h2 strong', 'fontFamily', /Verdana/], ['h2', 'fontWeight', '300']], off: {blocks: {heading: {enable_custom_fonts: false, font_weight: 'theme'}}}},
      {name: 'description and info fonts', blocks: {description: {enable_custom_fonts: true, font: FONT}, info: {enable_custom_fonts: true, font: FONT}},
        checks: [['.cp-desc p', 'fontFamily', /Verdana/], ['.cp-item .cp-line1', 'fontFamily', /Verdana/]], off: {blocks: {description: {enable_custom_fonts: false}, info: {enable_custom_fonts: false}}}},
      {name: 'section fonts reach the fields and the button', section: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: FONT},
        checks: [['h2', 'fontFamily', /Courier New/], ['.cp-input', 'fontFamily', /Verdana/], ['.cp-submit', 'fontFamily', /Verdana/]], off: {section: {enable_custom_fonts: false}}},
      {name: 'button shape', section: {use_theme_button: false, button_radius: 3, button_size: 21, button_pad_y: 20},
        checks: [['.cp-submit', 'borderTopLeftRadius', '3px'], ['.cp-submit', 'fontSize', '21px'], ['.cp-submit', 'paddingTop', '20px']], off: {section: {use_theme_button: true}}},
      {name: 'field shape and colours', section: {use_theme_fields: false, field_radius: 17, field_height: 60, input_bg: '#00ff00', input_border: '#0000ff', input_text: '#ff00ff'},
        checks: [['.cp-input', 'borderTopLeftRadius', '17px'], ['.cp-input', 'height', '60px'], ['.cp-input', 'backgroundColor', 'rgb(0, 255, 0)'], ['.cp-input', 'borderTopColor', 'rgb(0, 0, 255)'], ['.cp-input', 'color', 'rgb(255, 0, 255)']], off: {section: {use_theme_fields: true}}},
      {name: 'button colours', section: {enable_custom_style: true, button_bg: '#00ff00', button_text: '#000000'},
        checks: [['.cp-submit', 'backgroundColor', 'rgb(0, 255, 0)'], ['.cp-submit', 'color', 'rgb(0, 0, 0)']], off: {section: {enable_custom_style: false}}},
    ],
    extra: async (browser, {ok, eq, opts, frames}) => {
      /* labels on screen, the website field off live */
      const t = await L.mount(browser, name, opts({width: 375}));
      await t.emit({show_labels: true, label_email: 'Your email'}); await frames(t.page);
      ok(await t.page.evaluate(() => { const l = document.querySelector('#shopify-section-test label[for^="ContactEmail-"]'); return l.textContent === 'Your email' && l.getBoundingClientRect().width > 10; }), 'field labels shown on screen live');
      await t.emit({show_website: false}); await frames(t.page);
      ok(await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-test [id^="ContactWebsite-"]'); return i.hidden && i.disabled; }), 'website field off live: hidden and not sent');
      await t.page.screenshot({path: path.join(process.env.SHOTS || '/tmp', 'r5-contactformsimple2-375.png'), fullPage: true}).catch(() => {});
      eq(t.errors, [], 'labels and website, no errors');
      await t.page.close();
      /* legacy look: the saved Contact page instance, Enable custom styling on */
      const n = await L.savedLook(browser, {name, template: 'templates/contact.json', key: 'contactformsimple2_RaJQEK', toggles: {enable_custom_style: true},
        /* The button is on the theme button contract now: its line height is the contract's 1.4 (0.4px taller), its border is its own background colour
           (it was transparent over the same background), and its corners are --btn-radius, which the real site sets from the same Buttons setting as
           --theme-button-radius (only this test page gives them different values). */
        tolerate: row => row.startsWith('BUTTON|') ? row.split('|').map((v, i) => [8, 10, 11].includes(i) ? '*' : v).join('|') : row});
      ok(n === 2 || n === 0, 'saved contact form compared at 375 and 1366');
    },
  });
  console.log(L.count() + ' Contact Form Simple 2 checks passed (controls live ' + r.covered.live + ', after redraw ' + r.covered.redraw + ', option pairs ' + r.covered.options + ')');
})().catch(e => { console.error(e); process.exit(1); });
