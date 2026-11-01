/* Payment icons (Logos and trust, round 4): shared sweep, header blocks and
   legacy headline settings, payment switches, custom colours, fonts and the
   heading line height under the theme priority, live and after a redraw. */
const {run, FONT} = require('./theme-logos-r4-lib.cjs');
run({
  name: 'payment-icons1', bp: 801, heading: '.lg__heading', text: '.lg__sub p',
  blockTypes: ['eyebrow', 'heading', 'subheading', 'button'],
  baseBlocks: [{type: 'eyebrow', settings: {}}, {type: 'heading', settings: {text: 'Trusted payments'}}, {type: 'subheading', settings: {text: '<p>Pay with the method you already use.</p>'}}, {type: 'button', settings: {}}],
  addType: 'subheading',
  hover: {'button.bg_hover': '.lg__btn', 'button.color_hover': '.lg__btn', 'button.border_color_hover': '.lg__btn'},
  samePairs: ['headline_line_height:1.2=inherit', 'text_line_height:1.5=inherit'],
  addedEdit: {settings: {text: '<p>Added line</p>'}, check: async (t, id, {eq}) => { eq(await t.page.locator('[data-lg-block="' + id + '"]').textContent(), 'Added line'); return 0; }},
  async extra({browser, mount, eq, ok}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'payment icons ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'payment-icons1', {width, editing, assets: ['live-logos.js'], blocks: [{type: 'heading', settings: {text: 'Trusted <strong>payments</strong>'}}, {type: 'subheading', settings: {text: '<p>Pay <em>your</em> way</p>'}}]});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      for (const mode of ['live', 'redraw']) {
        const apply = async sec => { if (mode === 'live') await t.emit(sec); else await t.redraw({settings: sec}); };
        await apply({override_fonts: true, headline_font: FONT, text_font: FONT, headline_line_height: '1.6', text_line_height: '1.0'});
        ok(/Courier New/.test(await sty('.lg__heading', 'fontFamily')) && /Courier New/.test(await sty('.lg__heading strong', 'fontFamily')), where + ' ' + mode + ' custom heading font on h2 and <strong>');
        ok(/Courier New/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' custom body font on the <p>');
        eq(await sty('.lg__heading', 'fontWeight'), '300', where + ' ' + mode + ' custom font weight');
        const fs = parseFloat(await sty('.lg__heading', 'fontSize'));
        eq(await sty('.lg__heading', 'lineHeight'), (fs * 1.6).toFixed(1).replace(/\.0$/, '') + 'px', where + ' ' + mode + ' own heading line height wins');
        const ts = parseFloat(await sty('.lg__sub p', 'fontSize'));
        eq(await sty('.lg__sub p', 'lineHeight'), ts + 'px', where + ' ' + mode + ' subheading line height');
        await apply({override_fonts: false, headline_line_height: 'inherit', text_line_height: 'inherit'});
        ok(/Georgia/.test(await sty('.lg__heading', 'fontFamily')) && /Georgia/.test(await sty('.lg__heading strong', 'fontFamily')) && /Arial/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' theme fonts back');
        eq(await sty('.lg__heading', 'lineHeight'), (fs * 1.2).toFixed(1).replace(/\.0$/, '') + 'px', where + ' ' + mode + ' theme heading line height back');
      }
      await t.emit({enable_custom_style: true, section_background_color: '#123456', text_color: '#ff0000'});
      eq(await sty('[data-lg-root]', 'backgroundColor'), 'rgb(18, 52, 86)', where + ' custom background');
      eq(await sty('.lg__heading', 'color'), 'rgb(255, 0, 0)', where + ' custom text colour on the heading');
      eq(await sty('.lg__sub p', 'color'), 'rgb(255, 0, 0)', where + ' custom text colour on the <p>');
      await t.emit({enable_custom_style: false});
      eq(await sty('[data-lg-root]', 'backgroundColor'), 'rgb(24, 32, 40)', where + ' theme background back');
      await t.emit({show_visa: false, show_shop_pay: true});
      eq(await t.page.locator('[data-lg-pay="visa"]').isVisible(), false, where + ' visa off');
      eq(await t.page.locator('[data-lg-pay="shop_pay"]').isVisible(), true, where + ' shop pay on');
      eq(await sty('[data-lg-pay="mastercard"]', 'height'), width < 801 ? '29px' : '40px', where + ' icon height');
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      const t = await mount(browser, 'payment-icons1', {width: 1366, assets: ['live-logos.js'], settings: {headline: 'We take', text: 'All cards', headline_size: 40, text_size: 18}, blocks: []});
      eq(await t.page.locator('[data-lg-legacy="heading"]').textContent(), 'We take', 'payment icons legacy headline');
      eq(await t.css('[data-lg-legacy="heading"]', 'fontSize'), '40px', 'payment icons legacy headline size');
      eq(await t.css('[data-lg-legacy="subheading"] p', 'fontSize'), '18px', 'payment icons legacy text size');
      await t.redraw({blocks: [{type: 'heading', settings: {text: 'New'}}]});
      eq(await t.page.locator('[data-lg-legacy="heading"]').count(), 0, 'payment icons legacy headline hidden with a heading block');
      eq(t.errors, [], 'payment icons legacy errors');
      await t.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
