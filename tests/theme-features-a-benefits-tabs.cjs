/* Benefits Tabs (sections/benefits-tabs.storelib): the shared features-a
   checks (tests/theme-features-a-harness.cjs) plus its own: the cards open
   and close by click and keyboard (Enter, Space) with the fold animation,
   one instance at a time, at once under reduced motion, and without the
   script as plain <details>; custom fonts and the heading's own weight win
   under the theme priority rules; the button follows Theme settings >
   Buttons until its own colours or its own size and shape are switched on,
   and those win over the shared button rules, live and on a redraw.
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-benefits-tabs.cjs */
const {run, IMG, SVG} = require('./theme-features-a-harness.cjs');
const NAME = 'benefits-tabs';
const raf = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const preset = () => require('./media-fixture.cjs').schemaOf(NAME).schema.presets[0].blocks.map(b => ({type: b.type, settings: {...b.settings}}));
run({
  name: NAME,
  blocks: () => [{type: 'top_icon'}, ...preset()],
  theme: {probes: [['.btab__heading', 'h'], ['.btab__sub', 't'], ['.btab__title', 'h']]},
  image: ['tab', 'image', '.btab__icon img', {icon_source: 'image'}],
  preBlock: {'tab.image': {icon_source: 'image'}, 'tab.icon_source': {image: IMG, svg_code: SVG}, 'top_icon.size': {image: IMG}},
  only: {cols_desktop: 1366, tab_gap_desktop: 1366, cols_mobile: 375, tab_gap: 375},
  noEffect: ['reveal'],
  settle: {open_first_by_default: 600},
  async extra({browser, mount, ASSET, ok, eq, prep, FONT, MONO}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await mount(browser, NAME, {width, editing, assets: [ASSET], instances: [{uid: 'test'}, {uid: 'two'}]}); await prep(t);
      const item = (n = 0, uid = 'test') => t.page.locator(`#shopify-section-${uid} details.btab__item`).nth(n);
      const isOpen = (n, uid) => item(n, uid).evaluate(e => e.open);
      const h = n => item(n).evaluate(e => e.querySelector('.btab__panel').getBoundingClientRect().height);
      ok(!(await isOpen(0)), `${NAME} ${width}: tabs start closed`);
      await item(0).locator('summary').click(); await t.page.waitForTimeout(80);
      ok(await isOpen(0), `${NAME} ${width}: a click opens a tab`);
      const mid = await h(0); await t.page.waitForTimeout(600); const full = await h(0);
      ok(full > 0 && mid < full, `${NAME} ${width}: the tab unfolds (${mid} -> ${full})`);
      ok(!(await isOpen(0, 'two')), `${NAME} ${width}: the other instance stays closed`);
      await item(0).locator('summary').click(); await t.page.waitForTimeout(80);
      ok(await isOpen(0) && await h(0) < full, `${NAME} ${width}: closing folds first`);
      await t.page.waitForTimeout(650);
      ok(!(await isOpen(0)), `${NAME} ${width}: then closes`);
      await item(1).locator('summary').focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(600);
      ok(await isOpen(1), `${NAME} ${width}: Enter opens a tab`);
      await t.page.keyboard.press(' '); await t.page.waitForTimeout(700);
      ok(!(await isOpen(1)), `${NAME} ${width}: Space closes it`);
      ok(await item(1).locator('summary').evaluate(e => e.getBoundingClientRect().height >= 44), `${NAME} ${width}: a tab is at least 44px tall`);
      /* redraw sets the click up once */
      await t.redraw(); await t.redraw();
      await item(2).locator('summary').click(); await t.page.waitForTimeout(600);
      ok(await isOpen(2), `${NAME} ${width}: after redraws one click still opens (no double toggle)`);
      /* fonts */
      const probe = async () => ({h: await t.css('.btab__heading', 'fontFamily'), s: await t.css('.btab__sub', 'fontFamily'), ti: await t.css('.btab__title', 'fontFamily'), d: await t.css('.btab__desc', 'fontFamily')});
      const on = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, yes = p => /Verdana/.test(p.h) && /Verdana/.test(p.ti) && /Courier New/.test(p.s) && /Courier New/.test(p.d), no = p => /Georgia/.test(p.h) && /Georgia/.test(p.ti) && /Arial/.test(p.s) && /Arial/.test(p.d);
      if (editing) { await t.emit(on); await raf(t); ok(yes(await probe()), `${NAME} ${width} live: custom fonts win`); await t.emit({enable_custom_fonts: false}); await raf(t); ok(no(await probe()), `${NAME} ${width} live off: theme fonts`); }
      await t.redraw({settings: on}); ok(yes(await probe()), `${NAME} ${width} redraw: custom fonts win`); await t.redraw({settings: {enable_custom_fonts: false}}); ok(no(await probe()), `${NAME} ${width} redraw off: theme fonts`);
      /* heading weight */
      const hid = t.blockId('heading');
      eq(await t.css('.btab__heading', 'fontWeight'), '700', `${NAME} ${width}: heading weight follows the theme`);
      const blocksW = preset(); blocksW[0].settings = {enable_custom_style: true, weight: '300', color: '#ff0000'};
      if (editing) { await t.emit({enable_custom_style: true, weight: '300', color: '#ff0000'}, hid); await raf(t); eq([await t.css('.btab__heading', 'fontWeight'), await t.css('.btab__heading', 'color')], ['300', 'rgb(255, 0, 0)'], `${NAME} ${width} live: own weight and colour win`); }
      await t.redraw({blocks: blocksW}); eq([await t.css('.btab__heading', 'fontWeight'), await t.css('.btab__heading', 'color')], ['300', 'rgb(255, 0, 0)'], `${NAME} ${width} redraw: own weight and colour win`);
      await t.redraw({blocks: preset()});
      /* button */
      const cid = t.blockId('cta'), btn = () => t.page.locator('#shopify-section-test .btab__cta');
      const shape = () => btn().evaluate(e => { const c = getComputedStyle(e); return [c.paddingLeft, c.paddingTop, c.borderTopLeftRadius, c.fontSize, c.backgroundColor]; });
      eq(await shape(), ['24px', '12px', '12px', '16px', 'rgb(18, 52, 86)'], `${NAME} ${width}: the button follows Theme settings > Buttons`);
      const own = {use_theme_button: false, pad_x: 40, pad_y: 20, radius: 3, size: 19, enable_custom_style: true, bg: '#00ff00'};
      if (editing) { await t.emit(own, cid); await raf(t); eq(await shape(), ['40px', '20px', '3px', '19px', 'rgb(0, 255, 0)'], `${NAME} ${width} live: own button shape and colour win`); ok(await btn().evaluate(e => e.hasAttribute('data-own-shape')), `${NAME}: data-own-shape live`); await t.emit({use_theme_button: true, enable_custom_style: false}, cid); await raf(t); eq(await shape(), ['24px', '12px', '12px', '16px', 'rgb(18, 52, 86)'], `${NAME} ${width} live off: theme button back`); }
      const bl = preset(); bl[bl.length - 1].settings = own; await t.redraw({blocks: bl});
      eq(await shape(), ['40px', '20px', '3px', '19px', 'rgb(0, 255, 0)'], `${NAME} ${width} redraw: own button shape and colour win`);
      await btn().hover(); await t.page.waitForTimeout(400);
      eq(await btn().evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(68, 68, 68)', `${NAME} ${width}: own hover colour`);
      eq(await btn().evaluate(e => [e.tagName, e.getAttribute('type')]), ['BUTTON', 'button'], `${NAME}: a button without a link is a <button>`);
      if (editing) { await t.emit({link: '/pages/x'}, cid); await raf(t); eq(await btn().evaluate(e => [e.tagName, e.getAttribute('href')]), ['A', '/pages/x'], `${NAME}: a link makes it a link, live`); }
      eq(t.errors, [], NAME + ' extra: no errors');
      await t.page.close();
    }
    /* reduced motion: at once; without the script: native details */
    const r = await mount(browser, NAME, {width: 375, assets: [ASSET], reducedMotion: 'reduce'}); await prep(r);
    await r.page.locator('details.btab__item summary').first().click(); await r.page.waitForTimeout(30);
    ok(await r.page.locator('details.btab__item').first().evaluate(e => e.open && e.querySelector('.btab__desc').getBoundingClientRect().height > 0), NAME + ': reduced motion opens at once');
    await r.page.close();
    const n = await mount(browser, NAME, {width: 375, assets: []}); await prep(n);
    await n.page.locator('details.btab__item summary').first().click(); await n.page.waitForTimeout(30);
    ok(await n.page.locator('details.btab__item').first().evaluate(e => e.open && e.querySelector('.btab__desc').getBoundingClientRect().height > 0), NAME + ': without the script the tab still opens');
    await n.page.close();
  },
});
