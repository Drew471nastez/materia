// Static check for every section whose file name starts with a to l.
//
// 1. Format: line 1 is <template compat="shopify"> (or <template> for a
//    section written in the Storelib format), the markup closes with
//    </template> before <schema>, the schema is strict JSON, Liquid block
//    tags are balanced (inside {% liquid %} too) and <style>, <script> and
//    <template> open and close the same number of times.
// 2. Every setting id in the schema (section settings and every block's
//    settings) is read by the section or a snippet it renders: as
//    settings.id, through an alias (assign s = block.settings, then s.id),
//    as s['id'], or as a key built in a loop ('pill' | append: i ...,
//    pill{{ i }}_text). A read that only lands in a variable nothing uses
//    again does not count. Ids that cannot be read are listed in ALLOW with
//    the reason; settings hidden from the panel with visible_if {{ false }}
//    are retired ones kept so stored content survives.
// 3. No picture is hot-linked from a third-party demo site; empty image
//    slots use the inline placeholder (snippets/placeholder-render).
// 4. The fixes made here hold: the Reveal on scroll toggle really turns
//    the theme reveal off, and the sections with their own scroll animation
//    offer and draw the theme's blur_up, slide_side and mask_reveal.
//
// node tests/theme-sections-a-l.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const FILES = fs.readdirSync(path.join(root, 'sections')).filter(f => /^[a-l][\w-]*\.storelib$/.test(f)).sort();

// file -> { 'block/id' or 'section/id': reason }
const ALLOW = {
  'featured-product.storelib': {
    'upsell_pro/source': 'The upsell list shows the picked products only; the shared upsell snippet adds no recommendations on Storelib, and the info text says so.',
  },
};
// Storelib-format sections: the engine applies its own `animation` select.
const ENGINE_IDS = new Set(['animation']);

