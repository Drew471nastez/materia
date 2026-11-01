/* Collections sections (round 4): the runtimes in live-collections.js.
   Scrolling Collection marquee (seamless loop, pause on hover, off screen and
   with its button, drag, no restart on unrelated edits, reduced motion),
   Collection Lookbook carousel (arrows, dots, keyboard, autoplay that stops on
   hover, off screen and under reduced motion, tablet cards per view),
   Collection List picture that follows the pointer and keyboard, Collection
   Hero Pro videos under reduced motion and off screen, Collections Display
   carousel autoplay, the legacy section text paths and the theme reveal hook.

   LIQUIDJS=<path to liquidjs> node tests/theme-collections-r4-runtime.cjs */
const assert = require('assert/strict');
const {launch, mount, schemaOf} = require('./media-fixture.cjs');
const ASSET = 'live-collections.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: ''};
const IMG2 = {url: 'https://theme.test/other.png', src: 'https://theme.test/other.png', width: 800, height: 600, alt: ''};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const preset = n => clone(schemaOf(n).schema.presets[0].blocks || []);
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const spacer = page => page.evaluate(() => { const d = document.createElement('div'); d.id = 'spacer'; d.style.height = '4000px'; document.body.prepend(d); });

async function marquee(browser) {
  const name = 'scrolling-collection';
  const chips = n => Array.from({length: n}, (_, i) => ({type: 'collection', settings: {label_first: 'Chip ' + i, link: '/collections/c' + i, image: IMG}}));
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const t = await mount(browser, name, {width, editing: false, blocks: chips(3), settings: {rows: 2, alternate_direction: true}, assets: [ASSET]});
    await t.page.waitForTimeout(200);
    const st = await t.page.evaluate(() => [...document.querySelectorAll('[data-scol-track]')].map(tr => {
      const sets = tr.querySelectorAll(':scope > .scol__set'), chip = sets[0].querySelector('.scol__chip'), next = sets[1].querySelector('.scol__chip');
      const a = tr.getAnimations()[0];
      return {sets: sets.length, period: next.getBoundingClientRect().left - chip.getBoundingClientRect().left, total: tr.scrollWidth, row: tr.parentElement.clientWidth, shift: tr.style.getPropertyValue('--scol-shift') || '-50%', running: !!a && a.playState === 'running', name: a && a.animationName, hidden: [...sets].slice(1).every(s => s.getAttribute('aria-hidden') === 'true')};
    }));
    for (const r of st) {
      ok(r.running, tag + ' row moves');
      ok(r.sets * r.period >= r.row + r.period - 2, tag + ' enough copies for a seamless loop (' + r.sets + ' sets)');
      ok(r.shift === '-50%' ? r.sets === 2 : Math.abs(parseFloat(r.shift) + r.period) < 1.5, tag + ' the loop moves by exactly one set (' + r.shift + ' vs ' + r.period + ')');
      ok(r.hidden, tag + ' copies are hidden from assistive tech');
    }
    ok(st[0].name !== st[1].name, tag + ' alternate rows move the other way');
    /* unrelated edit: the same animation keeps running */
    const a0 = await t.page.evaluate(() => { const a = document.querySelector('[data-scol-track]').getAnimations()[0]; window.__a = a; return a.currentTime; });
    await t.emit({chip_radius: 3, chip_gap: 20, enable_custom_style: true, chip_bg: '#334455'});
    await t.page.waitForTimeout(120);
    ok(await t.page.evaluate(t0 => { const a = document.querySelector('[data-scol-track]').getAnimations()[0]; return a === window.__a && a.currentTime > t0 && a.playState === 'running'; }, a0), tag + ' unrelated edits do not restart the loop');
    /* pause button */
    const btn = t.root('[data-scol-toggle]');
    ok((await btn.boundingBox()).height >= 44, tag + ' pause button target');
    await btn.click(); await frames(t.page);
    eq(await btn.getAttribute('aria-pressed'), 'true', tag + ' pause button pressed');
    eq(await t.css('[data-scol-track]', 'animationPlayState'), 'paused', tag + ' paused by the button');
    await btn.click(); await frames(t.page);
    eq(await t.css('[data-scol-track]', 'animationPlayState'), 'running', tag + ' plays again');
    /* hover pauses (pause on hover on), not when it is off */
    await t.root('[data-scol-row]').first().hover(); await frames(t.page);
    eq(await t.css('[data-scol-track]', 'animationPlayState'), 'paused', tag + ' hover pauses');
    await t.emit({pause_on_hover: false}); await frames(t.page);
    eq(await t.css('[data-scol-track]', 'animationPlayState'), 'running', tag + ' hover pause off');
    await t.page.mouse.move(0, 0);
    /* drag moves the row, then the loop carries on */
    const box = await t.root('[data-scol-row]').first().boundingBox();
    await t.page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2); await t.page.mouse.down();
    await t.page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {steps: 6});
    const dragX = await t.page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-scol-track]')).transform).m41);
    await t.page.mouse.up(); await t.page.mouse.move(0, 0); await t.page.waitForTimeout(80);
    ok(dragX < -10, tag + ' drag moves the chips (' + Math.round(dragX) + ')');
    eq(await t.css('[data-scol-track]', 'animationPlayState'), 'running', tag + ' loop resumes after a drag');
    /* off screen */
    await spacer(t.page); await t.page.waitForTimeout(250);
    ok(await t.page.evaluate(() => document.querySelector('[data-cl-root]').classList.contains('is-offscreen')), tag + ' off screen marked');
    eq(await t.css('[data-scol-track]', 'animationPlayState'), 'paused', tag + ' off screen pauses');
    await t.page.evaluate(() => document.querySelector('[data-cl-root]').scrollIntoView()); await t.page.waitForTimeout(250);
    eq(await t.css('[data-scol-track]', 'animationPlayState'), 'running', tag + ' back on screen plays');
    /* redraws: one controller, one listener */
    for (let i = 0; i < 3; i++) await t.redraw();
    eq(await t.page.evaluate(() => window.MateriaCollections.roots.size), 1, tag + ' one controller after redraws');
    await t.root('[data-scol-toggle]').click(); await frames(t.page);
    eq(await t.root('[data-scol-toggle]').getAttribute('aria-pressed'), 'true', tag + ' one click handler after redraws');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
    /* reduced motion */
    const r = await mount(browser, name, {width, editing: false, blocks: chips(3), assets: [ASSET], reducedMotion: 'reduce'});
    const rm = await r.page.evaluate(() => ({running: document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length, scroll: getComputedStyle(document.querySelector('[data-scol-row]')).overflowX, copies: [...document.querySelectorAll('.scol__set[data-cl-copy]')].every(s => getComputedStyle(s).display === 'none'), visible: document.querySelector('.scol__chip').getBoundingClientRect().width > 0}));
    eq(rm.running, 0, tag + ' reduced motion: no loop');
    eq(rm.scroll, 'auto', tag + ' reduced motion: rows scroll by hand');
    ok(rm.copies && rm.visible, tag + ' reduced motion: one set of chips shown');
    eq(r.errors, [], tag + ' reduced motion errors');
    await r.page.close();
  }
}

