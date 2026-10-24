/* Run: node tests/theme-builder-smooth.cjs   (exits 1 on any failure)
   The builder canvas stays smooth. A page in an iframe, in design mode
   (html.shopify-design-mode, Shopify.designMode), with the repository's
   editor code: snippets/theme-live, snippets/editor-live-images, the builder
   part of shopify/assets/materia-forms.js and the design-mode scripts of
   layout/theme. Then the builder's traffic:
   - storelib:settings-change with live:true at 60 Hz for 2 s, for a slider
     (button radius) and for a colour scheme, then the release;
   - the same value sent again and again;
   - storelib:section-load on a section, repeatedly, with its markup swapped.
   Budgets: at most one style recalculation per frame and no forced ones
   (no getComputedStyle loop), no element added or removed per frame, <html>
   not rewritten by an unchanged value, and a redrawn section touches nothing
   outside itself. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
// SMOOTH_REV=<git revision> runs the same budgets against that revision's files.
const read = f => process.env.SMOOTH_REV
  ? require('node:child_process').execFileSync('git', ['-C', path.join(__dirname, '..'), 'show', `${process.env.SMOOTH_REV}:${f}`], {encoding: 'utf8', maxBuffer: 1 << 26})
  : fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const scriptOf = text => text.match(/<script>([\s\S]*?)<\/script>/)[1];
const unliquid = s => s.replace(/"\{\{[\s\S]*?\}\}"/g, '""').replace(/\{\{[\s\S]*?\}\}/g, 'null').replace(/\{%[\s\S]*?%\}/g, '');

const themeLive = unliquid(scriptOf(read('snippets/theme-live.storelib')));
const themeLiveCss = unliquid(read('snippets/theme-live.storelib').match(/<style>([\s\S]*?)<\/style>/)[1]);
const liveImages = scriptOf(read('snippets/editor-live-images.storelib'));
const forms = read('shopify/assets/materia-forms.js');
const layout = read('layout/theme.storelib');
// The layout's design-mode marker and its Storelib-overrides release, as written.
const markerAt = layout.indexOf("document.documentElement.className = document.documentElement.className.replace('no-js', 'js');");
const marker = unliquid(layout.slice(markerAt, layout.indexOf('</script>', markerAt)));
assert.ok(marker.includes('storelib:section-load'), 'layout design-mode marker not found');
const release = (() => { const at = layout.indexOf('function release()'); const start = layout.lastIndexOf('<script>', at) + 8; return unliquid(layout.slice(start, layout.indexOf('</script>', at))); })();
assert.ok(release.includes('storelib:settings-change'), 'layout overrides release not found');

const SCHEMES = ['scheme-1', 'scheme-2', 'scheme-3', 'scheme-4'];
const schemeCss = SCHEMES.map((id, i) => `.color-${id}{--color-background:${['#ffffff', '#111827', '#fdf6e3', '#0f3d3e'][i]};--color-text:${['#222222', '#f5f5f5', '#3a3530', '#e8f5f5'][i]};--color-heading:${['#000000', '#ffffff', '#1c1a17', '#ffffff'][i]};--field-surface:#fff}`).join('');
const section = (n, scheme) => `<div id="shopify-section-s${n}" class="shopify-section"><section class="color-${scheme}" style="background:var(--color-background);color:var(--color-text);padding:12px">
  <h2 style="color:var(--color-heading)">Section ${n}</h2>
  <img alt="" width="40" height="40" src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23${(n * 1234567 % 0xffffff).toString(16).padStart(6, '0')}'/></svg>`)}">
  ${Array.from({length: 40}, (_, i) => `<p class="t${i % 7}"><a class="btn" href="#">Item ${i}</a> <span>text</span></p>`).join('')}
  <form><label>Email <input type="email" placeholder="you@example.com"></label><button class="btn">Join</button></form>
</section></div>`;
const page = `<!doctype html><html class="js shopify-design-mode"><head>
<style>:root{--btn-radius:8px;--color-background:#fff;--color-text:#222;--color-heading:#000}${schemeCss}
.btn{border-radius:var(--btn-radius);transition:border-radius .3s}input{background:var(--input-bg,#fff);color:var(--input-color,#000);border-radius:var(--input-border-radius,4px)}${themeLiveCss}</style>
<style data-storelib-overrides>.btn{transition:none}</style>
<script>window.Shopify = {designMode: true};</script>
<script>${marker}</script>
</head><body>
${Array.from({length: 12}, (_, n) => section(n, SCHEMES[n % SCHEMES.length])).join('\n')}
<script type="application/json" data-field-settings>{"field_style":"outline","field_text":"","field_background":"","storelib_input_border":"","storelib_input_radius":-1}</script>
<script>${release}</script>
<script>${liveImages}</script>
<script>window.materiaForms = undefined;</script>
<script>${forms}</script>
<script>${themeLive}</script>
</body></html>`;

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  let passed = 0;
  try {
    const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
    await ctx.route('http://canvas.test/**', route => {
      const u = new URL(route.request().url());
      if (u.pathname === '/') return route.fulfill({contentType: 'text/html', body: '<!doctype html><body style="margin:0"><iframe src="/page" style="width:1200px;height:860px;border:0"></iframe></body>'});
      return route.fulfill({contentType: 'text/html', body: page});
    });
    await ctx.addInitScript(() => {
      if (window === window.top) return;
      const P = window.__probe = {gcs: 0, htmlAttr: 0, bodyChildren: 0, outside: 0};
      const gcs = window.getComputedStyle;
      window.getComputedStyle = function () { P.gcs++; return gcs.apply(this, arguments); };
      document.addEventListener('DOMContentLoaded', () => {
        new MutationObserver(r => { P.htmlAttr += r.length; }).observe(document.documentElement, {attributes: true});
        new MutationObserver(r => { for (const x of r) P.bodyChildren += x.addedNodes.length + x.removedNodes.length; }).observe(document.body, {childList: true});
      });
    });
    const top = await ctx.newPage();
    const errors = [];
    top.on('pageerror', e => errors.push(e.message));
    await top.goto('http://canvas.test/');
    let frame;
    for (let i = 0; i < 100 && !frame; i++) { frame = top.frames().find(f => f.url().endsWith('/page')); if (!frame) await top.waitForTimeout(50); }
    await frame.waitForLoadState('load');
    await frame.waitForFunction(() => window.__materiaThemeLive && window.materiaForms && window.materiaForms.redrawFields);
    const cdp = await ctx.newCDPSession(top);
    await cdp.send('Performance.enable');
    const metric = async name => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === name).value;
    const reset = () => frame.evaluate(() => Object.assign(window.__probe, {gcs: 0, htmlAttr: 0, bodyChildren: 0, outside: 0}));

    // A 60 Hz drag of 2 s: one event a frame, then the release.
    const drag = kind => frame.evaluate(async ({kind, SCHEMES}) => {
      const handler = [];
      let n = 0;
      await new Promise(done => {
        const step = () => {
          const hex = '#' + ((n * 2654435761) >>> 8 & 0xffffff).toString(16).padStart(6, '0');
          const settings = kind === 'slider' ? {btn_radius: n % 30} : kind === 'same' ? {btn_radius: 12, btn_shape: 'rounded'} :
            {color_schemes: {[SCHEMES[1]]: {settings: {background: hex, text_color: '#f5f5f5', heading_color: '#ffffff', primary_color: hex, border_color: '#444444'}}}};
          const t0 = performance.now();
          document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings, live: true}}));
          handler.push(performance.now() - t0);
          if (++n < 120) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: kind === 'colour' ? {color_schemes: {}} : {btn_radius: kind === 'same' ? 12 : 8}, live: false}}));
      await new Promise(r => setTimeout(r, 300));
      return {events: n, handlerMax: Math.max(...handler), handlerAvg: handler.reduce((a, b) => a + b, 0) / handler.length};
    }, {kind, SCHEMES});

    for (const kind of ['slider', 'colour']) {
      await reset();
      const r0 = await metric('RecalcStyleCount');
      const res = await drag(kind);
      const recalcs = await metric('RecalcStyleCount') - r0;
      const p = await frame.evaluate(() => window.__probe);
      // One recalculation a frame, with room for the release and the end of the drag.
      assert.ok(recalcs <= Math.ceil(res.events * 1.25), `${kind} drag: ${recalcs} style recalculations for ${res.events} frames (forced reads in a handler)`);
      assert.ok(p.gcs <= 40, `${kind} drag: ${p.gcs} getComputedStyle calls (a loop over the page on every frame)`);
      assert.ok(p.bodyChildren <= 4, `${kind} drag: ${p.bodyChildren} elements added to or removed from <body> (wakes every observer of the page)`);
      // The handlers only queue: the work waits for the frame.
      assert.ok(res.handlerAvg < 2, `${kind} drag: settings-change handlers took ${res.handlerAvg.toFixed(2)} ms on average, ${res.handlerMax.toFixed(1)} ms at most`);
      passed += 4;
    }
    // The colour drag still drew: the dragged scheme's fields follow it.
    const fieldRule = await frame.evaluate(() => (document.getElementById('materia-field-live') || {}).textContent || '');
    assert.match(fieldRule, /\.color-scheme-2/, 'field colours are drawn for every scheme');
    passed++;

    // The same value again and again: <html> is not rewritten.
    await drag('same');
    await reset();
    await drag('same');
    const same = await frame.evaluate(() => window.__probe);
    // Two writes are the drag itself: the no-transition class on, then off.
    assert.ok(same.htmlAttr <= 2, `an unchanged value rewrote <html> ${same.htmlAttr} times`);
    passed++;

    // Section redraws: only the redrawn section changes; its loaded picture is kept.
    const swaps = await frame.evaluate(async () => {
      const target = document.getElementById('shopify-section-s3');
      const others = [...document.querySelectorAll('.shopify-section')].filter(s => s !== target);
      const imgs = others.map(s => s.querySelector('img'));
      await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
      const before = target.querySelector('img');
      let outside = 0;
      const mo = new MutationObserver(r => { outside += r.filter(x => !target.contains(x.target) && x.target !== target).length; });
      others.forEach(s => mo.observe(s, {childList: true, subtree: true, attributes: true, characterData: true}));
      const html = target.innerHTML;
      const times = [];
      for (let i = 0; i < 10; i++) {
        const t0 = performance.now();
        target.innerHTML = html;
        target.dispatchEvent(new CustomEvent('shopify:section:load', {bubbles: true, detail: {sectionId: 's3'}}));
        target.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 's3'}}));
        times.push(performance.now() - t0);
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      }
      mo.disconnect();
      return {outside, kept: target.querySelector('img') === before, othersSame: others.every((s, i) => s.querySelector('img') === imgs[i]), max: Math.max(...times)};
    });
    assert.equal(swaps.outside, 0, `a section redraw changed ${swaps.outside} things in other sections`);
    assert.ok(swaps.othersSame, 'pictures in other sections were replaced');
    assert.ok(swaps.kept, 'the redrawn section lost its loaded picture (editor-live-images)');
    assert.ok(swaps.max < 50, `a section redraw took ${swaps.max.toFixed(1)} ms`);
    passed += 4;

    // A section redraw brings a scheme class the field colours had not seen: the next change draws it.
    await frame.evaluate(() => {
      const s = document.querySelector('#shopify-section-s5 section');
      s.className = 'color-scheme-new';
      document.getElementById('shopify-section-s5').dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 's5'}}));
      document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: {field_style: 'filled'}, live: false}}));
    });
    await frame.waitForTimeout(100);
    assert.match(await frame.evaluate(() => document.getElementById('materia-field-live').textContent), /\.color-scheme-new/, 'a scheme brought by a redraw gets field colours');
    passed++;

    assert.deepEqual(errors, []);
    passed++;
    console.log(`theme-builder-smooth: ${passed} checks passed`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message || e); process.exit(1); });
