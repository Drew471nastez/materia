// Theme settings wiring. Every id in Theme settings
// (shopify/config/settings_schema.json, and the ids Storelib adds in
// config/storelib_settings_schema.json) must be read by the theme outside
// the schema, or be in ALLOW with the reason it is not. And every CSS
// variable the layout or a snippet writes from a setting (and every one the
// builder's live preview, snippets/theme-live, sets) must be read somewhere,
// or the setting behind it does nothing.
//
// A read is settings.<id> / settings['<id>'] in layout, snippets, sections or
// blocks, or <alias>.<id> where the file says `assign <alias> = settings`, or
// a key built in a capture (cd_trust{{ n }}_text) and read as <alias>[key].
// snippets/theme-live is the builder's live preview and does not count as a
// read: a setting it alone handles would do nothing on the live site.
//
// node tests/theme-settings-wiring.cjs          checks, exits 1 on a finding
// node tests/theme-settings-wiring.cjs --table  also prints where each id is read
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const LIVE = 'snippets/theme-live.storelib';

// Ids that are in the schema on purpose without being read, each with why.
const ALLOW = {
  show_estimate_shipping_rates: 'Older duplicate of Cart Drawer > Show shipping estimate (cart_drawer_show_shipping_estimator); labelled "No effect" in the schema.',
  show_cart_terms_drawer: 'Older duplicate of Cart Drawer > Checkout agreement (enable_cart_terms); labelled "No effect".',
  show_on_cart_page: 'Older duplicate of Shopping Cart > Show product recommendations (cart_page_recommendations); labelled "No effect".',
  show_cart_terms_page: 'Older duplicate of Shopping Cart > Checkout agreement (cart_page_enable_cart_terms); labelled "No effect".',
  field_font_size: 'Fields follow the body text size (layout: --input-font-size: var(--body-font-size)); labelled "no effect".',
  field_label_weight: 'Field labels follow the body weight since fields were unified with Typography; labelled "no effect".',
  search_popup_height: 'The search popup opens in the header bar at the header height (shopify/assets/search-type-default.css), so a vertical spacing has nothing to set; labelled "No effect".',
};
// CSS variables written from a setting that nothing reads, each with why.
const ALLOW_VARS = {
  '--page-width-value': 'layout/password.storelib only, as the import wrote it; --page-width carries the setting.',
  '--fluid-container-width-value': 'layout/password.storelib only, as the import wrote it; --fluid-container-width carries the setting.',
  '--logo-width': 'layout/password.storelib only, as the import wrote it; the header logo reads its widths from snippets/logo.',
};

// Theme setting ids.
const schema = JSON.parse(read('shopify/config/settings_schema.json'));
const ids = [];
for (const group of schema) for (const s of group.settings || []) if (s.id) ids.push(s.id);
assert.equal(new Set(ids).size, ids.length, 'a Theme setting id is declared twice');
const storelib = JSON.parse(read('config/storelib_settings_schema.json'));
for (const panel of storelib.panels || []) for (const s of panel.settings || []) {
  if (s.id && s.type !== 'header' && !ids.includes(s.id)) ids.push(s.id);
}
for (const id of Object.keys(ALLOW)) assert(ids.includes(id), `ALLOW names ${id}, which is not a Theme setting`);
for (const id of ids) assert(/^[a-z0-9_]+$/.test(id), `odd setting id ${id}`);

// Theme files.
const files = [];
for (const dir of ['layout', 'snippets', 'sections', 'blocks']) {
  if (!fs.existsSync(path.join(root, dir))) continue;
  for (const f of fs.readdirSync(path.join(root, dir))) if (f.endsWith('.storelib')) files.push(`${dir}/${f}`);
}
const assets = fs.readdirSync(path.join(root, 'shopify/assets')).filter(f => /\.(css|js)$/.test(f)).map(f => `shopify/assets/${f}`);
const text = {};
for (const f of [...files, ...assets]) text[f] = read(f);
const markup = f => text[f].split(/<\/template>\s*<schema>/)[0];