async function lookbook(browser) {
  const name = 'collection-lookbook';
  const cards = n => Array.from({length: n}, (_, i) => ({type: 'card', settings: {title: 'Card ' + i, link: '/collections/c' + i, image: IMG}}));
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const t = await mount(browser, name, {width, editing: false, blocks: [{type: 'heading'}, ...cards(8)], assets: [ASSET]});
    const sl = () => t.page.evaluate(() => document.querySelector('[data-lcb-track]').scrollLeft);
    const step = await t.page.evaluate(() => { const s = document.querySelectorAll('.lcb__slide'); return s[1].offsetLeft - s[0].offsetLeft; });
    eq(await t.root('[data-lcb-prev]').getAttribute('aria-disabled'), 'true', tag + ' prev disabled at the start');
    await t.root('[data-lcb-next]').click(); await t.page.waitForTimeout(700);
    ok(Math.abs(await sl() - step) < 3, tag + ' next moves one card');
    eq(await t.root('[data-lcb-prev]').getAttribute('aria-disabled'), 'false', tag + ' prev enabled');
    eq(await t.page.evaluate(() => document.querySelector('[data-lcb-dot][aria-current="true"]').dataset.lcbDot), '1', tag + ' dot follows');
    await t.root('[data-lcb-dot="3"]').click(); await t.page.waitForTimeout(700);
    ok(Math.abs(await sl() - Math.min(3 * step, await t.page.evaluate(() => { const tr = document.querySelector('[data-lcb-track]'); return tr.scrollWidth - tr.clientWidth; }))) < 3, tag + ' a dot moves to its card');
    await t.root('[data-lcb-track]').focus(); await t.page.keyboard.press('ArrowLeft'); await t.page.waitForTimeout(700);
    ok(await sl() < 3 * step - 3, tag + ' arrow key moves back');
    for (const s of ['[data-lcb-prev]', '[data-lcb-next]']) ok((await t.root(s).boundingBox()).height >= 44, tag + ' arrow target');
    ok((await t.root('[data-lcb-dot]').first().boundingBox()).height >= 44, tag + ' dot target');
    /* mouse drag */
    await t.page.evaluate(() => { document.querySelector('[data-lcb-track]').scrollLeft = 0; }); await t.page.waitForTimeout(300);
    const box = await t.root('[data-lcb-track]').boundingBox();
    await t.page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2); await t.page.mouse.down();
    await t.page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {steps: 8}); await t.page.mouse.up(); await t.page.waitForTimeout(700);
    ok(await sl() > 0, tag + ' mouse drag scrolls');
    /* redraws: one controller, one click moves one card */
    for (let i = 0; i < 3; i++) await t.redraw();
    eq(await t.page.evaluate(() => window.MateriaCollections.roots.size), 1, tag + ' one controller after redraws');
    await t.page.evaluate(() => { document.querySelector('[data-lcb-track]').scrollLeft = 0; }); await t.page.waitForTimeout(200);
    await t.root('[data-lcb-next]').click(); await t.page.waitForTimeout(700);
    ok(Math.abs(await sl() - step) < 3, tag + ' one click handler after redraws');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
    /* autoplay */
    const a = await mount(browser, name, {width, editing: false, blocks: cards(8), settings: {autoplay: true, autoplay_speed: 2, pause_on_hover: true}, assets: [ASSET]});
    eq(await a.root().locator('[data-cl-root]').getAttribute('data-cl-running'), 'true', tag + ' autoplay runs');
    await a.page.waitForTimeout(2600);
    ok(await a.page.evaluate(() => document.querySelector('[data-lcb-track]').scrollLeft) > 0, tag + ' autoplay moves');
    await a.root('[data-lcb-track]').hover(); await frames(a.page);
    eq(await a.root().locator('[data-cl-root]').getAttribute('data-cl-running'), 'false', tag + ' hover pauses autoplay');
    await a.page.mouse.move(0, 0); await a.page.evaluate(() => document.activeElement && document.activeElement.blur()); await frames(a.page);
    await spacer(a.page); await a.page.waitForTimeout(250);
    eq(await a.root().locator('[data-cl-root]').getAttribute('data-cl-running'), 'false', tag + ' off screen pauses autoplay');
    eq(a.errors, [], tag + ' autoplay errors');
    await a.page.close();
    const r = await mount(browser, name, {width, editing: false, blocks: cards(8), settings: {autoplay: true, autoplay_speed: 2}, assets: [ASSET], reducedMotion: 'reduce'});
    eq(await r.root().locator('[data-cl-root]').getAttribute('data-cl-running'), 'false', tag + ' reduced motion: no autoplay');
    await r.page.close();
  }
  /* tablet: cards per view (tablet) */
  const w = [];
  for (const per of [3, 5]) {
    const t = await mount(browser, name, {width: 900, editing: false, blocks: cards(8), settings: {per_view_tablet: per}, assets: [ASSET]});
    w.push(await t.page.evaluate(() => document.querySelector('.lcb__slide').getBoundingClientRect().width));
    await t.emit({per_view_tablet: per === 3 ? 5 : 3}); await frames(t.page);
    w.push(await t.page.evaluate(() => document.querySelector('.lcb__slide').getBoundingClientRect().width));
    await t.page.close();
  }
  ok(w[0] > w[2] * 1.4 && Math.abs(w[1] - w[2]) < 1 && Math.abs(w[3] - w[0]) < 1, 'lookbook @900: cards per view (tablet) live and after redraw ' + w.map(Math.round));
}

