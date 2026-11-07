/* Round 5, Slideshow (sections/slideshow.storelib), with the real theme
   priority rules (snippets/theme-controls), the theme CSS, Swiper, global.js
   (<slide-section>), slideshow-live.js, slideshow-pointer.js and the group
   controller live-blog-slideshow.js.

   1. Schema: shared problems list, every id of HEAD kept, colour scheme
      first, the shared group order, no invented badge claims in defaults.
   2. Every visible section and slide setting, every option of every select,
      at 375 and 1366 in the builder: the redrawn section looks different from
      before, and the same change sent live looks exactly like the redraw
      (unless the setting is listed as redraw only), then sending the old value
      back restores the first look.
   3. Theme first: scheme colours, theme fonts and buttons by default; custom
      colours, fonts and weights per slide and the section's button shape win
      over the theme's priority rules (data-own-* present only while on), live
      and after a redraw, on the element and a descendant; off restores the
      theme. Once more with both priorities off.
   4. First paint equals the hydrated paint (builder and storefront).
   5. Image effects, slide changes and text entrances are each visibly
      different; autoplay runs per instance, waits off screen and is off under
      reduced motion; a live change of effect, loop or autoplay restarts the
      slider once; two instances stay independent; a redraw sets up once.
   6. The saved slideshows of home, contact and about look as they did (HEAD).
   7. No sideways scroll at 375, no errors.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r5-blog-slideshow-slideshow.cjs */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems, themeControls, THEME_VARS} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const ROOT = path.join(__dirname, '..');
/* The sections as they were before round 5 (the commit before the round's work in progress), or HEAD. */
const BEFORE = (() => { try { return execSync('git rev-parse --verify -q 2002b49^{commit}', {cwd: ROOT, encoding: 'utf8'}).trim() || 'HEAD'; } catch (_) { return 'HEAD'; } })();
const A = ['swiper-bundle.min.css', 'banner.css', 'slideshow.css', 'pagination-styles.css', 'swiper-bundle.min.js', 'motion.min.js', 'global.js', 'slideshow-live.js', 'slideshow-pointer.js', 'live-blog-slideshow.js'];
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 1600, height: 900, aspect_ratio: 1.78, alt: 'Saved alt', presentation: {focal_point: '50% 50%'}};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const only = process.argv.slice(2);

const SLIDE1 = {subheading: 'Top text', heading: 'First slide', description: '<p>Some <strong>words</strong> here</p>', first_button_label: 'Shop', first_button_link: '/collections/all', second_button_label: 'More'};
const BLOCKS = () => [{type: 'slider_item', settings: {...SLIDE1}}, {type: 'slider_item', settings: {heading: 'Second slide'}}];
const BASE = {autoplay: false};

