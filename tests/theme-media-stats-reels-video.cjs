/* Shoppable Video: theme inheritance, every control (live and after a redraw), carousel (arrows,
   dots, progress, loop, autoplay, keyboard, 44px targets, one init per redraw), videos (play in view,
   pause off screen, none under reduced motion), product chip from the picker, two instances, added
   blocks, first paint. Run: node tests/theme-media-stats-reels-video.cjs */
const L = require('./theme-media-stats-reels-lib.cjs');
const {assert, ASSET, WIDTHS, DESK, read, controls, coverage, snapshot, instrument, counts, hoverBg, smallTargets, serveVideo, playing} = L;
const NAME = 'shopable-video', ROOT = '[data-msr]', S2 = '.msr-car__slide:nth-child(2) ';
const C = {pre: {enable_custom_style: true}}, TWO = {pre: {columns: 2}};
const IMG = {src: 'https://cdn.test/a.png', alt: 'Poster', width: 800, height: 1000};
const CLIP = {sources: [{format: 'mp4', url: 'https://cdn.test/v.mp4'}]};
const PRODUCT = {title: 'Prime1 Tub', url: '/products/prime1', price: 2990, featured_image: {src: 'https://cdn.test/p.png'}};
const perRow = t => t.page.evaluate(() => { const tr = document.querySelector('#shopify-section-test .msr-car__track'), s = tr.querySelector('.msr-car__slide'), g = parseFloat(getComputedStyle(tr).columnGap); return Math.round((tr.clientWidth + g) / (s.getBoundingClientRect().width + g)); });
const NO_AUTO = {pre: {autoplay_videos: false}};

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: ROOT, css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'full_width', sel: '.sv__inner', css: 'paddingLeft', exp: '0px'},
  {id: 'reset_spacing', v: false, live: false, check: async t => assert.equal(await t.page.evaluate(() => /margin-top: 0/.test(document.querySelector('#shopify-section-test style[data-rs-bulletproof]').textContent)), false)},
  {id: 'header_alignment', v: 'center', sel: '.sv__header', css: 'textAlign', exp: 'center'},
  {id: 'columns', v: 3, check: async (t, w) => assert.equal(await perRow(t), DESK(w) ? 3 : 1)},
  {id: 'column_gap', v: 30, sel: '.msr-car__track', css: 'columnGap', exp: '30px'},
  {id: 'show_arrow', v: true, ...TWO, sel: '[data-msr-next]', css: 'visible', exp: true},
  {id: 'carousel_pagination', v: 'show_progress_bar', ...TWO, sel: '.msr-car__progress', css: 'visible', exp: true},
  {id: 'pagination_style', v: 'number', ...TWO, sel: '.msr-car__dot span', css: 'visible', exp: true},
  {id: 'pagination_position', v: 'right', sel: '.msr-car__dots', css: 'justifyContent', exp: 'flex-end'},
  {id: 'infinite', v: true, pre: {columns: 2, show_arrow: true}, sel: '[data-msr-prev]', css: '.disabled', exp: false},
  {id: 'autoplay_carousel', v: true, ...TWO, check: async t => { await t.page.waitForTimeout(150); assert.ok((await counts(t.page)).active >= 1, 'autoplay timer runs'); }},
  {id: 'autorotate_speed', v: 2, pre: {columns: 2, autoplay_carousel: true}, check: async t => { await t.page.waitForTimeout(2700); assert.ok(await read(t, '.msr-car__track', '.scrollLeft') > 0, 'carousel advanced'); }},
  {id: 'image_ratio', v: 'square', sel: '.sv-card', css: 'aspectRatio', exp: '1 / 1'},
  {id: 'custom_ratio', v: '2:1', pre: {image_ratio: 'custom'}, sel: '.sv-card', css: 'aspectRatio', exp: '2 / 1'},
  {id: 'autoplay_videos', v: false, check: async t => { await t.page.waitForTimeout(300); assert.equal(await playing(t, '#shopify-section-test video'), false); }},
  {id: 'muted', v: false, ...NO_AUTO, sel: 'video', css: '.muted', exp: false},
  {id: 'loop_videos', v: false, sel: 'video', css: '.loop', exp: false},
  {id: 'show_controls', v: true, check: async t => { assert.equal(await read(t, 'video', '.controls'), true); assert.equal(await read(t, '.sv-card__play', 'visible'), false); }},
  {id: 'card_radius', v: 4, sel: '.sv-card', css: 'borderTopLeftRadius', exp: '4px'},
  {id: 'custom_card_padding', v: 30, sel: '.sv-card__content', css: 'paddingLeft', exp: '30px'},
  {id: 'overlay_opacity', v: 50, sel: '.sv-card__overlay', css: 'backgroundColor', exp: /0\.5\)$/},
  {id: 'custom_section_bg', v: '#abcdef', ...C, sel: ROOT, css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'custom_heading_color', v: '#ffff00', ...C, sel: '.sv-card__heading', css: 'color', exp: 'rgb(255, 255, 0)'},
  {id: 'custom_card_overlay_color', v: '#ff0000', ...C, sel: '.sv-card__overlay', css: 'backgroundColor', exp: /^(rgba\(255, 0, 0|color\(srgb 1 0 0)/},
  {id: 'custom_cta_bg', v: '#00aa00', ...C, sel: '.sv-card__cta', css: 'backgroundColor', exp: 'rgb(0, 170, 0)'},
  {id: 'custom_cta_text', v: '#010203', ...C, sel: '.sv-card__cta', css: 'color', exp: 'rgb(1, 2, 3)'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.sv__heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.sv__desc', css: 'fontFamily', exp: /Tahoma/},
  {id: 'custom_heading_size', v: 24, sel: '.sv-card__heading', css: 'fontSize', exp: '24px'},
  {id: 'padding_top', v: 90, check: async t => assert.ok(parseFloat(await read(t, ROOT, 'paddingTop')) >= 67)},
  {id: 'padding_bottom', v: 90, check: async t => assert.ok(parseFloat(await read(t, ROOT, 'paddingBottom')) >= 67)},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: w => DESK(w) ? '20px' : '0px'},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: w => DESK(w) ? '22px' : '0px'},
  {id: 'columns_mobile', v: 2, check: async (t, w) => assert.equal(await perRow(t), DESK(w) ? 4 : 2)},
  {id: 'section_margin_top_mobile', v: 9, sel: ':wrapper', css: 'marginTop', exp: w => DESK(w) ? '0px' : '9px'},
  {id: 'section_margin_bottom_mobile', v: 8, sel: ':wrapper', css: 'marginBottom', exp: w => DESK(w) ? '0px' : '8px'},
  {block: 'eyebrow', id: 'text', v: 'New <em>in</em>', sel: '.sv__eyebrow em', css: 'text', exp: 'in'},
  {block: 'eyebrow', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#ff0000'}, sel: '.sv__eyebrow', css: 'color', exp: 'rgb(255, 0, 0)'},
  {block: 'eyebrow', id: 'color', v: '#00ff00', preBlock: true, pre: {enable_custom_style: true}, sel: '.sv__eyebrow', css: 'color', exp: 'rgb(0, 255, 0)'},
  {block: 'eyebrow', id: 'size_enable', v: true, preBlock: true, pre: {size: 20}, sel: '.sv__eyebrow', css: 'fontSize', exp: '20px'},
  {block: 'eyebrow', id: 'size', v: 22, preBlock: true, pre: {size_enable: true}, sel: '.sv__eyebrow', css: 'fontSize', exp: '22px'},
  {block: 'eyebrow', id: 'enable_custom_fonts', v: true, preBlock: true, pre: {font: {family: 'Verdana'}}, sel: '.sv__eyebrow', css: 'fontFamily', exp: /^Verdana/},
  {block: 'eyebrow', id: 'font', v: {family: 'Tahoma'}, preBlock: true, pre: {enable_custom_fonts: true}, sel: '.sv__eyebrow', css: 'fontFamily', exp: /^Tahoma/},
  {block: 'heading', id: 'text', v: 'Shop <strong>Prime1</strong>', sel: '.sv__heading strong', css: 'text', exp: 'Prime1'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#ff0000'}, sel: '.sv__heading', css: 'color', exp: 'rgb(255, 0, 0)'},
  {block: 'heading', id: 'color', v: '#00ff00', preBlock: true, pre: {enable_custom_style: true}, sel: '.sv__heading', css: 'color', exp: 'rgb(0, 255, 0)'},
  {block: 'heading', id: 'weight_enable', v: true, preBlock: true, pre: {weight: '400'}, sel: '.sv__heading', css: 'fontWeight', exp: '400'},
  {block: 'heading', id: 'weight', v: '500', preBlock: true, pre: {weight_enable: true}, sel: '.sv__heading', css: 'fontWeight', exp: '500'},
  {block: 'heading', id: 'size_enable', v: true, sel: '.sv__heading', css: 'fontSize', exp: w => DESK(w) ? '36px' : '28px'},
  {block: 'heading', id: 'size_desktop', v: 50, preBlock: true, pre: {size_enable: true}, sel: '.sv__heading', css: 'fontSize', exp: w => DESK(w) ? '50px' : '28px'},
  {block: 'heading', id: 'size_mobile', v: 22, preBlock: true, pre: {size_enable: true}, sel: '.sv__heading', css: 'fontSize', exp: w => DESK(w) ? '36px' : '22px'},
  {block: 'heading', id: 'line_height', v: 2, preBlock: true, pre: {size_enable: true}, sel: '.sv__heading', css: 'lineHeight', exp: w => DESK(w) ? '72px' : '56px'},
  {block: 'heading', id: 'enable_custom_fonts', v: true, preBlock: true, pre: {font: {family: 'Verdana'}}, sel: '.sv__heading', css: 'fontFamily', exp: /^Verdana/},
  {block: 'heading', id: 'font', v: {family: 'Tahoma'}, preBlock: true, pre: {enable_custom_fonts: true}, sel: '.sv__heading', css: 'fontFamily', exp: /^Tahoma/},
  {block: 'subheading', id: 'text', v: '<p>Short <em>clips</em></p>', sel: '.sv__desc em', css: 'text', exp: 'clips'},
  {block: 'subheading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#ff0000'}, sel: '.sv__desc p', css: 'color', exp: 'rgb(255, 0, 0)'},
  {block: 'subheading', id: 'color', v: '#00ff00', preBlock: true, pre: {enable_custom_style: true}, sel: '.sv__desc p', css: 'color', exp: 'rgb(0, 255, 0)'},
  {block: 'subheading', id: 'size_enable', v: true, preBlock: true, pre: {size: 20}, sel: '.sv__desc p', css: 'fontSize', exp: '20px'},
  {block: 'subheading', id: 'size', v: 21, preBlock: true, pre: {size_enable: true}, sel: '.sv__desc p', css: 'fontSize', exp: '21px'},
  {block: 'subheading', id: 'line_height', v: 2, preBlock: true, pre: {size_enable: true, size: 20}, sel: '.sv__desc p', css: 'lineHeight', exp: '40px'},
  {block: 'subheading', id: 'enable_custom_fonts', v: true, preBlock: true, pre: {font: {family: 'Verdana'}}, sel: '.sv__desc p', css: 'fontFamily', exp: /^Verdana/},
  {block: 'subheading', id: 'font', v: {family: 'Tahoma'}, preBlock: true, pre: {enable_custom_fonts: true}, sel: '.sv__desc p', css: 'fontFamily', exp: /^Tahoma/},
  {block: 'video', n: 1, id: 'heading', v: 'Morning mix', sel: S2 + '[data-sv-card-heading]', css: 'text', exp: 'Morning mix'},
  {block: 'video', n: 1, id: 'cta_label', v: 'Buy the tub', sel: S2 + '[data-sv-cta-label]', css: 'text', exp: 'Buy the tub'},
  {block: 'video', n: 1, id: 'cta_link', v: '/products/x', preBlock: true, pre: {cta_label: 'Buy'}, sel: S2 + '.sv-card__cta', css: '@href', exp: '/products/x'},
  {block: 'video', n: 1, id: 'product', v: PRODUCT, preBlock: true, pre: {cta_label: 'Buy'}, check: async (t, w, how) => {
    assert.equal(await read(t, S2 + '.sv-card__cta', '@href'), '/products/prime1', 'button falls back to the product');
    if (how === 'redraw') { assert.equal(await read(t, S2 + '.sv-card__product-name', 'text'), 'Prime1 Tub'); assert.equal(await read(t, S2 + '.sv-card__product-price', 'text'), 'R$29.90'); assert.match(await read(t, S2 + '.sv-card__product img', '@src'), /p\.png/); }
  }},
  {block: 'video', n: 1, id: 'local_video', v: CLIP, live: false, sel: S2 + 'video source', css: '@src', exp: 'https://cdn.test/v.mp4'},
  {block: 'video', n: 1, id: 'video_url', v: {id: 'v123', type: 'vimeo'}, live: false, sel: S2 + 'iframe', css: '@src', exp: /player\.vimeo\.com\/video\/v123\?api=1/},
  {block: 'video', n: 1, id: 'poster_image', v: IMG, sel: S2 + '.sv-card img', css: '@src', exp: /a\.png/},
  {block: 'video', n: 1, id: 'content_position', v: 'top', sel: S2 + '.sv-card__content', css: 'top', exp: '0px'},
];
/* Saved instances from before the blocks: no text blocks, the header in the old section settings. */
const LEGACY = [
  {id: 'subheading', v: 'New <em>in</em>', sel: '.sv__eyebrow em', css: 'text', exp: 'in'},
  {id: 'heading', v: 'Shop <strong>Prime1</strong>', sel: '.sv__heading strong', css: 'text', exp: 'Prime1'},
  {id: 'description', v: '<p>Short <em>clips</em></p>', sel: '.sv__desc em', css: 'text', exp: 'clips'},
];
const LEGACY_SETTINGS = {subheading: 'Saved eyebrow', heading: 'Saved heading', description: '<p>Saved text</p>'};
const headOrder = (t, uid = 'test') => t.page.evaluate(uid => [...document.querySelectorAll('#shopify-section-' + uid + ' .sv__header > *')].filter(el => !el.hidden).map(el => el.dataset.msrType || (el.hasAttribute('data-sv-eyebrow') ? 'legacy-eyebrow' : el.hasAttribute('data-sv-heading') ? 'legacy-heading' : 'legacy-desc')), uid);

(async () => {
  let checks = 0;
  const ok = (c, m) => { assert.ok(c, m); checks++; }, eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
  eq(L.schemaProblems(NAME).length, 0, 'schema');
  coverage(NAME, TABLE, ['enable_custom_style', 'enable_custom_fonts', 'reveal']); checks++;
  const preset = L.schemaOf(NAME).schema.presets[0].blocks;
  const firstVideo = preset.findIndex(b => b.type === 'video');
  const full = preset.map((b, i) => i === firstVideo ? {type: 'video', settings: {...b.settings, local_video: CLIP}} : b);
  const videosOnly = full.filter(b => b.type === 'video');
  const browser = await L.launch();
  try {
    for (const width of WIDTHS) for (const editing of [true, false]) {
      const tag = `@${width} ${editing ? 'editor' : 'storefront'}`;
      const SEL = '#shopify-section-test :is([data-msr], .sv__header, .sv__heading, .msr-car__track, .msr-car__slide, .sv-card, .sv-card__content, .sv-card__heading, .sv-card__cta, .msr-car__controls, .msr-car__dot)';
      const cold = await L.mount(browser, NAME, {width, editing, blocks: full, assets: []}), a = await snapshot(cold, SEL); await cold.page.close();
      const t = await L.mount(browser, NAME, {width, editing, blocks: full, assets: [ASSET]}); await t.page.waitForTimeout(150);
      assert.deepEqual(await snapshot(t, SEL), a, 'first paint equals hydrated paint ' + tag); checks++;
      await instrument(t.page); await serveVideo(t.page); await t.redraw({}); await t.page.waitForTimeout(500);
      /* Theme inheritance and the button contract */
      eq(await read(t, ROOT, 'backgroundColor'), 'rgb(24, 32, 40)'); eq(await read(t, '.sv__heading', 'color'), 'rgb(255, 255, 255)'); ok(/Georgia/.test(await read(t, '.sv__heading', 'fontFamily')));
      eq(await read(t, '.sv__heading', '.tagName'), 'H2'); eq(await read(t, '.sv-card__heading', '.tagName'), 'H3');
      eq(await read(t, S2 + '.sv-card__heading', 'color'), 'rgb(255, 255, 255)', 'empty card headline follows the scheme heading');
      eq(await read(t, '.sv-card__cta', 'backgroundColor'), 'rgb(18, 52, 86)'); eq(await read(t, '.sv-card__cta', 'borderTopLeftRadius'), '12px'); eq(await hoverBg(t, '.sv-card__cta'), 'rgb(255, 0, 0)');
      eq(await read(t, '.sv-card__cta', '.tagName'), 'BUTTON', 'no link: a button');
      /* Video plays in view, muted, inline; pauses off screen; play button */
      eq(await read(t, 'video', '.muted'), true); eq(await read(t, 'video', '@autoplay'), null); eq(await read(t, 'video', '@playsinline'), '');
      ok(await playing(t, '#shopify-section-test video'), 'plays in view ' + tag);
      await t.root('.sv-card__play').first().click(); await t.page.waitForTimeout(100); eq(await playing(t, '#shopify-section-test video'), false, 'pause button');
      await t.root('.sv-card__play').first().click(); await t.page.waitForTimeout(150); ok(await playing(t, '#shopify-section-test video'), 'play button');
      await t.page.evaluate(() => { const s = document.createElement('div'); s.id = 'away'; s.style.height = '3000px'; document.body.append(s); window.scrollTo(0, 3000); }); await t.page.waitForTimeout(300);
      eq(await playing(t, '#shopify-section-test video'), false, 'paused off screen');
      await t.page.evaluate(() => { document.getElementById('away').remove(); window.scrollTo(0, 0); }); await t.redraw({}); await t.page.waitForTimeout(400);
      /* Scheme and custom style */
      await t.emit({color_scheme: 'alt-scheme'}); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(250, 250, 250)'); eq(await read(t, S2 + '.sv-card__heading', 'color'), 'rgb(16, 16, 16)');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(250, 250, 250)'); await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      await t.emit({enable_custom_style: true, custom_cta_bg: '#00aa00', custom_section_bg: '#abcdef'}); eq(await read(t, '.sv-card__cta', 'backgroundColor'), 'rgb(0, 170, 0)');
      await t.emit({enable_custom_style: false}); eq(await read(t, '.sv-card__cta', 'backgroundColor'), 'rgb(18, 52, 86)'); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(24, 32, 40)');
      /* Unrelated edits keep images and the playing video */
      await t.emit({poster_image: IMG}, t.blockId('video', 1));
      await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test .msr-car__slide:nth-child(2) .sv-card img'); window.__src = window.__img.src; window.__v = document.querySelector('#shopify-section-test video'); });
      for (const p of [{card_radius: 8}, {overlay_opacity: 20}, {column_gap: 10}]) await t.emit(p);
      ok(await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .msr-car__slide:nth-child(2) .sv-card img'); return i === window.__img && i.src === window.__src && document.querySelector('#shopify-section-test video') === window.__v; }), 'image and video kept');
      ok(await playing(t, '#shopify-section-test video'), 'video keeps playing through edits');
      await t.redraw({settings: {card_radius: 16, overlay_opacity: 10, column_gap: 16}, blocks: full});
      /* Every control */
      checks += await controls(t, width, TABLE);
      /* Carousel: arrows, loop, dots, keyboard, focus, targets */
      await t.redraw({settings: {show_arrow: true, columns: 2, infinite: false}});
      for (let i = 0; i < 2; i++) await t.redraw({});
      const step = await t.page.evaluate(() => { const s = document.querySelectorAll('#shopify-section-test .msr-car__slide'); return s[1].offsetLeft - s[0].offsetLeft; });
      await t.root('[data-msr-next]').click(); await t.page.waitForTimeout(700); eq(await read(t, '.msr-car__track', '.scrollLeft'), step, 'one card per click after redraws');
      await t.page.focus('#shopify-section-test .msr-car__track'); await t.page.keyboard.press('End'); await t.page.waitForTimeout(700);
      eq(await read(t, '[data-msr-next]', '.disabled'), true, 'next disabled at the end without loop');
      await t.emit({infinite: true}); eq(await read(t, '[data-msr-next]', '.disabled'), false);
      await t.root('[data-msr-next]').click(); await t.page.waitForTimeout(700); eq(await read(t, '.msr-car__track', '.scrollLeft'), 0, 'loop wraps to the start');
      await t.page.keyboard.press('Tab'); await t.page.focus('#shopify-section-test .msr-car__dot'); eq(await read(t, '.msr-car__dot', 'outlineStyle'), 'solid', 'dot focus ring');
      const small = await smallTargets(t); eq(small.length, 0, '44px targets ' + JSON.stringify(small));
      await t.emit({carousel_pagination: 'show_dots_on_mobile'});
      eq(await read(t, '.msr-car__dots', 'visible'), !DESK(width), 'dots on phones only');
      /* Card shapes differ */
      const shapes = new Set(); for (const r of ['tall', 'portrait', 'square', 'landscape']) { await t.emit({image_ratio: r}); shapes.add(await read(t, '.sv-card', 'box')); } eq(shapes.size, 4, 'card shapes differ');
      const pos = new Set(); for (const p of ['top', 'center', 'bottom']) { await t.emit({content_position: p}, t.blockId('video', 0)); pos.add(await read(t, '.sv-card__heading', 'box')); } eq(pos.size, 3, 'content positions differ');
      /* Added block + autoplay timer once after redraws */
      const before = await counts(t.page);
      await t.redraw({settings: {autoplay_carousel: true}, blocks: full.concat([{type: 'video', settings: {heading: 'Added card'}}])});
      eq(await read(t, '.msr-car__slide:nth-child(5) [data-sv-card-heading]', 'text'), 'Added card');
      await t.emit({heading: 'Edited card'}, t.blockId('video', 4)); eq(await read(t, '.msr-car__slide:nth-child(5) [data-sv-card-heading]', 'text'), 'Edited card');
      for (let i = 0; i < 3; i++) await t.redraw({});
      await t.page.waitForTimeout(150);
      const after = await counts(t.page);
      eq(after.roots, before.roots, 'one controller per root'); ok(after.active <= 1, 'one autoplay timer: ' + after.active);
      const made = after.made; await t.emit({card_radius: 6}); await t.emit({heading: 'x'}, t.blockId('video', 2));
      eq((await counts(t.page)).made, made, 'unrelated edits do not restart the autoplay timer');
      eq(t.errors.length, 0, 'no errors ' + t.errors.join(' ')); ok(await t.noOverflow(), 'no overflow ' + tag);
      await t.page.close();
      /* Two instances */
      const two = await L.mount(browser, NAME, {width, editing, instances: [{uid: 'a'}, {uid: 'b'}], assets: [ASSET]});
      await two.emit({card_radius: 2, heading: 'Only A'}, undefined, 'a'); await two.emit({heading: 'Card A'}, two.blockId('video', 0, 'a'), 'a');
      eq(await read(two, '.sv-card', 'borderTopLeftRadius', 'b'), '16px'); eq(await read(two, '.sv__heading', 'text', 'b'), 'Shop the look'); eq(await read(two, '[data-sv-card-heading]', 'text', 'b'), 'New drop');
      await two.page.close();
      /* Reduced motion: no autoplay of videos or the carousel */
      const rm = await L.mount(browser, NAME, {width, editing, reducedMotion: 'reduce', blocks: full, settings: {autoplay_carousel: true, columns: 2}, assets: [ASSET]});
      await instrument(rm.page); await serveVideo(rm.page); await rm.redraw({}); await rm.page.waitForTimeout(500);
      eq(await playing(rm, '#shopify-section-test video'), false, 'no video autoplay under reduced motion'); eq((await counts(rm.page)).active, 0, 'no carousel autoplay under reduced motion');
      ok(await read(rm, '.sv-card__heading', 'visible')); await rm.page.close();
      process.stdout.write('.');
    }
    /* Header blocks: order, remove, add, live edits, legacy fallback, two instances, first paint */
    for (const width of WIDTHS) {
      const tag = '@' + width;
      const t = await L.mount(browser, NAME, {width, blocks: full, assets: [ASSET]});
      const blocks = () => t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings}));
      const cardsBox = async () => [await read(t, '.msr-car__slide', 'count'), await read(t, '.msr-car__dot', 'count'), (await read(t, '.msr-car__slide:nth-child(1)', 'box')).split(',').slice(2).join(',')].join('|');
      eq(JSON.stringify(await headOrder(t)), JSON.stringify(['eyebrow', 'heading', 'subheading']), 'preset header blocks in order ' + tag);
      eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test :is([data-sv-eyebrow], [data-sv-heading], [data-sv-desc])').length), 0, 'no legacy elements while every text block exists ' + tag);
      eq(await read(t, '.msr-car__slide', 'count'), 4, 'text blocks are not carousel cards ' + tag);
      eq(await read(t, '.msr-car__track', '@aria-label'), 'Shop the look', 'carousel named after the heading block ' + tag);
      const cards = await cardsBox();
      const [eb, hd, sb, ...vids] = blocks();
      await t.redraw({blocks: [sb, ...vids.slice(0, 2), hd, ...vids.slice(2), eb]});
      eq(JSON.stringify(await headOrder(t)), JSON.stringify(['subheading', 'heading', 'eyebrow']), 'reordered header blocks ' + tag);
      eq(await cardsBox(), cards, 'reordering text blocks leaves the carousel as it was ' + tag);
      const ys = await t.page.evaluate(() => ['.sv__desc', '.sv__heading', '.sv__eyebrow', '.msr-car__track'].map(s => Math.round(document.querySelector('#shopify-section-test ' + s).getBoundingClientRect().y)));
      ok(ys[0] < ys[1] && ys[1] < ys[2] && ys[2] < ys[3], 'header stacks in block order above the carousel ' + ys);
      await t.redraw({blocks: [eb, sb, ...vids]});
      eq(JSON.stringify(await headOrder(t)), JSON.stringify(['eyebrow', 'subheading']), 'removed heading block is gone ' + tag);
      eq(await read(t, 'h2', 'count'), 1, 'only the hidden empty legacy heading is left ' + tag); eq(await read(t, 'h2', 'visible'), false);
      eq(await read(t, '.msr-car__track', '@aria-label'), 'Videos', 'carousel label without a heading ' + tag);
      await t.redraw({blocks: [eb, sb, ...vids, {type: 'heading', settings: {text: 'Added heading'}}]});
      eq(JSON.stringify(await headOrder(t)), JSON.stringify(['eyebrow', 'subheading', 'heading']), 'added heading block renders last ' + tag);
      eq(await read(t, '.msr-car__slide', 'count'), 4, 'added heading is not a card ' + tag);
      await t.emit({text: 'Edited <em>live</em>', size_enable: true, size_desktop: 44, size_mobile: 24}, t.blockId('heading'));
      eq(await read(t, '.sv__heading em', 'text'), 'live', 'added block text is live ' + tag); eq(await read(t, '.sv__heading', 'fontSize'), DESK(width) ? '44px' : '24px', 'added block size is live ' + tag);
      for (const type of ['eyebrow', 'subheading', 'heading']) await t.emit({text: ''}, t.blockId(type));
      eq(await read(t, '.sv__header', '.hidden'), true, 'empty text blocks hide the header ' + tag);
      await t.emit({text: 'Back'}, t.blockId('eyebrow')); eq(await read(t, '.sv__header', '.hidden'), false, 'header returns with text ' + tag);
      for (let i = 0; i < 2; i++) await t.redraw({});
      eq(await t.page.evaluate(() => window.MateriaMediaStatsReels.size()), 1, 'one controller after redraws ' + tag);
      eq(t.errors.length, 0, 'header block errors ' + t.errors.join(' '));
      await t.page.close();
      /* Legacy: no text blocks, the old settings draw the header and still edit live */
      const lg = await L.mount(browser, NAME, {width, editing: true, blocks: videosOnly, settings: LEGACY_SETTINGS, assets: [ASSET]});
      eq(JSON.stringify(await headOrder(lg)), JSON.stringify(['legacy-eyebrow', 'legacy-heading', 'legacy-desc']), 'legacy header from section settings ' + tag);
      eq(await read(lg, '.sv__heading', 'text'), 'Saved heading'); eq(await read(lg, '.sv__heading', 'color'), 'rgb(255, 255, 255)'); ok(/Georgia/.test(await read(lg, '.sv__heading', 'fontFamily')), 'legacy heading follows the theme');
      eq(await read(lg, '.msr-car__track', '@aria-label'), 'Saved heading', 'carousel named after the saved heading ' + tag);
      checks += await controls(lg, width, LEGACY);
      await lg.emit({subheading: '', heading: '', description: ''}); eq(await read(lg, '.sv__header', '.hidden'), true, 'empty legacy header hides ' + tag);
      eq(lg.errors.length, 0, 'legacy errors ' + lg.errors.join(' '));
      await lg.page.close();
      /* Mixed: only the type without a block uses its old setting */
      const mx = await L.mount(browser, NAME, {width, blocks: [{type: 'eyebrow', settings: {text: 'Block eyebrow'}}, ...videosOnly], settings: LEGACY_SETTINGS, assets: [ASSET]});
      eq(JSON.stringify(await headOrder(mx)), JSON.stringify(['legacy-heading', 'eyebrow', 'legacy-desc']), 'mixed header ' + tag);
      eq(await read(mx, '.sv__eyebrow', 'count'), 1, 'one eyebrow when an eyebrow block exists'); eq(await read(mx, '.sv__eyebrow', 'text'), 'Block eyebrow');
      await mx.emit({subheading: 'Ignored', heading: 'Saved, edited'});
      eq(await read(mx, '.sv__eyebrow', 'text'), 'Block eyebrow', 'old eyebrow setting does not touch the block'); eq(await read(mx, '.sv__heading', 'text'), 'Saved, edited', 'old heading still live');
      eq(mx.errors.length, 0, 'mixed errors');
      await mx.page.close();
      /* Two instances: a header block edit stays in its own section */
      const two = await L.mount(browser, NAME, {width, instances: [{uid: 'a'}, {uid: 'b'}], assets: [ASSET]});
      await two.emit({text: 'Only A', enable_custom_style: true, color: '#ff0000'}, two.blockId('heading', 0, 'a'), 'a');
      eq(await read(two, '.sv__heading', 'text', 'a') + '|' + await read(two, '.sv__heading', 'color', 'a'), 'Only A|rgb(255, 0, 0)');
      eq(await read(two, '.sv__heading', 'text', 'b') + '|' + await read(two, '.sv__heading', 'color', 'b'), 'Shop the look|rgb(255, 255, 255)', 'instance b untouched ' + tag);
      await two.page.close();
      /* First paint equals hydrated paint with custom header blocks */
      const custom = [
        {type: 'heading', settings: {text: 'Custom <em>heading</em>', enable_custom_style: true, color: '#cc0033', weight_enable: true, weight: '500', size_enable: true, size_desktop: 48, size_mobile: 26, line_height: 1.4, enable_custom_fonts: true, font: {family: 'Verdana', fallback_families: 'sans-serif'}}},
        {type: 'eyebrow', settings: {text: 'Eyebrow', enable_custom_style: true, color: '#00cc33', size_enable: true, size: 18, enable_custom_fonts: true, font: {family: 'Tahoma', fallback_families: 'sans-serif'}}},
        {type: 'subheading', settings: {text: '<p>One</p><p>Two</p>', enable_custom_style: true, color: '#3300cc', size_enable: true, size: 19, line_height: 1.8}},
        ...videosOnly];
      const SEL = '#shopify-section-test :is([data-msr], .sv__header, .sv__header *, .msr-car__track, .msr-car__slide)';
      const cold = await L.mount(browser, NAME, {width, blocks: custom, assets: []}), a = await snapshot(cold, SEL); await cold.page.close();
      const hot = await L.mount(browser, NAME, {width, blocks: custom, assets: [ASSET]}); await hot.page.waitForTimeout(150);
      assert.deepEqual(await snapshot(hot, SEL), a, 'custom header blocks: first paint equals hydrated paint ' + tag); checks++;
      ok(/^Verdana/.test(await read(hot, '.sv__heading', 'fontFamily')) && /^Tahoma/.test(await read(hot, '.sv__eyebrow', 'fontFamily')), 'custom block fonts on first paint');
      await hot.page.close();
    }
    for (const reveal of [true, false]) {
      const t = await L.mount(browser, NAME, {width: 1366, editing: false, settings: {reveal}, theme: {scroll_animation: 'fade-in'}, assets: [ASSET]});
      eq(await t.page.evaluate(() => document.getElementById('shopify-section-test').classList.contains('scroll-trigger')), reveal, 'reveal ' + reveal);
      await t.page.close();
    }
  } finally { await browser.close(); }
  console.log(`\n${NAME}: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
