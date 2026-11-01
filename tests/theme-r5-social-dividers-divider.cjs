/* Round 5, Social and Dividers: Divider (sections/divider.storelib), run by
   shopify/assets/live-social-dividers.js and drawn by divider-section.css.
   Shared sweep (tests/theme-r5-social-lib.cjs): every section and Label
   block control live and after a redraw at 375 and 1366, line styles
   distinct, first paint = hydrated, two instances, added block, reduced
   motion, priority off. Then: the legacy Center label settings, custom
   styling and the label's custom font on and off under the theme priority,
   the theme reveal switch, and the saved home, 404 and wishlist dividers
   against the section as it was (HEAD) with the toggles the lead sets.
   LIQUIDJS=<path to liquidjs> node tests/theme-r5-social-dividers-divider.cjs */
const {run, savedLook, FONT} = require('./theme-r5-social-lib.cjs');
const SVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4"/></svg>';
run({
  name: 'divider', assets: ['divider-section.css'],
  blockTypes: ['label'],
  baseSettings: {section_margin_top_mobile: 20, section_margin_top_desktop: 24, section_margin_bottom_mobile: 8, section_margin_bottom_desktop: 12, padding_top: 20, padding_bottom: 20},
  baseBlocks: [{type: 'label', settings: {text: 'Or', font: {family: 'Verdana', fallback_families: 'sans-serif', weight: 400}}}], /* the fixture's default font is a bare handle the Liquid cannot read */
  addType: 'label', instanceBlocks: [],
  values: {'label.icon_svg': SVG},
  samePairs: ['section_width:fluid_container=full_width'],
  skipEveryControl: {reveal: true}, /* checked with the theme animation on, below */
  addedEdit: {settings: {text: 'Added'}, check: async (t, id, {eq}) => { eq((await t.page.locator('[data-sd-block="' + id + '"]').textContent()).trim(), 'Added'); return 0; }},
  async extra({browser, mount, eq, ok}) {
    const A = ['divider-section.css', 'live-social-dividers.js'];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'divider ' + width + (editing ? ' editor' : ' storefront');
      const sty = (t, sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      /* legacy Center label, no block */
      const t = await mount(browser, 'divider', {width, editing, assets: A, settings: {label: 'Trusted by', label_size: 15, label_color: '#ff0000', color_from: '#00ff00'}, blocks: []});
      eq((await t.page.locator('[data-sd-label]').textContent()).trim(), 'Trusted by', where + ' legacy label');
      eq(await sty(t, '.sec__divider-label', 'fontSize'), '15px', where + ' legacy label size');
      eq(await sty(t, '.sec__divider-label', 'color'), 'rgb(204, 204, 204)', where + ' legacy label colour waits for custom styling');
      eq(await sty(t, '.sec__divider-line', 'backgroundColor'), 'rgb(68, 85, 102)', where + ' line follows the scheme border');
      for (const mode of ['live', 'redraw']) {
        const apply = async s => { if (mode === 'live') await t.emit(s); else await t.redraw({settings: s}); };
        await apply({enable_custom_style: true, section_bg: '#0000ff'});
        eq(await sty(t, '.sec__divider-label', 'color'), 'rgb(255, 0, 0)', where + ' ' + mode + ' custom label colour');
        eq(await sty(t, '.sec__divider-line', 'backgroundColor'), 'rgb(0, 255, 0)', where + ' ' + mode + ' custom line colour');
        eq(await t.page.locator('#shopify-section-test').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 255)', where + ' ' + mode + ' custom section background');
        await apply({enable_custom_style: false});
        eq(await sty(t, '.sec__divider-label', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' theme label colour back');
        eq(await sty(t, '.sec__divider-line', 'backgroundColor'), 'rgb(68, 85, 102)', where + ' ' + mode + ' theme line colour back');
        eq(await t.page.locator('#shopify-section-test').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', where + ' ' + mode + ' section background back');
      }
      await t.emit({label: ''});
      eq(await t.page.locator('[data-sd-label]').isVisible(), false, where + ' empty label hides');
      eq(await t.page.locator('.sec__divider-line').evaluateAll(els => els.filter(e => e.getBoundingClientRect().width > 0).length), 1, where + ' one line without a label');
      await t.emit({label: 'Back'});
      eq((await t.page.locator('[data-sd-label]').textContent()).trim(), 'Back', where + ' label back live');
      /* a label block wins over the legacy label */
      await t.redraw({blocks: [{type: 'label', settings: {text: 'Block'}}]});
      eq((await t.page.locator('[data-sd-label]').textContent()).trim(), 'Block', where + ' label block wins');
      const bid = t.blockId('label');
      for (const mode of ['live', 'redraw']) {
        const apply = async b => { if (mode === 'live') await t.emit(b, bid); else await t.redraw({blocks: [{type: 'label', settings: {text: 'Block', ...b}}]}); };
        await apply({enable_custom_fonts: true, font: FONT, enable_custom_style: true, color: '#ffff00', size: 20});
        ok(/Courier New/.test(await sty(t, '.sec__divider-label', 'fontFamily')), where + ' ' + mode + ' custom label font');
        eq(await sty(t, '.sec__divider-label', 'fontWeight'), '300', where + ' ' + mode + ' custom label weight from the font');
        eq(await t.page.locator('[data-sd-label]').evaluate(el => el.hasAttribute('data-own-font')), true, where + ' ' + mode + ' label owns its font');
        eq(await sty(t, '.sec__divider-label', 'color'), 'rgb(255, 255, 0)', where + ' ' + mode + ' custom block colour');
        eq(await sty(t, '.sec__divider-label', 'fontSize'), '20px', where + ' ' + mode + ' block size');
        await apply({enable_custom_fonts: false, enable_custom_style: false});
        ok(/Arial/.test(await sty(t, '.sec__divider-label', 'fontFamily')), where + ' ' + mode + ' theme label font back');
        eq(await sty(t, '.sec__divider-label', 'fontWeight'), '600', where + ' ' + mode + ' label weight back');
        eq(await t.page.locator('[data-sd-label]').evaluate(el => el.hasAttribute('data-own-font')), false, where + ' ' + mode + ' theme font owns the label again');
        eq(await sty(t, '.sec__divider-label', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' theme block colour back');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    /* Reveal on scroll follows the theme animation, off for this section when switched off */
    {
      const on = await mount(browser, 'divider', {width: 1366, editing: false, assets: A, theme: {scroll_animation: 'fade_up'}});
      ok(await on.page.locator('#shopify-section-test').evaluate(el => el.classList.contains('scroll-trigger')), 'divider reveal follows the theme animation');
      const off = await mount(browser, 'divider', {width: 1366, editing: false, assets: A, theme: {scroll_animation: 'fade_up'}, settings: {reveal: false}});
      ok(await off.page.locator('#shopify-section-test').evaluate(el => !el.classList.contains('scroll-trigger')), 'divider reveal off');
      await on.page.close(); await off.page.close();
    }
    /* saved instances */
    for (const [template, key, toggles] of [['templates/home.json', 'divider_nXciiU', {enable_custom_style: true}], ['templates/home.json', 'divider_nhdQfa', {enable_custom_style: true}], ['templates/home.json', 'divider_zyJjjn', {enable_custom_style: true}], ['templates/404.json', 'divider_zDJB6F', {}], ['templates/wishlist.json', 'divider_p9yTJV', {enable_custom_style: true}]]) {
      for (const r of await savedLook(browser, {name: 'divider', template, key, toggles, assets: ['divider-section.css']})) ok(r.same, 'divider saved ' + template + ' ' + key + ' @' + r.width + ' looks the same (' + JSON.stringify([r.old.box, r.now.box, r.old.text, r.now.text]) + ')');
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
