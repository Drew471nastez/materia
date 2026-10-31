/* Image With Text Stats: theme inheritance, every control (live and after a redraw), desktop/mobile
   values, layouts, two instances, added blocks, redraw lifecycle, ring reveal, carousel, videos,
   first paint, reduced motion. Run: node tests/theme-media-stats-reels-stats.cjs */
const L = require('./theme-media-stats-reels-lib.cjs');
const {assert, ASSET, WIDTHS, DESK, read, controls, coverage, snapshot, instrument, counts} = L;
const NAME = 'image-with-text-stats';
const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const box = async (t, sel) => t.page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return r.width; }, '#shopify-section-test ' + sel);
const IMG = {src: 'https://cdn.test/a.png', alt: 'Bottle', width: 600, height: 800};
const VIDEO = {sources: [{format: 'mp4', url: 'https://cdn.test/v.mp4'}], preview_image: {src: 'https://cdn.test/p.png'}};

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: '.iws', css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'full_width', sel: '.iws__inner', css: 'maxWidth', exp: 'none'},
  {id: 'reset_spacing', v: false, live: false, check: async t => assert.equal(await t.page.evaluate(() => /padding-top: 0 !important/.test(document.querySelector('#shopify-section-test style[data-rs-bulletproof]').textContent)), false)},
  {id: 'media_position', v: 'right', sel: '.iws__grid', css: 'flexDirection', exp: w => DESK(w) ? 'row-reverse' : 'column'},
  {id: 'content_align', v: 'center', sel: '.iws__text', css: 'textAlign', exp: w => DESK(w) ? 'center' : 'left'},
  {id: 'media_column_width', v: 40, check: async (t, w) => { const r = ((await box(t, '.iws__media')) + (DESK(w) ? 32 : 0)) / (await box(t, '.iws__grid')); assert.ok(DESK(w) ? Math.abs(r - 0.4) < 0.01 : r > 0.99, 'media column ' + r); }},
  {id: 'gap_desktop', v: 40, sel: '.iws__grid', css: 'rowGap', exp: w => DESK(w) ? '40px' : '32px'},
  {id: 'content_gap', v: 10, sel: '.iws__text', css: 'rowGap', exp: '10px'},
  {id: 'per_row', v: '2', sel: '.iws__progress', css: 'visible', exp: false},
  {id: 'carousel_autoplay', v: true, solo: true, check: async t => { await t.page.waitForTimeout(150); assert.ok((await counts(t.page)).active >= 1, 'autoplay timer runs'); }},
  {id: 'carousel_autoplay_speed', v: 2, pre: {carousel_autoplay: true}, solo: true, check: async t => { await t.page.waitForTimeout(2600); assert.ok(await read(t, '[data-iws-grid]', '.scrollLeft') > 0, 'autoplay moved the carousel'); }},
  {id: 'media_aspect_w', v: 1, sel: '.iws__slot', css: 'aspectRatio', exp: '1 / 4'},
  {id: 'media_aspect_h', v: 1, sel: '.iws__slot', css: 'aspectRatio', exp: '3 / 1'},
  {id: 'media_radius', v: 5, sel: '.iws__slot', css: 'borderTopLeftRadius', exp: '5px'},
  {id: 'media_gap', v: 20, sel: '.iws__media-grid', css: 'columnGap', exp: '20px'},
  {id: 'progress_height', v: 6, sel: '.iws__progress', css: 'height', exp: '6px'},
  {id: 'progress_margin', v: 30, sel: '.iws__progress', css: 'marginTop', exp: '30px'},
  {id: 'ring_size', v: 100, sel: '.iws__stat-ring', css: 'width', exp: '100px'},
  {id: 'percent_size', v: 20, sel: '.iws__stat-percent', css: 'fontSize', exp: '20px'},
  {id: 'stat_text_size', v: 19, sel: '.iws__stat-body', css: 'fontSize', exp: '19px'},
  {id: 'stat_gap', v: 30, sel: '.iws__stat', css: 'columnGap', exp: '30px'},
  {id: 'stat_pad_y', v: 10, sel: '.iws__stat', css: 'paddingTop', exp: '10px'},
  {id: 'section_bg', v: '#abcdef', ...C, sel: '.iws', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'text_color', v: '#111111', ...C, sel: '.iws__text', css: 'color', exp: 'rgb(17, 17, 17)'},
  {id: 'heading_color', v: '#ff00ff', ...C, sel: '.iws__stat-percent', css: 'color', exp: 'rgb(255, 0, 255)'},
  {id: 'accent_color', v: '#00ff00', ...C, sel: '.iws__stat-ring-fill', css: 'stroke', exp: 'rgb(0, 255, 0)'},
  {id: 'ring_bg', v: '#0000ff', ...C, sel: '.iws__stat-ring-bg', css: 'stroke', exp: 'rgb(0, 0, 255)'},
  {id: 'stat_divider', v: '#ff0000', ...C, sel: '.iws__stat', css: 'borderTopColor', exp: 'rgb(255, 0, 0)'},
  {id: 'stat_text_color', v: '#123123', ...C, sel: '.iws__stat-body', css: 'color', exp: 'rgb(18, 49, 35)'},
  {id: 'progress_track', v: '#222222', ...C, sel: '.iws__progress', css: 'backgroundColor', exp: 'rgb(34, 34, 34)'},
  {id: 'progress_fill', v: '#eeeeee', ...C, sel: '.iws__progress-fill', css: 'backgroundColor', exp: 'rgb(238, 238, 238)'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.iws__heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.iws__stat-body', css: 'fontFamily', exp: /Tahoma/},
  {id: 'padding_top_desktop', v: 70, sel: '.iws', css: 'paddingTop', exp: w => DESK(w) ? '70px' : '60px'},
  {id: 'padding_bottom_desktop', v: 72, sel: '.iws', css: 'paddingBottom', exp: w => DESK(w) ? '72px' : '60px'},
  {id: 'side_padding_desktop', v: 50, sel: '.iws', css: 'paddingLeft', exp: w => DESK(w) ? '50px' : '20px'},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: w => DESK(w) ? '20px' : '0px'},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: w => DESK(w) ? '22px' : '0px'},
  {id: 'content_align_mobile', v: 'right', sel: '.iws__text', css: 'textAlign', exp: w => DESK(w) ? 'left' : 'right'},
  {id: 'gap_mobile', v: 12, sel: '.iws__grid', css: 'rowGap', exp: w => DESK(w) ? '64px' : '12px'},
  {id: 'padding_top_mobile', v: 30, sel: '.iws', css: 'paddingTop', exp: w => DESK(w) ? '100px' : '30px'},
  {id: 'padding_bottom_mobile', v: 31, sel: '.iws', css: 'paddingBottom', exp: w => DESK(w) ? '100px' : '31px'},
  {id: 'side_padding_mobile', v: 11, sel: '.iws', css: 'paddingLeft', exp: w => DESK(w) ? '32px' : '11px'},
  {id: 'section_margin_top_mobile', v: 9, sel: ':wrapper', css: 'marginTop', exp: w => DESK(w) ? '0px' : '9px'},
  {id: 'section_margin_bottom_mobile', v: 8, sel: ':wrapper', css: 'marginBottom', exp: w => DESK(w) ? '0px' : '8px'},
  /* blocks */
  {block: 'media', id: 'image', v: IMG, sel: '.iws__slot img', css: '@src', exp: /cdn\.test\/a\.png/},
  {block: 'media', id: 'media_type', v: 'video_url', preBlock: true, pre: {video_url: 'https://cdn.test/u.mp4'}, live: false, solo: true, sel: '.iws__slot video', css: '@src', exp: 'https://cdn.test/u.mp4'},
  {block: 'media', id: 'video_url', v: 'https://cdn.test/w.mp4', preBlock: true, pre: {media_type: 'video_url'}, live: false, solo: true, sel: '.iws__slot video', css: '@src', exp: 'https://cdn.test/w.mp4'},
  {block: 'media', id: 'video', v: VIDEO, preBlock: true, pre: {media_type: 'video'}, live: false, solo: true, sel: '.iws__slot video', css: '@poster', exp: /p\.png/},
  {block: 'media', id: 'muted', v: false, preBlock: true, pre: {media_type: 'video_url', video_url: 'https://cdn.test/u.mp4'}, live: false, solo: true, sel: '.iws__slot video', css: '.muted', exp: false},
  {block: 'media', id: 'loop', v: false, preBlock: true, pre: {media_type: 'video_url', video_url: 'https://cdn.test/u.mp4'}, live: false, solo: true, sel: '.iws__slot video', css: '.loop', exp: false},
  {block: 'media', id: 'show_controls', v: true, preBlock: true, pre: {media_type: 'video_url', video_url: 'https://cdn.test/u.mp4'}, live: false, solo: true, sel: '.iws__slot video', css: '.controls', exp: true},
  {block: 'media', id: 'autoplay', v: false, preBlock: true, pre: {media_type: 'video_url', video_url: 'https://cdn.test/u.mp4'}, live: false, solo: true, check: async t => { const a = (await counts(t.page)).play; await t.page.waitForTimeout(300); assert.equal((await counts(t.page)).play, a, 'no autoplay when off'); }},
  {block: 'heading', id: 'text', v: 'Real <strong>results</strong>', sel: '.iws__heading strong', css: 'text', exp: 'results'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#cc0033'}, sel: '.iws__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'color', v: '#cc0033', ...BC, sel: '.iws__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'uppercase', v: false, sel: '.iws__heading', css: 'textTransform', exp: 'none'},
  {block: 'heading', id: 'weight_enable', v: true, sel: '.iws__heading', css: 'fontWeight', exp: '800'},
  {block: 'heading', id: 'weight', v: '300', preBlock: true, pre: {weight_enable: true}, sel: '.iws__heading', css: 'fontWeight', exp: '300'},
  {block: 'heading', id: 'size_desktop', v: 60, sel: '.iws__heading', css: 'fontSize', exp: w => DESK(w) ? '60px' : '32px'},
  {block: 'heading', id: 'size_mobile', v: 22, sel: '.iws__heading', css: 'fontSize', exp: w => DESK(w) ? '48px' : '22px'},
  {block: 'subheading', id: 'text', v: '<p>Made <em>daily</em></p>', sel: '.iws__subheading em', css: 'text', exp: 'daily'},
  {block: 'subheading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#00cc00'}, sel: '.iws__subheading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'subheading', id: 'color', v: '#00cc00', ...BC, sel: '.iws__subheading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'subheading', id: 'weight_enable', v: true, sel: '.iws__subheading', css: 'fontWeight', exp: '400'},
  {block: 'subheading', id: 'weight', v: '600', preBlock: true, pre: {weight_enable: true}, sel: '.iws__subheading', css: 'fontWeight', exp: '600'},
  {block: 'subheading', id: 'size_desktop', v: 21, sel: '.iws__subheading', css: 'fontSize', exp: w => DESK(w) ? '21px' : '14px'},
  {block: 'subheading', id: 'size_mobile', v: 12, sel: '.iws__subheading', css: 'fontSize', exp: w => DESK(w) ? '16px' : '12px'},
  {block: 'stat', id: 'percent', v: 50, check: async t => { await t.page.evaluate(() => document.querySelector('#shopify-section-test .iws__stat-ring-fill').getAnimations().forEach(a => a.finish())); assert.equal(await read(t, '.iws__stat-percent', 'text'), '50%'); assert.ok(Math.abs(parseFloat(await read(t, '.iws__stat-ring-fill', 'strokeDashoffset')) - 87.97) < 0.05, 'ring half full'); }},
  {block: 'stat', id: 'text', v: '<p>of orders <strong>ship</strong> in a day</p>', sel: '.iws__stat-body strong', css: 'text', exp: 'ship'},
  {block: 'stat', id: 'weight_enable', v: true, sel: '.iws__stat-body', css: 'fontWeight', exp: '400'},
  {block: 'stat', id: 'weight', v: '700', preBlock: true, pre: {weight_enable: true}, sel: '.iws__stat-body', css: 'fontWeight', exp: '700'},
  {block: 'footnote', id: 'text', v: 'Based on <em>store</em> data', sel: '.iws__footnote em', css: 'text', exp: 'store'},
  {block: 'footnote', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#0000cc'}, sel: '.iws__footnote', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'footnote', id: 'color', v: '#0000cc', ...BC, sel: '.iws__footnote', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'footnote', id: 'weight_enable', v: true, sel: '.iws__footnote', css: 'fontWeight', exp: '400'},
  {block: 'footnote', id: 'weight', v: '700', preBlock: true, pre: {weight_enable: true}, sel: '.iws__footnote', css: 'fontWeight', exp: '700'},
  {block: 'footnote', id: 'size', v: 17, sel: '.iws__footnote', css: 'fontSize', exp: '17px'},
  {block: 'footnote', id: 'margin_top', v: 30, sel: '.iws__footnote', css: 'marginTop', exp: '30px'},
];

(async () => {
  let checks = 0;
  const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
  const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
  assert.deepEqual(L.schemaProblems(NAME), []); checks++;
  coverage(NAME, TABLE, ['enable_custom_style', 'enable_custom_fonts', 'text_max_width']); checks++;
  const browser = await L.launch();
  try {
    for (const width of WIDTHS) for (const editing of [true, false]) {
      const tag = `@${width} ${editing ? 'editor' : 'storefront'}`;
      /* First paint equals the hydrated paint (editor: final rings; storefront: same geometry). */
      const SEL = '#shopify-section-test :is(.iws, .iws__grid, .iws__media, .iws__slot, .iws__text, .iws__heading, .iws__stat, .iws__stat-ring, .iws__stat-body, .iws__footnote, .iws__progress)';
      const cold = await L.mount(browser, NAME, {width, editing, assets: []}), a = await snapshot(cold, SEL); await cold.page.close();
      const t = await L.mount(browser, NAME, {width, editing, assets: [ASSET]}); await t.page.waitForTimeout(200);
      const b = await snapshot(t, SEL);
      assert.deepEqual(b, a, 'first paint equals hydrated paint ' + tag); checks++;
      await instrument(t.page);
      /* 2. Theme inheritance */
      eq(await read(t, '.iws', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + tag);
      eq(await read(t, '.iws__heading', 'color'), 'rgb(255, 255, 255)');
      ok(/Georgia/.test(await read(t, '.iws__heading', 'fontFamily')), 'heading font');
      eq(await read(t, '.iws__stat-body', 'color'), 'rgb(204, 204, 204)');
      ok(/Arial/.test(await read(t, '.iws__stat-body', 'fontFamily')), 'body font');
      eq(await read(t, '.iws__stat-ring-fill', 'stroke'), 'rgb(51, 102, 153)', 'ring follows primary');
      eq(await read(t, '.iws__stat', 'borderTopColor'), 'rgb(68, 85, 102)', 'dividers follow border');
      eq(await read(t, '.iws__heading', '.tagName'), 'H2', 'heading is h2');
      /* 3. Colour scheme live and after redraw */
      await t.emit({color_scheme: 'alt-scheme'}); eq(await read(t, '.iws', 'backgroundColor'), 'rgb(250, 250, 250)'); eq(await read(t, '.iws__heading', 'color'), 'rgb(16, 16, 16)');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await read(t, '.iws', 'backgroundColor'), 'rgb(250, 250, 250)');
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      /* 4. Custom style off restores the scheme exactly */
      await t.emit({enable_custom_style: true, section_bg: '#abcdef', accent_color: '#00ff00', stat_divider: '#ff0000'}); eq(await read(t, '.iws', 'backgroundColor'), 'rgb(171, 205, 239)');
      await t.emit({enable_custom_style: false});
      eq(await read(t, '.iws', 'backgroundColor'), 'rgb(24, 32, 40)'); eq(await read(t, '.iws__stat-ring-fill', 'stroke'), 'rgb(51, 102, 153)'); eq(await read(t, '.iws__stat', 'borderTopColor'), 'rgb(68, 85, 102)');
      await t.emit({enable_custom_fonts: true, heading_font: {family: 'Verdana'}}); ok(/Verdana/.test(await read(t, '.iws__heading', 'fontFamily')));
      await t.emit({enable_custom_fonts: false}); ok(/Georgia/.test(await read(t, '.iws__heading', 'fontFamily')), 'fonts off restore the theme');
      /* 10. Unrelated edits keep the image element and its source, and do not replay the rings */
      await t.redraw({blocks: t.rendered[0].section.blocks.map((x, i) => ({type: x.type, settings: i === 0 ? {...x.settings, image: IMG} : x.settings}))});
      await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test .iws__slot img'); window.__src = window.__img.src; });
      if (!editing) await t.page.waitForTimeout(1600);
      for (const patch of [{padding_top_mobile: 33}, {ring_size: 90}, {percent_size: 18}, {media_radius: 3}]) await t.emit(patch);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .iws__slot img') === window.__img && window.__img.src === window.__src), 'image kept ' + tag);
      eq(await read(t, '.iws', '@data-iws-reveal'), editing ? null : 'done', 'reveal state kept');
      eq(await t.page.evaluate(() => document.querySelector('#shopify-section-test .iws__stat-ring-fill').getAnimations().length), 0, 'no ring replay');
      /* 5/6. Every control, live and after redraw */
      const full = L.schemaOf(NAME).schema.presets[0].blocks.flatMap(x => x.type === 'heading' ? [x, {type: 'subheading'}] : [x]);
      await t.redraw({blocks: full});
      checks += await controls(t, width, TABLE);
      /* text max width applies without media */
      await t.redraw({settings: {text_max_width: 600}, blocks: L.schemaOf(NAME).schema.presets[0].blocks.filter(x => x.type !== 'media')});
      eq(await read(t, '.iws__text', 'maxWidth'), DESK(width) ? '600px' : 'none', 'text width without media');
      await t.emit({text_max_width: 500}); eq(await read(t, '.iws__text', 'maxWidth'), DESK(width) ? '500px' : 'none', 'text width live');
      /* video playback settings live */
      await t.redraw({settings: {text_max_width: 900}, blocks: [{type: 'media', settings: {media_type: 'video_url', video_url: 'https://cdn.test/u.mp4'}}, {type: 'heading'}]});
      for (const [k, v, prop] of [['muted', false, 'muted'], ['loop', false, 'loop'], ['show_controls', true, 'controls']]) { await t.emit({[k]: v}, t.blockId('media')); eq(await read(t, '.iws__slot video', '.' + prop), v, 'live ' + k); }
      /* 7. Layout variants are visibly different (4 media) */
      const four = [{type: 'media'}, {type: 'media'}, {type: 'media'}, {type: 'media'}, {type: 'heading'}, {type: 'stats_group'}, {type: 'stat'}];
      await t.redraw({blocks: four});
      const widths = {};
      for (const per of ['1', '1.2', '1.5', '2', '2.5', '3']) { await t.emit({per_row: per}); widths[per] = Math.round(await box(t, '.iws__slot')); }
      eq(new Set(Object.values(widths)).size, 6, 'per_row widths differ ' + JSON.stringify(widths));
      await t.emit({per_row: 'auto'}); eq(Math.round(await box(t, '.iws__slot')), widths['2.5'], 'auto with 3+ items is 2.5 per row');
      const xs = {};
      for (const al of ['left', 'center', 'right']) { await t.emit({content_align: al, content_align_mobile: al}); xs[al] = await t.page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('#shopify-section-test .iws__heading')); return Math.round(r.getClientRects()[0].x); }); }
      eq(new Set(Object.values(xs)).size, 3, 'alignments differ');
      if (DESK(width)) { const pos = {}; for (const p of ['left', 'right']) { await t.emit({media_position: p}); pos[p] = await t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .iws__media').getBoundingClientRect().x)); } ok(pos.left !== pos.right, 'media position differs'); }
      /* carousel: keyboard, drag, progress */
      await t.emit({per_row: '1.2'});
      await t.page.focus('#shopify-section-test [data-iws-grid]'); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(700);
      ok(await read(t, '[data-iws-grid]', '.scrollLeft') > 0, 'arrow key scrolls the carousel');
      ok(parseFloat(await read(t, '.iws__progress-fill', 'width')) > 0, 'progress follows scroll');
      eq(await read(t, '[data-iws-grid]', 'outlineStyle'), 'solid', 'focus ring visible');
      /* 9. Added block + redraw, no duplicate controllers or timers */
      const before = await counts(t.page);
      await t.redraw({settings: {carousel_autoplay: true}, blocks: four.concat([{type: 'footnote', settings: {text: 'Added note'}}])});
      eq(await read(t, '.iws__footnote', 'text'), 'Added note', 'added block renders');
      await t.emit({text: 'Edited note'}, t.blockId('footnote')); eq(await read(t, '.iws__footnote', 'text'), 'Edited note', 'added block live');
      for (let i = 0; i < 3; i++) await t.redraw({});
      await t.page.waitForTimeout(150);
      const after = await counts(t.page);
      eq(after.roots, before.roots, 'one controller per root after redraws');
      ok(after.active <= 1, 'one autoplay timer after redraws: ' + after.active);
      eq(t.errors.length, 0, 'no errors ' + t.errors.join(' '));
      ok(await t.noOverflow(), 'no horizontal overflow ' + tag);
      await t.page.close();
      /* 8. Two instances stay independent */
      const two = await L.mount(browser, NAME, {width, editing, instances: [{uid: 'a'}, {uid: 'b'}], assets: [ASSET]});
      await two.emit({enable_custom_style: true, section_bg: '#abcdef', ring_size: 99}, undefined, 'a');
      await two.emit({text: 'Only A'}, two.blockId('heading', 0, 'a'), 'a');
      eq(await read(two, '.iws', 'backgroundColor', 'a'), 'rgb(171, 205, 239)'); eq(await read(two, '.iws', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', 'b untouched');
      eq(await read(two, '.iws__stat-ring', 'width', 'b'), '70px'); eq(await read(two, '.iws__heading', 'text', 'b'), 'Results');
      await two.page.close();
      /* 12. Reduced motion: rings full and numbers shown at once, no carousel autoplay */
      const rm = await L.mount(browser, NAME, {width, editing, reducedMotion: 'reduce', settings: {carousel_autoplay: true}, assets: [ASSET]});
      await instrument(rm.page); await rm.page.waitForTimeout(100);
      eq(await read(rm, '.iws__stat-percent', 'opacity'), '1', 'number shown under reduced motion');
      ok(Math.abs(parseFloat(await read(rm, '.iws__stat-ring-fill', 'strokeDashoffset')) - 10.56) < 0.1, 'ring final under reduced motion');
      await rm.emit({carousel_autoplay_speed: 3}); eq((await counts(rm.page)).active, 0, 'no autoplay under reduced motion');
      await rm.page.close();
      process.stdout.write('.');
    }
    /* Storefront ring reveal waits for the section to come into view, once. */
    const sf = await L.mount(browser, NAME, {width: 1366, height: 400, editing: false, instances: [{uid: 'test'}], assets: []});
    await sf.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '2000px'; document.body.prepend(s); });
    await sf.page.addScriptTag({content: require('fs').readFileSync(require('path').join(__dirname, '../shopify/assets/' + ASSET), 'utf8')}); await sf.page.waitForTimeout(200);
    eq(await read(sf, '.iws', '@data-iws-reveal'), 'pending', 'pending below the fold');
    eq(await read(sf, '.iws__stat-percent', 'opacity'), '0');
    await sf.page.evaluate(() => document.getElementById('shopify-section-test').scrollIntoView()); await sf.page.waitForTimeout(1900);
    eq(await read(sf, '.iws', '@data-iws-reveal'), 'done'); eq(await read(sf, '.iws__stat-percent', 'opacity'), '1');
    await sf.emit({ring_size: 80}); eq(await sf.page.evaluate(() => document.querySelector('#shopify-section-test .iws__stat-ring-fill').getAnimations().length), 0, 'live edit does not replay');
    await sf.page.close();
  } finally { await browser.close(); }
  console.log(`\n${NAME}: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
