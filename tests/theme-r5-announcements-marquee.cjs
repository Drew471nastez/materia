/* Marquee Bar (Announcements, round 5): shared sweep of every section and
   block control live and by redraw, plus the marquee itself (never restarted
   by an unrelated edit, copies follow the blocks, paused off screen, still
   under reduced motion), custom colours and fonts under the theme priority,
   and the saved home page instance against the file as it was. */
const {run, savedLook, IMG, IMG2, FONT} = require('./theme-r5-announcements-lib.cjs');
const SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="#000000"><circle cx="12" cy="12" r="10"/></svg>';
const items = n => Array.from({length: n}, (_, i) => ({type: 'marquee', settings: {text: 'Item ' + (i + 1), svg_icon: i === 0 ? SVG : '', image: i === 1 ? IMG : null}}));
run({
  name: 'marquee-bar', bgSel: '.scrolling__marquee', text: '.scrolling__marquee-item', noRectWithin: '.scrolling__marquee',
  blockTypes: ['marquee'], baseBlocks: items(3), addType: 'marquee',
  values: {'marquee.image': IMG2, background_gradient: 'linear-gradient(90deg, #ab1234, #12ab34)'},
  imageBlocks: {},
  motionSettings: {},
  async extra({browser, mount, eq, ok}) {
    const sel = '#shopify-section-test ';
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'marquee ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'marquee-bar', {width, editing, assets: ['live-announcements.js'], blocks: [{type: 'marquee', settings: {text: 'Fresh <strong>stock</strong>'}}, ...items(3)]});
      const sty = (q, k) => t.page.locator(sel + q).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const first = t.blockId('marquee');
      const anim = () => t.page.locator(sel + '[data-an-group]').evaluate(el => { const a = el.getAnimations().find(x => x.effect.getTiming().iterations === Infinity); if (!a) return null; window.__a = window.__a || a; return {same: window.__a === a, t: a.currentTime, state: a.playState}; });
      const a0 = await anim();
      ok(a0 && a0.state === 'running', where + ' marquee runs');
      const img = await t.page.locator('[data-an-block="' + t.blockId('marquee', 2) + '"] img').elementHandle();
      await t.emit({desktop_text_size: 30, mobile_text_size: 20, desktop_item_gap: 60, mobile_item_gap: 20, enable_custom_style: true, text_color: '#ff0000', html_class: 'mine', text_weight: '700'});
      await t.emit({text: 'Renamed <em>now</em>'}, first);
      await t.page.waitForTimeout(150);
      const a1 = await anim();
      if (editing) ok(a1.same && a1.t > a0.t && a1.state === 'running', where + ' unrelated edits keep the running marquee');
      if (editing) eq(await img.evaluate(el => el.isConnected && el.getAttribute('src').split('?')[0]), IMG.url, where + ' picture kept');
      eq(await t.page.locator('[data-an-copy="' + first + '"] [data-an-text]').first().textContent(), 'Renamed now', where + ' copies follow the block text');
      eq(await t.page.locator('[data-an-copy="' + first + '"] [data-an-text] em').count(), 2, where + ' copies keep the formatting');
      eq(await sty('[data-an-text]', 'color'), 'rgb(255, 0, 0)', where + ' custom text colour');
      eq(await sty('[data-an-text]', 'fontWeight'), '700', where + ' text weight');
      eq(await sty('[data-an-text]', 'fontSize'), width < 768 ? '20px' : '30px', where + ' text size per width');
      eq(await sty('[data-an-track]', 'columnGap'), width < 768 ? '20px' : '60px', where + ' gap per width');
      ok(await t.page.locator(sel + '.scrolling__marquee.mine').count() === 1, where + ' html class live');
      await t.emit({enable_custom_style: false});
      eq(await sty('[data-an-text]', 'color'), 'rgb(204, 204, 204)', where + ' theme text colour back');
      eq(await sty('.scrolling__marquee', 'backgroundColor'), 'rgb(24, 32, 40)', where + ' theme background back');
      await t.emit({repeat_count: 5});
      eq(await t.page.locator(sel + '.scrolling__marquee-wrapper').count(), 5, where + ' copies added live');
      const times = await t.page.locator(sel + '.scrolling__marquee-wrapper').evaluateAll(els => els.map(el => Math.round(el.getAnimations()[0]?.currentTime || -1)));
      ok(times.every(x => Math.abs(x - times[0]) < 40), where + ' new copies run on the first group\'s clock ' + times);
      await t.emit({repeat_count: 2});
      eq(await t.page.locator(sel + '.scrolling__marquee-wrapper').count(), 2, where + ' copies removed live');
      eq(await t.page.locator(sel + '[data-an-copies][aria-hidden="true"]').count(), 1, where + ' copies are silent');
      await t.emit({direction: 'normal', duration: 12});
      eq(await sty('[data-an-group]', 'animationDirection'), 'normal', where + ' direction live');
      eq(await sty('[data-an-group]', 'animationDuration'), '12s', where + ' speed live');
      const a2 = await anim();
      /* Live edits exist only in the builder; since the storefront prints no settings (d46d23b) a
         storefront edit is a redraw, which starts a fresh animation by design. */
      if (where.includes('editor')) ok(a2.same && a2.state === 'running', where + ' speed and direction keep the same animation');
      else ok(a2.state === 'running', where + ' the marquee runs after the change');
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, blk) => { if (mode === 'live') { if (sec) await t.emit(sec); if (blk) await t.emit(blk, t.blockId('marquee')); } else { const blocks = t.rendered[0].section.blocks.map((b, i) => ({type: b.type, settings: i === 0 && blk ? {...b.settings, ...blk} : b.settings})); await t.redraw({settings: sec || {}, blocks}); } };
        await apply({enable_custom_fonts: true, body_font: FONT, text_weight: 'theme'});
        ok(/Courier New/.test(await sty('[data-an-text]', 'fontFamily')) && /Courier New/.test(await sty('[data-an-text] strong, [data-an-text] em', 'fontFamily')), where + ' ' + mode + ' custom font on the item and its formatting');
        eq(await sty('[data-an-text]', 'fontWeight'), '300', where + ' ' + mode + ' custom font weight');
        await apply({enable_custom_fonts: false});
        ok(/Arial/.test(await sty('[data-an-text]', 'fontFamily')), where + ' ' + mode + ' theme font back');
        await apply(null, {enable_custom_fonts: true, font: {family: 'Verdana', fallback_families: 'sans-serif', weight: 600}, enable_custom_style: true, text_color: '#00ff00'});
        ok(/Verdana/.test(await sty('[data-an-block] [data-an-text]', 'fontFamily')), where + ' ' + mode + ' block font');
        eq(await sty('[data-an-block] [data-an-text]', 'fontWeight'), '600', where + ' ' + mode + ' block font weight');
        eq(await sty('[data-an-block] [data-an-text]', 'color'), 'rgb(0, 255, 0)', where + ' ' + mode + ' block colour');
        ok(/Verdana/.test(await t.page.locator(sel + '[data-an-copy] [data-an-text]').first().evaluate(el => getComputedStyle(el).fontFamily)), where + ' ' + mode + ' copy follows the block font');
        await apply(null, {enable_custom_fonts: false, enable_custom_style: false});
        ok(/Arial/.test(await sty('[data-an-block] [data-an-text]', 'fontFamily')), where + ' ' + mode + ' block font off');
        eq(await sty('[data-an-block] [data-an-text]', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' block colour off');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    {
      const t = await mount(browser, 'marquee-bar', {width: 1366, editing: false, assets: ['live-announcements.js'], blocks: items(3)});
      await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
      await t.page.waitForTimeout(250);
      eq(await t.css('[data-an-group]', 'animationPlayState'), 'paused', 'marquee pauses off screen');
      await t.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await t.page.waitForTimeout(250);
      eq(await t.css('[data-an-group]', 'animationPlayState'), 'running', 'marquee runs again on screen');
      await t.root('.scrolling__marquee').hover(); await t.page.waitForTimeout(60);
      eq(await t.css('[data-an-group]', 'animationPlayState'), 'paused', 'marquee pauses on hover');
      await t.emit({pause_on_hover: false}); await t.page.waitForTimeout(60);
      eq(await t.css('[data-an-group]', 'animationPlayState'), 'running', 'pause on hover off, live');
      await t.page.close();
      const r = await mount(browser, 'marquee-bar', {width: 375, editing: false, reducedMotion: 'reduce', assets: ['live-announcements.js'], blocks: items(3)});
      eq(await r.css('[data-an-group]', 'animationName'), 'none', 'reduced motion: marquee still');
      eq(await r.page.locator('#shopify-section-test [data-an-copies]').first().isVisible(), false, 'reduced motion: copies hidden');
      eq(await r.css('.scrolling__marquee', 'overflowX'), 'auto', 'reduced motion: the items scroll by hand');
      ok(await r.noOverflow(), 'reduced motion: no page overflow');
      await r.page.close();
    }
    /* the saved home page marquee keeps its look once templates/home.json sets enable_custom_style */
    for (const width of [375, 1366]) {
      const probe = page => page.evaluate(() => {
        const W = document.getElementById('shopify-section-S'), cs = (el, p) => el ? getComputedStyle(el)[p] : null, m = W.querySelector('.scrolling__marquee'), g = W.querySelector('.scrolling__marquee-wrapper');
        const items = [...g.children].flatMap(el => el.classList.contains('scrolling__marquee-block') ? [...el.children] : [el]).filter(el => getComputedStyle(el).display !== 'none');
        return {bg: cs(m, 'backgroundColor') + cs(m, 'backgroundImage'), pad: [cs(m, 'paddingTop'), cs(m, 'paddingBottom')], gap: cs(g, 'columnGap'), height: Math.round(m.getBoundingClientRect().height), groups: W.querySelectorAll('.scrolling__marquee-wrapper').length,
          anim: [cs(g, 'animationName'), cs(g, 'animationDuration'), cs(g, 'animationDirection')],
          items: items.map(el => [el.textContent.trim(), cs(el, 'color'), cs(el, 'fontSize'), cs(el, 'fontWeight'), Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)])};
      });
      const look = await savedLook(browser, {name: 'marquee-bar', file: 'templates/home.json', key: 'marquee_bar_jp8byW', width, toggles: {enable_custom_style: true}, probe});
      eq(look.new, look.old, 'saved home marquee ' + width + ' looks as before');
      const plain = await savedLook(browser, {name: 'marquee-bar', file: 'templates/home.json', key: 'marquee_bar_jp8byW', width, toggles: {enable_custom_style: false}, probe});
      eq(plain.new.items.map(x => x[1])[0], 'rgb(204, 204, 204)', 'saved home marquee ' + width + ' without the switch follows the scheme');
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
