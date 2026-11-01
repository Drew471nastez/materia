/* Benefits Bar (sections/benefits-bar.storelib, static rules in
   shopify/assets/benefits-bar.css): the shared features-a checks
   (tests/theme-features-a-harness.cjs) plus its own: colours wait for Enable
   custom styling (the saved home page bar needs it on to keep its colours),
   the custom title font wins under the theme priority rules on the title and
   a <strong> in it, uploaded icons turn round, the phone slider steps with
   its arrows once per instance and again after a redraw, and the cleanup
   contract (cached CSS and JS, tests/theme-cleanup-sections-a.cjs) holds.
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-benefits-bar.cjs */
const {run, IMG, SVG} = require('./theme-features-a-harness.cjs');
const NAME = 'benefits-bar';
const raf = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const preset = () => require('./media-fixture.cjs').schemaOf(NAME).schema.presets[0].blocks.map(b => ({type: b.type, settings: {...b.settings}}));
run({
  name: NAME,
  assets: ['benefits-bar.css'],
  theme: {probes: [['.LoudzValueIconsBarBlock__Heading', 'h', 't']]},
  image: ['icon', 'custom_icon', '.LoudzValueIconsBarBlock__Icon img', {icon_type: 'upload'}],
  preBlock: {'icon.custom_icon': {icon_type: 'upload'}, 'icon.icon_type': {custom_icon: IMG}, 'icon.font_awesome': {icon_type: 'icon'}},
  values: {font_awesome: [SVG]},
  redrawOnly: ['icons_mobile_layout'], /* the slider is other markup: the builder draws the section again */
  both: ['icons_mobile_layout', 'vertical_gap_mobile'], /* the slider markup is there at every width; the row gap also spaces wrapped desktop rows (as the saved bar has it) */
  only: {bar_width: 1366, icons_per_row_desktop: 1366, horizontal_gap_desktop: 1366, icons_mobile_layout: 375},
  noEffect: ['enable_circle_icons', 'reveal'], /* round uploaded icons: checked below with a picture */
  async extra({browser, mount, ok, eq, prep, FONT}) {
    const assets = ['benefits-bar.css', 'live-features-a.js'];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const blocks = preset(); blocks[0].settings.icon_title = 'Fast <strong>dispatch</strong>';
      const t = await mount(browser, NAME, {width, editing, blocks, assets}); await prep(t);
      const f = async () => [await t.css('.LoudzValueIconsBarBlock__Heading', 'fontFamily'), await t.css('.LoudzValueIconsBarBlock__Heading strong', 'fontFamily')];
      if (editing) { await t.emit({enable_custom_fonts: true, body_font: FONT}); await raf(t); ok((await f()).every(x => /Verdana/.test(x)), `${NAME} ${width} live: the custom title font wins`); await t.emit({enable_custom_fonts: false}); await raf(t); ok((await f()).every(x => /Arial/.test(x)), `${NAME} ${width} live off: theme font`); }
      await t.redraw({settings: {enable_custom_fonts: true, body_font: FONT}}); ok((await f()).every(x => /Verdana/.test(x)), `${NAME} ${width} redraw: the custom title font wins`);
      await t.redraw({settings: {enable_custom_fonts: false}}); ok((await f()).every(x => /Arial/.test(x)), `${NAME} ${width} redraw off: theme font`);
      /* colours wait for the toggle, as on the saved home page bar */
      const saved = {section_background: '#122541', icon_color: '#fbfbfb', icon_title_color: '#ffffff'};
      await t.redraw({settings: saved});
      eq(await t.css('.LoudzValueIconsBarContainer', 'backgroundColor'), 'rgb(24, 32, 40)', `${NAME} ${width}: saved colours wait for the toggle`);
      await t.redraw({settings: {...saved, enable_custom_style: true}});
      eq([await t.css('.LoudzValueIconsBarContainer', 'backgroundColor'), await t.css('.LoudzValueIconsBarBlock__Heading', 'color')], ['rgb(18, 37, 65)', 'rgb(255, 255, 255)'], `${NAME} ${width}: saved colours with the toggle`);
      await t.redraw({settings: {enable_custom_style: true, section_background_style: 'gradient', section_gradient: 'linear-gradient(90deg, #ff0000, #0000ff)'}});
      ok(/linear-gradient/.test(await t.css('.LoudzValueIconsBarContainer', 'backgroundImage')), `${NAME} ${width}: gradient background`);
      await t.redraw({settings: {enable_custom_style: false}});
      /* round uploaded icons */
      const up = preset(); up[0].settings = {...up[0].settings, icon_type: 'upload', custom_icon: IMG};
      await t.redraw({blocks: up, settings: {enable_circle_icons: true}});
      eq(await t.css('.LoudzValueIconsBarBlock__IconWrapper', 'borderTopLeftRadius'), '50%', `${NAME} ${width}: uploaded icons are round`);
      if (editing) { await t.emit({enable_circle_icons: false}); await raf(t); eq(await t.css('.LoudzValueIconsBarBlock__IconWrapper', 'borderTopLeftRadius'), '0px', `${NAME} ${width}: square live`); }
      eq(t.errors, [], NAME + ' extra: no errors');
      await t.page.close();
    }
    /* phone slider */
    const settings = {icons_mobile_layout: 'slider'};
    const t = await mount(browser, NAME, {width: 375, settings, assets, instances: [{uid: 'test', settings}, {uid: 'two', settings}]}); await prep(t);
    const visible = uid => t.page.locator(`#shopify-section-${uid} .LoudzValueIconsBarBlock__Slide-IsVisible`).evaluateAll(l => l.map(e => e.dataset.blockId));
    eq(await visible('test'), ['test-b0'], NAME + ': the slider shows the first benefit');
    await t.page.locator('#shopify-section-test .LoudzValueIconsBarContainer__Btn--next').click();
    eq(await visible('test'), ['test-b1'], NAME + ': next shows the second');
    eq(await visible('two'), ['two-b0'], NAME + ': the other instance stays');
    await t.page.locator('#shopify-section-test .LoudzValueIconsBarContainer__Btn--prev').click(); await t.page.locator('#shopify-section-test .LoudzValueIconsBarContainer__Btn--prev').click();
    eq(await visible('test'), ['test-b3'], NAME + ': prev wraps round');
    ok(await t.page.locator('#shopify-section-test .LoudzValueIconsBarContainer__Btn--next').evaluate(e => e.getBoundingClientRect().width >= 44 && e.getBoundingClientRect().height >= 44), NAME + ': arrows are 44px targets');
    await t.redraw(); await t.redraw();
    await t.page.locator('#shopify-section-test .LoudzValueIconsBarContainer__Btn--next').click();
    eq(await visible('test'), ['test-b1'], NAME + ': after redraws one click steps once');
    ok(await t.noOverflow(), NAME + ': slider: no sideways scroll');
    eq(t.errors, [], NAME + ' slider: no errors');
    await t.page.close();
  },
});
