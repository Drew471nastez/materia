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
    // Typography and button shape under the real theme rules (Theme settings >
    // Typography "Use in every section" and Buttons "Use shared button size and
    // shape" both on): every custom switch wins in the first paint, hydrated,
    // live and after a redraw, and switching it off brings the theme back.
    const VERDANA = {family: 'Verdana', fallback_families: 'sans-serif'}, TAHOMA = {family: 'Tahoma', fallback_families: 'sans-serif'};
    const custom = {
      heading: {weight_enable: true, weight: '400', size_enable: true, size_desktop: 56, size_mobile: 28, line_height: 1.5, tracking: 2, enable_custom_fonts: true, font: VERDANA},
      subheading: {weight_enable: true, weight: '300', size_enable: true, size: 20, line_height: 2, enable_custom_fonts: true, font: TAHOMA},
      trust: {enable_custom_fonts: true, font: VERDANA, text: 'Loved by <strong>1,000+</strong>'},
      button: {use_theme_button: false, radius: 30, size: 20, pad_x: 40, pad_y: 20, border_width: 3, weight_enable: true, weight: '700', enable_custom_fonts: true, font: TAHOMA},
    };
    const off = {heading: {weight_enable: false, size_enable: false, enable_custom_fonts: false}, subheading: {weight_enable: false, size_enable: false, enable_custom_fonts: false}, trust: {enable_custom_fonts: false}, button: {use_theme_button: true, weight_enable: false, enable_custom_fonts: false}};
    const type = t => t.page.evaluate(() => { const q = s => { const el = document.querySelector('#shopify-section-test ' + s), c = getComputedStyle(el); return [c.fontFamily, c.fontWeight, c.fontSize, c.lineHeight, c.letterSpacing]; }, b = getComputedStyle(document.querySelector('#shopify-section-test .bar__btn'));
      return {h: q('.bar__heading'), sub: q('.bar__sub'), p: q('.bar__sub p'), trust: q('[data-ba-trust-text]'), strong: q('[data-ba-trust-text] strong'), btn: [b.fontFamily, b.fontWeight, b.fontSize, b.paddingTop, b.paddingLeft, b.borderTopLeftRadius, b.borderTopWidth]}; });
    const expectCustom = (got, width, tag) => {
      const hs = width >= 768 ? 56 : 28;
      assert.match(got.h[0], /^"?Verdana/, tag + ' heading font'); assert.deepEqual(got.h.slice(1), ['400', hs + 'px', hs * 1.5 + 'px', '2px'], tag + ' heading weight, size, line height, tracking');
      for (const x of [got.sub, got.p]) { assert.match(x[0], /^"?Tahoma/, tag + ' text font'); assert.deepEqual(x.slice(1, 4), ['300', '20px', '40px'], tag + ' text weight, size, line height'); }
      assert.match(got.trust[0], /^"?Verdana/, tag + ' trust font'); assert.match(got.strong[0], /^"?Verdana/, tag + ' trust strong font');
      assert.match(got.btn[0], /^"?Tahoma/, tag + ' button font'); assert.deepEqual(got.btn.slice(1), ['700', '20px', '20px', '40px', '30px', '3px'], tag + ' button weight, size, padding, corners, border');
      checks += 9;
    };
    const blocksWith = (t, patch) => t.rendered[0].section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(patch[b.type] || {})}}));
    const presetBlocks = [{type: 'trust', settings: {text: 'Loved by <strong>1,000+</strong>'}}, {type: 'heading'}, {type: 'subheading'}, {type: 'button'}, {type: 'before'}, {type: 'after'}];
    const customBlocks = presetBlocks.map(b => ({type: b.type, settings: {...b.settings, ...(custom[b.type] || {})}}));
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const tag = `reveal type ${width} ${editing ? 'editor' : 'storefront'}`;
      // Theme values with every switch off, then the same page with priority off.
      const t = await mount(browser, 'before-and-after-reveal', {width, editing, assets, blocks: presetBlocks});
      const base = await type(t);
      assert.deepEqual([base.h[0], base.h[1], base.p[0], base.trust[0], base.btn[0], base.btn[2], base.btn[5]], ['Georgia', '700', 'Arial', 'Arial', 'Arial', '16px', '12px'], tag + ' theme type and button'); checks++;
      assert.equal(await t.page.locator('#shopify-section-test :is([data-own-font], [data-own-weight], [data-own-size], [data-own-shape])').count(), 0, tag + ' no own marks with switches off'); checks++;
      // Live on, live off.
      for (const [k, v] of Object.entries(custom)) await t.emit(v, t.blockId(k));
      expectCustom(await type(t), width, tag + ' live');
      for (const [k, v] of Object.entries(off)) await t.emit(v, t.blockId(k));
      assert.deepEqual(await type(t), base, tag + ' live off restores the theme'); checks++;
      assert.equal(await t.page.locator('#shopify-section-test :is([data-own-font], [data-own-weight], [data-own-size], [data-own-shape])').count(), 0, tag + ' live off removes the own marks'); checks++;
      // Redraw on, redraw off.
      await t.redraw({blocks: customBlocks});
      expectCustom(await type(t), width, tag + ' redraw');
      await t.redraw({blocks: presetBlocks});
      assert.deepEqual(await type(t), base, tag + ' redraw off restores the theme'); checks++;
      // Section custom fonts: heading font on the h2, body font on the text <p> and trust.
      await t.emit({enable_custom_fonts: true, heading_font: VERDANA, body_font: TAHOMA});
      let got = await type(t);
      assert.match(got.h[0], /^"?Verdana/); assert.match(got.p[0], /^"?Tahoma/); assert.match(got.trust[0], /^"?Tahoma/); checks += 3;
      await t.redraw({settings: {enable_custom_fonts: true, heading_font: VERDANA, body_font: TAHOMA}});
      got = await type(t);
      assert.match(got.h[0], /^"?Verdana/, tag + ' redraw section heading font'); assert.match(got.p[0], /^"?Tahoma/, tag + ' redraw section body font'); assert.match(got.trust[0], /^"?Tahoma/); checks += 3;
      await t.emit({enable_custom_fonts: false});
      assert.deepEqual(await type(t), base, tag + ' section fonts off restores the theme'); checks++;
      assert.deepEqual(t.errors, []); checks++;
      await t.page.close();
      // First paint (no controller) equals hydrated paint with every custom switch on.
      for (const settings of [{}, {enable_custom_fonts: true, heading_font: VERDANA, body_font: TAHOMA}]) {
        const cold = await mount(browser, 'before-and-after-reveal', {width, editing, assets: ['before-after-controls.css'], blocks: customBlocks, settings});
        const warm = await mount(browser, 'before-and-after-reveal', {width, editing, assets, blocks: customBlocks, settings});
        await warm.page.waitForTimeout(150);
        const a = await type(cold), b = await type(warm);
        expectCustom(a, width, tag + ' first paint'); expectCustom(b, width, tag + ' hydrated');
        assert.deepEqual((await boxes(warm)).slice(0, 80), (await boxes(cold)).slice(0, 80), tag + ' custom first paint equals hydrated paint'); checks++;
        await cold.page.close(); await warm.page.close();
      }
    }
    // Every option of every select looks different, with the theme priority rules on.
    for (const width of [375, 1366]) {
      const t = await mount(browser, 'before-and-after-reveal', {width, assets, blocks: presetBlocks});
      const get = (sel, fn) => () => t.page.evaluate(([sel, fn]) => { const el = document.querySelector('#shopify-section-test ' + sel); return new Function('el', 'c', 'return ' + fn)(el, getComputedStyle(el)); }, [sel, fn]);
      const all = list => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b]));
      const SEL = [
        ['', 'section_width', ['container', 'fluid_container', 'stretch_width', 'full_width'], get('[data-before-after-controls]', "c.maxWidth + '|' + getComputedStyle(el.querySelector('.bar__inner')).paddingLeft"), {}, l => all(l).filter(([a, b]) => width >= 768 || !(a === 'stretch_width' && b === 'full_width'))],
        ['', 'show_section_on', ['all', 'mobile', 'desktop'], get('[data-before-after-controls]', 'c.display'), {}, () => width >= 768 ? [['all', 'mobile'], ['mobile', 'desktop']] : [['all', 'desktop'], ['mobile', 'desktop']]],
        ['', 'image_aspect', ['1 / 1', '4 / 5', '3 / 4', '2 / 3', '4 / 3', '16 / 9'], get('.bar__img-card', "Math.round(el.getBoundingClientRect().height)")],
        ['', 'arrow_style', ['curved', 'arrow-thin', 'chevron', 'double-chevron', 'sparkle'], get('.bar__arrow', 'el.innerHTML')],
        ['', 'arrow_animation', ['none', 'pulse', 'wiggle', 'slide', 'bounce', 'spin'], get('.bar__arrow svg', 'c.animationName')],
        ['heading', 'weight', ['400', '500', '600', '700', '800'], get('.bar__heading', 'c.fontWeight'), {weight_enable: true}],
        ['subheading', 'weight', ['300', '400', '500', '600', '700'], get('.bar__sub p', 'c.fontWeight'), {weight_enable: true}],
        ['button', 'weight', ['400', '500', '600', '700'], get('.bar__btn', 'c.fontWeight'), {use_theme_button: false, weight_enable: true}],
      ];
      for (const [block, id, values, probe, extra = {}, pairs = all] of SEL) {
        const target = block ? t.blockId(block) : null;
        if (Object.keys(extra).length) await t.emit(extra, target);
        const seen = {};
        for (const v of values) { await t.emit({[id]: v}, target); seen[v] = await probe(); }
        for (const [a, b] of pairs(values)) assert.notEqual(seen[a], seen[b], `reveal ${width}: ${block || 'section'}.${id} ${a} and ${b} look the same`);
        checks++;
        const src = block ? t.section.blocks.find(b => b.type === block).settings : t.section.settings;
        await t.emit(Object.fromEntries([id, ...Object.keys(extra)].map(k => [k, src[k] ?? null])), target);
      }
      assert.deepEqual(t.errors, []); checks++;
      await t.page.close();
    }
    // Priority off: the theme values still reach every element.
    for (const width of [375, 1366]) {
      const t = await mount(browser, 'before-and-after-reveal', {width, assets, blocks: presetBlocks, priority: 'off'});
      const got = await type(t);
      assert.deepEqual([got.h[0], got.p[0], got.trust[0], await t.css('.bar__heading', 'color'), await t.css('.bar__sub p', 'color'), await t.css('.bar__btn', 'backgroundColor'), await t.css('.bar__btn', 'borderTopLeftRadius')], ['Georgia', 'Arial', 'Arial', 'rgb(255, 255, 255)', 'rgb(204, 204, 204)', 'rgb(18, 52, 86)', '12px'], 'reveal priority off ' + width + ' theme inheritance'); checks++;
      for (const [k, v] of Object.entries(custom)) await t.emit(v, t.blockId(k));
      expectCustom(await type(t), width, 'reveal priority off ' + width + ' live');
      assert.deepEqual(t.errors, []); checks++;
      await t.page.close();
    }
    console.log(checks + ' Before And After Reveal lifecycle, instance, first-paint, redraw and typography/button priority checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
