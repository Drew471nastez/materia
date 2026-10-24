// Static check: visitor-facing buttons in every section reach the theme
// button contract (shopify/assets/theme-button-contract.css), so Theme
// settings > Buttons (style, hover effect, timing, shape, border, type and
// padding) apply to them by default.
//
// A control (a, button, input type=submit) is a button here when one of its
// static classes names a button (btn, button, cta) and it shows a label. It is
// wired when it carries data-theme-button, data-sl-button or data-button-role,
// or a theme class (btn, btn-primary, btn-secondary, btn-outline, btn-white),
// which materia-experience.js syncButtons turns into data-theme-button.
//
// Findings, ranked per section:
//   unwired button   a labelled button outside the contract.
//   hard-coded CSS   the section's CSS sets font-size, padding, border-radius
//                    or transition on an unwired button's class, or its colour
//                    with !important, outside a custom-style toggle.
//   toggle ignored   a wired button's custom-style toggle sets padding, size or
//                    radius as plain CSS; the contract's layered !important
//                    wins, so the toggle does nothing. It has to pass --mb-*
//                    tokens (snippets/button-overrides.storelib).
//
// node tests/theme-wiring-scan.cjs         ranked list; exits 1 when a section
//                                          in CONNECTED has a finding again
// node tests/theme-wiring-scan.cjs --all   also prints every finding
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'sections');

// Sections connected to the contract by this check; any finding fails.
const CONNECTED = [
  'addtocartbutton.storelib', 'announcement-bar-pro-4.storelib', 'banner3.storelib',
  'before-and-after-slider.storelib', 'blog-posts.storelib', 'countdown-flip.storelib',
  'countdown-inline.storelib', 'coupon-promotion-newsletter-popup.storelib',
  'hero-section-pro.storelib', 'instagram-promo.storelib', 'product-grouped.storelib',
  'product-showcase.storelib', 'products-carousel.storelib', 'products-listing.storelib',
  'promo-banner-1.storelib', 'promo-banner-2.storelib', 'promo-banner-4.storelib',
  'promobanner.storelib', 'promonewsletterpopup-2.storelib', 'promotion-banner-pro-2.storelib',
  'promotional-popup.storelib', 'promotionalpopup2.storelib', 'richtext1.storelib',
  'richtext2.storelib', 'scroll-text-banner.storelib', 'shopable-video.storelib',
  'steps.storelib', 'testimon4.storelib', 'testimonial-video.storelib',
];

// Intentional exceptions: file -> { classes: [class tokens], reason }.
const ALLOW = {
  'breadcrumb.storelib': { classes: ['bc__btn'], reason: 'Round 36px icon controls (all products, previous and next product); the text inside is the hover preview card, not a label.' },
  'collection-lookbook.storelib': { classes: ['lcb__card'], reason: 'The whole collection card is the link; its label is a span sized from Theme settings > Buttons variables that changes with the card hover, so it cannot take the per-element hover contract.' },
  'hotspot-image-product-2.storelib': { classes: ['hsp2__pop'], reason: 'A product popover card link; the small View label inside is part of the card, sized for a 220px popover.' },
  'main-cart-items.storelib': { classes: ['cart-remove', 'btn-primary'], reason: 'Remove is a text link (button--tertiary). The cart page colour override is a cart setting, kept with the cart page work.' },
};

