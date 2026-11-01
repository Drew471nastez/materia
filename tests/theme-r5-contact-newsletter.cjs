/* Round 5, Contact group: Newsletter (sections/newsletter.storelib), run by
   shopify/assets/live-contact.js. The shared checks are in
   tests/theme-r5-contact-lib.cjs; this file adds the section's own: the
   sign-up keeps the store's customer form with data-storelib-form="subscribe"
   and the words materia-forms.js reads (live), the email field labelled,
   the icon, background image and overlay, the content box, both layouts,
   Match theme fields and Match theme button, and the older Heading and
   Description settings while there are no blocks. The sign-up states
   themselves are tests/theme-newsletter-round5.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-r5-contact-newsletter.cjs */
const fs = require('fs'), path = require('path');
const L = require('./theme-r5-contact-lib.cjs');
const {ok, eq, FONT, IMG} = L;
const name = 'newsletter';
(async () => {
  const raw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8'), tpl = raw.split('<schema>')[0];
  ok(/\{%- form 'customer'[^%]*data-storelib-form: 'subscribe'/.test(tpl) && /name="contact\[email\]"/.test(tpl) && /data-mt-words/.test(tpl), 'the sign-up keeps the customer form, data-storelib-form="subscribe" and its words');
  const r = await L.suite(name, {
    structural: ['background_image', 'custom_icon_image'],
    noop: {375: ['header_size'], 1366: []},
    same: {375: [['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width']]},
    twoInstances: {padding_top: 90, btn_text: 'Only a'},
    blockEdit: ['heading', {text: 'Only in a'}],
    extraBlock: ['heading', {text: 'Second heading'}, {text: 'Changed live', size_enable: true, size_desktop: 70}],
    theme: async (t, {ok, css, tag}) => {
      ok(/Georgia/.test(await css('h2', 'fontFamily')) && await css('h2', 'color') === 'rgb(255, 255, 255)', tag + ': heading in the theme font and colour');
      ok(/Arial/.test(await css('.ct-s', 'fontFamily')) && /Arial/.test(await css('.subcribe-input', 'fontFamily')), tag + ': text and field in the theme body font');
      ok(await css('.subcribe-button', 'backgroundColor') === 'rgb(18, 52, 86)', tag + ': the theme button');
      await t.page.hover('#shopify-section-test .subcribe-button'); await t.page.waitForTimeout(80);
      ok(await css('.subcribe-button', 'backgroundColor') === 'rgb(255, 0, 0)', tag + ': the theme button hover');
      await t.page.mouse.move(0, 0);
    },
    priority: [
      {name: 'heading font, weight and size', blocks: {heading: {enable_custom_fonts: true, font: FONT, weight_enable: true, weight: '300', size_enable: true, size_desktop: 58, size_mobile: 30, line_height: 1.5, tracking: 1, text: 'Join <em>the</em> list'}},
        checks: [['h2', 'fontFamily', /Verdana/], ['h2 em', 'fontFamily', /Verdana/], ['h2', 'fontWeight', '300'], ['h2', 'fontSize', w => w < 768 ? '30px' : '58px'], ['h2', 'letterSpacing', '1px']],
        off: {blocks: {heading: {enable_custom_fonts: false, weight_enable: false, size_enable: false}}}},
      {name: 'subheading font, weight and size', base: {blocks: {subheading: {text: '<p>News <strong>now and then</strong></p>'}}}, blocks: {subheading: {enable_custom_fonts: true, font: FONT, weight_enable: true, weight: '600', size_enable: true, size: 20, line_height: 2}},
        checks: [['.ct-s strong', 'fontFamily', /Verdana/], ['.ct-s p', 'fontWeight', '600'], ['.ct-s p', 'fontSize', '20px'], ['.ct-s p', 'lineHeight', '40px']],
        off: {blocks: {subheading: {enable_custom_fonts: false, weight_enable: false, size_enable: false}}}},
      {name: 'section fonts reach the field, button and note', section: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: FONT},
        checks: [['h2', 'fontFamily', /Courier New/], ['.subcribe-input', 'fontFamily', /Verdana/], ['.subcribe-button', 'fontFamily', /Verdana/], ['.newsletter-note p, .newsletter-note', 'fontFamily', /Verdana/]], off: {section: {enable_custom_fonts: false}}},
      {name: 'button shape', section: {use_theme_button: false, button_radius: 2, button_size: 20, button_pad_x: 44, button_pad_y: 6},
        checks: [['.subcribe-button', 'borderTopLeftRadius', '2px'], ['.subcribe-button', 'fontSize', '20px'], ['.subcribe-button', 'paddingLeft', '44px']], off: {section: {use_theme_button: true}}},
      {name: 'field shape and colours', section: {use_theme_fields: false, field_radius: 20, field_height: 64, field_bg: '#00ff00', field_border: '#0000ff', field_text: '#ff00ff'},
        checks: [['.subcribe-input', 'borderTopLeftRadius', '20px'], ['.subcribe-input', 'height', '64px'], ['.subcribe-input', 'backgroundColor', 'rgb(0, 255, 0)'], ['.subcribe-input', 'borderTopColor', 'rgb(0, 0, 255)'], ['.subcribe-input', 'color', 'rgb(255, 0, 255)']], off: {section: {use_theme_fields: true}}},
      {name: 'button colours', section: {enable_custom_style: true, button_bg: '#00ff00', button_text: '#000000'},
        checks: [['.subcribe-button', 'backgroundColor', 'rgb(0, 255, 0)'], ['.subcribe-button', 'color', 'rgb(0, 0, 0)']], off: {section: {enable_custom_style: false}}},
    ],
    extra: async (browser, {ok, eq, opts, frames, audit}) => {
      /* the words materia-forms.js shows, live */
      const t = await L.mount(browser, name, opts({width: 375}));
      await t.emit({success_text: 'Welcome in.', invalid_text: 'Check the address.', success_duration: 9, email_label: 'Your email'}); await frames(t.page);
      const w = await t.page.evaluate(() => { const s = document.querySelector('#shopify-section-test [data-mt-words]'); return [s.dataset.successMessage, s.dataset.invalidMessage, s.dataset.successMs, document.querySelector('#shopify-section-test label[for^="NewsletterEmail-"]').textContent]; });
      eq(w, ['Welcome in.', 'Check the address.', '9000', 'Your email'], 'messages and the email label live');
      await t.emit({show_icon: true, icon: 'bell', icon_size: 64}); await frames(t.page);
      ok(await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-test [data-nl-icon]'); return !i.hidden && i.querySelector('svg').getBoundingClientRect().width === 64 && /M13\.7 21/.test(i.innerHTML); }), 'the icon shows, changes and grows live');
      eq(await audit(t.page, 'test'), [], 'messages and icon: audit');
      await t.page.screenshot({path: path.join(process.env.SHOTS || '/tmp', 'r5-newsletter-375.png'), fullPage: true}).catch(() => {});
      await t.page.close();
      /* background picture with its overlay; the content box */
      const b = await L.mount(browser, name, opts({width: 1366, editing: false, settings: {background_image: IMG, bg_overlay_opacity: 40, bg_overlay_color: '#102030', show_content_background: true, content_box_opacity: 80}}));
      const bg = await b.page.evaluate(() => { const W = document.getElementById('shopify-section-test'), o = W.querySelector('[data-nl-overlay]'), box = W.querySelector('[data-nl-box]'); return {img: !!W.querySelector('img'), ov: getComputedStyle(o).opacity, ovc: getComputedStyle(o).backgroundColor, box: getComputedStyle(box, '::before').opacity}; });
      ok(bg.img && bg.ov === '0.4' && bg.ovc === 'rgb(16, 32, 48)' && bg.box === '0.8', 'background picture, overlay and content box: ' + JSON.stringify(bg));
      await b.emit({bg_overlay_opacity: 10}); await frames(b.page);
      ok(await b.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test [data-nl-overlay]')).opacity === '0.1'), 'overlay opacity live');
      await b.page.close();
      /* older settings, no blocks (the footer-like use and pages saved before the blocks) */
      const lg = await L.mount(browser, name, opts({width: 1366, blocks: [], settings: {heading: 'Old heading', description: '<p>Old text</p>'}}));
      ok(await lg.page.evaluate(() => { const W = document.getElementById('shopify-section-test'); return W.querySelector('h2').textContent.trim() === 'Old heading' && W.querySelector('[data-ct-legacy="description"]').textContent.trim() === 'Old text'; }), 'legacy heading and description without blocks');
      await lg.emit({heading: ''}); await frames(lg.page);
      ok(await lg.page.evaluate(() => document.querySelector('#shopify-section-test [data-ct-legacy="heading"]').parentElement.hidden), 'an emptied legacy heading hides live');
      await lg.page.close();
    },
  });
  console.log(L.count() + ' Newsletter checks passed (controls live ' + r.covered.live + ', after redraw ' + r.covered.redraw + ', option pairs ' + r.covered.options + ')');
})().catch(e => { console.error(e); process.exit(1); });
