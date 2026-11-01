/* Round 5, Popups and Custom Code: Custom HTML, Custom code, Order
   notification (fake-order), Promotion popup and Size Chart Popup, run by
   shopify/assets/live-popups-code.js.

   Schema (order, unique ids, legacy and HTML-tag settings hidden); every
   non-hidden section and block control, live and after a server redraw, at
   375 and 1366 (the right width only), every select option different,
   markup equal to what the controller derives; theme inheritance with the
   theme's priority rules on and off, colour schemes live and redrawn,
   custom styling and custom fonts on (element and a descendant) and off
   (the theme back exactly); first paint equal to hydrated paint in the
   editor and the storefront; two instances; an added block; redraws that
   start each root once; 44px targets; no sideways scroll. Behaviour (popups,
   timers, copying, the size chart flow, the creator's code, the saved
   notification): tests/theme-r5-popups-code-behaviour.cjs.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r5-popups-code-controls.cjs [section ...] */
const fs = require('fs'), path = require('path');
const L = require('./theme-r5-popups-code-lib.cjs');
const {launch, mount, schemaOf, schemaProblems, ASSET, FONT, MONO, NAMES, clone, frames, ok, eq, opts, prep, addFp, fp, audit, diff, explain, vis, valuesFor, prereq} = L;

/* Per section: breakpoints, values that look alike at a width, controls applied only by the builder's redraw. */
const CFG = {
  'custom-html': {code: true, structural: ['html_custom'], same: {375: [['all', 'mobile'], ['container', 'fluid_container', 'stretch_width']], 1366: [['all', 'desktop']]}},
  'custom-liquid': {code: true, structural: ['custom_liquid'], same: {375: [['all', 'mobile'], ['container', 'fluid_container', 'stretch_width']], 1366: [['all', 'desktop']]}},
  'fake-order': {structural: ['section_enabled', 'products.fake_product'], noBlockOwn: true, mob: {'layout.show_on_mobile_fake_order': 576},
    pre: {'colors.background_color': {}, 'products.buyer_fallback': {fake_user: ''}}, preBlocks: {'colors.background_color': {background: {enable_gradient: false}}, 'colors.enable_custom_style': {background: {enable_gradient: false}}},
    vals: {'animation.delay_time': ['2000'], 'products.fake_user': ['Ada | Ben']}, same: {375: [['theme', '700']], 1366: [['theme', '700']]}},
  'promotion-popup': {desk: {promotion_banner: 768, banner_width: 768}, pre: {banner_width: {promotion_banner: L.IMG}}, same: {375: [['show_promotion_homepage', 'hide_promotion'], ['700', 'theme']], 1366: [['show_promotion_homepage', 'hide_promotion']]}},
  'size-chart-popup': {skip: ['use_product_chart'], structural: ['html.html'], desk: {modal_width_d: 600}, mob: {modal_width_m: 600}},
};
const OWN_TEST = ['reveal'];