// btn-link is the theme's link button (critical.css: link colour, button font, theme timing).
const THEME_CLASS = /(^|\s)(btn|btn-primary|btn-secondary|btn-outline|btn-white|btn-link)(\s|$)/;
const WIRED_ATTR = /\bdata-theme-button\b|\bdata-sl-button\b|\bdata-button-role\b/;
const BUTTONISH = /(^|[_-])(btn|button|cta|view-?all|shop-?now)s?([_-]|$)|[a-z](Btn|Button|Cta)s?$|^(btn|button|cta)[A-Z_-]?/;
// Controls that are not call-to-action buttons even when named *-btn.
const NOT_CTA = /arrow|prev|next|close|play|pause|mute|dot|bullet|pagination|quantity|qty|swatch|hamburger|wishlist|compare|zoom|back-to-top|backtotop|dismiss|btn-reset|icon-btn|btn-icon|unstyled|tabs?__|tab-btn|-tab\b|nav-?btn|navigation|vbtn|open-popup|text-btn|read-?more/i;
const OWNED = /(?:^|[;{\s\u0002])(font-size|padding(?:-(?:top|bottom|left|right|inline|block))?|border-radius|transition)\s*:\s*((?:\{\{[\s\S]*?\}\}|[^;}\u0001])*)/g;
const IMPORTANT_COLOUR = /(?:^|[;{\s\u0002])(color|background(?:-color)?|border-color)\s*:\s*((?:\{\{[\s\S]*?\}\}|[^;}\u0001])*!important)/g;
// Liquid conditions inside a rule body (markers left by cssRules) that are
// open at a declaration.
function condAt(body, index) {
  const stack = [];
  for (const [, name, rest] of body.slice(0, index).matchAll(/\u0001(\w+) ?([^\u0002]*)\u0002/g)) {
    if (['if', 'unless', 'case'].includes(name)) stack.push(name + ' ' + rest);
    else if (['elsif', 'else', 'when'].includes(name)) { if (stack.length) stack[stack.length - 1] += ' ' + name + ' ' + rest; }
    else stack.pop();
  }
  return stack.join(' / ');
}
const PAINT = /(?:^|[;{\s\u0002])(color|background(?:-color)?)\s*:\s*((?:\{\{[\s\S]*?\}\}|[^;}\u0001])*)/g;
const LABEL_SETTING = /\b(button_label|button_text|btn_text|btn_label|cta_label|cta_text|button_title)\w*/;
const TOGGLE = /custom|theme|override|own_style|style_mode|button_style|btn_style|design/i;

const blank = s => s.replace(/[^\n]/g, ' ');
function templatePart(text) {
  const schema = text.indexOf('<schema>');
  const end = text.lastIndexOf('</template>', schema === -1 ? text.length : schema);
  const markup = end === -1 ? text : text.slice(0, end);
  // Keep offsets: blank out comments instead of removing them.
  return markup
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank);
}
const show = v => v.replace(/\u0003/g, m => '{').replace(/\s+/g, ' ');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const noLiquid = s => s.replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, ' ');

// Opening tags of a, button and input, stepping over Liquid inside the tag.
function* controls(markup) {
  const re = /<(a|button|input)\b/gi;
  const lower = markup.toLowerCase();
  let m;
  while ((m = re.exec(markup))) {
    let i = m.index + m[0].length, quote = null;
    while (i < markup.length) {
      if (markup.startsWith('{{', i) || markup.startsWith('{%', i)) {
        const e = markup.indexOf(markup[i + 1] === '{' ? '}}' : '%}', i);
        i = e === -1 ? markup.length : e + 2;
        continue;
      }
      const c = markup[i];
      if (quote) { if (c === quote) quote = null; } else if (c === '"' || c === "'") quote = c; else if (c === '>') break;
      i++;
    }
    const name = m[1].toLowerCase();
    const tag = markup.slice(m.index, i + 1);
    const close = name === 'input' ? -1 : lower.indexOf('</' + name, i);
    yield { name, tag, inner: close === -1 ? '' : markup.slice(i + 1, close), index: m.index };
    re.lastIndex = i;
  }
}
function classAttr(tag) {
  const m = tag.match(/\sclass\s*=\s*("([^"]*)"|'([^']*)')/);
  return m ? (m[2] ?? m[3]) : '';
}
function labelled(el) {
  if (el.name === 'input') return /type\s*=\s*["']?(submit|button)/i.test(el.tag) && /\bvalue\s*=/.test(el.tag);
  const inner = el.inner.replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/\{%-?\s*render\s+'icon[^%]*%\}/g, ' ');
  if (/\{\{[^}]*(\|\s*t\b|label|text|title|button|btn|cta)[^}]*\}\}/i.test(inner)) return true;
  return /[A-Za-z]{3,}/.test(noLiquid(inner).replace(/<[^>]*>/g, ' '));
}