async function preview(browser) {
  const name = 'collectionnlist';
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: false, blocks: [{type: 'item', settings: {title: 'One', image: IMG}}, {type: 'item', settings: {title: 'Two', image: IMG2}}], assets: [ASSET]});
    const active = () => t.page.evaluate(() => (document.querySelector('.cnl__media .is-active').getAttribute('src') || '').split('?')[0]);
    ok(/pic\.png$/.test(await active()), name + ' @' + width + ' first picture shown');
    await t.root('.cnl__link').nth(1).hover(); await frames(t.page);
    ok(/other\.png$/.test(await active()), name + ' @' + width + ' pointer shows the second picture');
    eq(await t.root('.cnl__link').nth(1).getAttribute('aria-current'), 'true', name + ' @' + width + ' second link current');
    await t.root('.cnl__link').nth(0).focus(); await frames(t.page);
    ok(/pic\.png$/.test(await active()), name + ' @' + width + ' keyboard focus shows the first picture');
    ok((await t.root('.cnl__link').first().boundingBox()).height >= 44, name + ' @' + width + ' link target');
    for (let i = 0; i < 2; i++) await t.redraw();
    eq(await t.page.evaluate(() => window.MateriaCollections.roots.size), 1, name + ' one controller after redraws');
    eq(t.errors, [], name + ' errors');
    await t.page.close();
  }
}

