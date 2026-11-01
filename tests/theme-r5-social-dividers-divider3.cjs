/* Round 5, Social and Dividers: Divider 3 (sections/divider3.storelib and
   snippets/divider3-shapes.storelib), run by live-social-dividers.js.
   Shared sweep (tests/theme-r5-social-lib.cjs): every control live and after
   a redraw at 375 and 1366, every one of the 37 shapes distinct (swapped
   live in the builder), first paint = hydrated, two instances, reduced
   motion, priority off. Then: shapes follow the scheme's heading colour,
   custom styling on and off (live and redraw), each thickness reaches its
   own shape, and the storefront keeps no shape templates.
   LIQUIDJS=<path to liquidjs> node tests/theme-r5-social-dividers-divider3.cjs */
const {run} = require('./theme-r5-social-lib.cjs');
run({
  name: 'divider3',
  baseSettings: {section_margin_top_mobile: 20, section_margin_top_desktop: 24, section_margin_bottom_mobile: 8, section_margin_bottom_desktop: 12},
  samePairs: ['section_width:fluid_container=full_width'],
  skipEveryControl: {reveal: true},
  async extra({browser, mount, eq, ok}) {
    const A = ['live-social-dividers.js'];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'divider3 ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'divider3', {width, editing, assets: A, settings: {divider_style: 'line', divider_color: '#ff0000', section_bg: '#0000ff'}});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      eq(await sty('.LoudzDividersWrapper__Line', 'backgroundColor'), 'rgb(255, 255, 255)', where + ' line follows the scheme heading colour');
      for (const mode of ['live', 'redraw']) {
        const apply = async s => { if (mode === 'live') await t.emit(s); else await t.redraw({settings: s}); };
        await apply({enable_custom_style: true});
        eq(await sty('.LoudzDividersWrapper__Line', 'backgroundColor'), 'rgb(255, 0, 0)', where + ' ' + mode + ' custom divider colour');
        eq(await t.page.locator('#shopify-section-test').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 255)', where + ' ' + mode + ' custom section background');
        await apply({enable_custom_style: false});
        eq(await sty('.LoudzDividersWrapper__Line', 'backgroundColor'), 'rgb(255, 255, 255)', where + ' ' + mode + ' theme colour back');
        eq(await t.page.locator('#shopify-section-test').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', where + ' ' + mode + ' section background back');
      }
      /* every thickness reaches its own shape */
      for (const [style, id, sel, prop] of [['line', 'divider_thickness', '.LoudzDividersWrapper__Line', 'height'], ['circle', 'circle_divider_thickness', '.LoudzDividersWrapper__Circle', 'borderTopWidth'], ['lines', 'lines_divider_thickness', '.LoudzDividersWrapper__Lines path', 'strokeWidth'], ['rectangles', 'rectangles_divider_thickness', '.LoudzDividersWrapper__Rectangles path', 'strokeWidth'], ['wave-line', 'wave_line_divider_thickness', '.LoudzDividersWrapper__WaveLine path', 'strokeWidth'], ['waves', 'waves_divider_thickness', '.LoudzDividersWrapper__Waves path', 'strokeWidth'], ['waves-2', 'waves2_divider_thickness', '.LoudzDividersWrapper__WavesSecond path', 'strokeWidth'], ['marks', 'marks_divider_thickness', '.LoudzDividersWrapper__Marks path', 'strokeWidth']]) {
        await t.redraw({settings: {divider_style: style, [id]: 7}});
        eq(await sty(sel, prop), '7px', where + ' ' + id + ' reaches the ' + style + ' shape');
      }
      await t.redraw({settings: {divider_style: 'two-lines', two_line_divider_thickness: 6}});
      eq(await t.page.locator('#shopify-section-test .LoudzDividersWrapper__TwoLine').evaluate(el => getComputedStyle(el, '::before').height), '6px', where + ' two-line thickness');
      eq(await t.page.locator('#shopify-section-test template[data-sd-shapes]').count(), editing ? 37 : 0, where + ' shape templates only in the builder');
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
