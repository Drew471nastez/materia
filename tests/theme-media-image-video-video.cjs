/* Video (video): theme inheritance, every section and block control live and
   redrawn, desktop/mobile at 801px, variants, instances, added blocks,
   redraw lifecycle, playback stability, first paint, reduced motion.
   Run: LIQUIDJS=<path> node tests/theme-media-image-video-video.cjs */
const L = require('./theme-media-image-video-lib.cjs');
const {open, launch, ok, eq, sleep, CLIP_URL, control, snapshot} = L;
const NAME = 'video', BP = 801, ROOT = '.ti-section-wrap', H = '[data-iv-type="headline"]', T = '[data-iv-type="subtext"]';
const BLOCKS = [{type: 'headline', settings: {headline: 'Watch how it works'}}, {type: 'subtext', settings: {text: 'A short film. <a href="/pages/faq">Read the FAQ</a>'}}];
const IMG = {src: 'http://theme.test/bg.png', width: 1600, height: 900};
const V = {video_url: CLIP_URL, enable_custom_url_video: true, custom_video_url: CLIP_URL};
const URL_ON = {enable_custom_url_video: true, custom_video_url: CLIP_URL};
const media = t => t.box('.loud-media');
const P = {
  color_scheme: {v: 'alt-scheme', probe: t => t.style(ROOT, 'backgroundColor'), expect: 'rgb(250, 250, 250)'},
  section_width: {v: 'full_width', probe: t => t.box('.loud-section')},
  show_on_device: {v: w => w < BP ? 'desktop' : 'mobile', probe: t => t.style(ROOT, 'display'), expect: 'none'},
  reset_spacing: {v: false, pre: {section_margin_top_desktop: 0}, probe: t => t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test').nextElementSibling || document.body).marginTop + '|' + getComputedStyle(document.querySelector('#shopify-section-test')).marginTop)},
  text_alignment: {v: 'left', only: 'd', probe: t => t.style('.loud-headline', 'textAlign'), expect: 'left'},
  container_max_width: {v: 500, probe: t => t.style('.loud-container', 'maxWidth'), expect: '500px'},
  element_spacing: {v: 30, probe: t => t.style(H, 'marginBottom'), expect: '30px'},
  desktop_spacing_gap: {v: 40, only: 'd', probe: t => t.style('.loud-headline', 'marginBottom'), expect: '40px'},
  video_aspect_ratio: {v: '1:1', probe: media},
  desktop_video_width: {v: 600, only: 'd', probe: media},
  desktop_video_height: {v: 300, only: 'd', probe: media},
  video_fit: {v: 'contain', pre: URL_ON, probe: t => t.style('video', 'objectFit'), expect: 'contain'},
  video: {v: {sources: [{format: 'mp4', url: CLIP_URL}], preview_image: {src: 'http://theme.test/preview.png'}}, probe: t => t.attr('video', 'src'), expect: CLIP_URL},
  enable_custom_url_video: {v: true, pre: {custom_video_url: CLIP_URL}, probe: t => t.attr('video', 'src'), expect: CLIP_URL},
  custom_video_url: {v: CLIP_URL, pre: {enable_custom_url_video: true}, probe: t => t.attr('video', 'src'), expect: CLIP_URL},
  video_poster: {v: {src: 'http://theme.test/cover.png'}, probe: async t => [await t.visible('.ivp__cover'), String(await t.attr('.ivp__cover', 'src')).replace(/\?.*/, '')], expect: [true, 'http://theme.test/cover.png']},
  video_autoplay: {v: false, pre: URL_ON, wait: 400, probe: async t => (await t.video()).paused, expect: true},
  video_muted: {v: false, pre: {...URL_ON, video_autoplay: false}, probe: async t => (await t.video()).muted, expect: false},
  video_loop: {v: false, pre: URL_ON, probe: async t => (await t.video()).loop, expect: false},
  video_controls: {v: true, pre: {...URL_ON, video_autoplay: false}, probe: async t => [(await t.video()).controls, await t.visible('[data-iv-play]')], expect: [true, false]},
  big_play_pause_button: {v: false, pre: {...URL_ON, video_autoplay: false}, probe: t => t.visible('[data-iv-play]'), expect: false},
  play_button_style: {v: 'outline', pre: {...URL_ON, video_autoplay: false}, probe: t => Promise.all([t.box('[data-iv-play]'), t.style('[data-iv-play]', 'backgroundColor')])},
  enable_lazy_loading: {v: true, pre: URL_ON, probe: async t => (await t.video()).preload, expect: 'none'},
  video_alt: {v: 'Assembly film', pre: URL_ON, probe: async t => (await t.video()).label, expect: 'Assembly film'},
  video_metadata: {v: 'How it is made', pre: URL_ON, probe: async t => (await t.video()).title, expect: 'How it is made'},
  enable_custom_style: {v: true, pre: {section_bg: '#abcdef'}, probe: t => t.style(ROOT, 'backgroundColor'), expect: 'rgb(171, 205, 239)'},
  section_bg: {v: '#abcdef', pre: {enable_custom_style: true}, probe: t => t.style(ROOT, 'backgroundColor'), expect: 'rgb(171, 205, 239)'},
  container_background_color: {v: '#123123', pre: {enable_custom_style: true}, probe: t => t.style('.loud-container', 'backgroundColor'), expect: 'rgb(18, 49, 35)'},
  container_border_color: {v: '#ff0000', pre: {enable_custom_style: true, container_border_size: 2}, probe: t => t.style('.loud-container', 'borderTopColor'), expect: 'rgb(255, 0, 0)'},
  link_color: {v: '#00ff00', pre: {enable_custom_style: true}, probe: t => t.style(T + ' a', 'color'), expect: 'rgb(0, 255, 0)'},
  overlay_color: {v: '#ff0000', pre: {enable_custom_style: true, overlay_opacity: 50}, probe: t => t.style('.ivp__overlay', 'backgroundColor'), expect: 'rgb(255, 0, 0)'},
  section_background_image_color: {v: '#0000ff', pre: {enable_custom_style: true}, probe: t => t.style('.loud-section', 'backgroundColor'), expect: 'rgb(0, 0, 255)'},
  section_background_image: {v: IMG, probe: async t => String(await t.style('.loud-section', 'backgroundImage')).replace(/\?[^")]*/, ''), expect: 'url("http://theme.test/bg.png")'},
  section_background_size: {v: 'contain', pre: {section_background_image: IMG}, probe: t => t.style('.loud-section', 'backgroundSize'), expect: 'contain'},
  container_radius: {v: 20, probe: t => t.style('.loud-container', 'borderTopLeftRadius'), expect: '20px'},
  container_border_size: {v: 3, probe: t => t.style('.loud-container', 'borderTopWidth'), expect: '3px'},
  container_shadow: {v: true, probe: t => t.style('.loud-container', 'boxShadow'), expect: /rgba\(0, 0, 0, 0\.2\)/},
  media_radius: {v: 2, probe: t => t.style('.loud-media', 'borderTopLeftRadius'), expect: '2px'},
  video_shadow: {v: 'high', probe: t => t.style('.loud-media', 'boxShadow'), expect: /12px/},
  overlay_opacity: {v: 50, probe: t => t.style('.ivp__overlay', 'opacity'), expect: '0.5'},
  section_padding_top_bottom: {v: 90, only: 'd', probe: t => t.style('.loud-section', 'paddingTop'), expect: '90px'},
  section_padding_left_right: {v: 90, only: 'd', probe: t => t.style('.loud-section', 'paddingLeft'), expect: '90px'},
  container_padding_top_bottom: {v: 25, only: 'd', probe: t => t.style('.loud-container', 'paddingTop'), expect: '25px'},
  container_padding_left_right: {v: 25, only: 'd', probe: t => t.style('.loud-container', 'paddingLeft'), expect: '25px'},
  desktop_video_margin_top: {v: 10, only: 'd', probe: t => t.style('.loud-media', 'marginTop'), expect: '10px'},
  desktop_video_margin_bottom: {v: 10, only: 'd', probe: t => t.style('.loud-media', 'marginBottom'), expect: '10px'},
  section_margin_top_desktop: {v: 33, only: 'd', probe: t => t.wrap().evaluate(el => getComputedStyle(el).marginTop), expect: '33px'},
  section_margin_bottom_desktop: {v: 33, only: 'd', probe: t => t.wrap().evaluate(el => getComputedStyle(el).marginBottom), expect: '33px'},
  mobile_text_alignment: {v: 'right', only: 'm', probe: t => t.style('.loud-headline', 'textAlign'), expect: 'right'},
  mobile_spacing_gap: {v: 25, only: 'm', probe: t => t.style('.loud-headline', 'marginBottom'), expect: '25px'},
  mobile_video_width: {v: 200, only: 'm', probe: media},
  mobile_video_height: {v: 300, only: 'm', probe: media},
  mobile_section_padding_top_bottom: {v: 5, only: 'm', probe: t => t.style('.loud-section', 'paddingTop'), expect: '5px'},
  mobile_section_padding_left_right: {v: 5, only: 'm', probe: t => t.style('.loud-section', 'paddingLeft'), expect: '5px'},
  mobile_container_padding_top_bottom: {v: 9, only: 'm', probe: t => t.style('.loud-container', 'paddingTop'), expect: '9px'},
  mobile_container_padding_left_right: {v: 9, only: 'm', probe: t => t.style('.loud-container', 'paddingLeft'), expect: '9px'},
  mobile_video_margin_top: {v: 15, only: 'm', probe: t => t.style('.loud-media', 'marginTop'), expect: '15px'},
  mobile_video_margin_bottom: {v: 15, only: 'm', probe: t => t.style('.loud-media', 'marginBottom'), expect: '15px'},
  section_margin_top_mobile: {v: 13, only: 'm', probe: t => t.wrap().evaluate(el => getComputedStyle(el).marginTop), expect: '13px'},
  section_margin_bottom_mobile: {v: 13, only: 'm', probe: t => t.wrap().evaluate(el => getComputedStyle(el).marginBottom), expect: '13px'},
};
const HB = {
  headline: {v: 'Made <em>by hand</em>', probe: t => t.page.evaluate(s => { const e = document.querySelector('#shopify-section-test ' + s); return e.textContent + '|' + e.querySelectorAll('em').length; }, H), expect: 'Made by hand|1'},
  enable_custom_style: {v: true, pre: {headline_text_color: '#ff0000'}, probe: t => t.style(H, 'color'), expect: 'rgb(255, 0, 0)'},
  headline_text_color: {v: '#ff0000', pre: {enable_custom_style: true}, probe: t => t.style(H, 'color'), expect: 'rgb(255, 0, 0)'},
  override_font: {v: true, pre: {headline_font: {family: 'Arial', fallback_families: 'sans-serif', weight: 400}}, probe: t => t.style(H, 'fontFamily'), expect: /Arial/},
  headline_font: {v: {family: 'Arial', fallback_families: 'sans-serif', weight: 400}, pre: {override_font: true}, probe: t => t.style(H, 'fontFamily'), expect: /Arial/},
  font_weight: {v: '300', pre: {override_font: true, headline_font: {family: 'Arial', fallback_families: 'sans-serif', weight: 400}}, probe: t => t.style(H, 'fontWeight'), expect: '300'},
  enable_custom_size: {v: true, pre: {headline_size: 50, mobile_headline_size: 22}, probe: t => t.style(H, 'fontSize'), expect: w => w < BP ? '22px' : '50px'},
  headline_size: {v: 60, only: 'd', pre: {enable_custom_size: true}, probe: t => t.style(H, 'fontSize'), expect: '60px'},
  mobile_headline_size: {v: 20, only: 'm', pre: {enable_custom_size: true}, probe: t => t.style(H, 'fontSize'), expect: '20px'},
  headline_line_height: {v: '2.0', probe: async t => +(parseFloat(await t.style(H, 'lineHeight')) / parseFloat(await t.style(H, 'fontSize'))).toFixed(2), expect: 2},
};
const TB = {
  text: {v: 'New <strong>words</strong>', probe: t => t.page.evaluate(s => { const e = document.querySelector('#shopify-section-test ' + s); return e.textContent + '|' + e.querySelectorAll('strong').length; }, T), expect: 'New words|1'},
  enable_custom_style: {v: true, pre: {text_color: '#ff0000'}, probe: t => t.style(T, 'color'), expect: 'rgb(255, 0, 0)'},
  text_color: {v: '#ff0000', pre: {enable_custom_style: true}, probe: t => t.style(T, 'color'), expect: 'rgb(255, 0, 0)'},
  override_font: {v: true, pre: {text_font: {family: 'Georgia', fallback_families: 'serif', weight: 400}}, probe: t => t.style(T, 'fontFamily'), expect: /Georgia/},
  text_font: {v: {family: 'Georgia', fallback_families: 'serif', weight: 400}, pre: {override_font: true}, probe: t => t.style(T, 'fontFamily'), expect: /Georgia/},
  enable_custom_size: {v: true, pre: {text_size: 21, mobile_text_size: 13}, probe: t => t.style(T, 'fontSize'), expect: w => w < BP ? '13px' : '21px'},
  text_size: {v: 25, only: 'd', pre: {enable_custom_size: true}, probe: t => t.style(T, 'fontSize'), expect: '25px'},
  mobile_text_size: {v: 11, only: 'm', pre: {enable_custom_size: true}, probe: t => t.style(T, 'fontSize'), expect: '11px'},
  text_line_height: {v: '2.0', probe: async t => +(parseFloat(await t.style(T, 'lineHeight')) / parseFloat(await t.style(T, 'fontSize'))).toFixed(2), expect: 2},
};

(async () => {
  const browser = await launch();
  try {
    eq(L.schemaProblems(NAME), [], 'schema problems');
    const {schema} = L.schemaOf(NAME), blockSchema = type => schema.blocks.find(b => b.type === type).settings;
    eq(L.visibleIds(schema.settings).filter(id => !P[id] && id !== 'reveal'), [], 'every visible control has a probe');
    eq(L.visibleIds(blockSchema('headline')).filter(id => !HB[id]), [], 'headline probes');
    eq(L.visibleIds(blockSchema('subtext')).filter(id => !TB[id]), [], 'subtext probes');
    ok(schema.settings.find(x => x.id === 'video_inline').hidden, 'playsinline is always on');
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await open(browser, NAME, {width, editing, blocks: BLOCKS});
      await t.page.addStyleTag({content: '.shopify-section{margin-top:20px}'});
      await t.page.evaluate(() => { const n = document.createElement('div'); n.className = 'shopify-section'; n.style.height = '10px'; document.body.append(n); });
      /* Theme inheritance */
      eq(await t.style(ROOT, 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background');
      eq([await t.style(H, 'color'), await t.style(T, 'color')], ['rgb(255, 255, 255)', 'rgb(204, 204, 204)'], 'scheme heading and text colours');
      ok(/Georgia/.test(await t.style(H, 'fontFamily')) && /Arial/.test(await t.style(T, 'fontFamily')), 'theme fonts');
      eq(await t.style(H, 'fontWeight'), '700', 'theme heading weight');
      eq(await t.style(T + ' a', 'color'), 'rgb(51, 102, 153)', 'links use scheme primary');
      eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test h1').length), 0, 'no h1');
      ok(await t.visible('.ivp__ph'), 'library placeholder');
      /* Scheme switch live and redraw */
      await t.emit({color_scheme: 'alt-scheme'}); eq([await t.style(ROOT, 'backgroundColor'), await t.style(H, 'color')], ['rgb(250, 250, 250)', 'rgb(16, 16, 16)'], 'alt scheme live');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await t.style(ROOT, 'backgroundColor'), 'rgb(250, 250, 250)', 'alt scheme redraw');
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      /* Every control, live and redrawn */
      const initial = {...t.section.settings};
      for (const [id, c] of Object.entries(P)) await control(t, width, BP, id, c, initial);
      for (const [type, table] of [['headline', HB], ['subtext', TB]]) { const init = {...t.rendered[0].section.blocks.find(b => b.type === type).settings}; for (const [id, c] of Object.entries(table)) await control(t, width, BP, id, c, init, type); }
      /* Custom style on then off, section and block */
      await t.emit({enable_custom_style: true, section_bg: '#010203', container_background_color: '#040506', link_color: '#00ff00', container_border_color: '#ff00ff', container_border_size: 2});
      await t.emit({enable_custom_style: true, headline_text_color: '#ff0000'}, t.blockId('headline'));
      eq([await t.style(ROOT, 'backgroundColor'), await t.style('.loud-container', 'backgroundColor'), await t.style(T + ' a', 'color'), await t.style('.loud-container', 'borderTopColor'), await t.style(H, 'color')], ['rgb(1, 2, 3)', 'rgb(4, 5, 6)', 'rgb(0, 255, 0)', 'rgb(255, 0, 255)', 'rgb(255, 0, 0)'], 'custom colours land');
      await t.emit({enable_custom_style: false}); await t.emit({enable_custom_style: false}, t.blockId('headline'));
      eq([await t.style(ROOT, 'backgroundColor'), await t.style('.loud-container', 'backgroundColor'), await t.style(T + ' a', 'color'), await t.style('.loud-container', 'borderTopColor'), await t.style(H, 'color')], ['rgb(24, 32, 40)', 'rgba(0, 0, 0, 0)', 'rgb(51, 102, 153)', 'rgb(68, 85, 102)', 'rgb(255, 255, 255)'], 'custom off restores theme');
      await t.emit({container_border_size: 0});
      /* Variants are visibly distinct */
      const ratios = []; for (const r of ['none', '16:9', '4:3', '1:1', '9:16', '21:9']) { await t.emit({video_aspect_ratio: r}); ratios.push(await media(t)); }
      eq(new Set(ratios).size, 6, 'video shapes differ ' + ratios.join(' / ')); await t.emit({video_aspect_ratio: 'none'});
      const shadows = []; for (const s of ['none', 'low', 'medium', 'high']) { await t.emit({video_shadow: s}); shadows.push(await t.style('.loud-media', 'boxShadow')); }
      eq(new Set(shadows).size, 4, 'video shadows differ'); await t.emit({video_shadow: 'none'});
      const sizes = []; await t.emit({section_background_image: IMG}); for (const s of ['auto', 'cover', 'contain', 'fill', 'scale-down']) { await t.emit({section_background_size: s}); sizes.push(await t.style('.loud-section', 'backgroundSize')); }
      ok(new Set(sizes).size >= 3, 'background sizes differ'); await t.emit({section_background_image: null, section_background_size: 'cover'});
      const fits = []; await t.emit(URL_ON); for (const f of ['cover', 'contain']) { await t.emit({video_fit: f}); fits.push(await t.style('video', 'objectFit')); }
      eq(new Set(fits).size, 2, 'fits differ'); await t.emit({video_fit: 'cover'});
      const aligns = []; for (const a of ['left', 'center', 'right']) { await t.emit({text_alignment: a, mobile_text_alignment: a}); aligns.push(await t.box(H + ' em') || await t.page.evaluate(s => { const r = document.createRange(), e = document.querySelector('#shopify-section-test ' + s); r.selectNodeContents(e); return Math.round(r.getBoundingClientRect().x); }, H)); }
      eq(new Set(aligns).size, 3, 'alignments differ'); await t.emit({text_alignment: 'center', mobile_text_alignment: 'center'});
      /* Playback stability */
      await t.emit({video_autoplay: true}); await sleep(500);
      const v0 = await t.video(), spy0 = await t.spy(), handle = await t.page.$('#shopify-section-test video'); ok(!v0.paused && v0.muted, 'autoplays muted');
      for (const edit of [{media_radius: 4}, {element_spacing: 20}, {section_padding_top_bottom: 30, mobile_section_padding_top_bottom: 30}, {container_radius: 8}, {video_shadow: 'low'}, {overlay_opacity: 10}, {video_alt: 'x'}]) await t.emit(edit);
      await t.emit({headline: 'Edited heading'}, t.blockId('headline'));
      await sleep(250); const v1 = await t.video(), spy1 = await t.spy();
      ok(await handle.evaluate(el => el.isConnected) && v1.time > v0.time && !v1.paused, 'kept playing through edits');
      eq([spy1.loads, spy1.loadstart, spy1.plays], [spy0.loads, spy0.loadstart, spy0.plays], 'no reload or restart');
      await t.page.locator('#shopify-section-test video').click({position: {x: 12, y: 12}}); await sleep(80); ok((await t.video()).paused, 'click on video pauses');
      /* Added block + redraw: rendered and live, no duplicate listeners */
      const s0 = await t.stats();
      const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([{type: 'subtext', settings: {text: 'Second line'}}]);
      await t.redraw({blocks}); await t.redraw({blocks});
      eq(await t.count('[data-iv-block]'), 3, 'added block renders');
      const added = t.rendered[0].section.blocks[2].id;
      await t.emit({text: 'Live second line', enable_custom_style: true, text_color: '#00ff00'}, added);
      eq(await t.page.evaluate(id => document.querySelector('[data-iv-block="' + id + '"]').textContent, added), 'Live second line', 'added block live text');
      eq(await t.page.evaluate(id => getComputedStyle(document.querySelector('[data-iv-block="' + id + '"]')).color, added), 'rgb(0, 255, 0)', 'added block live colour');
      eq(await t.style(T, 'color'), 'rgb(204, 204, 204)', 'first subtext untouched');
      const s1 = await t.stats(); eq([s1.roots, s1.players, s1.listeners], [s0.roots, s0.players, s0.listeners], 'redraw does not duplicate');
      await t.emit({text: ''}, added); eq(await t.visible('[data-iv-block="' + added + '"]'), false, 'empty block hides');
      ok(await t.noOverflow(), 'no overflow'); eq(t.errors, [], 'no errors');
      await t.page.close();
    }
    /* Reveal: theme scroll animation hook on or off */
    for (const reveal of [true, false]) {
      const t = await open(browser, NAME, {theme: {scroll_animation: 'fade-in'}, settings: {reveal}, editing: false});
      eq(await t.wrap().evaluate(el => el.classList.contains('scroll-trigger')), reveal, 'reveal ' + reveal);
      await t.page.close();
    }
    /* Section width variants distinct on a wide screen */
    {
      const t = await open(browser, NAME, {width: 1800, blocks: BLOCKS, settings: {section_padding_left_right: 0}});
      const looks = []; for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await t.emit({section_width: w}); looks.push(await t.box('.loud-section') + '|' + await t.style('.loud-section', 'paddingLeft')); }
      eq(new Set(looks).size, 4, 'section widths differ ' + looks.join(' / ')); await t.page.close();
    }
    /* Two instances */
    {
      const t = await open(browser, NAME, {instances: [{uid: 'a', blocks: BLOCKS}, {uid: 'b', blocks: BLOCKS}]});
      await t.emit({media_radius: 31}, undefined, 'a'); await t.emit({headline: 'Only A'}, t.blockId('headline', 0, 'a'), 'a');
      eq(await t.style('.loud-media', 'borderTopLeftRadius', null, 'a'), '31px', 'a changed');
      eq(await t.style('.loud-media', 'borderTopLeftRadius', null, 'b'), '13px', 'b unchanged');
      eq(await t.page.evaluate(() => document.querySelector('#shopify-section-b [data-iv-type="headline"]').textContent), 'Watch how it works', 'b heading unchanged');
      eq(t.errors, [], 'no errors'); await t.page.close();
    }
    /* First paint equals hydrated */
    for (const width of [375, 1366]) {
      const blocks = [{type: 'headline', settings: {headline: 'Heading', enable_custom_style: true, headline_text_color: '#ff8800', override_font: true, headline_font: {family: 'Arial', fallback_families: 'sans-serif', weight: 400}, font_weight: '500', enable_custom_size: true, headline_size: 44, mobile_headline_size: 26, headline_line_height: '1.3'}}, {type: 'subtext', settings: {text: 'Words <a href="/x">link</a>'}}];
      const settings = {...URL_ON, video_autoplay: false, enable_custom_style: true, section_bg: '#334455', link_color: '#aabbcc', container_border_size: 2, container_radius: 10, video_aspect_ratio: '16:9', media_radius: 20, video_shadow: 'medium', overlay_opacity: 30, section_background_image: IMG, section_width: 'container'};
      const sels = [ROOT, '.loud-section', '.loud-container', '.loud-headline', H, T, T + ' a', '.loud-media', '.ivp__overlay', '[data-iv-play]'], props = ['backgroundColor', 'paddingTop', 'paddingLeft', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'borderTopWidth', 'boxShadow', 'opacity', 'textAlign'];
      const a = await open(browser, NAME, {width, settings, blocks}); const hydrated = await snapshot(a, sels, props); await a.page.close();
      const b = await open(browser, NAME, {width, settings, blocks, assets: []}); eq(await snapshot(b, sels, props), hydrated, 'first paint equals hydrated at ' + width); await b.page.close();
    }
    /* Reduced motion */
    {
      const t = await open(browser, NAME, {reducedMotion: 'reduce', blocks: BLOCKS});
      await t.redraw({settings: URL_ON}); await sleep(500);
      eq((await t.video()).paused, true, 'no autoplay under reduced motion'); eq((await t.spy()).plays, 0, 'play() never called');
      ok(await t.visible('[data-iv-play]') && await t.visible(H), 'play button and text visible');
      eq(t.errors, [], 'no errors'); await t.page.close();
    }
    console.log(L.total() + ' Video schema, theme inheritance, every section and block control live and redrawn, variants, instances, added blocks, playback stability, first paint and reduced motion checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