/* Everything a visitor can see on the first slide and around it. */
async function sig(page, uid = 'test') {
  return page.evaluate(uid => {
    /* compare looks at rest: transitions and picture entrances finished, endless image loops at their start */
    for (const a of document.getAnimations()) { if (a instanceof CSSTransition) a.finish(); else if (a.effect && a.effect.getComputedTiming().iterations === Infinity) a.currentTime = 0; else if (a instanceof CSSAnimation && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.banner__media')) a.finish(); }
    const W = document.getElementById('shopify-section-' + uid), R = W.querySelector('[data-slideshow-settings]'), S = W.querySelector('[data-first-slide]');
    const cs = (el, props, pseudo) => el ? Object.fromEntries(props.map(p => [p, p.startsWith('--') ? getComputedStyle(el, pseudo).getPropertyValue(p).trim() : getComputedStyle(el, pseudo)[p]])) : null;
    const T = ['fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'marginBottom', 'fontStyle', 'display'];
    const vis = el => el && getComputedStyle(el).display !== 'none' ? el : null;
    const btn = el => vis(el) ? {t: el.textContent.trim(), href: el.getAttribute('href'), ...cs(el, ['backgroundColor', 'color', 'borderTopLeftRadius', 'paddingTop', 'paddingLeft', 'borderTopColor', 'textTransform', 'fontFamily', '--mb-hover-bg', '--mb-hover-text']), outline: el.classList.contains('btn-outline')} : null;
    const slider = R.querySelector('slide-section'), sw = slider?.globalSlide;
    const out = {
      root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']), wrap: cs(W, ['marginTop', 'marginBottom']), width: cs(R.firstElementChild, ['maxWidth', 'paddingLeft']), cls: R.firstElementChild.className,
      inner: cs(S.querySelector('.sec__inner'), ['height', 'flexDirection']), media: cs(S.querySelector('.banner__media'), ['overflow', 'perspective', 'height', '--overlay-opacity']),
      after: cs(S.querySelector('.banner__media'), ['backgroundImage', 'opacity', 'animationName'], '::after'),
      img: cs(S.querySelector('.banner__media img'), ['transform', 'filter', 'animationName', 'animationDuration', 'transitionDuration', 'objectFit']),
      imgs: [...S.querySelectorAll('.banner__media img, .banner__media video, .banner__media iframe')].map(i => i.tagName + ':' + (i.currentSrc || i.getAttribute('src') || i.getAttribute('data-src') || '').replace(/\?.*$/, '') + ':' + (i.alt || '')),
      box: cs(S.querySelector('.sec__content'), ['alignItems', 'justifyContent', 'width', 'maxWidth']),
      content: cs(S.querySelector('.sec__content-inner'), ['textAlign', 'maxWidth', 'paddingTop', 'paddingLeft', 'backgroundColor', '--content-bg', '--opacity']),
      contentBox: S.querySelector('.sec__content-inner')?.classList.contains('content-box'), entrance: [...(S.querySelector('.sec__content-inner')?.classList || [])].filter(c => c.startsWith('effect_')).join(),
      contentBoxBg: cs(S.querySelector('.sec__content-inner'), ['backgroundColor', 'opacity'], '::before'),
      sub: vis(S.querySelector('.sec__content-subheading')) && {t: S.querySelector('.sec__content-subheading').textContent.trim(), ...cs(S.querySelector('.sec__content-subheading'), T)},
      h: vis(S.querySelector('.sec__content-heading')) && {t: S.querySelector('.sec__content-heading').textContent.trim(), ...cs(S.querySelector('.sec__content-heading'), T)},
      accent: [...S.querySelectorAll('.hero-accent')].map(a => a.textContent + ':' + getComputedStyle(a).color + ':' + getComputedStyle(a).fontStyle).join(),
      des: vis(S.querySelector('.sec__content-des')) && {t: S.querySelector('.sec__content-des').textContent.trim(), ...cs(S.querySelector('.sec__content-des'), T), p: cs(S.querySelector('.sec__content-des p'), ['color', 'fontFamily', 'fontWeight', 'fontSize'])},
      btns: cs(S.querySelector('.sec__content-btn'), ['justifyContent']), b1: btn(S.querySelector('[data-button-role="primary"]')), b2: btn(S.querySelector('[data-button-role="secondary"]')),
      badges: vis(S.querySelector('.banner__badges')) && {t: S.querySelector('.banner__badges').textContent.replace(/\s+/g, ' ').trim(), at: [...S.querySelector('.sec__content-inner').children].indexOf(S.querySelector('.banner__badges')), ...cs(S.querySelector('.banner__badges'), ['marginTop', 'marginBottom', 'columnGap', 'justifyContent']), badge: cs(S.querySelector('.banner__badge'), ['fontSize', 'color']), text: cs(S.querySelector('.banner__badge-text'), ['fontWeight']), svg: cs(S.querySelector('.banner__badge svg'), ['color', 'width']), stars: S.querySelector('.badge-stars__fg')?.style.width, starsBg: cs(S.querySelector('.badge-stars__bg'), ['color']), icons: [...S.querySelectorAll('.banner__badge svg path')].map(p => p.getAttribute('d').slice(0, 12)).join()},
      arrows: vis(R.querySelector('.swiper-actions')) && {...cs(R.querySelector('.swiper-actions'), ['opacity', 'visibility', 'display']), a: cs(R.querySelector('.swiper-button-next'), ['width', 'borderTopLeftRadius', 'backgroundColor', 'color', 'borderTopColor', '--ss-arrow-hover-bg', '--ss-arrow-hover-icon', 'opacity', 'display', 'visibility'])},
      pag: vis(R.querySelector('.swiper-pagination')) && {...cs(R.querySelector('.swiper-pagination'), ['justifyContent', 'display']), bullet: cs(R.querySelector('.swiper-pagination-bullet-active, .swiper-pagination-bullet'), ['width', 'height', 'borderTopLeftRadius', 'backgroundColor', 'borderTopWidth']), style: slider.dataset.paginationStyle},
      swiper: sw && !sw.destroyed ? {effect: sw.params.effect, loop: !!sw.params.loop, autoplay: !!(sw.params.autoplay && sw.params.autoplay.enabled), delay: sw.params.autoplay?.enabled ? sw.params.autoplay.delay : 0} : null, split: cs(S.querySelector('.banner__media-split'), ['columnGap', 'rowGap']),
      pointer: R.dataset.ssFx || R.dataset.slideshowPointer, /* the image effect: data-ss-fx now, data-slideshow-pointer before */
    };
    return JSON.parse(JSON.stringify(out));
  }, uid);
}
const diff = (a, b, p = '') => { const o = []; if (JSON.stringify(a) === JSON.stringify(b)) return o; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o.push(...diff(a[k], b[k], p + '.' + k)); return o; } return [p + ': ' + JSON.stringify(a) + ' / ' + JSON.stringify(b)]; };

/* Values to try for one setting. */
function values(x) {
  const cur = x.default;
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': case 'textarea': return x.id === 'accent_heading_text' ? ['First'] : ['Edited words'];
    case 'richtext': return ['<p>Edited <em>text</em></p>'];
    case 'url': return ['/pages/edited'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [FONT];
    case 'video': return [];
    default: return [];
  }
}
/* What a visible_if needs to be true. */
function prereq(vif, scope) {
  const out = {};
  if (!vif) return out;
  for (const part of vif.replace(/^\{\{|\}\}$/g, '').split(' and ')) {
    let m;
    if ((m = part.match(new RegExp(scope + '\\.settings\\.(\\w+)\\s*==\\s*\'([^\']+)\'')))) out[m[1]] = m[2];
    else if ((m = part.match(new RegExp(scope + '\\.settings\\.(\\w+)\\s*!=\\s*\'([^\']+)\'')))) out[m[1]] = {none: 'text', disable: 'show_dots'}[m[2]] || 'x';
    else if ((m = part.match(new RegExp(scope + '\\.settings\\.(\\w+)\\s*==\\s*false')))) out[m[1]] = false;
    else if ((m = part.match(new RegExp(scope + '\\.settings\\.(\\w+)')))) out[m[1]] = true;
  }
  return out;
}
/* Extra context so a setting can show (beyond its visible_if). */
const PRE_S = {
  section_margin_top_desktop: {reset_spacing: false}, section_margin_bottom_desktop: {reset_spacing: false}, section_margin_top_mobile: {reset_spacing: false}, section_margin_bottom_mobile: {reset_spacing: false},
  autorotate_speed: {autoplay: true}, image_effect_intensity: {image_effect: 'zoom_out'}, reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 20},
  arrow_visibility: {}, btn_text_transform_override: {btn_custom_enable: true},
};
const PRE_B = {
  accent_heading_text: {enable_accent_heading: true}, accent_heading_color: {enable_accent_heading: true, accent_heading_text: 'First'}, accent_heading_italic: {enable_accent_heading: true, accent_heading_text: 'First'},
  enable_accent_heading: {accent_heading_text: 'First'},
  subheading_weight: {enable_custom_font_weights: true}, trust_badge_star_empty_color: {enable_trust_badges: true, badge_1_type: 'stars'}, badge_1_rating: {enable_trust_badges: true, badge_1_type: 'stars'},
  trust_badge_accent_color: {enable_trust_badges: true}, badge_1_icon: {enable_trust_badges: true, badge_1_type: 'icon'},
  badge_2_text: {enable_trust_badges: true, badge_2_type: 'icon'}, badge_3_text: {enable_trust_badges: true, badge_3_type: 'icon'},
  badge_2_type: {enable_trust_badges: true, badge_2_text: 'Two'}, badge_3_type: {enable_trust_badges: true, badge_3_text: 'Three'}, accent_heading_text: {enable_accent_heading: true},
  badge_2_rating: {enable_trust_badges: true, badge_2_type: 'stars'}, badge_3_rating: {enable_trust_badges: true, badge_3_type: 'stars'},
  badge_2_icon: {enable_trust_badges: true, badge_2_type: 'icon'}, badge_3_icon: {enable_trust_badges: true, badge_3_type: 'icon'},
  content_box_opacity: {show_content_background: true, content_background: '#00ff00'}, content_background: {show_content_background: true},
  split_gap: {split_images_enable: true}, image_split_left: {split_images_enable: true}, image_split_right: {split_images_enable: true},
  split_mobile_primary_image: {split_images_enable: true, split_mobile_use_primary: true}, split_mobile_use_primary: {split_images_enable: true, split_mobile_primary_image: IMG},
  first_button_hover_bg: {enable_custom_colors: true}, second_button_hover_bg: {enable_custom_colors: true},
};
/* Redraw only: they change the markup itself (pictures, video, split layout,
   which badges exist and where, a text block that was empty, the reveal
   class on the storefront). The builder redraws after each of these. */
const STRUCTURAL = new Set(['image', 'image_mobile', 'local_video', 'video_url', 'split_images_enable', 'image_split_left', 'image_split_right', 'split_gap', 'split_mobile_use_primary', 'split_mobile_primary_image',
  'enable_trust_badges', 'trust_badge_position', 'badge_1_type', 'badge_2_type', 'badge_3_type', 'badge_1_icon', 'badge_2_icon', 'badge_3_icon', 'content_below_image', 'reveal', 'carousel_pagination', 'show_arrow', 'slide_height', 'subheading', 'second_button_label', 'enable_accent_heading', 'accent_heading_text']);
/* Settings that look the same at one width (desktop or mobile only). */
const SAME = {375: new Set(['subheading_font_size', 'heading_font_size', 'des_font_size', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'content_position', 'content_alignment', 'content_max_width', 'arrow_visibility', 'show_arrow', 'arrow_shape', 'arrow_style', 'arrow_size', 'arrow_bg', 'arrow_icon_color', 'arrow_border_color', 'content_width', 'pagination_position', 'section_width', 'desktop_height']),
  1366: new Set(['subheading_font_size_mobile', 'heading_font_size_mobile', 'des_font_size_mobile', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'content_position_mobile', 'content_alignment_mobile', 'arrow_show_mobile', 'content_below_image', 'mobile_image_text_gap', 'mobile_height', 'split_mobile_use_primary', 'split_mobile_primary_image'])};
/* Values whose look is the same as the default by design (an option equal to the theme value here). */
const SAME_VALUE = {
  subheading_font_weight: ['subheading_weight'], des_font_weight: ['subheading_weight'], heading_font_weight: [], btn_text_transform_override: [],
  carousel_pagination: ['show_dots_on_mobile@375'], content_width: ['fluid_container'], section_width: ['fluid_container', 'container@1366'],
  image_effect: ['zoom_in', 'fade_in', 'reveal_up'], /* hover and entrance effects: checked in motion() */
  slide_effect: ['slide_push', 'coverflow'], /* the slider runs slide for these too and the section draws them only while slides move: checked in motion() */
  arrow_shape: ['rounded@1366'], /* the fixture theme's own radius is 12px, like Rounded */
  slide_height: ['adapt'], /* no picture here: adapt keeps the full screen ratio */
  btn_second_bg: ['#ab12cd'], /* the theme's second button is an outline here (no fill); checked in themeFirst() with a solid one */
  enable_custom_colors: [true], /* on with no colour chosen: still the scheme */
  badge_text_weight: [], subheading_weight: [], heading_weight: [], description_weight: [],
};
/* Not a visible change on its own in this fixture, checked elsewhere in this file. */
const ELSEWHERE = new Set(['reveal', 'first_button_hover_bg', 'first_button_hover_color', 'second_button_hover_bg', 'second_button_hover_color', 'btn_first_text_hover', 'btn_second_text_hover', 'btn_first_bg_hover', 'btn_second_bg_hover', 'arrow_hover_bg', 'arrow_hover_icon_color', 'local_video']);

async function controls(browser) {
  const {schema} = schemaOf('slideshow'), allFails = [];
  /* the fixture's redraw keeps earlier settings: every id is given each time */
  const RESET = Object.fromEntries(schema.settings.filter(x => x.id).map(x => [x.id, x.default]));
  const items = [...schema.settings.filter(x => x.id && !x.hidden).map(x => ['s', x]), ...schema.blocks[0].settings.filter(x => x.id && !x.hidden).map(x => ['b', x])].filter(([, x]) => !only.length || only[0] === 'controls' || only.includes(x.id));
  for (const width of [375, 1366]) {
    const L = await mount(browser, 'slideshow', {width, assets: A, settings: BASE, blocks: BLOCKS()});
    const R = await mount(browser, 'slideshow', {width, assets: A, settings: BASE, blocks: BLOCKS()});
    /* the pointer off the page: a slideshow filling the window is otherwise hovered, which shows hover arrows and plays hover zooms */
    await L.page.mouse.move(-10, -10); await R.page.mouse.move(-10, -10);
    const fails = [];
    for (const [scope, x] of items) {
      if (ELSEWHERE.has(x.id)) continue;
      const pre = {...prereq(x.visible_if, scope === 's' ? 'section' : 'block'), ...((scope === 's' ? PRE_S : PRE_B)[x.id] || {})};
      for (const v of values(x)) {
        const tag = x.id + '=' + JSON.stringify(v).slice(0, 30) + '@' + width;
        const same = (SAME_VALUE[x.id] || []).some(s => s === v || s === v + '@' + width);
        const set = o => scope === 's' ? {settings: {...RESET, ...BASE, ...o}, blocks: BLOCKS()} : {settings: {...RESET, ...BASE}, blocks: [{type: 'slider_item', settings: {...SLIDE1, ...o}}, BLOCKS()[1]]};
        const preS = {...pre}; for (const k of Object.keys(preS)) if (k === x.id) delete preS[k];
        await L.redraw(set(preS)); await frames(L.page);
        const before = await sig(L.page);
        await R.redraw(set({...preS, [x.id]: v})); await frames(R.page); await R.page.waitForTimeout(60);
        const redrawn = await sig(R.page);
        const changed = diff(before, redrawn);
        if (!same && !SAME[width].has(x.id) && !changed.length) fails.push(tag + ': no visible change after a redraw');
        if (STRUCTURAL.has(x.id)) continue;
        const emitBlock = scope === 'b' ? L.blockId('slider_item', 0) : undefined;
        await L.emit({[x.id]: v}, emitBlock); await frames(L.page); await L.page.waitForTimeout(60);
        const live = await sig(L.page);
        const d = diff(live, redrawn);
        if (d.length) fails.push(tag + ': live differs from redraw: ' + d.slice(0, 4).join(' | '));
        checks++;
      }
    }
    eq(L.errors.concat(R.errors), [], 'no errors in the control sweep');
    await L.page.close(); await R.page.close();
    if (fails.length) console.log(fails.join('\n'));
    allFails.push(...fails);
  }
  eq(allFails, [], 'every control live and after a redraw');
}

async function themeFirst(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await mount(browser, 'slideshow', {width, editing, assets: A, settings: BASE, blocks: [{type: 'slider_item', settings: {...SLIDE1, heading: 'First slide', enable_accent_heading: true, accent_heading_text: 'slide'}}, BLOCKS()[1]]});
    const P = '[data-first-slide] ', H = P + '.sec__content-heading', HS = H + ' .hero-accent', SUB = P + '.sec__content-subheading', D = P + '.sec__content-des', DP = D + ' strong', B1 = P + '[data-button-role="primary"]';
    const read = async () => ({h: await t.css(H, 'fontFamily'), hs: await t.css(HS, 'fontFamily'), hw: await t.css(H, 'fontWeight'), hsw: await t.css(HS, 'fontWeight'), hc: await t.css(H, 'color'), sub: await t.css(SUB, 'fontFamily'), subw: await t.css(SUB, 'fontWeight'), d: await t.css(D, 'fontFamily'), dp: await t.css(DP, 'fontFamily'), dw: await t.css(D, 'fontWeight'), dc: await t.css(D + ' p', 'color'), bg: await t.css(B1, 'backgroundColor'), r: await t.css(B1, 'borderTopLeftRadius'), pad: await t.css(B1, 'paddingLeft'), root: await t.css('[data-slideshow-settings]', 'backgroundColor')});
    const theme = await read();
    eq([theme.h, theme.hs, theme.hw, theme.hc, theme.sub, theme.subw, theme.d, theme.dp, theme.dc, theme.bg, theme.r], ['Georgia', 'Georgia', '700', 'rgb(255, 255, 255)', 'Arial', '400', 'Arial', 'Arial', 'rgb(204, 204, 204)', 'rgb(18, 52, 86)', '12px'], 'theme first ' + width);
    await t.page.hover(B1); await t.page.waitForTimeout(50); eq(await t.css(B1, 'backgroundColor'), 'rgb(255, 0, 0)', 'theme hover'); await t.page.mouse.move(1, 1);
    const own = async (sel, a) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, a) => el.hasAttribute(a), a);
    const ON = {enable_custom_fonts: true, heading_font: FONT, subheading_font: MONO, description_font: MONO, enable_custom_font_weights: true, heading_weight: '300', subheading_weight: '800', description_weight: '600', enable_custom_colors: true, heading_color: '#ee1122', description_color: '#11ee22', first_button_bg: '#2233ee'};
    const OFF = {enable_custom_fonts: false, enable_custom_font_weights: false, enable_custom_colors: false};
    const want = async label => {
      const r = await read();
      ok(/Verdana/.test(r.h) && /Verdana/.test(r.hs) && /Courier New/.test(r.sub) && /Courier New/.test(r.d) && /Courier New/.test(r.dp), label + ' fonts ' + JSON.stringify(r));
      eq([r.hw, r.hsw, r.subw, r.dw, r.hc, r.dc, r.bg], ['300', '300', '800', '600', 'rgb(238, 17, 34)', 'rgb(17, 238, 34)', 'rgb(34, 51, 238)'], label);
      ok(await own(H, 'data-own-font') && await own(H, 'data-own-weight') && await own(SUB, 'data-own-font') && await own(D, 'data-own-weight'), label + ' opt-out attributes');
    };
    const back = async label => { const r = await read(); eq(r, theme, label + ' theme restored'); ok(!(await own(H, 'data-own-font')) && !(await own(D, 'data-own-weight')), label + ' attributes gone'); };
    const bid = t.blockId('slider_item', 0);
    await t.emit(ON, bid); await frames(t.page); await want('live on ' + width);
    await t.emit(OFF, bid); await frames(t.page); await back('live off ' + width);
    const blocksWith = o => [{type: 'slider_item', settings: {...SLIDE1, enable_accent_heading: true, accent_heading_text: 'slide', ...o}}, BLOCKS()[1]];
    await t.redraw({blocks: blocksWith(ON)}); await frames(t.page); await want('redraw on ' + width);
    await t.redraw({blocks: blocksWith(OFF)}); await frames(t.page); await back('redraw off ' + width);
    /* the section's button shape over the theme's shared button shape */
    const SHAPE = {btn_custom_enable: true, btn_radius_override: 30, btn_padding_x_override: 41, btn_first_bg: '#118811'};
    await t.emit(SHAPE); await frames(t.page);
    eq([await t.css(B1, 'borderTopLeftRadius'), await t.css(B1, 'paddingLeft'), await t.css(B1, 'backgroundColor'), await own(B1, 'data-own-shape')], ['30px', '41px', 'rgb(17, 136, 17)', true], 'button shape live ' + width);
    await t.emit({btn_custom_enable: false}); await frames(t.page);
    eq([await t.css(B1, 'borderTopLeftRadius'), await t.css(B1, 'paddingLeft'), await t.css(B1, 'backgroundColor'), await own(B1, 'data-own-shape')], [theme.r, theme.pad, theme.bg, false], 'button shape off live ' + width);
    await t.redraw({settings: {...BASE, ...SHAPE}}); await frames(t.page);
    eq([await t.css(B1, 'borderTopLeftRadius'), await t.css(B1, 'paddingLeft'), await own(B1, 'data-own-shape')], ['30px', '41px', true], 'button shape redraw ' + width);
    await t.redraw({settings: BASE}); await frames(t.page);
    /* colour scheme live and redraw */
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq([await t.css('[data-slideshow-settings]', 'backgroundColor'), await t.css(H, 'color')], ['rgb(250, 250, 250)', 'rgb(16, 16, 16)'], 'scheme live');
    await t.redraw({settings: {...BASE, color_scheme: 'alt-scheme'}}); await frames(t.page);
    eq([await t.css('[data-slideshow-settings]', 'backgroundColor'), await t.css(H, 'color')], ['rgb(250, 250, 250)', 'rgb(16, 16, 16)'], 'scheme redraw');
    if (width === 1366) {
      /* hover colours: section custom buttons, a slide's own buttons, custom arrows */
      const hov = async (sel, prop) => { await t.page.mouse.move(1, 1); await t.page.waitForTimeout(40); const box = await t.page.locator('#shopify-section-test ' + sel).first().boundingBox(); await t.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await t.page.waitForTimeout(120); const v = await t.css(sel, prop); await t.page.mouse.move(1, 1); return v; };
      await t.emit({btn_custom_enable: true, btn_first_bg_hover: '#010203', btn_first_text_hover: '#040506', btn_second_bg_hover: '#070809', btn_second_text_hover: '#0a0b0c', arrow_style: 'custom', arrow_hover_bg: '#0d0e0f', arrow_hover_icon_color: '#101112', arrow_visibility: 'always'}); await frames(t.page);
      eq([await hov(B1, 'backgroundColor'), await hov(B1, 'color'), await hov(P + '[data-button-role="secondary"]', 'backgroundColor'), await hov(P + '[data-button-role="secondary"]', 'color'), await hov('.swiper-button-next', 'backgroundColor'), await hov('.swiper-button-next', 'color')],
        ['rgb(1, 2, 3)', 'rgb(4, 5, 6)', 'rgb(7, 8, 9)', 'rgb(10, 11, 12)', 'rgb(13, 14, 15)', 'rgb(16, 17, 18)'], 'hover colours live');
      await t.emit({enable_custom_colors: true, first_button_hover_bg: '#131415', first_button_hover_color: '#161718', second_button_hover_bg: '#191a1b', second_button_hover_color: '#1c1d1e'}, bid); await frames(t.page);
      eq([await hov(B1, 'backgroundColor'), await hov(B1, 'color'), await hov(P + '[data-button-role="secondary"]', 'backgroundColor'), await hov(P + '[data-button-role="secondary"]', 'color')], ['rgb(19, 20, 21)', 'rgb(22, 23, 24)', 'rgb(25, 26, 27)', 'rgb(28, 29, 30)'], 'slide hover colours live');
      await t.redraw({settings: {...BASE, btn_custom_enable: true, btn_first_bg_hover: '#010203', arrow_style: 'custom', arrow_hover_bg: '#0d0e0f', arrow_visibility: 'always'}, blocks: blocksWith({enable_custom_colors: true, second_button_hover_bg: '#191a1b'})}); await frames(t.page);
      eq([await hov(B1, 'backgroundColor'), await hov(P + '[data-button-role="secondary"]', 'backgroundColor'), await hov('.swiper-button-next', 'backgroundColor')], ['rgb(1, 2, 3)', 'rgb(25, 26, 27)', 'rgb(13, 14, 15)'], 'hover colours after a redraw');
      await t.redraw({settings: BASE, blocks: blocksWith({})}); await frames(t.page);
    }
    ok(await t.noOverflow(), 'no sideways scroll ' + width);
    eq(t.errors, [], 'no errors');
    await t.page.close();
  }
  /* a solid second button takes the section's second button colour */
  const sb = await mount(browser, 'slideshow', {width: 1366, assets: A, theme: {btn_secondary_style: 'solid'}, settings: {...BASE, btn_custom_enable: true, btn_second_bg: '#ab12cd'}, blocks: BLOCKS()});
  eq(await sb.css('[data-first-slide] [data-button-role="secondary"]', 'backgroundColor'), 'rgb(171, 18, 205)', 'second button colour');
  await sb.emit({btn_second_bg: '#12ab34'}); await frames(sb.page);
  eq(await sb.css('[data-first-slide] [data-button-role="secondary"]', 'backgroundColor'), 'rgb(18, 171, 52)', 'second button colour live');
  await sb.page.close();
  /* both priorities off: still the theme */
  const t = await mount(browser, 'slideshow', {width: 1366, assets: A, settings: BASE, blocks: BLOCKS(), priority: 'off'});
  eq([await t.css('[data-first-slide] .sec__content-heading', 'fontFamily'), await t.css('[data-first-slide] .sec__content-des', 'fontFamily'), await t.css('[data-first-slide] [data-button-role="primary"]', 'backgroundColor')], ['Georgia', 'Arial', 'rgb(18, 52, 86)'], 'priority off');
  await t.page.close();
}

