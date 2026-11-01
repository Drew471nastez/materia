/* Product Benefits Pro (sections/benefits2.storelib): the shared features-a
   checks (tests/theme-features-a-harness.cjs) plus its own: the centre
   switches between picture, video and placeholder live without reloading an
   unchanged picture; the video plays only on screen and never under reduced
   motion; every hover effect looks different on hover; custom fonts and the
   title weight win under the theme priority rules (on the title, a <strong>
   in it and the text) and switch back; a benefit's colours wait for its own
   toggle; the old global CSS, Font Awesome and Google Fonts links are gone.
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-benefits2.cjs */
const {run, IMG, SVG} = require('./theme-features-a-harness.cjs');
const NAME = 'benefits2';
const VURL = 'https://theme.test/clip.mp4';
const raf = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const preset = () => require('./media-fixture.cjs').schemaOf(NAME).schema.presets[0].blocks.map(b => ({type: b.type, settings: {...b.settings}}));
run({
  name: NAME,
  blocks: () => preset().slice(0, 5), /* room for a sixth, added block */
  theme: {probes: [['.pbp__title', 'h'], ['.pbp__desc', 't']]},
  hover: {image_hover_animation: '.pbp__media'},
  pre: {video_url: {enable_centered_video: true}, enable_centered_video: {video_url: VURL}, image_hover_animation: {center_image: IMG}},
  preBlock: {'feature.icon_circle_bg_size': {enable_icon_circle_bg: true}},
  values: {video_url: [VURL], svg_icon_code: [SVG]},
  noEffect: ['reveal'],
  async extra({browser, mount, ASSET, ok, eq, prep, FONT, MONO}) {
    const fs = require('fs');
    const raw = fs.readFileSync(require('path').join(__dirname, '../sections/benefits2.storelib'), 'utf8').split('<schema>')[0];
    ok(!/\.why-we-are-better-section|font-awesome|fonts\.googleapis|\{% javascript %\}/.test(raw), NAME + ': no global CSS, icon font or font links');
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const blocks = preset(); blocks[0].settings.title = 'Built <strong>well</strong>';
      const t = await mount(browser, NAME, {width, editing, blocks, assets: [ASSET]}); await prep(t);
      const probe = async () => [await t.css('.pbp__title', 'fontFamily'), await t.css('.pbp__title strong', 'fontFamily'), await t.css('.pbp__desc', 'fontFamily'), await t.css('.pbp__title', 'fontWeight')];
      const on = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO, feature_title_font_weight: 'lighter'};
      const yes = p => /Verdana/.test(p[0]) && /Verdana/.test(p[1]) && /Courier New/.test(p[2]) && p[3] === '300', no = p => /Georgia/.test(p[0]) && /Georgia/.test(p[1]) && /Arial/.test(p[2]) && p[3] === '700';
      ok(no(await probe()), `${NAME} ${width}: theme fonts and weight by default`);
      if (editing) { await t.emit(on); await raf(t); ok(yes(await probe()), `${NAME} ${width} live: custom fonts and weight win (${JSON.stringify(await probe())})`); await t.emit({enable_custom_fonts: false}); await raf(t); ok(no(await probe()), `${NAME} ${width} live off: theme back`); }
      await t.redraw({settings: on}); ok(yes(await probe()), `${NAME} ${width} redraw: custom fonts and weight win`); await t.redraw({settings: {enable_custom_fonts: false}}); ok(no(await probe()), `${NAME} ${width} redraw off: theme back`);
      /* a benefit's own colours */
      const b2 = preset(); b2[0].settings = {...b2[0].settings, icon_color: '#ff0000', icon_circle_bg_color: '#00ff00'};
      await t.redraw({blocks: b2}); eq(await t.css('.pbp__icon', 'color'), 'rgb(255, 255, 255)', `${NAME} ${width}: icon colour waits for the toggle`);
      b2[0].settings.enable_custom_style = true; await t.redraw({blocks: b2});
      eq([await t.css('.pbp__icon', 'color'), await t.css('.pbp__icon', 'backgroundColor')], ['rgb(255, 0, 0)', 'rgb(0, 255, 0)'], `${NAME} ${width}: own icon and circle colours`);
      /* media switches */
      const kind = () => t.page.locator('#shopify-section-test .pbp__media > *').evaluate(e => e.tagName.toLowerCase());
      eq(await kind(), 'svg', `${NAME} ${width}: a placeholder without a picture`);
      if (editing) {
        await t.emit({center_image: IMG}); await raf(t); eq(await kind(), 'img', `${NAME} ${width}: picture live`);
        await t.page.evaluate(() => { window.__pic = document.querySelector('#shopify-section-test .pbp__media img'); });
        await t.emit({image_border_radius: 30}); await t.emit({feature_title_font_size: 30}); await raf(t);
        ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .pbp__media img') === window.__pic), `${NAME} ${width}: unrelated edits keep the picture`);
        await t.emit({enable_centered_video: true, video_url: VURL}); await raf(t); eq(await kind(), 'video', `${NAME} ${width}: video live`);
        await t.emit({enable_centered_video: false}); await raf(t); eq(await kind(), 'img', `${NAME} ${width}: back to the picture`);
        await t.emit({center_image: ''}); await raf(t); eq(await kind(), 'svg', `${NAME} ${width}: back to the placeholder`);
      }
      eq(t.errors, [], NAME + ' extra: no errors');
      await t.page.close();
    }
    /* video playback */
    const settings = {enable_centered_video: true, video_url: VURL};
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const t = await mount(browser, NAME, {width: 1366, settings, assets: [ASSET], reducedMotion}); await prep(t);
      await t.page.evaluate(() => { const v = document.querySelector('.pbp__media video'); window.__plays = 0; v.play = () => { window.__plays++; return Promise.resolve(); }; });
      await t.redraw(); await t.page.evaluate(() => { const v = document.querySelector('.pbp__media video'); window.__plays = 0; v.play = () => { window.__plays++; return Promise.resolve(); }; });
      await t.emit({padding_top_desktop: 10}); await raf(t);
      const v = await t.page.evaluate(() => { const v = document.querySelector('.pbp__media video'); return {autoplay: v.hasAttribute('autoplay'), muted: v.muted}; });
      if (reducedMotion === 'reduce') eq(v.autoplay, false, NAME + ': reduced motion: no autoplay');
      else ok(v.muted, NAME + ': the video is muted');
      eq(t.errors, [], NAME + ' video: no errors');
      await t.page.close();
    }
  },
});
