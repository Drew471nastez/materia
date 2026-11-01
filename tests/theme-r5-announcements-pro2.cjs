/* Announcement Bar Pro 2 (announcement-bar; Announcements, round 5): shared
   sweep of every section and block control live and by redraw, the slides
   (arrows, keys, autoplay paused on hover, off screen, in the builder and
   under reduced motion), the marquee, the countdowns (one tick a second, per
   instance, paused off screen, ended text, after a redraw), the close button,
   and custom colours and fonts under the theme priority. */
const {run, IMG, IMG2, FONT} = require('./theme-r5-announcements-lib.cjs');
run({
  name: 'announcement-bar', bgSel: '.ab2', text: '.ab2__msg', noRectWithin: '.ab2__marquee',
  blockTypes: ['announcement'], addType: 'announcement',
  baseSettings: {homepage_only: false},
  baseBlocks: [{type: 'announcement', settings: {text: 'First words', countdown_deadline: '01-01-2001 00:00', ended_text: 'Ended'}}, {type: 'announcement', settings: {text: 'Second words'}}],
  /* the countdown digits are the controller's (the Liquid cannot know the time); first paint is compared without one */
  firstPaintBlocks: [{type: 'announcement', settings: {text: 'First words'}}, {type: 'announcement', settings: {text: 'Second words'}}],
  values: {'announcement.countdown_deadline': '02-02-2002 10:00'},
  async extra({browser, mount, eq, ok}) {
    const sel = '#shopify-section-test ';
    const future = (() => { const d = new Date(Date.now() + 2 * 864e5 + 3 * 3600e3 + 5 * 60e3); const p = n => String(n).padStart(2, '0'); return p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); })();
    const three = [{type: 'announcement', settings: {text: 'One <strong>bold</strong>'}}, {type: 'announcement', settings: {text: 'Two', countdown_deadline: future}}, {type: 'announcement', settings: {text: 'Three'}}];
    const active = t => t.page.locator(sel + '.ab2__slide[data-active] [data-an-text]').textContent();
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'pro 2 ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'announcement-bar', {width, editing, assets: ['live-announcements.js'], settings: {homepage_only: false, change_every: 3}, blocks: three});
      const sty = (q, k) => t.page.locator(sel + q).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      eq(await active(t), 'One bold', where + ' first message shows');
      const next = t.page.locator(sel + '[data-an-next]'), prev = t.page.locator(sel + '[data-an-prev]');
      const nb = await next.boundingBox(); ok(nb.width >= 44 && nb.height >= 44, where + ' arrows are 44px targets');
      await next.click(); await t.page.waitForTimeout(80);
      eq(await active(t), 'Two', where + ' next arrow');
      await prev.click(); await prev.click(); await t.page.waitForTimeout(80);
      eq(await active(t), 'Three', where + ' previous arrow wraps around');
      await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(80);
      eq(await active(t), 'One bold', where + ' arrow keys');
      eq(await t.page.locator(sel + '.ab2__slide[aria-hidden="true"]').count(), 2, where + ' hidden messages are silent');
      /* the countdown ticks, once a second */
      const digits = () => t.page.locator(sel + '.ab2__slide [data-an-timer]:not([data-end=""])').first().evaluate(el => [...el.querySelectorAll('[data-u]')].map(x => x.textContent).join(':'));
      const d0 = await digits();
      ok(/^02:03:0[45]:\d\d$/.test(d0), where + ' countdown shows days, hours, minutes and seconds ' + d0);
      await t.page.waitForTimeout(1100);
      ok(await digits() !== d0, where + ' countdown ticks');
      eq(await t.page.locator(sel + '.ab2__slide [data-l="label_days"]').first().textContent(), 'Days', where + ' countdown label');
      await t.emit({label_days: 'Tage'});
      eq(await t.page.locator(sel + '.ab2__slide [data-l="label_days"]').first().textContent(), 'Tage', where + ' countdown label live');
      await t.emit({countdown_deadline: '01-01-2001 00:00', ended_text: 'Sale ended'}, t.blockId('announcement', 1));
      await t.page.waitForTimeout(80);
      eq(await t.page.locator(sel + '.ab2__slide [data-an-timer]:not([data-end=""]) [data-an-ended]').first().evaluate(el => !el.hidden && el.textContent), 'Sale ended', where + ' ended text replaces the zeros');
      await t.emit({ended_text: ''}, t.blockId('announcement', 1));
      eq(await digits(), '00:00:00:00', where + ' ended without text shows zeros');
      await t.emit({countdown_deadline: 'not a date'}, t.blockId('announcement', 1));
      eq(await t.page.locator(sel + '.ab2__slide [data-an-timer]:not([data-end=""])').first().isHidden(), true, where + ' a date it cannot read draws no countdown');
      /* marquee */
      await t.emit({announcement_actions: 'marquee', icon_between_item: 'star', speed: 9, space_between: 30});
      eq(await t.page.locator(sel + '.ab2__slides').isVisible(), false, where + ' marquee replaces the slides');
      eq(await sty('[data-an-group]', 'animationName'), 'ab2Marquee', where + ' marquee runs');
      eq(await sty('[data-an-group]', 'animationDuration'), '9s', where + ' marquee speed live');
      eq(await sty('[data-an-group]', 'columnGap'), '30px', where + ' marquee spacing live');
      ok(await t.page.locator(sel + '.ab2__icon path').first().getAttribute('d').then(d => d.startsWith('M12 2l3.09')), where + ' star between messages');
      await t.emit({text: 'Edited <em>words</em>'}, t.blockId('announcement'));
      eq(await t.page.locator(sel + '[data-an-copy="' + t.blockId('announcement') + '"] [data-an-text]').first().textContent(), 'Edited words', where + ' marquee copies follow the block');
      await t.emit({announcement_actions: 'slide'});
      /* colours and fonts */
      await t.emit({enable_custom_style: true, text_color: '#ff0000', background_color: '#0000ff', accent_color: '#00ff00', show_separator_line: true, line_color: '#ffff00'});
      eq([await sty('.ab2', 'backgroundColor'), await sty('.ab2__msg', 'color'), await sty('.ab2', 'borderBottomColor')], ['rgb(0, 0, 255)', 'rgb(255, 0, 0)', 'rgb(255, 255, 0)'], where + ' custom colours');
      await t.emit({enable_custom_style: false});
      eq([await sty('.ab2', 'backgroundColor'), await sty('.ab2__msg', 'color')], ['rgb(24, 32, 40)', 'rgb(204, 204, 204)'], where + ' theme colours back');
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, blk) => { if (mode === 'live') { if (sec) await t.emit(sec); if (blk) await t.emit(blk, t.blockId('announcement')); } else { const bl = t.rendered[0].section.blocks.map((b, i) => ({type: b.type, settings: i === 0 && blk ? {...b.settings, ...blk} : b.settings})); await t.redraw({settings: sec || {}, blocks: bl}); } };
        await apply({enable_custom_fonts: true, body_font: FONT, font_weight: 'body_weight'});
        ok(/Courier New/.test(await sty('.ab2__slide[data-active] .ab2__msg', 'fontFamily')) && /Courier New/.test(await sty('.ab2__slide [data-an-text] :is(strong, em)', 'fontFamily')), where + ' ' + mode + ' custom font on the words and their formatting');
        eq(await sty('.ab2__msg', 'fontWeight'), '300', where + ' ' + mode + ' custom font weight');
        await apply({enable_custom_fonts: false});
        ok(/Arial/.test(await sty('.ab2__msg', 'fontFamily')), where + ' ' + mode + ' theme font back');
        await apply(null, {enable_custom_fonts: true, font: {family: 'Verdana', fallback_families: 'sans-serif', weight: 700}, enable_custom_style: true, color: '#ff00ff'});
        ok(/Verdana/.test(await sty('[data-an-block] .ab2__msg', 'fontFamily')), where + ' ' + mode + ' block font');
        eq(await sty('[data-an-block] .ab2__msg', 'fontWeight'), '700', where + ' ' + mode + ' block weight');
        eq(await sty('[data-an-block] .ab2__msg', 'color'), 'rgb(255, 0, 255)', where + ' ' + mode + ' block colour');
        await apply(null, {enable_custom_fonts: false, enable_custom_style: false});
        eq(await sty('[data-an-block] .ab2__msg', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' block colour off');
      }
      await t.emit({show_close: true});
      const close = t.page.locator(sel + '[data-an-close]');
      const cb = await close.boundingBox(); ok(cb.width >= 44 && cb.height >= 44, where + ' close is a 44px target');
      await close.click(); await t.page.waitForTimeout(60);
      eq(await t.page.locator(sel + '.ab2').isVisible(), false, where + ' close hides the bar');
      if (!editing) eq(await t.page.evaluate(() => sessionStorage.getItem('announcement_bar:test')), '1', where + ' closed for this visit');
      else { await t.emit({font_size: 14}); eq(await t.page.locator(sel + '.ab2').isVisible(), true, where + ' builder shows it again on the next edit'); }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      /* storefront autoplay: changes on its own, holds on hover, stops off screen and under reduced motion */
      const t = await mount(browser, 'announcement-bar', {width: 1366, editing: false, assets: ['live-announcements.js'], settings: {homepage_only: false, change_every: 3}, blocks: three});
      await t.page.waitForTimeout(3300);
      eq(await active(t), 'Two', 'pro 2 autoplay moves on');
      const b = await t.root('.ab2__viewport').boundingBox(); await t.page.mouse.move(b.x + 10, b.y + b.height / 2);
      await t.page.waitForTimeout(3300);
      eq(await active(t), 'Two', 'pro 2 autoplay holds on hover');
      await t.page.mouse.move(1, 880);
      await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
      await t.page.waitForTimeout(300);
      eq(await t.page.evaluate(() => { const st = [...window.MateriaAnnouncements.roots.values()][0]; return [!!st.slideTimer, !!st.tickTimer]; }), [false, false], 'pro 2 off screen: no slide timer and no countdown tick');
      await t.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await t.page.waitForTimeout(300);
      eq(await t.page.evaluate(() => { const st = [...window.MateriaAnnouncements.roots.values()][0]; return [!!st.slideTimer, !!st.tickTimer]; }), [true, true], 'pro 2 back on screen: timers again');
      for (let i = 0; i < 3; i++) await t.redraw();
      eq(await t.page.evaluate(() => window.MateriaAnnouncements.roots.size), 1, 'pro 2 redraws keep one controller');
      ok(/^02:0[23]:\d\d:\d\d$/.test(await t.page.locator('#shopify-section-test .ab2__slide [data-an-timer]:not([data-end=""])').first().evaluate(el => [...el.querySelectorAll('[data-u]')].map(x => x.textContent).join(':'))), 'pro 2 countdown right after a redraw');
      eq(t.errors, [], 'pro 2 autoplay errors');
      await t.page.close();
      const r = await mount(browser, 'announcement-bar', {width: 375, editing: false, reducedMotion: 'reduce', assets: ['live-announcements.js'], settings: {homepage_only: false, change_every: 3}, blocks: three});
      await r.page.waitForTimeout(3300);
      eq(await active(r), 'One bold', 'pro 2 reduced motion: no autoplay');
      await r.emit({announcement_actions: 'marquee'});
      eq(await r.css('[data-an-group]', 'animationName'), 'none', 'pro 2 reduced motion: marquee still');
      ok(await r.noOverflow(), 'pro 2 reduced motion: no page overflow');
      await r.page.close();
      /* two instances: countdowns and slides stay their own */
      const two = await mount(browser, 'announcement-bar', {width: 1366, editing: false, assets: ['live-announcements.js'], instances: [{uid: 'a', settings: {homepage_only: false}, blocks: three}, {uid: 'b', settings: {homepage_only: false}, blocks: three}]});
      await two.page.locator('#shopify-section-a [data-an-next]').click(); await two.page.waitForTimeout(80);
      eq(await two.page.locator('#shopify-section-b .ab2__slide[data-active] [data-an-text]').textContent(), 'One bold', 'pro 2 instance b keeps its slide');
      await two.emit({countdown_deadline: '01-01-2001 00:00', ended_text: 'Over'}, 'a-b1', 'a');
      eq(await two.page.locator('#shopify-section-b .ab2__slide [data-an-timer]:not([data-end=""]) [data-an-ended]').first().isHidden(), true, 'pro 2 instance b keeps its countdown');
      await two.page.close();
      /* home page only, on mobile */
      const h = await mount(browser, 'announcement-bar', {width: 375, editing: false, assets: ['live-announcements.js'], settings: {homepage_only: true}, blocks: three, globals: {request: {design_mode: false, page_type: 'index'}}});
      eq(await h.page.locator('#shopify-section-test .ab2').isVisible(), true, 'pro 2 home page only shows on the home page');
      await h.emit({show_mobile: false});
      eq(await h.page.locator('#shopify-section-test .ab2').isVisible(), false, 'pro 2 hidden on mobile');
      await h.page.close();
      const o = await mount(browser, 'announcement-bar', {width: 1366, editing: false, assets: ['live-announcements.js'], settings: {homepage_only: true}, blocks: three, globals: {request: {design_mode: false, page_type: 'product'}}});
      eq(await o.page.locator('#shopify-section-test .ab2').isVisible(), false, 'pro 2 home page only hides on a product page');
      await o.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
