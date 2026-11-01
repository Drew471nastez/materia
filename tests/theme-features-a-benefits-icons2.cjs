/* Benefits Icons (sections/benefits-icons2.storelib): the shared features-a
   checks (tests/theme-features-a-harness.cjs) plus its own: custom fonts win
   under the theme priority rules on the heading, titles, text and a <strong>
   inside them; the heading block's colour and weight wait for its own
   toggle and then win over the theme heading weight; the icon choice order
   (upload, SVG code, library, image, placeholder) is the same live and on a
   redraw; the phone slider takes focus and scrolls by keyboard.
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-benefits-icons2.cjs */
const {run, IMG, SVG} = require('./theme-features-a-harness.cjs');
const NAME = 'benefits-icons2';
const raf = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
run({
  name: NAME,
  theme: {probes: [['.bic__heading', 'h'], ['.bic__title', 'h'], ['.bic__desc', 't']]},
  image: ['icon', 'custom_icon', '.bic__icon img', {icon_type: 'upload'}],
  preBlock: {'icon.custom_icon': {icon_type: 'upload'}, 'icon.icon_type': {custom_icon: IMG}, 'icon.font_awesome': {icon_type: 'icon'}},
  only: {icons_per_row_desktop: 1366, inner_width: 1366, vertical_margin: 1366, icons_mobile_layout: 375},
  both: ['icons_mobile_layout'], /* the slider's list takes focus (tabindex) at every width */
  noEffect: ['reveal'],
  async extra({browser, mount, ASSET, ok, eq, prep, FONT, MONO}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const preset = require('./media-fixture.cjs').schemaOf(NAME).schema.presets[0].blocks;
      const blocks = preset.map(b => ({type: b.type, settings: {...b.settings}}));
      blocks[0].settings = {text: 'Why <strong>us</strong>'}; blocks[1].settings.icon_description = 'Packed <strong>fast</strong>';
      const t = await mount(browser, NAME, {width, editing, blocks, assets: [ASSET]}); await prep(t);
      const probe = async () => ({h: await t.css('.bic__heading', 'fontFamily'), hs: await t.css('.bic__heading strong', 'fontFamily'), ti: await t.css('.bic__title', 'fontFamily'), de: await t.css('.bic__desc', 'fontFamily'), ds: await t.css('.bic__desc strong', 'fontFamily')});
      const on = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO};
      const yes = p => /Verdana/.test(p.h) && /Verdana/.test(p.hs) && /Verdana/.test(p.ti) && /Courier New/.test(p.de) && /Courier New/.test(p.ds);
      const no = p => /Georgia/.test(p.h) && /Georgia/.test(p.hs) && /Georgia/.test(p.ti) && /Arial/.test(p.de) && /Arial/.test(p.ds);
      if (editing) { await t.emit(on); await raf(t); let p = await probe(); ok(yes(p), `${NAME} ${width} live: custom fonts win (${JSON.stringify(p)})`); await t.emit({enable_custom_fonts: false}); await raf(t); p = await probe(); ok(no(p), `${NAME} ${width} live off: theme fonts (${JSON.stringify(p)})`); }
      await t.redraw({settings: on}); ok(yes(await probe()), `${NAME} ${width} redraw: custom fonts win`);
      await t.redraw({settings: {enable_custom_fonts: false}}); ok(no(await probe()), `${NAME} ${width} redraw off: theme fonts`);
      /* heading weight and colour */
      const hid = t.blockId('heading'), styled = {enable_custom_style: true, heading_style: 'regular', heading_color: '#ff0000'};
      eq([await t.css('.bic__heading', 'fontWeight'), await t.css('.bic__heading', 'color')], ['700', 'rgb(255, 255, 255)'], `${NAME} ${width}: heading weight and colour follow the theme`);
      if (editing) {
        await t.emit(styled, hid); await raf(t);
        eq([await t.css('.bic__heading', 'fontWeight'), await t.css('.bic__heading', 'color')], ['400', 'rgb(255, 0, 0)'], `${NAME} ${width} live: own weight and colour win`);
        await t.emit({enable_custom_style: false}, hid); await raf(t);
        eq([await t.css('.bic__heading', 'fontWeight'), await t.css('.bic__heading', 'color')], ['700', 'rgb(255, 255, 255)'], `${NAME} ${width} live off: theme back`);
      }
      const b2 = blocks.map(b => ({...b, settings: {...b.settings}})); Object.assign(b2[0].settings, styled);
      await t.redraw({blocks: b2});
      eq([await t.css('.bic__heading', 'fontWeight'), await t.css('.bic__heading', 'color')], ['400', 'rgb(255, 0, 0)'], `${NAME} ${width} redraw: own weight and colour win`);
      /* icon choice order */
      const id = t.blockId('icon');
      const kind = () => t.page.locator(`[data-fa-block="${id}"] .bic__icon`).evaluate(e => e.firstElementChild ? e.firstElementChild.tagName + '.' + (e.firstElementChild.getAttribute('class') || '') + (e.firstElementChild.getAttribute('viewBox') || '') : '');
      for (const [label, s] of [['upload wins', {icon_type: 'upload', custom_icon: IMG, font_awesome: SVG}], ['svg code', {icon_type: 'icon', font_awesome: SVG}], ['library', {icon_type: 'icon', font_awesome: '', icon: 'gem'}], ['image without upload type', {icon_type: 'icon', icon: 'none', font_awesome: '', custom_icon: IMG}], ['placeholder', {icon_type: 'icon', icon: 'none', font_awesome: '', custom_icon: ''}]]) {
        const bl = blocks.map(b => ({...b, settings: {...b.settings}})); Object.assign(bl[1].settings, s);
        await t.redraw({blocks: bl}); const want = await kind();
        if (editing) { await t.redraw({blocks}); await t.emit(s, id); await raf(t); eq(await kind(), want, `${NAME} ${width}: ${label}: live equals redraw (${want})`); }
        ok(!!want, `${NAME} ${width}: ${label} draws an icon`);
      }
      if (width === 375) {
        await t.redraw({settings: {icons_mobile_layout: 'slider'}, blocks: blocks.concat(blocks.slice(1))});
        const list = t.root('.bic__list');
        eq(await list.getAttribute('tabindex'), '0', `${NAME}: the slider takes focus`);
        await list.focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(400);
        ok(await list.evaluate(e => e.scrollLeft > 0), `${NAME}: arrow keys scroll the slider`);
        ok(await t.noOverflow(), `${NAME}: the slider keeps the page from scrolling sideways`);
      }
      eq(t.errors, [], NAME + ' extra: no errors');
      await t.page.close();
    }
  },
});
