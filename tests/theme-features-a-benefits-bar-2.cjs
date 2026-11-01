/* Benefits Bar 2 (sections/benefits-bar-2.storelib): the shared features-a
   checks (tests/theme-features-a-harness.cjs) plus its own: custom fonts,
   title letter spacing and uppercase win under the theme priority rules
   (on the title, its text and the description), each block's colours wait
   for its own toggle, the phone carousel autoplays once per instance, stops
   when held, off screen, in a hidden tab and under reduced motion, and keeps
   running through unrelated edits.
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-benefits-bar-2.cjs */
const {run, IMG, SVG} = require('./theme-features-a-harness.cjs');
const NAME = 'benefits-bar-2';
const raf = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
run({
  name: NAME,
  theme: {probes: [['.bb2__title', 'h'], ['.bb2__desc', 't']]},
  image: ['item', 'image', '.bb2__icon img', {icon_source: 'image'}],
  preBlock: {'item.image': {icon_source: 'image'}, 'item.icon_source': {image: IMG, svg_code: SVG}},
  pre: {mobile_items_per_view: {enable_mobile_carousel: true}},
  only: {cols_desktop: 1366, gap_desktop: 1366, col_gap_desktop: 1366, show_dividers: 1366, cols_mobile: 375, gap_mobile: 375, col_gap_mobile: 375, enable_mobile_carousel: 375, mobile_items_per_view: 375},
  both: ['enable_mobile_carousel'], /* the carousel's list takes focus (tabindex) at every width */
  noEffect: ['carousel_autoplay', 'carousel_autoplay_speed', 'reveal'], /* timing only: checked below; reveal is the theme's scroll animation */
  async extra({browser, mount, ASSET, ok, eq, prep, FONT, MONO}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await mount(browser, NAME, {width, editing, assets: [ASSET], settings: {title_letter_spacing: 3, title_uppercase: true}}); await prep(t);
      const probe = async () => ({ti: await t.css('.bb2__title', 'fontFamily'), de: await t.css('.bb2__desc', 'fontFamily'), ls: await t.css('.bb2__title', 'letterSpacing'), tt: await t.css('.bb2__title', 'textTransform')});
      let p = await probe();
      eq([p.ls, p.tt], ['3px', 'uppercase'], `${NAME} ${width}: letter spacing and uppercase win over the theme heading rule`);
      const on = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO};
      if (editing) {
        await t.emit(on); await raf(t); p = await probe();
        ok(/Verdana/.test(p.ti) && /Courier New/.test(p.de), `${NAME} ${width} live: custom fonts win (${JSON.stringify(p)})`);
        await t.emit({enable_custom_fonts: false, title_uppercase: false, title_letter_spacing: 0}); await raf(t); p = await probe();
        ok(/Georgia/.test(p.ti) && /Arial/.test(p.de) && p.tt === 'none' && p.ls === 'normal', `${NAME} ${width} live off: theme back (${JSON.stringify(p)})`);
      }
      await t.redraw({settings: on}); p = await probe();
      ok(/Verdana/.test(p.ti) && /Courier New/.test(p.de), `${NAME} ${width} redraw: custom fonts win`);
      await t.redraw({settings: {enable_custom_fonts: false, title_uppercase: false, title_letter_spacing: 0}}); p = await probe();
      ok(/Georgia/.test(p.ti) && /Arial/.test(p.de) && p.tt === 'none' && p.ls === 'normal', `${NAME} ${width} redraw off: theme back (${JSON.stringify(p)})`);
      /* a block's colours wait for its own toggle */
      const blocks = t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, title_color: '#ff0000', icon_color: '#00ff00'}}));
      await t.redraw({blocks});
      eq(await t.css('.bb2__title', 'color'), 'rgb(255, 255, 255)', `${NAME} ${width}: block colours wait for the toggle`);
      blocks[0].settings.enable_custom_style = true; await t.redraw({blocks});
      eq([await t.css('.bb2__title', 'color'), await t.css('.bb2__icon', 'color')], ['rgb(255, 0, 0)', 'rgb(0, 255, 0)'], `${NAME} ${width}: block colours with the toggle`);
      eq(t.errors, [], NAME + ' extra: no errors');
      await t.page.close();
    }
    /* phone carousel autoplay */
    const settings = {enable_mobile_carousel: true, carousel_autoplay: true, carousel_autoplay_speed: 2, mobile_items_per_view: 1};
    const t = await mount(browser, NAME, {width: 375, assets: [ASSET], settings, instances: [{uid: 'test', settings}, {uid: 'two', settings}]}); await prep(t);
    const left = (uid = 'test') => t.page.locator(`#shopify-section-${uid} .bb2__grid`).evaluate(e => e.scrollLeft);
    const timers = () => t.page.evaluate(() => [...window.MateriaFeaturesA.roots.values()].filter(s => s.timer).length);
    eq(await timers(), 2, NAME + ': one autoplay timer per instance');
    await t.page.waitForTimeout(2600);
    ok(await left() > 0 && await left('two') > 0, NAME + ': autoplay moves both carousels');
    await t.emit({title_size: 20}); await t.emit({padding_top_mobile: 40});
    eq(await timers(), 2, NAME + ': unrelated edits keep the timers');
    await t.redraw(); await t.redraw();
    eq(await timers(), 2, NAME + ': redraws keep one timer per instance');
    await t.emit({carousel_autoplay: false}); await raf(t);
    eq(await timers(), 1, NAME + ': autoplay off stops this instance only');
    await t.page.locator('#shopify-section-two .bb2__grid').dispatchEvent('pointerdown');
    eq(await timers(), 0, NAME + ': holding the carousel stops it');
    await t.page.locator('#shopify-section-two .bb2__grid').dispatchEvent('pointerup');
    eq(await timers(), 1, NAME + ': letting go starts it again');
    await t.page.setViewportSize({width: 1000, height: 900}); await t.page.waitForTimeout(100);
    eq(await timers(), 0, NAME + ': no autoplay on a wide screen');
    eq(t.errors, [], NAME + ' autoplay: no errors');
    await t.page.close();
    const r = await mount(browser, NAME, {width: 375, assets: [ASSET], settings, reducedMotion: 'reduce'}); await prep(r);
    await r.page.waitForTimeout(2300);
    eq(await r.page.evaluate(() => [...window.MateriaFeaturesA.roots.values()].filter(s => s.timer).length), 0, NAME + ': reduced motion: no autoplay');
    eq(await r.page.locator('.bb2__grid').evaluate(e => e.scrollLeft), 0, NAME + ': reduced motion: the carousel stays put');
    await r.page.close();
  },
});
