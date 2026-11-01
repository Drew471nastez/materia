/* Announcement Bar Basic (Announcements, round 5): shared sweep of every
   section and block control live and by redraw, the legacy message (no
   blocks), message and button blocks under the theme priority (custom
   colours, fonts, weight and button shape win; off restores the theme),
   desktop and mobile text, the close button, and the saved header group
   instance against the file as it was. */
const {run, savedLook, IMG, IMG2, FONT} = require('./theme-r5-announcements-lib.cjs');
run({
  name: 'announcement-bar-basic', bgSel: '.unique-announcement-bar', text: '.ab-msg', button: true,
  blockTypes: ['message', 'button'], addType: 'message',
  baseBlocks: [{type: 'message', settings: {text: 'Desktop words', text_mobile: 'Phone words', link: '/pages/a'}}, {type: 'button', settings: {label: 'Shop now', link: '/collections/all'}}],
  hover: {'button.bg_hover': '.ab-button', 'button.color_hover': '.ab-button'},
  skipEveryControl: {},
  async extra({browser, mount, eq, ok}) {
    const sel = '#shopify-section-test ';
    const blocks = [{type: 'message', settings: {text: 'Desktop words', text_mobile: 'Phone words', link: '/pages/a'}}, {type: 'button', settings: {label: 'Shop now', link: '/collections/all'}}];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'basic ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'announcement-bar-basic', {width, editing, assets: ['live-announcements.js'], blocks});
      const sty = (q, k) => t.page.locator(sel + q).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const shown = q => t.page.locator(sel + q).first().isVisible();
      const msg = t.blockId('message'), btn = t.blockId('button');
      eq(await t.page.locator(sel + '.ab-msg').first().evaluate(el => el.innerText.trim()), width < 768 ? 'Phone words' : 'Desktop words', where + ' text for the width');
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, m, b) => { if (mode === 'live') { if (sec) await t.emit(sec); if (m) await t.emit(m, msg); if (b) await t.emit(b, btn); } else { await t.redraw({settings: sec || {}, blocks: t.rendered[0].section.blocks.map(x => ({type: x.type, settings: {...x.settings, ...(x.type === 'message' ? m || {} : b || {})}}))}); } };
        /* section font, weight and case reach the words inside the link */
        await apply({enable_custom_fonts: true, body_font: FONT, letter_spacing: 2, text_transform: 'uppercase'});
        ok(/Courier New/.test(await sty('.ab-msg__' + (width < 768 ? 'm' : 'd'), 'fontFamily')), where + ' ' + mode + ' custom font reaches the words');
        eq(await sty('.ab-msg', 'fontWeight'), '300', where + ' ' + mode + ' custom font weight');
        eq(await sty('.ab-msg', 'textTransform'), 'uppercase', where + ' ' + mode + ' text case');
        eq(await sty('.ab-msg', 'letterSpacing'), '2px', where + ' ' + mode + ' letter spacing');
        await apply({enable_custom_font_weight: true, message_font_weight: '800', button_font_weight: '900'});
        eq(await sty('.ab-msg', 'fontWeight'), '800', where + ' ' + mode + ' message weight wins');
        eq(await sty('.ab-button', 'fontWeight'), '900', where + ' ' + mode + ' button weight wins over Theme settings > Buttons');
        await apply({enable_custom_fonts: false, enable_custom_font_weight: false, letter_spacing: 0, text_transform: 'none'});
        ok(/Arial/.test(await sty('.ab-msg', 'fontFamily')), where + ' ' + mode + ' theme font back');
        eq(await sty('.ab-msg', 'fontWeight'), '400', where + ' ' + mode + ' theme weight back');
        eq(await sty('.ab-button', 'fontWeight'), '500', where + ' ' + mode + ' theme button weight back');
        /* the message block's own colour and font */
        await apply(null, {enable_custom_style: true, color: '#ff0000', enable_custom_fonts: true, font: {family: 'Verdana', fallback_families: 'sans-serif', weight: 700}});
        eq(await sty('.ab-msg', 'color'), 'rgb(255, 0, 0)', where + ' ' + mode + ' message colour');
        ok(/Verdana/.test(await sty('.ab-msg span', 'fontFamily')), where + ' ' + mode + ' message font on the words');
        eq(await sty('.ab-msg span', 'fontWeight'), '700', where + ' ' + mode + ' message font weight');
        await apply(null, {enable_custom_style: false, enable_custom_fonts: false});
        eq(await sty('.ab-msg', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' message colour back');
        /* button: custom colours, shape and font win; off restores the theme button */
        await apply(null, null, {enable_custom_style: true, bg_color: '#00ff00', text_color: '#0000ff', use_theme_button: false, radius: 3, padding_x: 30, padding_y: 9, font_size: 19, enable_custom_fonts: true, font: {family: 'Verdana', fallback_families: 'sans-serif', weight: 400}});
        eq(await sty('.ab-button', 'backgroundColor'), 'rgb(0, 255, 0)', where + ' ' + mode + ' button colour');
        eq(await sty('.ab-button', 'color'), 'rgb(0, 0, 255)', where + ' ' + mode + ' button text colour');
        eq([await sty('.ab-button', 'borderTopLeftRadius'), await sty('.ab-button', 'paddingLeft'), await sty('.ab-button', 'paddingTop'), await sty('.ab-button', 'fontSize')], ['3px', '30px', '9px', '19px'], where + ' ' + mode + ' button shape wins');
        ok(/Verdana/.test(await sty('.ab-button', 'fontFamily')), where + ' ' + mode + ' button font wins');
        await apply(null, null, {style: 'outline'});
        eq(await sty('.ab-button', 'backgroundColor'), 'rgba(0, 0, 0, 0)', where + ' ' + mode + ' outline button');
        eq(await sty('.ab-button', 'borderTopColor'), 'rgb(0, 0, 255)', where + ' ' + mode + ' outline border follows the text colour');
        await apply(null, null, {style: 'filled', enable_custom_style: false, use_theme_button: true, enable_custom_fonts: false});
        eq(await sty('.ab-button', 'backgroundColor'), 'rgb(18, 52, 86)', where + ' ' + mode + ' theme button back');
        eq([await sty('.ab-button', 'borderTopLeftRadius'), await sty('.ab-button', 'fontSize')], ['12px', '16px'], where + ' ' + mode + ' theme button shape back');
        ok(/Arial/.test(await sty('.ab-button', 'fontFamily')), where + ' ' + mode + ' theme button font back');
        /* show on desktop / mobile per block */
        await apply(null, {visibility: width < 768 ? 'desktop' : 'mobile'});
        eq(await shown('.ab-msg'), false, where + ' ' + mode + ' message hidden on this width');
        await apply(null, {visibility: 'all'});
        eq(await shown('.ab-msg'), true, where + ' ' + mode + ' message shown again');
      }
      const close = t.page.locator(sel + '[data-an-close]');
      const box = await close.boundingBox();
      ok(box.width >= 44 && box.height >= 44, where + ' close button is a 44px target');
      await close.click(); await t.page.waitForTimeout(60);
      eq(await t.page.locator(sel + '[data-an-root]').isVisible(), false, where + ' close hides the bar');
      if (editing) { await t.emit({font_size: 16}); eq(await t.page.locator(sel + '[data-an-root]').isVisible(), true, where + ' the next edit shows the bar again in the builder'); }
      else eq(await t.page.evaluate(() => +localStorage.getItem('announcementBarClosedUntil:test') > Date.now()), true, where + ' closed for the chosen days');
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      /* a visitor who closed it does not see it on the next page; 0 days keeps it for the tab only */
      const t = await mount(browser, 'announcement-bar-basic', {width: 1366, editing: false, assets: ['live-announcements.js'], blocks, settings: {close_persistence_days: 0}});
      await t.root('[data-an-close]').click();
      eq(await t.page.evaluate(() => [sessionStorage.getItem('announcementBarClosed:test'), localStorage.getItem('announcementBarClosedUntil:test')]), ['1', null], 'basic 0 days: closed for this tab only');
      await t.redraw(); await t.page.waitForTimeout(100);
      eq(await t.page.locator('#shopify-section-test [data-an-root]').isVisible(), false, 'basic stays closed on the next render');
      await t.page.close();
    }
    {
      /* legacy: no blocks, the section's own message */
      const t = await mount(browser, 'announcement-bar-basic', {width: 1366, assets: ['live-announcements.js'], blocks: [], settings: {message: 'Old words', message_mobile: 'Old phone', link: '/pages/old'}});
      eq(await t.page.locator('[data-an-legacy="message"]').evaluate(el => el.innerText.trim()), 'Old words', 'basic legacy message');
      eq(await t.page.locator('[data-an-legacy="message"]').getAttribute('href'), '/pages/old', 'basic legacy link');
      await t.emit({message: 'Edited words', link: ''});
      eq(await t.page.locator('[data-an-legacy="message"]').evaluate(el => [el.tagName, el.innerText.trim()].join(' ')), 'SPAN Edited words', 'basic legacy message live');
      await t.redraw({blocks: [{type: 'message', settings: {text: 'Block words'}}]});
      eq(await t.page.locator('[data-an-legacy]').count(), 0, 'basic legacy message gone once a block exists');
      eq(t.errors, [], 'basic legacy errors');
      await t.page.close();
    }
    /* the saved header group bar (hidden in the header group) keeps its look */
    for (const width of [375, 1366]) {
      const probe = page => page.evaluate(() => {
        const W = document.getElementById('shopify-section-S'), bar = W.querySelector('.unique-announcement-bar'), cs = (el, p) => el ? getComputedStyle(el)[p] : null;
        const msgs = [...bar.querySelectorAll('.ab-msg')].filter(el => el.getClientRects().length);
        const r = bar.getBoundingClientRect(), close = bar.querySelector('.close-button');
        return {bar: [cs(bar, 'backgroundColor'), cs(bar, 'color'), Math.round(r.height), cs(bar, 'fontSize'), cs(bar, 'justifyContent')],
          msgs: msgs.map(el => [el.innerText.trim(), el.getAttribute('href'), cs(el, 'color'), cs(el, 'fontSize'), cs(el, 'fontWeight'), Math.round(el.getBoundingClientRect().left), Math.round(el.getBoundingClientRect().top - r.top)]),
          close: close && close.getClientRects().length ? [cs(close, 'color'), cs(close, 'fontSize')] : null};
      });
      const look = await savedLook(browser, {name: 'announcement-bar-basic', file: 'sections/header-group.json', key: 'announcement-bar-basic-1792848619392', width, probe});
      eq(look.new, look.old, 'saved header group bar ' + width + ' looks as before');
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
