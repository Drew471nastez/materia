/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r5-header-topbar.cjs
   Round 5, Announcement Bar Pro 3 (sections/top-bar) on the real layout with
   the header, Theme settings > Typography "Use in every section" on:
   1. schema: ids kept and unique, Message blocks, Time per message, Custom
      font (opt in), plain labels without dashes;
   2. Message blocks: one rotator, messages in block order, phone text, link,
      own colour over the bar's custom colours, Time per message, arrows
      (44px buttons), swipe-free keyboard use, reduced motion, paused off
      screen, two bars independent, a redraw starts one timer;
   3. every visible setting of the section and its blocks changes the bar
      after a redraw;
   4. every value shopify/assets/live-header.js applies live equals the
      redraw, at 1366 and 375;
   5. font, size, weight, spacing and case win under the theme priority. */
const assert = require('node:assert/strict');
const L = require('./theme-r5-header-lib.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const ts = L.schemaOf('sections/top-bar.storelib'), old = L.schemaOf('sections/top-bar.storelib', true);

/* ---------- 1. schema ---------- */
{
  const ids = ts.settings.filter(s => s.id).map(s => s.id);
  ok(new Set(ids).size === ids.length, 'section ids are unique');
  ok(old.settings.filter(s => s.id).every(s => ids.includes(s.id)), 'every section id at HEAD is kept');
  for (const ob of old.blocks) {
    const nb = ts.blocks.find(b => b.type === ob.type);
    ok(nb && ob.settings.filter(s => s.id).every(s => nb.settings.some(x => x.id === s.id)), `block ${ob.type} keeps its ids`);
  }
  const m = ts.blocks.find(b => b.type === 'message');
  ok(m && ['text', 'text_mobile', 'link', 'enable_custom_style', 'text_color'].every(id => m.settings.some(s => s.id === id)), 'Message block: text, phone text, link, own colour');
  ok(m.settings.find(s => s.id === 'text_color').visible_if === '{{ block.settings.enable_custom_style }}', 'the message colour shows only with Custom colour on');
  ok(ts.presets[0].blocks.filter(b => b.type === 'message').length === 2 && !ts.presets[0].blocks.some(b => b.type === 'text_slider'), 'the preset starts with two Message blocks');
  ok(ts.max_blocks >= 6, 'room for several messages');
  const S = id => ts.settings.find(s => s.id === id);
  ok(S('enable_custom_fonts').default === false && S('font').type === 'font_picker' && S('font').visible_if === '{{ section.settings.enable_custom_fonts }}', 'Custom font: opt in, native picker');
  ok(S('change_every').type === 'range' && S('change_every').default === 5, 'Time per message');
  const text = JSON.stringify(ts);
  ok(!/—/.test(text), 'no em dashes in labels or defaults');
  ok(!/<script/.test(L.body(L.read('snippets/announcement-rotator.storelib'))), 'the rotator is not an inline script any more');
}
if (!L.Liquid) { console.log(`${checks} top bar round 5 checks passed (render skipped: set LIQUIDJS=<path to liquidjs>)`); process.exit(0); }

const MSG = (id, text, more = {}) => ({id, type: 'message', settings: {text, ...more}});
const BLOCKS = [
  {id: 'social', type: 'socials', settings: {hidden_on_mobile: true}},
  MSG('m1', 'Free returns on <strong>every</strong> order', {text_mobile: 'Free returns'}),
  MSG('m2', 'Orders ship in two days', {link: '/pages/shipping'}),
  MSG('m3', 'Gift cards are here', {enable_custom_style: true, text_color: '#d21f3c'}),
  {id: 'slider', type: 'text_slider', settings: {text1: 'Legacy one', text2: 'Legacy two', text3: '', change_every: 4, hidden_on_mobile: false}},
  {id: 'info', type: 'store_information', settings: {show_email: true, show_phone: true, hidden_on_mobile: true}},
  {id: 'loc', type: 'cur_lang', settings: {show_currency: true, show_language: true, hidden_on_mobile: true}},
];
const SEL = '#shopify-section-top_bar_KEfgRp', ID = 'top_bar_KEfgRp';
const clone = v => JSON.parse(JSON.stringify(v));

(async () => {
  const {chromium} = require('playwright');
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const part = name => !process.env.PART || process.env.PART.split(',').includes(name);
  const schemes = Object.entries(JSON.parse(L.read('config/settings.json')).shopify.color_schemes).map(([id, v]) => ({id, settings: v.settings}));
  const page = async (width, more = {}, extra = {}) => {
    const opts = {topbarBlocks: BLOCKS, ...more};
    const r = await L.renderPage(opts);
    const o = await L.open(browser, opts, width, extra);
    return {...o, r};
  };
  const base = r => { const s = clone(r.hctx.section.settings); return s; };
  const fixT = s => { if (typeof s.color_scheme === 'string') s.color_scheme = schemes.find(x => x.id === s.color_scheme) || schemes[0]; if (s.font && typeof s.font === 'string') s.font = {family: 'Assistant', fallback_families: 'sans-serif'}; return s; };
  try {
    /* the bar's own settings as rendered */
    const tbase = async () => { const r = await L.renderPage({topbarBlocks: BLOCKS}); const group = L.savedGroup().sections.top_bar_KEfgRp.settings; const d = Object.fromEntries(ts.settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default])); return {r, s: {...d, ...group}}; };
    const draw = async (p, r, settings, blocks) => L.redraw(p, ID, await r.render('topbar', fixT(clone(settings)), blocks || BLOCKS));
    const {s: T0} = await tbase();
    void base;

    /* ---------- 2. messages ---------- */
    if (part('messages')) {
      const {p, ctx, r} = await page(1366, {topbar: {change_every: 2, transition_speed: 200}});
      const m = await p.evaluate(sel => {
        const rot = document.querySelectorAll(sel + ' [data-tb-messages] announcement-rotator-v2');
        const slides = [...document.querySelectorAll(sel + ' [data-tb-messages] .topbar-message')];
        return {rot: rot.length, ids: slides.map(s => s.dataset.tbBlock), active: slides.findIndex(s => s.classList.contains('is-active')), link: slides[1].querySelector('a')?.getAttribute('href'), strong: !!slides[0].querySelector('strong'), own: getComputedStyle(slides[2].querySelector('.topbar-text--lg')).color, other: getComputedStyle(slides[1].querySelector('.topbar-text--lg')).color, legacy: document.querySelectorAll(sel + ' [data-tb-block="slider"] .topbar-message').length};
      }, SEL);
      ok(m.rot === 1 && m.ids.join() === 'm1,m2,m3' && m.active === 0, `one rotator holds the messages in block order (${JSON.stringify(m)})`);
      ok(m.link === '/pages/shipping' && m.strong, 'a message keeps its link and its bold text');
      ok(m.own === 'rgb(210, 31, 60)' && m.other !== m.own, 'Custom colour paints its own message only');
      ok(m.legacy === 2, 'the three-message block still draws its own rotator');
      await p.waitForTimeout(2700);
      ok(await p.evaluate(sel => document.querySelector(sel + ' [data-tb-messages] announcement-rotator-v2').dataset.activeIndex, SEL) === '1', 'Time per message 2s: the next message after two seconds');
      await p.locator(SEL + ' [data-tb-messages] .topbar-slider-arrow--next').click();
      await p.waitForTimeout(400);
      ok(await p.evaluate(sel => document.querySelector(sel + ' [data-tb-messages] announcement-rotator-v2').dataset.activeIndex, SEL) === '2', 'the next arrow moves on');
      /* the bar's custom colours do not paint over a message's own */
      await L.emit(p, {section: ID, settings: {enable_custom_colors: true, custom_text_color: '#00aa00', custom_link_color: '#0000aa'}, live: true});
      await p.waitForTimeout(100);
      const c = await p.evaluate(sel => { const s = [...document.querySelectorAll(sel + ' [data-tb-messages] .topbar-message')]; return [getComputedStyle(s[2].querySelector('.topbar-text--lg')).color, getComputedStyle(s[0].querySelector('.topbar-text--lg')).color]; }, SEL);
      ok(c[0] === 'rgb(210, 31, 60)' && c[1] === 'rgb(0, 170, 0)', `custom bar colours reach the other messages, not the one with its own (${c})`);
      /* live: the message's own colour off and on */
      await L.emit(p, {section: ID, block: 'm3', settings: {enable_custom_style: false}, live: true});
      ok(await p.evaluate(sel => getComputedStyle(document.querySelector(sel + ' [data-tb-block="m3"] .topbar-text--lg')).color, SEL) === 'rgb(0, 170, 0)', 'Custom colour off: the message follows the bar');
      await L.emit(p, {section: ID, block: 'm3', settings: {enable_custom_style: true, text_color: '#123456'}, live: true});
      ok(await p.evaluate(sel => getComputedStyle(document.querySelector(sel + ' [data-tb-block="m3"] .topbar-text--lg')).color, SEL) === 'rgb(18, 52, 86)', 'Custom colour on again with a new colour, live');
      /* a redraw starts one rotator and one timer */
      await draw(p, r, {...T0, change_every: 2, transition_speed: 200});
      await draw(p, r, {...T0, change_every: 2, transition_speed: 200});
      await p.mouse.move(5, 880);
      await p.waitForTimeout(2600);
      const idx = await p.evaluate(sel => document.querySelector(sel + ' [data-tb-messages] announcement-rotator-v2').dataset.activeIndex, SEL);
      ok(idx === '1', `after two redraws the messages still turn once per two seconds (${idx})`);
      await ctx.close();
    }
    if (part('messages')) {
      /* phones: phone text, 44px arrows, no sideways scroll */
      const {p, ctx} = await page(375);
      const ph = await p.evaluate(sel => {
        const s = document.querySelector(sel + ' [data-tb-block="m1"]');
        const vis = [...s.querySelectorAll('.topbar-text')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.textContent.trim());
        const arrows = [...document.querySelectorAll(sel + ' [data-tb-messages] .topbar-slider-arrow')].map(b => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height), b.tagName]);
        return {vis, arrows, scroll: document.documentElement.scrollWidth};
      }, SEL);
      ok(ph.vis.join() === 'Free returns', `375 shows the phone text (${ph.vis})`);
      ok(ph.arrows.length === 2 && ph.arrows.every(([w, h, t]) => w >= 44 && h >= 44 && t === 'BUTTON'), `375 arrows are 44px buttons (${JSON.stringify(ph.arrows)})`);
      ok(ph.scroll <= 376, '375 no sideways scroll');
      await p.locator(SEL + ' [data-tb-messages] .topbar-slider-arrow--next').focus();
      await p.keyboard.press('Enter');
      await p.waitForTimeout(900);
      ok(await p.evaluate(sel => document.querySelector(sel + ' [data-tb-messages] announcement-rotator-v2').dataset.activeIndex, SEL) === '1', 'Enter on the next arrow moves on (keyboard)');
      ok(await p.evaluate(sel => [...document.querySelectorAll(sel + ' [data-tb-messages] .topbar-message')].map(s => s.getAttribute('aria-hidden') + (s.inert ? 'i' : '')).join(), SEL) === 'truei,false,truei', 'hidden messages are aria-hidden and inert');
      await ctx.close();
    }
    if (part('messages')) {
      /* reduced motion: no turning; off screen: paused */
      {
        const {p, ctx} = await page(1366, {topbar: {change_every: 2}}, {reduced: true});
        await p.mouse.move(5, 880);
        await p.waitForTimeout(2700);
        ok(await p.evaluate(sel => document.querySelector(sel + ' [data-tb-messages] announcement-rotator-v2').dataset.activeIndex, SEL) === '0', 'reduced motion: the messages do not turn by themselves');
        await p.locator(SEL + ' [data-tb-messages] .topbar-slider-arrow--next').click();
        await p.waitForTimeout(100);
        const st = await p.evaluate(sel => { const s = [...document.querySelectorAll(sel + ' [data-tb-messages] .topbar-message')]; return s.map(x => getComputedStyle(x).opacity).join(); }, SEL);
        ok(st === '0,1,0', `reduced motion: an arrow shows the next message at once (${st})`);
        await ctx.close();
      }
      {
        const {p, ctx} = await page(1366, {topbar: {change_every: 2, sticky_top: false}, header: {sticky_header_type: 'none'}});
        await p.mouse.move(5, 880);
        await p.evaluate(() => window.scrollTo(0, 1200));
        await p.waitForTimeout(2800);
        const off = await p.evaluate(sel => document.querySelector(sel + ' [data-tb-messages] announcement-rotator-v2').dataset.activeIndex, SEL);
        await p.evaluate(() => window.scrollTo(0, 0));
        await p.waitForTimeout(2600);
        const on = await p.evaluate(sel => document.querySelector(sel + ' [data-tb-messages] announcement-rotator-v2').dataset.activeIndex, SEL);
        ok(off === '0' && on === '1', `paused off screen, turning again on screen (${off} ${on})`);
        await ctx.close();
      }
      {
        /* two bars: an edit to one leaves the other */
        const {p, ctx} = await page(1366, {twoBars: {font_size: 15}});
        await L.emit(p, {section: ID, block: 'm2', settings: {text: 'Only the first bar'}, live: true});
        await L.emit(p, {section: ID, settings: {font_size: 22, uppercase: true, text_align: 'left'}, live: true});
        const t = await p.evaluate(id => [id, id + '_b'].map(x => { const s = document.querySelector('#shopify-section-' + x); return [s.querySelector('[data-tb-block="m2"] .topbar-text--lg').textContent, getComputedStyle(s.querySelector('.topbar-text--lg')).fontSize, getComputedStyle(s.querySelector('.topbar-text--lg')).textTransform]; }), ID);
        ok(t[0][0] === 'Only the first bar' && t[1][0] === 'Orders ship in two days', 'two bars: the message edit reaches one');
        ok(t[0][1] === '22px' && t[1][1] === '15px' && t[0][2] === 'uppercase' && t[1][2] === 'none', `two bars: section edits reach one (${JSON.stringify(t)})`);
        ok(await p.evaluate(() => document.querySelectorAll('[data-tb-messages] announcement-rotator-v2').length) === 2, 'two bars: a rotator each');
        await ctx.close();
      }
    }

    /* ---------- 3. every control after a redraw ---------- */
    if (part('sweep')) {
      const resolve = en => { const out = {}; for (const [k, v] of Object.entries(en)) { if (typeof v === 'string' && v.startsWith('__other__:')) out[k] = ts.settings.find(x => x.id === k).options.find(o => o.value !== v.slice(10)).value; else out[k] = v; } return out; };
      const sweep = async (width, only) => {
        const {p, ctx, r} = await page(width);
        const missed = [];
        const sig = async () => { await p.mouse.move(5, 880); return L.signature(p, SEL); };
        for (const s of ts.settings) {
          if (!s.id || s.hidden || s.id === 'reveal' || (only && !only.includes(s.id))) continue;
          /* a value that only shows next to another: a border needs a width, Custom position an offset, Remove spacing some margins */
          const NEXT = {border_position: {border_width: 2}, enable_custom_position: {desktop_horizontal_offset: 10}, reset_spacing: {section_margin_top_desktop: 12, section_margin_top_mobile: 12}};
          const en = {...(NEXT[s.id] || {}), ...resolve(L.enabling(s) || {})};
          const b0 = {...T0, ...en};
          await draw(p, r, b0);
          const a = await sig();
          await draw(p, r, {...b0, [s.id]: L.changed(s, b0[s.id], {schemes})});
          const b = await sig();
          if (!L.diff(a, b).length) missed.push(s.id); else checks++;
        }
        for (const bt of ts.blocks) {
          const idx = BLOCKS.findIndex(b => b.type === bt.type);
          for (const s of bt.settings) {
            if (!s.id || s.hidden || (only && !only.includes(bt.type + '.' + s.id))) continue;
            const en = {...(bt.type === 'message' && s.id === 'enable_custom_style' ? {text_color: '#123456'} : {}), ...(L.enabling(s, 'block') || {})};
            const A = clone(BLOCKS); Object.assign(A[idx].settings, en);
            await draw(p, r, T0, A);
            const a = await sig();
            const B = clone(A); B[idx].settings[s.id] = L.changed(s, A[idx].settings[s.id], {schemes});
            await draw(p, r, T0, B);
            const b = await sig();
            if (!L.diff(a, b).length) missed.push(bt.type + '.' + s.id); else checks++;
          }
        }
        await ctx.close();
        return missed;
      };
      const late = await sweep(1366);
      const missed = late.length ? await sweep(375, late) : [];
      assert.deepEqual(missed, [], 'top bar settings with no effect after a redraw: ' + missed.join(', '));
    }

    /* ---------- 4. live equals redraw ---------- */
    const LIVE = {
      color_scheme: schemes.find(s => s.id !== T0.color_scheme).id, section_width: 'container', sticky_top: true, show_mobile: false, text_align: 'left', uppercase: true, font_size: 18,
      font_weight: 'heading_weight', letter_spacing: 2, border_position: 'both', border_width: 3, show_arrows_mobile: false, transition_speed: 300, change_every: 9,
      padding_top: 40, padding_bottom: 36, enable_custom_position: true, enable_custom_colors: true,
    };
    const DEP = [[{border_width: 2}, {border_position: 'top'}], [{enable_custom_position: true}, {desktop_horizontal_offset: 12}], [{enable_custom_colors: true}, {custom_bg_color: '#fff3bf', custom_text_color: '#212529', custom_link_color: '#0b7285', custom_arrow_color: '#d21f3c', border_color: '#d21f3c'}],
      [{reset_spacing: false}, {section_margin_top_desktop: 14, section_margin_bottom_desktop: 18, section_margin_top_mobile: 6, section_margin_bottom_mobile: 8}], [{}, {enable_custom_fonts: true}], [{enable_custom_fonts: true}, {font: {family: 'Georgia', fallback_families: 'serif'}}], [{enable_custom_fonts: true}, {enable_custom_fonts: false}]];
    const BL = {
      m1: {text: 'Free returns, <em>always</em>', text_mobile: 'Returns are free'}, m2: {text: 'Ships fast', link: '/pages/fast'}, m3: {enable_custom_style: false},
      slider: {text1: 'First legacy', text2_mobile: 'Second on phones', change_every: 7, hidden_on_mobile: true},
      info: {hidden_on_mobile: false}, loc: {hidden_on_mobile: false}, social: {hidden_on_mobile: false},
    };
    for (const width of part('live') ? [1366, 375] : []) {
      const {p, ctx, r} = await page(width);
      const settle = () => p.waitForTimeout(600); /* the colour runtime pauses link transitions for 500ms while dragging */
      const one = async (label, s0, change, block) => {
        await draw(p, r, s0);
        await p.mouse.move(5, 880);
        const before = await L.signature(p, SEL, false);
        await L.emit(p, block ? {section: ID, block: block[0], settings: block[1], live: true} : {section: ID, settings: change, live: true});
        await settle();
        const live = await L.signature(p, SEL, false);
        let blocks = BLOCKS;
        if (block) { blocks = clone(BLOCKS); Object.assign(blocks.find(b => b.id === block[0]).settings, block[1]); }
        await draw(p, r, block ? s0 : {...s0, ...change}, blocks);
        await p.mouse.move(5, 880);
        const after = await L.signature(p, SEL, false);
        const d = L.diff(live, after);
        ok(d.length === 0, `${width} live ${label} equals the redraw\n` + L.explain(d));
        if (block && block[1].link) ok(await p.evaluate(([sel, id]) => document.querySelector(sel + ' [data-tb-block="' + id + '"] a').getAttribute('href'), [SEL, block[0]]) === block[1].link, `${width} ${label}: the link`);
        return L.diff(before, live).length;
      };
      const flat = [];
      for (const [k, v] of Object.entries(LIVE)) if (!await one(k, T0, {[k]: v})) flat.push(k);
      for (const [dep, set] of DEP) for (const [k, v] of Object.entries(set)) if (!await one(k + ' with ' + JSON.stringify(dep), {...T0, ...dep}, {[k]: v})) flat.push(k);
      for (const [bid, set] of Object.entries(BL)) for (const [k, v] of Object.entries(set)) if (!await one(bid + '.' + k, T0, null, [bid, {[k]: v}])) flat.push(bid + '.' + k);
      await one('several at once', T0, {font_size: 16, letter_spacing: 1, uppercase: true, padding_top: 20});
      /* store details and pickers off: hidden at once, left out by the redraw */
      if (width > 1024) for (const [bid, k, q] of [['info', 'show_email', 'a[href^="mailto:"]'], ['info', 'show_phone', 'a[href^="tel:"]'], ['loc', 'show_currency', 'localization-form:has(input[name="country_code"])'], ['loc', 'show_language', 'localization-form:has(input[name="language_code"])']]) {
        await draw(p, r, T0);
        await L.emit(p, {section: ID, block: bid, settings: {[k]: false}, live: true});
        const live = await p.evaluate(([sel, q]) => { const e = document.querySelector(sel + ' ' + q); return e && getComputedStyle(e).display; }, [SEL, q]);
        const blocks = clone(BLOCKS); blocks.find(b => b.id === bid).settings[k] = false;
        await draw(p, r, T0, blocks);
        const gone = await p.evaluate(([sel, q]) => !document.querySelector(sel + ' ' + q), [SEL, q]);
        ok(live === 'none' && gone, `${width} ${bid}.${k} off: hidden live, left out after the redraw`);
      }
      /* Show navigation arrows off: hidden at once, left out by the redraw, the messages in the same place */
      {
        await draw(p, r, T0);
        await L.emit(p, {section: ID, settings: {show_arrows: false}, live: true});
        const box = () => p.evaluate(sel => { const a = [...document.querySelectorAll(sel + ' .topbar-slider-arrow')].filter(b => getComputedStyle(b).display !== 'none').length; const t = document.querySelector(sel + ' [data-tb-block="m1"] .topbar-text-cell').getBoundingClientRect(); return {a, x: Math.round(t.x), w: Math.round(t.width)}; }, SEL);
        const live = await box();
        await draw(p, r, {...T0, show_arrows: false});
        const after = await box();
        ok(live.a === 0 && after.a === 0 && live.x === after.x && live.w === after.w, `${width} Show navigation arrows off: live ${JSON.stringify(live)} = redraw ${JSON.stringify(after)}`);
      }
      /* values seen only on scroll, on phones / desktop, or by the timer */
      const quiet = ['font_weight', 'border_position', 'm2.link', 'sticky_top', 'transition_speed', 'change_every', 'slider.change_every', 'enable_custom_position', 'show_arrows_mobile', 'm3.enable_custom_style'];
      const shown = flat.filter(k => !quiet.includes(k) && !(width > 1024 ? /mobile|text_mobile/.test(k) : /desktop|horizontal_offset|^show_mobile$/.test(k)));
      assert.deepEqual(shown.filter(k => !(width < 1025 && /^(info|loc|social)\./.test(k)) && !(width > 1024 && /hidden_on_mobile|show_mobile/.test(k))), [], `${width}: live values that changed nothing: ${shown.join(', ')}`);
      await ctx.close();
    }

    /* ---------- 5. typography under the theme priority ---------- */
    for (const width of part('font') ? [1366, 375] : []) {
      const {p, ctx, r} = await page(width);
      const read = () => p.evaluate(sel => { const e = document.querySelector(sel + ' [data-tb-block="m2"] .topbar-text' + (innerWidth < 768 ? '--sm' : '--lg')), c = getComputedStyle(e), sw = document.querySelector(sel + ' localization-form button span'); return {font: c.fontFamily, size: c.fontSize, weight: c.fontWeight, ls: c.letterSpacing, tt: c.textTransform, sw: sw ? getComputedStyle(sw).fontFamily : ''}; }, SEL);
      await draw(p, r, T0);
      const theme = await read();
      ok(!/Georgia/.test(theme.font), `${width} theme body font by default (${theme.font})`);
      const on = {...T0, enable_custom_fonts: true, font: {family: 'Georgia', fallback_families: 'serif'}, font_size: 19, font_weight: 'heading_weight', letter_spacing: 2, uppercase: true};
      await draw(p, r, on);
      const red = await read();
      ok(/^Georgia/.test(red.font) && red.size === '19px' && red.ls === '2px' && red.tt === 'uppercase', `${width} redraw: font, size, spacing and case win (${JSON.stringify(red)})`);
      const hw = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--heading-weight').trim());
      ok(red.weight === String(hw || red.weight) && red.weight !== '', `${width} redraw: Font weight Heading gives the heading weight (${red.weight} / theme ${hw})`);
      await draw(p, r, T0);
      await L.emit(p, {section: ID, settings: {enable_custom_fonts: true, font: {family: 'Georgia', fallback_families: 'serif'}, font_size: 19, font_weight: 'heading_weight', letter_spacing: 2, uppercase: true}, live: true});
      ok(JSON.stringify(await read()) === JSON.stringify(red), `${width} live: the same as the redraw`);
      await L.emit(p, {section: ID, settings: {enable_custom_fonts: false}, live: true});
      ok((await read()).font === theme.font, `${width} live off: the theme font is back`);
      await draw(p, r, {...on, enable_custom_fonts: false});
      ok((await read()).font === theme.font, `${width} redraw off: the theme font is back`);
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log(`${checks} top bar round 5 checks passed (schema, messages and rotator, every control after a redraw, live equals redraw at 1366 and 375, typography priority)`);
})().catch(e => { console.error(e); process.exit(1); });