async function firstPaint(browser) {
  const PROPS = ['fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'marginBottom', 'textAlign', 'maxWidth', 'paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'backgroundColor', 'justifyContent', 'alignItems'];
  const SEL = ['.sec__content-subheading', '.sec__content-heading', '.sec__content-des', '.sec__content-des p', '.sec__content-inner', '.sec__content', '[data-button-role="primary"]', '[data-button-role="secondary"]', '.sec__content-btn'];
  const cases = [{settings: BASE, blocks: BLOCKS()}, {settings: {...BASE, heading_uppercase: true, subheading_font_weight: 'heading_weight', heading_font_weight: 'body_weight', heading_font_size_mobile: 0, btn_custom_enable: true, btn_radius_override: 20},
    blocks: [{type: 'slider_item', settings: {...SLIDE1, enable_custom_fonts: true, heading_font: FONT, subheading_font: MONO, description_font: MONO, enable_custom_font_weights: true, heading_weight: '300', enable_custom_colors: true, heading_color: '#ff0000', first_button_bg: '#00ff00', content_position: 'top-left', content_position_mobile: 'bottom-right', content_alignment: 'right', content_alignment_mobile: 'left', content_max_width: 60, show_content_background: true, content_background: '#00ffff', content_box_opacity: 50}}, BLOCKS()[1]]}];
  for (const c of cases) for (const width of [375, 1366]) for (const editing of [true, false]) {
    const snap = async assets => {
      const t = await mount(browser, 'slideshow', {width, editing, assets: ['swiper-bundle.min.css', 'banner.css', 'slideshow.css', ...assets], ...c});
      await t.page.addStyleTag({content: '.sec__content-inner{visibility:visible!important}'}); await t.page.waitForTimeout(150);
      const r = await t.page.evaluate(([SEL, PROPS]) => Object.fromEntries(SEL.map(s => { const el = document.querySelector('[data-first-slide] ' + s); return [s, el && Object.fromEntries(PROPS.map(p => [p, getComputedStyle(el)[p]]))]; })), [SEL, PROPS]);
      await t.page.close(); return r;
    };
    eq(await snap([]), await snap(['slideshow-live.js', 'slideshow-pointer.js', 'live-blog-slideshow.js']), 'first paint equals hydrated ' + width + (editing ? ' editor' : ' storefront'));
  }
}

