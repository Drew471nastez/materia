/* Before And After Reveal: lifecycle checks the original suite does not cover.
   Two independent instances, first paint equals hydrated paint, redraw and
   added blocks, no image reload or arrow restart on unrelated edits, schema
   order. Run: LIQUIDJS=<path> node tests/theme-media-reveal.cjs */
const assert = require('assert/strict'), {launch, mount, schemaProblems} = require('./media-fixture.cjs');
const assets = ['before-after-controls.css', 'before-after-controls.js'];
const boxes = t => t.page.evaluate(() => [...document.querySelectorAll('[data-before-after-controls] *')].filter(e => e.offsetParent).slice(0, 80).map(e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize].join('|'); }));
(async () => {
  let checks = 0; const browser = await launch();
  try {
    assert.deepEqual(schemaProblems('before-and-after-reveal'), []); checks++;
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      // First paint (no controller) equals hydrated paint.
      const cold = await mount(browser, 'before-and-after-reveal', {width, editing, assets: ['before-after-controls.css']});
      const before = await boxes(cold); await cold.page.close();
      const t = await mount(browser, 'before-and-after-reveal', {width, editing, assets, instances: [{uid: 'a'}, {uid: 'b'}]});
      await t.page.waitForTimeout(150);
      const after = (await boxes(t)).slice(0, before.length);
      assert.deepEqual(after, before, 'first paint equals hydrated paint at ' + width); checks++;
      // Independent instances.
      await t.emit({enable_custom_style: true, section_bg: '#abcdef', image_radius: 30}, null, 'a');
      assert.equal(await t.css('[data-before-after-controls]', 'backgroundColor', 'a'), 'rgb(171, 205, 239)');
      assert.equal(await t.css('[data-before-after-controls]', 'backgroundColor', 'b'), 'rgb(24, 32, 40)');
      assert.equal(await t.css('.bar__img-card', 'borderRadius', 'b'), t.section.settings.image_radius + 'px'); checks += 3;
      // Unrelated edit keeps image nodes, src and the arrow animation.
      await t.emit({arrow_animation: 'pulse'}, null, 'a');
      const img = await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-a .bar__img-card img'); window.__img = i; return i.getAttribute('src'); });
      const anim = await t.page.evaluate(() => { const a = document.querySelector('#shopify-section-a .bar__arrow svg').getAnimations()[0]; window.__anim = a; return a ? a.currentTime : null; });
      await t.page.waitForTimeout(200);
      await t.emit({padding_top_desktop: 70, padding_top_mobile: 30, label_bg: '#111111'}, null, 'a');
      assert(await t.page.evaluate(src => { const i = document.querySelector('#shopify-section-a .bar__img-card img'); return i === window.__img && i.getAttribute('src') === src; }, img), 'image kept');
      assert(await t.page.evaluate(prev => { const a = document.querySelector('#shopify-section-a .bar__arrow svg').getAnimations()[0]; return a === window.__anim && a.currentTime > prev; }, anim), 'arrow animation not restarted'); checks += 2;
      // Redraw with an added block, then live edit it.
      const next = await t.redraw({uid: 'b', blocks: [...t.rendered[1].section.blocks.map(b => ({type: b.type, settings: b.settings})), {type: 'subheading', settings: {text: '<p>Added line</p>'}}]});
      const added = next.section.blocks.at(-1).id;
      assert.equal(await t.root().page().locator('#shopify-section-b [data-ba-block="' + added + '"]').textContent(), 'Added line'); checks++;
      await t.emit({text: '<p>Edited added line</p>'}, added, 'b');
      assert.equal(await t.page.locator('#shopify-section-b [data-ba-block="' + added + '"]').textContent(), 'Edited added line'); checks++;
      assert.equal(await t.css('[data-before-after-controls]', 'backgroundColor', 'a'), 'rgb(171, 205, 239)', 'other instance untouched by redraw'); checks++;
      // Colour scheme switch, live and after a redraw.
      await t.emit({color_scheme: 'alt-scheme', enable_custom_style: false}, null, 'a');
      assert.equal(await t.css('[data-before-after-controls]', 'backgroundColor', 'a'), 'rgb(250, 250, 250)'); checks++;
      await t.redraw({uid: 'a', settings: {color_scheme: 'alt-scheme', enable_custom_style: false}});
      assert.equal(await t.css('[data-before-after-controls]', 'backgroundColor', 'a'), 'rgb(250, 250, 250)'); checks++;
      assert(await t.noOverflow()); assert.deepEqual(t.errors, []); checks += 2;
      await t.page.close();
    }
    console.log(checks + ' Before And After Reveal lifecycle, instance, first-paint and redraw checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