// Innermost CSS rules with the Liquid conditions around each one.
function* cssRules(css) {
  const stack = [];
  const tagRe = /\{%-?\s*(if|unless|elsif|else|endif|endunless|case|when|endcase)\b([\s\S]*?)-?%\}/y;
  let buf = '', bufStart = 0;
  const opens = [];
  for (let i = 0; i < css.length; i++) {
    tagRe.lastIndex = i;
    const t = tagRe.exec(css);
    if (t) {
      const [ , name, rest] = t;
      if (['if', 'unless', 'case'].includes(name)) stack.push(name + ' ' + rest.trim());
      else if (['elsif', 'else', 'when'].includes(name)) { if (stack.length) stack[stack.length - 1] += ' ' + name + ' ' + rest.trim(); }
      else stack.pop();
      if (opens.length) buf += '\u0001' + name + ' ' + rest.trim() + '\u0002';
      i = tagRe.lastIndex - 1;
      continue;
    }
    if (css.startsWith('{{', i)) { const e = css.indexOf('}}', i); buf += css.slice(i, e + 2); i = e + 1; continue; }
    if (css.startsWith('{%', i)) { const e = css.indexOf('%}', i); buf += css.slice(i, e === -1 ? css.length : e + 2).replace(/[{}]/g, '\u0003'); i = e === -1 ? css.length : e + 1; continue; }
    const c = css[i];
    if (c === '{') { if (opens.length) opens[opens.length - 1].parent = true; opens.push({ at: buf.length, cond: stack.join(' / ') }); buf += c; }
    else if (c === '}') {
      const open = opens.pop();
      if (open) {
        const body = buf.slice(open.at + 1);
        const head = buf.slice(0, open.at);
        const selector = head.slice(Math.max(head.lastIndexOf('}'), head.lastIndexOf(';'), head.lastIndexOf('{')) + 1).trim();
        if (!open.parent) yield { selector, body, cond: open.cond, index: i };
        buf = head + ';';
      }
    } else buf += c;
  }
}
function* styleBlocks(markup) {
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>|\{%-?\s*style\s*-?%\}([\s\S]*?)\{%-?\s*endstyle\s*-?%\}/g;
  let m;
  while ((m = re.exec(markup))) {
    const css = m[1] ?? m[2];
    yield { css, index: m.index + m[0].indexOf(css) };
  }
}
// Button classes targeted by the last compound of each selector in a list.
function targetClasses(selector) {
  const out = [];
  for (const part of selector.replace(/\{\{[\s\S]*?\}\}/g, '').split(',')) {
    const last = part.trim().split(/\s+|>|~|\+/).filter(Boolean).pop() || '';
    if (/::?(before|after|placeholder)|:(hover|focus|active)/.test(last) || /data-theme-button/.test(last)) continue;
    // A rule for a span or div of the same class is not about the control.
    if (/^[a-z]/i.test(last) && !/^(a|button|input)\b/i.test(last)) continue;
    for (const c of last.replace(/:not\([^)]*\)/g, '').match(/\.[\w-]+/g) || []) out.push(c.slice(1));
  }
  return out;
}

