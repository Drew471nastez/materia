/* Benefits Circles (sections/benefits-circles.storelib): the shared
   features-a checks (tests/theme-features-a-harness.cjs) plus its own: every
   hover effect looks different on hover; custom fonts, the heading's own
   weight, line height and letter spacing, and the labels' own weight and
   line height win under the theme priority rules, on the element and on a
   <strong> inside it, live and on a redraw, and switching them off brings
   the theme back; a circle's own colours wait for its toggle; a link turns
   the item into a link and back; Show on hides the section at the other
   width.
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-benefits-circles.cjs */
const {run, IMG, SVG} = require('./theme-features-a-harness.cjs');
const NAME = 'benefits-circles';
const raf = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const preset = () => require('./media-fixture.cjs').schemaOf(NAME).schema.presets[0].blocks.map(b => ({type: b.type, settings: {...b.settings}}));
run({
  name: NAME,
  theme: {probes: [['.bcir__heading', 'h'], ['.bcir__sub p', 't'], ['.bcir__label', 'h']]},
  image: ['circle', 'icon_image', '.bcir__icon img', {icon_type: 'image'}],
  preBlock: {'circle.icon_type': {icon_image: IMG, icon_svg: SVG}, 'circle.icon_fill_circle': {icon_image: IMG}, 'circle.sublabel': {}},
  hover: {hover_effect: '.bcir__item'},
  values: {circle_shadow: ['0 4px 12px rgba(0, 0, 0, 0.4)']},
  only: {cols_desktop: 1366, col_gap_desktop: 1366, row_gap_desktop: 1366, show_connector: 1366, cols_mobile: 375, section_max_width_mobile: 375, gap_header: 1366, label_gap: 1366},
  noEffect: ['section_max_width_tablet'], /* 768 to 1023px: checked at 900 below */
  async extra({browser, mount, ASSET, ok, eq, prep, FONT, MONO}) {
    const tab = await mount(browser, NAME, {width: 900, assets: [ASSET]}); await prep(tab);
    const w0 = await tab.css('.bcir__inner', 'maxWidth');
    await tab.emit({section_max_width_tablet: 640}); await raf(tab);
    eq([w0, await tab.css('.bcir__inner', 'maxWidth')], ['900px', '640px'], NAME + ' 900: tablet content width applies live');
    await tab.redraw({settings: {section_max_width_tablet: 700}}); eq(await tab.css('.bcir__inner', 'maxWidth'), '700px', NAME + ' 900: tablet content width on redraw');
    await tab.page.close();
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const blocks = preset(); blocks[0].settings = {text: 'Why <strong>us</strong>'}; blocks[2].settings.label = 'Built <strong>well</strong>';
      const t = await mount(browser, NAME, {width, editing, blocks, assets: [ASSET]}); await prep(t);
      const css = (sel, p) => t.css(sel, p);
      /* fonts */
      const probe = async () => [await css('.bcir__heading', 'fontFamily'), await css('.bcir__heading strong', 'fontFamily'), await css('.bcir__label', 'fontFamily'), await css('.bcir__label strong', 'fontFamily'), await css('.bcir__sub p', 'fontFamily')];
      const on = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, yes = p => p.slice(0, 4).every(f => /Verdana/.test(f)) && /Courier New/.test(p[4]), no = p => p.slice(0, 4).every(f => /Georgia/.test(f)) && /Arial/.test(p[4]);
      if (editing) { await t.emit(on); await raf(t); ok(yes(await probe()), `${NAME} ${width} live: custom fonts win`); await t.emit({enable_custom_fonts: false}); await raf(t); ok(no(await probe()), `${NAME} ${width} live off: theme fonts`); }
      await t.redraw({settings: on}); ok(yes(await probe()), `${NAME} ${width} redraw: custom fonts win`); await t.redraw({settings: {enable_custom_fonts: false}}); ok(no(await probe()), `${NAME} ${width} redraw off: theme fonts`);
      /* heading own weight, line height, tracking */
      const hp = async () => [await css('.bcir__heading', 'fontWeight'), await css('.bcir__heading', 'lineHeight'), await css('.bcir__heading', 'letterSpacing'), await css('.bcir__heading strong', 'letterSpacing'), await css('.bcir__heading', 'fontSize')];
      const theme = await hp();
      eq(theme.slice(0, 3), ['700', theme[1], 'normal'], `${NAME} ${width}: heading follows the theme`);
      const hs = {enable_custom_style: true, weight: '400', line_height: 1.8, tracking: 2, size_desktop: 50, size_mobile: 28};
      const want = ['400', (width < 768 ? 28 : 50) * 1.8 + 'px', '2px', '2px', (width < 768 ? 28 : 50) + 'px'];
      if (editing) { await t.emit(hs, t.blockId('heading')); await raf(t); eq(await hp(), want, `${NAME} ${width} live: heading's own weight, line height and tracking win`); await t.emit({enable_custom_style: false}, t.blockId('heading')); await raf(t); eq(await hp(), theme, `${NAME} ${width} live off: theme heading back`); }
      const b2 = preset(); b2[0].settings = {text: 'Why <strong>us</strong>', ...hs}; await t.redraw({blocks: b2}); eq(await hp(), want, `${NAME} ${width} redraw: heading's own values win`);
      /* label own weight and line height */
      const lp = async () => [await css('.bcir__label', 'fontWeight'), await css('.bcir__label', 'lineHeight'), await css('.bcir__label', 'fontSize')];
      const ls = {enable_custom_style: true, label_weight: '800', label_line_height: 2, label_size_desktop: 20, label_size_mobile: 15};
      const lw = ['800', (width < 768 ? 30 : 40) + 'px', (width < 768 ? 15 : 20) + 'px'];
      if (editing) { await t.emit(ls); await raf(t); eq(await lp(), lw, `${NAME} ${width} live: label weight, size and line height win`); await t.emit({enable_custom_style: false}); await raf(t); eq((await lp())[0], '700', `${NAME} ${width} live off: theme heading weight on labels`); }
      await t.redraw({settings: ls}); eq(await lp(), lw, `${NAME} ${width} redraw: label values win`);
      await t.redraw({settings: {enable_custom_style: false}});
      /* a circle's own colours */
      const b3 = preset(); b3[2].settings = {...b3[2].settings, circle_bg: '#ff0000', icon_color: '#00ff00'};
      await t.redraw({blocks: b3}); eq(await css('.bcir__circle', 'backgroundColor'), 'rgb(24, 32, 40)', `${NAME} ${width}: circle colours wait for the toggle`);
      b3[2].settings.enable_custom_style = true; await t.redraw({blocks: b3});
      eq([await css('.bcir__circle', 'backgroundColor'), await css('.bcir__circle', 'color')], ['rgb(255, 0, 0)', 'rgb(0, 255, 0)'], `${NAME} ${width}: circle colours with the toggle`);
      if (editing) {
        const id = t.blockId('circle');
        await t.emit({link: '/pages/a'}, id); await raf(t);
        eq(await t.page.locator(`[data-fa-block="${id}"] .bcir__item`).evaluate(e => [e.tagName, e.getAttribute('href')]), ['A', '/pages/a'], `${NAME}: a link makes the circle a link`);
        await t.emit({link: ''}, id); await raf(t);
        eq(await t.page.locator(`[data-fa-block="${id}"] .bcir__item`).evaluate(e => e.tagName), 'DIV', `${NAME}: no link, no link`);
      }
      for (const [on, shown] of [['mobile', width < 768], ['desktop', width >= 768]]) { await t.redraw({settings: {show_section_on: on}}); eq(await css('[data-fa]', 'display') !== 'none', shown, `${NAME} ${width}: show on ${on}`); }
      eq(t.errors, [], NAME + ' extra: no errors');
      await t.page.close();
    }
  },
});
