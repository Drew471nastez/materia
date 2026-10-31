/* Image & Video with Text, Image & Video Benefits, Image With Text Benefits and
   Image & Text Dual: schema, theme inheritance, every control (live and after a
   server redraw, at 375 and 1366), first paint, instances, lifecycle, carousel,
   reduced motion and the four saved Image & Video with Text instances.

   LIQUIDJS=<path to liquidjs> node tests/theme-media-benefits.cjs [section ...] */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems, THEME_VARS} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const ASSET = 'media-live-benefits.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const VID = {sources: [{url: 'https://theme.test/up.mp4', mime_type: 'video/mp4'}]};
const VURL = 'https://theme.test/clip.mp4';
const SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><path d="M2 2h4"/></svg>';
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);
const media = (n, extra = {}) => Array.from({length: n}, () => ({type: 'media', settings: {media_type: 'image', ...extra}}));

/* Per section: the base blocks every case starts from, which settings only show at one width,
   extra prerequisites a control needs to be visible, and controls applied on redraw only. */
const CFG = {
  'image-and-video-text': {
    blocks: () => [{type: 'eyebrow'}, ...presetBlocks('image-and-video-text')],
    desk: ['image_position', 'text_column_width', 'content_align'], mob: ['content_align_mobile', 'mobile_order'],
    pre: {image_fit: {image: IMG}, image_alt: {image: IMG}, video_autoplay: {video_url: VURL}, video_loop: {video_url: VURL}, video_controls: {video_url: VURL}, video_url: {}, media_type: {image: IMG, video_url: VURL}},
  },
  'image-text-benefits': {
    blocks: () => [...presetBlocks('image-text-benefits'), {type: 'button', settings: {label: 'Second'}}],
    desk: ['image_side', 'media_ratio', 'text_align'], mob: ['text_align_mobile', 'mobile_order'],
    pre: {media_fit: {image: IMG}, image_alt: {image: IMG}, video_autoplay: {video_url: VURL}, video_loop: {video_url: VURL}, video_controls: {video_url: VURL}, media_type: {image: IMG, video_url: VURL}},
    preBlock: {icon_type: {icon_image: IMG, icon_svg: SVG}},
  },
  'image-with-text-benefits': {
    blocks: () => [...presetBlocks('image-with-text-benefits'), {type: 'subheading'}],
    desk: ['media_position', 'media_column_width', 'content_align', 'text_max_width'], mob: ['content_align_mobile', 'mobile_order'],
    preBlocks: {per_row: b => [...media(3), ...b.filter(x => x.type !== 'media')], media_gap: b => [...media(3), ...b.filter(x => x.type !== 'media')],
      progress_height: b => [...media(3), ...b.filter(x => x.type !== 'media')], progress_margin: b => [...media(3), ...b.filter(x => x.type !== 'media')],
      progress_track: b => [...media(3), ...b.filter(x => x.type !== 'media')], progress_fill: b => [...media(3), ...b.filter(x => x.type !== 'media')],
      text_max_width: b => b.filter(x => x.type !== 'media')},
    pre: {per_row: {}, progress_height: {per_row: '1.2'}, progress_margin: {per_row: '1.2'}, progress_track: {per_row: '1.2'}, progress_fill: {per_row: '1.2'}, enable_custom_style: {per_row: '1.2'}},
    preBlock: {media_type: {image: IMG, video: VID, video_url: VURL}, alt: {image: IMG}, autoplay: {media_type: 'video_url', video_url: VURL}, muted: {media_type: 'video_url', video_url: VURL}, loop: {media_type: 'video_url', video_url: VURL}, show_controls: {media_type: 'video_url', video_url: VURL}, video_url: {media_type: 'video_url'},
      icon_source: {icon_image: IMG, icon_svg: SVG}},
    same: [['auto', '2.5']],
  },
  'dual-image-with-text': {
    blocks: () => [...presetBlocks('dual-image-with-text'), {type: 'eyebrow'}],
    desk: ['image_position', 'text_column_width', 'content_align', 'accent_image.size'], mob: ['content_align_mobile', 'mobile_order', 'hide_on_mobile', 'size_mobile'],
    preBlock: {fit: {image: IMG}, position_x: {image: IMG}, position_y: {image: IMG}, alt: {image: IMG}, border_color: {border_width: 6}, enable_custom_style: {border_width: 6}},
  },
};
const COMMON_PRE = {enable_custom_fonts: {heading_font: FONT, body_font: FONT}, heading_font: {heading_font: {family: 'Courier New'}, body_font: {family: 'Courier New'}}, body_font: {heading_font: {family: 'Courier New'}, body_font: {family: 'Courier New'}}};
const EXEMPT = ['video', 'media_type=video']; /* the fixture's video_tag draws an empty <video>, a live edit draws the real one */
const STRUCTURAL = ['reset_spacing']; /* the neighbour sections' spacing changes on the builder's redraw */
const WIDE = ['section_width']; /* only differs on screens wider than the page width */

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return [/alt$/.test(x.id) ? 'Described image' : 'Edited text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'textarea': return [SVG];
    case 'url': return [x.id === 'video_url' ? VURL : '/pages/test'];
    case 'image_picker': return [IMG];
    case 'video': return [VID];
    case 'font_picker': return [FONT];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* Settings a control's visible_if asks for, plus all colours when it is a custom styling toggle. */
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (x.id === 'enable_custom_style') for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  return out;
}

