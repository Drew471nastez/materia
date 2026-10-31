/* Round 3: every custom font, weight, size and button shape switch of the text-grid sections
   (Image With Text Bento, Image With Icons, Image With Text Multirow, Image With Text Grid)
   must win over the real Theme settings priority rules (snippets/theme-controls, loaded by the
   fixture with priority on), on the element and on a descendant, live and after a redraw, at 375
   and 1366, editor and storefront; switched off, the theme value is back. One pass with the
   priorities off checks theme inheritance there too.
   Also exports run(), used by tests/theme-media-stats-reels-priority.cjs. */
const assert = require('assert/strict');
const {launch, mount: fmount, schemaOf} = require('./media-fixture.cjs');

const H = /Verdana/, B = /Tahoma/, BF = /Times New Roman/;
const FONTS = {enable_custom_fonts: true, heading_font: {family: 'Verdana', weight: 300}, body_font: {family: 'Tahoma'}};
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

/* Preset blocks with per-type patches (to put a <strong> in a heading, or text in an empty block). */
function blocksOf(name, patch = {}, add = []) {
  const preset = (schemaOf(name).schema.presets || [])[0] || {};
  return (preset.blocks || []).concat(add.map(type => ({type}))).map(b => ({type: b.type, settings: {...(b.settings || {}), ...(patch[b.type] || {})}}));
}

async function read(t, sel, what) {
  return t.page.evaluate(({sel, what, uid}) => {
    const el = document.querySelector('#shopify-section-' + uid + ' ' + sel);
    if (!el) return '<missing ' + sel + '>';
    if (what.startsWith('@')) return el.getAttribute(what.slice(1));
    const c = getComputedStyle(el);
    if (what === 'lh/fs') return (parseFloat(c.lineHeight) / parseFloat(c.fontSize)).toFixed(2);
    return c[what];
  }, {sel, what, uid: t.section.id});
}
const match = (got, want, msg) => want instanceof RegExp ? assert.match(String(got), want, msg) : assert.equal(got, want, msg);

/* sections: [{name, asset, blocks?: patch, cases: [{name, block?, on, off, checks: [{sel, css, on, off ('base' default)}]}]}] */
async function run(label, sections) {
  const browser = await launch();
  let n = 0;
  try {
    for (const sec of sections) {
      const blocks = blocksOf(sec.name, sec.blocks, sec.add);
      for (const width of [375, 1366]) for (const editing of [true, false]) {
        const tag = `${sec.name} @${width} ${editing ? 'editor' : 'storefront'}`;
        const t = await fmount(browser, sec.name, {width, editing, blocks, assets: [sec.asset]});
        await frames(t.page);
        for (const c of sec.cases) {
          const bid = c.block ? t.blockId(c.block) : undefined;
          assert.ok(!c.block || bid, tag + ' ' + c.name + ': no ' + c.block + ' block in the preset');
          const base = [];
          for (const k of c.checks) base.push(await read(t, k.sel, k.css));
          const at = v => typeof v === 'function' ? v(width) : v;
          const want = (k, i, side) => side === 'on' ? at(k.on) : (k.off === undefined || k.off === 'base' ? base[i] : at(k.off));
          const verify = async (side, how) => {
            for (const [i, k] of c.checks.entries()) { match(await read(t, k.sel, k.css), want(k, i, side), `${tag} ${c.name} ${how} ${side}: ${k.sel} ${k.css}`); n++; }
          };
          /* the theme value at rest is what the off side must match */
          for (const [i, k] of c.checks.entries()) if (k.theme) { match(base[i], at(k.theme), `${tag} ${c.name} theme value ${k.sel} ${k.css}`); n++; }
          await t.emit(c.on, bid); await frames(t.page); await verify('on', 'live');
          await t.emit(c.off, bid); await frames(t.page); await verify('off', 'live');
          const patch = side => {
            const cur = t.rendered[0].section;
            if (!c.block) return {settings: {...cur.settings, ...c[side]}};
            let done = false;
            return {blocks: cur.blocks.map(b => ({type: b.type, settings: !done && b.type === c.block && (done = true) ? {...b.settings, ...c[side]} : b.settings}))};
          };
          await t.redraw(patch('on')); await frames(t.page); await verify('on', 'redraw');
          await t.redraw(patch('off')); await frames(t.page); await verify('off', 'redraw');
        }
        assert.deepEqual(t.errors, [], tag + ' errors'); n++;
        await t.page.close();
      }
      /* Priorities off (Theme settings > Typography and Buttons): theme inheritance and the custom values still hold. */
      const t = await fmount(browser, sec.name, {width: 1366, editing: true, blocks, assets: [sec.asset], priority: 'off'});
      await frames(t.page);
      for (const c of sec.cases) {
        const bid = c.block ? t.blockId(c.block) : undefined;
        for (const k of c.checks) if (k.theme) { match(await read(t, k.sel, k.css), typeof k.theme === 'function' ? k.theme(1366) : k.theme, `${sec.name} priority off theme ${c.name} ${k.sel} ${k.css}`); n++; }
        await t.emit(c.on, bid); await frames(t.page);
        for (const k of c.checks) { match(await read(t, k.sel, k.css), typeof k.on === 'function' ? k.on(1366) : k.on, `${sec.name} priority off ${c.name} on ${k.sel} ${k.css}`); n++; }
        await t.emit(c.off, bid); await frames(t.page);
      }
      await t.page.close();
      console.log(sec.name + ': ' + n + ' checks so far');
    }
  } finally { await browser.close(); }
  console.log(n + ' ' + label + ' priority checks passed (custom fonts, weights, sizes and button shapes win over Theme settings priority; off restores the theme)');
  return n;
}

