/* Image (image-section): theme inheritance, every control live and redrawn,
   desktop/mobile, caption variants, instances, redraw lifecycle, no image
   reload, first paint, reduced motion for its video. Run: LIQUIDJS=<path> node tests/theme-media-image-video-image.cjs */
const L = require('./theme-media-image-video-lib.cjs');
const {open, launch, ok, eq, sleep, CLIP_URL, control, snapshot} = L;
const NAME = 'image-section', BP = 750, R = '.iv-img';
const IMG = {src: 'http://theme.test/photo.png', url: 'http://theme.test/photo.png', width: 1600, height: 1000, alt: 'Own alt'};
const src = async t => String(await t.attr('.iv-img__media > img', 'src')).replace(/\?.*/, '');
const capX = async t => { const [x, , w] = (await t.box('[data-iv-caption]')).split(',').map(Number), [mx, , mw] = (await t.box('.iv-img__media')).split(',').map(Number); return [x - mx, mx + mw - (x + w)].join(','); };
const P = {
  color_scheme: {v: 'alt-scheme', probe: t => t.style(R, 'backgroundColor'), expect: 'rgb(250, 250, 250)'},
  display_on: {v: w => w < BP ? 'desktop' : 'mobile', probe: t => t.style(R, 'display'), expect: 'none'},
  reset_spacing: {v: false, probe: t => t.wrap().evaluate(el => getComputedStyle(el).marginTop), expect: '20px'},
  image_description: {v: 'Spring <em>collection</em>', probe: t => t.page.evaluate(() => { const c = document.querySelector('#shopify-section-test [data-iv-caption]'); return c.textContent + '|' + c.querySelectorAll('em').length; }), expect: 'Spring collection|1'},
  image_description_position: {v: 'bottom-right', probe: capX},
  image_text_horizontal_position_desktop: {v: 20, only: 'd', probe: capX},
  enable_image_text_background: {v: false, probe: t => t.style('[data-iv-caption]', 'display', '::before'), expect: 'none'},
  image_text_background_opacity: {v: 40, probe: t => t.style('[data-iv-caption]', 'opacity', '::before'), expect: '0.4'},
  image_text_border_radius: {v: 20, probe: t => t.style('[data-iv-caption]', 'borderTopLeftRadius'), expect: '20px'},
  is_fullwidth: {v: true, probe: t => t.box('.iv-img__media')},
  container_max_width: {v: 300, probe: t => t.style('.iv-img__container', 'maxWidth'), expect: '300px'},
  img_min_height: {v: 30, only: 'd', probe: t => t.box('.iv-img__media')},
  image_margin_top: {v: 30, probe: t => t.style('.iv-img__media', 'marginTop'), expect: '30px'},
  image_margin_bottom: {v: 30, probe: t => t.style('.iv-img__media', 'marginBottom'), expect: '30px'},
  use_video: {v: true, pre: {video_url: CLIP_URL}, probe: async t => [await t.visible('.iv-img__video'), await t.attr('video', 'src')], expect: [true, CLIP_URL]},
  background_image: {v: IMG, probe: async t => [await t.visible('.iv-img__media > img'), await src(t), await t.visible('.iv-img__ph')], expect: [true, IMG.src, false]},
  image_alt: {v: 'Shop window', pre: {background_image: IMG}, probe: t => t.attr('.iv-img__media > img', 'alt'), expect: 'Shop window'},
  video_url: {v: CLIP_URL, pre: {use_video: true}, probe: t => t.attr('video', 'src'), expect: CLIP_URL},
  lazyload: {v: false, pre: {background_image: IMG}, probe: t => t.attr('.iv-img__media > img', 'loading'), expect: 'eager'},
  image_border_radius: {v: 24, probe: t => t.style('.iv-img__media', 'borderTopLeftRadius'), expect: '24px'},
  background_position_x: {v: 10, only: 'd', pre: {background_image: IMG}, probe: t => t.style('.iv-img__media > img', 'objectPosition'), expect: '10% 50%'},
  background_position_y: {v: 10, only: 'd', pre: {background_image: IMG}, probe: t => t.style('.iv-img__media > img', 'objectPosition'), expect: '50% 10%'},
  enable_custom_style: {v: true, pre: {section_bg: '#abcdef'}, probe: t => t.style(R, 'backgroundColor'), expect: 'rgb(171, 205, 239)'},
  section_bg: {v: '#abcdef', pre: {enable_custom_style: true}, probe: t => t.style(R, 'backgroundColor'), expect: 'rgb(171, 205, 239)'},
  image_description_text_color: {v: '#ff0000', pre: {enable_custom_style: true}, probe: t => t.style('[data-iv-caption]', 'color'), expect: 'rgb(255, 0, 0)'},
  image_text_background_color: {v: '#00ff00', pre: {enable_custom_style: true}, probe: t => t.style('[data-iv-caption]', 'backgroundColor', '::before'), expect: 'rgb(0, 255, 0)'},
  enable_custom_fonts: {v: true, pre: {body_font: {family: 'Georgia'}}, probe: t => t.style('[data-iv-caption]', 'fontFamily'), expect: /Georgia/},
  body_font: {v: {family: 'Georgia'}, pre: {enable_custom_fonts: true}, probe: t => t.style('[data-iv-caption]', 'fontFamily'), expect: /Georgia/},
  image_description_fz: {v: 28, only: 'd', probe: t => t.style('[data-iv-caption]', 'fontSize'), expect: '28px'},
  section_padding_top: {v: 77, only: 'd', probe: t => t.style(R, 'paddingTop'), expect: '77px'},
  section_padding_bottom: {v: 77, only: 'd', probe: t => t.style(R, 'paddingBottom'), expect: '77px'},
  padding_lr_desktop: {v: 44, only: 'd', probe: t => t.style('.iv-img__container', 'paddingLeft'), expect: '44px'},
  img_min_height_mobile: {v: 20, only: 'm', probe: t => t.box('.iv-img__media')},
  background_position_x_mobile: {v: 10, only: 'm', pre: {background_image: IMG}, probe: t => t.style('.iv-img__media > img', 'objectPosition'), expect: '10% 50%'},
  background_position_y_mobile: {v: 10, only: 'm', pre: {background_image: IMG}, probe: t => t.style('.iv-img__media > img', 'objectPosition'), expect: '50% 10%'},
  image_text_horizontal_position_mobile: {v: 20, only: 'm', probe: capX},
  image_description_fz_mobile: {v: 12, only: 'm', probe: t => t.style('[data-iv-caption]', 'fontSize'), expect: '12px'},
  section_padding_top_mobile: {v: 11, only: 'm', probe: t => t.style(R, 'paddingTop'), expect: '11px'},
  section_padding_bottom_mobile: {v: 11, only: 'm', probe: t => t.style(R, 'paddingBottom'), expect: '11px'},
  padding_lr_mobile: {v: 4, only: 'm', probe: t => t.style('.iv-img__container', 'paddingLeft'), expect: '4px'},
  custom_css: {v: 'outline: 3px solid red;', probe: t => t.style(R, 'outlineStyle'), expect: 'solid'},
};