async function video(browser) {
  const name = 'collection-list2';
  const blocks = [{type: 'media_left', settings: {video_url: 'https://theme.test/clip.mp4'}}, {type: 'heading'}, {type: 'media_right', settings: {image: IMG}}];
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const t = await mount(browser, name, {width: 1366, editing: false, blocks, assets: [ASSET], reducedMotion});
    const v = await t.page.evaluate(() => { const v = document.querySelector('video'); return {auto: v.hasAttribute('autoplay'), controls: v.controls}; });
    if (reducedMotion === 'reduce') ok(!v.auto && v.controls, name + ' reduced motion: video does not autoplay and shows controls');
    else ok(v.auto, name + ' video autoplays');
    await t.page.evaluate(() => { document.querySelector('video').__mark = 1; });
    await t.emit({col_gap_desktop: 20, content_radius: 3});
    ok(await t.page.evaluate(() => document.querySelector('video').__mark === 1), name + ' video kept on unrelated edits');
    eq(t.errors, [], name + ' video errors');
    await t.page.close();
  }
}

async function displayCarousel(browser) {
  /* The theme's carousel is built by global.js; a stand-in exposes the same globalSlide.autoplay API. */
  const name = 'collection-list';
  const t = await mount(browser, name, {width: 1366, editing: false, settings: {display_mode: 'carousel', autoplay: true}, blocks: preset(name), assets: [], inlineScripts: false});
  await t.page.evaluate(() => { const el = document.querySelector('[data-cl-slider]'); el.globalSlide = {destroyed: false, params: {speed: 500}, autoplay: {running: false, start() { this.running = true; }, stop() { this.running = false; }}}; });
  await t.page.addScriptTag({path: require('path').join(__dirname, '../shopify/assets', ASSET)}); await t.page.waitForTimeout(400);
  eq(await t.page.evaluate(() => document.querySelector('[data-cl-slider]').globalSlide.autoplay.running), true, 'collections display: autoplay runs on screen');
  await spacer(t.page); await t.page.waitForTimeout(300);
  eq(await t.page.evaluate(() => document.querySelector('[data-cl-slider]').globalSlide.autoplay.running), false, 'collections display: autoplay stops off screen');
  await t.page.close();
  const r = await mount(browser, name, {width: 1366, editing: false, settings: {display_mode: 'carousel', autoplay: true}, blocks: preset(name), assets: [], reducedMotion: 'reduce'});
  await r.page.evaluate(() => { const el = document.querySelector('[data-cl-slider]'); el.globalSlide = {destroyed: false, params: {speed: 500}, autoplay: {running: true, start() { this.running = true; }, stop() { this.running = false; }}}; });
  await r.page.addScriptTag({path: require('path').join(__dirname, '../shopify/assets', ASSET)}); await r.page.waitForTimeout(400);
  eq(await r.page.evaluate(() => [document.querySelector('[data-cl-slider]').globalSlide.autoplay.running, document.querySelector('[data-cl-slider]').globalSlide.params.speed]), [false, 0], 'collections display: reduced motion stops autoplay and slides without easing');
  await r.page.close();
}

