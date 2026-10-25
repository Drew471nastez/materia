/* Theme settings > Scale (snippets/theme-scale): one size for the whole site
   on desktop, tablet and phone, with text and spacing on their own.

   1. The schema, the saved values and the layout wiring.
   2. In Chromium with the theme's real CSS: at 100% every size computes
      exactly as before; at 90% and 110% the rem sizes, body and button text,
      button padding, fields, gutters, gaps, section spacing and content width
      follow; each breakpoint reads its own slider; the builder's live preview
      (snippets/theme-live) moves them without a reload, in any order with a
      base size.
   3. LIVE (default on; LIVE=0 skips it): the published home page at 375, 768
      and 1366 wide with the snippet added: at 100% every element's box and
      text size is unchanged and the screenshot is identical; at 90% and 110%
      nothing runs off the side of the page and no text is cut off that was
      not before. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const LIVE = 'https://andrewrullz.storelib.com';
const IDS = ['theme_scale_desktop', 'theme_scale_tablet', 'theme_scale_mobile', 'theme_scale_text', 'theme_scale_spacing'];
let checks = 0;

// 1. Schema, values, wiring.
const schemaRaw = read('shopify/config/settings_schema.json');
const schema = JSON.parse(schemaRaw);
const group = schema.find(g => g.name === 'Scale');
assert(group, 'Theme settings has a Scale group');
for (const id of IDS) {
  const s = group.settings.find(x => x.id === id);
  assert(s, `Scale has ${id}`);
  assert.equal(s.type, 'range'); assert.equal(s.default, 100); assert.equal(s.unit, '%');
  assert(s.min <= 90 && s.max >= 110, `${id} reaches 90 and 110`);
  assert(!('visible_if' in s), `${id} has no visible_if`);
}
checks++;
const saved = JSON.parse(read('config/settings.json')).shopify;
// The creator's own values may differ from the default; each is saved and in range.
for (const id of IDS) assert(typeof saved[id] === 'number' && saved[id] >= 80 && saved[id] <= 120, `config/settings.json saves ${id}`);
// The checks below measure from the default (100), whatever the creator picked.
const base100 = {...saved, ...Object.fromEntries(IDS.map(id => [id, 100]))};
checks++;
const layout = read('layout/theme.storelib');
const iControls = layout.indexOf("{% render 'theme-controls' %}"), iScale = layout.indexOf("render 'theme-scale'"), iHeader = layout.indexOf('{{ content_for_header }}');
assert(iControls > 0 && iScale > iControls && iScale < iHeader, 'layout renders theme-scale after theme-controls, in the head');
const live = read('snippets/theme-live.storelib');
for (const id of IDS) assert(live.includes(id), `theme-live moves ${id}`);
checks++;

// Render the snippet the way the layout does, from a settings object.
const snippet = read('snippets/theme-scale.storelib');
assert(snippet.startsWith('<template compat="shopify">\n'), 'snippet format');
function renderScale(st) {
  const f = (id) => String((st[id] ?? 100) / 100);
  let css = snippet.match(/<style>([\s\S]*?)\{% comment %\}\{% endcomment %\}<\/style>/)[1];
  css = css.replace(/\{\{ scale_d \}\}/g, f('theme_scale_desktop')).replace(/\{\{ scale_t \}\}/g, f('theme_scale_tablet'))
    .replace(/\{\{ scale_m \}\}/g, f('theme_scale_mobile')).replace(/\{\{ scale_text \}\}/g, f('theme_scale_text'))
    .replace(/\{\{ scale_space \}\}/g, f('theme_scale_spacing'))
    .replace(/\{\{ ts \}\}/g, ' * var(--sl-text-scale, 1))').replace(/\{\{ ss \}\}/g, ' * var(--sl-space-scale, 1))')
    .replace(/\{\{\s*settings\.(\w+)(?:\s*\|\s*default:\s*([\d.]+))?\s*\}\}/g, (_, id, d) => String(st[id] ?? d));
  assert(!/\{\{|\{%/.test(css), 'snippet renders completely: ' + (css.match(/\{[{%][^}]*\}/) || [''])[0]);
  return css;
}
const at100 = renderScale(base100);
assert.match(at100, /--sl-scale-desktop: 1;/); assert.match(at100, /--sl-scale-text: 1;/);
checks++;

// The layout's own :root block, as Liquid prints it for these settings.
function layoutRoot(st) {
  const block = layout.match(/\{% style %\}([\s\S]*?)\{% endstyle %\}/)[1];
  const rootBlock = block.slice(block.lastIndexOf(':root {', block.indexOf('--border-color-base')));
  return rootBlock.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
    .replace(/\{%-?\s*liquid[\s\S]*?-?%\}/g, '').replace(/\{%-?\s*case[\s\S]*?endcase\s*-?%\}/g, '--card-shadow: none;')
    .replace(/\{% if settings\.enable_rounded %\}[^{]*\{% endif %\}/g, '')
    .replace(/\{%[^%]*%\}/g, '')
    .replace(/\{% render[^%]*%\}/g, 'currentColor')
    .replace(/\{\{\s*_btn_radius_value\s*\}\}/g, '8')
    .replace(/\{\{\s*settings\.(\w+)(?:\s*\|\s*divided_by:\s*100\.0)?(?:\s*\|\s*default:\s*(?:'([^']*)'|([^}\s]+)))?\s*\}\}/g, (m, id, q, d) => {
      const v = st[id] ?? q ?? d ?? '';
      return /divided_by/.test(m) ? String(Number(v) / 100) : String(v);
    });
}
if (process.env.DEBUG_SCALE) { console.log(layoutRoot(base100)); process.exit(0); }
const controlsCss = read('snippets/theme-controls.storelib').match(/<style>([\s\S]*?)<\/style>/)[1]
  .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
  .replace(/\{\{\s*fp\s*\}\}/g, ":where(html:not([data-font-priority='off']))").replace(/\{\{\s*button_radius\s*\}\}/g, '8')
  .replace(/\{\{\s*settings\.(\w+)(?:\s*\|\s*default:\s*'?([^}' ]+)'?)?\s*\}\}/g, (_, id, d) => String(saved[id] ?? d ?? '')).replace(/\{%-?[\s\S]*?-?%\}/g, '');

const PROBE = `<div class="shopify-section"><div class="page-width x-page"><h2 class="h2 x-h2">Linen shirts</h2><p class="x-p">Washed linen, cut in Porto.</p>
  <a class="btn btn-primary x-btn" href="#">Buy the shirt</a><input class="x-in" aria-label="Email" style="height:var(--input-height);padding:var(--input-padding)">
  <div class="x-gap" style="display:grid;gap:var(--grid-gap);padding-inline:var(--container-gutter);margin-block:var(--section-spacing);width:var(--icon-btn-size);max-width:var(--page-width)"></div></div></div>`;
const measure = page => page.evaluate(() => {
  const cs = (s) => getComputedStyle(document.querySelector(s));
  return {
    root: cs('html').fontSize, h2: cs('.x-h2').fontSize, p: cs('.x-p').fontSize, btn: cs('.x-btn').fontSize,
    btnPad: cs('.x-btn').paddingTop + ' ' + cs('.x-btn').paddingLeft, inH: cs('.x-in').height, inPad: cs('.x-in').paddingLeft,
    gap: cs('.x-gap').rowGap, gutter: cs('.x-gap').paddingLeft, spacing: cs('.x-gap').marginTop, icon: cs('.x-gap').width,
    pageMax: cs('.x-gap').maxWidth,
  };
});
const num = v => parseFloat(v);

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    // 2. The theme's CSS with and without the snippet.
    const page = await browser.newPage({viewport: {width: 375, height: 800}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const build = async (scaleCss, width) => {
      await page.setViewportSize({width, height: 800});
      await page.setContent(`<!doctype html><html><head><style>${layoutRoot(base100)}</style></head><body>${PROBE}</body></html>`);
      await page.addStyleTag({content: read('shopify/assets/critical.css')});
      await page.addStyleTag({content: controlsCss});
      if (scaleCss) await page.addStyleTag({content: scaleCss});
      await page.addStyleTag({content: read('shopify/assets/theme-button-contract.css')});
    };
    for (const width of [375, 768, 1366]) {
      await build('', width); const before = await measure(page);
      await build(at100, width); const after = await measure(page);
      assert.deepEqual(after, before, `at 100% nothing changes at ${width}px`);
    }
    checks++;

    // Each slider at its own breakpoint, text and spacing apart.
    const expectScaled = (base, got, t, s, label) => {
      // Fluid headings keep their small vw term (--responsive-rate) as written: within 1%.
      const near = (a, b, what) => assert(Math.abs(num(a) - num(b)) < Math.max(0.06, num(b) * 0.01), `${label} ${what}: ${a} vs ${b}`);
      near(got.root, num(base.root) * t, 'root font size'); near(got.h2, num(base.h2) * t, 'h2');
      near(got.p, num(base.p) * t, 'body text'); near(got.btn, num(base.btn) * t, 'button text');
      near(got.inH, Math.max(44, num(base.inH) * s), 'field height (never under the 44px tap target)'); near(got.gap, num(base.gap) * s, 'grid gap');
      near(got.gutter, num(base.gutter) * s, 'side padding'); near(got.spacing, num(base.spacing) * s, 'section spacing');
      near(got.icon, num(base.icon) * s, 'icon button'); near(got.pageMax, num(base.pageMax) * s, 'content width');
    };
    for (const [width, id] of [[375, 'theme_scale_mobile'], [768, 'theme_scale_tablet'], [1366, 'theme_scale_desktop']]) {
      await build('', width); const base = await measure(page);
      for (const v of [90, 110]) {
        await build(renderScale({...base100, [id]: v}), width);
        expectScaled(base, await measure(page), v / 100, v / 100, `${id}=${v} at ${width}px`);
        // The other breakpoints' sliders do not reach this width.
        const others = IDS.slice(0, 3).filter(x => x !== id);
        await build(renderScale({...base100, [others[0]]: v, [others[1]]: v}), width);
        assert.deepEqual(await measure(page), base, `${others.join(', ')} leave ${width}px alone`);
      }
    }
    checks++;
    await build('', 1366); const base1366 = await measure(page);
    await build(renderScale({...base100, theme_scale_desktop: 110, theme_scale_text: 90}), 1366);
    expectScaled(base1366, await measure(page), 0.99, 1.1, 'desktop 110 with text 90');
    await build(renderScale({...base100, theme_scale_spacing: 120}), 1366);
    expectScaled(base1366, await measure(page), 1, 1.2, 'spacing 120');
    checks++;

    // Live preview: theme-live writes the sliders on <html>; a base size dragged after keeps the scale.
    await build(at100, 375); const base375 = await measure(page);
    const liveJs = live.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/"\{\{[\s\S]*?\}\}"/g, '""').replace(/\{\{[\s\S]*?\}\}/g, 'null').replace(/\{%[\s\S]*?%\}/g, '');
    await page.addScriptTag({content: liveJs});
    const apply = async (s, liveFlag = true) => {
      await page.evaluate(([s, l]) => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: s, live: l}})), [s, liveFlag]);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    };
    for (const v of [104, 108, 112]) await apply({theme_scale_mobile: v});
    await apply({theme_scale_mobile: 110}, false);
    expectScaled(base375, await measure(page), 1.1, 1.1, 'live phone 110');
    await apply({body_font_size: saved.body_font_size + 2, field_height: saved.field_height + 10, btn_padding_x: 30}, false);
    let m = await measure(page);
    assert(Math.abs(num(m.p) - (saved.body_font_size + 2) * 1.1) < 0.06, 'body size dragged under a scale stays scaled: ' + m.p);
    assert(Math.abs(num(m.inH) - (saved.field_height + 10) * 1.1) < 0.06, 'field height dragged under a scale stays scaled: ' + m.inH);
    assert(Math.abs(num(m.btnPad.split(' ')[1]) - 33) < 0.06, 'button padding dragged under a scale stays scaled: ' + m.btnPad);
    await apply({theme_scale_text: 90, theme_scale_spacing: 100}, false);
    m = await measure(page);
    assert(Math.abs(num(m.root) - 10 * 1.1 * 0.9) < 0.06, 'live text slider: ' + m.root);
    await apply({theme_scale_mobile: 100, theme_scale_text: 100}, false);
    m = await measure(page);
    assert.equal(m.root, '10px'); assert.equal(m.p, `${saved.body_font_size + 2}px`);
    assert.deepEqual(errors, []);
    checks++;
    await page.close();

    // 3. The published page with the snippet added.
    if (process.env.LIVE !== '0') {
      const res = await fetch(LIVE + '/', {signal: AbortSignal.timeout(30000)});
      const html = await res.text();
      assert(html.includes('--body-font-size: ' + saved.body_font_size + 'px'), 'the live page has the saved settings this test renders with');
      for (const width of [375, 768, 1366]) {
        const ctx = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
        const p = await ctx.newPage();
        await p.goto(LIVE + '/', {waitUntil: 'load', timeout: 90000});
        await p.waitForTimeout(2500);
        await p.addStyleTag({content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
        const boxes = () => p.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll('body *')) {
            if (el.closest('.swiper, [class*="marquee"], [class*="slideshow"], [class*="countdown"], script, style')) continue;
            const r = el.getBoundingClientRect();
            if (!r.width && !r.height) continue;
            out.push([Math.round(r.left * 10), Math.round(r.top * 10), Math.round(r.width * 10), Math.round(r.height * 10), getComputedStyle(el).fontSize].join(','));
          }
          return out;
        });
        // Edges past the viewport and cut text: elements a person would see.
        const faults = () => p.evaluate(() => {
          const W = document.documentElement.clientWidth, out = new Set();
          const clipped = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(o.overflowX) && a.getBoundingClientRect().right <= W + 1) return true; } return false; };
          for (const el of document.querySelectorAll('body *')) {
            const s = getComputedStyle(el);
            if (s.visibility === 'hidden' || s.display === 'none' || s.position === 'fixed') continue;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            const key = el.tagName + '.' + [...el.classList].slice(0, 3).join('.');
            if ((r.right > W + 1 || r.left < -1) && !clipped(el)) out.add('past the edge ' + key);
            const textOnly = el.childElementCount === 0 && el.textContent.trim().length > 2;
            if (textOnly && /(hidden|clip)/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2) out.add('text cut ' + key);
          }
          return [...out];
        });
        const inject = (css) => p.evaluate((css) => { let s = document.getElementById('scale-probe'); if (!s) { s = document.createElement('style'); s.id = 'scale-probe'; document.head.appendChild(s); } s.textContent = css; }, css);
        const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 300)))));
        await p.evaluate(() => scrollTo(0, 0)); await settle();
        if (process.env.SCALE_SHOTS) await p.screenshot({path: path.join(process.env.SCALE_SHOTS, `scale-${width}-100.png`), fullPage: true});
        const b0 = await boxes(); const shot0 = await p.screenshot({animations: 'disabled'}); const f0 = await faults();
        await inject(at100); await settle();
        const b1 = await boxes(); const shot1 = await p.screenshot({animations: 'disabled'});
        const diff = b0.filter((b, i) => b !== b1[i]);
        assert.equal(b0.length, b1.length, `${width}px: same elements at 100%`);
        assert(diff.length === 0, `${width}px: at 100% boxes moved:\n${diff.slice(0, 5).join('\n')}`);
        assert(shot0.equals(shot1), `${width}px: at 100% the screenshot is identical`);
        const id = width < 768 ? 'theme_scale_mobile' : width < 1025 ? 'theme_scale_tablet' : 'theme_scale_desktop';
        for (const v of [90, 110]) {
          await inject(renderScale({...base100, [id]: v})); await settle();
          assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).fontSize), `${10 * v / 100}px`, `${width}px at ${v}%: root size`);
          if (process.env.SCALE_SHOTS) await p.screenshot({path: path.join(process.env.SCALE_SHOTS, `scale-${width}-${v}.png`), fullPage: true});
          const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth]);
          assert(sw[1] <= sw[2] + 1, `${width}px at ${v}%: page scrolls sideways (${sw})`);
          const fresh = (await faults()).filter(x => !f0.includes(x));
          assert.deepEqual(fresh, [], `${width}px at ${v}%: new layout faults`);
        }
        await ctx.close();
        console.log(`  live ${width}px: identical at 100%, no overflow or cut text at 90% and 110% (${b0.length} boxes)`);
      }
      checks++;
    }
  } finally { await browser.close(); }
  console.log(`theme-scale: ${checks} checks passed${process.env.LIVE === '0' ? ' (live page skipped)' : ''}`);
})().catch(e => { console.error(e); process.exit(1); });