(async () => {
  const browser = await launch();
  try {
    eq(L.schemaProblems(NAME), [], 'schema problems');
    const {schema} = L.schemaOf(NAME);
    eq(L.visibleIds(schema.settings).filter(id => !P[id]), [], 'every visible control has a probe');
    eq(schema.settings.find(x => x.id === 'video_url').visible_if, '{{ section.settings.use_video }}', 'video URL only with video');
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await open(browser, NAME, {width, editing});
      await t.page.addStyleTag({content: '.shopify-section{margin-top:20px}'});
      eq(await t.style(R, 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background');
      eq(await t.style('[data-iv-caption]', 'color'), 'rgb(255, 255, 255)', 'caption uses scheme heading');
      ok(/Arial/.test(await t.style('[data-iv-caption]', 'fontFamily')), 'caption uses theme body font');
      eq(await t.style('[data-iv-caption]', 'backgroundColor', '::before'), 'rgb(24, 32, 40)', 'caption panel uses scheme background');
      ok(await t.visible('.iv-img__ph'), 'placeholder without image');
      const mh = +(await t.box('.iv-img__media')).split(',')[3]; ok(mh > 200 && mh < 700, 'tidy preview height ' + mh);
      await t.emit({color_scheme: 'alt-scheme'}); eq(await t.style(R, 'backgroundColor'), 'rgb(250, 250, 250)', 'alt scheme live'); eq(await t.style('[data-iv-caption]', 'color'), 'rgb(16, 16, 16)', 'alt scheme caption');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await t.style(R, 'backgroundColor'), 'rgb(250, 250, 250)', 'alt scheme redraw');
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      const initial = {...t.section.settings};
      for (const [id, c] of Object.entries(P)) await control(t, width, BP, id, c, initial);
      /* Custom on then off */
      await t.emit({enable_custom_style: true, section_bg: '#010203', image_description_text_color: '#00ff00', image_text_background_color: '#0000ff'});
      eq([await t.style(R, 'backgroundColor'), await t.style('[data-iv-caption]', 'color'), await t.style('[data-iv-caption]', 'backgroundColor', '::before')], ['rgb(1, 2, 3)', 'rgb(0, 255, 0)', 'rgb(0, 0, 255)'], 'custom colours land');
      await t.emit({enable_custom_style: false});
      eq([await t.style(R, 'backgroundColor'), await t.style('[data-iv-caption]', 'color'), await t.style('[data-iv-caption]', 'backgroundColor', '::before')], ['rgb(24, 32, 40)', 'rgb(255, 255, 255)', 'rgb(24, 32, 40)'], 'custom off restores theme');
      /* Caption alignment variants are distinct */
      const xs = []; for (const pos of ['bottom-left', 'bottom-center', 'bottom-right']) { await t.emit({image_description_position: pos}); xs.push(await capX(t)); }
      eq(new Set(xs).size, 3, 'caption alignments differ ' + xs.join(' / '));
      await t.emit({image_description_position: 'bottom-left'});
      /* Height 0 keeps the picture's own shape instead of collapsing */
      await t.emit({img_min_height: 0, img_min_height_mobile: 0}); ok(+(await t.box('.iv-img__media')).split(',')[3] > 100, 'zero height keeps a visible shape'); await t.emit({img_min_height: 70, img_min_height_mobile: 50});
      /* No image reload on unrelated edits */
      await t.redraw({settings: {background_image: IMG}});
      const img = await t.page.$('#shopify-section-test .iv-img__media > img'), s0 = await img.getAttribute('src'), loads0 = await t.page.evaluate(u => performance.getEntriesByType('resource').filter(e => e.name.startsWith(u)).length, IMG.src);
      for (const edit of [{image_border_radius: 3}, {section_padding_top: 12, section_padding_top_mobile: 12}, {image_description: 'New words'}, {enable_custom_style: true, section_bg: '#222222'}, {background_position_x: 20, background_position_x_mobile: 20}, {image_alt: 'Changed'}, {is_fullwidth: true}]) await t.emit(edit);
      ok(await img.evaluate(el => el.isConnected), 'same img element'); eq(await img.getAttribute('src'), s0, 'same src');
      eq(await t.page.evaluate(u => performance.getEntriesByType('resource').filter(e => e.name.startsWith(u)).length, IMG.src), loads0, 'no image refetch');
      await t.emit({background_image: {src: 'http://theme.test/other.png'}}); eq(await src(t), 'http://theme.test/other.png', 'new image applies live');
      await t.emit({background_image: null}); ok(await t.visible('.iv-img__ph'), 'cleared image restores placeholder');
      /* Video: plays muted inline, kept running through unrelated edits */
      await t.redraw({settings: {use_video: true, video_url: CLIP_URL, background_image: IMG}}); await sleep(500);
      const v0 = await t.video(), spy0 = await t.spy(); ok(!v0.paused && v0.muted, 'video autoplays muted');
      eq(await t.attr('video', 'playsinline'), '', 'plays inline'); ok(/photo\.png/.test(v0.poster), 'image is the cover');
      for (const edit of [{image_border_radius: 9}, {image_description: 'Other'}, {section_padding_bottom: 8, section_padding_bottom_mobile: 8}, {background_position_y: 30, background_position_y_mobile: 30}]) await t.emit(edit);
      await sleep(250); const v1 = await t.video(), spy1 = await t.spy();
      ok(v1.time > v0.time && !v1.paused, 'video kept playing'); eq([spy1.loads, spy1.loadstart, spy1.plays], [spy0.loads, spy0.loadstart, spy0.plays], 'no reload or restart');
      await t.emit({use_video: false}); ok(await t.visible('.iv-img__media > img'), 'back to the image live'); ok(!(await t.visible('.iv-img__video')), 'video hidden');
      /* Lifecycle */
      const st0 = await t.stats(); await t.redraw(); await t.redraw(); const st1 = await t.stats();
      eq([st1.roots, st1.players, st1.listeners], [st0.roots, st0.players, st0.listeners], 'redraw does not duplicate');
      ok(await t.noOverflow(), 'no overflow'); eq(t.errors, [], 'no errors');
      await t.page.close();
    }
    /* Two instances */
    {
      const t = await open(browser, NAME, {instances: [{uid: 'a'}, {uid: 'b'}]});
      await t.emit({image_border_radius: 31, image_description: 'Only A'}, undefined, 'a');
      eq(await t.style('.iv-img__media', 'borderTopLeftRadius', null, 'a'), '31px', 'a changed');
      eq(await t.style('.iv-img__media', 'borderTopLeftRadius', null, 'b'), '10px', 'b unchanged');
      eq(await t.page.evaluate(() => document.querySelector('#shopify-section-b [data-iv-caption]').textContent), 'Caption text', 'b caption unchanged');
      eq(t.errors, [], 'no errors'); await t.page.close();
    }
    /* First paint equals hydrated */
    for (const width of [375, 1366]) {
      const settings = {background_image: IMG, enable_custom_style: true, section_bg: '#334455', image_description_text_color: '#eeeeee', enable_custom_fonts: true, body_font: {family: 'Georgia'}, image_description_position: 'bottom-right', image_border_radius: 22};
      const sels = [R, '.iv-img__container', '.iv-img__media', '.iv-img__media > img', '[data-iv-caption]'], props = ['backgroundColor', 'paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'color', 'fontFamily', 'fontSize', 'objectPosition'];
      const a = await open(browser, NAME, {width, settings}); const hydrated = await snapshot(a, sels, props); await a.page.close();
      const b = await open(browser, NAME, {width, settings, assets: []}); eq(await snapshot(b, sels, props), hydrated, 'first paint equals hydrated at ' + width); await b.page.close();
    }
    /* Reduced motion: the video does not autoplay */
    {
      const t = await open(browser, NAME, {reducedMotion: 'reduce'});
      await t.redraw({settings: {use_video: true, video_url: CLIP_URL}}); await sleep(500);
      eq((await t.video()).paused, true, 'no autoplay under reduced motion'); eq((await t.spy()).plays, 0, 'play() never called');
      ok(await t.visible('[data-iv-play]'), 'play button offered'); ok(await t.visible('[data-iv-caption]'), 'caption visible');
      eq(t.errors, [], 'no errors'); await t.page.close();
    }
    console.log(L.total() + ' Image schema, theme inheritance, every control live and redrawn, caption variants, instances, no image reload, video stability, first paint and reduced motion checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
