/* Inline Image Heading, Quote Banner and Scrolling Text on the theme (live-text.js).
   Schema, theme inheritance, scheme switch, custom styles, every control (live and
   redraw), two instances, added blocks, no image reload or marquee restart, first
   paint equal to hydrated paint, reduced motion, 375/1366, editor and storefront.
   Run: LIQUIDJS=<path> node tests/theme-text-live.cjs [names...] */
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const NAMES = ['inline-image-heading', 'quotebanner', 'scrolling-text'];
const ASSETS = ['live-text.js'];
const F = family => ({family});
const IMG = 'https://cdn.test/picture.png';
const COLLECTION = {title: 'Summer', handle: 'summer', url: '/collections/summer', image: IMG, products: [], products_count: 0};
const BASE = 'body{display:block}';

/* What a section is made of: [selector, property, theme value, custom value, setting that changes it]. */
const COLOURS = {
  'inline-image-heading': {section: [['.iih', 'backgroundColor', 'rgb(24, 32, 40)', 'section_background'], ['.iih__heading', 'color', 'rgb(255, 255, 255)', 'heading_color']], blocks: {eyebrow: [['.iih__eyebrow', 'color', 'rgb(204, 204, 204)', 'color']]}},
  quotebanner: {section: [['.quote-banner', 'backgroundColor', 'rgb(24, 32, 40)', 'section_bg'], ['.qb-card', 'backgroundColor', 'rgb(255, 255, 255)', 'bg_color']], blocks: {quote: [['.qb-quote', 'color', 'rgb(24, 32, 40)', 'quote_color']], author: [['.qb-author', 'color', 'rgb(24, 32, 40)', 'author_color']]}},
  'scrolling-text': {section: [['.stm__item', 'color', 'rgb(204, 204, 204)', 'text_color']], toggle: 'use_custom_text_color', blocks: {word: [['.stm__item', 'color', 'rgb(204, 204, 204)', 'color']]}},
};
const THEME = {
  'inline-image-heading': [['.iih__heading', 'fontFamily', 'Georgia'], ['.iih__eyebrow', 'fontFamily', 'Arial'], ['.iih__heading', 'fontWeight', '700']],
  quotebanner: [['.qb-quote', 'fontFamily', 'Georgia'], ['.qb-author-name', 'fontFamily', 'Arial'], ['.qb-card', 'borderRadius', '8px']],
  'scrolling-text': [['.stm__item', 'fontFamily', 'Georgia'], ['.stm__item', 'fontWeight', '700']],
};
const SCHEME_ROOT = {'inline-image-heading': '.iih', quotebanner: '.quote-banner', 'scrolling-text': '.stm'};

/* Extra settings a control needs before it can show (beyond its visible_if). */
const NEEDS = {
  reset_spacing: {section: {section_margin_top_desktop: 40, section_margin_top_mobile: 40}},
  separator_size: {section: {separator: 'dot'}}, separator_color: {section: {separator: 'dot', use_custom_text_color: true}},
  border_color: {section: {show_borders: true, use_custom_text_color: true}},
  text_max_width: {value: 600}, custom_max_width: {value: 700},
  'author.signature_image': {blocks: {author: {enable_signature: true}}},
  'author.signature_position': {blocks: {author: {enable_signature: true, signature_image: IMG}}}, 'author.signature_size_desktop': {blocks: {author: {enable_signature: true, signature_image: IMG, signature_position: 'below'}}},
  'author.signature_size_mobile': {blocks: {author: {enable_signature: true, signature_image: IMG}}}, 'author.enable_signature': {blocks: {author: {signature_image: IMG}}},
  'author.avatar_size': {blocks: {author: {avatar: IMG}}},
  'image.size_override': {value: 120}, 'image.collection': {value: COLLECTION},
  heading_line_height: {value: '1.4'}, line_height: {value: 150},
  font_weight: {value: '300'},
  section_margin_top_desktop: {section: {reset_spacing: false}}, section_margin_bottom_desktop: {section: {reset_spacing: false}}, section_margin_top_mobile: {section: {reset_spacing: false}}, section_margin_bottom_mobile: {section: {reset_spacing: false}},
  /* A custom styling switch shows only with a colour picked. */
  enable_custom_style: {section: {section_background: '#ff0000', heading_color: '#ff0000', section_bg: '#ff0000', bg_color: '#ff0000'}}, use_custom_text_color: {section: {text_color: '#ff0000'}},
  'eyebrow.enable_custom_style': {blocks: {eyebrow: {color: '#ff0000'}}}, 'quote.enable_custom_style': {blocks: {quote: {quote_color: '#ff0000'}}}, 'author.enable_custom_style': {blocks: {author: {author_color: '#ff0000'}}}, 'word.enable_custom_style': {blocks: {word: {color: '#ff0000'}}},
};
/* Controls that need the next redraw (structure), not a live paint. */
const REDRAW_ONLY = new Set(['repeat_count', 'reveal']);
/* Controls seen only on hover. */
const HOVER = {pause_on_hover: '.stm__viewport'};

