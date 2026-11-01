/* Brand logo (Logos and trust, round 4): shared sweep, header blocks and
   legacy header settings, logo pictures that never reload, and the carousel
   (arrows, dots, keyboard, loop, autoplay paused off screen and under reduced
   motion) per instance. */
const {run, IMG, IMG2, FONT} = require('./theme-logos-r4-lib.cjs');
const many = n => Array.from({length: n}, (_, i) => ({type: 'brand_items', settings: {image: i % 2 ? IMG2 : IMG, link: '/collections/brand-' + i}}));
run({
  name: 'brand-logo', button: false, heading: '.lg__heading',
  blockTypes: ['eyebrow', 'heading', 'subheading', 'button', 'brand_items'],
  baseBlocks: [{type: 'eyebrow', settings: {}}, {type: 'heading', settings: {text: 'Brands we stock'}}, {type: 'subheading', settings: {}}, {type: 'button', settings: {}}, ...many(8)],
  baseSettings: {show_arrow: true, carousel_pagination: 'show_dots'},
  addType: 'brand_items',
  values: {custom_ratio: '7:3'},
  hover: {'button.bg_hover': '.lg__btn', 'button.color_hover': '.lg__btn', 'button.border_color_hover': '.lg__btn'},
  addedEdit: {settings: {image: IMG2}, check: async (t, id, {eq}) => { eq((await t.page.locator('[data-lg-block="' + id + '"] img').getAttribute('src')).split('?')[0], IMG2.url); return 0; }},
  async extra({browser, mount, eq, ok}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'brand-logo ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'brand-logo', {width, editing, assets: ['live-logos.js'], settings: {show_arrow: true, carousel_pagination: 'show_dots', items_per_row: 4, items_per_row_mobile: 2}, blocks: [{type: 'heading', settings: {text: 'Our <strong>brands</strong>'}}, {type: 'subheading', settings: {text: '<p>Made <em>here</em></p>'}}, {type: 'button', settings: {label: 'See all', link: '/collections/all'}}, ...many(8)]});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const hId = t.blockId('heading'), bId = t.blockId('button'), first = t.blockId('brand_items');
      /* pictures never reload for unrelated edits */
      const img = await t.page.locator('[data-lg-block="' + first + '"] img').elementHandle();
      await t.emit({logo_opacity: 60, img_width: 120, framed: false, image_ratio: 'square'}); await t.emit({text: 'Our <strong>brands</strong> today'}, hId);
      eq(await img.evaluate(el => el.isConnected && el.getAttribute('src').split('?')[0]), IMG.url, where + ' logo picture kept for unrelated edits');
      await t.emit({link: ''}, first);
      eq(await t.page.locator('[data-lg-block="' + first + '"] .bl__link').evaluate(el => el.tagName), 'SPAN', where + ' a logo without a link is not a link');
      eq(await img.evaluate(el => el.isConnected), true, where + ' picture kept when the link is removed');
      await t.emit({link: '/collections/x'}, first);
      eq(await t.page.locator('[data-lg-block="' + first + '"] .bl__link').getAttribute('href'), '/collections/x', where + ' link back');
      eq(await t.page.locator('[data-lg-block="' + first + '"] .bl__link').getAttribute('target'), '_blank', where + ' new tab');
      await t.emit({open_link_newtab: false});
      eq(await t.page.locator('[data-lg-block="' + first + '"] .bl__link').getAttribute('target'), null, where + ' same tab');
      /* custom fonts and button shape win under the theme priority, live and after a redraw, and switch back */
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, btn) => { if (mode === 'live') { await t.emit(sec); await t.emit(btn, bId); } else { const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.id === bId ? {...b.settings, ...btn} : b.settings})); await t.redraw({settings: sec, blocks}); } };
        await apply({enable_custom_fonts: true, heading_font: FONT, body_font: FONT}, {use_theme_button: false, font_size: 20, radius: 3, padding_x: 40, font_weight: '700', enable_custom_style: true, bg: '#00ff00'});
        ok(/Courier New/.test(await sty('.lg__heading', 'fontFamily')) && /Courier New/.test(await sty('.lg__heading strong', 'fontFamily')), where + ' ' + mode + ' custom heading font on the h2 and a <strong>');
        eq(await sty('.lg__heading', 'fontWeight'), '300', where + ' ' + mode + ' custom heading weight (from the font) wins');
        ok(/Courier New/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' custom body font reaches the <p>');
        eq(await sty('.lg__btn', 'fontSize'), '20px', where + ' ' + mode + ' own button size wins');
        eq(await sty('.lg__btn', 'borderTopLeftRadius'), '3px', where + ' ' + mode + ' own button radius wins');
        eq(await sty('.lg__btn', 'paddingLeft'), '40px', where + ' ' + mode + ' own button padding wins');
        eq(await sty('.lg__btn', 'fontWeight'), '700', where + ' ' + mode + ' own button weight wins');
        eq(await sty('.lg__btn', 'backgroundColor'), 'rgb(0, 255, 0)', where + ' ' + mode + ' custom button colour');
        await apply({enable_custom_fonts: false}, {use_theme_button: true, enable_custom_style: false});
        ok(/Georgia/.test(await sty('.lg__heading', 'fontFamily')) && /Georgia/.test(await sty('.lg__heading strong', 'fontFamily')), where + ' ' + mode + ' theme heading font back');
        eq(await sty('.lg__heading', 'fontWeight'), '700', where + ' ' + mode + ' theme heading weight back');
        ok(/Arial/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' theme body font back');
        ok(await sty('.lg__btn', 'fontSize') !== '20px' && await sty('.lg__btn', 'borderTopLeftRadius') !== '3px', where + ' ' + mode + ' theme button shape back');
        eq(await sty('.lg__btn', 'backgroundColor'), 'rgb(18, 52, 86)', where + ' ' + mode + ' theme button colour back');
      }
      /* carousel: arrows, dots, keyboard, loop */
      const left = () => t.page.locator('#shopify-section-test .lgc__track').evaluate(el => el.scrollLeft);
      await t.page.locator('#shopify-section-test [data-lg-next]').click(); await t.page.waitForTimeout(700);
      ok(await left() > 0, where + ' next arrow scrolls');
      ok(await t.page.locator('#shopify-section-test [data-lg-dot][aria-current="true"]').getAttribute('data-lg-dot') !== '0', where + ' dot follows');
      await t.page.locator('#shopify-section-test [data-lg-dot="0"]').click(); await t.page.waitForTimeout(700);
      eq(await left(), 0, where + ' dot scrolls back');
      eq(await t.page.locator('#shopify-section-test [data-lg-prev]').getAttribute('aria-disabled'), 'true', where + ' prev disabled at start without loop');
      await t.emit({infinite: true}); await t.page.waitForTimeout(80);
      await t.page.locator('#shopify-section-test [data-lg-prev]').click(); await t.page.waitForTimeout(700);
      ok(await left() > 0, where + ' loop wraps to the end');
      await t.page.locator('#shopify-section-test .lgc__track').focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(700);
      eq(await left(), 0, where + ' keyboard right at the end wraps with loop');
      const box = await t.page.locator('#shopify-section-test [data-lg-next]').boundingBox();
      ok(box.width >= 44 && box.height >= 44, where + ' arrow target 44px');
      const dot = await t.page.locator('#shopify-section-test [data-lg-dot]').first().boundingBox();
      ok(dot.width >= 44 && dot.height >= 44, where + ' dot target 44px');
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    /* autoplay per instance, paused off screen, one timer after redraws */
    {
      const t = await mount(browser, 'brand-logo', {width: 1366, editing: false, assets: ['live-logos.js'], instances: [{uid: 'a', settings: {autoplay: true, autorotate_speed: 2, infinite: true}, blocks: many(10)}, {uid: 'b', settings: {autoplay: false}, blocks: many(10)}]});
      await t.page.waitForTimeout(2600);
      const leftOf = uid => t.page.locator('#shopify-section-' + uid + ' .lgc__track').evaluate(el => el.scrollLeft);
      ok(await leftOf('a') > 0, 'brand-logo autoplay advances');
      eq(await leftOf('b'), 0, 'brand-logo autoplay off in the other instance');
      for (let i = 0; i < 3; i++) await t.redraw({uid: 'a', settings: {autoplay: true, autorotate_speed: 2, infinite: true}});
      eq(await t.page.evaluate(() => [...window.MateriaLogos.roots.values()].filter(s => s.timer).length), 1, 'brand-logo one autoplay timer after redraws');
      await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
      await t.page.waitForTimeout(300);
      eq(await t.page.evaluate(() => [...window.MateriaLogos.roots.values()].filter(s => s.timer).length), 0, 'brand-logo autoplay stops off screen');
      eq(t.errors, [], 'brand-logo autoplay errors');
      await t.page.close();
    }
    /* legacy header settings show only without blocks; the saved home page instance keeps its look */
    {
      const t = await mount(browser, 'brand-logo', {width: 1366, assets: ['live-logos.js'], settings: {heading: 'Old heading', description: '<p>Old text</p>', show_view_all_button: true, view_all_button_link: '/collections/all'}, blocks: many(3)});
      eq(await t.page.locator('[data-lg-legacy="heading"]').textContent(), 'Old heading', 'brand-logo legacy heading without a heading block');
      eq(await t.page.locator('[data-lg-legacy="subheading"]').textContent(), 'Old text', 'brand-logo legacy description');
      eq(await t.page.locator('[data-lg-legacy="button"]').getAttribute('href'), '/collections/all', 'brand-logo legacy view all link');
      await t.redraw({blocks: [{type: 'heading', settings: {text: 'New'}}, {type: 'button', settings: {label: 'All'}}, ...many(3)]});
      eq(await t.page.locator('[data-lg-legacy]').count(), 0, 'brand-logo legacy header hidden once blocks exist');
      await t.page.close();
      const home = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../templates/home.json'), 'utf8')).sections.brand_logo_CnjyLc;
      const s = await mount(browser, 'brand-logo', {width: 1366, assets: ['live-logos.js'], settings: home.settings, blocks: []});
      eq(await s.page.locator('#shopify-section-test .lg-head').evaluate(el => getComputedStyle(el).display), 'none', 'brand-logo saved home instance (no heading, no logos) draws no header');
      eq(s.errors, [], 'brand-logo saved instance errors');
      await s.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
