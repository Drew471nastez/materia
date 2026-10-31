/* Video 2 (video-2): theme inheritance, every control live and redrawn,
   desktop/mobile, variants, instances, redraw lifecycle, playback stability,
   first paint, reduced motion. Run: LIQUIDJS=<path> node tests/theme-media-image-video-video2.cjs */
const L = require('./theme-media-image-video-lib.cjs');
const {open, launch, ok, eq, sleep, CLIP_URL, control, snapshot} = L;
const NAME = 'video-2', BP = 768;
const media = t => t.box('.vid2__media');
const P = {
  color_scheme: {v: 'alt-scheme', probe: t => t.style('.vid2', 'backgroundColor'), expect: 'rgb(250, 250, 250)'},
  section_width: {v: 'container', probe: t => t.box('.vid2'), only: 'd'},
  reset_spacing: {v: false, probe: t => t.wrap().evaluate(el => getComputedStyle(el).marginTop), expect: '20px'},
  full_bleed: {v: true, probe: t => Promise.all([media(t), t.style('.vid2__media', 'borderTopLeftRadius')])},
  aspect_w: {v: 4, probe: media},
  aspect_h: {v: 16, probe: media},
  video: {v: {sources: [{format: 'mp4', mime_type: 'video/mp4', url: CLIP_URL}], preview_image: {src: 'http://theme.test/preview.png'}}, probe: t => t.attr('video', 'src'), expect: CLIP_URL},
  video_url: {v: CLIP_URL, probe: t => t.attr('video', 'src'), expect: CLIP_URL},
  poster: {v: {src: 'http://theme.test/cover.png', width: 1600, height: 900}, probe: async t => [await t.visible('.ivp__cover'), String(await t.attr('.ivp__cover', 'src')).replace(/\?.*/, '')], expect: [true, 'http://theme.test/cover.png']},
  video_alt: {v: 'Product demo', pre: {video_url: CLIP_URL}, probe: t => t.attr('video', 'aria-label'), expect: 'Product demo'},
  autoplay: {v: false, pre: {video_url: CLIP_URL}, wait: 400, probe: async t => (await t.video()).paused, expect: true},
  muted: {v: false, pre: {video_url: CLIP_URL, autoplay: false}, probe: async t => (await t.video()).muted, expect: false},
  loop: {v: false, pre: {video_url: CLIP_URL}, probe: async t => (await t.video()).loop, expect: false},
  show_controls: {v: true, pre: {video_url: CLIP_URL, autoplay: false}, probe: async t => [(await t.video()).controls, await t.visible('[data-iv-play]')], expect: [true, false]},
  show_mute_btn: {v: false, pre: {video_url: CLIP_URL}, probe: t => t.visible('[data-iv-mute]'), expect: false},
  play_button_style: {v: 'outline', pre: {video_url: CLIP_URL, autoplay: false}, probe: t => Promise.all([t.box('[data-iv-play]'), t.style('[data-iv-play]', 'backgroundColor')])},
  enable_custom_style: {v: true, pre: {section_bg: '#abcdef'}, probe: t => t.style('.vid2', 'backgroundColor'), expect: 'rgb(171, 205, 239)'},
  section_bg: {v: '#abcdef', pre: {enable_custom_style: true}, probe: t => t.style('.vid2', 'backgroundColor'), expect: 'rgb(171, 205, 239)'},
  overlay_color: {v: '#ff0000', pre: {enable_custom_style: true, overlay_opacity: 50}, probe: t => t.style('.ivp__overlay', 'backgroundColor'), expect: 'rgb(255, 0, 0)'},
  overlay_opacity: {v: 50, probe: t => t.style('.ivp__overlay', 'opacity'), expect: '0.5'},
  radius: {v: 30, probe: t => t.style('.vid2__media', 'borderTopLeftRadius'), expect: '30px'},
  padding_top_desktop: {v: 100, only: 'd', probe: t => t.style('.vid2', 'paddingTop'), expect: '100px'},
  padding_bottom_desktop: {v: 100, only: 'd', probe: t => t.style('.vid2', 'paddingBottom'), expect: '100px'},
  side_padding_desktop: {v: 70, only: 'd', probe: t => t.style('.vid2', 'paddingLeft'), expect: '70px'},
  padding_top_mobile: {v: 12, only: 'm', probe: t => t.style('.vid2', 'paddingTop'), expect: '12px'},
  padding_bottom_mobile: {v: 12, only: 'm', probe: t => t.style('.vid2', 'paddingBottom'), expect: '12px'},
  side_padding_mobile: {v: 6, only: 'm', probe: t => t.style('.vid2', 'paddingLeft'), expect: '6px'},
};