const widthFor = id => /mobile|_m$/.test(id) ? 375 : /^(section_)?width$/.test(id) ? 1700 : 1366;
function changed(x, current) {
  const n = NEEDS[x.id];
  if (n && 'value' in n) return n.value;
  switch (x.type) {
    case 'checkbox': return !current;
    case 'range': return current === x.max ? x.min : x.max;
    case 'select': case 'radio': return x.options.find(o => o.value !== current).value;
    case 'color': return '#ff0000';
    case 'color_scheme': return 'alt-scheme';
    case 'font_picker': return F('Tahoma');
    case 'image_picker': return IMG;
    case 'collection': return COLLECTION;
    case 'richtext': return '<p>Changed words</p>';
    default: return 'Changed words';
  }
}
/* {{ section.settings.a and block.settings.b == false and section.settings.c == 'x' }} -> settings that make it true */
function needsOf(visible) {
  const out = {section: {}, block: {}};
  if (!visible) return out;
  for (const term of visible.replace(/^\{\{\s*|\s*\}\}$/g, '').split(/\s+and\s+/)) {
    const m = term.match(/^(section|block)\.settings\.(\w+)(?:\s*==\s*(false|true|'[^']*'))?$/);
    if (!m) continue;
    out[m[1]][m[2]] = m[3] === undefined || m[3] === 'true' ? true : m[3] === 'false' ? false : m[3].slice(1, -1);
  }
  return out;
}
const merge = (rendered, type, settings) => rendered.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(b.type === type ? settings : {})}}));

async function print(t, hover) {
  if (hover) { await t.root(hover).first().hover(); await t.page.waitForTimeout(60); } else await t.page.mouse.move(0, 0);
  return t.page.evaluate(() => {
    /* Hold every animation at its start, so a moving row prints the same twice. */
    for (const a of document.getAnimations()) if (a.timeline instanceof DocumentTimeline) { a.pause(); a.currentTime = 0; }
    const wrap = document.querySelector('#shopify-section-test');
    return [wrap, ...wrap.querySelectorAll('*')].filter(e => !e.closest('svg') || e.tagName === 'svg').map(e => {
      const c = getComputedStyle(e), r = e.getBoundingClientRect(), before = getComputedStyle(e, '::before').content;
      return [e.tagName, e.getAttribute('href'), e.getAttribute('src'), e.hidden, e.getAttributeNames().filter(n => n.startsWith('data-') && !/settings|block-id/.test(n)).join(' '), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height),
        c.display, c.fontFamily, c.fontWeight, c.fontSize, c.lineHeight, c.letterSpacing, c.textTransform, c.color, c.backgroundColor, c.borderRadius, c.borderTopWidth, c.borderTopColor, c.boxShadow, c.padding, c.margin, c.textAlign, c.transform, c.maskImage || c.webkitMaskImage, c.animationDuration, c.animationDirection, c.animationPlayState, c.webkitTextStrokeWidth, c.webkitTextFillColor, before, e.childElementCount ? '' : e.textContent.trim().slice(0, 40)].join(',');
    }).join('|');
  });
}

