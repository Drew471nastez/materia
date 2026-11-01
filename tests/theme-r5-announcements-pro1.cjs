/* Announcement Bar Pro 1 (annoucment-bar-scrolling; Announcements, round 5):
   shared sweep of every section and block control live and by redraw, the
   scrolling messages (copies follow their block, never restarted by an
   unrelated edit, paused off screen and on hover, still under reduced
   motion), inline separators, the link around the bar, the legacy messages,
   and custom colours and fonts under the theme priority. */
const {run, IMG, IMG2, FONT} = require('./theme-r5-announcements-lib.cjs');
run({
  name: 'annoucment-bar-scrolling', bgSel: '[data-an-root]', text: '.announcement-message', noRectWithin: '[data-an-root]',
  blockTypes: ['message'], addType: 'message',
  baseBlocks: [{type: 'message', settings: {text: 'First words'}}, {type: 'message', settings: {text: 'Second words'}}],
  samePairs: [],
  async extra({browser, mount, eq, ok}) {
    const sel = '#shopify-section-test ';
    const blocks = [{type: 'message', settings: {text: 'Fresh <strong>stock</strong>'}}, {type: 'message', settings: {text: 'Second words'}}];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'pro 1 ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'annoucment-bar-scrolling', {width, editing, assets: ['live-announcements.js'], blocks});
      const sty = (q, k) => t.page.locator(sel + q).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const first = t.blockId('message');
      const anim = () => t.page.locator(sel + '.announcement-bar').evaluate(el => { const a = el.getAnimations()[0]; if (!a) return null; window.__a = window.__a || a; return {same: window.__a === a, t: a.currentTime, state: a.playState}; });
      const a0 = await anim();
      ok(a0 && a0.state === 'running', where + ' messages scroll');
      eq(await sty('.announcement-message', 'fontSize'), width < 769 ? '13px' : '15px', where + ' text size per width');
      await t.emit({font_size: 20, message_spacing: 30, enable_custom_style: true, message_text_color: '#ff0000', separator_icon_color: '#00ff00', separator_icon: 'fa-star'});
      await t.emit({text: 'Renamed <em>now</em>'}, first);
      await t.page.waitForTimeout(150);
      const a1 = await anim();
      ok(a1.same && a1.t > a0.t && a1.state === 'running', where + ' unrelated edits keep the scroll running');
      eq(await t.page.locator(sel + '[data-an-copy="' + first + '"]').count(), 59, where + ' every copy of the message is kept');
      eq(await t.page.locator(sel + '[data-an-copy="' + first + '"] em').count(), 59, where + ' copies follow the text and its formatting');
      eq(await sty('.announcement-message', 'color'), 'rgb(255, 0, 0)', where + ' custom text colour');
      eq(await sty('.separator-icon', 'color'), 'rgb(0, 255, 0)', where + ' custom separator colour');
      eq(await t.page.locator(sel + '.separator-icon path').first().getAttribute('d'), 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z', where + ' separator shape live');
      await t.emit({separator_icon: 'none'});
      eq(await t.page.locator(sel + '.separator-icon').first().isVisible(), false, where + ' no separator');
      await t.emit({enable_custom_style: false, separator_icon: 'fa-sun'});
      eq(await sty('.announcement-message', 'color'), 'rgb(204, 204, 204)', where + ' theme text colour back');
      eq(await sty('.separator-icon', 'color'), 'rgb(51, 102, 153)', where + ' theme separator colour back');
      await t.emit({enable_link_redirect: true, redirect_url: '/pages/sale'});
      eq(await t.page.locator(sel + '[data-an-bar-link]').getAttribute('href'), '/pages/sale', where + ' bar link live');
      eq((await anim()).state, 'running', where + ' the linked bar keeps scrolling');
      await t.emit({enable_link_redirect: false});
      eq(await t.page.locator(sel + '[data-an-bar-link]').count(), 0, where + ' bar link removed live');
      await t.emit({autoplay: false});
      eq(await sty('.announcement-bar', 'animationName'), 'none', where + ' still bar');
      await t.emit({autoplay: true, uppercase: false});
      eq(await sty('.announcement-message', 'textTransform'), 'none', where + ' text case live');
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, blk) => { if (mode === 'live') { if (sec) await t.emit(sec); if (blk) await t.emit(blk, t.blockId('message')); } else { const bl = t.rendered[0].section.blocks.map((b, i) => ({type: b.type, settings: i === 0 && blk ? {...b.settings, ...blk} : b.settings})); await t.redraw({settings: sec || {}, blocks: bl}); } };
        await apply({enable_custom_font: true, announcement_font: FONT});
        ok(/Courier New/.test(await sty('.announcement-message:not([data-an-block])', 'fontFamily')) && /Courier New/.test(await sty('.announcement-message strong, .announcement-message em', 'fontFamily')), where + ' ' + mode + ' custom font on the words and their formatting');
        await apply({enable_custom_font: false});
        ok(/Arial/.test(await sty('.announcement-message', 'fontFamily')), where + ' ' + mode + ' theme font back');
        await apply(null, {enable_custom_fonts: true, font: {family: 'Verdana', fallback_families: 'sans-serif', weight: 800}, enable_custom_style: true, color: '#0000ff'});
        ok(/Verdana/.test(await sty('[data-an-block]', 'fontFamily')), where + ' ' + mode + ' block font');
        eq(await sty('[data-an-block]', 'fontWeight'), '800', where + ' ' + mode + ' block font weight');
        eq(await sty('[data-an-block]', 'color'), 'rgb(0, 0, 255)', where + ' ' + mode + ' block colour');
        eq(await t.page.locator(sel + '[data-an-copy="' + t.blockId('message') + '"]').last().evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 255)', where + ' ' + mode + ' copies follow the block colour');
        await apply(null, {enable_custom_fonts: false, enable_custom_style: false});
        eq(await sty('[data-an-block]', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' block colour off');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      const t = await mount(browser, 'annoucment-bar-scrolling', {width: 1366, editing: false, assets: ['live-announcements.js'], blocks});
      await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
      await t.page.waitForTimeout(250);
      eq(await t.css('.announcement-bar', 'animationPlayState'), 'paused', 'pro 1 pauses off screen');
      await t.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await t.page.waitForTimeout(250);
      eq(await t.css('.announcement-bar', 'animationPlayState'), 'running', 'pro 1 runs again on screen');
      { const b = await t.root('[data-an-root]').boundingBox(); await t.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); } await t.page.waitForTimeout(60);
      eq(await t.css('.announcement-bar', 'animationPlayState'), 'paused', 'pro 1 pauses on hover');
      await t.page.close();
      const r = await mount(browser, 'annoucment-bar-scrolling', {width: 375, editing: false, reducedMotion: 'reduce', assets: ['live-announcements.js'], blocks, settings: {background_animation: 'animation1'}});
      eq(await r.css('.announcement-bar', 'animationName'), 'none', 'pro 1 reduced motion: messages still');
      eq(await r.css('[data-an-root]', 'animationName'), 'none', 'pro 1 reduced motion: background still');
      eq(await r.page.locator('#shopify-section-test .announcement-content[aria-hidden]').isVisible(), false, 'pro 1 reduced motion: copy hidden');
      ok(await r.noOverflow(), 'pro 1 reduced motion: no page overflow');
      await r.page.close();
      const l = await mount(browser, 'annoucment-bar-scrolling', {width: 1366, assets: ['live-announcements.js'], blocks: [], settings: {message_1: 'Old one', message_2: 'Old two', message_3: '', message_4: ''}});
      eq(await l.page.locator('[data-an-legacy="message_1"]').textContent(), 'Old one', 'pro 1 legacy message');
      eq(await l.page.locator('[data-an-legacy="message_3"]').isVisible(), false, 'pro 1 empty legacy message hidden');
      await l.emit({message_2: 'Edited two'});
      eq(await l.page.locator('[data-an-legacy-copy="message_2"]').first().textContent(), 'Edited two', 'pro 1 legacy message live, copies too');
      await l.redraw({blocks: [{type: 'message', settings: {text: 'Block words'}}]});
      eq(await l.page.locator('[data-an-legacy]').count(), 0, 'pro 1 legacy messages gone once a block exists');
      eq(l.errors, [], 'pro 1 legacy errors');
      await l.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
