/* Testimonial logos (Logos and trust, round 4): shared sweep, the logo tabs
   (click, keyboard, autoplay paused off screen, never in the editor, instant
   under reduced motion) per instance, live quotes, and the quote font and
   custom fonts under the theme priority. */
const {run, IMG, IMG2, FONT} = require('./theme-logos-r4-lib.cjs');
const three = (img = true) => [0, 1, 2].map(i => ({type: 'testimonial', settings: {logo_image: img ? (i % 2 ? IMG2 : IMG) : null, quote: '<p>Quote <strong>' + i + '</strong></p>', author: 'Source ' + i}}));
run({
  name: 'testimonial-logos', bp: 750, heading: null, text: null,
  blockTypes: ['testimonial'], baseBlocks: three(), addType: 'testimonial',
  addedEdit: {settings: {quote: '<p>Added quote</p>', author: 'Added'}, check: async (t, id, {eq}) => { eq(await t.page.locator('[data-tlg-panel="' + id + '"] .tlg__author').textContent(), 'Added'); return 0; }},
  inherit: async (t, {width, editing, eq, ok}) => {
    const where = 'testimonial-logos ' + width + (editing ? ' editor' : ' storefront');
    ok(/Georgia/.test(await t.css('.tlg__quote-text p', 'fontFamily')), where + ' quote <p> in the theme heading font under priority');
    eq(await t.css('.tlg__quote-text', 'color'), 'rgb(255, 255, 255)', where + ' quote in the scheme heading colour');
    eq(await t.css('.tlg__author', 'color'), 'rgb(204, 204, 204)', where + ' author in the scheme text colour');
    return 0;
  },
  async extra({browser, mount, eq, ok}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'testimonial-logos ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'testimonial-logos', {width, editing, assets: ['live-logos.js'], blocks: three()});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const visible = () => t.page.locator('#shopify-section-test [data-tlg-panel]:not([hidden]) .tlg__author').textContent();
      await t.page.locator('#shopify-section-test .tlg__logo').nth(1).click(); await t.page.waitForTimeout(700);
      eq(await visible(), 'Source 1', where + ' a logo shows its quote');
      eq(await t.page.locator('#shopify-section-test .tlg__logo').nth(1).getAttribute('aria-selected'), 'true', where + ' selected tab');
      await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(700);
      eq(await visible(), 'Source 2', where + ' arrow key moves to the next quote');
      await t.page.keyboard.press('Home'); await t.page.waitForTimeout(700);
      eq(await visible(), 'Source 0', where + ' Home goes to the first quote');
      const box = await t.page.locator('#shopify-section-test .tlg__logo').first().boundingBox();
      ok(box.width >= 44 && box.height >= 44, where + ' logo tab target 44px');
      /* live quote, author and logo; a picture never reloads for unrelated edits */
      const id0 = t.blockId('testimonial'), img = await t.page.locator('[data-lg-block="' + id0 + '"] img').elementHandle();
      await t.emit({quote: '<p>Edited <em>quote</em></p>', author: ''}, id0);
      eq(await t.page.locator('[data-tlg-panel="' + id0 + '"] .tlg__quote-text').textContent(), 'Edited quote', where + ' quote live');
      eq(await t.page.locator('[data-tlg-panel="' + id0 + '"] .tlg__author').isVisible(), false, where + ' empty author hidden');
      await t.emit({logo_height: 40, inactive_opacity: 50, quote_size_d: 30});
      if (editing) eq(await img.evaluate(el => el.isConnected), true, where + ' logo kept for unrelated edits');
      /* quote font and custom fonts win under the theme priority, live and after a redraw */
      for (const mode of ['live', 'redraw']) {
        const apply = async sec => { if (mode === 'live') await t.emit(sec); else await t.redraw({settings: sec}); };
        await apply({quote_font: 'theme-body'});
        ok(/Arial/.test(await sty('.tlg__quote-text p', 'fontFamily')), where + ' ' + mode + ' quote in the body font');
        await apply({quote_font: 'theme-heading', enable_custom_fonts: true, heading_font: FONT, body_font: {family: 'Verdana', fallback_families: 'sans-serif', weight: 400}});
        ok(/Courier New/.test(await sty('.tlg__quote-text p', 'fontFamily')) && /Courier New/.test(await sty('.tlg__quote-text p strong, .tlg__quote-text p em', 'fontFamily')), where + ' ' + mode + ' custom quote font on the <p> and inline text');
        eq(await sty('.tlg__quote-text p', 'fontWeight'), '300', where + ' ' + mode + ' custom quote weight');
        ok(/Verdana/.test(await sty('.tlg__author', 'fontFamily')), where + ' ' + mode + ' custom body font on the author');
        await apply({enable_custom_fonts: false});
        ok(/Georgia/.test(await sty('.tlg__quote-text p', 'fontFamily')) && /Arial/.test(await sty('.tlg__author', 'fontFamily')), where + ' ' + mode + ' theme fonts back');
      }
      await t.emit({quote_color_custom: true, quote_color: '#ff0000', author_color: '#00ff00', mark_color: '#0000ff'});
      eq(await sty('.tlg__quote-text p', 'color'), 'rgb(255, 0, 0)', where + ' custom quote colour on the <p>');
      eq(await sty('.tlg__author', 'color'), 'rgb(0, 255, 0)', where + ' custom author colour');
      eq(await t.page.locator('#shopify-section-test .tlg__quotewrap').evaluate(el => getComputedStyle(el, '::before').color), 'rgb(0, 0, 255)', where + ' custom quote mark colour');
      await t.emit({quote_color_custom: false});
      eq(await sty('.tlg__quote-text p', 'color'), 'rgb(255, 255, 255)', where + ' theme quote colour back');
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    /* autoplay: storefront only, per instance, off screen paused, one timer after redraws */
    {
      const t = await mount(browser, 'testimonial-logos', {width: 1366, editing: false, assets: ['live-logos.js'], instances: [{uid: 'a', settings: {autoplay: true, autoplay_interval: 3, transition_speed: 150}, blocks: three()}, {uid: 'b', settings: {autoplay: false}, blocks: three()}]});
      await t.page.waitForTimeout(3500);
      eq(await t.page.locator('#shopify-section-a [data-tlg-panel]:not([hidden]) .tlg__author').textContent(), 'Source 1', 'testimonial-logos autoplay moves on');
      eq(await t.page.locator('#shopify-section-b [data-tlg-panel]:not([hidden]) .tlg__author').textContent(), 'Source 0', 'testimonial-logos other instance stays');
      for (let i = 0; i < 3; i++) await t.redraw({uid: 'a', settings: {autoplay: true, autoplay_interval: 3}});
      eq(await t.page.evaluate(() => [...window.MateriaLogos.roots.values()].filter(s => s.timer).length), 1, 'testimonial-logos one timer after redraws');
      await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '4000px'; document.body.prepend(s); });
      await t.page.waitForTimeout(300);
      eq(await t.page.evaluate(() => [...window.MateriaLogos.roots.values()].filter(s => s.timer).length), 0, 'testimonial-logos autoplay stops off screen');
      eq(t.errors, [], 'testimonial-logos autoplay errors');
      await t.page.close();
      const e = await mount(browser, 'testimonial-logos', {width: 1366, editing: true, assets: ['live-logos.js'], settings: {autoplay: true, autoplay_interval: 3}, blocks: three()});
      await e.page.waitForTimeout(3400);
      eq(await e.page.locator('[data-tlg-panel]:not([hidden]) .tlg__author').textContent(), 'Source 0', 'testimonial-logos no autoplay in the editor');
      await e.page.close();
      const r = await mount(browser, 'testimonial-logos', {width: 1366, editing: false, reducedMotion: 'reduce', assets: ['live-logos.js'], settings: {autoplay: true, autoplay_interval: 3}, blocks: three()});
      await r.page.locator('.tlg__logo').nth(2).click();
      eq(await r.page.locator('[data-tlg-panel]:not([hidden]) .tlg__author').textContent(), 'Source 2', 'testimonial-logos reduced motion swaps at once');
      await r.page.waitForTimeout(3400);
      eq(await r.page.locator('[data-tlg-panel]:not([hidden]) .tlg__author').textContent(), 'Source 2', 'testimonial-logos no autoplay under reduced motion');
      await r.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
