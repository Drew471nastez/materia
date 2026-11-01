/* Round 5, Contact group: Contact Form Simple
   (sections/contact-form-simple.storelib), run by
   shopify/assets/live-contact.js. The shared checks are in
   tests/theme-r5-contact-lib.cjs; this file adds the section's own: the
   store's contact form (the theme's contact form tag, contact[email] and
   contact[body]), every field block labelled, field type, name, required
   and half width live (a new control with the same id, label and form
   name), dropdown options, the info rows (the store's own email and phone
   when a value is empty, a link when there is one), success and error
   messages as settings, Match theme fields and Match theme button.
   No page has this section saved.

   LIQUIDJS=<path to liquidjs> node tests/theme-r5-contact-form.cjs */
const fs = require('fs'), path = require('path');
const L = require('./theme-r5-contact-lib.cjs');
const {ok, eq, FONT, IMG} = L;
const name = 'contact-form-simple';
(async () => {
  const raw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8'), tpl = raw.split('<schema>')[0];
  ok(/\{%- form 'contact', id: form_id/.test(tpl) && /'contact\[email\]'/.test(tpl) && /'contact\[body\]'/.test(tpl), 'the store contact form and its field names');
  ok(/form\.posted_successfully\?[\s\S]{0,120}st\.success_message/.test(tpl) && /form\.errors[\s\S]{0,200}st\.error_message/.test(tpl), 'success and error messages are settings');
  const PRESET = [{type: 'heading'}, {type: 'subheading'}, {type: 'field', settings: {field_type: 'text', label: 'Name', name: 'Name', placeholder: 'Your name', required: true, half_width: true}}, {type: 'field', settings: {field_type: 'email', label: 'Email', name: 'email', placeholder: 'you@example.com', required: true, half_width: true}}, {type: 'submit'}, {type: 'info', settings: {icon: 'mail', label: 'Email us', value: 'hello@store.test'}}, {type: 'side_image'}];
  const r = await L.suite(name, {
    messages: ['success_message', 'error_message', '.cfs__success', '.cfs__errors'],
    mountOpts: {globals: {shop: {name: 'Materia Themes', email: 'shop@store.test', phone: '+1 (555) 010-0100', address: {summary: '1 Main St'}}}},
    structural: ['side_image.image'],
    vals: {form_col_ratio: ['1fr'], side_col_ratio: ['1fr'], 'field.options': ['Red, Green'], options: ['Red, Green'], name: ['Order'], link: ['/pages/contact']},
    noop: {375: ['side_column_position', 'form_col_ratio', 'side_col_ratio', 'field.half_width', 'section_max_width_tablet', 'gap_subheading_content', 'subheading.max_width'], 1366: ['section_max_width_tablet']},
    same: {375: [['all', 'mobile'], ['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width'], ['container', 'full_width'], ['fluid_container', 'full_width']],
      1366: [['all', 'desktop']]},
    bctx: {'side_image.alt': {image: IMG}},
    sweepBlocks: [{type: 'side_image', settings: {}}],
    twoInstances: {padding_top_desktop: 20},
    blockEdit: ['field', {label: 'Only in a'}],
    extraBlock: ['field', {field_type: 'tel', label: 'Phone', name: 'Phone', placeholder: '+1'}, {field_type: 'select', options: 'One, Two', label: 'Pick'}],
    theme: async (t, {ok, css, tag}) => {
      ok(/Georgia/.test(await css('h2', 'fontFamily')) && await css('h2', 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme font and colour');
      ok(/Arial/.test(await css('.cfs__sub', 'fontFamily')) && /Arial/.test(await css('.cfs__label', 'fontFamily')), tag + ': text and labels in the theme body font');
      ok(await css('.cfs__label', 'fontWeight') === '400', tag + ': labels in the theme weight');
      ok(await css('.cfs__submit', 'backgroundColor') === 'rgb(18, 52, 86)', tag + ': the theme button');
      await t.page.hover('#shopify-section-test .cfs__submit'); await t.page.waitForTimeout(80);
      ok(await css('.cfs__submit', 'backgroundColor') === 'rgb(255, 0, 0)', tag + ': the theme button hover');
      await t.page.mouse.move(0, 0);
    },
    priority: [
      {name: 'heading font, weight and size', blocks: {heading: {enable_custom_fonts: true, font: FONT, weight: '500', size_enable: true, size_desktop: 60, size_mobile: 28, line_height: 1.5, tracking: 1, text: 'Get <em>in</em> touch'}},
        checks: [['h2', 'fontFamily', /Verdana/], ['h2 em', 'fontFamily', /Verdana/], ['h2', 'fontWeight', '500'], ['h2', 'fontSize', w => w < 768 ? '28px' : '60px'], ['h2', 'letterSpacing', '1px'], ['h2', 'lineHeight', w => w < 768 ? '42px' : '90px']],
        off: {blocks: {heading: {enable_custom_fonts: false, weight: 'theme', size_enable: false}}}},
      {name: 'subheading font, weight and size', base: {blocks: {subheading: {text: '<p>Write <strong>to us</strong></p>'}}}, blocks: {subheading: {enable_custom_fonts: true, font: FONT, weight_enable: true, weight: '300', size_enable: true, size: 21, line_height: 1.8}},
        checks: [['.cfs__sub strong', 'fontFamily', /Verdana/], ['.cfs__sub p', 'fontWeight', '300'], ['.cfs__sub p', 'fontSize', '21px'], ['.cfs__sub p', 'lineHeight', '37.8px']],
        off: {blocks: {subheading: {enable_custom_fonts: false, weight_enable: false, size_enable: false}}}},
      {name: 'section fonts reach labels, fields and the button', section: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: FONT},
        checks: [['h2', 'fontFamily', /Courier New/], ['.cfs__label', 'fontFamily', /Verdana/], ['.cfs__input', 'fontFamily', /Verdana/], ['.cfs__submit', 'fontFamily', /Verdana/]], off: {section: {enable_custom_fonts: false}}},
      {name: 'label weight', section: {label_weight: '700'}, checks: [['.cfs__label', 'fontWeight', '700']], off: {section: {label_weight: 'theme'}}},
      {name: 'button shape', section: {use_theme_button: false, submit_radius: 2, submit_size: 20, submit_pad_x: 50, submit_pad_y: 18},
        checks: [['.cfs__submit', 'borderTopLeftRadius', '2px'], ['.cfs__submit', 'fontSize', '20px'], ['.cfs__submit', 'paddingLeft', '50px'], ['.cfs__submit', 'paddingTop', '18px']], off: {section: {use_theme_button: true}}},
      {name: 'field shape and colours', section: {use_theme_fields: false, input_radius: 15, input_padding_y: 20, input_padding_x: 30, input_border_width: 3, input_size: 19, input_bg: '#00ff00', input_border_color: '#0000ff', input_text_color: '#ff00ff', placeholder_color: '#00ffff'},
        checks: [['.cfs__input', 'borderTopLeftRadius', '15px'], ['.cfs__input', 'paddingLeft', '30px'], ['.cfs__textarea', 'paddingTop', '20px'], ['.cfs__input', 'borderTopWidth', '3px'], ['.cfs__input', 'fontSize', '19px'], ['.cfs__input', 'backgroundColor', 'rgb(0, 255, 0)'], ['.cfs__input', 'borderTopColor', 'rgb(0, 0, 255)'], ['.cfs__input', 'color', 'rgb(255, 0, 255)'], ['.cfs__input', 'color', 'rgb(0, 255, 255)', '::placeholder']],
        off: {section: {use_theme_fields: true}}},
      {name: 'button colours', section: {enable_custom_style: true, submit_bg: '#00ff00', submit_color: '#000000'},
        checks: [['.cfs__submit', 'backgroundColor', 'rgb(0, 255, 0)'], ['.cfs__submit', 'color', 'rgb(0, 0, 0)']], off: {section: {enable_custom_style: false}}},
    ],
    extra: async (browser, {ok, eq, opts, frames, snapshot, audit}) => {
      /* field blocks: type, name and required live, the form name and label follow */
      const t = await L.mount(browser, name, opts({width: 1366}));
      const id = t.blockId('field', 3);
      await t.emit({field_type: 'textarea', required: false}, id); await frames(t.page);
      let f = await t.page.evaluate(id => { const b = document.querySelector('[data-ct-block="' + id + '"]'), c = b.querySelector('textarea, input, select'), l = b.querySelector('label'); return {tag: c.tagName, name: c.name, req: c.required, for: l.htmlFor === c.id, star: l.querySelector('.cfs__label-required').hidden}; }, id);
      ok(f.tag === 'TEXTAREA' && f.name === 'contact[body]' && !f.req && f.for && f.star, 'a field turned into a message box live: ' + JSON.stringify(f));
      await t.emit({field_type: 'email'}, id); await frames(t.page);
      f = await t.page.evaluate(id => { const c = document.querySelector('[data-ct-block="' + id + '"] input'); return {type: c.type, name: c.name, ac: c.autocomplete}; }, id);
      ok(f.type === 'email' && f.name === 'contact[email]' && f.ac === 'email', 'and into an email field: ' + JSON.stringify(f));
      eq(await audit(t.page, 'test'), [], 'field type changes: audit');
      /* every field labelled, the form posts to the contact form */
      ok(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .cfs__field')].every(b => { const c = b.querySelector('input, textarea, select'), l = b.querySelector('label'); return l && l.htmlFor === c.id && l.textContent.trim(); })), 'every field block has its label');
      await t.page.screenshot({path: path.join(process.env.SHOTS || '/tmp', 'r5-contact-form-simple-1366.png'), fullPage: true}).catch(() => {});
      eq(t.errors, [], 'field blocks, no errors');
      await t.page.close();
      /* info rows: the store's own email and phone, links */
      const s = await L.mount(browser, name, opts({width: 375, editing: false, blocks: PRESET.concat([{type: 'info', settings: {icon: 'phone', label: 'Call'}}])}));
      const rows = await s.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .cfs__info-value a')].map(a => a.getAttribute('href')));
      ok(rows.includes('mailto:hello@store.test') && rows.includes('tel:+15550100100'), 'info rows link the value, and an empty phone shows the store phone: ' + JSON.stringify(rows));
      ok(await s.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .cfs__side-placeholder svg'); return !!i && i.getBoundingClientRect().height > 50; }), 'an empty side image shows a tidy placeholder');
      ok(await s.noOverflow(), 'info rows and side image fit 375px');
      await s.page.close();
      /* no field blocks: the default fields, labelled */
      const d = await L.mount(browser, name, opts({width: 375, blocks: [{type: 'heading'}]}));
      ok(await d.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test input, #shopify-section-test textarea')].every(c => document.querySelector('label[for="' + c.id + '"]'))), 'default fields without field blocks are labelled');
      await d.emit({submit_label: 'Send it'}); await frames(d.page);
      ok(await d.page.evaluate(() => document.querySelector('#shopify-section-test .cfs__submit').textContent.trim() === 'Send it'), 'the legacy button label live');
      await d.page.close();
    },
  });
  console.log(L.count() + ' Contact Form Simple checks passed (controls live ' + r.covered.live + ', after redraw ' + r.covered.redraw + ', option pairs ' + r.covered.options + ')');
})().catch(e => { console.error(e); process.exit(1); });
