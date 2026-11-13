/* Round 7, Image and video: Lightbox Gallery (media-lightbox-gallery) and
   Video Playlist (video-playlist), with shopify/assets/live-r7-media.js.

   Both sections, at 375 and 1366, in the builder (editing) and on a visitor's
   page, with the real theme priority rules on (tests/media-fixture.cjs):
   schema, theme inheritance, colour scheme, custom styling and fonts on and
   off, every section and block setting live and after a redraw, desktop and
   mobile values at the right width, variants distinct, two instances
   independent, added blocks, no reload or rebuild on unrelated edits, first
   paint equals hydrated paint, reduced motion, no overflow, no errors; the
   lightbox (open, swipe, keys, Escape, focus, page lock, captions, the
   viewer brought in on demand) and the playlist (pick a clip, play, embeds,
   next clip, off screen, the list as a native scroller with arrows and keys).

   Run: LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-media.cjs [gallery|playlist] */
const fs = require('fs'), path = require('path');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ROOT = path.join(__dirname, '..');
const JS = 'live-r7-media.js', VIEWER = ['product-page-ui.css', 'product-page-ui.js'];
const G = 'media-lightbox-gallery', V = 'video-playlist';
const ONLY = process.argv.slice(2);
const want = k => !ONLY.length || ONLY.includes(k);

