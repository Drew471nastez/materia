/* Run: node tests/theme-header-menus.cjs
   Header menus: the phone drawer (hamburger), its drill-down levels, the
   desktop dropdowns from the keyboard, the bottom navigation bar's tap state
   and the sticky header. Chromium fixtures load the repository's own code:
   the hamburger from snippets/toggle-menu, shopify/assets/navigation.css,
   the menu part of shopify/assets/theme.js, the sticky controller snippet and
   the bottom bar's section CSS. The drawer markup copies the shape
   snippets/horizontal-menu draws. They do not replace Storelib's renderer. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const between = (src, start, end) => {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a);
  assert(a >= 0 && b > a, `markers ${start.slice(0, 40)} / ${end.slice(0, 40)}`);
  return src.slice(a, b + end.length);
};
const stripLiquid = s => s.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '').replace(/\{%[\s\S]*?%\}/g, '');

const theme = read('shopify/assets/theme.js');
// motionAnimate fallback, HoverIntent, MateriaMenu, BlsMainMenuShopify and the
// redraw handlers; then the drawer's custom elements.
const motion = between(theme, 'function motionAnimate', '\n}\n');
const menu = between(theme, 'function HoverIntent', 'var BlsSearchShopify');
const elements = between(theme, 'class OpenChildrenToggle extends HTMLElement', 'customElements.define("back-menu", BackMenu);');
const menuJs = `var root=document.body;var getScrollBarWidth={init:()=>0};${motion}\n${menu.replace(/var BlsSearchShopify$/, '')}\n${elements}`;

const toggleSnippet = read('snippets/toggle-menu.storelib');
const toggleHtml = stripLiquid(between(toggleSnippet, '<button', '</button>')).replace(/\{\{[^}]*\}\}/g, 'Menu');
const sticky = read('snippets/header-sticky-controller.storelib');
// The controller's rules are the cached header-sticky.css it links.
const stickyCss = read('shopify/assets/header-sticky.css');
// The controller's inline script, then the part it loads deferred (overlay fade, Back button, phone menu layer).
const stickyJs = stripLiquid(sticky.match(/<script>([\s\S]*?)<\/script>/)[1]) + '\n' + read('shopify/assets/header-sticky-extras.js');
// The bar's CSS lives in the cached file the section loads.
const mnb = read('shopify/assets/mobile-navigation-bar.css');
const mnbCss = mnb.slice(mnb.indexOf('/* Tap feedback without a grey box'), mnb.indexOf('.mobile-navigation-bar .h-count')).replace(/\{\{\s*section\.id\s*\}\}/g, 'mnb');

const level = (name, kids) => `
  <li class="level0 menu-parent menu-parent__horizontal dropdown-menu">
    <menu-item class="relative flex justify-between align-center px-15">
      <a class="no-underline py-10 relative inline-flex min-h-55 z-1 align-center" href="/collections/${name.toLowerCase()}"><span>${name}</span>
        <open-children-toggle class="inline-flex flex-end align-center ms-5 absolute inset-0"><svg width="10" height="6"></svg></open-children-toggle>
      </a>
      <open-children-toggle class="inline-flex flex-end align-center pointer ms-5 absolute inset-0"><svg width="6" height="11"></svg></open-children-toggle>
    </menu-item>
    <div class="submenu submenu-horizontal absolute">
      <div class="hidden-1025 mm-sub-title-bar grey-bg px-30 flex gap-15 align-center justify-between">
        <back-menu class="py-10 min-h-55 inline-flex gap-20 align-center" role="link"><svg width="6" height="11"></svg>${name}</back-menu>
        <close-menu aria-label="Close" class="close-menu lh-1 ms-10"><svg width="13" height="13"></svg></close-menu>
      </div>
      <ul class="subchildmenu list-unstyled px-30">
        ${kids.map(k => `<li class="menu-link level-1"><menu-item class="relative flex"><a class="menu_item-link no-underline py-10 min-h-55 inline-flex" href="/collections/${k.toLowerCase()}">${k}</a></menu-item></li>`).join('')}
      </ul>
    </div>
  </li>`;
const nav = cls => `
  <nav class="flex flex-column ${cls} block-1025 navigation horizontal fixed inset-0 soft-slide" data-action-mobile="false">
    ${cls === 'mobile' ? '<close-menu aria-label="Close" class="close-menu pointer absolute top-0 w-55 h-55 inline-flex hidden-1025 content-center right-7"><svg width="13" height="13"></svg></close-menu><div class="menu-mobile-title min-h-55 flex align-center px-30 hidden-1025">Menu</div>' : ''}
    <div class="navigation__menu-content word-break">
      <ul class="horizontal-list list-unstyled inline-flex-1025 horizontal px-30">
        <li class="level0 single"><menu-item class="relative flex px-15"><a class="no-underline py-10 min-h-55 inline-flex" href="/">Home</a></menu-item></li>
        ${level('Shop', ['Prints', 'Frames'])}
        ${level('Journal', ['Stories'])}
      </ul>
    </div>
  </nav>`;
const headerInner = () => `
  <header class="header relative section" data-section-id="header" data-sticky="on-scroll-up" data-sticky-mobile="true">
    <div class="header__inner" id="header-sticky">
      <header-inner class="header-middle">
        <div class="header__logo"><a href="/" class="logo">Materia</a></div>
        <div class="header__menu">
          ${toggleHtml}
          ${nav('desktop')}
          ${nav('mobile')}
        </div>
        <div class="header__action flex"><a class="header-icon" href="/search" aria-label="Search">S</a></div>
      </header-inner>
    </div>
  </header>`;
const base = `
  :root{--color-background:#fff;--color-heading:#111;--color-link-hover:#c00;--overlay-bg:rgba(0,0,0,.4);--transition-popup:transform .45s cubic-bezier(.7,0,.2,1)}
  body{margin:0;font:16px/1.4 sans-serif} main{height:3000px}
  .flex{display:flex}.inline-flex{display:inline-flex}.flex-column{flex-direction:column}.relative{position:relative}.absolute{position:absolute}.fixed{position:fixed}
  .inset-0{inset:0}.w-44{width:44px}.h-44{height:44px}.w-55{width:55px}.h-55{height:55px}.min-h-55{min-height:55px}.z-1{z-index:1}.top-0{top:0}.right-7{right:7px}
  .list-unstyled{list-style:none;margin:0;padding:0}.px-30{padding-inline:30px}.px-15{padding-inline:15px}.no-underline{text-decoration:none}
  .header-middle{display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 12px}
  .header{background:#fff}.navigation.mobile{background:#fff}
  .submenu{background:#fff}
  @media (max-width:1024.98px){.navigation.desktop{display:none!important}.block-1025.mobile{display:flex}}
  @media (min-width:1025px){.hidden-1025{display:none!important}.navigation.mobile{display:none!important}.navigation.desktop{position:static;display:block}
    .inline-flex-1025{display:inline-flex}.horizontal-list>li{position:relative}.submenu{top:100%;left:0;min-width:200px}
    .menu-parent .submenu{opacity:0;visibility:hidden}.menu-parent.visible .submenu{opacity:1;visibility:visible}}
`;
const page = () => `<!doctype html><html class="js"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${base}</style><style>${read('shopify/assets/navigation.css')}</style><style>${stickyCss}</style><style>${read('shopify/assets/materia-experience.css')}</style><style>${mnbCss}</style></head>
<body><div id="shopify-section-header" class="shopify-section section-header">${headerInner()}</div>
<main><button id="outside">Outside</button></main>
<div id="shopify-section-mnb" class="shopify-section"><mobile-navigation-bar class="mobile-navigation-bar flex fixed" style="--mnb-fg:#222;--mnb-active:rgb(200, 30, 30);bottom:0;left:0;right:0;height:62px;background:#fff">
<a id="tab-shop" class="no-underline inline-flex" href="/collections/all" style="width:80px;height:56px"><svg width="22" height="22"><rect width="22" height="22"/></svg><span class="mnb-label">Shop</span></a>
<a id="tab-cart" class="no-underline inline-flex" href="/cart" style="width:80px;height:56px"><svg width="22" height="22"><rect width="22" height="22"/></svg><span class="mnb-label">Cart</span></a>
</mobile-navigation-bar></div>
<script>${stickyJs}</script></body></html>`;

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  let checks = 0;
  const ok = (cond, msg) => { assert(cond, msg); checks++; };
  try {
    const context = await browser.newContext({viewport: {width: 375, height: 812}, hasTouch: true, isMobile: true});
    const p = await context.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.route('https://fixture.test/**', r => r.fulfill({contentType: 'text/html', body: page()}));
    await p.goto('https://fixture.test/');
    await p.addScriptTag({content: menuJs + '\ntry{BlsMainMenuShopify.init()}catch(e){console.error(e)}'});
    await p.addScriptTag({content: read('shopify/assets/materia-experience.js')});

    const state = () => p.evaluate(() => {
      const nav = document.querySelector('.navigation.mobile');
      const t = document.querySelector('.nav-toggle');
      return {
        open: document.documentElement.classList.contains('nav-open'),
        drawer: document.documentElement.classList.contains('open-drawer'),
        expanded: t.getAttribute('aria-expanded'),
        toggleOpen: t.classList.contains('open'),
        x: Math.round(nav.getBoundingClientRect().x),
        top: nav.matches(':popover-open'),
      };
    });
    const tapAt = async sel => {
      const box = await p.locator(sel).first().boundingBox();
      await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    };
    const settle = () => p.waitForTimeout(720);
    const openAndClose = async label => {
      await tapAt('.nav-toggle');
      await settle();
      let s = await state();
      ok(s.open && s.drawer && s.expanded === 'true' && s.toggleOpen && s.x === 0 && s.top, `${label}: one tap opens the drawer ${JSON.stringify(s)}`);
      await tapAt('.navigation.mobile > close-menu');
      await settle();
      s = await state();
      ok(!s.open && !s.drawer && s.expanded === 'false' && !s.toggleOpen && s.x < -300, `${label}: close shuts it and unlocks ${JSON.stringify(s)}`);
      ok(await p.evaluate(() => !document.body.style.paddingRight && !document.querySelector('menu-item.is-open')), `${label}: no lock or open level left`);
    };

    // The hamburger is a real button with its state.
    ok(await p.evaluate(() => { const t = document.querySelector('.nav-toggle'); return t.tagName === 'BUTTON' && t.type === 'button' && t.getAttribute('aria-label') === 'Menu'; }), 'hamburger is a labelled button');
    const tb = await p.locator('.nav-toggle').boundingBox();
    ok(tb.width >= 43.5 && tb.height >= 43.5, 'hamburger is a 44px target '+JSON.stringify(tb));
    ok(await p.$eval('.nav-toggle', el => getComputedStyle(el).webkitTapHighlightColor) === 'rgba(0, 0, 0, 0)', 'hamburger has no tap highlight');
    ok(await p.$eval('.nav-toggle', el => getComputedStyle(el).backgroundColor) === 'rgba(0, 0, 0, 0)', 'hamburger has no button paint');

    for (let i = 0; i < 3; i++) await openAndClose(`round ${i + 1}`);

    // Init running again (as a redraw of another part does) must not bind the
    // hamburger twice: open then close in one tap was the "nothing happens".
    await p.evaluate(() => { BlsMainMenuShopify.init(); BlsMainMenuShopify.init(); });
    await openAndClose('after init ran three times');

    // The builder redraws the header: the wrapper, then the <header> itself,
    // fires storelib:section-load; and a redraw with no event at all.
    const redraw = how => p.evaluate(how => {
      const s = document.getElementById('shopify-section-header');
      s.innerHTML = s.innerHTML.replace(/ popover="manual"/g, '');
      const target = how === 'wrapper' ? s : how === 'header' ? s.querySelector('header') : how === 'inner' ? s.querySelector('.header__menu') : null;
      target?.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 'header'}}));
    }, how);
    for (const how of ['wrapper', 'header', 'inner', 'none']) {
      await redraw(how);
      await p.waitForTimeout(80);
      await openAndClose(`redraw (${how})`);
    }

    // Redrawn while open: closed and unlocked, and the next tap opens it.
    await tapAt('.nav-toggle');
    await settle();
    await redraw('wrapper');
    await p.waitForTimeout(80);
    let s = await state();
    ok(!s.open && !s.drawer && s.expanded === 'false', `redraw while open closes cleanly ${JSON.stringify(s)}`);
    await p.waitForTimeout(700);
    await openAndClose('after a redraw while open');

    // Touch and click of the same tap (or an old listener) arrive together:
    // one toggle.
    await p.evaluate(() => { const t = document.querySelector('.nav-toggle'); t.click(); t.click(); });
    await settle();
    s = await state();
    ok(s.open && s.expanded === 'true', 'two activations of one tap toggle once');
    // Close then reopen at once: the delayed unlock of the close must not
    // strip the lock of the new open.
    await tapAt('.navigation.mobile > close-menu');
    await p.waitForTimeout(120);
    await p.evaluate(() => { document.querySelector('.nav-toggle').click(); });
    await p.waitForTimeout(900);
    s = await state();
    ok(s.open && s.drawer && s.x === 0, `reopen during the close keeps it open and locked ${JSON.stringify(s)}`);

    // Drill-down: tap a parent, its level slides in; back returns.
    const shop = '.navigation.mobile .horizontal-list > li.menu-parent:nth-child(2)';
    const url0 = p.url();
    await tapAt(`${shop} > menu-item > a`);
    await p.waitForTimeout(600);
    const levelState = () => p.evaluate(sel => {
      const li = document.querySelector(sel);
      const sub = li.querySelector('.submenu');
      return {open: li.querySelector('menu-item').classList.contains('is-open'), x: Math.round(sub.getBoundingClientRect().x), vis: getComputedStyle(sub).visibility, expanded: li.querySelector(':scope > menu-item > open-children-toggle').getAttribute('aria-expanded')};
    }, shop);
    let lv = await levelState();
    ok(lv.open && lv.x === 0 && lv.vis === 'visible' && lv.expanded === 'true', `tapping a parent opens its level ${JSON.stringify(lv)}`);
    ok(p.url() === url0, 'tapping a parent drills down instead of following the link');
    const subTransition = await p.$eval(`${shop} .submenu`, el => getComputedStyle(el).transitionProperty);
    ok(/transform/.test(subTransition) && !/\ball\b|left|width/.test(subTransition), `levels slide on transform (${subTransition})`);
    const backBox = await p.locator(`${shop} back-menu`).boundingBox();
    const closeBox = await p.locator(`${shop} .mm-sub-title-bar close-menu`).boundingBox();
    ok(backBox.height >= 43.5 && closeBox.width >= 43.5 && closeBox.height >= 43.5, 'back and close in a level are 44px targets');
    await tapAt(`${shop} back-menu`);
    await p.waitForTimeout(600);
    lv = await levelState();
    ok(!lv.open && lv.x >= 300 && lv.vis === 'hidden' && lv.expanded === 'false', `back closes the level and hides it from Tab ${JSON.stringify(lv)}`);

    // Keyboard: Enter on the arrow opens the level and focuses Back; Escape
    // closes the level (focus on the arrow), then the drawer (focus on the
    // hamburger).
    const arrow = `${shop} > menu-item > open-children-toggle`;
    ok(await p.$eval(arrow, el => el.getAttribute('role') === 'button' && el.tabIndex === 0 && el.getAttribute('aria-label') === 'Shop'), 'the level arrow is a labelled button');
    await p.focus(arrow);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(200);
    ok((await levelState()).open, 'Enter opens a level');
    ok(await p.evaluate(sel => document.activeElement === document.querySelector(sel + ' back-menu'), shop), 'focus moves to the level\'s Back');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(100);
    ok(!(await levelState()).open && (await state()).open, 'Escape closes the level first');
    ok(await p.evaluate(sel => document.activeElement === document.querySelector(sel), arrow), 'focus returns to the arrow');
    await p.keyboard.press('Escape');
    await settle();
    s = await state();
    ok(!s.open && s.expanded === 'false', 'second Escape closes the drawer');
    ok(await p.evaluate(() => document.activeElement === document.querySelector('.nav-toggle')), 'focus returns to the hamburger');
    await p.keyboard.press('Enter');
    await settle();
    ok((await state()).open, 'Enter on the hamburger opens the drawer');
    await p.keyboard.press('Escape');
    await settle();

    // Back and forward restore: start closed.
    await p.evaluate(() => document.querySelector('.nav-toggle').click());
    await settle();
    await p.evaluate(() => { const e = new PageTransitionEvent('pageshow', {persisted: true}); window.dispatchEvent(e); });
    await p.waitForTimeout(100);
    s = await state();
    ok(!s.open && !s.drawer && s.expanded === 'false' && !s.toggleOpen, 'a page restored from the back cache starts closed');
    // A link in the drawer that leaves the page closes it.
    await p.evaluate(() => document.querySelector('.nav-toggle').click());
    await settle();
    await p.evaluate(() => { document.addEventListener('click', e => e.preventDefault(), {once: true}); document.querySelector('.navigation.mobile .level0.single a').click(); });
    ok(!(await state()).open, 'following a link in the drawer closes it');
    ok(await p.evaluate(() => !document.documentElement.classList.contains('open-drawer') && !document.body.style.paddingRight), 'and unlocks the page');
    await settle();

    // The bottom bar: no grey box on press, the active colour instead, and a
    // ring for the keyboard.
    const cdp = await context.newCDPSession(p);
    const tb2 = await p.locator('#tab-shop').boundingBox();
    const tx = tb2.x + tb2.width / 2, ty = tb2.y + tb2.height / 2;
    await p.evaluate(() => document.getElementById('tab-shop').addEventListener('click', e => e.preventDefault()));
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: tx, y: ty}]});
    await p.waitForTimeout(260);
    const pressed = await p.$eval('#tab-shop', el => ({p: el.hasAttribute('data-nav-pressed'), bg: getComputedStyle(el).backgroundColor, c: getComputedStyle(el).color, hl: getComputedStyle(el).webkitTapHighlightColor}));
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    ok(pressed.p && pressed.bg === 'rgba(0, 0, 0, 0)', `a pressed tab has no grey background ${JSON.stringify(pressed)}`);
    ok(pressed.c === 'rgb(200, 30, 30)', 'a pressed tab takes the active colour');
    ok(pressed.hl === 'rgba(0, 0, 0, 0)', 'tabs have no tap highlight');
    await p.waitForTimeout(200);
    ok(await p.$eval('#tab-cart', el => getComputedStyle(el).backgroundColor) === 'rgba(0, 0, 0, 0)', 'a tab at rest has no background');
    await p.focus('#tab-cart');
    await p.keyboard.press('Shift+Tab');
    await p.keyboard.press('Tab');
    const ring = await p.$eval('#tab-cart', el => ({s: getComputedStyle(el).outlineStyle, c: getComputedStyle(el).outlineColor, bg: getComputedStyle(el).backgroundColor}));
    ok(ring.s === 'solid' && ring.c === 'rgb(200, 30, 30)' && ring.bg === 'rgba(0, 0, 0, 0)', `keyboard focus shows a ring, not a box ${JSON.stringify(ring)}`);

    // Sticky header: hides on a scroll down, returns on a scroll up.
    await p.evaluate(() => scrollTo(0, 900));
    await p.waitForTimeout(120);
    await p.evaluate(() => scrollTo(0, 1300));
    await p.waitForTimeout(120);
    ok(await p.$eval('#shopify-section-header', el => el.classList.contains('shopify-section-header-hidden')), 'header hides on scroll down');
    await p.evaluate(() => scrollTo(0, 1250));
    await p.waitForTimeout(120);
    ok(await p.$eval('#shopify-section-header', el => !el.classList.contains('shopify-section-header-hidden')), 'header returns on scroll up');
    await p.evaluate(() => scrollTo(0, 1252));
    await p.waitForTimeout(120);
    ok(await p.$eval('#shopify-section-header', el => !el.classList.contains('shopify-section-header-hidden')), 'a few pixels down do not hide it again (no jitter)');
    ok(/addEventListener\('scroll', schedule, \{passive: true\}\)/.test(stickyJs) && /requestAnimationFrame\(update\)/.test(stickyJs), 'scroll listener is passive and frame-throttled');
    ok(errors.length === 0, 'no page errors: ' + errors.join('; '));
    await context.close();

    // Desktop dropdowns from the keyboard.
    const desk = await browser.newContext({viewport: {width: 1280, height: 800}});
    const d = await desk.newPage();
    const derr = [];
    d.on('pageerror', e => derr.push(e.message));
    await d.route('https://fixture.test/**', r => r.fulfill({contentType: 'text/html', body: page()}));
    await d.goto('https://fixture.test/');
    await d.addScriptTag({content: menuJs + '\ntry{BlsMainMenuShopify.init()}catch(e){console.error(e)}'});
    const dshop = '.navigation.desktop .horizontal-list > li.menu-parent:nth-child(2)';
    await d.focus('.navigation.desktop .horizontal-list > li.single a');
    await d.keyboard.press('Tab');
    await d.waitForTimeout(80);
    ok(await d.$eval(dshop, li => li.classList.contains('visible') && li.querySelector(':scope > menu-item > a').getAttribute('aria-expanded') === 'true'), 'Tab onto a parent opens its dropdown, announced');
    await d.keyboard.press('Escape');
    await d.waitForTimeout(80);
    ok(await d.$eval(dshop, li => !li.classList.contains('visible') && document.activeElement === li.querySelector(':scope > menu-item > a') && li.querySelector(':scope > menu-item > a').getAttribute('aria-expanded') === 'false'), 'Escape closes it and keeps focus on its link');
    // Pointer: hover intent opens, moving into the dropdown keeps it open,
    // moving to the next parent swaps without both showing.
    await d.mouse.move(5, 400);
    const link = await d.locator(`${dshop} > menu-item > a`).boundingBox();
    await d.mouse.move(link.x + 10, link.y + link.height / 2, {steps: 4});
    await d.waitForTimeout(260);
    ok(await d.$eval(dshop, li => li.classList.contains('visible')), 'hover opens the dropdown');
    const sub = await d.locator(`${dshop} .submenu`).boundingBox();
    await d.mouse.move(sub.x + 20, sub.y + 20, {steps: 6});
    await d.waitForTimeout(260);
    ok(await d.$eval(dshop, li => li.classList.contains('visible')), 'moving into the dropdown keeps it open');
    await d.mouse.move(5, 700, {steps: 3});
    await d.waitForTimeout(400);
    ok(await d.$eval(dshop, li => !li.classList.contains('visible')), 'leaving closes it after the exit delay');
    ok(derr.length === 0, 'no desktop page errors: ' + derr.join('; '));
    await desk.close();
    console.log(`${checks} header menu, drawer, drill-down, bottom bar and sticky checks passed`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
