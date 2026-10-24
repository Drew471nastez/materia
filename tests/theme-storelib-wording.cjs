/* Nothing a creator or visitor reads names Shopify or Liquid: section and
   block schemas (names, labels, info, paragraph and header text, option
   labels, preset names, visible text defaults, placeholders), Theme settings,
   the locale files and the text saved on pages. Code is not checked: setting
   ids, block types, setting types such as "liquid", CSS classes, scripts,
   template tags and file names keep the theme's own names. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const WORD = /shopify|liquid/i;

// Read a JSON file the way the theme writes it: a leading /* */ banner and the
// odd trailing comma (shopify/locales/en.default.schema.json has one).
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')
  .replace(/^\s*\/\*[\s\S]*?\*\//, '')
  .replace(/,(\s*[}\]])/g, '$1'));

// Keys whose string value is shown in the builder.
const SHOWN = new Set(['name', 'label', 'info', 'content', 'placeholder', 'unit', 'paragraph']);
// Setting types whose default is text a visitor sees.
const TEXT_TYPES = new Set(['text', 'textarea', 'richtext', 'inline_richtext']);

// Allowed on purpose, each with its reason.
const ALLOW = [
  // A translation key, not words: "t:sections.custom_liquid.name" is looked up
  // in shopify/locales/en.default.schema.json, which is checked below.
  { test: (v) => /^t:[\w.-]+$/.test(v), why: 'translation key' },
  // Links a theme saved as shopify://collections/... are read by Storelib as
  // the page they name; they are addresses, never shown as text.
  { test: (v) => /^shopify:\/\/[\w/.-]*$/.test(v), why: 'internal link address' },
  // The value (not the label) of the "Font library" option of Font source,
  // kept because the creator's saved choice is stored under it.
  { test: (v, at) => v === 'shopify' && /font_type_(body|heading)/.test(at), why: 'saved option value' },
];
const allowed = (v, at) => ALLOW.some(a => a.test(v, at));

const found = [];
let checked = 0;
const flag = (file, at, value) => {
  checked++;
  if (WORD.test(value) && !allowed(value, at)) found.push(`${file} ${at}: ${JSON.stringify(value).slice(0, 140)}`);
};

// A schema (section, block or Theme settings): every shown key at any depth,
// option labels included, and a text setting's default.
function walkSchema(node, file, at) {
  if (Array.isArray(node)) return node.forEach((v, i) => walkSchema(v, file, `${at}[${i}]`));
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string') {
      if (SHOWN.has(k)) flag(file, `${at}.${k}`, v);
      else if (k === 'default' && TEXT_TYPES.has(node.type)) flag(file, `${at}.${k}`, v);
    } else walkSchema(v, file, `${at}.${k}`);
  }
}
// Locales and page text: every string value (keys are code and stay).
function walkValues(node, file, at) {
  if (Array.isArray(node)) return node.forEach((v, i) => walkValues(v, file, `${at}[${i}]`));
  if (node && typeof node === 'object') return Object.entries(node).forEach(([k, v]) => walkValues(v, file, `${at}.${k}`));
  if (typeof node === 'string') flag(file, at, node);
}

let schemas = 0;
for (const folder of ['sections', 'blocks']) {
  const dir = path.join(root, folder);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.storelib')).sort()) {
    const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/<schema>\s*([\s\S]*?)\s*<\/schema>/);
    if (!m) continue;
    walkSchema(JSON.parse(m[1]), `${folder}/${f}`, '');
    schemas++;
  }
}
walkSchema(readJson('shopify/config/settings_schema.json'), 'shopify/config/settings_schema.json', '');

const locales = fs.readdirSync(path.join(root, 'shopify/locales')).filter(f => f.endsWith('.json')).sort();
for (const f of locales) walkValues(readJson(`shopify/locales/${f}`), `shopify/locales/${f}`, '');

const pages = fs.readdirSync(path.join(root, 'templates')).filter(f => f.endsWith('.json')).map(f => `templates/${f}`)
  .concat(['sections/header-group.json', 'sections/footer-group.json', 'sections/overlay-group.json'].filter(f => fs.existsSync(path.join(root, f))));
for (const f of pages) walkValues(readJson(f), f, '');
const themeValues = readJson('config/settings.json').shopify || {};
walkValues(themeValues, 'config/settings.json', '.shopify');

// The password page's caption no longer prints the Shopify logo it was handed.
const caption = readJson('shopify/locales/en.default.json').general.password_page.powered_by_shopify_html;
assert(!/\{\{\s*shopify\s*\}\}/.test(caption), 'password page caption still prints the {{ shopify }} logo link');

assert.deepEqual(found, [], `Shopify or Liquid named where people read it:\n${found.join('\n')}`);
console.log(`${checked} shown strings checked in ${schemas} schemas, Theme settings, ${locales.length} locale files and ${pages.length + 1} saved value files: none name Shopify or Liquid`);
