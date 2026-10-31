/* Reels Wall: theme inheritance, every control (live and after a redraw), carousel (arrows, dots,
   keyboard, drag, 44px targets, focus rings, one init per redraw), grid layout, videos (play in view,
   pause off screen, none under reduced motion, play and sound buttons), product chip from the picker,
   two instances, added blocks, first paint. Run: node tests/theme-media-stats-reels-reels.cjs */
const L = require('./theme-media-stats-reels-lib.cjs');
const {assert, ASSET, WIDTHS, DESK, read, controls, coverage, snapshot, instrument, counts, hoverBg, smallTargets, serveVideo, playing} = L;
const NAME = 'reels-wall', ROOT = '[data-msr]', S2 = '.msr-car__slide:nth-child(2) ';
const C = {pre: {enable_custom_style: true}}, TWO = {pre: {columns: 2}};
const IMG = {src: 'https://cdn.test/a.png', alt: 'Poster', width: 720, height: 1280};
const PRODUCT = {title: 'Prime1 Tub', url: '/products/prime1', price: 2990, featured_image: {src: 'https://cdn.test/p.png'}};
const perRow = t => t.page.evaluate(() => { const tr = document.querySelector('#shopify-section-test .msr-car__track'), s = tr.querySelector('.msr-car__slide'); return Math.round((tr.clientWidth + 14) / (s.getBoundingClientRect().width + 14)); });
const head = (type, sel, d, m, weight, below) => [
  {block: type, id: 'text', v: type === 'subheading' ? '<p>Clips <em>daily</em></p>' : 'Clips <em>daily</em>', sel: sel + ' em', css: 'text', exp: 'daily'},
  {block: type, id: 'font_size_desktop', v: 33, sel, css: 'fontSize', exp: w => DESK(w) ? '33px' : m + 'px'},
  {block: type, id: 'font_size_mobile', v: 13, sel, css: 'fontSize', exp: w => DESK(w) ? d + 'px' : '13px'},
  {block: type, id: 'enable_custom_weight', v: true, sel, css: 'fontWeight', exp: weight},
  {block: type, id: 'font_weight', v: '300', preBlock: true, pre: {enable_custom_weight: true}, sel, css: 'fontWeight', exp: '300'},
  {block: type, id: 'space_above', v: 11, sel, css: 'marginTop', exp: '11px'},
  {block: type, id: 'space_below', v: 21, sel, css: 'marginBottom', exp: '21px'},
];

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: ROOT, css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'full_width', sel: '.rw__inner', css: 'paddingLeft', exp: '0px'},
  {id: 'reset_spacing', v: false, live: false, check: async t => assert.equal(await t.page.evaluate(() => /margin-top: 0/.test(document.querySelector('#shopify-section-test style[data-rs-bulletproof]').textContent)), false)},
  {id: 'header_alignment', v: 'center', sel: '.rw__header', css: 'textAlign', exp: 'center'},
  {id: 'show_handle', v: false, sel: '.rw-handle', css: 'visible', exp: false},
  {id: 'show_actions', v: false, sel: '.rw-actions', css: 'visible', exp: false},
  {id: 'display_mode', v: 'grid', sel: '.msr-car__track', css: 'gridAutoFlow', exp: 'row'},
  {id: 'columns', v: 3, check: async (t, w) => assert.equal(await perRow(t), DESK(w) ? 3 : 1)},
  {id: 'column_gap', v: 30, sel: '.msr-car__track', css: 'columnGap', exp: '30px'},
  {id: 'show_arrow', v: true, ...TWO, sel: '[data-msr-next]', css: 'visible', exp: true},
  {id: 'carousel_pagination', v: 'disable', ...TWO, sel: '.msr-car__dots', css: 'visible', exp: false},
  {id: 'pagination_style', v: 'number', ...TWO, sel: '.msr-car__dot span', css: 'visible', exp: true},
  {id: 'pagination_position', v: 'left', sel: '.msr-car__dots', css: 'justifyContent', exp: 'flex-start'},
  {id: 'autoplay_videos', v: false, check: async t => { await t.page.waitForTimeout(300); assert.equal(await playing(t, '#shopify-section-test video'), false, 'not playing with autoplay off'); }},
  {id: 'loop_videos', v: false, sel: 'video', css: '.loop', exp: false},
  {id: 'show_unmute', v: false, sel: '.rw-sound', css: 'visible', exp: false},
  {id: 'card_shape', v: 'square', sel: '.rw-tile', css: 'borderTopLeftRadius', exp: '0px'},
  {id: 'overlay_strength', v: 0, sel: '.rw-tile__overlay', css: 'backgroundImage', exp: /^linear-gradient\(to top, rgba\(0, 0, 0, 0\) 0%, rgba\(0, 0, 0, 0\) 35%/},
  {id: 'custom_section_bg', v: '#abcdef', ...C, sel: ROOT, css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'tile_bg', v: '#222222', ...C, sel: '.rw-tile', css: 'backgroundColor', exp: 'rgb(34, 34, 34)'},
  {id: 'accent_color', v: '#ff00ff', ...C, sel: '.rw-handle__avatar-fallback', css: 'backgroundColor', exp: 'rgb(255, 0, 255)'},
  {id: 'custom_tile_text', v: '#ffff00', ...C, sel: '.rw-content__heading', css: 'color', exp: 'rgb(255, 255, 0)'},
  {id: 'custom_heading_color', v: '#00ff00', ...C, sel: '.rw__heading', css: 'color', exp: 'rgb(0, 255, 0)'},
  {id: 'custom_eyebrow_color', v: '#ff8800', ...C, sel: '.rw__eyebrow', css: 'color', exp: 'rgb(255, 136, 0)'},
  {id: 'custom_cta_bg', v: '#00aa00', ...C, sel: '.rw-cta', css: 'backgroundColor', exp: 'rgb(0, 170, 0)'},
  {id: 'custom_cta_text', v: '#010203', ...C, sel: '.rw-cta', css: 'color', exp: 'rgb(1, 2, 3)'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.rw__heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.rw-content__caption', css: 'fontFamily', exp: /Tahoma/},
  {id: 'custom_heading_size', v: 20, sel: '.rw-content__heading', css: 'fontSize', exp: '20px'},
  {id: 'custom_caption_size', v: 14, sel: '.rw-content__caption', css: 'fontSize', exp: '14px'},
  {id: 'padding_top', v: 90, check: async t => assert.ok(parseFloat(await read(t, ROOT, 'paddingTop')) >= 67, 'top padding grows')},
  {id: 'padding_bottom', v: 90, check: async t => assert.ok(parseFloat(await read(t, ROOT, 'paddingBottom')) >= 67, 'bottom padding grows')},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: w => DESK(w) ? '20px' : '0px'},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: w => DESK(w) ? '22px' : '0px'},
  {id: 'columns_mobile', v: 2, check: async (t, w) => assert.equal(await perRow(t), DESK(w) ? 4 : 2)},
  {id: 'section_margin_top_mobile', v: 9, sel: ':wrapper', css: 'marginTop', exp: w => DESK(w) ? '0px' : '9px'},
  {id: 'section_margin_bottom_mobile', v: 8, sel: ':wrapper', css: 'marginBottom', exp: w => DESK(w) ? '0px' : '8px'},
  ...head('top_text', '.rw__eyebrow', 15, 14, '600'), ...head('heading', '.rw__heading', 40, 28, '700'), ...head('subheading', '.rw__sub', 17, 15, '400'),
  {block: 'reel', n: 1, id: 'local_video', v: {sources: [{format: 'mp4', url: 'https://cdn.test/l.mp4'}]}, live: false, sel: S2 + 'video source', css: '@src', exp: 'https://cdn.test/l.mp4'},
  {block: 'reel', n: 1, id: 'video_url', v: {id: 'abc123', type: 'youtube'}, live: false, sel: S2 + 'iframe', css: '@src', exp: /youtube\.com\/embed\/abc123\?enablejsapi=1/},
  {block: 'reel', n: 1, id: 'video_url_direct', v: 'https://cdn.test/d.mp4', live: false, sel: S2 + 'video source', css: '@src', exp: 'https://cdn.test/d.mp4'},
  {block: 'reel', n: 1, id: 'poster_image', v: IMG, sel: S2 + '.rw-tile img', css: '@src', exp: /a\.png/},
  {block: 'reel', n: 1, id: 'avatar', v: IMG, sel: S2 + '.rw-handle img', css: '@src', exp: /a\.png/},
  {block: 'reel', n: 1, id: 'username', v: '@prime1', sel: S2 + '[data-rw-username]', css: 'text', exp: '@prime1'},
  {block: 'reel', n: 1, id: 'heading', v: 'Morning mix', sel: S2 + '[data-rw-heading]', css: 'text', exp: 'Morning mix'},
  {block: 'reel', n: 1, id: 'caption', v: 'One scoop, cold water', sel: S2 + '[data-rw-caption]', css: 'text', exp: 'One scoop, cold water'},
  {block: 'reel', n: 1, id: 'cta_label', v: 'Buy the tub', sel: S2 + '.rw-cta', css: 'text', exp: 'Buy the tub'},
  {block: 'reel', n: 1, id: 'cta_link', v: '/products/x', check: async t => { assert.equal(await read(t, S2 + '.rw-cta', '@href'), '/products/x'); assert.equal(await read(t, S2 + '[data-rw-link]', 'visible'), true); }},
  {block: 'reel', n: 1, id: 'show_block_actions', v: false, sel: S2 + '.rw-actions', css: 'visible', exp: false},
  {block: 'reel', n: 1, id: 'likes', v: '99', sel: S2 + '[data-rw-count="likes"]', css: 'text', exp: '99'},
  {block: 'reel', n: 1, id: 'shares', v: '98', sel: S2 + '[data-rw-count="shares"]', css: 'text', exp: '98'},
  {block: 'reel', n: 1, id: 'saves', v: '97', sel: S2 + '[data-rw-count="saves"]', css: 'text', exp: '97'},
  {block: 'reel', n: 1, id: 'product', v: PRODUCT, check: async (t, w, how) => {
    assert.equal(await read(t, S2 + '[data-rw-link]', '@href'), '/products/prime1');
    if (how === 'redraw') { assert.equal(await read(t, S2 + '.rw-product__name', 'text'), 'Prime1 Tub'); assert.equal(await read(t, S2 + '.rw-product__price', 'text'), 'R$29.90'); assert.equal(await read(t, S2 + '.rw-product', '@href'), '/products/prime1'); }
  }},
];