const THIRD_PARTY = /https?:\/\/(?:www\.)?(?:2dbags\.co|numedicousa\.com|grabthetorch\.org|placehold\.(?:it|co)|via\.placeholder\.com|picsum\.photos|unsplash\.com|images\.unsplash\.com|example\.com)\/[^\s"')]*\.(?:jpe?g|png|gif|webp|avif|svg)/i;
const IMAGE_URL = /(?:src=["']|url\(\s*['"]?|['"])(https?:\/\/([^/"'\s)]+)\/[^"'\s)]*\.(?:jpe?g|png|gif|webp|avif))/gi;
const IMAGE_HOSTS = /(^|\.)(cdn\.shopify\.com|shopify\.com|storelib\.com|storelib\.app)$/i;

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parts(text) {
  const si = text.indexOf('<schema>');
  const se = text.indexOf('</schema>');
  return { si, se, markup: si === -1 ? text : text.slice(0, si), schemaText: si === -1 ? '' : text.slice(si + 8, se) };
}

const snippetCache = new Map();
function snippetText(name) {
  if (!snippetCache.has(name)) {
    const p = path.join(root, 'snippets', name + '.storelib');
    snippetCache.set(name, fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
  }
  return snippetCache.get(name);
}
function withSnippets(text, seen = new Set()) {
  let out = '';
  for (const m of text.matchAll(/\{%-?\s*(?:render|include)\s+['"]([^'"]+)['"]/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const t = snippetText(m[1]);
    if (t) out += '\n' + t + withSnippets(t, seen);
  }
  return out;
}

// Liquid block balance, with {% comment %} and {% raw %} bodies skipped.
const BLOCKS = new Set(['if', 'unless', 'for', 'case', 'capture', 'form', 'paginate', 'tablerow', 'style', 'javascript', 'stylesheet', 'schema']);
function liquidBalance(markup) {
  const stack = [];
  const problems = [];
  let skip = null;
  const tags = [...markup.matchAll(/\{%-?\s*([\s\S]*?)\s*-?%\}/g)];
  const handle = (word, line) => {
    if (skip) {
      if (word === 'end' + skip) skip = null;
      return;
    }
    if (word === 'comment' || word === 'raw') { skip = word; return; }
    if (BLOCKS.has(word)) { stack.push([word, line]); return; }
    if (word.startsWith('end') && BLOCKS.has(word.slice(3))) {
      const top = stack.pop();
      if (!top || top[0] !== word.slice(3)) problems.push(`line ${line}: ${word} closes ${top ? top[0] + ' from line ' + top[1] : 'nothing'}`);
    }
  };
  for (const t of tags) {
    const line = markup.slice(0, t.index).split('\n').length;
    const body = t[1];
    const word = (body.match(/^(\w+)/) || [])[1] || '';
    if (word === 'liquid' && !skip) {
      for (const l of body.slice(6).split('\n')) {
        const w = (l.trim().match(/^(\w+)/) || [])[1];
        if (w) handle(w, line);
      }
    } else handle(word, line);
  }
  if (skip) problems.push(`unclosed ${skip}`);
  for (const [w, l] of stack) problems.push(`line ${l}: ${w} is never closed`);
  return problems;
}

function settingsOf(schema) {
  const sh = schema.shopify || schema;
  const out = [];
  const take = (list, owner) => {
    for (const s of list || []) {
      if (!s.id || s.type === 'header' || s.type === 'paragraph') continue;
      out.push({ owner, id: s.id, hidden: /\{\{\s*false\s*\}\}/.test(s.visible_if || ''), storelib: !schema.shopify });
    }
  };
  take(sh.settings, 'section');
  for (const b of sh.blocks || []) take(b.settings, b.type);
  return out;
}

function readers(markup) {
  const aliases = new Set(['settings']);
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of markup.matchAll(/\b(\w+)\s*=\s*([\w.]+)/g)) {
      const rhs = m[2];
      if ((rhs.split('.').pop() === 'settings' || aliases.has(rhs)) && !aliases.has(m[1])) { aliases.add(m[1]); grew = true; }
    }
  }
  return '(?:' + [...aliases].map(esc).join('|') + ')';
}

function isRead(id, markup, norm, al) {
  const hits = [...markup.matchAll(new RegExp('\\b' + al + '(?:\\.|\\[[\'"])' + esc(id) + '\\b', 'g'))];
  const used = hits.some(h => {
    const start = markup.lastIndexOf('\n', h.index) + 1;
    const end = markup.indexOf('\n', h.index);
    const line = markup.slice(start, end === -1 ? markup.length : end);
    const m = line.match(/^\s*(?:\{%-?\s*)?assign\s+(\w+)\s*=\s*[\w.]+(?:\s*\|[^\n]*)?$/);
    if (!m) return true;
    return (markup.match(new RegExp('\\b' + m[1] + '\\b', 'g')) || []).length > 1;
  });
  if (used) return true;
  const dyn = id.replace(/\d+/g, '\u0000');
  if (dyn !== id && new RegExp('\\b' + esc(dyn).replace(/\u0000/g, '(?:#|\\d+)') + '(?!\\w)').test(norm)) return true;
  return false;
}

let checks = 0;
const failures = [];
const allowed = [];
const fail = (f, msg) => failures.push(`${f}: ${msg}`);

for (const f of FILES) {
  const rel = 'sections/' + f;
  const text = read(rel);
  const { si, se, markup, schemaText } = parts(text);
  const firstLine = text.split('\n')[0];

  // 1. Format.
  let schema;
  try { schema = JSON.parse(schemaText); } catch (e) { fail(f, 'schema is not strict JSON: ' + e.message); continue; }
  const isStorelib = !schema.shopify;
  if (isStorelib ? firstLine !== '<template>' : firstLine !== '<template compat="shopify">') fail(f, `line 1 is ${JSON.stringify(firstLine)}`);
  if (si === -1 || se === -1) fail(f, 'no <schema> ... </schema>');
  if (!/<\/template>\s*(?:<style(?: scoped)?>[\s\S]*<\/style>\s*)?(?:<script>[\s\S]*<\/script>\s*)?$/.test(markup)) fail(f, 'markup does not close with </template> before <schema>');
  for (const p of liquidBalance(markup)) fail(f, 'Liquid ' + p);
  const plain = markup.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['style', 'script', 'template']) {
    const open = (plain.match(new RegExp('<' + tag + '(?=[\\s>])', 'g')) || []).length;
    const close = (plain.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (open !== close) fail(f, `<${tag}> opens ${open} times and closes ${close} times`);
  }
  checks++;

  // 2. Every setting is read.
  const all = markup + withSnippets(markup);
  const norm = all
    .replace(/(['"])\s*\|\s*append:\s*[\w.]+\s*\|\s*append:\s*(['"])/g, '#')
    .replace(/(['"])\s*\|\s*append:\s*[\w.]+/g, '#$1')
    .replace(/\{\{-?\s*[\w.]+\s*-?\}\}/g, '#');
  const al = readers(all);
  const seen = new Set();
  for (const s of settingsOf(schema)) {
    const key = s.owner + '/' + s.id;
    if (seen.has(key)) fail(f, `${key} is declared twice`);
    seen.add(key);
    if (isRead(s.id, all, norm, al)) continue;
    const reason = (ALLOW[f] || {})[key];
    if (reason) { allowed.push(`${f} ${key}: ${reason}`); continue; }
    if (s.hidden) continue; // retired, hidden from the panel, kept for stored content
    if (s.storelib && ENGINE_IDS.has(s.id)) continue;
    fail(f, `${key} is never read`);
  }
  checks++;

  // 3. No hot-linked pictures.
  const m3 = text.match(THIRD_PARTY);
  if (m3) fail(f, 'hot-links a third-party picture: ' + m3[0]);
  for (const m of markup.matchAll(IMAGE_URL)) {
    if (!IMAGE_HOSTS.test(m[2])) fail(f, 'loads a picture from ' + m[2]);
  }
  checks++;
}

// Every ALLOW entry still names a real, unread setting.
for (const [f, ids] of Object.entries(ALLOW)) {
  for (const key of Object.keys(ids)) assert.ok(allowed.some(a => a.startsWith(`${f} ${key}:`)), `ALLOW ${f} ${key} is stale`);
}
checks++;

// 4a. Reveal on scroll: off means no theme reveal class and the layout's
// reveal skips the section.
for (const f of FILES) {
  const text = read('sections/' + f);
  const { markup, schemaText } = parts(text);
  const schema = JSON.parse(schemaText);
  const ids = ((schema.shopify || schema).settings || []).map(s => s.id);
  if (!ids.includes('reveal')) continue;
  const hook = markup.match(/\{%-?\s*if settings\.scroll_animation != blank and settings\.scroll_animation != 'none'([^%]*)-?%\}/);
  if (!hook) continue;
  const local = /section\.settings\.reveal|\bst\.reveal|\breveal\b\s*(?:and|%)|__ti_reveal\s*==/.test(markup.replace(hook[0], ''));
  if (!/section\.settings\.reveal(?: != false)?\b/.test(hook[1]) && !local) fail(f, 'Reveal on scroll does not reach the theme reveal');
}
for (const f of ['inline-image-heading', 'addtocartbutton', 'annoucment-bar-scrolling', 'announcement-bar-basic', 'announcement-bar', 'banner3', 'before-and-after-image', 'before-and-after-slider', 'benefits-bar-2', 'benefits-bar', 'benefits-icons2', 'benefits-tabs', 'benefits2', 'collection-banner', 'collectionnlist', 'featured-product']) {
  const m = parts(read(`sections/${f}.storelib`)).markup;
  assert.match(m, /\{%-?\s*if section\.settings\.reveal == false\s*-?%\}<span data-ti-no-reveal hidden><\/span>/, `${f}: reveal off marks the section for the layout reveal`);
  const hook = m.match(/\{%-?\s*if settings\.scroll_animation != blank and settings\.scroll_animation != 'none'([^%]*)-?%\}/);
  if (hook) assert.match(hook[1], /and section\.settings\.reveal(?: != false)?\s*-?$/, `${f}: reveal off skips the theme reveal class`);
  else assert.match(m, /if __ti_reveal == false\s+assign __theme_scroll_animation = 'none'/, `${f}: reveal off skips the theme reveal class`);
}
const layout = read('layout/theme.storelib');
assert.match(layout, /querySelector\('\[data-ti-no-reveal\]'\)/, 'the layout reveal skips sections marked data-ti-no-reveal');
checks++;

// 4b. Own scroll animations offer and draw the theme's newer reveals.
const NEW_REVEALS = ['blur_up', 'slide_side', 'mask_reveal'];
for (const f of ['faq', 'faq1', 'faq5', 'faq-pro', 'collection-tab', 'countdown-timer2']) {
  const { markup, schemaText } = parts(read(`sections/${f}.storelib`));
  const setting = JSON.parse(schemaText).shopify.settings.find(s => s.id === 'scroll_animation');
  const values = setting.options.map(o => o.value);
  for (const v of NEW_REVEALS) {
    assert.ok(values.includes(v), `${f}: scroll_animation offers ${v}`);
    assert.match(markup, new RegExp(`when '${v}'`), `${f}: draws ${v}`);
  }
  assert.match(markup, /prefers-reduced-motion[\s\S]*clip-path: none !important/, `${f}: the mask and blur stop under reduced motion`);
}
const animationCss = read('shopify/assets/animation.css');
for (const v of NEW_REVEALS) assert.match(animationCss, new RegExp(`\\.scroll-trigger\\.${v}\\b`), `animation.css draws ${v} for cards`);
checks++;

// 4c. benefits icon type: an uploaded picture wins when the type says so.
for (const f of ['benefits-bar', 'benefits-icons2']) {
  assert.match(parts(read(`sections/${f}.storelib`)).markup, /block\.settings\.icon_type == 'upload' and custom_icon != blank/, `${f}: Icon type picks the upload`);
}
checks++;

if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} problem(s) in sections a to l`);
  process.exit(1);
}
if (process.argv.includes('--allowed')) console.log(allowed.join('\n'));
console.log(`${checks} checks passed for ${FILES.length} sections a to l (${allowed.length} allowlisted setting(s))`);
