/* Round 5, Social and Dividers: Waves Divider 2 (sections/waves-divider.storelib),
   run by live-social-dividers.js. Shared sweep (tests/theme-r5-social-lib.cjs):
   every control live and after a redraw at 375 and 1366, all 24 wave shapes
   distinct, first paint = hydrated, two instances, reduced motion, priority
   off. Then: the wave follows the scheme (heading, primary, background,
   border), custom styling on and off live and after a redraw, and the saved
   about page instance against the section as it was (HEAD) with the toggle
   the lead sets.
   LIQUIDJS=<path to liquidjs> node tests/theme-r5-social-dividers-waves.cjs */
const {run, savedLook} = require('./theme-r5-social-lib.cjs');
run({
  name: 'waves-divider',
  baseSettings: {section_margin_top_mobile: 20, section_margin_top_desktop: 24, section_margin_bottom_mobile: 8, section_margin_bottom_desktop: 12, border_thickness: 2},
  samePairs: ['section_width:fluid_container=full_width'],
  values: {background_gradient: 'linear-gradient(90deg, rgb(1, 2, 3), rgb(4, 5, 6))'},
  skipEveryControl: {reveal: true},
  async extra({browser, mount, eq, ok}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'waves ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'waves-divider', {width, editing, assets: ['live-social-dividers.js'], settings: {border_thickness: 3, enable_second_color: true, wave_color: '#ff0000', wave_color_2: '#00ff00', background_color: '#0000ff', border_color: '#ffff00', section_bg: '#00ffff'}});
      const fill = n => t.page.locator('#shopify-section-test .wave-parallax' + n + '-test use').evaluate(el => getComputedStyle(el).fill);
      const box = k => t.page.locator('#shopify-section-test [data-sd-waves]').evaluate((el, k) => getComputedStyle(el)[k], k);
      const theme = async m => {
        eq(await fill(1), 'rgb(255, 255, 255)', where + ' ' + m + ' wave follows the heading colour');
        eq(await fill(2), 'rgb(51, 102, 153)', where + ' ' + m + ' second wave follows the primary colour');
        eq(await box('backgroundColor'), 'rgb(24, 32, 40)', where + ' ' + m + ' background follows the scheme');
        eq(await box('borderTopColor'), 'rgb(68, 85, 102)', where + ' ' + m + ' border follows the scheme');
        eq(await t.page.locator('#shopify-section-test').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', where + ' ' + m + ' no section background');
      };
      await theme('first paint');
      for (const mode of ['live', 'redraw']) {
        const apply = async s => { if (mode === 'live') await t.emit(s); else await t.redraw({settings: s}); };
        await apply({enable_custom_style: true, background_gradient: 'linear-gradient(90deg, rgb(1, 2, 3), rgb(4, 5, 6))'});
        eq(await fill(1), 'rgb(255, 0, 0)', where + ' ' + mode + ' custom wave');
        eq(await fill(2), 'rgb(0, 255, 0)', where + ' ' + mode + ' custom second wave');
        eq(await fill(3), 'rgb(255, 0, 0)', where + ' ' + mode + ' third layer keeps the wave colour');
        eq(await box('backgroundColor'), 'rgb(0, 0, 255)', where + ' ' + mode + ' custom background');
        ok(/linear-gradient/.test(await box('backgroundImage')), where + ' ' + mode + ' custom gradient');
        eq(await box('borderTopColor'), 'rgb(255, 255, 0)', where + ' ' + mode + ' custom border');
        eq(await t.page.locator('#shopify-section-test').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 255, 255)', where + ' ' + mode + ' custom section background');
        await apply({enable_second_color: false});
        eq(await fill(2), 'rgb(255, 0, 0)', where + ' ' + mode + ' one colour when the second is off');
        await apply({enable_custom_style: false, enable_second_color: true});
        await theme(mode + ' off');
        eq(await box('backgroundImage'), 'none', where + ' ' + mode + ' gradient off');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    for (const r of await savedLook(browser, {name: 'waves-divider', template: 'templates/about.json', key: 'waves_divider_EFDdC3', toggles: {enable_custom_style: true}})) ok(r.same, 'waves saved about @' + r.width + ' looks the same ' + JSON.stringify([r.old.box, r.now.box]));
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