(async () => {
  const browser = await launch();
  try {
    eq(L.schemaProblems(NAME), [], 'schema problems');
    const {schema} = L.schemaOf(NAME);
    eq(L.visibleIds(schema.settings).filter(id => !P[id]), [], 'every visible control has a probe');
    eq(schema.settings.find(x => x.id === 'muted').visible_if, '{{ section.settings.autoplay == false }}', 'muted hides while autoplay');
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await open(browser, NAME, {width, editing});
      await t.page.addStyleTag({content: '.shopify-section{margin-top:20px}'});
      /* Theme inheritance */
      eq(await t.style('.vid2', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background');
      eq(await t.style('.ivp__overlay', 'opacity'), '0', 'no overlay by default');
      ok(await t.visible('.ivp__ph'), 'library placeholder shows with no video');
      ok((await t.box('.vid2__media')).split(',')[3] > 100, 'placeholder has real height');
      eq(await t.style('.ivp__ph', 'color'), 'rgb(204, 204, 204)', 'placeholder icon uses scheme text');
      /* Scheme switch live and redraw */
      await t.emit({color_scheme: 'alt-scheme'}); eq(await t.style('.vid2', 'backgroundColor'), 'rgb(250, 250, 250)', 'alt scheme live');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await t.style('.vid2', 'backgroundColor'), 'rgb(250, 250, 250)', 'alt scheme redraw');
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      /* Every control, live and redrawn */
      const initial = {...t.section.settings};
      const t0 = Date.now(); for (const [id, c] of Object.entries(P)) await control(t, width, BP, id, c, initial); if (process.env.IV_TIME) console.log(width, editing, Date.now() - t0);
      /* Custom style on then off restores theme values exactly */
      await t.emit({enable_custom_style: true, section_bg: '#010203', overlay_color: '#00ff00', overlay_opacity: 40});
      eq(await t.style('.vid2', 'backgroundColor'), 'rgb(1, 2, 3)', 'custom bg');
      eq(await t.style('.ivp__overlay', 'backgroundColor'), 'rgb(0, 255, 0)', 'custom overlay');
      await t.emit({enable_custom_style: false});
      eq(await t.style('.vid2', 'backgroundColor'), 'rgb(24, 32, 40)', 'custom off restores bg');
      eq(await t.style('.ivp__overlay', 'backgroundColor'), 'rgb(24, 32, 40)', 'custom off restores overlay');
      await t.emit({overlay_opacity: 0});
      /* Variants distinct */
      await t.emit({video_url: CLIP_URL, autoplay: false});
      const looks = [];
      for (const style of ['circle', 'outline', 'none']) { await t.emit({play_button_style: style}); looks.push(JSON.stringify([await t.visible('[data-iv-play]'), await t.box('[data-iv-play]'), await t.style('[data-iv-play]', 'backgroundColor'), await t.style('[data-iv-play]', 'borderTopWidth')])); }
      eq(new Set(looks).size, 3, 'play button styles differ');
      /* Playback: play button, keyboard, 44px targets, sound button */
      await t.emit({play_button_style: 'circle', show_mute_btn: true});
      const btn = t.page.locator('#shopify-section-test [data-iv-play]');
      const pb = (await t.box('[data-iv-play]')).split(','); ok(+pb[2] >= 44 && +pb[3] >= 44, 'play target 44px');
      const mb = (await t.box('[data-iv-mute]')).split(','); ok(+mb[2] >= 44 && +mb[3] >= 44, 'mute target 44px');
      await btn.focus(); await t.page.keyboard.press('Enter'); await sleep(400);
      eq((await t.video()).paused, false, 'keyboard plays'); eq(await btn.getAttribute('aria-label'), 'Pause video', 'label says pause');
      ok(await btn.evaluate(el => getComputedStyle(el).outlineStyle !== 'none' || el.matches(':focus-visible')), 'focus ring');
      await t.page.locator('#shopify-section-test [data-iv-mute]').click(); await sleep(80); eq((await t.video()).muted, false, 'sound on'); eq(await t.attr('[data-iv-mute]', 'aria-pressed'), 'true', 'sound pressed');
      await btn.click(); await sleep(100); eq((await t.video()).paused, true, 'click pauses');
      /* Running video is not restarted or reloaded by unrelated edits */
      await t.emit({autoplay: true}); await sleep(500);
      const v0 = await t.video(), spy0 = await t.spy(); ok(!v0.paused, 'autoplay resumes when re-enabled');
      const handle = await t.page.$('#shopify-section-test video');
      for (const edit of [{radius: 7}, {padding_top_desktop: 30, padding_top_mobile: 30}, {section_width: 'container'}, {overlay_opacity: 20}, {loop: false}, {show_mute_btn: false}, {aspect_w: 4, aspect_h: 3}]) await t.emit(edit);
      await sleep(300);
      const v1 = await t.video(), spy1 = await t.spy();
      ok(await handle.evaluate(el => el.isConnected), 'same video element');
      ok(v1.time > v0.time && !v1.paused, 'video kept playing through edits');
      eq([spy1.loads, spy1.loadstart], [spy0.loads, spy0.loadstart], 'no reload on unrelated edits');
      eq(spy1.plays, spy0.plays, 'no play() restart on unrelated edits');
      /* Source change does rebuild, once */
      await t.emit({video_url: 'https://www.youtube.com/watch?v=abcDEF12345'}); await sleep(100);
      ok(/youtube-nocookie\.com\/embed\/abcDEF12345\?autoplay=1&mute=1/.test(await t.attr('iframe', 'src')), 'YouTube embed');
      await t.emit({video_url: 'https://vimeo.com/76979871'}); await sleep(100);
      ok(/player\.vimeo\.com\/video\/76979871\?autoplay=1&muted=1/.test(await t.attr('iframe', 'src')), 'Vimeo embed');
      eq(await t.count('video'), 0, 'no stray video element');
      await t.redraw({settings: {video_url: 'https://youtu.be/abcDEF12345', autoplay: true}});
      ok(/embed\/abcDEF12345\?autoplay=1/.test(await t.attr('iframe', 'src')), 'YouTube after redraw');
      /* Redraw lifecycle: no duplicated listeners */
      const s0 = await t.stats(); await t.redraw(); await t.redraw(); const s1 = await t.stats();
      eq([s1.roots, s1.players, s1.listeners], [s0.roots, s0.players, s0.listeners], 'redraw does not duplicate');
      ok(await t.noOverflow(), 'no overflow'); eq(t.errors, [], 'no errors');
      await t.page.close();
    }
    /* Section width variants are visibly distinct (wide screen where they differ) */
    {
      const t = await open(browser, NAME, {width: 1800, settings: {side_padding_desktop: 0}});
      const looks = [];
      for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await t.emit({section_width: w}); looks.push((await t.box('.vid2')) + '|' + (await t.box('.vid2__inner'))); }
      eq(new Set(looks).size, 4, 'section widths differ: ' + looks.join(' / '));
      await t.page.close();
    }
    /* Two instances stay independent */
    {
      const t = await open(browser, NAME, {instances: [{uid: 'a'}, {uid: 'b'}]});
      await t.emit({radius: 33, enable_custom_style: true, section_bg: '#112233'}, undefined, 'a');
      eq(await t.style('.vid2__media', 'borderTopLeftRadius', null, 'a'), '33px', 'a changed');
      eq(await t.style('.vid2__media', 'borderTopLeftRadius', null, 'b'), '16px', 'b unchanged');
      eq(await t.style('.vid2', 'backgroundColor', null, 'b'), 'rgb(24, 32, 40)', 'b bg unchanged');
      await t.emit({radius: 3}, undefined, 'shopify-section-b'); eq(await t.style('.vid2__media', 'borderTopLeftRadius', null, 'b'), '3px', 'prefixed id reaches b');
      await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: {id: 'a'}, settings: {radius: 9}}}))); await sleep(60);
      eq(await t.style('.vid2__media', 'borderTopLeftRadius', null, 'a'), '9px', 'object id reaches a');
      eq(t.errors, [], 'no errors');
      await t.page.close();
    }
    /* First paint equals hydrated paint */
    for (const width of [375, 1366]) {
      const settings = {video_url: CLIP_URL, autoplay: false, enable_custom_style: true, section_bg: '#334455', overlay_opacity: 30, radius: 22, section_width: 'container'};
      const sels = ['.vid2', '.vid2__inner', '.vid2__media', '.ivp__overlay', '[data-iv-play]', '[data-iv-mute]'], props = ['backgroundColor', 'paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'opacity'];
      const a = await L.open(browser, NAME, {width, settings}).catch(e => { throw e; });
      const hydrated = await snapshot(a, sels, props); await a.page.close();
      const {mount} = require('./media-fixture.cjs');
      const b = await mount(browser, NAME, {width, settings, assets: []});
      b.count = sel => b.page.locator('#shopify-section-test ' + sel).count();
      b.box = sel => b.page.locator('#shopify-section-test ' + sel).first().evaluate(el => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(','); });
      b.style = (sel, p) => b.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], p);
      eq(await snapshot(b, sels, props), hydrated, 'first paint equals hydrated at ' + width);
      await b.page.close();
    }
    /* Reduced motion: no autoplay, content visible, iframe without autoplay */
    {
      const t = await open(browser, NAME, {reducedMotion: 'reduce', settings: {video_url: CLIP_URL}});
      await t.redraw(); await sleep(600);
      eq((await t.video()).paused, true, 'reduced motion: no autoplay'); eq((await t.spy()).plays, 0, 'reduced motion: play() never called');
      ok(await t.visible('[data-iv-play]'), 'play button offered');
      await t.emit({video_url: 'https://youtu.be/abcDEF12345'}); ok(/autoplay=0&.*controls=1/.test(await t.attr('iframe', 'src')), 'reduced motion iframe: no autoplay, controls');
      eq(t.errors, [], 'no errors'); await t.page.close();
    }
    /* Off screen: autoplay pauses, resumes when back */
    {
      const t = await open(browser, NAME, {width: 1366, height: 700, settings: {video_url: CLIP_URL}});
      await t.redraw(); await sleep(500); ok(!(await t.video()).paused, 'plays on screen');
      await t.page.evaluate(() => { document.body.style.paddingBottom = '3000px'; scrollTo(0, 2500); }); await sleep(400); ok((await t.video()).paused, 'pauses off screen');
      await t.page.evaluate(() => scrollTo(0, 0)); await sleep(400); ok(!(await t.video()).paused, 'resumes on screen');
      await t.page.close();
    }
    console.log(L.total() + ' Video 2 schema, theme inheritance, every control live and redrawn, variants, instances, playback stability, first paint and reduced motion checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