async function motion(browser) {
  /* Image effects: each one draws the picture differently (at rest, on hover, while scrolled, or as a slide enters). */
  const {schema} = schemaOf('slideshow');
  const fx = schema.settings.find(x => x.id === 'image_effect').options.map(o => o.value);
  const look = {};
  for (const e of fx) {
    const t = await mount(browser, 'slideshow', {width: 1366, editing: false, assets: A, settings: {...BASE, image_effect: e}, blocks: BLOCKS()});
    await t.page.waitForTimeout(250);
    const pic = sel => t.page.evaluate(sel => { const i = document.querySelector(sel); const a = getComputedStyle(i.closest('.banner__media'), '::after'); const c = getComputedStyle(i); return [c.transform, c.filter, c.animationName, c.transitionDuration, a.backgroundImage, a.animationName].join('|'); }, sel);
    const rest = await pic('[data-first-slide] .banner__media img');
    await t.page.mouse.move(300, 300); await t.page.mouse.move(1000, 250, {steps: 4}); await t.page.waitForTimeout(700);
    const hover = await pic('[data-first-slide] .banner__media img');
    await t.page.mouse.move(1, 899);
    await t.page.click('#shopify-section-test .swiper-button-next').catch(() => t.page.evaluate(() => document.querySelector('slide-section').globalSlide.slideNext()));
    await t.page.waitForTimeout(120);
    const enter = await t.page.evaluate(() => { const s = document.querySelector('slide-section'), sw = s.globalSlide, i = sw.slides[sw.activeIndex].querySelector('.banner__media img'); const c = getComputedStyle(i); return [c.animationName, c.clipPath === 'none' ? '' : 'clip'].join('|'); });
    look[e] = rest + ' || ' + hover + ' || ' + enter;
    eq(t.errors, [], e);
    await t.page.close();
  }
  for (const a of fx) for (const b of fx) if (a < b) ok(look[a] !== look[b], 'image effects ' + a + ' and ' + b + ' look different');
  /* Slide changes: the arriving slide moves differently in each. The slider runs slide or fade; the section draws the
     rest on each slide's .sec__inner (data-ss-change), so the picture inside the slide is measured too. */
  const changes = schema.settings.find(x => x.id === 'slide_effect').options.map(o => o.value), mid = {};
  for (const e of changes) {
    const t = await mount(browser, 'slideshow', {width: 1366, editing: false, assets: A, settings: {...BASE, slide_effect: e}, blocks: BLOCKS()});
    await t.page.waitForTimeout(250);
    mid[e] = await t.page.evaluate(() => new Promise(res => { const s = document.querySelector('slide-section'), sw = s.globalSlide; sw.params.speed = 1200; sw.slideNext(1200); setTimeout(() => { const out = sw.slides.map(sl => { const c = getComputedStyle(sl), n = sl.querySelector('.sec__inner'), ci = n ? getComputedStyle(n) : {}; return [c.transform.replace(/(\d+\.\d)\d+/g, '$1'), (+c.opacity).toFixed(1), String(ci.transform).replace(/(\d+\.\d)\d+/g, '$1'), ci.clipPath, (+ci.opacity).toFixed(1)].join(); }).join(';'); res(sw.params.effect + '#' + out + '#' + getComputedStyle(sw.wrapperEl).transform.replace(/(\d+\.\d)\d+/g, '$1')); }, 420); }));
    eq(t.errors, [], e);
    await t.page.close();
  }
  for (const a of changes) for (const b of changes) if (a < b) ok(mid[a] !== mid[b], 'slide changes ' + a + ' and ' + b + ' look different: ' + mid[a]);
  /* Text entrances. */
  const ent = schema.blocks[0].settings.find(x => x.id === 'slider_effect').options.map(o => o.value), seen = {};
  for (const e of ent) {
    const t = await mount(browser, 'slideshow', {width: 1366, editing: false, assets: A, settings: BASE, blocks: [BLOCKS()[0], {type: 'slider_item', settings: {heading: 'Second slide', slider_effect: e}}]});
    await t.page.waitForTimeout(250);
    seen[e] = await t.page.evaluate(() => new Promise(res => { const sw = document.querySelector('slide-section').globalSlide; sw.slideNext(); setTimeout(() => { const el = sw.slides[sw.activeIndex].querySelector('.sec__content-heading').parentElement; const c = getComputedStyle(el); res(c.animationName + '|' + getComputedStyle(el.parentElement).animationName); }, 80); }));
    await t.page.close();
  }
  for (const a of ent) for (const b of ent) if (a < b) ok(seen[a] !== seen[b], 'entrances ' + a + ' and ' + b + ' differ: ' + seen[a]);
  /* Autoplay per instance: in view it runs, off screen it waits, the other instance keeps its own; reduced motion: none. */
  const two = await mount(browser, 'slideshow', {width: 1366, height: 700, editing: false, assets: A, instances: [{uid: 'a', settings: {...BASE, autoplay: true, autorotate_speed: 2}, blocks: BLOCKS()}, {uid: 'b', settings: {...BASE, autoplay: false, slide_effect: 'fade'}, blocks: BLOCKS()}]});
  await two.page.mouse.move(1, 699); await two.page.waitForTimeout(400);
  const run = uid => two.page.evaluate(uid => { const sw = document.querySelector('#shopify-section-' + uid + ' slide-section').globalSlide; return {running: !!sw.autoplay.running, effect: sw.params.effect}; }, uid);
  eq([await run('a'), await run('b')], [{running: true, effect: 'slide'}, {running: false, effect: 'fade'}], 'two instances keep their own autoplay and effect');
  await two.page.evaluate(() => document.getElementById('shopify-section-b').scrollIntoView()); await two.page.waitForTimeout(400);
  eq((await run('a')).running, false, 'off screen: autoplay waits');
  await two.page.evaluate(() => scrollTo(0, 0)); await two.page.waitForTimeout(400);
  eq((await run('a')).running, true, 'back on screen: runs');
  /* live: change effect, loop and autoplay of b only; a keeps its slider. The slider runs slide or fade; the section
     draws creative on top (data-ss-change), so Swiper's own effect is fade. */
  const aSwiper = await two.page.evaluateHandle(() => document.querySelector('#shopify-section-a slide-section').globalSlide);
  await two.emit({slide_effect: 'creative', autoplay: true, slide_loop: false}, undefined, 'b'); await frames(two.page); await two.page.waitForTimeout(100);
  eq(await two.page.evaluate(() => { const sw = document.querySelector('#shopify-section-b slide-section').globalSlide; return [sw.params.effect, !!sw.params.loop, !!sw.params.autoplay.enabled, document.querySelector('#b').classList.contains('creative'), document.querySelector('#b').getAttribute('data-ss-change')]; }), ['fade', false, true, true, 'creative'], 'live effect, loop and autoplay restart the slider');
  ok(await two.page.evaluate(sw => sw === document.querySelector('#shopify-section-a slide-section').globalSlide && !sw.destroyed, aSwiper), 'the other instance keeps its slider');
  await two.emit({heading: 'Only in b'}, two.blockId('slider_item', 0, 'b'), 'b'); await frames(two.page);
  eq([await two.css('[data-first-slide] .sec__content-heading', 'color', 'a'), await two.page.evaluate(() => [document.querySelector('#a [data-first-slide] .sec__content-heading').textContent.trim(), document.querySelector('#b [data-first-slide] .sec__content-heading').textContent.trim()])], ['rgb(255, 255, 255)', ['First slide', 'Only in b']], 'a slide edit stays in its instance');
  /* a redraw sets up once: one slider, one state */
  await two.redraw({uid: 'b'}); await two.redraw({uid: 'b'}); await frames(two.page);
  eq(await two.page.evaluate(() => [window.MateriaBlogSlideshow.slideshows.size, document.querySelector('#shopify-section-b slide-section').classList.contains('swiper-initialized')]), [2, true], 'redraw sets up once');
  /* an added slide is live */
  await two.redraw({uid: 'b', blocks: [...BLOCKS(), {type: 'slider_item', settings: {heading: 'Third slide'}}]}); await frames(two.page);
  const third = two.rendered.find(r => r.section.id === 'b').section.blocks[2].id;
  await two.emit({heading: 'Third edited', enable_custom_colors: true, heading_color: '#ee1122'}, third, 'b'); await frames(two.page);
  eq(await two.page.evaluate(id => { const h = document.querySelector('#b [data-slide-id="' + id + '"] .sec__content-heading'); return [h.textContent.trim(), getComputedStyle(h).color]; }, third), ['Third edited', 'rgb(238, 17, 34)'], 'added slide is live');
  eq(two.errors, [], 'no errors');
  await two.page.close();
  const rm = await mount(browser, 'slideshow', {width: 375, editing: false, reducedMotion: 'reduce', assets: A, settings: {...BASE, autoplay: true, autorotate_speed: 2, image_effect: 'ken_burns'}, blocks: BLOCKS()});
  await rm.page.waitForTimeout(400);
  eq(await rm.page.evaluate(() => { const sw = document.querySelector('slide-section').globalSlide, i = document.querySelector('[data-first-slide] .banner__media img'); return [!!sw.autoplay.running, sw.params.speed, getComputedStyle(i).animationName, getComputedStyle(document.querySelector('[data-first-slide] .sec__content-inner')).visibility]; }), [false, 0, 'none', 'visible'], 'reduced motion: no autoplay, no movement, words shown');
  eq(rm.errors, [], 'no errors');
  await rm.page.close();
}

