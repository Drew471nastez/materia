/* Benefits Bar Pro (sections/benefits-bar-pro.storelib): the shared features-a
   checks (tests/theme-features-a-harness.cjs) plus its own: custom fonts win
   under the theme priority rules on the title, the subtitle and a <strong>
   inside it, the heading block's colour follows its own custom styling
   toggle, a link turns the item into a link and back, the phone carousel
   scrolls by keyboard.
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-benefits-bar-pro.cjs */
const {run} = require('./theme-features-a-harness.cjs');
const NAME = 'benefits-bar-pro';
const preset = () => require('./media-fixture.cjs').schemaOf(NAME).schema.presets[0].blocks.map(b => ({type: b.type, settings: {...b.settings}}));
run({
  name: NAME,
  blocks: () => [{type: 'heading'}, ...preset()],
  theme: {probes: [['.bbp__heading', 'h'], ['.bbp__title', 'h'], ['.bbp__subtitle', 't']], colorFree: ['.bbp__subtitle']},
  image: ['benefit', 'icon_image', '.bbp__icon img'],
  extraBlock: 'benefit',
  only: {columns_desktop: 1366, item_gap: 0, mobile_layout: 375, align: 0},
  both: ['mobile_layout'], /* the phone carousel's list takes focus (tabindex) at every width */
  async extra({browser, mount, ASSET, ok, eq, prep, FONT, MONO}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const blocks = [{type: 'heading', settings: {heading: 'Why <strong>us</strong>'}}, ...preset()];
      blocks[1].settings.subtitle = 'Ships <strong>fast</strong>';
      const t = await mount(browser, NAME, {width, editing, blocks, assets: [ASSET]}); await prep(t);
      const probe = async () => ({h: await t.css('.bbp__heading', 'fontFamily'), hs: await t.css('.bbp__heading strong', 'fontFamily'), ti: await t.css('.bbp__title', 'fontFamily'), su: await t.css('.bbp__subtitle', 'fontFamily'), ss: await t.css('.bbp__subtitle strong', 'fontFamily')});
      const on = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO};
      const check = async (how) => { const p = await probe(); ok(/Verdana/.test(p.h) && /Verdana/.test(p.hs) && /Verdana/.test(p.ti) && /Courier New/.test(p.su) && /Courier New/.test(p.ss), `${NAME} ${width} ${how}: custom fonts win on heading, title, subtitle and their <strong> (${JSON.stringify(p)})`); ok(await t.page.locator('#shopify-section-test [data-fa][data-own-font]').count() === 1, `${NAME} ${how}: root opts out of the theme font rule`); };
      const off = async (how) => { const p = await probe(); ok(/Georgia/.test(p.h) && /Georgia/.test(p.hs) && /Georgia/.test(p.ti) && /Arial/.test(p.su) && /Arial/.test(p.ss), `${NAME} ${width} ${how}: theme fonts back (${JSON.stringify(p)})`); ok(await t.page.locator('#shopify-section-test [data-own-font]').count() === 0, `${NAME} ${how}: no opt-out left`); };
      if (editing) { await t.emit(on); await t.page.waitForTimeout(40); await check('live'); await t.emit({enable_custom_fonts: false}); await t.page.waitForTimeout(40); await off('live off'); }
      await t.redraw({settings: on}); await check('redraw');
      await t.redraw({settings: {enable_custom_fonts: false}}); await off('redraw off');
      /* heading colour: own toggle */
      await t.redraw({blocks: [{type: 'heading', settings: {heading: 'Hi', heading_color: '#ff0000'}}, ...preset()]});
      eq(await t.css('.bbp__heading', 'color'), 'rgb(255, 255, 255)', `${NAME} ${width}: heading colour waits for its toggle`);
      await t.redraw({blocks: [{type: 'heading', settings: {heading: 'Hi', heading_color: '#ff0000', enable_custom_style: true}}, ...preset()]});
      eq(await t.css('.bbp__heading', 'color'), 'rgb(255, 0, 0)', `${NAME} ${width}: heading colour with its toggle`);
      /* links */
      if (editing) {
        const id = t.blockId('benefit');
        await t.emit({link: '/pages/a'}, id); await t.page.waitForTimeout(40);
        eq(await t.page.locator(`[data-fa-block="${id}"] .bbp__link`).evaluate(e => [e.tagName, e.getAttribute('href'), e.getAttribute('aria-label')]), ['A', '/pages/a', 'Free shipping'], `${NAME}: a link makes the item a link`);
        await t.emit({link: ''}, id); await t.page.waitForTimeout(40);
        eq(await t.page.locator(`[data-fa-block="${id}"] .bbp__link`).evaluate(e => [e.tagName, e.hasAttribute('href')]), ['DIV', false], `${NAME}: no link, no link`);
      }
      if (width === 375) {
        await t.redraw({settings: {mobile_layout: 'carousel_scroll'}});
        const list = t.root('.bbp__list');
        eq(await list.getAttribute('tabindex'), '0', `${NAME}: the phone carousel takes focus`);
        await list.focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(400);
        ok(await list.evaluate(e => e.scrollLeft > 0), `${NAME}: arrow keys scroll the phone carousel`);
        ok(await t.noOverflow(), `${NAME}: carousel keeps the page from scrolling sideways`);
      }
      eq(t.errors, [], NAME + ' extra: no errors');
      await t.page.close();
    }
  },
});
