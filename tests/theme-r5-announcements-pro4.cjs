/* Announcement Bar Pro 4 (Announcements, round 5), run by its own runtime
   (announcement-pro-4.js): shared sweep of every section and block control
   live and by redraw, message and button blocks with the legacy section
   message and button kept for saved bars, custom colours, font, weights and
   button shape under the theme priority, the countdown paused off screen,
   and two bars on one page. */
const {run, FONT} = require('./theme-r5-announcements-lib.cjs');
const PAST = {end_date: '2000-01-01', end_time: '00:00', on_end: 'freeze'};
run({
  name: 'announcement-bar-pro-4', bgSel: '.abp4', text: '.abp4__message', button: true,
  assets: ['announcement-pro-4.css', 'announcement-pro-4.js'], audit: () => [], roots: () => document.querySelectorAll('[data-announcement-pro-four]').length,
  blockAttr: 'data-announcement-block',
  /* a live edit paints without transitions for half a second (data-live), then the theme transitions return */
  settle: 520,
  blockTypes: ['message', 'button', 'extra_link'], addType: 'message',
  baseSettings: PAST,
  baseBlocks: [{type: 'message', settings: {text: 'Ends <strong>soon</strong>'}}, {type: 'button', settings: {label: 'Shop now'}}, {type: 'extra_link', settings: {label: 'Delivery', link: '/pages/delivery'}}],
  hover: {'button.bg_hover': '.abp4__btn', 'button.color_hover': '.abp4__btn'},
  skipEveryControl: {invalid_date_label: true, close_label: true, dismissal: true},
  async extra({browser, mount, eq, ok}) {
    const sel = '#shopify-section-test ';
    const blocks = [{type: 'message', settings: {text: 'Ends <strong>soon</strong>'}}, {type: 'button', settings: {label: 'Shop now', link: '/collections/sale'}}, {type: 'extra_link', settings: {label: 'Delivery', link: '/pages/delivery'}}];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'pro 4 ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'announcement-bar-pro-4', {width, editing, assets: ['announcement-pro-4.css', 'announcement-pro-4.js'], settings: {end_date: '2099-12-31'}, blocks});
      const sty = (q, k) => t.page.locator(sel + q).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const msg = t.blockId('message'), btn = t.blockId('button');
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, m, b) => { if (mode === 'live') { if (sec) await t.emit(sec); if (m) await t.emit(m, msg); if (b) await t.emit(b, btn); } else await t.redraw({settings: sec || {}, blocks: t.rendered[0].section.blocks.map(x => ({type: x.type, settings: {...x.settings, ...(x.type === 'message' ? m || {} : x.type === 'button' ? b || {} : {})}}))}); };
        await apply({enable_custom_fonts: true, body_font: FONT});
        ok(/Courier New/.test(await sty('.abp4__msg', 'fontFamily')) && /Courier New/.test(await sty('.abp4__msg strong', 'fontFamily')) && /Courier New/.test(await sty('.abp4__digit', 'fontFamily')), where + ' ' + mode + ' custom font on the message, its formatting and the digits');
        await apply({enable_custom_fonts: false, enable_custom_message_weight: true, message_weight: '300', enable_custom_digit_weight: true, digit_weight: '800'});
        ok(/Arial/.test(await sty('.abp4__msg', 'fontFamily')), where + ' ' + mode + ' theme font back');
        eq([await sty('.abp4__message', 'fontWeight'), await sty('.abp4__digit', 'fontWeight')], ['300', '800'], where + ' ' + mode + ' custom weights');
        await apply({enable_custom_message_weight: false, enable_custom_digit_weight: false});
        eq(await sty('.abp4__message', 'fontWeight'), '400', where + ' ' + mode + ' theme weight back');
        await apply(null, {enable_custom_style: true, color: '#ff0000'});
        eq(await sty('.abp4__msg', 'color'), 'rgb(255, 0, 0)', where + ' ' + mode + ' message block colour');
        await apply(null, {enable_custom_style: false});
        eq(await sty('.abp4__msg', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' message colour back');
        await apply(null, null, {enable_custom_style: true, bg: '#00ff00', color: '#0000ff', use_theme_button: false, radius: 3, padding_x: 30, padding_y: 9, font_size: 19, font_weight: '600'});
        eq([await sty('.abp4__btn', 'backgroundColor'), await sty('.abp4__btn', 'color')], ['rgb(0, 255, 0)', 'rgb(0, 0, 255)'], where + ' ' + mode + ' button colours');
        eq([await sty('.abp4__btn', 'borderTopLeftRadius'), await sty('.abp4__btn', 'paddingLeft'), await sty('.abp4__btn', 'paddingTop'), await sty('.abp4__btn', 'fontSize'), await sty('.abp4__btn', 'fontWeight')], ['3px', '30px', '9px', '19px', '600'], where + ' ' + mode + ' button shape wins over Theme settings > Buttons');
        await apply(null, null, {enable_custom_style: false, use_theme_button: true, button_style: 'secondary'});
        eq(await sty('.abp4__btn', 'backgroundColor'), 'rgb(255, 255, 255)', where + ' ' + mode + ' secondary theme button');
        eq([await sty('.abp4__btn', 'borderTopLeftRadius'), await sty('.abp4__btn', 'fontSize')], ['12px', '16px'], where + ' ' + mode + ' theme shape back');
        await apply(null, null, {button_style: 'primary'});
      }
      eq(await t.page.locator(sel + '.abp4__btn').getAttribute('href'), '/collections/sale', where + ' button block link');
      await t.emit({link: ''}, btn);
      eq(await t.page.locator(sel + '.abp4__btn').getAttribute('href'), '/collections/all', where + ' empty link goes to all products');
      const d0 = await t.page.locator(sel + '[data-unit="s"]').textContent();
      await t.page.waitForTimeout(1100);
      ok(await t.page.locator(sel + '[data-unit="s"]').textContent() !== d0, where + ' countdown ticks');
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      /* legacy bar: no message or button block, the section's own message and button */
      const t = await mount(browser, 'announcement-bar-pro-4', {width: 1366, assets: ['announcement-pro-4.css', 'announcement-pro-4.js'], settings: {...PAST, message: 'Old message', button_label: 'Old button', button_url: '/pages/old', use_theme_button: false, btn_radius: 2, btn_pad_x: 40}, blocks: []});
      eq(await t.page.locator('.abp4__message[data-legacy]').textContent(), 'Old message', 'pro 4 legacy message');
      eq(await t.page.locator('.abp4__btn[data-legacy]').getAttribute('href'), '/pages/old', 'pro 4 legacy button');
      eq([await t.css('.abp4__btn', 'borderTopLeftRadius'), await t.css('.abp4__btn', 'paddingLeft')], ['2px', '40px'], 'pro 4 legacy button shape wins over the theme priority');
      await t.emit({message: 'Edited', use_theme_button: true});
      eq(await t.page.locator('.abp4__message').textContent(), 'Edited', 'pro 4 legacy message live');
      eq(await t.css('.abp4__btn', 'borderTopLeftRadius'), '12px', 'pro 4 legacy button back on the theme shape');
      await t.redraw({blocks: [{type: 'message', settings: {text: 'Block message'}}]});
      eq(await t.page.locator('.abp4__message[data-legacy]').count(), 0, 'pro 4 legacy message gone with a message block');
      eq(await t.page.locator('.abp4__btn[data-legacy]').count(), 1, 'pro 4 legacy button kept without a button block');
      eq(t.errors, [], 'pro 4 legacy errors');
      await t.page.close();
      /* countdown off screen: no tick */
      const o = await mount(browser, 'announcement-bar-pro-4', {width: 1366, editing: false, assets: ['announcement-pro-4.css', 'announcement-pro-4.js'], settings: {end_date: '2099-12-31'}, blocks});
      await o.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); window.scrollTo(0, 0); });
      await o.page.waitForTimeout(400);
      const s0 = await o.page.locator('#shopify-section-test [data-unit="s"]').textContent();
      await o.page.waitForTimeout(2100);
      eq(await o.page.locator('#shopify-section-test [data-unit="s"]').textContent(), s0, 'pro 4 countdown rests off screen');
      await o.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await o.page.waitForTimeout(1300);
      ok(await o.page.locator('#shopify-section-test [data-unit="s"]').textContent() !== s0, 'pro 4 countdown ticks again on screen');
      await o.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