async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'textTransform', 'textAlign', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'flexDirection', 'order', 'alignItems', 'borderTopLeftRadius', 'aspectRatio', 'objectFit', 'objectPosition', 'opacity', 'display', 'gridTemplateColumns', 'transform', 'zIndex', 'boxShadow', 'borderTopWidth', 'borderTopColor', 'top', 'left', 'right', 'bottom', 'width', 'height', 'maxWidth'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-mlb-root]'), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template') || e.ownerSVGElement) continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset && e.dataset.mlbBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const p of P) o[p] = cs[p];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        for (const v of ['--mb-hover-bg', '--mb-hover-text', '--mb-hover-border']) o[v] = cs.getPropertyValue(v).trim();
        if (!e.children.length || /^(H\d|P|A|BUTTON)$/.test(e.tagName)) o.text = e.textContent.trim().slice(0, 80);
        o.tag = e.tagName;
        for (const a of ['href', 'alt', 'data-autoplay', 'data-theme-button', 'type']) o[a] = e.getAttribute(a);
        if (e.tagName === 'IMG' || e.tagName === 'VIDEO') o.src = (e.getAttribute('src') || '').split('?')[0];
        if (e.tagName === 'VIDEO') { o.loop = e.hasAttribute('loop'); o.controls = e.hasAttribute('controls'); o.muted = e.muted; }
        if (/icon/.test(cls)) o.sig = [...e.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse,img')].map(n => n.tagName + (n.getAttribute('d') || n.getAttribute('cx') || n.getAttribute('points') || (n.getAttribute('src') || '').split('?')[0])).join('|');
        const a = getComputedStyle(e, '::after'); if (a.content !== 'none') o.after = [a.content, a.opacity, a.backgroundColor].join();
        o.blk = e.closest('[data-mlb-block]')?.dataset.mlbBlock || '';
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, paddingTop: w.paddingTop, paddingBottom: w.paddingBottom, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaMediaBenefits.audit(document.querySelector('#shopify-section-' + u + ' [data-mlb-root]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const SPACING = '.shopify-section{padding-top:7px;padding-bottom:7px}';

/* Every non-hidden control: change it live, then redraw with it; check the right element changes,
   the live result equals the server result, the markup equals what the controller derives, and
   desktop/mobile controls change only at their own width. Select options must all look different. */
async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  const t = await mount(browser, name, {width: WIDE.length && width > 1400 ? width : width, editing: true, blocks: cfg.blocks(), assets: [ASSET]});
  await t.page.addStyleTag({content: SPACING}); await addFp(t.page);
  const base = clone(t.section.settings);
  for (const x of schema.settings) if (x.id && !(x.id in base)) base[x.id] = '';
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { assert.ok(i >= 0, name + ': no base block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  const covered = new Set();
  for (const c of cases) {
    const {x} = c, wide = WIDE.includes(x.id);
    if (wide && width !== 1366) continue;
    if (wide) await t.page.setViewportSize({width: 1700, height: 900});
    let blocks0 = clone(baseBlocks), S = {...clone(base), ...(c.scope < 0 ? COMMON_PRE[x.id] || {} : {})};
    if (cfg.preBlocks?.[x.id] && c.scope < 0) blocks0 = cfg.preBlocks[x.id](blocks0);
    const bi = c.scope < 0 ? -1 : c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    const pre = {...prereq(x, c.list, bBase), ...(c.scope < 0 ? cfg.pre?.[x.id] || {} : cfg.preBlock?.[x.id] || {})};
    if (bi >= 0) Object.assign(blocks0[bi].settings, pre); else Object.assign(S, pre);
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const isDesk = cfg.desk.includes(x.id) || cfg.desk.includes(c.btype + '.' + x.id) || /_desktop$/.test(x.id), isMob = cfg.mob.includes(x.id) || /_mobile$/.test(x.id);
    const shows = !(isDesk && width < 900 && !(name === 'image-text-benefits' && width >= 768)) && !(isMob && width >= 900);
    await t.redraw({settings: S, blocks: blocks0});
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + x.id + ' base markup matches controller');
    const cur = bi >= 0 ? blocks0[bi].settings[x.id] : S[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of valuesFor(x, cur)) {
      const tag = name + ' @' + width + ' ' + (c.btype ? c.btype + '.' : '') + x.id + '=' + JSON.stringify(v).slice(0, 40);
      await t.redraw({settings: S, blocks: blocks0});
      await t.emit({[x.id]: v}, blockId);
      const fpL = await fp(t);
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1});
      const fpR = await fp(t);
      if (!EXEMPT.includes(x.id) && !EXEMPT.includes(x.id + '=' + v)) eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR), dL = diff(fp0, fpL);
      if (shows) {
        ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (bi < 0 && /^section_margin/.test(x.id)) ok(dR.includes('wrap'), tag + ': margin not on the section');
        if (bi < 0 && /^(padding_|side_padding|section_bg|color_scheme)/.test(x.id)) ok(dR.some(k => /^DIV\.(ivt|ivb|iwb|itd)#1$/.test(k)), tag + ': not on the section root');
        if (!STRUCTURAL.includes(x.id) && !EXEMPT.includes(x.id) && !EXEMPT.includes(x.id + '=' + v)) {
          const d = diff(fpL, fpR);
          eq(d.map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(fpL[k] || {}).filter(([p, val]) => JSON.stringify(val) !== JSON.stringify((fpR[k] || {})[p]))))), [], tag + ': live differs from redraw');
        }
        seen.push([JSON.stringify(v), fpR]);
      } else {
        eq(dR, [], tag + ': changes at the wrong width (redraw)');
        eq(dL, [], tag + ': changes at the wrong width (live)');
      }
      covered.add((c.btype ? c.btype + '.' : '') + x.id);
    }
    if (x.type === 'select' && shows) {
      for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
        if ((cfg.same || []).some(([a, b]) => [a, b].includes(JSON.parse(seen[i][0])) && [a, b].includes(JSON.parse(seen[j][0])))) continue;
        ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' ' + x.id + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
      }
    }
    if (wide) await t.page.setViewportSize({width, height: 900});
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered.size;
}