// Aliases of settings and keys built in a capture, per file.
const aliases = {};
const built = {};
for (const f of files) {
  const t = markup(f);
  aliases[f] = ['settings', ...[...t.matchAll(/assign\s+(\w+)\s*=\s*settings\s*(?=-?%\}|\n|$)/g)].map(m => m[1])];
  const indexed = new RegExp(`(?<![\\w.])(?:${aliases[f].join('|')})\\[\\s*[a-z_]+\\s*\\]`).test(t);
  built[f] = indexed ? [...t.matchAll(/\{%-?\s*capture\s+\w+\s*-?%\}([a-z][a-z0-9_]*\{\{[^}]*\}\}[a-z0-9_]*)\{%-?\s*endcapture/g)]
    .map(m => new RegExp('^' + m[1].replace(/\{\{[^}]*\}\}/g, '[a-z0-9_]+') + '$')) : [];
}

const readers = {};
for (const id of ids) {
  readers[id] = files.filter(f => f !== LIVE && (
    new RegExp(`(?<![\\w.])(?:${aliases[f].join('|')})(?:\\.|\\[\\s*['"])${id}(?![\\w])`).test(markup(f)) ||
    built[f].some(re => re.test(id))));
}
const liveText = text[LIVE];
const liveHandles = id => new RegExp(`['"]${id}['"]|\\b(?:s|state)\\.${id}\\b`).test(liveText);

const failures = [];
for (const id of ids) {
  if (readers[id].length && ALLOW[id]) failures.push(`${id} is read (${readers[id][0]}) but still in ALLOW: take it out`);
  if (!readers[id].length && !ALLOW[id]) failures.push(`${id} is not read anywhere outside the schema${liveHandles(id) ? ' (only the builder live preview handles it)' : ''}`);
}

// Every id the live preview handles is a Theme setting (a typo there is a
// preview that never runs).
for (const m of liveText.matchAll(/has\(s, '(\w+)'\)/g)) {
  if (!ids.includes(m[1])) failures.push(`${LIVE} handles '${m[1]}', which is not a Theme setting`);
}

// CSS variables written from a setting.
const written = {};
const note = (name, where) => (written[name] = written[name] || new Set()).add(where);
for (const f of files) {
  if (!/^(layout|snippets)\//.test(f) || f === LIVE) continue;
  const re = new RegExp(`(--[\\w-]+)\\s*:([^;\\n]*?(?<![\\w.])(?:${aliases[f].join('|')})\\.(\\w+)[^;\\n]*)`, 'g');
  for (const m of markup(f).matchAll(re)) if (ids.includes(m[3])) note(m[1], `${f} (${m[3]})`);
}
for (const m of liveText.matchAll(/\bset\('(--[\w-]+)'/g)) note(m[1], LIVE);
for (const m of liveText.matchAll(/\['\w+', '(--[\w-]+)'\]/g)) note(m[1], LIVE);
const everything = Object.values(text).join('\n');
const esc = s => s.replace(/[-]/g, '\\-');
for (const [name, where] of Object.entries(written)) {
  const used = new RegExp(`var\\(\\s*${esc(name)}(?![\\w-])`).test(everything) ||
    new RegExp(`getPropertyValue\\(\\s*['"]${esc(name)}['"]`).test(everything);
  if (!used && !ALLOW_VARS[name]) failures.push(`${name} is written from a setting (${[...where].join(', ')}) but nothing reads it`);
  if (used && ALLOW_VARS[name]) failures.push(`${name} is read now: take it out of ALLOW_VARS`);
}

for (const name of Object.keys(ALLOW_VARS)) if (!written[name]) failures.push(`${name} is in ALLOW_VARS but no longer written from a setting: take it out`);

if (process.argv.includes('--table')) {
  for (const id of ids) console.log(`${id.padEnd(44)} ${readers[id].length ? readers[id].slice(0, 2).join(', ') + (readers[id].length > 2 ? ` +${readers[id].length - 2}` : '') : 'ALLOW: ' + ALLOW[id]}${liveHandles(id) ? '  [live]' : ''}`);
}
if (failures.length) {
  console.error(failures.map(f => '  ' + f).join('\n'));
  process.exit(1);
}
const live = ids.filter(liveHandles).length;
console.log(`${ids.length} Theme setting ids: ${ids.length - Object.keys(ALLOW).length} read by the theme, ${Object.keys(ALLOW).length} allowlisted with a reason; ${live} also previewed live. ${Object.keys(written).length} CSS variables written from settings, every one read (${Object.keys(ALLOW_VARS).length} allowlisted).`);
