// Static check of the theme's own sections whose file names start with m to z
// (main-account ... wavyrichtextbanner), and sections/overlay-group.json.
//
//  1. Every setting id in a section's "shopify" schema (section and block
//     settings) is read by the template, or by a snippet it renders: through
//     section.settings.X, block.settings.X, an alias of a settings object
//     (assign st = section.settings, then st.X; a render parameter bs:
//     block.settings), a bracket read (st['X']), or a key the template builds
//     (pill{{ i }}_text, 'sort_' | append: value, a quoted list of keys that
//     is split and read as st[key]). A read that only fills a variable nothing
//     uses does not count. A setting that is never read is either hidden from
//     the builder (visible_if "{{ false }}": retired, its id kept for the
//     values already saved under it) or named in ALLOW with the reason.
//  2. No picture or video in the template or the "shopify" schema is hot
//     linked from another store's demo host (2dbags.co, numedicousa.com, the
//     old platform's CDN...): an empty image setting draws the theme's inline
//     placeholder (snippets/placeholder-render).
//  3. The file format Storelib reads: line 1 is <template compat="shopify">
//     (or a Storelib section's <template>), one </template> before <schema>,
//     the schema is JSON with a "shopify" object, setting ids are unique per
//     schema, Liquid block tags are balanced (inside {% liquid %} too) and the
//     template's <style> and <script> tags close.
//
// node tests/theme-sections-m-z.cjs          exits 1 on any finding
// node tests/theme-sections-m-z.cjs --list   also lists every hidden unread id
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sectionsDir = path.join(root, 'sections');
const snippetsDir = path.join(root, 'snippets');

// file -> { 'block_type:id' or 'section:id': reason } for visible settings that
// are not read on purpose.
const ALLOW = {};