async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  const o = opts(name);
  const t = await mount(browser, name, {...o, width, editing: true});
  await addFp(t.page);
  await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important}.pp__dialog,.scs__dialog{animation:none!important}'});
  const base = clone(t.section.settings), baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header' && !OWN_TEST.includes(x.id) && !(cfg.skip || []).includes(x.id)) cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { ok(i >= 0, name + ': no preset block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  let covered = 0;
  for (const c of cases) {
    const {x} = c, key = (c.btype ? c.btype + '.' : '') + x.id;
    const blocks0 = clone(baseBlocks), S = clone(base), bi = c.scope;
    const own = bi >= 0 ? blocks0[bi].settings : S;
    Object.assign(own, prereq(x, c.list, own), (cfg.pre || {})[key] || {});
    for (const [bt, extra] of Object.entries((cfg.preBlocks || {})[key] || {})) { const b = blocks0.find(y => y.type === bt); Object.assign(b.settings, extra); }
    if (/^section_margin/.test(x.id)) Object.assign(S, {reset_spacing: false});
    if (x.id === 'reset_spacing') Object.assign(S, {section_margin_top_mobile: 20, section_margin_top_desktop: 20});
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const desk = (cfg.desk || {})[x.id] || (/_desktop$/.test(x.id) ? 768 : 0), mob = (cfg.mob || {})[key] || (cfg.mob || {})[x.id] || (/_mobile$/.test(x.id) ? 768 : 0);
    const shows = !(desk && width < desk) && !(mob && width >= mob);
    await t.redraw({settings: S, blocks: blocks0}); await prep(t, name);
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = own[x.id], seen = [[JSON.stringify(cur ?? null), fp0]];
    const same = (cfg.same || {})[width] || [];
    for (const v of (cfg.vals || {})[key] || valuesFor(x, cur)) {
      if (x.type === 'select' && same.some(p => p.includes(v) && p.includes(cur))) continue;
      const tag = name + ' @' + width + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      await t.redraw({settings: S, blocks: blocks0}); await prep(t, name);
      await t.emit({[x.id]: v}, blockId); await prep(t, name);
      const fpL = await fp(t);
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1}); await prep(t, name);
      const fpR = await fp(t);
      eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR), dL = diff(fp0, fpL);
      if (shows) {
        ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0 && !cfg.noBlockOwn) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (/^section_margin|^margin_/.test(x.id)) ok(dR.includes('wrap') || dR.some(k => /^DIV/.test(k)), tag + ': margin not on the section');
        if (!(cfg.structural || []).includes(key)) eq(explain(fpL, fpR, diff(fpL, fpR)), [], tag + ': live differs from redraw');
        seen.push([JSON.stringify(v), fpR]);
      } else {
        eq(explain(vis(fpR), vis(fp0), diff(vis(fp0), vis(fpR))), [], tag + ': changes at the wrong width (redraw)');
        eq(explain(vis(fpL), vis(fp0), diff(vis(fp0), vis(fpL))), [], tag + ': changes at the wrong width (live)');
      }
    }
    if (x.type === 'select' && shows) for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
      const a = JSON.parse(seen[i][0]), b = JSON.parse(seen[j][0]);
      if (same.some(p => p.includes(a) && p.includes(b))) continue;
      ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' @' + width + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
    }
    covered++;
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered;
}

