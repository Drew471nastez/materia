/* Round 5, Contact group: Google map (sections/google-map.storelib), run by
   shopify/assets/live-contact.js. The shared checks are in
   tests/theme-r5-contact-lib.cjs; this file adds the map's own: the embed
   code is drawn as pasted (no iframe of the section's own), the map height
   per width, the builder placeholder, the header blocks and the saved
   Contact page instance against the section before this work.

   LIQUIDJS=<path to liquidjs> node tests/theme-r5-contact-map.cjs */
const fs = require('fs'), path = require('path');
const L = require('./theme-r5-contact-lib.cjs');
const {ok, eq, MAP, FONT} = L;
const name = 'google-map';
(async () => {
  const raw = fs.readFileSync(path.join(__dirname, '../sections/google-map.storelib'), 'utf8');
  const tpl = raw.split('<schema>')[0];
  /* the embed path: the pasted code, as pasted; no iframe written by the section */
  ok(/\{\{\s*section_st\.map_iframe\s*\}\}/.test(tpl) && !/<iframe/i.test(tpl), 'the map is the pasted embed code; the section writes no iframe of its own');
  const r = await L.suite(name, {
    structural: ['map_iframe', 'reveal'],
    vals: {map_iframe: [MAP]},
    ctx: {map_height_mobile: {map_iframe: MAP}, map_height: {map_iframe: MAP}, map_radius: {map_iframe: MAP}},
    noop: {375: ['header_size', 'map_height'], 1366: []},
    same: {375: [['container', 'fluid_container'], ['stretch_width', 'full_width'], ['container', 'stretch_width'], ['fluid_container', 'stretch_width']]},
    twoInstances: {map_height: 700},
    blockEdit: ['heading', {text: 'Only in a'}],
    extraBlock: ['subheading', {text: '<p>Added</p>'}, {text: '<p>Changed live</p>'}],
    theme: async (t, {ok, css, tag}) => {
      ok(/Georgia/.test(await css('h2', 'fontFamily')), tag + ': heading in the theme heading font');
      ok(/Arial/.test(await css('.ct-s', 'fontFamily')), tag + ': subheading in the theme body font');
      ok(await css('h2', 'color') === 'rgb(255, 255, 255)' && await css('.ct-s', 'color') === 'rgb(204, 204, 204)', tag + ': scheme heading and text colours');
    },
    priority: [
      {name: 'heading font, weight and size', blocks: {heading: {enable_custom_fonts: true, font: FONT, weight_enable: true, weight: '300', size_enable: true, size_desktop: 60, size_mobile: 30, line_height: 1.6, tracking: 2, enable_custom_style: true, color: '#ff0000'}},
        checks: [['h2', 'fontFamily', /Verdana/], ['h2', 'fontWeight', '300'], ['h2', 'fontSize', w => w < 768 ? '30px' : '60px'], ['h2', 'letterSpacing', '2px'], ['h2', 'lineHeight', w => w < 768 ? '48px' : '96px'], ['h2', 'color', 'rgb(255, 0, 0)']],
        off: {blocks: {heading: {enable_custom_fonts: false, weight_enable: false, size_enable: false, enable_custom_style: false}}}},
      {name: 'subheading font, weight and size on a <strong> inside', base: {blocks: {subheading: {text: '<p>Visit <strong>us</strong></p>'}}}, blocks: {subheading: {enable_custom_fonts: true, font: FONT, weight_enable: true, weight: '300', size_enable: true, size: 22, line_height: 1.8}},
        checks: [['.ct-s strong', 'fontFamily', /Verdana/], ['.ct-s p', 'fontWeight', '300'], ['.ct-s p', 'fontSize', '22px'], ['.ct-s p', 'lineHeight', '39.6px']],
        off: {blocks: {subheading: {enable_custom_fonts: false, weight_enable: false, size_enable: false}}}},
      {name: 'section fonts', section: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: 'monospace'}, body_font: FONT},
        checks: [['h2', 'fontFamily', /Courier New/], ['.ct-s p', 'fontFamily', /Verdana/]],
        off: {section: {enable_custom_fonts: false}}},
    ],
    extra: async (browser, {ok, eq, opts, frames, quiet}) => {
      /* the pasted map, its height per width, the placeholder only in the builder */
      for (const [width, h] of [[375, 320], [1366, 640]]) {
        const t = await L.mount(browser, name, opts({width, editing: false, settings: {map_iframe: MAP, map_height: 640, map_height_mobile: 320}}));
        const r = await t.page.evaluate(() => { const f = document.querySelector('#shopify-section-test iframe'); return {n: document.querySelectorAll('#shopify-section-test iframe').length, src: f && f.getAttribute('src'), h: f && Math.round(f.getBoundingClientRect().height)}; });
        ok(r.n === 1 && /google\.com\/maps/.test(r.src) && r.h === h, 'the pasted map at ' + width + 'px is ' + h + 'px tall: ' + JSON.stringify(r));
        await t.page.close();
      }
      const sf = await L.mount(browser, name, opts({width: 1366, editing: false}));
      ok(await sf.page.evaluate(() => !document.querySelector('#shopify-section-test .ct-map__empty')), 'no placeholder for visitors when there is no embed code');
      await sf.page.close();
      const ed = await L.mount(browser, name, opts({width: 1366, editing: true}));
      ok(await ed.page.evaluate(() => { const e = document.querySelector('#shopify-section-test .ct-map__empty'); return !!e && e.getBoundingClientRect().height === 500; }), 'the builder shows where the map goes, at the map height');
      await ed.page.screenshot({path: path.join(process.env.SHOTS || '/tmp', 'r5-google-map-1366.png'), fullPage: true}).catch(() => {});
      await ed.page.close();
      /* legacy settings with no blocks: the older Heading and Description show */
      const lg = await L.mount(browser, name, opts({width: 1366, blocks: [], settings: {heading: 'Old heading', description: '<p>Old text</p>'}}));
      ok(await lg.page.evaluate(() => { const W = document.getElementById('shopify-section-test'); return W.querySelector('h2').textContent.trim() === 'Old heading' && W.querySelector('[data-ct-legacy="description"]').textContent.trim() === 'Old text'; }), 'legacy heading and description without blocks');
      await lg.emit({heading: 'Live legacy'}); await frames(lg.page);
      ok(await lg.page.evaluate(() => document.querySelector('#shopify-section-test h2').textContent.trim() === 'Live legacy'), 'legacy heading live');
      await lg.page.close();
      /* the saved Contact page map, with nothing to switch on */
      const n = await L.savedLook(browser, {name, template: 'templates/contact.json', key: 'google_map_YBXLr9'});
      ok(n === 2 || n === 0, 'saved map compared at 375 and 1366');
    },
  });
  console.log(L.count() + ' Google map checks passed (controls live ' + r.covered.live + ', after redraw ' + r.covered.redraw + ', option pairs ' + r.covered.options + ')');
})().catch(e => { console.error(e); process.exit(1); });