/* Theme inheritance, schemes, custom styling, fonts, first paint, buttons, overflow. */
async function theme(browser, name, width, editing) {
  const cfg = CFG[name], tag = name + ' @' + width + (editing ? ' editor' : ' storefront');
  const t = await mount(browser, name, {width, editing, blocks: cfg.blocks(), assets: []});
  await addFp(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(150);
  eq(diff(before, await fp(t)), [], tag + ': first paint equals hydrated paint');
  eq(await audit(t), [], tag + ': markup matches controller');
  const root = '[data-mlb-root]';
  eq(await t.css(root, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  eq(await t.css('.mlb__heading', 'color'), 'rgb(255, 255, 255)', tag + ' heading colour');
  ok(/^Georgia/.test(await t.css('.mlb__heading', 'fontFamily')), tag + ' heading font');
  ok(/^Arial/.test(await t.css('.mlb__sub', 'fontFamily')), tag + ' body font');
  eq(await t.css('.mlb__sub', 'color'), 'rgb(204, 204, 204)', tag + ' text colour');
  const hasBtn = await t.root('.mlb__btn').count() > 0;
  if (hasBtn) {
  eq(await t.css('.mlb__btn', 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
  eq(await t.css('.mlb__btn', 'borderTopLeftRadius'), '12px', tag + ' button radius');
  await t.root('.mlb__btn').first().hover(); await t.page.waitForTimeout(30);
  eq(await t.css('.mlb__btn', 'backgroundColor'), 'rgb(255, 0, 0)', tag + ' button hover');
  await t.page.mouse.move(0, 0);
  ok((await t.root('.mlb__btn').first().boundingBox()).height >= 44, tag + ' button target');
  }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  eq(await t.page.evaluate(() => document.querySelectorAll('template[data-mlb-icon]').length > 0), editing && name.includes('benefits'), tag + ' live icon list only in the builder');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'});
    eq(await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    eq(await t.css('.mlb__heading', 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    const hid = t.blockId('heading'), bid = t.blockId('button');
    await t.emit({enable_custom_style: true, section_bg: '#abcdef', text_color: '#010203'});
    await t.emit({enable_custom_style: true, color: '#cc0033'}, hid);
    if (hasBtn) await t.emit({enable_custom_style: true, bg: '#00ff00', color: '#000000', bg_hover: '#0000ff'}, bid);
    eq(await t.css(root, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background');
    eq(await t.css('.mlb__heading', 'color'), 'rgb(204, 0, 51)', tag + ' custom heading');
    if (hasBtn) eq(await t.css('.mlb__btn', 'backgroundColor'), 'rgb(0, 255, 0)', tag + ' custom button');
    await t.emit({enable_custom_fonts: true, heading_font: {family: 'Arial'}, body_font: {family: 'Verdana'}});
    ok(/^Arial/.test(await t.css('.mlb__heading', 'fontFamily')), tag + ' custom heading font');
    ok(/^Verdana/.test(await t.css('.mlb__sub', 'fontFamily')), tag + ' custom body font');
    await t.emit({enable_custom_style: false, enable_custom_fonts: false});
    await t.emit({enable_custom_style: false}, hid); if (hasBtn) await t.emit({enable_custom_style: false}, bid);
    eq(diff(before, await fp(t)), [], tag + ': toggles off restore the theme exactly');
    if (hasBtn) eq(await t.css('.mlb__btn', 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' theme button back');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

async function lifecycle(browser, name) {
  const cfg = CFG[name];
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const withImg = cfg.blocks().map(b => ['media', 'main_image'].includes(b.type) ? {...b, settings: {...b.settings, image: IMG}} : b);
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks: withImg, settings: {image: IMG, media_type: 'image'}}, {uid: 'b', blocks: cfg.blocks()}], assets: [ASSET]});
    await addFp(t.page);
    const b0 = await fp(t, 'b');
    await t.emit({padding_top_mobile: 12, padding_top_desktop: 12, enable_custom_style: true, section_bg: '#abcdef'}, undefined, 'a');
    await t.emit({text: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a');
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    eq(await t.page.locator('#shopify-section-a .mlb__heading').first().textContent(), 'Only in A', tag + ' heading A');
    /* no reload of an unchanged picture */
    const imgSel = name === 'image-with-text-benefits' ? '.iwb__slot img' : name === 'dual-image-with-text' ? '.itd__main img' : '.mlb__frame img';
    if (imgSel) {
      await t.page.evaluate(s => { document.querySelector('#shopify-section-a ' + s).__mark = 1; }, imgSel);
      await t.emit({content_gap: 30, padding_bottom_desktop: 10, section_margin_top_mobile: 5}, undefined, 'a');
      ok(await t.page.evaluate(s => document.querySelector('#shopify-section-a ' + s).__mark === 1, imgSel), tag + ': picture element kept');
    }
    /* redraws: one controller entry per root, added block drawn and live */
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    eq(await t.page.evaluate(() => window.MateriaMediaBenefits.roots.size), 2, tag + ': redraws leave one controller per section');
    const iwb = name === 'image-with-text-benefits';
    const blocks = [...withImg, {type: 'heading', settings: {text: 'Added heading'}}, iwb ? {type: 'footnote', settings: {text: 'Added note'}} : {type: 'button', settings: {label: 'Added button'}}];
    await t.redraw({uid: 'a', blocks});
    const last = 'a-b' + (blocks.length - 1), prev = 'a-b' + (blocks.length - 2);
    eq(await t.page.locator('[data-mlb-block="' + prev + '"]').textContent(), 'Added heading', tag + ' added block drawn');
    await t.emit({text: 'Edited added'}, prev, 'a'); await t.emit(iwb ? {text: 'Edited note'} : {label: 'Edited button', link: '/pages/x'}, last, 'a');
    eq(await t.page.locator('[data-mlb-block="' + prev + '"]').textContent(), 'Edited added', tag + ' added block live');
    if (iwb) eq(await t.page.locator('[data-mlb-block="' + last + '"]').textContent(), 'Edited note', tag + ' added footnote live');
    else eq(await t.page.locator('[data-mlb-block="' + last + '"]').getAttribute('href'), '/pages/x', tag + ' added button link live');
    eq(await audit(t, 'a'), [], tag + ' audit after edits');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* Videos: autoplay obeys the setting, stops under reduced motion, element kept on unrelated edits. */
async function video(browser, name) {
  const block = name === 'image-with-text-benefits';
  const settings = block ? {} : {media_type: 'video', video_url: VURL, video_autoplay: true};
  const blocks = block ? [{type: 'media', settings: {media_type: 'video_url', video_url: VURL}}, ...CFG[name].blocks().filter(b => b.type !== 'media')] : CFG[name].blocks();
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const t = await mount(browser, name, {width: 375, editing: false, settings, blocks, assets: [ASSET], reducedMotion});
    const v = t.root('video');
    eq(await v.count(), 1, name + ' video drawn');
    await t.page.evaluate(() => { document.querySelector('video').__mark = 1; });
    await t.emit({content_gap: 40, padding_top_mobile: 8});
    ok(await t.page.evaluate(() => document.querySelector('video').__mark === 1), name + ' video element kept on unrelated edits');
    const st = await v.evaluate(el => ({auto: el.hasAttribute('autoplay'), controls: el.controls, visible: el.getBoundingClientRect().height > 0}));
    if (reducedMotion === 'reduce') { ok(!st.auto && st.controls, name + ' reduced motion: no autoplay, controls shown'); }
    ok(st.visible, name + ' video visible');
    eq(t.errors, [], name + ' video errors');
    await t.page.close();
  }
}

async function carousel(browser) {
  const name = 'image-with-text-benefits';
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: false, settings: {per_row: '1.2'}, blocks: [...media(4, {image: IMG}), ...CFG[name].blocks().filter(b => b.type !== 'media')], assets: [ASSET]});
    const grid = t.root('.iwb__media-grid');
    eq(await grid.getAttribute('data-layout'), 'carousel', width + ' carousel layout');
    eq(await grid.getAttribute('tabindex'), '0', width + ' carousel focusable');
    ok(await t.root('.iwb__progress').isVisible(), width + ' progress shown');
    await grid.focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(500);
    const s1 = await grid.evaluate(el => el.scrollLeft);
    ok(s1 > 0, width + ' arrow key scrolls');
    ok(parseFloat(await t.root('.iwb__progress-fill').evaluate(el => el.style.width)) > 0, width + ' progress follows');
    const box = await grid.boundingBox();
    await t.page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2); await t.page.mouse.down();
    await t.page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, {steps: 8}); await t.page.mouse.up(); await t.page.waitForTimeout(400);
    ok(await grid.evaluate(el => el.scrollLeft) > s1, width + ' mouse drag scrolls');
    ok(await t.noOverflow(), width + ' carousel no page overflow');
    eq(t.errors, [], width + ' carousel errors');
    await t.page.close();
  }
}

/* The four saved Image & Video with Text instances, with the toggles the lead adds, against the
   section as it was before this change (git HEAD). */
async function saved(browser) {
  const name = 'image-and-video-text', toggles = (sec) => {
    const s = clone(sec); s.settings.enable_custom_style = true;
    for (const b of Object.values(s.blocks)) b.settings.enable_custom_style = true;
    return s;
  };
  let oldRaw; try { oldRaw = execSync('git show HEAD:sections/' + name + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'}); } catch (_) { return; }
  if (oldRaw.includes('data-mlb-root')) return;
  const renderRaw = async (raw, sec) => {
    const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v?.url || v || '');
    const section = {id: sec.uid, settings: sec.settings, blocks: sec.order.map(k => ({id: k, type: sec.blocks[k].type, settings: sec.blocks[k].settings}))};
    const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}, routes: {all_products_collection_url: '/collections/all'}};
    const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
    return (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '');
  };
  const newRaw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8');
  for (const [file, keys] of [['home', ['image_and_video_text_Xh6Ef8', 'image_and_video_text_Et63iD']], ['about', ['image_and_video_text_4XdREa', 'image_and_video_text_xYtHXK']]]) {
    const tj = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates', file + '.json'), 'utf8'));
    for (const key of keys) for (const width of [375, 1366]) {
      const s = tj.sections[key], defs = Object.fromEntries(schemaOf(name).schema.settings.filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
      const bdef = t => Object.fromEntries((schemaOf(name).schema.blocks.find(b => b.type === t).settings || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
      const fill = sec => ({uid: key, settings: {...defs, ...sec.settings}, order: sec.block_order, blocks: Object.fromEntries(Object.entries(sec.blocks).map(([k, b]) => [k, {type: b.type, settings: {...bdef(b.type), ...b.settings}}]))});
      const look = async html => {
        const page = await browser.newPage({viewport: {width, height: 900}});
        await page.route('**/*', r => r.fulfill({body: r.request().url() === 'http://theme.test/' ? '<!doctype html><html><head></head><body></body></html>' : '', contentType: 'text/html'}));
        await page.goto('http://theme.test/');
        await page.addStyleTag({content: THEME_VARS});
        for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css']) await page.addStyleTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8')});
        await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-' + 'S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, html.replaceAll(key, 'S'));
        await page.waitForTimeout(50);
        const r = await page.evaluate(() => {
          const q = s => document.querySelector('#shopify-section-S ' + s), cs = (s, p) => getComputedStyle(q(s))[p], box = s => { const b = q(s).getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(','); };
          return {bg: cs('.ivt', 'backgroundColor'), text: cs('.ivt__text', 'color'), h: [cs('.ivt__heading', 'color'), cs('.ivt__heading', 'fontSize'), cs('.ivt__heading', 'fontFamily')], sub: [cs('.ivt__subheading', 'color'), cs('.ivt__subheading', 'fontSize')],
            btn: [cs('.ivt__btn', 'backgroundColor'), cs('.ivt__btn', 'color'), cs('.ivt__btn', 'borderTopColor'), cs('.ivt__btn', 'borderTopLeftRadius'), cs('.ivt__btn', 'paddingLeft'), cs('.ivt__btn', 'fontSize'), q('.ivt__btn').getAttribute('href')],
            media: [box('.ivt__media'), cs('.ivt__media', 'borderTopLeftRadius')], textBox: box('.ivt__text'), pad: [cs('.ivt', 'paddingTop'), cs('.ivt', 'paddingBottom')]};
        });
        await page.locator('#shopify-section-S .ivt__btn').hover(); await page.waitForTimeout(30);
        r.hover = await page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-S .ivt__btn')).backgroundColor);
        await page.close();
        return r;
      };
      const was = await look(await renderRaw(oldRaw, fill(s))), now = await look(await renderRaw(newRaw, fill(toggles(s)))), plain = await look(await renderRaw(newRaw, fill(s)));
      eq(now, was, key + ' @' + width + ' looks the same with the custom styling toggles on');
      ok(plain.bg !== was.bg || plain.h[0] !== was.h[0], key + ' without the toggles it follows the theme (so the toggles are needed)');
    }
  }
}

(async () => {
  const only = process.argv.slice(2), names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  try {
    for (const n of names) { eq(schemaProblems(n), [], n + ' schema'); const ids = schemaOf(n).schema.settings.filter(x => x.id).map(x => x.id); eq(new Set(ids).size, ids.length, n + ' unique ids'); }
    const covered = {};
    await Promise.all(names.map(async n => { for (const w of [375, 1366]) covered[n] = await everyControl(browser, n, w); }));
    await Promise.all(names.map(async n => { for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e); }));
    await Promise.all(names.map(n => lifecycle(browser, n)));
    await Promise.all(names.filter(n => n !== 'dual-image-with-text').map(n => video(browser, n)));
    if (names.includes('image-with-text-benefits')) await carousel(browser);
    if (names.includes('image-and-video-text')) await saved(browser);
    console.log(checks + ' benefits media checks passed (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