/* Legacy section text: shown only when the section has no block of that type, live-editable. */
async function legacy(browser) {
  for (const [name, settings, blocks, sel, edit] of [
    ['scrolling-collection', {heading: 'Old heading', subheading: 'Old line', heading_weight: '400'}, preset('scrolling-collection').filter(b => b.type === 'collection'), '.scol__heading--legacy', {heading: 'Edited old heading'}],
    ['collection-lookbook', {heading: 'Old heading', subheading: 'Old line'}, preset('collection-lookbook').filter(b => b.type === 'card'), '.lcb__heading--legacy', {heading: 'Edited old heading'}],
    ['collection-list', {heading: 'Old heading', description: '<p>Old line</p>', show_view_all_button: true, view_all_label: 'All of them', view_all_url: '/collections/all'}, preset('collection-list').filter(b => b.type === 'collection'), '[data-cl-legacy="heading"]', {heading: 'Edited old heading'}],
  ]) {
    for (const width of [375, 1366]) {
      const t = await mount(browser, name, {width, editing: true, settings, blocks, assets: [ASSET, ...(name === 'collection-list' ? ['section-collection.css'] : [])]});
      eq((await t.root(sel).textContent()).trim(), settings.heading, name + ' @' + width + ' legacy heading drawn');
      await t.emit(edit); await frames(t.page);
      eq((await t.root(sel).textContent()).trim(), edit.heading, name + ' @' + width + ' legacy heading live');
      if (name === 'scrolling-collection') eq(await t.css(sel, 'fontWeight'), '400', name + ' legacy heading weight wins');
      if (name === 'collection-list') {
        const a = t.root('[data-cl-legacy="view"]');
        eq([await a.isVisible(), (await a.textContent()).trim(), await a.getAttribute('href')], [true, 'All of them', '/collections/all'], name + ' @' + width + ' legacy View all');
        await t.emit({view_all_label: 'Every collection', view_all_position: 'bottom'}); await frames(t.page);
        eq([await a.isVisible(), (await t.root('.cdl__bottom').textContent()).trim()], [false, 'Every collection'], name + ' @' + width + ' legacy View all moves below live');
      }
      /* a heading block replaces the legacy heading */
      await t.redraw({blocks: [{type: 'heading', settings: {text: 'Block heading'}}, ...blocks]});
      eq(await t.root(sel).count(), 0, name + ' @' + width + ' legacy heading gone with a heading block');
      eq(t.errors, [], name + ' legacy errors');
      await t.page.close();
    }
  }
}

/* Reveal on scroll reaches the theme reveal; off, the section is marked for the layout. */
async function reveal(browser) {
  for (const name of ['collectionnlist', 'collection-banner']) for (const on of [true, false]) {
    const t = await mount(browser, name, {width: 1366, editing: false, settings: {reveal: on}, theme: {scroll_animation: 'fade_up'}, assets: [ASSET]});
    const r = await t.page.evaluate(() => ({cls: document.querySelector('.shopify-section').classList.contains('scroll-trigger'), mark: !!document.querySelector('[data-ti-no-reveal]')}));
    eq(r, {cls: on, mark: !on}, name + ' reveal ' + on);
    await t.page.close();
  }
}

(async () => {
  const browser = await launch();
  try {
    await marquee(browser);
    await lookbook(browser);
    await preview(browser);
    await video(browser);
    await displayCarousel(browser);
    await legacy(browser);
    await reveal(browser);
    console.log(checks + ' collections runtime checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