/* The saved slideshows against HEAD. */
async function saved(browser) {
  let oldRaw, oldCss;
  try { oldRaw = execSync('git show ' + BEFORE + ':sections/slideshow.storelib', {cwd: ROOT, encoding: 'utf8'}); oldCss = execSync('git show ' + BEFORE + ':shopify/assets/slideshow.css', {cwd: ROOT, encoding: 'utf8'}); } catch (_) { console.log('  (no HEAD, saved comparison skipped)'); return; }
  const newRaw = fs.readFileSync(path.join(ROOT, 'sections/slideshow.storelib'), 'utf8'), controls = await themeControls();
  const oldLive = execSync('git show ' + BEFORE + ':shopify/assets/slideshow-live.js', {cwd: ROOT, encoding: 'utf8'});
  for (const [tpl, key] of [['home', 'slideshow-1793370382889'], ['contact', 'slideshow_Mzc3A8'], ['about', 'slideshow_CwBbLj']]) {
    const sec = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', tpl + '.json'), 'utf8')).sections[key];
    if (!sec) continue; /* removed from the page in the builder since */
    const fill = raw => { const s = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify, d = l => Object.fromEntries((l || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
      return {id: 'S', settings: {...d(s.settings), ...sec.settings}, blocks: sec.block_order.map(k => ({id: k, type: sec.blocks[k].type, settings: {...d(s.blocks[0].settings), ...sec.blocks[k].settings}}))}; };
    const html = async raw => { const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v?.url || v || ''); const ctx = {section: fill(raw), settings: {scroll_animation: 'none'}, request: {design_mode: false}};
      return (await e.parseAndRender(raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, ''), ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, ''); };
    for (const width of [375, 1366]) {
      const look = async (h, css, live, shot) => {
        const page = await browser.newPage({viewport: {width, height: 900}});
        await page.route('**/*', r => r.request().url() === 'http://theme.test/' ? r.fulfill({body: '<!doctype html><html><head></head><body></body></html>', contentType: 'text/html'}) : r.fulfill({body: ''}));
        await page.goto('http://theme.test/');
        await page.addStyleTag({content: controls}); await page.addStyleTag({content: THEME_VARS});
        for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css', 'swiper-bundle.min.css', 'banner.css']) await page.addStyleTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8')});
        await page.addStyleTag({content: css});
        await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, h);
        for (const f of ['hero-image-one.js', 'swiper-bundle.min.js', 'motion.min.js', 'global.js', 'slideshow-pointer.js']) await page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8')});
        for (const j of live) await page.addScriptTag({content: j});
        await page.waitForTimeout(500);
        const r = await sig(page, 'S');
        /* hover paint, read on the button itself (the old file named the theme's hover colours as variables, the new one leaves them to the theme) */
        const b1 = page.locator('#shopify-section-S [data-first-slide] [data-button-role="primary"]');
        if (await b1.count()) { await b1.hover({force: true}).catch(() => {}); await page.waitForTimeout(80); r.hover = await b1.evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]); }
        for (const k of ['b1', 'b2']) if (r[k]) { delete r[k]['--mb-hover-bg']; delete r[k]['--mb-hover-text']; }
        if (shot) await page.screenshot({path: shot}).catch(() => {});
        await page.close(); return r;
      };
      const shots = process.env.SHOTS ? process.env.SHOTS + '/ss-' + tpl + '-' + width : '';
      const before = await look(await html(oldRaw), oldCss, [oldLive], shots && shots + '-old.png');
      const after = await look(await html(newRaw), fs.readFileSync(path.join(ROOT, 'shopify/assets/slideshow.css'), 'utf8'), ['slideshow-live.js', 'live-blog-slideshow.js'].map(f => fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8')), shots && shots + '-new.png');
      const d = diff(before, after);
      eq(d, [], 'saved ' + tpl + ' at ' + width + ' looks as it did');
    }
  }
}

