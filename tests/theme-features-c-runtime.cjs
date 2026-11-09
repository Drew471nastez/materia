/* Features group c, behaviour run by shopify/assets/live-features-c.js:
   Content Tabs carousel (arrows, arrow keys, per copy, set up once after a
   redraw), Benefits Bar 3 arrows and keys, How To Use phone autoplay (stops
   off screen and under reduced motion), Count Up Banner (counts once on the
   page, never replays on an edit, final numbers in the editor and under
   reduced motion), Product Benefits 3 video (paused under reduced motion and
   off screen), and the theme scroll animation switch.

   LIQUIDJS=<path to liquidjs> node tests/theme-features-c-runtime.cjs */
const assert = require('assert/strict');
const {launch, mount, render, schemaOf} = require('./media-fixture.cjs');
const TABS = () => [...schemaOf('content-tabs').schema.presets[0].blocks, ...['Five', 'Six', 'Seven'].map(title => ({type: 'tab', settings: {title}}))];

const ASSET = 'live-features-c.js';
let checks = 0;
const fails = [];
const ok = (c, m) => { try { assert.ok(c, m); checks++; } catch (e) { fails.push(m); } };
const eq = (a, b, m) => { try { assert.deepEqual(a, b, m); checks++; } catch (e) { fails.push(m + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); } };
const wait = (t, ms) => t.page.waitForTimeout(ms);
const scroll = (t, sel, uid = 'test') => t.page.evaluate(({sel, uid}) => Math.round(document.querySelector('#shopify-section-' + uid + ' ' + sel).scrollLeft), {sel, uid});

async function contentTabs(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const tag = `content-tabs @${width} ${editing ? 'editor' : 'store'}`;
    const t = await mount(browser, 'content-tabs', {width, editing, instances: [{uid: 'a', blocks: TABS()}, {uid: 'b', blocks: TABS()}], assets: [ASSET]});
    await wait(t, 150);
    const prev = t.page.locator('#shopify-section-a [data-ctabs-prev]'), next = t.page.locator('#shopify-section-a [data-ctabs-next]');
    eq(await prev.evaluate(e => e.disabled), true, tag + ' previous arrow off at the start');
    eq(await next.evaluate(e => e.disabled), false, tag + ' next arrow on');
    const box = await next.boundingBox();
    ok(box.width >= 44 && box.height >= 44, tag + ' arrow is a 44px target');
    await next.click(); await wait(t, 700);
    const one = await scroll(t, '[data-ctabs-track]', 'a');
    ok(one > 50, tag + ' next arrow scrolls ' + one);
    eq(await scroll(t, '[data-ctabs-track]', 'b'), 0, tag + ' copy b does not move');
    eq(await prev.evaluate(e => e.disabled), false, tag + ' previous arrow on after scrolling');
    /* arrow keys and Home */
    await t.page.locator('#shopify-section-a [data-ctabs-track]').focus();
    await t.page.keyboard.press('ArrowRight'); await wait(t, 700);
    ok(await scroll(t, '[data-ctabs-track]', 'a') > one, tag + ' ArrowRight moves one card');
    await t.page.keyboard.press('Home'); await wait(t, 700);
    eq(await scroll(t, '[data-ctabs-track]', 'a'), 0, tag + ' Home goes back to the first card');
    eq(await t.page.locator('#shopify-section-a [data-ctabs-track]').evaluate(e => [e.getAttribute('role'), e.getAttribute('aria-roledescription'), e.tabIndex]), ['region', 'carousel', 0], tag + ' carousel semantics');
    /* redraw twice: one step per click (set up once) */
    await t.redraw({uid: 'a'}); await t.redraw({uid: 'a'}); await wait(t, 150);
    await t.page.locator('#shopify-section-a [data-ctabs-next]').click(); await wait(t, 700);
    const again = await scroll(t, '[data-ctabs-track]', 'a');
    ok(Math.abs(again - one) <= 2, tag + ' one step per click after redraws ' + again + ' vs ' + one);
    /* show arrows off live */
    await t.emit({show_arrows: false}, undefined, 'a'); await wait(t, 50);
    eq(await t.page.locator('#shopify-section-a .ctabs__nav').evaluate(e => getComputedStyle(e).display), 'none', tag + ' arrows hide live');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
  /* reduced motion: scrolling jumps instead of gliding */
  const t = await mount(browser, 'content-tabs', {width: 1366, editing: false, reducedMotion: 'reduce', assets: [ASSET]});
  eq(await t.page.locator('[data-ctabs-track]').evaluate(e => getComputedStyle(e).scrollBehavior), 'auto', 'content-tabs reduced motion scroll');
  await t.page.locator('[data-ctabs-next]').click(); await wait(t, 30);
  ok(await scroll(t, '[data-ctabs-track]') > 50, 'content-tabs reduced motion arrow jumps at once');
  eq(t.errors, [], 'content-tabs reduced motion errors');
  await t.page.close();
}