/* What each section draws, to check the theme's values. */
const SEL = {
  'custom-html': {root: '[data-pc-root]', text: '.sec__inner'},
  'custom-liquid': {root: '[data-pc-root]', text: '.sec__inner p'},
  'fake-order': {root: '[data-pc-root]', text: '.user-purchase', title: '.product-order-title a', link: '.text-verify', targets: ['.fake-order-close']},
  'promotion-popup': {root: '.pp__card', heading: '.pp__heading', text: '.pp__text p', btn: '.pp__code', targets: ['.pp__close', '.pp__dismiss', '.pp__code']},
  'size-chart-popup': {root: '.scs__modal', heading: '.scs__title', text: '.scs__table td', trigger: '.scs__trigger', targets: ['.scs__trigger', '.scs__close']},
};
async function themeChecks(browser, name, width, editing, priority = true) {
  const s = SEL[name], tag = name + ' @' + width + (editing ? ' editor' : ' storefront') + (priority === 'off' ? ' priority off' : '');
  const o = opts(name);
  const t = await mount(browser, name, {...o, width, editing, assets: [], priority});
  await addFp(t.page);
  /* a storefront notification waits for its timer: show it to measure it */
  const reveal = async () => { if (name === 'fake-order' && !editing) await t.page.evaluate(() => { for (const r of document.querySelectorAll('[data-pc-root="fake-order"]')) r.dataset.foState = 'shown'; }); await prep(t, name); };
  await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
  await reveal();
  const before = await fp(t);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(120); await reveal();
  eq(explain(await fp(t), before, diff(before, await fp(t))), [], tag + ': first paint equals hydrated paint');
  eq(await audit(t), [], tag + ': markup matches controller');
  const font = sel => t.css(sel, 'fontFamily');
  if (s.root && name !== 'fake-order') eq(await t.css(s.root, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  if (name === 'fake-order') ok(/rgb\(24, 32, 40\)/.test(await t.css(s.root, 'backgroundImage')), tag + ' gradient made of the scheme background');
  if (s.heading) { eq(await t.css(s.heading, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour'); ok(/^Georgia/.test(await font(s.heading)), tag + ' heading font'); eq(await t.css(s.heading, 'fontWeight'), '700', tag + ' heading weight'); }
  if (s.text) { eq(await t.css(s.text, 'color'), 'rgb(204, 204, 204)', tag + ' text colour'); ok(/^Arial/.test(await font(s.text)), tag + ' text font'); }
  if (s.title) { eq(await t.css(s.title, 'color'), 'rgb(255, 255, 255)', tag + ' product name colour'); eq(await t.css(s.title, 'fontWeight'), '700', tag + ' product name weight'); }
  if (s.link) eq(await t.css(s.link, 'color'), 'rgb(51, 102, 153)', tag + ' link colour (scheme primary)');
  if (s.trigger) { eq(await t.css(s.trigger, 'color'), 'rgb(204, 204, 204)', tag + ' trigger colour'); ok(/^Arial/.test(await font(s.trigger)), tag + ' trigger font'); eq(await t.css('.scs__table td', 'borderTopColor'), 'rgb(68, 85, 102)', tag + ' table border'); }
  if (s.btn) {
    eq(await t.css(s.btn, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    ok(/^Arial/.test(await font(s.btn)), tag + ' button font');
    if (priority !== 'off') eq(await t.css(s.btn, 'borderTopLeftRadius'), '12px', tag + ' button radius');
    await t.root(s.btn).first().hover(); await t.page.waitForTimeout(40);
    eq(await t.root(s.btn).first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(255, 0, 0)', tag + ' button hover');
    await t.page.mouse.move(0, 0);
  }
  if (name === 'promotion-popup' && editing) ok(await t.page.evaluate(() => { const d = document.querySelector('[data-pp-dialog]'); return d.open && !d.matches(':modal'); }), tag + ' preview drawn in the page, not modal');
  for (const sel of s.targets || []) for (const el of await t.root(sel).all()) if (await el.isVisible()) { const b = await el.boundingBox(); ok(b.height >= 44 && b.width >= 44, tag + ' ' + sel + ' target 44px (' + Math.round(b.width) + 'x' + Math.round(b.height) + ')'); }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing && priority === true) {
    /* colour scheme, live then redrawn */
    await t.emit({color_scheme: 'alt-scheme'}); await prep(t, name);
    const bgSel = name === 'fake-order' || name.startsWith('custom') ? '[data-pc-root]' : s.root;
    const altText = s.text || s.trigger;
    eq(await t.css(altText, 'color'), 'rgb(51, 51, 51)', tag + ' alt scheme text live');
    if (s.heading) eq(await t.css(s.heading, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    if (name !== 'fake-order') eq(await t.css(bgSel, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme background live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}}); await reveal();
    eq(await t.css(altText, 'color'), 'rgb(51, 51, 51)', tag + ' alt scheme text redraw');
    if (name !== 'fake-order') eq(await t.css(bgSel, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme background redraw');
    else ok(/rgb\(250, 250, 250\)/.test(await t.css(bgSel, 'backgroundImage')), tag + ' alt scheme background redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}}); await reveal();
    const back0 = await fp(t);
    eq(explain(back0, before, diff(before, back0).filter(k => k !== 'wrap')), [], tag + ': scheme back to default');
    await customOn(t, name, s, tag, back0, reveal);
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* Custom colours and fonts on, live and redrawn, then off: the theme back exactly. */
async function customOn(t, name, s, tag, before, reveal) {
  const id = type => t.blockId(type);
  if (name === 'promotion-popup') {
    await t.emit({enable_custom_style: true, popup_bg: '#abcdef', heading_color: '#110000', text_color: '#001100'});
    await t.emit({enable_custom_style: true, color: '#cc0033'}, id('heading'));
    await t.emit({enable_custom_style: true, bg_color: '#00ff00', text_color: '#000000', bg_color_hover: '#0000ff'}, id('coupon'));
    await t.emit({use_theme_button: false, radius: 3, font_size: 19}, id('coupon'));
    await frames(t.page);
    eq(await t.css('.pp__card', 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom popup background');
    eq(await t.css('.pp__heading', 'color'), 'rgb(204, 0, 51)', tag + ' block colour wins over the section heading colour');
    eq(await t.css('.pp__text p', 'color'), 'rgb(0, 17, 0)', tag + ' custom text on a paragraph');
    eq(await t.css('.pp__code', 'backgroundColor'), 'rgb(0, 255, 0)', tag + ' custom button');
    eq(await t.css('.pp__code', 'borderTopLeftRadius'), '3px', tag + ' button shape wins over the theme');
    eq(await t.css('.pp__code', 'fontSize'), '19px', tag + ' button size wins over the theme');
    await t.root('.pp__code').first().hover(); await t.page.waitForTimeout(40);
    eq(await t.root('.pp__code').first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(0, 0, 255)', tag + ' custom button hover');
    await t.page.mouse.move(0, 0);
    await t.emit({enable_custom_fonts: true, heading_font: FONT, body_font: MONO}); await frames(t.page);
    ok(/^Verdana/.test(await t.css('.pp__heading', 'fontFamily')), tag + ' custom heading font');
    ok(/^"?Courier New/.test(await t.css('.pp__text p', 'fontFamily')), tag + ' custom text font on a paragraph');
    await t.emit({enable_custom_fonts: true, font: FONT, weight_enable: true, weight: '400', size_enable: true, size_desktop: 50, size_mobile: 33, line_height: 1.6, tracking: 2}, id('heading')); await frames(t.page);
    eq(await t.css('.pp__heading', 'fontWeight'), '400', tag + ' heading weight wins over the theme');
    eq(await t.css('.pp__heading', 'letterSpacing'), '2px', tag + ' heading letter spacing wins');
    ok(/^Verdana/.test(await t.css('.pp__heading em, .pp__heading', 'fontFamily')), tag + ' heading block font');
    await t.emit({enable_custom_fonts: true, font: FONT}, id('text')); await frames(t.page);
    ok(/^Verdana/.test(await t.css('.pp__text p', 'fontFamily')), tag + ' text block font on a paragraph');
    await t.emit({enable_custom_fonts: true, font: MONO}, id('coupon')); await frames(t.page);
    ok(/^"?Courier New/.test(await t.css('.pp__code', 'fontFamily')), tag + ' button font wins over the theme');
    const live = await fp(t);
    await t.redraw({settings: {enable_custom_style: true, popup_bg: '#abcdef', heading_color: '#110000', text_color: '#001100', enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(b.type === 'heading' ? {enable_custom_style: true, color: '#cc0033', enable_custom_fonts: true, font: FONT, weight_enable: true, weight: '400', size_enable: true, size_desktop: 50, size_mobile: 33, line_height: 1.6, tracking: 2} : b.type === 'coupon' ? {enable_custom_style: true, bg_color: '#00ff00', text_color: '#000000', bg_color_hover: '#0000ff', use_theme_button: false, radius: 3, font_size: 19, enable_custom_fonts: true, font: MONO} : b.type === 'text' ? {enable_custom_fonts: true, font: FONT} : {})}}))});
    eq(explain(live, await fp(t), diff(live, await fp(t))), [], tag + ': custom styling live equals redraw');
    await t.redraw({settings: {enable_custom_style: false, enable_custom_fonts: false}, blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, enable_custom_style: false, enable_custom_fonts: false, weight_enable: false, size_enable: false, use_theme_button: true}}))});
  } else if (name === 'size-chart-popup') {
    await t.emit({enable_custom_style: true, modal_bg: '#abcdef', title_color: '#110000', text_color: '#001100', trig_color: '#220000', table_border_color: '#00ff00'}); await prep(t, name);
    eq(await t.css('.scs__modal', 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom popup background');
    eq(await t.css('.scs__title', 'color'), 'rgb(17, 0, 0)', tag + ' custom title');
    eq(await t.css('.scs__table td', 'color'), 'rgb(0, 17, 0)', tag + ' custom text in a cell');
    eq(await t.css('.scs__trigger', 'color'), 'rgb(34, 0, 0)', tag + ' custom trigger');
    eq(await t.css('.scs__table td', 'borderTopColor'), 'rgb(0, 255, 0)', tag + ' custom table border');
    eq(await t.css('.scs__icn', 'color'), 'rgb(34, 0, 0)', tag + ' icon follows the trigger colour');
    await t.emit({enable_custom_fonts: true, heading_font: FONT, body_font: MONO}); await prep(t, name);
    ok(/^Verdana/.test(await t.css('.scs__title', 'fontFamily')), tag + ' custom title font wins over the theme');
    ok(/^"?Courier New/.test(await t.css('.scs__table td', 'fontFamily')), tag + ' custom text font in a cell');
    ok(/^"?Courier New/.test(await t.css('.scs__notes p', 'fontFamily')), tag + ' custom text font on a notes paragraph');
    ok(/^"?Courier New/.test(await t.css('.scs__trigger', 'fontFamily')), tag + ' custom trigger font');
    const live = await fp(t);
    await t.redraw({settings: {enable_custom_style: true, modal_bg: '#abcdef', title_color: '#110000', text_color: '#001100', trig_color: '#220000', table_border_color: '#00ff00', enable_custom_fonts: true, heading_font: FONT, body_font: MONO}}); await prep(t, name);
    eq(explain(live, await fp(t), diff(live, await fp(t))), [], tag + ': custom styling live equals redraw');
    await t.redraw({settings: {enable_custom_style: false, enable_custom_fonts: false}});
    await t.page.evaluate(() => { const d = document.querySelector('[data-scs-dialog]'); if (d.open) d.close(); });
  } else if (name === 'fake-order') {
    await t.emit({enable_custom_style: true, text_color: '#001100', background_color: '#abcdef', progress_bar_color: '#ff0000'}, id('colors'));
    await t.emit({enable_gradient: false}, id('background'));
    await t.emit({enable_custom_style: true, title_color: '#110000', verify_text_color: '#00ff00', close_button_color: '#0000ff'}, id('text'));
    await t.emit({enable_custom_fonts: true, font: MONO, title_font: FONT, title_weight: '400', enable_custom_size: true, text_size: 17, title_size: 21}, id('text'));
    await frames(t.page);
    eq(await t.css('[data-pc-root]', 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background');
    eq(await t.css('.user-purchase', 'color'), 'rgb(0, 17, 0)', tag + ' custom text');
    eq(await t.css('.product-order-title a', 'color'), 'rgb(17, 0, 0)', tag + ' custom product name');
    eq(await t.css('.text-verify', 'color'), 'rgb(0, 255, 0)', tag + ' custom link');
    eq(await t.css('.fake-order-close', 'color'), 'rgb(0, 0, 255)', tag + ' custom close');
    eq(await t.css('[data-progressbar]', 'backgroundColor'), 'rgb(255, 0, 0)', tag + ' custom progress');
    ok(/^"?Courier New/.test(await t.css('.user-purchase', 'fontFamily')), tag + ' custom text font');
    ok(/^Verdana/.test(await t.css('.product-order-title a', 'fontFamily')), tag + ' custom product name font');
    eq(await t.css('.product-order-title a', 'fontWeight'), '400', tag + ' product name weight wins');
    eq(await t.css('.product-order-title a', 'fontSize'), '21px', tag + ' product name size');
    eq(await t.css('.user-purchase', 'fontSize'), '17px', tag + ' text size');
    const live = await fp(t);
    const on = {colors: {enable_custom_style: true, text_color: '#001100', background_color: '#abcdef', progress_bar_color: '#ff0000'}, background: {enable_gradient: false}, text: {enable_custom_style: true, title_color: '#110000', verify_text_color: '#00ff00', close_button_color: '#0000ff', enable_custom_fonts: true, font: MONO, title_font: FONT, title_weight: '400', enable_custom_size: true, text_size: 17, title_size: 21}};
    await t.redraw({blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(on[b.type] || {})}}))});
    eq(explain(live, await fp(t), diff(live, await fp(t))), [], tag + ': custom styling live equals redraw');
    const offB = {colors: {enable_custom_style: false}, background: {enable_gradient: true}, text: {enable_custom_style: false, enable_custom_fonts: false, title_weight: 'theme', enable_custom_size: false}};
    await t.redraw({blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(offB[b.type] || {})}}))});
  } else {
    /* the creator's code keeps its own look; the wrapper follows the scheme */
    return;
  }
  await reveal();
  const back = await fp(t), d = diff(before, back).filter(k => k !== 'wrap');
  eq(explain(back, before, d), [], tag + ': custom styling off restores the theme exactly');
}

/* Two instances, an added block, redraws that start each root once. */
async function instances(browser, name, width) {
  const tag = name + ' @' + width;
  const o = opts(name);
  const t = await mount(browser, name, {...o, width, editing: true, instances: [{uid: 'a', blocks: o.blocks, settings: o.settings}, {uid: 'b', blocks: o.blocks, settings: o.settings}]});
  await addFp(t.page); await prep(t, name, 'a'); await prep(t, name, 'b');
  const b0 = await fp(t, 'b');
  const edit = {'custom-html': {padding_top: 44, show_section_on: 'all', section_width: 'full_width'}, 'custom-liquid': {padding_top: 44, section_width: 'full_width'}, 'fake-order': {color_scheme: 'alt-scheme'}, 'promotion-popup': {promotion_width: 500, text_align: 'left', enable_custom_style: true, popup_bg: '#abcdef'}, 'size-chart-popup': {trig_text: 'Only in A', align: 'right', enable_custom_style: true, modal_bg: '#abcdef'}}[name];
  await t.emit(edit, undefined, 'a'); await prep(t, name, 'a'); await prep(t, name, 'b');
  const firstBlock = t.rendered[0].section.blocks.find(b => ['text', 'heading', 'row'].includes(b.type));
  if (firstBlock) await t.emit(firstBlock.type === 'row' ? {cells: 'XS|1|2|3'} : firstBlock.type === 'text' && name === 'fake-order' ? {heading_text: 'Only A'} : {text: 'Only in A'}, firstBlock.id, 'a');
  await prep(t, name, 'b');
  eq(explain(await fp(t, 'b'), b0, diff(b0, await fp(t, 'b'))), [], tag + ': an edit to one instance leaves the other alone');
  ok(diff(await fp(t, 'a'), b0).length > 0, tag + ': the edit reached instance a');
  /* redraw: one root per instance, set up once */
  const before = await t.page.evaluate(() => [...window.MateriaPopupsCode.roots.values()].map(s => s.cleanup.length));
  for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
  const after = await t.page.evaluate(() => ({n: window.MateriaPopupsCode.roots.size, c: [...window.MateriaPopupsCode.roots.values()].map(s => s.cleanup.length)}));
  eq(after.n, 2, tag + ': one controller root per instance after redraws');
  eq(after.c.slice().sort(), before.slice().sort(), tag + ': redraws add no listeners');
  /* an added block */
  const extra = {'fake-order': null, 'custom-html': null, 'custom-liquid': null, 'promotion-popup': null, 'size-chart-popup': {type: 'row', settings: {cells: 'XXL|50-52|44-46|50-52'}}}[name];
  if (extra) {
    await t.redraw({uid: 'a', blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([extra])});
    await prep(t, name, 'a');
    const nid = t.rendered[0].section.blocks[t.rendered[0].section.blocks.length - 1].id;
    ok(await t.page.locator('#shopify-section-a [data-pc-block="' + nid + '"]').count() === 1, tag + ': added block drawn');
    await t.emit({cells: 'XXXL|1|2|3'}, nid, 'a'); await frames(t.page);
    eq(await t.page.locator('#shopify-section-a [data-pc-block="' + nid + '"] th').textContent(), 'XXXL', tag + ': added block live');
    eq(await audit(t, 'a'), [], tag + ': added block markup matches controller');
  }
  /* a picture is never reloaded by an unrelated edit */
  if (name === 'promotion-popup') {
    await t.redraw({uid: 'a', settings: {promotion_banner: L.IMG}});
    if (width >= 768) {
      await t.page.evaluate(() => { document.querySelector('#shopify-section-a [data-pp-media] img').__mark = 1; });
      await t.emit({promotion_width: 600, text_align: 'right'}, undefined, 'a');
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-a [data-pp-media] img').__mark === 1), tag + ': picture element kept on unrelated edits');
    }
  }
  if (name === 'fake-order') {
    await t.page.evaluate(() => { document.querySelector('#shopify-section-a [data-img]').__mark = 1; });
    await t.emit({border_radius: 12}, t.blockId('layout', 0, 'a'), 'a');
    ok(await t.page.evaluate(() => document.querySelector('#shopify-section-a [data-img]').__mark === 1), tag + ': product picture kept on unrelated edits');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

(async () => {
  const only = process.argv.slice(2), names = only.length ? only : NAMES;
  const browser = await launch();
  const covered = {};
  try {
    for (const name of names) {
      eq(schemaProblems(name), [], name + ' schema');
      const {schema} = schemaOf(name);
      const ids = (schema.settings || []).filter(x => x.id).map(x => x.id);
      eq(ids[0], 'color_scheme', name + ': colour scheme first');
      for (const b of schema.blocks || []) { const bid = (b.settings || []).filter(x => x.id).map(x => x.id); eq(new Set(bid).size, bid.length, name + ' ' + b.type + ' unique ids'); }
      const headers = (schema.settings || []).filter(x => x.type === 'header').map(x => x.content);
      const ORDER = ['General', 'Display', 'Content', 'Layout', 'Media', 'Appearance', 'Typography', 'Animation', 'Spacing', 'Mobile'];
      const pos = headers.map(h => ORDER.indexOf(h));
      ok(pos.every(p => p >= 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]), name + ': groups in the shared order (' + headers + ')');
      for (const width of [375, 1366]) {
        covered[name + '@' + width] = await everyControl(browser, name, width);
        for (const editing of [true, false]) await themeChecks(browser, name, width, editing);
        await instances(browser, name, width);
      }
      await themeChecks(browser, name, 1366, false, 'off');
      console.log(name, 'done', L.count());
    }
  } finally { await browser.close(); }
  console.log('controls covered', JSON.stringify(covered));
  console.log('theme-r5-popups-code-controls: ' + L.count() + ' checks passed');
})().catch(e => { console.error(e); process.exit(1); });