(async () => {
  const s = schemaOf('slideshow').schema;
  eq(schemaProblems('slideshow'), [], 'schema problems');
  let head = null; try { head = JSON.parse(execSync('git show ' + BEFORE + ':sections/slideshow.storelib', {cwd: ROOT, encoding: 'utf8'}).split('<schema>')[1].split('</schema>')[0]).shopify; } catch (_) {}
  if (head) { const ids = l => l.filter(x => x.id).map(x => x.id); for (const id of ids(head.settings)) ok(ids(s.settings).includes(id), 'kept ' + id); for (const id of ids(head.blocks[0].settings)) ok(ids(s.blocks[0].settings).includes(id), 'kept block ' + id); }
  const heads = s.settings.filter(x => x.type === 'header').map(x => x.content);
  eq(heads, ['General', 'Layout', 'Media', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'], 'section groups in the shared order');
  const bheads = s.blocks[0].settings.filter(x => x.type === 'header').map(x => x.content);
  eq(bheads.slice(0, 3), ['Content', 'Media', 'Layout'], 'slide content first');
  const all = JSON.stringify(s);
  ok(!/1,250\+|Money-Back|Free shipping worldwide|—/.test(all), 'no invented claims or em dashes in the schema');
  const browser = await launch();
  try {
    if (!only.length || only.includes('theme')) await themeFirst(browser);
    if (!only.length || only.includes('paint')) await firstPaint(browser);
    if (!only.length || only.includes('motion')) await motion(browser);
    if (!only.length || only.includes('saved')) await saved(browser);
    if (!only.length || !['theme', 'paint', 'motion', 'saved'].includes(only[0])) await controls(browser);
  } finally { await browser.close(); }
  console.log(checks + ' slideshow round 5 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