function scan(file, text = fs.readFileSync(path.join(dir, file), 'utf8')) {
  const markup = templatePart(text);
  const allow = ALLOW[file]?.classes || [];
  const wired = new Set(), toggledWired = new Set(), unwired = new Map(), findings = [];
  for (const el of controls(markup)) {
    const classes = noLiquid(classAttr(el.tag)).split(/\s+/).filter(Boolean);
    const isWired = WIRED_ATTR.test(el.tag) || THEME_CLASS.test(classes.join(' '))
      // A whole class printed from a setting (button_style...) may be a theme class.
      || /(^|\s)\{\{[^}]*(button|btn)[^}]*(style|class)[^}]*\}\}(\s|$)/i.test(classAttr(el.tag));
    const named = classes.filter(c => BUTTONISH.test(c) && !NOT_CTA.test(c));
    // Wired only while a toggle is on: the section's own CSS is the custom style.
    const conditional = isWired && /\{%-?\s*(if|unless)\b[^%]*%\}[^{]*data-theme-button/.test(el.tag);
    if (isWired) { classes.forEach(c => (conditional ? toggledWired : wired).add(c)); continue; }
    // Or a control whose label is a button setting (button_label, btn_text...).
    const fromSetting = LABEL_SETTING.test(el.inner) && !classes.some(c => NOT_CTA.test(c));
    if (!(named.length || fromSetting) || !labelled(el)) continue;
    named.forEach(c => unwired.set(c, true));
    findings.push({ kind: 'unwired button', index: el.index, detail: `<${el.name} class="${classes.join(' ')}">`, allowed: classes.some(c => allow.includes(c)) });
  }
  const tokens = /--mb-(padding|radius|font-size)|button-overrides/.test(markup);
  const hasToggle = /"id":\s*"[^"]*(use_theme_button|theme_button|button_style_mode|use_theme_btn)[^"]*"/.test(text);
  for (const block of styleBlocks(markup)) {
    for (const rule of cssRules(block.css)) {
      const targets = targetClasses(rule.selector).filter(c => BUTTONISH.test(c) && !NOT_CTA.test(c));
      if (!targets.length) continue;
      const allowed = targets.some(c => allow.includes(c));
      const at = block.index + rule.index;
      const sel = rule.selector.replace(/\s+/g, ' ').replace(/#shopify-section-\{\{[^}]*\}\}\s*/g, '').slice(0, 90);
      const isUnwired = targets.some(c => unwired.has(c));
      const isWired = !isUnwired && targets.some(c => wired.has(c)) && !targets.some(c => toggledWired.has(c));
      const decls = re => [...rule.body.matchAll(re)].map(m => {
        const cond = [rule.cond, condAt(rule.body, m.index)].filter(Boolean).join(' / ');
        return { prop: m[1], value: m[2].trim(), cond, toggled: TOGGLE.test(cond) };
      });
      if (isUnwired) {
        for (const d of decls(OWNED)) {
          if (d.toggled || /var\(--(btn|theme-button|mb)-/.test(d.value) || (d.prop === 'transition' && /^none/.test(d.value))) continue;
          findings.push({ kind: 'hard-coded CSS', index: at, detail: `${sel} { ${d.prop}: ${d.value} }`, allowed });
        }
        for (const d of decls(IMPORTANT_COLOUR)) {
          if (d.toggled || /var\(--(btn|mb|button-role)-/.test(d.value)) continue;
          findings.push({ kind: 'hard-coded CSS', index: at, detail: `${sel} { ${d.prop}: ${d.value} }`, allowed });
        }
      }
      // A wired button's own colours apply only as --mb-* tokens.
      if (isWired && !/:hover|:focus/.test(rule.selector)) {
        const routed = /--mb-(bg|text)\s*:/.test(rule.body);
        for (const d of decls(PAINT)) {
          const fromSetting = /\{\{|\u0003%/.test(d.value);
          if (routed || (!fromSetting && /var\(--(btn|mb|button-role)-|^(transparent|inherit|currentColor|none|initial|unset)\b/i.test(d.value))) continue;
          findings.push({ kind: 'colour ignored', index: at, detail: `${sel} { ${d.prop}: ${d.value} }`, allowed });
        }
      }
      // The contract positions and transforms the button itself.
      if (isWired && !/:hover|:focus|:active/.test(rule.selector)) {
        for (const m of rule.body.matchAll(/(?:^|[;{\s\u0002])(position\s*:\s*(?:absolute|fixed|sticky)|transform\s*:(?!\s*none)[^;}]+)/g)) {
          findings.push({ kind: 'layout ignored', index: at, detail: `${sel} { ${m[1].trim()} }`, allowed });
        }
      }
      if (isWired && !tokens) {
        for (const d of decls(OWNED)) {
          if (d.prop === 'transition' || /^var\(--(btn|theme-button|mb)-/.test(d.value)) continue;
          // Set under the toggle, or through a section variable the toggle fills.
          const indirect = hasToggle && /\{\{|var\(--(?!btn-|theme-button|mb-)/.test(d.value);
          if (!d.toggled && !indirect) continue;
          findings.push({ kind: 'toggle ignored', index: at, detail: `${sel} { ${d.prop}: ${d.value} }${d.cond ? ' under ' + d.cond.slice(0, 60) : ''}`, allowed });
        }
      }
    }
  }
  for (const f of findings) f.line = lineAt(text, f.index);
  return findings;
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.storelib')).sort();
const weight = { 'unwired button': 5, 'layout ignored': 4, 'toggle ignored': 3, 'colour ignored': 2, 'hard-coded CSS': 1 };
const report = files.map(file => {
  const findings = scan(file);
  const open = findings.filter(f => !f.allowed);
  return { file, findings, open, score: open.reduce((n, f) => n + weight[f.kind], 0) };
}).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

const all = process.argv.includes('--all');
const ranked = report.filter(r => r.open.length);
console.log(`Theme wiring scan: ${files.length} sections; ${ranked.length} with open findings (score: unwired button 5, layout ignored 4, toggle ignored 3, colour ignored 2, hard-coded CSS 1)`);
for (const r of ranked) {
  const counts = {};
  for (const f of r.open) counts[f.kind] = (counts[f.kind] || 0) + 1;
  console.log(`${String(r.score).padStart(4)}  ${r.file}  ${Object.entries(counts).map(([k, v]) => `${k} x${v}`).join(', ')}`);
  if (all) for (const f of r.open) console.log(`        L${f.line} ${f.kind}: ${show(f.detail).slice(0, 170)}`);
}
const allowedCount = report.reduce((n, r) => n + r.findings.filter(f => f.allowed).length, 0);
console.log(`${allowedCount} findings in ${Object.keys(ALLOW).length} sections allowlisted as intentional (reasons in ALLOW)`);
for (const file of Object.keys(ALLOW)) if (!files.includes(file)) console.log(`  stale allowlist entry: ${file}`);

// The check must still see what it is for.
const fixture = `<template compat="shopify">
<style>
  #shopify-section-{{ section.id }} .x__btn { padding: 12px 20px; transition: all .2s; }
  #shopify-section-{{ section.id }} .y__cta { {%- if s.use_theme_button -%}padding: var(--btn-padding-y);{%- else -%}padding: {{ s.pad }}px;{%- endif -%} }
  #shopify-section-{{ section.id }} .z-btn { position: absolute; background: {{ s.bg }} !important; }
</style>
<a class="x__btn" href="#">{{ block.settings.button_label }}</a>
<a class="y__cta" data-theme-button="primary" href="#">{{ s.label }}</a>
<a class="z-btn" data-sl-button href="#">Shop now</a>
<button class="slider__arrow-next" type="button"><svg></svg></button>
</template>
<schema>{"shopify":{"settings":[{"type":"checkbox","id":"use_theme_button"}]}}</schema>`;
const seen = new Set(scan('fixture.storelib', fixture).map(f => f.kind));
for (const kind of ['unwired button', 'hard-coded CSS', 'toggle ignored', 'colour ignored', 'layout ignored']) {
  if (!seen.has(kind)) { console.error(`self-check: the scan no longer reports "${kind}"`); process.exitCode = 1; }
}
if (scan('fixture.storelib', fixture).some(f => /arrow/.test(f.detail))) { console.error('self-check: an icon arrow was reported as a button'); process.exitCode = 1; }

const regressions = [];
for (const file of CONNECTED) {
  const r = report.find(x => x.file === file);
  if (!r) regressions.push(`${file}: section file not found`);
  else {
    for (const f of r.open) regressions.push(`${file} L${f.line} ${f.kind}: ${show(f.detail)}`);
    if (!/data-theme-button/.test(templatePart(fs.readFileSync(path.join(dir, file), 'utf8')))) regressions.push(`${file}: no data-theme-button left in the template`);
  }
}
if (regressions.length) {
  console.error(`\n${regressions.length} regressions in sections connected to the theme button contract:`);
  for (const line of regressions) console.error('  ' + line.slice(0, 220));
  process.exitCode = 1;
} else {
  console.log(`${CONNECTED.length} connected sections hold: every button on the theme contract, no hard-coded button CSS`);
}