/* Section custom fonts: heading family + weight from the picker, body family, on the element and inside it. */
const fonts = (heads, bodies, extra = []) => ({name: 'custom fonts', on: FONTS, off: {enable_custom_fonts: false}, checks: [
  ...heads.flatMap(s => [{sel: s, css: 'fontFamily', on: H, theme: /Georgia/}, {sel: s, css: 'fontWeight', on: '300', theme: '700'}]),
  ...bodies.map(s => ({sel: s, css: 'fontFamily', on: B, theme: /Arial/})),
  ...extra,
]});
/* A button's own size and shape (use_theme_button off), prefix '' or 'btn_'. */
const shape = (block, sel, p = '', weight = '700') => ({name: 'button shape', block, on: {use_theme_button: false, [p + 'radius']: 3, [p + 'padding_y']: 5, [p + 'padding_x']: 9, [p + 'font_size']: 19, [p + 'font_weight']: weight, [p + 'border_width']: 4}, off: {use_theme_button: true}, checks: [
  {sel, css: 'borderTopLeftRadius', on: '3px', theme: '12px'}, {sel, css: 'paddingTop', on: '5px'}, {sel, css: 'paddingLeft', on: '9px'},
  {sel, css: 'fontSize', on: '19px'}, {sel, css: 'fontWeight', on: weight}, {sel, css: 'borderTopWidth', on: '4px'}, {sel, css: '@data-own-shape', on: '', off: null},
]});

const SECTIONS = [
  {name: 'image-with-text-bento', asset: 'media-live-text-grid.js', blocks: {heading: {text: 'Inside <strong>the</strong> shop'}},
    cases: [fonts(['.iwb__title', '.iwb__heading'], ['.iwb__body p'], [{sel: '.iwb__title strong', css: 'fontFamily', on: H, theme: /Georgia/}, {sel: '.iwb', css: '@data-own-font', on: '', off: null}])]},
  {name: 'image-with-text-icons', asset: 'media-live-text-grid.js', add: ['eyebrow', 'button'], blocks: {heading: {text: 'Why <strong>shop</strong> with us'}},
    cases: [fonts(['.iwi__heading'], ['.iwi__subheading p', '.iwi__eyebrow', '.iwi__feature-label'], [{sel: '.iwi__heading strong', css: 'fontFamily', on: H}]), shape('button', '.iwi__btn')]},
  {name: 'image-with-text-multirow', asset: 'media-live-text-grid.js',
    cases: [fonts(['.iwm__heading'], ['.iwm__body p', '.iwm__caption']),
      {name: 'heading weight', on: {heading_weight: '500'}, off: {heading_weight: 'theme'}, checks: [{sel: '.iwm__heading', css: 'fontWeight', on: '500', theme: '700'}, {sel: '.iwm', css: '@data-own-weight', on: '', off: null}]},
      shape('row', '.iwm__btn', 'btn_')]},
  {name: 'imagewithtextgrid', asset: 'media-live-text-grid.js', add: ['eyebrow'], blocks: {heading: {text: 'The <strong>new</strong> collection'}},
    cases: [fonts(['.iwtg__heading'], ['.iwtg__subheading p', '.iwtg__eyebrow'], [{sel: '.iwtg__heading strong', css: 'fontFamily', on: H}]), shape('button', '.iwtg__btn')]},
];

module.exports = {run, fonts, shape, H, B, BF, FONTS};
if (require.main === module) run('text-grid', SECTIONS).catch(e => { console.error(e); process.exit(1); });
