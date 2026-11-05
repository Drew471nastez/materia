/* Run: node tests/theme-newsletter-round5.cjs   (exits 1 on any failure)
   Newsletter round 5: the newsletter section's Subscribe button.
   On the live site the button seemed to do nothing: Storelib posted the
   address, drew the section again and then compared the form's text before
   and after to decide whether to add its "Thanks for subscribing." note. The
   bot trap materia-forms.js adds to every form held the word "Company", the
   redrawn form did not have it yet, so the texts differed, no note was added,
   and the section draws no message of its own: the field emptied and nothing
   was said. The trap now holds no text, and the section marks the redrawn
   form ([data-mt-posted] / [data-mt-failed]) and carries its own words.

   Static checks always run. The rendered checks need liquidjs (set
   LIQUIDJS=<path to liquidjs>, or have it installed): sections/newsletter is
   rendered with the repository's snippets, put in a page with Storelib's own
   submit handler for imported themes (copied from the live page) and the
   real materia-forms.js/.css, and /contact is answered by this test (nothing
   is posted anywhere). States: idle, sending (busy, one submit at a time),
   success (the section's words, for the section's time), already subscribed,
   invalid address, a refused post, no network, and the builder preview.
   Since the builder AI's redesign (data-nl-form) the form shows its own
   states: materia-forms.js sends it once (Storelib's page handler never sees
   the submit), sets data-state sending / done / error and writes the
   section's words into [data-nl-msg]; no toast, no second note. The honeypot
   is checked too: one, empty, off screen, and a filled one sends nothing. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
const schemaOf = f => { const t = read(f); return JSON.parse(t.slice(t.indexOf('\n<schema>') + 9, t.lastIndexOf('</schema>'))).shopify; };
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };

/* ---------- static ---------- */
const file = read('sections/newsletter.storelib');
const ns = schemaOf('sections/newsletter.storelib');
const ids = ns.settings.filter(s => s.id).map(s => s.id);
const S = id => ns.settings.find(s => s.id === id);
ok(file.startsWith('<template compat="shopify">\n'), 'first line kept');
ok(new Set(ids).size === ids.length, 'setting ids are unique');
for (const id of ['section_width', 'color_scheme', 'reset_spacing', 'header_alignment', 'form_layout', 'show_icon', 'icon', 'custom_icon_image', 'icon_size', 'icon_color', 'heading', 'description', 'email_placeholder', 'btn_text', 'note', 'background_image', 'bg_overlay_color', 'bg_overlay_opacity', 'show_content_background', 'content_background', 'content_box_opacity', 'header_size', 'reveal', 'padding_top', 'padding_bottom', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile']) ok(S(id), `kept ${id}`);
for (const id of ['button_style', 'email_label', 'success_text', 'success_duration', 'already_text', 'invalid_text', 'error_text']) ok(S(id), `new setting ${id}`);
ok(S('success_duration').type === 'range' && S('success_duration').unit === 's' && S('success_duration').min >= 2, 'success time is a slider in seconds');
ok(S('button_style').options.length <= 3, 'button style draws as buttons');
const tpl = body(file);
ok(/data-mt-words/.test(tpl) && /data-success-message=/.test(tpl) && /data-success-ms=/.test(tpl), 'the form carries its words');
ok(/data-nl-msg="done">\{\{ section_st\.success_text/.test(tpl) && /data-nl-msg="error">\{\{ section_st\.error_text/.test(tpl) && /data-nl-hint>\{\{ section_st\.invalid_text/.test(tpl), 'the form\'s own messages are the section\'s settings');
ok(/form\.posted_successfully\?[\s\S]{0,80}section_st\.success_text/.test(tpl) && /form\.errors[\s\S]{0,80}section_st\.invalid_text/.test(tpl), 'a form drawn after a post without script says how it went');
ok(/<label class="visually-hidden" for="NewsletterEmail-\{\{ section\.id \}\}">/.test(tpl) && /autocomplete="email"/.test(tpl), 'the email field has a label and autocomplete');
const forms = read('shopify/assets/materia-forms.js');
ok(!/textContent = 'Company'/.test(forms), 'the bot trap holds no text');
ok(/data-mt-posted/.test(forms) && /data-mt-failed/.test(forms) && /\[data-mt-words\]/.test(forms), 'materia-forms reads the markers and the words');
ok(/data-nl-form/.test(forms) && /data-nl-msg=/.test(forms) && /\[data-nl-hint\]/.test(forms), 'materia-forms drives the form\'s own states and messages');
ok(/Sign-ups go to Subscribers on your live site/.test(forms), 'the builder previews the success state');
ok(!/\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b|—/i.test(['success_text', 'already_text', 'invalid_text', 'error_text'].map(id => S(id).default).join(' ')), 'plain message copy');

/* ---------- rendered ---------- */
let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({ Liquid } = require(p)); break; } catch { /* next */ }
}
if (!Liquid) {
  console.log(`${checks} newsletter round 5 checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
  process.exit(0);
}

const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
function engine(formState) {
  const e = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, strictVariables: false, jsTruthy: false, lenientIf: true,
    fs: {
      readFileSync: f => clean(body(fs.readFileSync(f, 'utf8'))), readFile: async f => clean(body(fs.readFileSync(f, 'utf8'))),
      existsSync: f => fs.existsSync(f), exists: async f => fs.existsSync(f),
      resolve: (dir, file, ext) => path.join(dir, file + ext), contains: () => true, dirname: path.dirname, sep: '/',
    },
  });
  const block = (name, write) => ({
    parse(tok, remain) { this.args = tok.args; this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:end' + name, () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed ' + name); }); s.start(); },
    * render(ctx, em) { if (!write) return; em.write(typeof write[0] === 'function' ? write[0](this.args) : write[0]); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em); em.write(write[1]); },
  });
  e.registerTag('style', block('style', ['<style>', '</style>']));
  e.registerTag('stylesheet', block('stylesheet', ['<style>', '</style>']));
  e.registerTag('javascript', block('javascript', null));
  // What Storelib draws for {% form 'customer' %}: the post goes to /contact, and `form` says how the last one went.
  e.registerTag('form', {
    parse(tok, remain) { this.cls = (/class:\s*'([^']*)'/.exec(tok.args) || [])[1] || ''; this.data = [...tok.args.matchAll(/(data-[\w-]+):\s*'([^']*)'/g)].map(m => ` ${m[1]}="${m[2]}"`).join(''); this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:endform', () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed form'); }); s.start(); },
    * render(ctx, em) {
      em.write(`<form method="post" action="/contact#contact_form" id="contact_form" accept-charset="UTF-8" class="${this.cls}"${/data-storelib-form/.test(this.data) ? '' : ' data-storelib-form="subscribe"'}${this.data}><input type="hidden" name="form_type" value="customer"><input type="hidden" name="utf8" value="✓">`);
      ctx.push({ form: formState });
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em);
      ctx.pop();
      em.write('</form>');
    },
  });
  e.registerFilter('t', k => String(k).split('.').pop().replace(/_/g, ' '));
  e.registerFilter('asset_url', k => '/assets/' + k);
  e.registerFilter('stylesheet_tag', u => `<link rel="stylesheet" href="${u}">`);
  e.registerFilter('image_url', v => (typeof v === 'string' ? v : (v && (v.src || v.url)) || ''));
  e.registerFilter('image_tag', u => `<img src="${u}">`);
  e.registerFilter('json', v => JSON.stringify(v));
  for (const f of ['font_face', 'font_url', 'inline_asset_content']) e.registerFilter(f, () => '');
  for (const f of ['font_modify', 'color_to_rgb', 'color_modify', 'color_mix', 'url', 'within']) e.registerFilter(f, v => v);
  e.registerFilter('color_brightness', () => 128);
  return e;
}

const defaults = Object.fromEntries(ns.settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));
const theme = JSON.parse(read('config/settings.json')).shopify;
const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({ id, settings: v.settings }));
async function renderSection(settings, formState = {}) {
  const st = { ...defaults, ...settings };
  st.color_scheme = { ...(schemes.find(s => s.id === st.color_scheme) || schemes[0]) };
  const ctx = { settings: { ...theme, color_schemes: schemes }, request: { design_mode: false }, shop: { name: 'Materia' }, customer: null, section: { id: 'nl', settings: st, blocks: [] } };
  const html = await engine(formState).parseAndRender(clean(body(read('sections/newsletter.storelib'))), ctx, { globals: ctx });
  return `<section id="shopify-section-nl" class="shopify-section section" data-section-id="nl">${html}</section>`;
}

const STORELIB = "document.addEventListener(\"submit\",function(e){var f=e.target;if(!f||f.tagName!==\"FORM\"||e.defaultPrevented)return;var act=(f.getAttribute(\"action\")||\"\").replace(location.origin,\"\");var ti=f.querySelector('input[name=\"form_type\"]');var type=ti&&ti.value;if(!/^\\/contact(?:[\\/?#]|$)/.test(act)||(type!==\"customer\"&&type!==\"contact\"))return;e.preventDefault();if(f.getAttribute(\"data-storelib-sending\"))return;f.setAttribute(\"data-storelib-sending\",\"1\");var btns=[].slice.call(f.querySelectorAll('button,input[type=submit]'));btns.forEach(function(b){b.disabled=true});f.setAttribute(\"aria-busy\",\"true\");var sec=f.closest(\".shopify-section\");var data=new FormData(f);var kept={};data.forEach(function(v,k){if(typeof v===\"string\")kept[k]=v});var done=function(){f.removeAttribute(\"data-storelib-sending\");f.removeAttribute(\"aria-busy\");btns.forEach(function(b){b.disabled=false})};var note=function(x,where){var t=where||f;var old=t.parentNode&&t.parentNode.querySelector(\":scope>.storelib-form-note\");if(old)old.remove();var p=document.createElement(\"p\");p.className=\"storelib-form-note\";p.setAttribute(\"role\",x.ok?\"status\":\"alert\");p.style.cssText=\"margin:12px 0 0;font-size:.95em\";p.textContent=x.ok?(type===\"customer\"?\"Thanks for subscribing.\":\"Thanks for writing. We'll get back to you soon.\"):(x.message||\"It did not send. Try again.\");t.insertAdjacentElement(\"afterend\",p)};fetch(\"/contact\",{method:\"POST\",body:data,credentials:\"same-origin\",headers:{\"X-Requested-With\":\"XMLHttpRequest\",Accept:\"application/json\"}}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(x){if(x.ok)f.reset();if(!sec||!sec.id){done();note(x);return}var q=new URLSearchParams(location.search);[\"customer_posted\",\"contact_posted\",\"form_error\",\"form_type\",\"section_id\",\"sections\"].forEach(function(k){q.delete(k)});if(x.ok)q.set(type+\"_posted\",\"true\");else{q.set(\"form_error\",x.code||\"failed\");q.set(\"form_type\",type)}q.set(\"section_id\",sec.id.replace(/^shopify-section-/,\"\"));var forms=function(root){return[].slice.call(root.querySelectorAll('form')).filter(function(g){var t=g.querySelector('input[name=\"form_type\"]');return t&&t.value===type})};var at=forms(sec).indexOf(f);var before=f.innerText;return fetch(location.pathname+\"?\"+q.toString(),{credentials:\"same-origin\"}).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(html){var t=document.createElement(\"template\");t.innerHTML=html.trim();var n=t.content.firstElementChild;if(!n||n.id!==sec.id)throw 0;var nf=forms(n)[at];if(!nf)throw 0;f.replaceWith(nf);if(!x.ok)Object.keys(kept).forEach(function(k){if(k===\"form_type\"||k===\"utf8\")return;nf.querySelectorAll('[name=\"'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'\"]').forEach(function(i){if(i.type!==\"hidden\"&&i.type!==\"checkbox\"&&i.type!==\"radio\"&&i.type!==\"submit\")i.value=kept[k]})});if(nf.innerText===before)note(x,nf);var m=nf.querySelector('[role=alert],[role=status],.form__message,.newsletter-form__message,.errors')||(nf.nextElementSibling&&nf.nextElementSibling.classList.contains(\"storelib-form-note\")?nf.nextElementSibling:null);if(m){if(!m.hasAttribute(\"tabindex\"))m.setAttribute(\"tabindex\",\"-1\");m.focus({preventScroll:true})}}).catch(function(){done();note(x)})}).catch(function(){done();note({ok:false})})});";
const css = ['critical.css', 'theme-button-contract.css', 'materia-experience.css', 'materia-forms.css'].filter(f => fs.existsSync(path.join(root, 'shopify/assets', f))).map(f => read('shopify/assets/' + f)).join('\n');

const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  let settings = {}, reply = { ok: true }, delay = 400, offline = false, calls = [];
  const open = async ({ width = 1280, design = false, reuse = null } = {}) => {
    const ctx = reuse || await browser.newContext({ viewport: { width, height: 900 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/*', async r => {
      const req = r.request();
      const u = new URL(req.url());
      if (u.hostname !== 'materia.test') return r.fulfill({ status: 204, body: '' });
      if (req.method() === 'POST' && u.pathname === '/contact') {
        calls.push(req.postData() || '');
        if (offline) return r.abort('internetdisconnected');
        await new Promise(res => setTimeout(res, delay));
        return r.fulfill({ status: reply.ok ? 200 : 400, contentType: 'application/json', body: JSON.stringify({ form_type: 'customer', ...reply }) });
      }
      if (u.searchParams.get('section_id') === 'nl') {
        const state = u.searchParams.get('customer_posted') ? { 'posted_successfully?': true, posted_successfully: true } : u.searchParams.get('form_error') ? { errors: { messages: { email: 'x' } } } : {};
        return r.fulfill({ contentType: 'text/html', body: await renderSection(settings, state) });
      }
      const page = `<!doctype html><html${design ? ' class="shopify-design-mode"' : ''}><head><meta name="viewport" content="width=device-width"><style>${css}</style></head><body><main>${await renderSection(settings)}</main>${design ? '' : `<script>${STORELIB}</script>`}<script src="/assets/materia-forms.js"></script></body></html>`;
      if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: page });
      if (u.pathname.startsWith('/assets/')) {
        const f = path.join(root, 'shopify/assets', u.pathname.slice(8));
        return fs.existsSync(f) ? r.fulfill({ path: f, contentType: f.endsWith('.js') ? 'text/javascript' : 'text/css' }) : r.fulfill({ status: 404, body: '' });
      }
      return r.fulfill({ status: 204, body: '' });
    });
    calls = [];
    await p.goto('http://materia.test/');
    await p.waitForFunction(() => window.materiaForms);
    // A person takes a couple of seconds before sending; a faster submit is treated as a script.
    await p.waitForFunction(ms => performance.now() > ms + 50, await p.evaluate(() => window.materiaForms.MIN_MS));
    return { p, ctx, errs };
  };
  const toast = p => p.evaluate(() => { const t = document.querySelector('.mt-toast'); return t ? { shown: !t.hidden && t.hasAttribute('data-show'), text: t.textContent.trim(), role: t.getAttribute('role'), live: t.getAttribute('aria-live') } : null; });
  const submit = async (p, email) => { await p.fill('#NewsletterEmail-nl', email); await p.click('.sec__newsletter button[type=submit]'); };
  try {
    /* 1. Settings reach the page. */
    settings = { heading: 'Letters from the studio', email_placeholder: 'you@yours.com', email_label: 'Your email', btn_text: 'Join the list', button_style: 'secondary', form_layout: 'horizontal', padding_top: 24, padding_bottom: 72, section_margin_top_mobile: 40, section_margin_top_desktop: 64, success_text: 'Welcome in. The next letter is on its way.', success_duration: 3 };
    {
      const { p, ctx, errs } = await open({ width: 1280 });
      const r = await p.evaluate(() => {
        const sec = document.getElementById('shopify-section-nl'), f = sec.querySelector('form'), b = f.querySelector('button[type=submit]'), i = f.querySelector('input[type=email]');
        const lab = f.querySelector(`label[for="${i.id}"]`);
        return { h2: sec.querySelector('h2').textContent.trim(), ph: i.placeholder, label: lab && lab.textContent.trim(), ac: i.autocomplete, btn: (b.querySelector('[data-inline-label]') || b).textContent.trim(), cls: b.className, role: b.dataset.themeButton, horiz: !!sec.querySelector('.flex-md-nowrap.gap-30'), pt: sec.querySelector('.sec__newsletter').getAttribute('style'), mt: getComputedStyle(sec).marginTop, text: f.innerText };
      });
      ok(r.h2 === 'Letters from the studio' && r.ph === 'you@yours.com' && r.label === 'Your email' && r.ac === 'email', 'heading, placeholder and label: ' + JSON.stringify(r));
      ok(r.btn === 'Join the list' && /btn-secondary/.test(r.cls) && r.role === 'secondary', 'button label and style');
      ok(r.horiz && /--section-pt: 24; --section-pb: 72/.test(r.pt), 'layout and padding');
      ok(r.mt === '64px', 'a top margin wins over Remove default space: ' + r.mt);
      ok(!/Company/.test(r.text), 'the form text is the same before and after it is armed');

      /* 2. Success: one sender (materia-forms), busy, one post, the section's
         words once in the form's own message, Subscribed for the section's time. */
      const look = () => p.evaluate(() => {
        const f = document.querySelector('#shopify-section-nl form'), b = f.querySelector('button[type=submit]');
        const shown = el => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0;
        const msgs = [...document.querySelectorAll('#shopify-section-nl .nl-msg, .mt-toast[data-show], .storelib-form-note, .mt-field-error')].filter(shown).map(el => el.textContent.trim());
        return { state: f.dataset.state || '', msgs, label: shown(f.querySelector('[data-nl-label]')), subscribed: shown(f.querySelector('[data-nl-subscribed]')), spinner: shown(f.querySelector('.nl-spinner')), pending: b.classList.contains('materia-form-pending'), aria: b.getAttribute('aria-disabled'), disabled: b.disabled, sending: f.hasAttribute('data-mt-sending'), storelib: f.hasAttribute('data-storelib-sending'), value: f.querySelector('input[type=email]').value, invalid: f.querySelector('input[type=email]').getAttribute('aria-invalid') };
      });
      await submit(p, 'test+materia-check@example.com');
      const busy = await look();
      ok(busy.state === 'sending' && busy.spinner && !busy.label && busy.aria === 'true' && busy.sending && !busy.pending, 'sending: the form\'s own spinner, one submit at a time: ' + JSON.stringify(busy));
      await p.evaluate(() => { const f = document.querySelector('#shopify-section-nl form'); f.requestSubmit(); f.requestSubmit(); });
      await p.waitForFunction(() => document.querySelector('#shopify-section-nl form').dataset.state === 'done', null, { timeout: 5000 });
      ok(calls.length === 1 && /contact%5Bemail%5D|contact\[email\]/.test(calls[0]) && /test\+materia-check@example\.com/.test(calls[0]), 'one post, with the address');
      let l = await look();
      ok(!l.storelib && !l.pending && !l.sending, 'Storelib\'s page handler did not send it a second time: ' + JSON.stringify(l));
      eq(l.msgs, [settings.success_text], 'success: the section\'s words, shown once (no toast, no second note)');
      ok(l.subscribed && !l.label, 'the button reads Subscribed');
      await p.waitForTimeout(2300);
      l = await look();
      ok(l.state === 'done' && l.subscribed && l.msgs.length === 1, 'still Subscribed before the section\'s time');
      await p.waitForTimeout(1300);
      l = await look();
      ok(l.state === '' && l.label && !l.subscribed && l.msgs.length === 0, 'after the section\'s 3 seconds the button reads its label again: ' + JSON.stringify(l));

      /* 3. Already subscribed from this browser. */
      await submit(p, 'TEST+materia-check@example.com ');
      await p.waitForFunction(() => document.querySelector('#shopify-section-nl form').dataset.state === 'done', null, { timeout: 5000 });
      eq((await look()).msgs, [defaults.already_text], 'the same address again says it is already on the list');
      ok(calls.length === 2, 'it is still sent (the list decides)');
      ok(await p.evaluate(() => !/materia-check/.test(localStorage.getItem('materia:signed-up') || '')), 'the address itself is not stored');
      ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
      await ctx.close();
    }

    /* 4. Invalid address, refused post, no network, the honeypot. */
    settings = { invalid_text: 'That address is missing something.', error_text: 'No connection. Try again in a moment.' };
    {
      const { p, ctx, errs } = await open({ width: 375 });
      const look = () => p.evaluate(() => {
        const f = document.querySelector('#shopify-section-nl form'), b = f.querySelector('button[type=submit]');
        const shown = el => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0;
        const msgs = [...document.querySelectorAll('#shopify-section-nl .nl-msg, .mt-toast[data-show], .storelib-form-note, .mt-field-error')].filter(shown).map(el => el.textContent.trim());
        return { state: f.dataset.state || '', msgs, disabled: b.disabled || b.getAttribute('aria-disabled') === 'true', sending: f.hasAttribute('data-mt-sending') || f.hasAttribute('data-storelib-sending'), value: f.querySelector('input[type=email]').value, invalid: f.querySelector('input[type=email]').getAttribute('aria-invalid') };
      });
      const lay = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, h: document.querySelector('#shopify-section-nl button[type=submit]').getBoundingClientRect().height }));
      ok(lay.over <= 0 && lay.h >= 44, 'fits 375px with a 44px button: ' + JSON.stringify(lay));
      await submit(p, 'not-an-email');
      await p.waitForTimeout(150);
      let l = await look();
      ok(l.invalid === 'true' && calls.length === 0, 'invalid: nothing sent, the field is marked: ' + JSON.stringify(l));
      eq(l.msgs, [settings.invalid_text], 'invalid: the section\'s hint, once, under the field');
      await p.fill('#NewsletterEmail-nl', 'ana@example.com');
      l = await look();
      ok(l.invalid === null && l.msgs.length === 0, 'the hint goes once the address is valid: ' + JSON.stringify(l));

      reply = { ok: false, code: 'email', message: 'Enter a valid email address.' };
      await p.click('.sec__newsletter button[type=submit]');
      await p.waitForFunction(() => document.querySelector('#shopify-section-nl form').dataset.state === 'error', null, { timeout: 5000 });
      l = await look();
      eq(l.msgs, [settings.invalid_text], 'a refused address: the section\'s words, once');
      ok(l.value === 'ana@example.com' && !l.sending, 'the address stays typed');

      reply = { ok: false, code: 'failed' };
      await p.click('.sec__newsletter button[type=submit]');
      await p.waitForFunction(t => document.querySelector('#shopify-section-nl [data-nl-msg="error"]').textContent === t && document.querySelector('#shopify-section-nl form').dataset.state === 'error', settings.error_text, { timeout: 5000 });
      eq((await look()).msgs, [settings.error_text], 'a post that failed: the section\'s words, once');

      offline = true;
      await p.click('.sec__newsletter button[type=submit]');
      await p.waitForFunction(() => { const f = document.querySelector('#shopify-section-nl form'); return f.dataset.state === 'error' && !f.hasAttribute('data-mt-sending'); }, null, { timeout: 5000 });
      l = await look();
      ok(!l.disabled && !l.sending, 'no network: the button works again: ' + JSON.stringify(l));
      eq(l.msgs, [settings.error_text], 'no network: the section\'s error words, once');
      offline = false; reply = { ok: true };
      const before = calls.length;
      await p.click('.sec__newsletter button[type=submit]');
      await p.waitForFunction(() => document.querySelector('#shopify-section-nl form').dataset.state === 'done', null, { timeout: 5000 });
      ok(calls.length === before + 1 && (await look()).msgs.length === 1, 'after an error the next try goes through, with one message');

      const hp = await p.evaluate(() => { const f = document.querySelector('#shopify-section-nl form'), traps = f.querySelectorAll('[data-mt-trap]'), i = f.querySelector('[data-mt-trap] input'), r = i.getBoundingClientRect(); return { traps: traps.length, name: i.name, value: i.value, off: r.right <= 0 || r.width <= 1, hidden: traps[0].getAttribute('aria-hidden'), tab: i.tabIndex }; });
      ok(hp.traps === 1 && hp.name === 'company' && hp.value === '' && hp.off && hp.hidden === 'true' && hp.tab === -1, 'the honeypot: one, empty, off screen, out of the tab order: ' + JSON.stringify(hp));
      ok(calls.every(c => /name="company"\r\n\r\n\r\n/.test(c) || /company=(&|$)/.test(c)), 'every post sent the honeypot empty');
      const sent = calls.length;
      await p.evaluate(() => { const f = document.querySelector('#shopify-section-nl form'); f.querySelector('[data-mt-trap] input').value = 'bot'; f.requestSubmit(); });
      await p.waitForTimeout(600);
      ok(calls.length === sent, 'a filled honeypot sends nothing');
      ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
      await ctx.close();
    }

    /* 5. Builder: one request at most, the success state is shown in the form. */
    settings = { success_text: 'Thanks for joining.', success_duration: 4 };
    {
      const { p, ctx, errs } = await open({ design: true });
      await submit(p, 'test+materia-check@example.com');
      await p.waitForFunction(() => document.querySelector('#shopify-section-nl form').dataset.state === 'done', null, { timeout: 3000 });
      const t = await p.evaluate(() => ({ msg: document.querySelector('#shopify-section-nl [data-nl-msg="done"]').textContent, toast: !!document.querySelector('.mt-toast[data-show]') }));
      // Builder sign-ups send a real request (materia-forms.js: unless a form is set to preview only).
      ok(calls.length <= 1 && t.msg === 'Thanks for joining.' && !t.toast, 'builder: one request at most, the success words shown once: ' + JSON.stringify(t));
      ok(await p.evaluate(() => location.pathname === '/'), 'the canvas did not navigate');
      ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} newsletter round 5 checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