// Hosts of the old store's demo pictures and videos. Any http(s) address of a
// picture or video file on a host not listed in MEDIA_OK is refused as well.
const DEMO_HOSTS = /(?:https?:)?\/\/(?:[\w-]+\.)*(2dbags\.co|numedicousa\.com|cdn\.shopify\.com|pinimg\.com|uplifted\.ai|billo\.app|unsplash\.com|pexels\.com|placehold\.co|via\.placeholder\.com|picsum\.photos)\b/i;
const MEDIA_URL = /https?:\/\/([a-z0-9.-]+)\/[^"'\s)]*\.(?:jpe?g|png|gif|webp|avif|svg|mp4|webm|mov)\b/gi;
const MEDIA_OK = /(^|\.)storelib\.com$|(^|\.)w3\.org$/i;

const STRIP_COMMENTS = s => s
  .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const esc = s => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const files = fs.readdirSync(sectionsDir).filter(f => /^[m-z][a-z0-9_-]*\.storelib$/.test(f)).sort();
const findings = [];
const fail = (file, msg) => findings.push(`${file}: ${msg}`);
let idCount = 0, hiddenUnread = 0, allowedUnread = 0, dynamicReads = 0;
const hiddenList = [];

function parts(text) {
  const schemaAt = text.indexOf('\n<schema>');
  const templateEnd = text.lastIndexOf('\n</template>', schemaAt === -1 ? text.length : schemaAt);
  return { schemaAt, templateEnd, template: templateEnd === -1 ? '' : text.slice(0, templateEnd) };
}

// The template and every snippet it renders or includes, recursively.
const snippetCache = new Map();
function withSnippets(template) {
  let all = STRIP_COMMENTS(template);
  const seen = new Set();
  const queue = [all];
  while (queue.length) {
    const src = queue.pop();
    for (const m of src.matchAll(/\b(?:render|include)\s+['"]([\w-]+)['"]/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const file = path.join(snippetsDir, m[1] + '.storelib');
      if (!snippetCache.has(file)) snippetCache.set(file, fs.existsSync(file) ? STRIP_COMMENTS(fs.readFileSync(file, 'utf8')) : '');
      const body = snippetCache.get(file);
      all += '\n' + body;
      queue.push(body);
    }
  }
  return all;
}

// Liquid block tags, also inside {% liquid %} (one tag per line).
const BLOCK = { if: 'endif', unless: 'endunless', case: 'endcase', for: 'endfor', capture: 'endcapture', form: 'endform', paginate: 'endpaginate', style: 'endstyle', tablerow: 'endtablerow', javascript: 'endjavascript', stylesheet: 'endstylesheet' };
const ENDS = new Set(Object.values(BLOCK));
function checkTags(file, template) {
  const stack = [];
  const tag = (name, at) => {
    if (BLOCK[name]) stack.push({ name, at });
    else if (ENDS.has(name)) {
      const open = stack.pop();
      if (!open) fail(file, `L${lineOf(template, at)} {% ${name} %} without an opening tag`);
      else if (BLOCK[open.name] !== name) fail(file, `L${lineOf(template, at)} {% ${name} %} closes {% ${open.name} %} from L${lineOf(template, open.at)}`);
    }
  };
  const re = /\{%-?\s*(\w+)([\s\S]*?)-?%\}/g;
  let m;
  while ((m = re.exec(template))) {
    const name = m[1];
    if (name === 'comment' || name === 'raw' || name === 'doc') {
      const end = new RegExp('\\{%-?\\s*end' + name + '\\s*-?%\\}', 'g');
      end.lastIndex = re.lastIndex;
      const e = end.exec(template);
      if (!e) { fail(file, `L${lineOf(template, m.index)} {% ${name} %} is never closed`); break; }
      re.lastIndex = end.lastIndex;
      continue;
    }
    if (name === 'liquid') {
      let skipping = false;
      for (const line of m[2].split('\n')) {
        const word = (line.trim().match(/^(\w+)/) || [])[1];
        if (!word) continue;
        if (skipping) { if (word === 'endcomment') skipping = false; continue; }
        if (word === 'comment') { skipping = true; continue; }
        tag(word, m.index);
      }
      continue;
    }
    tag(name, m.index);
  }
  for (const open of stack) fail(file, `L${lineOf(template, open.at)} {% ${open.name} %} is never closed`);
  const bare = STRIP_COMMENTS(template).replace(/\{%-?\s*raw\s*-?%\}[\s\S]*?\{%-?\s*endraw\s*-?%\}/g, '').replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const el of ['style', 'script']) {
    const opens = (bare.match(new RegExp(`<${el}\\b`, 'gi')) || []).length;
    const closes = (bare.match(new RegExp(`</${el}>`, 'gi')) || []).length;
    if (opens !== closes) fail(file, `${opens} <${el}> tags but ${closes} </${el}>`);
  }
}

// Is this id read by the source? Returns 'direct', 'dynamic' or ''.
function readKind(id, src, aliases) {
  const direct = new RegExp(`\\b(?:${aliases})\\.${esc(id)}(?![\\w-])|\\[\\s*['"]${esc(id)}['"]\\s*\\]`, 'g');
  for (const m of src.matchAll(direct)) {
    // A read that only fills a variable nothing else uses does not count.
    const before = src.slice(Math.max(0, m.index - 80), m.index);
    const assign = before.match(/\bassign\s+(\w+)\s*=\s*[\w.[\]]*$/);
    if (!assign) return 'direct';
    // Uses of the variable, not counting the assign itself or a .property of the same name.
    const uses = src.match(new RegExp(`(?<![\\w.\\-])${esc(assign[1])}(?![\\w\\-])`, 'g')) || [];
    if (uses.length > 1) return 'direct';
  }
  const bracket = /\w\[\s*[\w.]+\s*\]/.test(src);
  if (!bracket) return '';
  const num = id.match(/^(.*?)(\d+)(.*)$/);
  if (num) {
    const [, pre, , post] = num;
    if (new RegExp(`${esc(pre)}\\{\\{-?\\s*[\\w.]+\\s*-?\\}\\}${esc(post)}(?![\\w-])`).test(src)) return 'dynamic';
    if (new RegExp(`['"]${esc(pre)}['"]\\s*\\|\\s*append`).test(src) && (!post || new RegExp(`['"]${esc(post)}['"]`).test(src))) return 'dynamic';
  }
  // A quoted list of keys that is split and read by key.
  for (const m of src.matchAll(/'([\w,]+,[\w,]+)'\s*\|\s*split:\s*','/g)) if (m[1].split(',').includes(id)) return 'dynamic';
  // 'sort_' | append: value ... st[key]
  for (const m of src.matchAll(/['"]([a-z][\w]*_)['"]\s*\|\s*append/g)) if (id.startsWith(m[1])) return 'dynamic';
  return '';
}

for (const file of files) {
  const text = fs.readFileSync(path.join(sectionsDir, file), 'utf8');
  const first = text.split('\n')[0];
  const native = first === '<template>';
  if (first !== '<template compat="shopify">' && !native) fail(file, `line 1 is "${first.slice(0, 60)}", not <template compat="shopify">`);
  const { schemaAt, templateEnd, template } = parts(text);
  if (schemaAt === -1) { fail(file, 'no <schema> block'); continue; }
  if (templateEnd === -1) { fail(file, 'no </template> line before <schema>'); continue; }
  const schemaEnd = text.indexOf('\n</schema>', schemaAt);
  if (schemaEnd === -1) { fail(file, '<schema> is never closed'); continue; }
  let schema;
  try { schema = JSON.parse(text.slice(schemaAt + '\n<schema>'.length, schemaEnd)); } catch (e) { fail(file, `schema is not JSON: ${e.message}`); continue; }
  const sch = native ? schema : schema.shopify;
  if (!sch) { fail(file, 'schema has no "shopify" object'); continue; }
  checkTags(file, template);

  // Third-party demo media in the template and the theme's own schema.
  const scanned = template + '\n' + JSON.stringify(sch);
  const host = scanned.match(DEMO_HOSTS);
  if (host) fail(file, `hot links ${host[1]}; use the inline placeholder (snippets/placeholder-render)`);
  for (const m of scanned.matchAll(MEDIA_URL)) if (!MEDIA_OK.test(m[1]) && !DEMO_HOSTS.test('//' + m[1])) fail(file, `hot links a picture or video from ${m[1]}`);

  // Unique ids, then every id read.
  const groups = [['section', sch.settings || []], ...(sch.blocks || []).map(b => [b.type, b.settings || []])];
  const src = withSnippets(template);
  const aliases = new Set(['settings']);
  for (const m of src.matchAll(/\b(\w+)\s*[=:]\s*(?:section|block|[\w]+(?:\[\d+\])?|section\.blocks\[\d+\])\.settings\b(?!\.)/g)) aliases.add(m[1]);
  const aliasRe = [...aliases].map(esc).join('|');
  const allow = ALLOW[file] || {};
  for (const [owner, settings] of groups) {
    const seen = new Set();
    for (const s of settings) {
      if (!s.id || s.type === 'header' || s.type === 'paragraph') continue;
      if (seen.has(s.id)) fail(file, `${owner}: setting id "${s.id}" is declared twice`);
      seen.add(s.id);
      idCount++;
      const kind = readKind(s.id, src, aliasRe);
      if (kind === 'dynamic') dynamicReads++;
      const key = `${owner}:${s.id}`;
      if (kind && allow[key]) fail(file, `ALLOW entry ${key} is read now; remove it`);
      if (kind) continue;
      if (allow[key]) { allowedUnread++; continue; }
      if (String(s.visible_if || '').replace(/\s/g, '') === '{{false}}') { hiddenUnread++; hiddenList.push(`${file} ${key}`); continue; }
      fail(file, `${key} (${s.type} "${s.label || ''}") is never read: wire it, or hide it and say why in its info`);
    }
  }
  for (const key of Object.keys(allow)) {
    const [owner, id] = key.split(':');
    const g = groups.find(([o]) => o === owner);
    if (!g || !g[1].some(s => s.id === id)) fail(file, `stale ALLOW entry ${key}`);
  }
}

// The overlay group: JSON, and every section type it names exists.
for (const file of fs.readdirSync(sectionsDir).filter(f => /^[m-z][\w-]*\.json$/.test(f))) {
  try {
    const group = JSON.parse(fs.readFileSync(path.join(sectionsDir, file), 'utf8'));
    for (const [id, s] of Object.entries(group.sections || {})) {
      if (!fs.existsSync(path.join(sectionsDir, `${s.type}.storelib`))) fail(file, `section ${id} has type ${s.type}, which has no sections/${s.type}.storelib`);
    }
    for (const id of group.order || []) if (!(group.sections || {})[id]) fail(file, `order names ${id}, which is not in sections`);
  } catch (e) { fail(file, `not JSON: ${e.message}`); }
}

// The check must still see what it is for.
{
  const src = '{% assign st = section.settings %}{{ st.heading }}{% assign unused = st.dead %}{% for i in (1..2) %}{% capture k %}pill{{ i }}_text{% endcapture %}{{ st[k] }}{% endfor %}';
  const a = 'settings|st';
  const ok = readKind('heading', src, a) === 'direct' && readKind('dead', src, a) === '' && readKind('pill2_text', src, a) === 'dynamic' && readKind('other', src, a) === '';
  if (!ok) fail('self-check', 'readKind no longer tells read, unread and built keys apart');
  const before = findings.length;
  checkTags('self-check', '{% if a %}{% for b in c %}{% endif %}');
  if (findings.length === before) fail('self-check', 'an unbalanced tag was not reported');
  else findings.splice(before);
  if (!DEMO_HOSTS.test('https://2dbags.co/x.jpg')) fail('self-check', 'the demo host pattern no longer matches');
}

if (process.argv.includes('--list')) for (const line of hiddenList) console.log('  hidden, unread: ' + line);
console.log(`Sections m-z: ${files.length} files, ${idCount} setting ids; ${dynamicReads} read through a built key, ${allowedUnread} unread and allowlisted, ${hiddenUnread} unread and hidden (retired)`);
if (findings.length) {
  console.error(`\n${findings.length} findings:`);
  for (const f of findings) console.error('  ' + f);
  process.exitCode = 1;
} else {
  console.log('every setting is read, hidden or allowlisted; no demo media from other hosts; files in the Storelib format');
}
