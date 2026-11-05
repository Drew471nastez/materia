/* Scrolling logo strip (Logos and trust, round 4): shared sweep, header
   blocks and legacy heading, the marquee (never restarted by an unrelated
   edit, paused off screen, still under reduced motion), the copied logos that
   follow live edits, and custom colours and fonts under the theme priority. */
const {run, IMG, IMG2, FONT} = require('./theme-logos-r4-lib.cjs');
const many = n => Array.from({length: n}, (_, i) => ({type: 'logo', settings: {logo: i % 2 ? IMG2 : IMG, alt: 'Shop ' + i, url: '/pages/shop-' + i}}));
run({
  name: 'logo_scroll_strip', heading: '.lg__heading', noRectWithin: '.sls__track',
  blockTypes: ['eyebrow', 'heading', 'subheading', 'button', 'logo'],
  baseBlocks: [{type: 'eyebrow', settings: {}}, {type: 'heading', settings: {text: 'Stocked by'}}, {type: 'subheading', settings: {}}, {type: 'button', settings: {}}, ...many(5)],
  addType: 'logo',
  hover: {hover_scale: '.sls__item', 'button.bg_hover': '.lg__btn', 'button.color_hover': '.lg__btn', 'button.border_color_hover': '.lg__btn'},
  values: {'logo.logo': IMG2},
  addedEdit: {settings: {logo: IMG2, alt: 'Added shop'}, check: async (t, id, {eq}) => { eq(await t.page.locator('[data-lg-block="' + id + '"] img').getAttribute('alt'), 'Added shop'); eq(await t.page.locator('[data-lg-copy="' + id + '"] img').count(), 1); return 0; }},
  motionSettings: {auto_scroll: true},
  skipEveryControl: {empty_note: true, 'logo.name': true},
  async extra({browser, mount, eq, ok}) {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'logo strip ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'logo_scroll_strip', {width, editing, assets: ['live-logos.js'], blocks: [{type: 'heading', settings: {text: 'Stocked <strong>by</strong>'}}, {type: 'subheading', settings: {text: '<p>Find <em>us</em></p>'}}, ...many(5)]});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const first = t.blockId('logo');
      const anim = () => t.page.locator('#shopify-section-test .sls__track').evaluate(el => { const a = el.getAnimations()[0]; if (!a) return null; window.__a = window.__a || a; return {same: window.__a === a, t: a.currentTime, state: a.playState}; });
      const a0 = await anim();
      ok(a0 && a0.state === 'running', where + ' marquee runs');
      const img = await t.page.locator('[data-lg-block="' + first + '"] img').elementHandle();
      await t.emit({logo_height: 60, logo_padding_horizontal: 12, logo_style: 'mono', hover_scale: 1.2, edge_fade_width: 12});
      await t.emit({url: '/pages/other', alt: 'Renamed'}, first);
      await t.page.waitForTimeout(150);
      const a1 = await anim();
      if (editing) ok(a1.same && a1.t > a0.t && a1.state === 'running', where + ' unrelated edits keep the running marquee');
      if (editing) eq(await img.evaluate(el => el.isConnected && el.getAttribute('src').split('?')[0]), IMG.url, where + ' logo picture kept');
      eq(await img.getAttribute('alt'), 'Renamed', where + ' alt live');
      eq(await t.page.locator('[data-lg-copy="' + first + '"] .sls__link').getAttribute('href'), '/pages/other', where + ' copied logo follows the link');
      eq(await t.page.locator('[data-lg-copy="' + first + '"] img').getAttribute('alt'), '', where + ' copied logo stays silent');
      await t.emit({logo: IMG2}, first);
      eq((await t.page.locator('[data-lg-copy="' + first + '"] img').getAttribute('src')).split('?')[0], IMG2.url, where + ' copied logo follows the picture');
      await t.emit({auto_scroll: false});
      eq(await sty('.sls__track', 'animationName'), 'none', where + ' still strip');
      eq(await t.page.locator('#shopify-section-test .sls__group--copy').isVisible(), false, where + ' copies hidden when still');
      await t.emit({auto_scroll: true, direction: 'right'});
      eq(await sty('.sls__track', 'animationDirection'), 'reverse', where + ' direction right');
      await t.emit({enable_custom_style: true, heading_color: '#ff0000', text_color: '#00ff00', logo_background: '#0000ff', logo_border_color: '#ffff00', logo_border_width: 2});
      eq(await sty('.lg__heading', 'color'), 'rgb(255, 0, 0)', where + ' custom heading colour');
      eq(await sty('.lg__sub p', 'color'), 'rgb(0, 255, 0)', where + ' custom text colour reaches the <p>');
      eq(await sty('.sls__item', 'backgroundColor'), 'rgb(0, 0, 255)', where + ' custom logo box');
      eq(await sty('.sls__item', 'borderTopColor'), 'rgb(255, 255, 0)', where + ' custom logo border');
      await t.emit({enable_custom_style: false});
      eq(await sty('.lg__heading', 'color'), 'rgb(255, 255, 255)', where + ' theme heading back');
      eq(await sty('.sls__item', 'backgroundColor'), 'rgba(0, 0, 0, 0)', where + ' theme logo box back');
      for (const mode of ['live', 'redraw']) {
        const apply = async sec => { if (mode === 'live') await t.emit(sec); else await t.redraw({settings: sec}); };
        await apply({enable_custom_fonts: true, heading_font: FONT, body_font: FONT});
        ok(/Courier New/.test(await sty('.lg__heading', 'fontFamily')) && /Courier New/.test(await sty('.lg__heading strong', 'fontFamily')), where + ' ' + mode + ' custom heading font on h2 and <strong>');
        ok(/Courier New/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' custom body font on the <p>');
        eq(await sty('.lg__heading', 'fontWeight'), '300', where + ' ' + mode + ' custom font weight');
        await apply({enable_custom_fonts: false});
        ok(/Georgia/.test(await sty('.lg__heading', 'fontFamily')) && /Arial/.test(await sty('.lg__sub p', 'fontFamily')), where + ' ' + mode + ' theme fonts back');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      const t = await mount(browser, 'logo_scroll_strip', {width: 1366, editing: false, assets: ['live-logos.js'], blocks: many(4)});
      await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
      await t.page.waitForTimeout(250);
      eq(await t.css('.sls__track', 'animationPlayState'), 'paused', 'logo strip pauses off screen');
      await t.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await t.page.waitForTimeout(250);
      eq(await t.css('.sls__track', 'animationPlayState'), 'running', 'logo strip runs again on screen');
      await t.page.close();
    }
    {
      const t = await mount(browser, 'logo_scroll_strip', {width: 1366, assets: ['live-logos.js'], settings: {heading: 'Old heading', text: '<p>Old line</p>'}, blocks: many(2)});
      eq(await t.page.locator('[data-lg-legacy="heading"]').textContent(), 'Old heading', 'logo strip legacy heading');
      eq(await t.page.locator('[data-lg-legacy="subheading"]').textContent(), 'Old line', 'logo strip legacy line');
      await t.redraw({blocks: [{type: 'heading', settings: {text: 'New'}}, ...many(2)]});
      eq(await t.page.locator('[data-lg-legacy="heading"]').count(), 0, 'logo strip legacy heading hidden with a heading block');
      eq(await t.page.locator('[data-lg-legacy="subheading"]').count(), 1, 'logo strip legacy line kept without a subheading block');
      const e = await mount(browser, 'logo_scroll_strip', {width: 375, editing: true, assets: ['live-logos.js'], blocks: []});
      eq(await e.page.locator('[data-lg-empty]').textContent(), 'Add a logo in the sidebar', 'logo strip empty note in the editor');
      await e.emit({empty_note: 'Add stockists'});
      eq(await e.page.locator('[data-lg-empty]').textContent(), 'Add stockists', 'logo strip empty note live');
      const g = await mount(browser, 'logo_scroll_strip', {width: 375, editing: true, assets: ['live-logos.js'], blocks: [{type: 'logo', settings: {}}]});
      eq(await g.page.locator('[data-lg-block] .sls__ph').textContent(), 'Add a logo', 'logo strip placeholder name');
      await g.emit({name: 'Corner shop'}, g.blockId('logo'));
      eq(await g.page.locator('[data-lg-block] .sls__ph').textContent(), 'Corner shop', 'logo strip placeholder name live');
      eq(await g.page.locator('[data-lg-copy] .sls__ph').textContent(), 'Corner shop', 'logo strip copied placeholder name live');
      await g.redraw({blocks: [{type: 'logo', settings: {name: 'Corner shop'}}]});
      eq(await g.page.locator('[data-lg-block] .sls__ph').textContent(), 'Corner shop', 'logo strip placeholder name after redraw');
      await g.page.close();
      const f = await mount(browser, 'logo_scroll_strip', {width: 375, editing: false, assets: ['live-logos.js'], blocks: []});
      eq(await f.page.locator('.sls__viewport').count(), 0, 'logo strip draws no empty strip for visitors');
      for (const x of [t, e, f]) { eq(x.errors, [], 'logo strip errors'); await x.page.close(); }
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