(async () => {
  let checks = 0;
  const ok = (c, m) => { assert.ok(c, m); checks++; }, eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
  eq(L.schemaProblems(NAME).length, 0, 'schema');
  coverage(NAME, TABLE, ['enable_custom_style', 'enable_custom_fonts', 'reveal']); checks++;
  const preset = L.schemaOf(NAME).schema.presets[0].blocks;
  const full = preset.map((b, i) => b.type === 'subheading' ? {type: 'subheading', settings: {text: '<p>Short clips from the store.</p>'}} : i === 3 ? {type: 'reel', settings: {...b.settings, video_url_direct: 'https://cdn.test/r.mp4'}} : b);
  const browser = await L.launch();
  try {
    for (const width of WIDTHS) for (const editing of [true, false]) {
      const tag = `@${width} ${editing ? 'editor' : 'storefront'}`;
      const SEL = '#shopify-section-test :is([data-msr], .rw__header, .rw__heading, .msr-car__track, .msr-car__slide, .rw-tile, .rw-handle, .rw-actions, .rw-content__heading, .rw-cta, .msr-car__controls, .msr-car__dot)';
      const cold = await L.mount(browser, NAME, {width, editing, blocks: full, assets: []}), a = await snapshot(cold, SEL); await cold.page.close();
      const t = await L.mount(browser, NAME, {width, editing, blocks: full, assets: [ASSET]}); await t.page.waitForTimeout(150);
      assert.deepEqual(await snapshot(t, SEL), a, 'first paint equals hydrated paint ' + tag); checks++;
      await instrument(t.page); await serveVideo(t.page); await t.redraw({}); await t.page.waitForTimeout(500);
      /* Theme inheritance */
      eq(await read(t, ROOT, 'backgroundColor'), 'rgb(24, 32, 40)'); eq(await read(t, '.rw__heading', 'color'), 'rgb(255, 255, 255)'); ok(/Georgia/.test(await read(t, '.rw__heading', 'fontFamily')));
      eq(await read(t, '.rw__heading', '.tagName'), 'H2'); eq(await read(t, '.rw-content__heading', '.tagName'), 'H3');
      ok(/Arial/.test(await read(t, '.rw-content__caption', 'fontFamily')));
      eq(await read(t, '.rw-cta', 'backgroundColor'), 'rgb(18, 52, 86)'); eq(await read(t, '.rw-cta', 'borderTopLeftRadius'), '12px'); eq(await hoverBg(t, '.rw-cta', true), 'rgb(255, 0, 0)', 'theme hover');
      eq(await read(t, '.rw-cta', '.tagName'), 'BUTTON', 'a button with no link is a button');
      /* Video: muted, inline, plays in view, play and sound buttons */
      eq(await read(t, 'video', '.muted'), true); eq(await read(t, 'video', '@playsinline'), ''); eq(await read(t, 'video', '@autoplay'), null, 'no autoplay attribute');
      ok(await playing(t, '#shopify-section-test video'), 'plays in view ' + tag);
      await t.root('.rw-play').first().click(); await t.page.waitForTimeout(100); eq(await playing(t, '#shopify-section-test video'), false, 'play button pauses'); eq(await read(t, '.rw-play', '@aria-pressed'), 'false');
      await t.emit({padding_top: 41}); await t.page.waitForTimeout(150); eq(await playing(t, '#shopify-section-test video'), false, 'a live edit does not restart a paused video');
      await t.root('.rw-play').first().click(); await t.page.waitForTimeout(150); ok(await playing(t, '#shopify-section-test video'), 'play button plays');
      await t.root('.rw-sound').first().click(); eq(await read(t, 'video', '.muted'), false, 'sound button unmutes'); eq(await read(t, '.rw-sound', '@aria-pressed'), 'true');
      await t.page.evaluate(() => { const s = document.createElement('div'); s.id = 'away'; s.style.height = '3000px'; document.body.append(s); window.scrollTo(0, 3000); }); await t.page.waitForTimeout(300);
      eq(await playing(t, '#shopify-section-test video'), false, 'paused off screen');
      await t.page.evaluate(() => { document.getElementById('away').remove(); window.scrollTo(0, 0); }); await t.redraw({}); await t.page.waitForTimeout(400);
      /* Colour scheme live and after redraw; custom styling off restores the theme */
      await t.emit({color_scheme: 'alt-scheme'}); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(250, 250, 250)'); eq(await read(t, '.rw__heading', 'color'), 'rgb(16, 16, 16)');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(250, 250, 250)'); await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      await t.emit({enable_custom_style: true, custom_section_bg: '#abcdef', custom_cta_bg: '#00aa00'}); eq(await read(t, '.rw-cta', 'backgroundColor'), 'rgb(0, 170, 0)');
      await t.emit({enable_custom_style: false}); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(24, 32, 40)'); eq(await read(t, '.rw-cta', 'backgroundColor'), 'rgb(18, 52, 86)');
      await t.emit({enable_custom_fonts: true, heading_font: {family: 'Verdana'}}); await t.emit({enable_custom_fonts: false}); ok(/Georgia/.test(await read(t, '.rw__heading', 'fontFamily')), 'fonts off restore theme');
      /* Unrelated edits keep images */
      await t.emit({poster_image: IMG}, t.blockId('reel', 1));
      await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test .msr-car__slide:nth-child(2) .rw-tile img'); window.__src = window.__img.src; });
      for (const p of [{column_gap: 10}, {overlay_strength: 40}, {custom_heading_size: 16}]) await t.emit(p);
      await t.emit({heading: 'Other'}, t.blockId('reel', 2));
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .msr-car__slide:nth-child(2) .rw-tile img') === window.__img && window.__img.src === window.__src), 'image kept');
      await t.redraw({settings: {column_gap: 14, overlay_strength: 25, custom_heading_size: 15}, blocks: full});
      /* Every control */
      checks += await controls(t, width, TABLE);
      /* Carousel: arrows, dots, keyboard, targets, focus, one step per click after redraws */
      await t.redraw({settings: {show_arrow: true, columns: 2}});
      for (let i = 0; i < 2; i++) await t.redraw({});
      const step = await t.page.evaluate(() => { const s = document.querySelectorAll('#shopify-section-test .msr-car__slide'); return s[1].offsetLeft - s[0].offsetLeft; });
      eq(await read(t, '[data-msr-prev]', '.disabled'), true, 'prev disabled at start');
      await t.root('[data-msr-next]').click(); await t.page.waitForTimeout(700);
      eq(await read(t, '.msr-car__track', '.scrollLeft'), step, 'next moves exactly one reel after redraws');
      eq(await read(t, '.msr-car__dot:nth-child(2)', '@aria-current'), 'true', 'dot follows');
      await t.root('.msr-car__dot').first().click(); await t.page.waitForTimeout(700); eq(await read(t, '.msr-car__track', '.scrollLeft'), 0, 'dot goes to page 1');
      await t.page.focus('#shopify-section-test .msr-car__track'); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(700);
      eq(await read(t, '.msr-car__track', '.scrollLeft'), step, 'arrow key moves one reel');
      eq(await read(t, '.msr-car__track', 'outlineStyle'), 'solid', 'track focus ring');
      await t.page.keyboard.press('Tab'); await t.page.focus('#shopify-section-test [data-msr-next]'); eq(await read(t, '[data-msr-next]', 'outlineStyle'), 'solid', 'arrow focus ring');
      const small = await smallTargets(t); eq(small.filter(x => !/rw-tile__link/.test(x.cls)).length, 0, '44px targets ' + JSON.stringify(small));
      const dotsVisible = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .msr-car__dot')].filter(d => d.offsetWidth).length);
      eq(dotsVisible, DESK(width) ? 3 : 4, 'one dot per reachable page');
      /* Pagination styles look different */
      const look = {}; for (const st of ['dot', 'pill', 'line', 'square', 'ring', 'number', 'progress']) { await t.emit({pagination_style: st}); look[st] = await t.page.evaluate(() => { const d = document.querySelector('#shopify-section-test .msr-car__dot[aria-current="true"]'), b = getComputedStyle(d, '::before'), p = document.querySelector('#shopify-section-test .msr-car__progress'); return [b.width, b.height, b.borderRadius, b.backgroundColor, b.display, getComputedStyle(d.querySelector('span')).display, d.offsetWidth > 0, p.offsetWidth > 0].join('|'); }); }
      eq(new Set(Object.values(look)).size, 7, 'pagination styles differ ' + JSON.stringify(look));
      /* Grid and carousel differ; corner shapes differ */
      const geo = {}; for (const m of ['carousel', 'grid']) { await t.emit({display_mode: m, columns: 2}); geo[m] = await read(t, '.msr-car__slide:nth-child(3)', 'box'); } ok(geo.carousel !== geo.grid, 'grid differs from carousel');
      const radii = new Set(); for (const c of ['rounded', 'pill', 'square']) { await t.emit({card_shape: c}); radii.add(await read(t, '.rw-tile', 'borderTopLeftRadius')); } eq(radii.size, 3, 'corner shapes differ');
      /* Added block + redraw */
      const before = await counts(t.page);
      await t.redraw({settings: {display_mode: 'carousel'}, blocks: full.concat([{type: 'reel', settings: {heading: 'Added reel'}}])});
      eq(await read(t, '.msr-car__slide:nth-child(5) [data-rw-heading]', 'text'), 'Added reel');
      await t.emit({heading: 'Edited reel'}, t.blockId('reel', 4)); eq(await read(t, '.msr-car__slide:nth-child(5) [data-rw-heading]', 'text'), 'Edited reel');
      eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test .msr-car__dot').length), 5, 'dot for the added reel');
      for (let i = 0; i < 3; i++) await t.redraw({});
      eq((await counts(t.page)).roots, before.roots, 'one controller per root');
      eq(t.errors.length, 0, 'no errors ' + t.errors.join(' ')); ok(await t.noOverflow(), 'no overflow ' + tag);
      await t.page.close();
      /* Two instances */
      const two = await L.mount(browser, NAME, {width, editing, instances: [{uid: 'a'}, {uid: 'b'}], assets: [ASSET]});
      await two.emit({card_shape: 'square', enable_custom_style: true, custom_section_bg: '#abcdef'}, undefined, 'a'); await two.emit({heading: 'Only A'}, two.blockId('reel', 0, 'a'), 'a');
      eq(await read(two, '.rw-tile', 'borderTopLeftRadius', 'b'), '18px'); eq(await read(two, ROOT, 'backgroundColor', 'b'), 'rgb(24, 32, 40)'); eq(await read(two, '[data-rw-heading]', 'text', 'b'), 'New drop');
      eq(await read(two, '[data-rw-heading]', 'text', 'a'), 'Only A');
      await two.page.close();
      /* Reduced motion: no video autoplay, content visible */
      const rm = await L.mount(browser, NAME, {width, editing, reducedMotion: 'reduce', blocks: full, assets: [ASSET]});
      await instrument(rm.page); await serveVideo(rm.page); await rm.redraw({}); await rm.page.waitForTimeout(500);
      eq(await playing(rm, '#shopify-section-test video'), false, 'no autoplay under reduced motion'); eq((await counts(rm.page)).play, 0);
      await rm.root('.rw-play').first().click(); await rm.page.waitForTimeout(200); ok(await playing(rm, '#shopify-section-test video'), 'the play button still plays');
      ok(await read(rm, '.rw-content__heading', 'visible')); await rm.page.close();
      process.stdout.write('.');
    }
    /* Reveal on scroll follows Theme settings > animation and the section toggle */
    for (const reveal of [true, false]) {
      const t = await L.mount(browser, NAME, {width: 1366, editing: false, settings: {reveal}, theme: {scroll_animation: 'fade-in'}, assets: [ASSET]});
      eq(await t.page.evaluate(() => document.getElementById('shopify-section-test').classList.contains('scroll-trigger')), reveal, 'reveal ' + reveal);
      await t.page.close();
    }
  } finally { await browser.close(); }
  console.log(`\n${NAME}: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