let passed = 0;
const failed = [];
const ok = (name, cond, detail) => { if (cond) passed++; else failed.push(name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const eq = (name, a, b) => ok(name, a === b, [a, b]);
const has = s => v => typeof v === 'string' && v.includes(s);
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const wait = (page, ms) => page.waitForTimeout(ms);

const IMG = n => ({src: 'https://cdn.test/pic' + n + '.jpg', width: 1200, height: 1500, alt: 'Saved alt ' + n});
const POSTER = n => ({src: 'https://cdn.test/poster' + n + '.jpg', width: 1600, height: 900, alt: ''});
const FILE = n => 'https://cdn.test/clip' + n + '.mp4';
const UPLOAD = {sources: [{format: 'm3u8', mime_type: 'application/x-mpegURL', url: 'https://cdn.test/up.m3u8'}, {format: 'mp4', mime_type: 'video/mp4', url: 'https://cdn.test/up.mp4'}], preview_image: {src: 'https://cdn.test/preview.jpg', width: 1600, height: 900}};
const GB = () => [
  {type: 'heading', settings: {text: 'Gallery <strong>heading</strong>'}},
  {type: 'subheading', settings: {}},
  {type: 'image', settings: {image: IMG(1), caption: 'First caption'}},
  {type: 'image', settings: {image: IMG(2), caption: 'Second caption'}},
  {type: 'image', settings: {image: IMG(3)}},
  {type: 'image', settings: {}},
  {type: 'image', settings: {image: IMG(5), caption: 'Fifth caption'}},
  {type: 'image', settings: {image: IMG(6), image_alt: 'Typed alt six'}},
];
const VB = () => [
  {type: 'heading', settings: {text: 'Playlist <strong>heading</strong>'}},
  {type: 'subheading', settings: {}},
  {type: 'clip', settings: {video_url: FILE(1), poster: POSTER(1), title: 'Clip one', caption: 'First line'}},
  {type: 'clip', settings: {video: UPLOAD, title: 'Clip two'}},
  {type: 'clip', settings: {video_url: 'https://www.youtube.com/watch?v=abcdefghijk', poster: POSTER(3), title: 'Clip three', caption: 'An embed'}},
  {type: 'clip', settings: {video_url: 'https://vimeo.com/123456789', title: 'Clip four'}},
  {type: 'clip', settings: {video_url: FILE(5), title: 'Clip five'}},
  {type: 'clip', settings: {video_url: FILE(6), title: 'Clip six'}},
  {type: 'clip', settings: {video_url: FILE(7), title: 'Clip seven'}},
  {type: 'clip', settings: {video_url: FILE(8), title: 'Clip eight'}},
];

const probe = (t, sel, prop, uid) => t.page.locator('#shopify-section-' + (uid || t.section.id) + (sel ? ' ' + sel : '')).first().evaluate((el, prop) => {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  if (prop[0] === '@') return el.getAttribute(prop.slice(1));
  if (prop === 'text') return el.textContent.trim();
  if (prop === 'html') return el.innerHTML.trim();
  if (prop === 'cols') return cs.display === 'grid' ? cs.gridTemplateColumns.split(' ').length : +cs.columnCount;
  if (prop === 'ratio') return Math.round(r.width / r.height * 100) / 100;
  if (prop === 'w') return Math.round(r.width);
  if (prop === 'h') return Math.round(r.height);
  if (prop === 'hidden') return el.hidden || el.hasAttribute('hidden') || cs.display === 'none';
  return cs[prop];
}, prop, {timeout: 5000}).catch(e => 'PROBE FAILED ' + sel + ' ' + String(e.message).split('\n')[0]);
const blocksOf = (t, uid) => t.rendered.find(r => r.section.id === (uid || t.section.id)).section.blocks.map(b => ({type: b.type, settings: {...b.settings}}));
async function change(t, settings, c, how) {
  if (c.block) {
    const id = t.blockId(c.block, c.n || 0);
    if (how === 'live') await t.emit(settings, id);
    else { const blocks = blocksOf(t), all = t.rendered[0].section.blocks, i = all.findIndex(b => b.id === id); blocks[i].settings = {...blocks[i].settings, ...settings}; await t.redraw({blocks}); }
  } else if (how === 'live') await t.emit(settings);
  else await t.redraw({settings});
  await frames(t.page);
}
/* Every case: read, change, read (the intended element changed at the right width, and nothing changed at the other), put back, read (restored). */
async function sweep(t, name, cases, width, mode, how, bp) {
  const desktop = width >= bp, sectionDefaults = Object.fromEntries(schemaOf(name).schema.settings.filter(x => x.id).map(x => [x.id, x.default === undefined ? '' : x.default]));
  for (const c of cases) {
    const applies = !c.at || c.at === 'both' || (c.at === 'd') === desktop;
    const settings = {...(c.pre || {}), [c.id]: c.v};
    const initial = c.block ? t.rendered[0].section.blocks.find(b => b.id === t.blockId(c.block, c.n || 0)).settings : null;
    const back = Object.fromEntries(Object.keys(settings).map(k => [k, c.block ? (initial[k] === undefined ? '' : initial[k]) : sectionDefaults[k]]));
    const before = [];
    for (const [sel, prop] of c.probes) before.push(await probe(t, sel, prop));
    await change(t, settings, c, how);
    const label = [name, width, mode, how, c.block ? c.block + ' block' : 'section', c.id + '=' + JSON.stringify(c.v)].join(' | ');
    for (let i = 0; i < c.probes.length; i++) {
      const [sel, prop, expect] = c.probes[i], got = await probe(t, sel, prop);
      if (applies) ok(label + ' | ' + sel + ' ' + prop, typeof expect === 'function' ? expect(got) : got === expect, {got, before: before[i]});
      else ok(label + ' | ' + sel + ' ' + prop + ' (the other width keeps its value)', got === before[i], {got, before: before[i]});
    }
    await change(t, back, c, how);
    if (c.restore !== false) for (let i = 0; i < c.probes.length; i++) { const [sel, prop] = c.probes[i], got = await probe(t, sel, prop); ok(label + ' | ' + sel + ' ' + prop + ' (put back: restored)', got === before[i], {got, before: before[i]}); }
  }
}
const pad = (root) => [
  {id: 'padding_top_desktop', v: 40, at: 'd', probes: [[root, 'paddingTop', '40px']]},
  {id: 'padding_bottom_desktop', v: 44, at: 'd', probes: [[root, 'paddingBottom', '44px']]},
  {id: 'side_padding_desktop', v: 10, at: 'd', probes: [[root, 'paddingLeft', '10px'], [root, 'paddingRight', '10px']]},
  {id: 'section_margin_top_desktop', v: 28, at: 'd', probes: [['', 'marginTop', '28px']]},
  {id: 'section_margin_bottom_desktop', v: 32, at: 'd', probes: [['', 'marginBottom', '32px']]},
  {id: 'padding_top_mobile', v: 24, at: 'm', probes: [[root, 'paddingTop', '24px']]},
  {id: 'padding_bottom_mobile', v: 28, at: 'm', probes: [[root, 'paddingBottom', '28px']]},
  {id: 'side_padding_mobile', v: 6, at: 'm', probes: [[root, 'paddingLeft', '6px'], [root, 'paddingRight', '6px']]},
  {id: 'section_margin_top_mobile', v: 12, at: 'm', probes: [['', 'marginTop', '12px']]},
  {id: 'section_margin_bottom_mobile', v: 16, at: 'm', probes: [['', 'marginBottom', '16px']]},
];
const frame = (root, caption) => [
  {id: 'color_scheme', v: 'alt-scheme', probes: [[root, 'backgroundColor', 'rgb(250, 250, 250)'], ['.r7m__heading', 'color', 'rgb(16, 16, 16)'], ['.r7m__heading strong', 'color', 'rgb(16, 16, 16)'], ['.r7m__sub', 'color', 'rgb(51, 51, 51)'], [caption, 'color', 'rgb(51, 51, 51)']]},
  {id: 'section_width', v: 'full_width', probes: [['.r7m__inner', 'maxWidth', 'none'], [root, '@data-width', 'full_width']]},
  {id: 'section_width', v: 'fluid_container', probes: [['.r7m__inner', 'maxWidth', v => parseFloat(v) > 1400]]},
  {id: 'section_width', v: 'stretch_width', probes: [['.r7m__inner', 'maxWidth', 'none'], [root, '@data-width', 'stretch_width']]},
  {id: 'reset_spacing', v: false, probes: [['style[data-r7m-reset]', '@media', 'not all']]},
  {id: 'content_align', v: 'center', at: 'd', probes: [['.r7m__header', 'textAlign', 'center'], ['.r7m__header', 'alignItems', 'center']]},
  {id: 'content_align', v: 'right', at: 'd', probes: [['.r7m__header', 'textAlign', 'right'], ['.r7m__header', 'alignItems', 'flex-end']]},
  {id: 'content_align_mobile', v: 'center', at: 'm', probes: [['.r7m__header', 'textAlign', 'center'], ['.r7m__header', 'alignItems', 'center']]},
  {id: 'content_align_mobile', v: 'right', at: 'm', probes: [['.r7m__header', 'textAlign', 'right']]},
  {id: 'content_gap', v: 30, probes: [['.r7m__header', 'rowGap', '30px']]},
  {id: 'enable_custom_style', v: true, pre: {section_bg: '#112233', text_color: '#aabbcc'}, probes: [[root, 'backgroundColor', 'rgb(17, 34, 51)'], [caption, 'color', 'rgb(170, 187, 204)']]},
  {id: 'section_bg', v: '#112233', pre: {enable_custom_style: true}, probes: [[root, 'backgroundColor', 'rgb(17, 34, 51)']]},
  {id: 'text_color', v: '#aabbcc', pre: {enable_custom_style: true}, probes: [[caption, 'color', 'rgb(170, 187, 204)'], ['.r7m__sub', 'color', 'rgb(170, 187, 204)'], ['.r7m__sub p', 'color', 'rgb(170, 187, 204)']]},
  {id: 'enable_custom_fonts', v: true, pre: {heading_font: {family: 'Courier New'}, body_font: {family: 'Verdana'}}, probes: [['.r7m__heading', 'fontFamily', has('Courier New')], [caption, 'fontFamily', has('Verdana')], [root, '@data-own-font', '']]},
  {id: 'heading_font', v: {family: 'Courier New'}, pre: {enable_custom_fonts: true}, probes: [['.r7m__heading', 'fontFamily', has('Courier New')], ['.r7m__heading strong', 'fontFamily', has('Courier New')]]},
  {id: 'body_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, probes: [['.r7m__sub', 'fontFamily', has('Verdana')], ['.r7m__sub p', 'fontFamily', has('Verdana')], [caption, 'fontFamily', has('Verdana')]]},
  ...pad(root),
];
const head = () => [
  {block: 'heading', id: 'text', v: 'New <em>heading</em>', probes: [['.r7m__heading', 'html', 'New <em>heading</em>']]},
  {block: 'heading', id: 'text', v: '', probes: [['.r7m__heading', 'hidden', true]]},
  {block: 'heading', id: 'enable_custom_style', v: true, pre: {color: '#ff00aa'}, probes: [['.r7m__heading', 'color', 'rgb(255, 0, 170)'], ['.r7m__heading strong', 'color', 'rgb(255, 0, 170)']]},
  {block: 'heading', id: 'color', v: '#ff00aa', pre: {enable_custom_style: true}, probes: [['.r7m__heading', 'color', 'rgb(255, 0, 170)']]},
  {block: 'heading', id: 'size_desktop', v: 60, at: 'd', probes: [['.r7m__heading', 'fontSize', '60px'], ['.r7m__heading strong', 'fontSize', '60px']]},
  {block: 'heading', id: 'size_mobile', v: 20, at: 'm', probes: [['.r7m__heading', 'fontSize', '20px'], ['.r7m__heading strong', 'fontSize', '20px']]},
  {block: 'subheading', id: 'text', v: '<p>New <strong>text</strong></p>', probes: [['.r7m__sub', 'html', '<p>New <strong>text</strong></p>']]},
  {block: 'subheading', id: 'text', v: '', probes: [['.r7m__sub', 'hidden', true]]},
  {block: 'subheading', id: 'enable_custom_style', v: true, pre: {color: '#00aaff'}, probes: [['.r7m__sub', 'color', 'rgb(0, 170, 255)'], ['.r7m__sub p', 'color', 'rgb(0, 170, 255)']]},
  {block: 'subheading', id: 'color', v: '#00aaff', pre: {enable_custom_style: true}, probes: [['.r7m__sub', 'color', 'rgb(0, 170, 255)']]},
  {block: 'subheading', id: 'size_desktop', v: 22, at: 'd', probes: [['.r7m__sub', 'fontSize', '22px'], ['.r7m__sub p', 'fontSize', '22px']]},
  {block: 'subheading', id: 'size_mobile', v: 12, at: 'm', probes: [['.r7m__sub', 'fontSize', '12px'], ['.r7m__sub p', 'fontSize', '12px']]},
];
const item = n => '.mlg__item:nth-child(' + n + ')';
const CASES = {
  [G]: [
    ...frame('.mlg', '.mlg__caption'),
    {id: 'columns_desktop', v: 6, at: 'd', probes: [['.mlg__grid', 'cols', 6]]},
    {id: 'columns_mobile', v: 3, at: 'm', probes: [['.mlg__grid', 'cols', 3]]},
    {id: 'gap_desktop', v: 30, at: 'd', probes: [['.mlg__grid', 'columnGap', '30px'], ['.mlg__grid', 'rowGap', '30px']]},
    {id: 'gap_mobile', v: 20, at: 'm', probes: [['.mlg__grid', 'columnGap', '20px'], ['.mlg__grid', 'rowGap', '20px']]},
    {id: 'image_ratio', v: 'portrait', probes: [['.mlg__tile', 'ratio', 0.8]]},
    {id: 'image_ratio', v: 'landscape', probes: [['.mlg__tile', 'ratio', 1.33]]},
    {id: 'image_ratio', v: 'original', probes: [['.mlg__grid', 'display', 'block'], ['.mlg__tile', 'aspectRatio', 'auto'], [item(4) + ' .mlg__tile', 'ratio', 1]]},
    {id: 'image_radius', v: 20, probes: [['.mlg__tile', 'borderTopLeftRadius', '20px'], ['.mlg__tile', 'borderBottomRightRadius', '20px']]},
    ...head(),
    {block: 'image', n: 3, id: 'image', v: IMG(9), restore: false, probes: [[item(4) + ' img', '@src', has('pic9.jpg')], [item(4) + ' .mlg__tile', '@data-mt-src', has('pic9.jpg')], [item(4) + ' .mlg__tile', '@href', has('pic9.jpg')], [item(4) + ' .mlg__tile', '@data-empty', 'false'], [item(4) + ' img', 'hidden', false], [item(4) + ' svg', 'hidden', true]]},
    {block: 'image', n: 0, id: 'image', v: '', restore: false, probes: [[item(1) + ' .mlg__tile', '@data-empty', 'true'], [item(1) + ' img', 'hidden', true], [item(1) + ' svg', 'hidden', false], [item(1) + ' .mlg__tile', '@data-mt-src', has('data:image/svg+xml')], [item(1) + ' .mlg__tile', '@href', null]]},
    {block: 'image', n: 0, id: 'image_alt', v: 'Hand written alt', probes: [[item(1) + ' img', '@alt', 'Hand written alt'], [item(1) + ' .mlg__tile', '@aria-label', 'Hand written alt']]},
    {block: 'image', n: 2, id: 'caption', v: 'A new caption', probes: [[item(3) + ' .mlg__caption', 'text', 'A new caption'], [item(3) + ' .mlg__caption', 'hidden', false]]},
    {block: 'image', n: 0, id: 'caption', v: '', probes: [[item(1) + ' .mlg__caption', 'hidden', true]]},
  ],
  [V]: [
    ...frame('.vpl', '.vpl__caption'),
    {id: 'list_position', v: 'below', at: 'd', probes: [['.vpl__body', 'flexDirection', 'column'], ['.vpl__list', 'flexDirection', 'row'], ['.vpl__track', 'overflowX', 'auto']]},
    {id: 'gap_desktop', v: 48, at: 'd', probes: [['.vpl__body', 'columnGap', '48px']]},
    {id: 'gap_mobile', v: 40, at: 'm', probes: [['.vpl__body', 'rowGap', '40px']]},
    {id: 'video_ratio', v: 'square', probes: [['.vpl__stage', 'ratio', 1], ['.vpl__thumb', 'ratio', 1]]},
    {id: 'video_ratio', v: 'portrait', probes: [['.vpl__stage', 'ratio', 0.56], ['.vpl__thumb', 'ratio', v => Math.abs(v - 0.56) < 0.03]]},
    {id: 'video_fit', v: 'contain', probes: [['.ivp__video', 'objectFit', 'contain']]},
    {id: 'media_radius', v: 30, probes: [['.vpl__stage', 'borderTopLeftRadius', '30px']]},
    {id: 'autoplay_next', v: false, probes: [['.vpl', '@data-next', 'false']]},
    {id: 'title_color', v: '#ff8800', pre: {enable_custom_style: true}, probes: [['.vpl__title', 'color', 'rgb(255, 136, 0)'], ['.vpl__clip', 'color', 'rgb(255, 136, 0)']]},
    {id: 'accent_color', v: '#00ff88', pre: {enable_custom_style: true}, probes: [['.vpl__item[data-active="true"] .vpl__thumb', 'outlineColor', 'rgb(0, 255, 136)']]},
    {id: 'heading_font', v: {family: 'Courier New'}, pre: {enable_custom_fonts: true}, probes: [['.vpl__title', 'fontFamily', has('Courier New')], ['.vpl__clip', 'fontFamily', has('Courier New')]]},
    ...head(),
    {block: 'clip', n: 4, id: 'title', v: 'A new title', probes: [['.vpl__item:nth-child(5) .vpl__clip', 'text', 'A new title']]},
    {block: 'clip', n: 4, id: 'title', v: '', probes: [['.vpl__item:nth-child(5) .vpl__clip', '@aria-label', 'play video 5']]},
    {block: 'clip', n: 1, id: 'caption', v: 'A new line', probes: [['.vpl__item:nth-child(2) .vpl__caption', 'text', 'A new line'], ['.vpl__item:nth-child(2) .vpl__caption', 'hidden', false]]},
    {block: 'clip', n: 0, id: 'caption', v: '', probes: [['.vpl__item:nth-child(1) .vpl__caption', 'hidden', true]]},
    {block: 'clip', n: 4, id: 'poster', v: POSTER(9), restore: false, probes: [['.vpl__item:nth-child(5) .vpl__thumb img', '@src', has('poster9.jpg')], ['.vpl__item:nth-child(5) .vpl__thumb img', 'hidden', false], ['.vpl__item:nth-child(5) .vpl__thumb svg', 'hidden', true], ['.vpl__item:nth-child(5) .vpl__clip', '@data-vp-poster', has('poster9.jpg')]]},
    {block: 'clip', n: 4, id: 'video_url', v: 'https://cdn.test/other.mp4', restore: false, probes: [['.vpl__item:nth-child(5) .vpl__clip', '@data-vp-url', 'https://cdn.test/other.mp4']]},
    {block: 'clip', n: 4, id: 'video', v: UPLOAD, restore: false, probes: [['.vpl__item:nth-child(5) .vpl__clip', '@data-vp-file', 'https://cdn.test/up.mp4'], ['.vpl__item:nth-child(5) .vpl__thumb img', '@src', has('preview.jpg')]]},
    {block: 'clip', n: 0, id: 'video_url', v: 'https://cdn.test/changed.mp4', restore: false, probes: [['.ivp__video', '@src', 'https://cdn.test/changed.mp4'], ['.vpl__stage', '@data-state', 'idle']]},
    {block: 'clip', n: 0, id: 'poster', v: POSTER(8), restore: false, probes: [['.ivp__video', '@poster', has('poster8.jpg')]]},
  ],
};
const BLOCKS = {[G]: GB, [V]: VB}, ROOTSEL = {[G]: '.mlg', [V]: '.vpl'}, BP = {[G]: 750, [V]: 900};
const stats = t => t.page.evaluate(() => window.MateriaR7Media.stats());
const audit = t => t.page.evaluate(() => window.MateriaR7Media.audit());

/* play() and pause() without a real file: record the calls and fire the events a browser would. */
const stubMedia = t => t.page.evaluate(() => {
  window.__plays = []; window.__pauses = 0;
  const P = HTMLMediaElement.prototype;
  Object.defineProperty(P, 'paused', {configurable: true, get() { return !this.__on; }});
  P.play = function () { this.__on = true; window.__plays.push(this.getAttribute('src')); this.dispatchEvent(new Event('play')); return Promise.resolve(); };
  P.pause = function () { if (this.__on) { this.__on = false; window.__pauses++; this.dispatchEvent(new Event('pause')); } };
  P.load = function () {};
});

async function common(browser, name) {
  const root = ROOTSEL[name], bp = BP[name], schema = schemaOf(name).schema;
  eq(name + ' schema problems', JSON.stringify(schemaProblems(name)), '[]');
  ok(name + ' name is at most 25 characters and the preset carries it', schema.name.length <= 25 && schema.presets[0].name === schema.name && schema.presets[0].category === 'Image and video', schema.name);
  const others = fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'sections', f), 'utf8').split('<schema>')[1].split('</schema>')[0]).shopify?.name === schema.name; } catch (_) { return false; } });
  eq(name + ' no other section has this name', others.join(), '');
  const raw = schemaOf(name).raw, lines = raw.split('\n');
  eq(name + ' line 1', lines[0], '<template compat="shopify">');
  eq(name + ' line 2 links the controller', lines[1], '<script src="{{ \'live-r7-media.js\' | asset_url }}" defer="defer"></script>');
  ok(name + ' schema is the theme\'s own object only', Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])).join() === 'shopify');
  /* every visible setting id has a case below */
  const ids = [['section', schema.settings], ...schema.blocks.map(b => [b.type, b.settings])].flatMap(([where, list]) => list.filter(x => x.id && x.hidden !== true).map(x => where + ':' + x.id));
  const covered = new Set(CASES[name].map(c => (c.block || 'section') + ':' + c.id).concat(CASES[name].flatMap(c => Object.keys(c.pre || {}).map(k => (c.block || 'section') + ':' + k))));
  eq(name + ' every setting of the section and of every block has a case', ids.filter(i => !covered.has(i)).join(), '');
  /* the defaults the controller falls back to are the schema's */
  const dec = s => s.replace(/&#123;/g, '{').replace(/&#125;/g, '}').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
  const d = a => Object.fromEntries(a.filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  eq(name + ' printed section defaults are the schema defaults', dec(raw.match(/data-r7m-defaults="([^"]*)"/)[1]), JSON.stringify(d(schema.settings)));
  eq(name + ' printed block defaults are the schema defaults', dec(raw.match(/data-r7m-block-defaults="([^"]*)"/)[1]), JSON.stringify(Object.fromEntries(schema.blocks.map(b => [b.type, d(b.settings)]))));

  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const mode = editing ? 'builder' : 'visitor', at = [name, width, mode].join(' | ');
    const t = await mount(browser, name, {width, editing, blocks: BLOCKS[name](), assets: [JS]});
    /* theme inheritance, the real theme priority on */
    eq(at + ' | background is the scheme\'s', await t.css(root, 'backgroundColor'), 'rgb(24, 32, 40)');
    eq(at + ' | heading colour', await t.css('.r7m__heading', 'color'), 'rgb(255, 255, 255)');
    ok(at + ' | heading font is the theme\'s', has('Georgia')(await t.css('.r7m__heading', 'fontFamily')));
    eq(at + ' | heading weight is the theme\'s', await t.css('.r7m__heading', 'fontWeight'), '700');
    eq(at + ' | heading is an h2', await t.root('.r7m__heading').evaluate(el => el.tagName), 'H2');
    eq(at + ' | text colour', await t.css('.r7m__sub', 'color'), 'rgb(204, 204, 204)');
    ok(at + ' | text font is the theme\'s', has('Arial')(await t.css('.r7m__sub p', 'fontFamily')));
    const cap = name === G ? '.mlg__caption' : '.vpl__caption';
    eq(at + ' | caption colour', await t.css(cap, 'color'), 'rgb(204, 204, 204)');
    ok(at + ' | caption font is the theme\'s', has('Arial')(await t.css(cap, 'fontFamily')));
    if (name === V) { ok(at + ' | clip title font is the theme\'s heading font', has('Georgia')(await t.css('.vpl__clip', 'fontFamily'))); eq(at + ' | clip title colour', await t.css('.vpl__title', 'color'), 'rgb(255, 255, 255)'); eq(at + ' | clip titles are h3', await t.root('.vpl__title').first().evaluate(el => el.tagName), 'H3'); }
    eq(at + ' | settings JSON is printed in the builder only', await t.root(root).evaluate(el => el.hasAttribute('data-r7m-settings')), editing);
    if (editing) eq(at + ' | markup equals what the settings derive', JSON.stringify(await audit(t)), '[]');
    ok(at + ' | no sideways page scroll', await t.noOverflow());
    const s0 = await stats(t);
    eq(at + ' | nothing painted on load', s0.paints + s0.writes + s0.builds, 0);

    await sweep(t, name, CASES[name], width, mode, 'live', bp);
    if (editing) {
      eq(at + ' | markup still equals what the settings derive after the live pass', JSON.stringify(await audit(t)), '[]');
      await sweep(t, name, CASES[name], width, mode, 'redraw', bp);
      const s1 = await stats(t);
      eq(at + ' | one root after every redraw', s1.roots, 1);
      eq(at + ' | listeners are not duplicated by redraws', s1.listeners, s0.listeners);
    }
    ok(at + ' | no sideways page scroll after the sweep', await t.noOverflow());
    eq(at + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* theme inheritance once with both priorities off, and custom fonts still apply */
  {
    const t = await mount(browser, name, {width: 1366, editing: true, blocks: BLOCKS[name](), assets: [JS], priority: 'off'});
    ok(name + ' | priority off | heading font is the theme\'s', has('Georgia')(await t.css('.r7m__heading', 'fontFamily')));
    ok(name + ' | priority off | text font is the theme\'s', has('Arial')(await t.css('.r7m__sub p', 'fontFamily')));
    await t.emit({enable_custom_fonts: true, heading_font: {family: 'Courier New'}, body_font: {family: 'Verdana'}}); await frames(t.page);
    ok(name + ' | priority off | custom heading font', has('Courier New')(await t.css('.r7m__heading', 'fontFamily')));
    ok(name + ' | priority off | custom body font', has('Verdana')(await t.css('.r7m__sub p', 'fontFamily')));
    eq(name + ' | priority off | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* Section width: four options, four different drawings (a wide screen, where they can differ). */
  for (const how of ['live', 'redraw']) {
    const t = await mount(browser, name, {width: 1800, editing: true, blocks: BLOCKS[name](), assets: [JS]});
    const seen = [];
    for (const v of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await change(t, {section_width: v}, {}, how); seen.push(await probe(t, '.r7m__header', 'w')); }
    eq(name + ' | 1800 | ' + how + ' | section width options are four different widths', new Set(seen).size, 4);
    await t.page.close();
  }

  /* Colour scheme: live, after a redraw, and back. */
  {
    const t = await mount(browser, name, {width: 1366, editing: true, blocks: BLOCKS[name](), assets: [JS]});
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(name + ' | scheme live', await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(name + ' | scheme after redraw', await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)');
    eq(name + ' | scheme after redraw: one scheme class', await t.root(root).evaluate(el => [...el.classList].filter(c => c.startsWith('color-')).join()), 'color-alt-scheme');
    await t.emit({color_scheme: {id: 'default-color-scheme'}}); await frames(t.page);
    eq(name + ' | scheme back (object value)', await t.css(root, 'backgroundColor'), 'rgb(24, 32, 40)');
    /* the event's section may be an object or carry the wrapper's prefix */
    await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: {id: 'shopify-section-test'}, settings: {content_gap: 44}}}))); await frames(t.page);
    eq(name + ' | section given as an object with the wrapper prefix', await t.css('.r7m__header', 'rowGap'), '44px');
    await t.page.evaluate(id => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {sectionId: 'test', blockId: {id}, settings: {text: 'By block id object'}}})), t.blockId('heading')); await frames(t.page);
    eq(name + ' | block given as blockId object', await probe(t, '.r7m__heading', 'text'), 'By block id object');
    await t.page.close();
  }

  /* Two instances: an edit to one leaves the other alone. */
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks: BLOCKS[name]()}, {uid: 'b', blocks: BLOCKS[name]()}], assets: [JS]});
    const snap = () => t.page.evaluate(() => { const w = document.getElementById('shopify-section-b'); return w.innerHTML + '|' + getComputedStyle(w.querySelector('.r7m')).cssText.length + '|' + w.getBoundingClientRect().height; });
    const before = await snap();
    await t.emit({padding_top_desktop: 8, padding_top_mobile: 8, enable_custom_style: true, section_bg: '#550000', content_align: 'center', content_align_mobile: 'center', color_scheme: 'alt-scheme'}, undefined, 'a');
    await t.emit({text: 'Only in a'}, t.blockId('heading', 0, 'a'), 'a');
    await t.emit(name === G ? {caption: 'Only a caption'} : {title: 'Only a title'}, t.blockId(name === G ? 'image' : 'clip', 0, 'a'), 'a');
    await frames(t.page);
    eq(name + ' | ' + width + ' | two instances: a changed', await probe(t, '.r7m__heading', 'text', 'a'), 'Only in a');
    eq(name + ' | ' + width + ' | two instances: a background', await t.css(root, 'backgroundColor', 'a'), 'rgb(85, 0, 0)');
    eq(name + ' | ' + width + ' | two instances: b untouched', await snap(), before);
    eq(name + ' | ' + width + ' | two instances: b background', await t.css(root, 'backgroundColor', 'b'), 'rgb(24, 32, 40)');
    await t.redraw({uid: 'a', settings: {content_gap: 40}});
    eq(name + ' | ' + width + ' | two instances: b untouched by a redraw of a', await snap(), before);
    eq(name + ' | ' + width + ' | two instances: two roots', (await stats(t)).roots, 2);
    eq(name + ' | ' + width + ' | two instances: no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* First paint equals hydrated paint: boxes and key styles with no script and with the controller. */
  for (const width of [375, 1366]) for (const editing of [true, false]) for (const filled of [false, true]) {
    const shot = async assets => {
      const t = await mount(browser, name, {width, editing, ...(filled ? {blocks: BLOCKS[name]()} : {}), assets});
      await frames(t.page);
      const out = await t.page.evaluate(() => [...document.querySelectorAll('.r7m, .r7m *')].map(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return [el.tagName, el.className && el.className.baseVal === undefined ? el.className : '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), cs.color, cs.backgroundColor, cs.fontFamily, cs.fontSize, cs.fontWeight, cs.display, cs.visibility, cs.opacity].join(','); }).join('\n'));
      const errors = t.errors.join(' ; ');
      await t.page.close();
      return {out, errors};
    };
    const a = await shot([]), b = await shot([JS, ...VIEWER]);
    const at = [name, width, editing ? 'builder' : 'visitor', filled ? 'filled' : 'first preset'].join(' | ');
    ok(at + ' | first paint equals hydrated paint', a.out === b.out && a.out.length > 200, a.out.split('\n').filter((l, i) => l !== b.out.split('\n')[i]).slice(0, 3));
    eq(at + ' | no errors with scripts off or on', a.errors + b.errors, '');
  }

  /* Empty and edge cases draw without errors or overflow. */
  for (const width of [375, 1366]) for (const [label, blocks] of [['no blocks', []], ['one block', [{type: name === G ? 'image' : 'clip', settings: {}}]], ['header only', [{type: 'heading', settings: {}}, {type: 'subheading', settings: {}}]], ['long words', [{type: 'heading', settings: {text: 'Averyveryverylongheadingwordthatcannotbreakanywhereatallinthewholeline and more words after it'}}, {type: name === G ? 'image' : 'clip', settings: {caption: 'Averyveryverylongcaptionwordthatcannotbreakanywhereatall', title: 'Averyveryverylongtitlewordthatcannotbreakanywhereatall'}}]]]) {
    const t = await mount(browser, name, {width, editing: true, blocks, assets: [JS]});
    ok([name, width, label, 'no sideways page scroll'].join(' | '), await t.noOverflow());
    eq([name, width, label, 'no errors'].join(' | '), t.errors.join(' ; '), '');
    await t.page.close();
  }
}

async function galleryRuntime(browser) {
  const lb = t => t.page.evaluate(() => { const d = document.querySelector('dialog.mt-lb'); if (!d) return null; const track = d.querySelector('.mt-lb__track'); return {open: d.open, count: d.querySelector('.mt-lb__count').textContent, slides: track.children.length, cap: (d.querySelector('.r7-lb-cap') || {}).textContent, capShown: d.querySelector('.r7-lb-cap') ? getComputedStyle(d.querySelector('.r7-lb-cap')).display !== 'none' : false, lock: document.documentElement.classList.contains('mt-lock'), overflow: getComputedStyle(document.documentElement).overflowY, snap: getComputedStyle(track).scrollSnapType, close: d.querySelector('.mt-lb__close').getBoundingClientRect().width, w: d.getBoundingClientRect().width, vw: innerWidth}; });
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const at = [G, width, editing ? 'builder' : 'visitor', 'lightbox'].join(' | ');
    const t = await mount(browser, G, {width, editing, blocks: GB(), assets: [JS, ...VIEWER]});
    const tiles = t.root('[data-r7m-tile]');
    eq(at + ' | six pictures', await tiles.count(), 6);
    ok(at + ' | every picture is a control with a name', await tiles.evaluateAll(els => els.every(el => el.getAttribute('role') === 'button' && el.tabIndex === 0 && el.getAttribute('aria-haspopup') === 'dialog' && el.getAttribute('aria-label'))));
    eq(at + ' | names: typed alt, saved alt, numbered when empty', await tiles.evaluateAll(els => [els[5], els[0], els[3]].map(el => el.getAttribute('aria-label')).join('|')), 'Typed alt six|Saved alt 1|gallery image 4');
    ok(at + ' | tap targets are at least 44px', await tiles.evaluateAll(els => els.every(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })));
    ok(at + ' | pictures are lazy, sized and async', await t.root('.mlg__tile img:not([hidden])').evaluateAll(els => els.length === 5 && els.every(el => el.loading === 'lazy' && el.decoding === 'async' && el.getAttribute('width') && el.getAttribute('height') && el.getAttribute('srcset'))));
    eq(at + ' | focus ring on a picture', await t.page.evaluate(() => { const el = document.querySelector('[data-r7m-tile]'); el.focus(); return el.matches(':focus-visible') ? getComputedStyle(el).outlineStyle : 'not focus-visible'; }), 'solid');
    eq(at + ' | closed before any press', await lb(t), null);

    await tiles.nth(1).click(); await wait(t.page, 450);
    let s = await lb(t);
    ok(at + ' | a press opens the viewer', s && s.open, s);
    eq(at + ' | at the pressed picture', s.count, '2 / 6');
    eq(at + ' | every picture is a slide', s.slides, 6);
    eq(at + ' | its caption is shown', s.cap, 'Second caption');
    ok(at + ' | the page behind is locked', s.lock && s.overflow === 'hidden', s);
    ok(at + ' | the viewer is a snap scroller', /x mandatory/.test(s.snap), s.snap);
    ok(at + ' | close button is at least 44px', s.close >= 44, s.close);
    eq(at + ' | viewer fills the screen', s.w, s.vw);
    eq(at + ' | the large file is shown', await t.page.evaluate(() => document.querySelectorAll('dialog.mt-lb .mt-lb__slide img')[1].getAttribute('src')), 'https://cdn.test/pic2.jpg?width=2400');
    eq(at + ' | alt text carried into the viewer', await t.page.evaluate(() => document.querySelectorAll('dialog.mt-lb .mt-lb__slide img')[5].alt), 'Typed alt six');

    await t.page.keyboard.press('ArrowRight'); await wait(t.page, 700);
    s = await lb(t);
    eq(at + ' | ArrowRight goes to the next picture', s.count, '3 / 6');
    ok(at + ' | a picture with no caption shows none', s.cap === '' && !s.capShown, s);
    await t.page.keyboard.press('ArrowLeft'); await wait(t.page, 700); await t.page.keyboard.press('ArrowLeft'); await wait(t.page, 700);
    s = await lb(t);
    eq(at + ' | ArrowLeft goes back', s.count, '1 / 6');
    eq(at + ' | caption follows', s.cap, 'First caption');
    /* a swipe is the track's own scroll */
    await t.page.evaluate(() => { const track = document.querySelector('dialog.mt-lb .mt-lb__track'); track.scrollLeft = 4 * track.clientWidth; }); await wait(t.page, 350);
    s = await lb(t);
    eq(at + ' | swiping the track moves to that picture', s.count, '5 / 6');
    eq(at + ' | caption follows the swipe', s.cap, 'Fifth caption');
    await t.page.evaluate(() => { const track = document.querySelector('dialog.mt-lb .mt-lb__track'); track.scrollLeft = 2.4 * track.clientWidth; }); await wait(t.page, 600);
    ok(at + ' | the track snaps to a whole picture', await t.page.evaluate(() => { const track = document.querySelector('dialog.mt-lb .mt-lb__track'), x = track.scrollLeft / track.clientWidth; return Math.abs(x - Math.round(x)) < 0.02; }));

    await t.page.keyboard.press('Escape'); await wait(t.page, 500);
    s = await lb(t);
    ok(at + ' | Escape closes it', s && !s.open, s);
    ok(at + ' | the page is unlocked', !s.lock);
    eq(at + ' | focus returns to the picture that opened it', await t.page.evaluate(() => [...document.querySelectorAll('[data-r7m-tile]')].indexOf(document.activeElement)), 1);

    /* keyboard: Enter and Space on a focused picture, the close button */
    await tiles.nth(4).focus(); await t.page.keyboard.press('Enter'); await wait(t.page, 450);
    s = await lb(t);
    ok(at + ' | Enter opens the viewer', s.open && s.count === '5 / 6', s);
    await t.page.locator('dialog.mt-lb .mt-lb__close').click(); await wait(t.page, 500);
    ok(at + ' | the close button closes it', !(await lb(t)).open);
    eq(at + ' | focus returns after the close button', await t.page.evaluate(() => [...document.querySelectorAll('[data-r7m-tile]')].indexOf(document.activeElement)), 4);
    await tiles.nth(3).focus(); await t.page.keyboard.press('Space'); await wait(t.page, 450);
    s = await lb(t);
    ok(at + ' | Space opens an empty picture\'s placeholder', s.open && s.count === '4 / 6', s);
    ok(at + ' | the page did not scroll or leave', await t.page.evaluate(() => location.href === 'http://theme.test/'));
    await t.page.keyboard.press('Escape'); await wait(t.page, 500);

    /* a caption edit reaches the viewer */
    await t.emit({caption: 'Edited caption'}, t.blockId('image', 0)); await frames(t.page);
    await tiles.nth(0).click(); await wait(t.page, 450);
    eq(at + ' | an edited caption is the one shown', (await lb(t)).cap, 'Edited caption');
    await t.page.keyboard.press('Escape'); await wait(t.page, 500);
    eq(at + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* Two galleries: the viewer shows the pictures and captions of the one that was pressed. */
  {
    const b2 = GB().map(b => b.type === 'image' && b.settings.image ? {type: 'image', settings: {...b.settings, image: {...b.settings.image, src: b.settings.image.src.replace('pic', 'other')}, caption: 'B ' + (b.settings.caption || 'plain')}} : b);
    const t = await mount(browser, G, {width: 1366, editing: true, instances: [{uid: 'a', blocks: GB()}, {uid: 'b', blocks: b2}], assets: [JS, ...VIEWER]});
    await t.page.locator('#shopify-section-b [data-r7m-tile]').nth(0).click(); await wait(t.page, 450);
    eq(G + ' | two galleries | b\'s caption', await t.page.evaluate(() => document.querySelector('.r7-lb-cap').textContent), 'B First caption');
    ok(G + ' | two galleries | b\'s pictures only', await t.page.evaluate(() => [...document.querySelectorAll('dialog.mt-lb .mt-lb__slide img')].filter(i => /^https/.test(i.getAttribute('src'))).every(i => i.getAttribute('src').includes('other'))));
    await t.page.keyboard.press('Escape'); await wait(t.page, 500);
    await t.page.locator('#shopify-section-a [data-r7m-tile]').nth(0).click(); await wait(t.page, 450);
    eq(G + ' | two galleries | then a\'s caption', await t.page.evaluate(() => document.querySelector('.r7-lb-cap').textContent), 'First caption');
    eq(G + ' | two galleries | one viewer, one caption line', await t.page.evaluate(() => document.querySelectorAll('dialog.mt-lb').length + '/' + document.querySelectorAll('.r7-lb-cap').length), '1/1');
    eq(G + ' | two galleries | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* The viewer is brought in on demand: not asked for while the gallery is far away, asked for once when it comes near, and a press that comes first is held and given again. */
  for (const early of [false, true]) {
    const at = G + ' | viewer on demand' + (early ? ' (press before it is in)' : '');
    const t = await mount(browser, G, {width: 375, editing: false, blocks: GB(), settings: {section_margin_top_mobile: 2600}, assets: [JS]});
    let asked = 0;
    await t.page.route(/\/assets\/product-page-ui\.(js|css)/, async r => { asked++; if (early) await new Promise(done => setTimeout(done, 400)); const f = r.request().url().endsWith('.js') ? 'product-page-ui.js' : 'product-page-ui.css'; r.fulfill({body: fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8'), contentType: f.endsWith('.js') ? 'text/javascript' : 'text/css'}); });
    await wait(t.page, 200);
    eq(at + ' | not asked for while the gallery is far below', asked + '|' + await t.page.evaluate(() => !!window.__mtProductUi), '0|false');
    if (early) {
      await t.page.evaluate(() => document.querySelectorAll('[data-r7m-tile]')[2].click());
      eq(at + ' | the press did not leave the page', await t.page.evaluate(() => location.href), 'http://theme.test/');
      await t.page.waitForFunction(() => { const d = document.querySelector('dialog.mt-lb'); return d && d.open; }, null, {timeout: 8000}).catch(() => {});
      await wait(t.page, 450);
      eq(at + ' | the held press opened the viewer at that picture', await t.page.evaluate(() => { const d = document.querySelector('dialog.mt-lb'); return d && d.open ? d.querySelector('.mt-lb__count').textContent : 'closed'; }), '3 / 6');
    } else {
      await t.page.evaluate(() => document.querySelector('.mlg').scrollIntoView());
      await t.page.waitForFunction(() => !!window.__mtProductUi, null, {timeout: 8000}).catch(() => {});
      ok(at + ' | asked for when the gallery comes near', await t.page.evaluate(() => !!window.__mtProductUi));
      await t.root('[data-r7m-tile]').nth(0).click(); await wait(t.page, 450);
      eq(at + ' | then a press opens it', await t.page.evaluate(() => { const d = document.querySelector('dialog.mt-lb'); return d && d.open ? d.querySelector('.r7-lb-cap').textContent : 'closed'; }), 'First caption');
    }
    eq(at + ' | script and styles asked for once each', asked, 2);
    eq(at + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* Added block, redraws, no reload on unrelated edits, shapes distinct, reduced motion. */
  for (const width of [375, 1366]) {
    const at = G + ' | ' + width;
    const t = await mount(browser, G, {width, editing: true, blocks: GB(), assets: [JS, ...VIEWER]});
    await t.root('.mlg__tile img').evaluateAll(els => els.forEach((el, i) => { el.__kept = i + 1; el.__src = el.getAttribute('src'); el.__srcset = el.getAttribute('srcset'); }));
    await t.emit({padding_top_desktop: 20, padding_top_mobile: 20, image_radius: 30, columns_desktop: 3, columns_mobile: 1, gap_desktop: 4, gap_mobile: 4, image_ratio: 'portrait', enable_custom_style: true, section_bg: '#223344', color_scheme: 'alt-scheme', content_align: 'center'});
    await t.emit({text: 'Unrelated heading edit'}, t.blockId('heading'));
    await t.emit({caption: 'Unrelated caption edit', image_alt: 'Unrelated alt'}, t.blockId('image', 1));
    await frames(t.page);
    ok(at + ' | no picture is replaced or reloaded by unrelated edits', await t.root('.mlg__tile img').evaluateAll(els => els.every((el, i) => el.__kept === i + 1 && el.getAttribute('src') === el.__src && el.getAttribute('srcset') === el.__srcset)));
    await t.emit({image: IMG(7)}, t.blockId('image', 2)); await frames(t.page);
    ok(at + ' | a new picture changes only its own tile', await t.root('.mlg__tile img').evaluateAll(els => els.every((el, i) => el.__kept === i + 1 && (i === 2 ? el.getAttribute('src') === 'https://cdn.test/pic7.jpg' : el.getAttribute('src') === el.__src))));
    const s0 = await stats(t);
    const next = await t.redraw({blocks: GB().concat([{type: 'image', settings: {image: IMG(8), caption: 'Added'}}])});
    eq(at + ' | an added block is drawn', await t.root('[data-r7m-tile]').count(), 7);
    const added = next.section.blocks[next.section.blocks.length - 1].id;
    await t.emit({caption: 'Added and edited'}, added); await frames(t.page);
    eq(at + ' | and is live-editable', await probe(t, item(7) + ' .mlg__caption', 'text'), 'Added and edited');
    await t.root('[data-r7m-tile]').nth(6).click(); await wait(t.page, 450);
    eq(at + ' | and opens in the viewer with its caption', await t.page.evaluate(() => { const d = document.querySelector('dialog.mt-lb'); return d.open + '|' + d.querySelector('.mt-lb__count').textContent + '|' + d.querySelector('.r7-lb-cap').textContent; }), 'true|7 / 7|Added and edited');
    await t.page.keyboard.press('Escape'); await wait(t.page, 500);
    for (let i = 0; i < 3; i++) await t.redraw();
    const s1 = await stats(t);
    eq(at + ' | redraws leave one root and no extra listeners', s1.roots + '|' + s1.listeners, '1|' + s0.listeners);
    eq(at + ' | one caption line in the viewer after redraws', await t.page.evaluate(() => document.querySelectorAll('.r7-lb-cap').length), 1);
    /* shapes */
    const shapes = [];
    for (const v of ['square', 'portrait', 'landscape', 'original']) { await t.emit({image_ratio: v}); await frames(t.page); shapes.push(await t.root('.mlg__item').evaluateAll(els => els.slice(0, 4).map(el => { const r = el.querySelector('.mlg__tile').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height) + '@' + Math.round(r.x) + ',' + Math.round(r.y - els[0].getBoundingClientRect().y); }).join(' '))); }
    eq(at + ' | four shapes, four different drawings', new Set(shapes).size, 4);
    /* the fixture's stand-in picture has no size of its own: give the pictures real ones (3:2 and 2:3) */
    await t.page.route(/cdn\.test\/pic\d+\.jpg/, r => { const tall = /pic[135]/.test(r.request().url()); r.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="' + (tall ? 800 : 1200) + '" height="' + (tall ? 1200 : 800) + '"><rect width="100%" height="100%" fill="#888"/></svg>'}); });
    await t.root('.mlg__tile img[src]').evaluateAll(els => Promise.all(els.map(el => new Promise(done => { el.removeAttribute('srcset'); el.onload = el.onerror = done; el.src = el.getAttribute('src') + '&real=1'; setTimeout(done, 2000); }))));
    await frames(t.page);
    eq(at + ' | original keeps each picture\'s own proportions', await t.root('.mlg__tile[data-empty="false"]').evaluateAll(els => els.slice(0, 3).map(el => { const r = el.getBoundingClientRect(); return Math.round(r.width / r.height * 100) / 100; }).join()), '0.67,1.5,0.67');
    ok(at + ' | original: no sideways page scroll', await t.noOverflow());
    ok(at + ' | no sideways page scroll in any shape', await t.noOverflow());
    eq(at + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();

    const r = await mount(browser, G, {width, editing: false, blocks: GB(), assets: [JS, ...VIEWER], reducedMotion: 'reduce'});
    ok(at + ' | reduced motion: nothing animates and every picture shows', await r.root('.mlg__tile').evaluateAll(els => els.every(el => { const cs = getComputedStyle(el), img = el.querySelector('img'); return parseFloat(cs.transitionDuration) === 0 && cs.opacity === '1' && cs.visibility === 'visible' && parseFloat(getComputedStyle(img).transitionDuration) === 0 && el.getBoundingClientRect().height > 40; })));
    await r.root('[data-r7m-tile]').nth(0).click(); await wait(r.page, 200);
    ok(at + ' | reduced motion: the viewer still opens', await r.page.evaluate(() => document.querySelector('dialog.mt-lb').open));
    await r.page.keyboard.press('Escape'); await wait(r.page, 150);
    ok(at + ' | reduced motion: and closes at once', await r.page.evaluate(() => !document.querySelector('dialog.mt-lb').open));
    eq(at + ' | reduced motion: no errors', r.errors.join(' ; '), '');
    await r.page.close();
  }
}

async function playlistRuntime(browser) {
  const st = t => t.page.evaluate(() => { const stage = document.querySelector('[data-vp-stage]'), v = stage.querySelector('video.ivp__video'), f = stage.querySelector('iframe.ivp__frame'), play = stage.querySelector('[data-vp-play]'); return {state: stage.dataset.state, kind: stage.querySelector('[data-iv-player]').dataset.kind, videos: stage.querySelectorAll('video').length, frames: stage.querySelectorAll('iframe').length, src: v && v.getAttribute('src'), poster: v && v.getAttribute('poster'), controls: v && v.controls, auto: v && (v.autoplay || v.hasAttribute('autoplay')), muted: v && v.muted, loop: v && v.loop, preload: v && v.getAttribute('preload'), frame: f && f.getAttribute('src'), frameData: f && f.dataset.src, cover: (() => { const c = stage.querySelector('.ivp__cover'); return c && !c.hidden ? c.getAttribute('src') : ''; })(), playShown: !play.hidden && getComputedStyle(play).visibility === 'visible', playSize: play.getBoundingClientRect().width, active: [...document.querySelectorAll('[data-vp-item]')].map(i => i.dataset.active === 'true' ? 1 : 0).join(''), current: [...document.querySelectorAll('[data-vp-clip]')].map(i => i.getAttribute('aria-current') === 'true' ? 1 : 0).join(''), plays: (window.__plays || []).join(','), pauses: window.__pauses || 0}; });
  const track = t => t.page.evaluate(() => { const el = document.querySelector('[data-vp-track]'), cs = getComputedStyle(el), prev = document.querySelector('[data-vp-prev]'), next = document.querySelector('[data-vp-next]'), item = document.querySelector('[data-vp-item]'); return {x: Math.round(el.scrollLeft), max: el.scrollWidth - el.clientWidth, ox: cs.overflowX, oy: cs.overflowY, snap: cs.scrollSnapType, align: getComputedStyle(item).scrollSnapAlign, over: cs.overscrollBehaviorX, touch: cs.touchAction, bar: cs.scrollbarWidth, prev: prev.disabled, next: next.disabled, prevShown: getComputedStyle(prev).display !== 'none' && getComputedStyle(prev).visibility === 'visible', nextShown: getComputedStyle(next).display !== 'none' && getComputedStyle(next).visibility === 'visible', nextSize: next.getBoundingClientRect().width, snapped: [...document.querySelectorAll('[data-vp-item]')].some(i => Math.abs(i.getBoundingClientRect().left - el.getBoundingClientRect().left - 6) < 2)}; });
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const at = [V, width, editing ? 'builder' : 'visitor'].join(' | ');
    const t = await mount(browser, V, {width, editing, blocks: VB(), assets: [JS]});
    await stubMedia(t);
    let s = await st(t);
    eq(at + ' | first paint: the first clip\'s file in the theme\'s player', s.kind + '|' + s.src + '|' + s.videos + '|' + s.frames, 'file|' + FILE(1) + '|1|0');
    ok(at + ' | a cover and a play button first: no controls yet, no autoplay, not muted, no loop', !s.controls && !s.auto && !s.muted && !s.loop, s);
    ok(at + ' | its cover picture is the poster, and only the cover is asked for', has('poster1.jpg')(s.poster) && s.preload === 'none', s);
    eq(at + ' | nothing plays until a visitor asks', s.plays + '|' + s.state, '|idle');
    ok(at + ' | play button shown, at least 44px', s.playShown && s.playSize >= 44, s);
    eq(at + ' | first clip is the current one', s.active + '|' + s.current, '10000000|10000000');
    ok(at + ' | every clip is a button with a name, 44px or more to press', await t.root('.vpl__item').evaluateAll(els => els.length === 8 && els.every(el => { const b = el.querySelector('button[data-vp-clip]'), r = el.getBoundingClientRect(); return b && b.type === 'button' && (b.textContent.trim() || b.getAttribute('aria-label')) && r.width >= 44 && r.height >= 44 && getComputedStyle(b, '::after').position === 'absolute'; })));
    ok(at + ' | thumbnails: cover picture, video preview, or the placeholder', await t.root('.vpl__item').evaluateAll(els => { const src = i => { const img = els[i].querySelector('.vpl__thumb img'); return img.hidden ? '' : img.getAttribute('src'); }; return src(0).includes('poster1.jpg') && src(1).includes('preview.jpg') && src(3) === '' && !els[3].querySelector('.vpl__thumb svg').hasAttribute('hidden'); }));

    await t.root('[data-vp-play]').click(); await frames(t.page);
    s = await st(t);
    eq(at + ' | play starts the clip, with the browser\'s controls from then on', s.plays + '|' + s.state + '|' + s.controls, FILE(1) + '|playing|true');
    ok(at + ' | the play button steps aside while it plays', !s.playShown);
    await t.page.evaluate(() => document.querySelector('[data-vp-stage] video').pause()); await frames(t.page);
    eq(at + ' | pausing with the browser controls is followed', (await st(t)).state, 'paused');

    /* a press anywhere on the cover of an idle clip starts it too */
    await t.root('[data-vp-clip]').nth(4).click(); await frames(t.page);
    await t.page.evaluate(() => { const v = document.querySelector('[data-vp-stage] video'); Object.defineProperty(v, 'ended', {value: true, configurable: true}); v.__on = false; document.querySelector('.vpl').dataset.keep = document.querySelector('.vpl').dataset.next; document.querySelector('.vpl').dataset.next = 'false'; v.dispatchEvent(new Event('ended')); delete v.ended; document.querySelector('.vpl').dataset.next = document.querySelector('.vpl').dataset.keep; }); await frames(t.page);
    eq(at + ' | a clip with no cover shows its first frame', (await st(t)).preload + '|' + (await st(t)).state, 'metadata|idle');
    await t.root('[data-vp-stage]').click({position: {x: 12, y: 12}}); await frames(t.page);
    eq(at + ' | a press anywhere on the cover starts the clip', (await st(t)).state + '|' + (await st(t)).plays.split(',').pop(), 'playing|' + FILE(5));
    await t.page.evaluate(() => { window.__plays = [window.__plays[0]]; window.__pauses = 1; document.querySelector('[data-vp-stage] video').__on = false; });
    await t.root('[data-vp-clip]').nth(1).click(); await frames(t.page);
    s = await st(t);
    eq(at + ' | picking clip two: its uploaded file plays', s.src + '|' + s.plays + '|' + s.state, 'https://cdn.test/up.mp4|' + FILE(1) + ',https://cdn.test/up.mp4|playing');
    eq(at + ' | one player, one video', s.videos + '|' + s.frames, '1|0');
    ok(at + ' | its preview picture is the poster', has('preview.jpg')(s.poster), s.poster);
    eq(at + ' | clip two is the current one', s.active + '|' + s.current, '01000000|01000000');

    await t.root('[data-vp-clip]').nth(2).click(); await frames(t.page);
    s = await st(t);
    eq(at + ' | a YouTube clip: the privacy embed, started by the press', s.kind + '|' + s.frame, 'youtube|https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&mute=0&loop=0&playlist=abcdefghijk&controls=1&playsinline=1&rel=0&modestbranding=1');
    eq(at + ' | the file player is gone and was paused', s.videos + '|' + s.pauses, '0|2');
    ok(at + ' | the cover sits under the embed', has('poster3.jpg')(s.cover), s.cover);
    await t.root('[data-vp-clip]').nth(3).click(); await frames(t.page);
    s = await st(t);
    eq(at + ' | a Vimeo clip', s.kind + '|' + s.frame + '|' + s.frames, 'vimeo|https://player.vimeo.com/video/123456789?autoplay=1&muted=0&loop=0&controls=1&playsinline=1&dnt=1|1');
    eq(at + ' | clip four is the current one', s.active, '00010000');

    /* the next clip follows a finished one */
    await t.root('[data-vp-clip]').nth(4).click(); await frames(t.page);
    await t.page.evaluate(() => { const v = document.querySelector('[data-vp-stage] video'); Object.defineProperty(v, 'ended', {value: true}); v.__on = false; v.dispatchEvent(new Event('ended')); }); await frames(t.page);
    s = await st(t);
    eq(at + ' | the next clip follows a finished one', s.active + '|' + s.src + '|' + s.state, '00000100|' + FILE(6) + '|playing');
    await t.emit({autoplay_next: false}); await frames(t.page);
    await t.root('[data-vp-clip]').nth(5).click(); await frames(t.page);
    await t.page.evaluate(() => { const v = document.querySelector('[data-vp-stage] video'); Object.defineProperty(v, 'ended', {value: true}); v.__on = false; v.dispatchEvent(new Event('ended')); }); await frames(t.page);
    s = await st(t);
    eq(at + ' | not when "Play the next clip" is off: it stops and offers play again', s.active + '|' + s.state + '|' + s.playShown + '|' + s.controls, '00000100|idle|true|false');
    await t.emit({autoplay_next: true}); await frames(t.page);
    await t.root('[data-vp-clip]').nth(7).click(); await frames(t.page);
    await t.page.evaluate(() => { const v = document.querySelector('[data-vp-stage] video'); Object.defineProperty(v, 'ended', {value: true}); v.__on = false; v.dispatchEvent(new Event('ended')); }); await frames(t.page);
    eq(at + ' | the last clip ends the list', (await st(t)).active + '|' + (await st(t)).state, '00000001|idle');

    /* a playing file pauses when the player leaves the screen */
    await t.root('[data-vp-clip]').nth(0).click(); await frames(t.page);
    const pausesBefore = (await st(t)).pauses;
    await t.page.evaluate(() => { const d = document.createElement('div'); d.style.height = '4000px'; d.id = 'push'; document.body.prepend(d); }); await wait(t.page, 250);
    s = await st(t);
    eq(at + ' | a playing clip pauses when the player leaves the screen', (s.pauses - pausesBefore) + '|' + s.state, '1|paused');
    await t.page.evaluate(() => document.getElementById('push').remove()); await wait(t.page, 250);
    eq(at + ' | and does not start again by itself', (await st(t)).state, 'paused');

    if (editing) {
      /* picking a Clip block in the builder shows it without playing */
      const plays = (await st(t)).plays;
      await t.page.evaluate(() => document.querySelectorAll('[data-vp-item]')[4].dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true}))); await frames(t.page);
      s = await st(t);
      eq(at + ' | picking a Clip block shows that clip, without playing', s.active + '|' + s.src + '|' + (s.plays === plays) + '|' + s.state, '00001000|' + FILE(5) + '|true|idle');
      /* unrelated edits never rebuild the player */
      await t.root('[data-vp-clip]').nth(0).click(); await frames(t.page);
      await t.page.evaluate(() => { document.querySelector('[data-vp-stage] video').__kept = 1; document.querySelectorAll('.vpl__thumb img').forEach((el, i) => { el.__kept = i + 1; el.__src = el.getAttribute('src'); }); });
      const b0 = (await stats(t)).builds;
      await t.emit({padding_top_desktop: 12, padding_top_mobile: 12, media_radius: 4, video_ratio: 'square', list_position: 'below', enable_custom_style: true, section_bg: '#102030', accent_color: '#ff0000', color_scheme: 'alt-scheme', video_fit: 'contain', gap_desktop: 8, gap_mobile: 8});
      await t.emit({text: 'Unrelated heading edit'}, t.blockId('heading'));
      await t.emit({title: 'Other clip title', caption: 'Other clip line', poster: POSTER(7)}, t.blockId('clip', 5));
      await t.emit({title: 'Current clip title', caption: 'Current clip line'}, t.blockId('clip', 0));
      await frames(t.page);
      s = await st(t);
      ok(at + ' | a playing clip is not rebuilt, restarted or paused by unrelated edits', await t.page.evaluate(() => document.querySelector('[data-vp-stage] video').__kept === 1) && s.state === 'playing' && (await stats(t)).builds === b0, s);
      ok(at + ' | no thumbnail is replaced or reloaded by unrelated edits', await t.root('.vpl__thumb img').evaluateAll(els => els.every((el, i) => el.__kept === i + 1 && (i === 5 || el.getAttribute('src') === el.__src))));
      eq(at + ' | the edited clip\'s thumbnail did change', await probe(t, '.vpl__item:nth-child(6) .vpl__thumb img', '@src'), 'https://cdn.test/poster7.jpg');
      /* added block and redraws */
      const l0 = (await stats(t)).listeners;
      const next = await t.redraw({blocks: VB().concat([{type: 'clip', settings: {video_url: FILE(9), title: 'Added clip'}}])});
      await stubMedia(t);
      eq(at + ' | an added clip is drawn', await t.root('[data-vp-item]').count(), 9);
      const added = next.section.blocks[next.section.blocks.length - 1].id;
      await t.emit({title: 'Added and edited'}, added); await frames(t.page);
      eq(at + ' | and is live-editable', await probe(t, '.vpl__item:nth-child(9) .vpl__clip', 'text'), 'Added and edited');
      await t.root('[data-vp-clip]').nth(8).click(); await frames(t.page);
      eq(at + ' | and plays when picked', (await st(t)).src + '|' + (await st(t)).state, FILE(9) + '|playing');
      for (let i = 0; i < 3; i++) await t.redraw();
      await stubMedia(t);
      const s1 = await stats(t);
      eq(at + ' | redraws leave one root and no extra listeners', s1.roots + '|' + s1.listeners, '1|' + l0);
      await t.root('[data-vp-clip]').nth(1).click(); await frames(t.page);
      eq(at + ' | one click plays once after redraws', (await st(t)).plays, 'https://cdn.test/up.mp4');
    }
    eq(at + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* The list as a native sideways scroller: a phone, and under the player on desktop. */
  for (const [width, settings] of [[375, {}], [1366, {list_position: 'below'}]]) for (const editing of [true, false]) {
    const at = [V, width, editing ? 'builder' : 'visitor', 'clip row'].join(' | ');
    const t = await mount(browser, V, {width, editing, settings, blocks: VB(), assets: [JS]});
    await stubMedia(t); await frames(t.page);
    let k = await track(t);
    eq(at + ' | native scroller', [k.ox, k.oy, k.snap, k.align, k.over, k.touch, k.bar].join('|'), 'auto|hidden|x mandatory|start|contain|pan-x pan-y|none');
    ok(at + ' | the row is wider than its window', k.max > 100, k.max);
    eq(at + ' | starts at the first clip', k.x, 0);
    await t.page.evaluate(() => { document.querySelector('[data-vp-track]').scrollLeft = 150; }); await wait(t.page, 500);
    k = await track(t);
    ok(at + ' | moves by its own scroll, as a finger moves it', k.x > 50, k.x);
    ok(at + ' | and snaps to a clip', k.snapped, k.x);
    await t.page.evaluate(() => { document.querySelector('[data-vp-track]').scrollLeft = 0; }); await wait(t.page, 300);
    await t.root('[data-vp-track]').focus();
    eq(at + ' | focus ring on the row', await t.page.evaluate(() => { const el = document.querySelector('[data-vp-track]'); return el.matches(':focus-visible') ? getComputedStyle(el).outlineStyle : 'not focus-visible'; }), 'solid');
    await t.page.keyboard.press('ArrowRight'); await wait(t.page, 700);
    const x1 = (await track(t)).x;
    ok(at + ' | ArrowRight moves the row on', x1 > 50, x1);
    await t.page.keyboard.press('ArrowRight'); await wait(t.page, 700);
    const x2 = (await track(t)).x;
    ok(at + ' | and again', x2 > x1, [x1, x2]);
    await t.page.keyboard.press('ArrowLeft'); await wait(t.page, 700);
    ok(at + ' | ArrowLeft moves it back', (await track(t)).x < x2, [(await track(t)).x, x2]);
    eq(at + ' | up and down keys are left to the page, sideways keys are taken', await t.page.evaluate(() => ['ArrowDown', 'ArrowUp', 'ArrowRight'].map(key => { const e = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}); document.querySelector('[data-vp-track]').dispatchEvent(e); return e.defaultPrevented; }).join()), 'false,false,true');
    /* arrow keys on a focused clip move the focus along the row */
    await t.page.evaluate(() => { document.querySelector('[data-vp-track]').scrollLeft = 0; }); await wait(t.page, 300);
    await t.root('[data-vp-clip]').nth(0).focus(); await t.page.keyboard.press('ArrowRight'); await wait(t.page, 100);
    eq(at + ' | ArrowRight on a clip moves focus to the next clip', await t.page.evaluate(() => [...document.querySelectorAll('[data-vp-clip]')].indexOf(document.activeElement)), 1);
    await t.page.keyboard.press('Enter'); await frames(t.page);
    eq(at + ' | Enter on it plays that clip', await t.page.evaluate(() => window.__plays.join()), 'https://cdn.test/up.mp4');
    /* picking a clip that is off the row's window brings it in, the page does not move */
    const yBefore = await t.page.evaluate(() => scrollY);
    await t.page.evaluate(() => document.querySelectorAll('[data-vp-clip]')[7].click()); await wait(t.page, 800);
    ok(at + ' | picking a clip out of view brings it into the row\'s window', await t.page.evaluate(() => { const el = document.querySelector('[data-vp-track]').getBoundingClientRect(), i = document.querySelectorAll('[data-vp-item]')[7].getBoundingClientRect(); return i.left >= el.left - 1 && i.right <= el.right + 1; }));
    eq(at + ' | the page itself did not scroll', await t.page.evaluate(() => scrollY), yBefore);
    await t.page.evaluate(() => { document.querySelector('[data-vp-track]').scrollLeft = 0; }); await wait(t.page, 400);
    k = await track(t);
    if (width >= 900) {
      ok(at + ' | arrows: previous off at the start, next on, 44px', k.prev && !k.next && k.nextShown && !k.prevShown && k.nextSize >= 44, k);
      await t.root('[data-vp-next]').click(); await wait(t.page, 800);
      k = await track(t);
      ok(at + ' | next moves the row on and previous comes on', k.x > 100 && !k.prev && k.prevShown, k);
      for (let i = 0; i < 6 && !(await track(t)).next; i++) { await t.root('[data-vp-next]').click(); await wait(t.page, 800); }
      k = await track(t);
      ok(at + ' | next goes off at the end', k.next && !k.nextShown && Math.abs(k.x - k.max) <= 2, k);
      await t.root('[data-vp-prev]').click(); await wait(t.page, 800);
      ok(at + ' | previous moves it back', (await track(t)).x < k.x);
    } else ok(at + ' | no arrows on a phone: the finger moves the row', !k.prevShown && !k.nextShown, k);
    ok(at + ' | no sideways page scroll', await t.noOverflow());
    eq(at + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* Layouts and shapes are different drawings; beside: the list is a column the height of the player. */
  for (const how of ['live', 'redraw']) {
    const t = await mount(browser, V, {width: 1366, editing: true, blocks: VB(), assets: [JS]});
    const box = () => t.page.evaluate(() => { const q = s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }; return q('.vpl__stage') + ' ' + q('.vpl__side') + ' ' + q('.vpl__item:nth-child(2)'); });
    const beside = await box(), k = await t.page.evaluate(() => { const tr = document.querySelector('[data-vp-track]'), cs = getComputedStyle(tr), stage = document.querySelector('.vpl__stage').getBoundingClientRect(), side = tr.getBoundingClientRect(); return {oy: cs.overflowY, ox: cs.overflowX, snap: cs.scrollSnapType, over: cs.overscrollBehaviorY, same: Math.abs(stage.height - side.height) < 2, arrows: [...document.querySelectorAll('.vpl__arrow')].every(a => getComputedStyle(a).display === 'none'), dir: getComputedStyle(document.querySelector('.vpl__list')).flexDirection}; });
    ok(V + ' | 1366 | ' + how + ' | beside: a column as tall as the player, scrolling inside it, page scroll not trapped, no arrows', k.oy === 'auto' && k.ox === 'hidden' && k.snap === 'none' && k.over === 'auto' && k.same && k.arrows && k.dir === 'column', k);
    await change(t, {list_position: 'below'}, {}, how);
    const below = await box();
    ok(V + ' | 1366 | ' + how + ' | beside and below are different drawings', beside !== below, [beside, below]);
    const shapes = [];
    for (const v of ['landscape', 'square', 'portrait']) { await change(t, {video_ratio: v}, {}, how); shapes.push(await box()); }
    eq(V + ' | 1366 | ' + how + ' | three shapes, three different drawings', new Set(shapes).size, 3);
    ok(V + ' | 1366 | ' + how + ' | the portrait player is no taller than 640px', await t.root('.vpl__stage').evaluate(el => el.getBoundingClientRect().height <= 641));
    const fits = [];
    for (const v of ['cover', 'contain']) { await change(t, {video_fit: v}, {}, how); fits.push(await t.css('.ivp__video', 'objectFit')); }
    eq(V + ' | 1366 | ' + how + ' | fill and fit', fits.join(), 'cover,contain');
    eq(V + ' | 1366 | ' + how + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* Reduced motion: nothing moves by itself, everything shows, scrolling is instant. */
  for (const width of [375, 1366]) {
    const at = V + ' | ' + width + ' | reduced motion';
    const t = await mount(browser, V, {width, editing: false, settings: {list_position: 'below'}, blocks: VB(), assets: [JS], reducedMotion: 'reduce'});
    await stubMedia(t);
    eq(at + ' | nothing plays on load', await t.page.evaluate(() => window.__plays.length), 0);
    ok(at + ' | every clip and the player show', await t.root('.vpl__item, .vpl__stage').evaluateAll(els => els.every(el => { const cs = getComputedStyle(el); return cs.opacity === '1' && cs.visibility === 'visible' && el.getBoundingClientRect().height > 40; })));
    ok(at + ' | no transitions', await t.root('.vpl__play, .vpl__thumb').evaluateAll(els => els.every(el => parseFloat(getComputedStyle(el).transitionDuration) === 0)));
    await t.root('[data-vp-clip]').nth(4).click(); await frames(t.page);
    await t.page.evaluate(() => { const v = document.querySelector('[data-vp-stage] video'); Object.defineProperty(v, 'ended', {value: true}); v.__on = false; v.dispatchEvent(new Event('ended')); }); await frames(t.page);
    eq(at + ' | the next clip does not start by itself', await t.page.evaluate(() => [...document.querySelectorAll('[data-vp-item]')].findIndex(i => i.dataset.active === 'true') + '|' + document.querySelector('[data-vp-stage]').dataset.state + '|' + window.__plays.length), '4|idle|1');
    await t.page.evaluate(() => { document.querySelector('[data-vp-track]').scrollLeft = 0; }); await wait(t.page, 200);
    await t.root('[data-vp-track]').focus(); await t.page.keyboard.press('ArrowRight');
    ok(at + ' | the row moves at once, with no glide', await t.page.evaluate(() => document.querySelector('[data-vp-track]').scrollLeft > 50));
    eq(at + ' | no errors', t.errors.join(' ; '), '');
    await t.page.close();
  }

  /* A clip with nothing to play, and a first clip that is an embed. */
  {
    const t = await mount(browser, V, {width: 375, editing: true, blocks: [{type: 'clip', settings: {title: 'Empty'}}, {type: 'clip', settings: {video_url: 'https://youtu.be/abcdefghijk', poster: POSTER(2), title: 'Embed'}}], assets: [JS]});
    await stubMedia(t);
    let s = await st(t);
    ok(V + ' | empty first clip: placeholder, no play button, no player', s.kind === 'none' && !s.playShown && s.videos + s.frames === 0 && await t.root('.ivp__ph').evaluate(el => !el.hidden), s);
    await t.root('[data-vp-clip]').nth(1).click(); await frames(t.page);
    s = await st(t);
    ok(V + ' | then an embed picked: loaded only now', s.kind === 'youtube' && has('autoplay=1')(s.frame), s);
    await t.root('[data-vp-clip]').nth(0).click(); await frames(t.page);
    s = await st(t);
    ok(V + ' | back to the empty clip: the embed is removed', s.kind === 'none' && s.frames === 0 && !s.playShown, s);
    eq(V + ' | empty clip: no errors', t.errors.join(' ; '), '');
    await t.page.close();
    const e = await mount(browser, V, {width: 1366, editing: false, blocks: [{type: 'clip', settings: {video_url: 'https://vimeo.com/123456789', poster: POSTER(2), title: 'Embed first'}}], assets: [JS]});
    s = await st(e);
    ok(V + ' | an embed as the first clip is not loaded before play', s.kind === 'vimeo' && s.frame === null && has('autoplay=0')(s.frameData) && has('poster2.jpg')(s.cover) && s.playShown, s);
    await e.root('[data-vp-play]').click(); await frames(e.page);
    s = await st(e);
    ok(V + ' | play loads it, playing', has('player.vimeo.com/video/123456789?autoplay=1')(s.frame) && s.state === 'playing' && !s.playShown, s);
    eq(V + ' | embed first: no errors', e.errors.join(' ; '), '');
    await e.page.close();
  }
}

(async () => {
  const browser = await launch();
  try {
    if (want('gallery')) { await common(browser, G); await galleryRuntime(browser); }
    if (want('playlist')) { await common(browser, V); await playlistRuntime(browser); }
  } finally { await browser.close(); }
  for (const f of failed) console.error('FAIL ' + f);
  console.log('theme-r7-media: ' + passed + ' checks passed, ' + failed.length + ' failed');
  if (failed.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
