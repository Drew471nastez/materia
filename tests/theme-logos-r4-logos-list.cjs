/* Logos list (Logos and trust, round 4): shared sweep, header blocks and
   legacy header settings, logos that never reload, arrow visibility per
   screen, custom colours and fonts under the theme priority, and the
   carousel per instance. */
const {run, IMG, IMG2, FONT} = require('./theme-logos-r4-lib.cjs');
const many = n => Array.from({length: n}, (_, i) => ({type: 'collection', settings: {logo_image: i % 2 ? IMG2 : IMG, collection_url: '/collections/partner-' + i}}));
run({
  name: 'logos-list', heading: '.lg__heading',
  blockTypes: ['eyebrow', 'heading', 'subheading', 'button', 'collection'],
  baseBlocks: [{type: 'eyebrow', settings: {}}, {type: 'heading', settings: {text: 'Our partners'}}, {type: 'subheading', settings: {}}, {type: 'button', settings: {}}, ...many(9)],
  baseSettings: {enable_navigation_arrows: true, arrow_visibility: 'both', carousel_pagination: 'show_dots'},
  addType: 'collection',
  values: {custom_ratio: '7:3'},
  hover: {collection_hover_animation: '.ll__link', 'button.bg_hover': '.lg__btn', 'button.color_hover': '.lg__btn', 'button.border_color_hover': '.lg__btn'},
  skipEveryControl: {enable_lazy_load: true},
  addedEdit: {settings: {logo_image: IMG2}, check: async (t, id, {eq}) => { eq((await t.page.locator('[data-lg-block="' + id + '"] img').getAttribute('src')).split('?')[0], IMG2.url); return 0; }},
  async extra({browser, mount, eq, ok}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'logos-list ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'logos-list', {width, editing, assets: ['live-logos.js'], settings: {enable_navigation_arrows: true, arrow_visibility: 'both'}, blocks: [{type: 'heading', settings: {text: 'Our <strong>partners</strong>'}}, {type: 'subheading', settings: {text: '<p>Made <em>here</em></p>'}}, {type: 'button', settings: {label: 'See all', link: '/collections/all'}}, ...many(9)]});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const bId = t.blockId('button'), first = t.blockId('collection');
      const img = await t.page.locator('[data-lg-block="' + first + '"] img').elementHandle();
      await t.emit({image_width_desktop: 200, image_width_mobile: 80, image_ratio: 'square', rounded_image: true, padding_left: 10});
      await t.emit({collection_url: '/collections/other'}, first);
      eq(await img.evaluate(el => el.isConnected && el.getAttribute('src').split('?')[0]), IMG.url, where + ' logo picture kept for unrelated edits');
      eq(await t.page.locator('[data-lg-block="' + first + '"] .ll__link').getAttribute('href'), '/collections/other', where + ' link live');
      await t.emit({enable_lazy_load: true});
      eq(await img.getAttribute('loading'), 'lazy', where + ' lazy load on');
      await t.emit({enable_lazy_load: false});
      eq(await img.getAttribute('loading'), null, where + ' lazy load off');
      /* arrows per screen */
      for (const [v, shown] of [['both', true], ['desktop_only', width >= 768], ['mobile_only', width < 768], ['hide', false]]) {
        await t.emit({arrow_visibility: v});
        eq(await t.page.locator('#shopify-section-test [data-lg-next]').isVisible(), shown, where + ' arrows ' + v);
      }
      await t.emit({arrow_visibility: 'both', enable_custom_style: true, arrow_bg_color: '#00ff00', arrow_icon_color: '#0000ff'});
      eq(await t.page.locator('#shopify-section-test [data-lg-next]').evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(0, 255, 0)', where + ' custom arrow background');
      eq(await sty('[data-lg-next]', 'color'), 'rgb(0, 0, 255)', where + ' custom arrow icon');
      await t.emit({enable_custom_style: false});
      eq(await sty('[data-lg-next]', 'color'), 'rgb(255, 255, 255)', where + ' theme arrow icon back');
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, btn) => { if (mode === 'live') { await t.emit(sec); await t.emit(btn, bId); } else { const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.id === bId ? {...b.settings, ...btn} : b.settings})); await t.redraw({settings: sec, blocks}); } };
        await apply({enable_custom_fonts: true, heading_font: FONT, body_font: FONT}, {use_theme_button: false, font_size: 19, radius: 2, padding_y: 9, font_weight: '500'});
        ok(/Courier New/.test(await sty('.lg__heading', 'fontFamily')) && /Courier New/.test(await sty('.lg__heading strong', 'fontFamily')), where + ' ' + mode + ' custom heading font on h2 and <strong>');
        ok(/Courier New/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' custom body font on the <p>');
        eq(await sty('.lg__heading', 'fontWeight'), '300', where + ' ' + mode + ' heading weight from the custom font');
        eq(await sty('.lg__btn', 'fontSize'), '19px', where + ' ' + mode + ' own button size');
        eq(await sty('.lg__btn', 'borderTopLeftRadius'), '2px', where + ' ' + mode + ' own button radius');
        eq(await sty('.lg__btn', 'paddingTop'), '9px', where + ' ' + mode + ' own button padding');
        eq(await sty('.lg__btn', 'fontWeight'), '500', where + ' ' + mode + ' own button weight');
        await apply({enable_custom_fonts: false}, {use_theme_button: true});
        ok(/Georgia/.test(await sty('.lg__heading', 'fontFamily')) && /Arial/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' theme fonts back');
        eq(await sty('.lg__heading', 'fontWeight'), '700', where + ' ' + mode + ' theme weight back');
        ok(await sty('.lg__btn', 'fontSize') !== '19px', where + ' ' + mode + ' theme button size back');
      }
      const left = () => t.page.locator('#shopify-section-test .lgc__track').evaluate(el => el.scrollLeft);
      await t.page.locator('#shopify-section-test [data-lg-next]').click(); await t.page.waitForTimeout(700);
      ok(await left() > 0, where + ' next arrow scrolls');
      await t.page.locator('#shopify-section-test [data-lg-prev]').click(); await t.page.waitForTimeout(700);
      eq(await left(), 0, where + ' prev arrow scrolls back');
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      const t = await mount(browser, 'logos-list', {width: 1366, assets: ['live-logos.js'], settings: {heading: 'Old partners', header_size_slider: 40, font_weight: 'body_weight', show_view_all_button: true, view_all_text: 'All', view_all_url: '/pages/partners'}, blocks: many(3)});
      eq(await t.page.locator('[data-lg-legacy="heading"]').textContent(), 'Old partners', 'logos-list legacy heading');
      eq(await t.css('[data-lg-legacy="heading"]', 'fontSize'), '40px', 'logos-list legacy heading size');
      eq(await t.css('[data-lg-legacy="heading"]', 'fontWeight'), '400', 'logos-list legacy heading weight wins');
      eq(await t.page.locator('[data-lg-legacy="button"]').getAttribute('href'), '/pages/partners', 'logos-list legacy view all link');
      await t.redraw({blocks: [{type: 'heading', settings: {text: 'New'}}, {type: 'button', settings: {label: 'All'}}, ...many(3)]});
      eq(await t.page.locator('[data-lg-legacy]').count(), 0, 'logos-list legacy header hidden once blocks exist');
      eq(t.errors, [], 'logos-list legacy errors');
      await t.page.close();
    }
    {
      const t = await mount(browser, 'logos-list', {width: 1366, editing: false, assets: ['live-logos.js'], instances: [{uid: 'a', settings: {autoplay: true, autorotate_speed: 2, infinite: true}, blocks: many(12)}, {uid: 'b', settings: {autoplay: false}, blocks: many(12)}]});
      await t.page.waitForTimeout(2600);
      const leftOf = uid => t.page.locator('#shopify-section-' + uid + ' .lgc__track').evaluate(el => el.scrollLeft);
      ok(await leftOf('a') > 0, 'logos-list autoplay advances');
      eq(await leftOf('b'), 0, 'logos-list other instance stays');
      await t.emit({autoplay: false}, undefined, 'a'); await t.page.waitForTimeout(80);
      eq(await t.page.evaluate(() => [...window.MateriaLogos.roots.values()].filter(s => s.timer).length), 0, 'logos-list autoplay off live stops the timer');
      eq(t.errors, [], 'logos-list autoplay errors');
      await t.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