async function benefitsBar(browser) {
  const blocks = [{type: 'heading'}, ...Array.from({length: 9}, (_, i) => ({type: 'item', settings: {icon: 'leaf', top_label: 'Top label ' + i, bottom_label: 'Bottom label ' + i}}))];
  for (const editing of [true, false]) {
    const tag = 'ingredients-highlight-bar ' + (editing ? 'editor' : 'store');
    const t = await mount(browser, 'ingredients-highlight-bar', {width: 1366, editing, blocks, assets: [ASSET]});
    await wait(t, 200);
    eq(await t.page.locator('.ihb__arrow--next').evaluate(e => e.hidden), false, tag + ' next arrow shows when the row overflows');
    eq(await t.page.locator('.ihb__arrow--prev').evaluate(e => e.hidden), true, tag + ' previous arrow hidden at the start');
    await t.page.locator('.ihb__arrow--next').click(); await wait(t, 700);
    ok(await scroll(t, '[data-ihb-track]') > 100, tag + ' next arrow scrolls the row');
    await t.page.locator('[data-ihb-track]').focus(); await t.page.keyboard.press('Home'); await wait(t, 700);
    eq(await scroll(t, '[data-ihb-track]'), 0, tag + ' Home goes back');
    await t.page.keyboard.press('ArrowRight'); await wait(t, 700);
    ok(await scroll(t, '[data-ihb-track]') > 50, tag + ' ArrowRight moves the row');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
  /* phones: no arrows; a swipe row that scrolls with the keyboard */
  const t = await mount(browser, 'ingredients-highlight-bar', {width: 375, editing: false, blocks, assets: [ASSET]});
  await wait(t, 200);
  eq(await t.page.locator('.ihb__arrow--next').evaluate(e => getComputedStyle(e).display), 'none', 'ingredients-highlight-bar phone arrows hidden');
  ok(await t.noOverflow(), 'ingredients-highlight-bar phone no page overflow');
  await t.page.close();
}

async function howToUse(browser) {
  const settings = {enable_mobile_carousel: true, carousel_autoplay: true, carousel_autoplay_speed: 2};
  const t = await mount(browser, 'how-to-use', {width: 375, editing: false, settings, assets: [ASSET]});
  await wait(t, 2600);
  ok(await scroll(t, '[data-htu-track]') > 50, 'how-to-use autoplay moves the phone row');
  eq(await t.page.locator('[data-htu-track]').evaluate(e => e.tabIndex), 0, 'how-to-use phone row takes focus');
  /* off screen: the timer stops */
  await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
  await wait(t, 300);
  const off = await scroll(t, '[data-htu-track]');
  await wait(t, 2600);
  eq(await scroll(t, '[data-htu-track]'), off, 'how-to-use autoplay stops off screen');
  eq(t.errors, [], 'how-to-use autoplay errors');
  await t.page.close();
  for (const [label, opts] of [['reduced motion', {reducedMotion: 'reduce'}], ['autoplay off', {settings: {...settings, carousel_autoplay: false}}], ['desktop', {width: 1366}]]) {
    const r = await mount(browser, 'how-to-use', {width: 375, editing: false, settings, assets: [ASSET], ...opts});
    await wait(r, 2600);
    eq(await scroll(r, '[data-htu-track]'), 0, 'how-to-use no autoplay with ' + label);
    eq(r.errors, [], 'how-to-use ' + label + ' errors');
    await r.page.close();
  }
  /* autoplay switched on live starts it, off stops it */
  const l = await mount(browser, 'how-to-use', {width: 375, editing: true, settings: {...settings, carousel_autoplay: false}, assets: [ASSET]});
  await l.emit({carousel_autoplay: true}); await wait(l, 2600);
  const moved = await scroll(l, '[data-htu-track]');
  ok(moved > 50, 'how-to-use autoplay on live');
  await l.emit({carousel_autoplay: false}); await wait(l, 2600);
  eq(await scroll(l, '[data-htu-track]'), moved, 'how-to-use autoplay off live');
  await l.page.close();
}

async function countUp(browser) {
  const nums = t => t.page.evaluate(() => [...document.querySelectorAll('.loudecoms-count-up')].map(e => e.textContent));
  const final = ['5,000', '500', '100'];
  /* the preset has no numbers of its own (no invented stats), so the test gives them */
  let n = 0;
  const NUMS = [5000, 500, 100];
  const blocks = schemaOf('number-stats').schema.presets[0].blocks.map(b => b.type === 'count_box' ? {...b, settings: {...b.settings, number: NUMS[n++]}} : b);
  /* the page: counts up once from 0 */
  const t = await mount(browser, 'number-stats', {blocks, width: 1366, editing: false, assets: [ASSET]});
  await wait(t, 250);
  const mid = await nums(t);
  ok(mid.join() !== final.join(), 'number-stats counts on the page ' + mid);
  await wait(t, 2300);
  eq(await nums(t), final, 'number-stats lands on the final numbers');
  await t.page.close();
  /* the editor and the library preview: final numbers, no count */
  const e = await mount(browser, 'number-stats', {blocks, width: 375, editing: true, assets: [ASSET]});
  eq(await nums(e), final, 'number-stats editor shows final numbers at once');
  await e.emit({number: 1234}, e.blockId('count_box')); await e.emit({enable_dot_spacer: true});
  eq(await nums(e), ['1.234', '500', '100'], 'number-stats edit shows the new final number');
  await wait(e, 400);
  eq(await nums(e), ['1.234', '500', '100'], 'number-stats edit does not replay');
  await e.emit({enable_plus_sign: true});
  ok(await e.page.locator('.loudecoms-plus').first().evaluate(x => getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().width > 0), 'number-stats plus sign live');
  eq(e.errors, [], 'number-stats editor errors');
  await e.page.close();
  /* reduced motion: final at once */
  const r = await mount(browser, 'number-stats', {blocks, width: 1366, editing: false, reducedMotion: 'reduce', assets: [ASSET]});
  await wait(r, 100);
  eq(await nums(r), final, 'number-stats reduced motion shows final numbers');
  await r.page.close();
  /* an edit while counting stops on the final numbers */
  const c = await mount(browser, 'number-stats', {blocks, width: 1366, editing: false, assets: [ASSET]});
  await wait(c, 200);
  await c.emit({count_size: 60}); await wait(c, 100);
  eq(await nums(c), final, 'number-stats a live edit ends the count on the final numbers');
  await wait(c, 500);
  eq(await nums(c), final, 'number-stats no replay after an edit');
  await c.page.close();
}

async function video(browser) {
  for (const [label, reducedMotion, want] of [['motion', 'no-preference', true], ['reduced motion', 'reduce', false]]) {
    const t = await mount(browser, 'product-benefits-3', {width: 1366, editing: false, reducedMotion, settings: {video: 'https://theme.test/clip.mp4'}, assets: [ASSET]});
    const calls = await t.page.evaluate(async () => {
      let n = 0; const p = HTMLMediaElement.prototype.play, q = HTMLMediaElement.prototype.pause, v = document.querySelector('[data-pb3-video]');
      HTMLMediaElement.prototype.play = function () { n++; return Promise.resolve(); };
      Object.defineProperty(v, 'paused', {configurable: true, get: () => true});
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r => setTimeout(r, 50));
      HTMLMediaElement.prototype.play = p;
      return n;
    });
    eq(calls > 0, want, 'product-benefits-3 video plays only with motion allowed (' + label + ')');
    eq(t.errors, [], 'product-benefits-3 video errors ' + label);
    await t.page.close();
  }
}

async function reveal() {
  for (const name of ['how-to-use', 'number-stats', 'product-benefits-2', 'product-benefits-3']) {
    const on = await render(name, {theme: {scroll_animation: 'fade_in'}, settings: {reveal: true}});
    const off = await render(name, {theme: {scroll_animation: 'fade_in'}, settings: {reveal: false}});
    const hooked = r => /scroll-trigger/.test(r.html + r.scripts.join('')) && !/data-ti-no-reveal/.test(r.html);
    eq([hooked(on), hooked(off)], [true, false], name + ' reveal switch follows Theme settings > Animations');
  }
}

(async () => {
  const browser = await launch();
  try {
    await contentTabs(browser);
    await benefitsBar(browser);
    await howToUse(browser);
    await countUp(browser);
    await video(browser);
    await reveal();
    if (fails.length) { console.error(fails.length + ' failures:\n  ' + fails.join('\n  ')); process.exitCode = 1; }
    console.log(checks + ' features-c runtime checks passed' + (fails.length ? ', ' + fails.length + ' failed' : ''));
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await browser.close(); }
})();