(async () => {
  const only = process.argv.slice(2), names = NAMES.filter(n => !only.length || only.includes(n)), browser = await launch(), fails = [];
  let checks = 0;
  const ok = (cond, msg) => { if (cond) checks++; else fails.push(msg); };
  const css = (t, sel, prop) => t.root(sel).first().evaluate((e, k) => getComputedStyle(e)[k], prop);
  try {
    for (const name of names) {
      const {schema} = schemaOf(name);
      ok(schemaProblems(name).length === 0, `${name} schema: ${schemaProblems(name).join('; ')}`);
      const ids = schema.settings.filter(x => x.id).map(x => x.id);
      ok(ids[0] === 'color_scheme' && new Set(ids).size === ids.length, `${name}: color_scheme first, ids unique`);
      for (const width of [375, 1366]) for (const editing of [true, false]) {
        const where = `${name} ${width} ${editing ? 'editor' : 'storefront'}`;
        /* First paint equals the hydrated paint. */
        const cold = await mount(browser, name, {width, editing, assets: []}), warm = await mount(browser, name, {width, editing, assets: ASSETS});
        await warm.page.waitForTimeout(80);
        ok(await print(cold) === await print(warm), `${where}: first paint differs from hydrated paint`);
        await cold.page.close();
        const t = warm;
        await t.page.addStyleTag({content: BASE});
        /* Theme inheritance. */
        for (const [sel, prop, want] of THEME[name]) ok(await css(t, sel, prop) === want, `${where} theme ${sel} ${prop} = ${await css(t, sel, prop)}`);
        for (const [sel, prop, want] of COLOURS[name].section) ok(await css(t, sel, prop) === want, `${where} theme colour ${sel} ${prop} = ${await css(t, sel, prop)}`);
        /* Scheme switch, live and redraw. */
        await t.emit({color_scheme: 'alt-scheme'});
        ok(await t.root(SCHEME_ROOT[name]).first().evaluate(e => e.classList.contains('color-alt-scheme')), `${where} scheme class live`);
        if (name !== 'quotebanner' && name !== 'scrolling-text') ok(await css(t, SCHEME_ROOT[name], 'backgroundColor') === 'rgb(250, 250, 250)', `${where} alt scheme background live`);
        if (name === 'quotebanner') ok(await css(t, '.qb-card', 'backgroundColor') === 'rgb(16, 16, 16)', `${where} alt scheme card live`);
        if (name === 'scrolling-text') ok(await css(t, '.stm__item', 'color') === 'rgb(51, 51, 51)', `${where} alt scheme text live`);
        await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
        ok(await t.root(SCHEME_ROOT[name]).first().evaluate(e => e.classList.contains('color-default-color-scheme')), `${where} scheme back after redraw`);
        /* Custom colours on, then off: theme values come back. */
        const toggle = COLOURS[name].toggle || 'enable_custom_style', on = {[toggle]: true}, off = {[toggle]: false};
        for (const [, , , id] of COLOURS[name].section) on[id] = '#ff0000';
        await t.emit(on);
        for (const [sel, prop, , id] of COLOURS[name].section) ok(await css(t, sel, prop) === 'rgb(255, 0, 0)', `${where} custom ${id} live: ${await css(t, sel, prop)}`);
        await t.emit(off);
        for (const [sel, prop, want] of COLOURS[name].section) ok(await css(t, sel, prop) === want, `${where} custom off live ${sel}: ${await css(t, sel, prop)}`);
        await t.redraw({settings: on});
        for (const [sel, prop, , id] of COLOURS[name].section) ok(await css(t, sel, prop) === 'rgb(255, 0, 0)', `${where} custom ${id} redraw`);
        await t.redraw({settings: off});
        for (const [sel, prop, want] of COLOURS[name].section) ok(await css(t, sel, prop) === want, `${where} custom off redraw ${sel}`);
        for (const [type, list] of Object.entries(COLOURS[name].blocks)) {
          const id = t.blockId(type);
          for (const [sel, prop, want, key] of list) {
            await t.emit({enable_custom_style: true, [key]: '#00ff00'}, id);
            ok(await css(t, sel, prop) === 'rgb(0, 255, 0)', `${where} ${type} ${key} live`);
            await t.emit({enable_custom_style: false}, id);
            ok(await css(t, sel, prop) === want, `${where} ${type} custom off live: ${await css(t, sel, prop)}`);
            await t.redraw({blocks: merge(t.rendered[0], type, {enable_custom_style: true, [key]: '#00ff00'})});
            ok(await css(t, sel, prop) === 'rgb(0, 255, 0)', `${where} ${type} ${key} redraw`);
            await t.redraw({blocks: merge(t.rendered[0], type, {enable_custom_style: false})});
          }
        }
        ok(await t.noOverflow(), `${where} overflows`);
        ok(t.errors.length === 0, `${where} errors: ${t.errors.join('; ')}`);
        await t.page.close();
      }
      /* Every control, live and after a redraw, at its own width. */
      const lists = [[null, schema.settings]].concat((schema.blocks || []).map(b => [b.type, b.settings]));
      for (const [type, list] of lists) for (const x of list.filter(x => x.id && !x.hidden && x.type !== 'header')) {
        const key = type ? type + '.' + x.id : x.id, extra = NEEDS[key] || NEEDS[x.id] || {}, vis = needsOf(x.visible_if), width = widthFor(x.id);
        const sectionPre = {...vis.section, ...(extra.section || {})}, blockPre = {...(type ? vis.block : {}), ...((extra.blocks || {})[type] || {})};
        const t = await mount(browser, name, {width, editing: false, assets: ASSETS, settings: sectionPre});
        await t.page.addStyleTag({content: BASE});
        if (type && !t.rendered[0].section.blocks.some(b => b.type === type)) { await t.page.close(); continue; }
        if (type) await t.redraw({blocks: merge(t.rendered[0], type, {...blockPre, ...((extra.blocks || {})[type] || {})})});
        for (const [bt, bs] of Object.entries(extra.blocks || {})) if (bt !== type) await t.redraw({blocks: merge(t.rendered[0], bt, bs)});
        const current = type ? t.rendered[0].section.blocks.find(b => b.type === type).settings[x.id] : t.rendered[0].section.settings[x.id], value = changed(x, current);
        const before = await print(t, HOVER[x.id]);
        if (!REDRAW_ONLY.has(x.id)) {
          if (type) for (const b of t.rendered[0].section.blocks.filter(b => b.type === type)) await t.emit({[x.id]: value}, b.id); else await t.emit({[x.id]: value});
          await t.page.waitForTimeout(40);
          ok(await print(t, HOVER[x.id]) !== before, `${name} ${key} at ${width}: live edit changes nothing`);
          if (type) for (const b of t.rendered[0].section.blocks.filter(b => b.type === type)) await t.emit({[x.id]: b.settings[x.id] ?? null}, b.id); else await t.emit({[x.id]: current ?? null});
          await t.page.waitForTimeout(40);
          ok(await print(t, HOVER[x.id]) === before, `${name} ${key} at ${width}: live edit back does not restore`);
        }
        if (type) await t.redraw({blocks: merge(t.rendered[0], type, {[x.id]: value})}); else await t.redraw({settings: {[x.id]: value}});
        ok(await print(t, HOVER[x.id]) !== before, `${name} ${key} at ${width}: redraw changes nothing`);
        ok(t.errors.length === 0, `${name} ${key}: ${t.errors.join('; ')}`);
        await t.page.close();
      }
      /* Two instances stay apart; an added block renders, is live, and a redraw sets up once. */
      const pair = await mount(browser, name, {width: 1366, assets: ASSETS, instances: [{uid: 'test'}, {uid: 'second'}]});
      const bg = uid => pair.page.locator(`#shopify-section-${uid} ${SCHEME_ROOT[name]}`).evaluate(e => e.className);
      const other = await bg('second');
      await pair.emit({color_scheme: 'alt-scheme'});
      ok((await bg('test')).includes('color-alt-scheme') && await bg('second') === other, `${name}: an edit to one instance reaches the other`);
      const extraType = {'inline-image-heading': 'text', quotebanner: 'author', 'scrolling-text': 'word'}[name];
      if (name !== 'quotebanner') {
        await pair.redraw({blocks: pair.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([{type: extraType, settings: {text: 'Added'}}])});
        const added = pair.rendered[0].section.blocks.at(-1).id;
        ok(await pair.page.locator(`#shopify-section-test [data-lt-block="${added}"]`).count() > 0, `${name}: added block renders`);
        await pair.emit({text: 'Edited'}, added);
        ok((await pair.page.locator(`#shopify-section-test [data-lt-block="${added}"]`).first().textContent()).includes('Edited'), `${name}: added block is live`);
      }
      for (let i = 0; i < 3; i++) await pair.redraw();
      ok(await pair.page.evaluate(() => window.MateriaLiveText.count()) === 2, `${name}: redraws keep one controller entry per section`);
      ok(pair.errors.length === 0, `${name} pair: ${pair.errors.join('; ')}`);
      await pair.page.close();
      /* Reduced motion: still, and everything visible. */
      const still = await mount(browser, name, {width: 375, editing: false, assets: ASSETS, reducedMotion: 'reduce'});
      ok(await still.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test *')].every(e => e.getAnimations().length === 0)), `${name}: animations run under reduced motion`);
      ok(await still.root().evaluate(e => e.getBoundingClientRect().height > 40 && getComputedStyle(e).opacity === '1'), `${name}: hidden under reduced motion`);
      await still.page.close();
    }
    /* No picture reload on an unrelated edit. */
    {
      const t = await mount(browser, 'inline-image-heading', {width: 1366, assets: ASSETS, blocks: [{type: 'text', settings: {text: 'Made'}}, {type: 'image', settings: {image: IMG}}, {type: 'text', settings: {text: 'here'}}]});
      const img = await t.root('.iih__img').first().elementHandle(), src = await img.getAttribute('src');
      await t.emit({heading_size: 80, enable_custom_style: true, heading_color: '#ff0000'});
      ok(await img.evaluate(e => e.isConnected) && await img.getAttribute('src') === src, 'inline-image-heading: picture reloaded on an unrelated edit');
      await t.page.close();
    }
    /* The scrolling row keeps moving through unrelated edits (same animation, time keeps growing). */
    {
      const t = await mount(browser, 'scrolling-text', {width: 1366, editing: false, assets: ASSETS});
      await t.page.waitForTimeout(200);
      const first = await t.page.evaluate(() => { const a = document.querySelector('#shopify-section-test .stm__track').getAnimations()[0]; window.__stm = a; return a.currentTime; });
      await t.emit({use_custom_text_color: true, text_color: '#ff0000', letter_spacing: 2});
      await t.emit({text: 'Changed'}, t.blockId('word'));
      await t.page.waitForTimeout(150);
      ok(await t.page.evaluate(t0 => { const a = document.querySelector('#shopify-section-test .stm__track').getAnimations()[0]; return a === window.__stm && a.currentTime > t0; }, first), 'scrolling-text: an edit restarted the movement');
      ok((await t.root('.stm__track').first().textContent()).includes('Changed'), 'scrolling-text: word text not live');
      /* Off screen the row stops. */
      await t.page.evaluate(() => { document.body.style.paddingTop = '3000px'; });
      await t.page.waitForTimeout(250);
      ok(await t.root('.stm').evaluate(e => e.hasAttribute('data-lt-offscreen')), 'scrolling-text: keeps moving off screen');
      await t.page.close();
    }
  } finally { await browser.close(); }
  if (fails.length) { console.error(fails.slice(0, 80).join('\n') + (fails.length > 80 ? `\n... ${fails.length - 80} more` : '')); console.error(`${fails.length} failed, ${checks} passed`); process.exit(1); }
  console.log(`${checks} live-text schema, theme, scheme, custom style, every-control, instance, block, reload, motion and first-paint checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
