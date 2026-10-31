/* Run: node tests/theme-consent-bubbles.cjs
   Cookies and consent (snippets/content-bottom, cookie-consent.js/.css) and the
   header count bubbles (sections/theme-header, snippets/theme-live). Chromium
   fixtures copy what the Liquid draws; they do not replace Storelib's renderer. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
  let passed=0;
  const schema=JSON.parse(read('shopify/config/settings_schema.json'));
  const values=JSON.parse(read('config/settings.json')).shopify;
  const group=name=>schema.find(g=>g.name===name).settings;
  const ids=schema.flatMap(g=>(g.settings||[]).map(s=>s.id).filter(Boolean));
  assert.equal(new Set(ids).size,ids.length,'theme setting ids are unique');
  const cookie=group('Cookies & consent');
  for(const id of ['enable_cookies','cookie_style','heading_cookies','content_cookies','label_allow','label_refuse','cookie_custom_styling','cookie_bg_color','cookie_text_color','cookie_heading_color','cookie_btn_bg','cookie_btn_text','cookie_btn2_text','cookie_btn_radius',
    'cookie_show_in_builder','cookie_position','cookie_modal_backdrop','cookie_require_choice','cookie_mobile_layout','cookie_above_mobile_nav','cookie_animation','cookie_show_decline','cookie_link_label','cookie_link_url','cookie_show_close','cookie_delay','cookie_expiry_days','cookie_pages','cookie_frequency','cookie_color_scheme'])
    assert(cookie.some(s=>s.id===id),'cookie setting '+id);
  assert.deepEqual(cookie.find(s=>s.id==='cookie_position').options.map(o=>o.value),['bottom_center','bottom_bar','bottom_left','bottom_right','modal','top_bar']);
  assert.equal(cookie.find(s=>s.id==='cookie_color_scheme').type,'color_scheme');
  const bubble=group('Count bubble');
  for(const id of ['bubble_bg','bubble_text','bubble_size','bubble_font_size','bubble_font_weight','bubble_shape','bubble_border_width','bubble_border_color','bubble_offset_x','bubble_offset_y','bubble_animation']) assert(bubble.some(s=>s.id===id),'bubble setting '+id);
  for(const [g,p] of [['Cart Drawer','cart'],['Wishlist','wishlist']]) {
    const list=group(g);
    assert(list.some(s=>s.id===p+'_bubble_custom'));
    // Theme settings do not apply visible_if in Storelib: every setting shows.
    for(const id of [p+'_bubble_bg',p+'_bubble_color']) assert(list.some(s=>s.id===id)&&!('visible_if' in list.find(s=>s.id===id)),id);
  }
  for(const s of [...cookie,...bubble]) if(s.id&&s.default!==undefined) assert(s.id in values||['enable_cookies','cookie_style','heading_cookies','content_cookies','label_allow','label_refuse','cookie_custom_styling','cookie_bg_color','cookie_text_color','cookie_heading_color','cookie_btn_bg','cookie_btn_text','cookie_btn2_text','cookie_btn_radius'].includes(s.id),'value written for '+s.id);
  assert.equal(values.wishlist_bubble_bg,'#282828','existing wishlist colour kept');passed++;

  // Markup: theme buttons, never in the builder unless asked, no inline handlers.
  const bottom=read('snippets/content-bottom.storelib');
  const cc=bottom.slice(bottom.indexOf('<cookie-consent'),bottom.indexOf('</cookie-consent>'));
  assert.match(cc,/class="cookie-consent__btn btn-primary"\s+data-theme-button="primary"/);
  assert.match(cc,/class="cookie-consent__btn btn-outline"\s+data-theme-button="secondary"/);
  assert(!/\son[a-z]+=/.test(cc),'no inline handlers');
  assert.match(bottom,/data-preview="\{% if ck_design and theme_st\.cookie_show_in_builder %\}true/);
  assert.match(bottom,/'cookie-consent\.js' \| asset_url/);
  const theme=read('shopify/assets/theme.js');
  assert(!/<cookie-consent|cookie-consent/.test(theme),'theme.js has no hold on the new element');passed++;

  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const consentJs=read('shopify/assets/cookie-consent.js');
    const consentCss=read('shopify/assets/cookie-consent.css');
    const contract=read('shopify/assets/theme-button-contract.css');
    const experience=read('shopify/assets/materia-experience.js');
    const banner=(a={})=>{
      const d={enabled:'true','page-ok':'true',design:'false',preview:'false',position:'bottom_center',look:'bar-center',animation:'slide',mobile:'sheet',backdrop:'true',require:'false','above-nav':'true',delay:'0',expiry:'180',frequency:'every_page',...a};
      const close=a.close?'':' hidden';
      return `<cookie-consent class="cookie-consent" hidden ${Object.entries(d).map(([k,v])=>`data-${k}="${v}"`).join(' ')}>
        <div class="cookie-consent__backdrop" data-consent-backdrop></div>
        <div class="cookie-consent__panel" role="${d.position==='modal'?'dialog':'region'}" aria-labelledby="CookieConsentHeading" tabindex="-1" data-consent-panel>
          <div class="cookie-consent__copy"><h2 class="cookie-consent__heading" id="CookieConsentHeading" data-consent-heading>Cookies</h2>
            <div class="cookie-consent__message"><div data-consent-message><p>We use cookies for the cart and to see which pages are read.</p></div><a class="cookie-consent__link" data-consent-link href="/policies/privacy-policy">Cookie policy</a></div></div>
          <div class="cookie-consent__actions">
            <button type="button" class="cookie-consent__btn btn-outline" data-theme-button="secondary" data-sl-button data-consent="decline">Decline</button>
            <button type="button" class="cookie-consent__btn btn-primary" data-theme-button="primary" data-sl-button data-consent="accept">Accept</button>
          </div>
          <button type="button" class="cookie-consent__close" data-consent="close" aria-label="Close"${close}>x</button>
        </div></cookie-consent>`;
    };
    // A real origin, so storage works (about:blank has none).
    let doc='';
    await page.route('http://materia.test/**',route=>route.fulfill({contentType:'text/html',body:doc}));
    const load=async(html,{scripts=true,before='',keep=false}={})=>{
      doc=`<!doctype html><html><head><style>:root{--color-background:#fafafa;--color-text:#222;--color-heading:#111;--btn-primary-bg-color:#123456;--btn-primary-color:#fff;--btn-primary-hover-bg-color:#c00000;--btn-primary-hover-color:#fff;--btn-secondary-bg-color:#fff;--btn-secondary-color:#222;--btn-secondary-border-color:#222;--btn-radius:3px;--btn-font-size:15px}.color-dark{--color-background:#101820;--color-text:#eeeeee;--color-heading:#ffffff}</style><body data-btn-style="solid" data-btn-secondary-style="outline" data-btn-hover="fade"><button id="outside">Outside</button>${html}</body></html>`;
      await page.goto('http://materia.test/');
      if(!keep) await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
      await page.addStyleTag({content:contract});
      await page.addStyleTag({content:consentCss});
      if(before) await page.evaluate(before);
      if(scripts){await page.addScriptTag({content:experience});await page.addScriptTag({content:consentJs});}
    };
    const visible=()=>page.$eval('cookie-consent',el=>!el.hidden&&el.hasAttribute('data-open'));

    // Shows, theme buttons follow Theme settings > Buttons, choice stored with expiry and announced.
    await load(banner());
    await page.waitForTimeout(80);
    assert(await visible());
    const accept=await page.$eval('[data-consent="accept"]',el=>({a:el.dataset.buttonAppearance,h:el.dataset.buttonHover,bg:getComputedStyle(el).backgroundColor,r:getComputedStyle(el).borderTopLeftRadius,fs:getComputedStyle(el).fontSize,minH:el.getBoundingClientRect().height}));
    assert.deepEqual([accept.a,accept.h,accept.bg,accept.r,accept.fs],['solid','fade','rgb(18, 52, 86)','3px','15px']);
    assert(accept.minH>=44);
    assert.equal(await page.$eval('[data-consent="decline"]',el=>el.dataset.buttonAppearance),'outline');passed++;
    await page.evaluate(()=>{window.events=[];document.addEventListener('materia:consent',e=>events.push(e.detail));});
    await page.click('[data-consent="accept"]');
    await page.waitForTimeout(400);
    assert.equal(await page.$eval('cookie-consent',el=>el.hidden),true);
    assert.deepEqual(await page.evaluate(()=>events),[{accepted:true,stored:false}]);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('materia:consent')));
    assert.equal(saved.accepted,true);
    assert(Math.abs(saved.expires-saved.at-180*864e5)<1000,'expires after the chosen days');passed++;
    // A stored choice: not shown again, announced as stored; an expired one shows again.
    await load(banner(),{before:`localStorage.setItem('materia:consent',JSON.stringify({accepted:false,at:1,expires:Date.now()+1e6}));window.events=[];document.addEventListener('materia:consent',e=>events.push(e.detail));`});
    await page.waitForTimeout(80);
    assert.equal(await page.$eval('cookie-consent',el=>el.hidden),true);
    assert.deepEqual(await page.evaluate(()=>events),[{accepted:false,stored:true}]);
    await load(banner(),{before:`localStorage.setItem('materia:consent',JSON.stringify({accepted:true,at:1,expires:Date.now()-1}))`});
    await page.waitForTimeout(80);
    assert(await visible(),'expired choice asks again');passed++;
    // Storage that throws: still shows, still works.
    await load(banner(),{before:`Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}});Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked')}});`});
    await page.waitForTimeout(80);
    assert(await visible());
    await page.click('[data-consent="decline"]');
    await page.waitForTimeout(400);
    assert.equal(await page.$eval('cookie-consent',el=>el.hidden),true);passed++;
    // Delay before it appears.
    await page.evaluate(()=>{});
    await load(banner({delay:'1'}));
    await page.waitForTimeout(300);
    assert.equal(await page.$eval('cookie-consent',el=>el.hidden),true,'waits for the delay');
    await page.waitForTimeout(1000);
    assert(await visible());passed++;
    // Builder: hidden unless "Show in the builder"; follows changes live.
    await load(banner({design:'true',preview:'false'})+'<script type="application/json" data-consent-settings>{"enable_cookies":true,"cookie_show_in_builder":false,"cookie_style":"bar-center","cookie_position":"bottom_center","cookie_custom_styling":false}</script>');
    await page.waitForTimeout(80);
    assert.equal(await page.$eval('cookie-consent',el=>el.hidden),true,'never shows in the builder by default');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{cookie_show_in_builder:true,cookie_position:'top_bar',label_allow:'Allow all',cookie_custom_styling:true,cookie_btn_bg:'#008000'}}})));
    await page.waitForTimeout(120);
    assert(await visible());
    assert.equal(await page.$eval('cookie-consent',el=>el.dataset.position),'top_bar');
    assert.equal(await page.$eval('[data-consent="accept"]',el=>[el.textContent,getComputedStyle(el).backgroundColor].join()),'Allow all,rgb(0, 128, 0)');
    assert(await page.$eval('[data-consent-panel]',el=>el.getBoundingClientRect().top<=1),'top bar sits at the top');
    await page.click('[data-consent="accept"]');
    assert.equal(await page.evaluate(()=>localStorage.getItem('materia:consent')),null,'a builder click stores nothing');passed++;

    // Modal: focus goes in, Tab stays in, Escape closes, focus comes back; a required choice ignores Escape.
    await load(banner({position:'modal',close:true}),{before:`document.getElementById('outside').focus()`});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.consent),'decline','first button focused');
    assert.equal(await page.$eval('[data-consent-panel]',el=>el.getAttribute('aria-modal')),'true');
    assert.equal(await page.$eval('.cookie-consent__backdrop',el=>getComputedStyle(el).display),'block');
    for(let i=0;i<5;i++) await page.keyboard.press('Tab');
    assert(await page.evaluate(()=>!!document.activeElement.closest('cookie-consent')),'focus stays in the modal');
    const box=await page.$eval('[data-consent-panel]',el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
    assert(Math.abs(box[0]-640)<2&&Math.abs(box[1]-400)<2,'centred');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    assert.equal(await page.$eval('cookie-consent',el=>el.hidden),true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'outside','focus returns');
    await load(banner({position:'modal',require:'true',close:true}));
    await page.waitForTimeout(100);
    assert.equal(await page.$eval('[data-consent="close"]',el=>el.hidden),true,'no close when a choice is required');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    assert(await visible(),'Escape does not dismiss a required choice');passed++;
    // Close for the visit.
    await load(banner({frequency:'session',close:true}));
    await page.waitForTimeout(80);
    await page.click('[data-consent="close"]');
    await page.waitForTimeout(400);
    await load(banner({frequency:'session',close:true}),{keep:true});
    await page.waitForTimeout(80);
    assert.equal(await page.$eval('cookie-consent',el=>el.hidden),true,'closed once per visit');
    assert.equal(await page.evaluate(()=>localStorage.getItem('materia:consent')),null,'closing is not a choice');passed++;
    // Colour scheme: the panel follows the chosen scheme.
    await load(banner().replace('class="cookie-consent"','class="cookie-consent color-dark"'));
    await page.waitForTimeout(80);
    assert.equal(await page.$eval('[data-consent-panel]',el=>getComputedStyle(el).backgroundColor),'rgb(16, 24, 32)');passed++;
    // Positions at desktop.
    for(const [position,check] of [['bottom_left',r=>r.left<=17&&r.bottom>=783],['bottom_right',r=>r.right>=1263],['bottom_bar',r=>r.left===0&&r.right===1280&&r.bottom===800]]) {
      await load(banner({position}));
      await page.waitForTimeout(400);
      const r=await page.$eval('[data-consent-panel]',el=>el.getBoundingClientRect().toJSON());
      assert(check(r),position+' '+JSON.stringify(r));
    }passed++;
    // 375px: bottom sheet above the mobile navigation bar, no sideways scroll, 44px targets; reduced motion.
    await page.setViewportSize({width:375,height:700});
    await page.emulateMedia({reducedMotion:'reduce'});
    await load('<div style="height:2000px"></div><mobile-navigation-bar style="position:fixed;left:0;right:0;bottom:0;height:64px;display:block;z-index:12"></mobile-navigation-bar>'+banner({position:'bottom_right'}));
    await page.waitForTimeout(80);
    const sheet=await page.$eval('[data-consent-panel]',el=>({r:el.getBoundingClientRect().toJSON(),t:getComputedStyle(el).transitionDuration,btn:[...el.querySelectorAll('.cookie-consent__btn')].map(b=>b.getBoundingClientRect().height),sw:document.documentElement.scrollWidth}));
    assert.equal(sheet.r.left,0);assert.equal(sheet.r.width,375);
    assert.equal(Math.round(sheet.r.bottom),636,'sits on top of the navigation bar');
    assert.equal(sheet.t,'0s');
    assert(sheet.btn.every(h=>h>=44));
    assert(sheet.sw<=375);
    await load(banner({mobile:'card',position:'bottom_center','above-nav':'false'}));
    await page.waitForTimeout(80);
    const card=await page.$eval('[data-consent-panel]',el=>el.getBoundingClientRect().toJSON());
    assert(card.left>=8&&card.right<=367&&card.bottom<=692);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:1280,height:800});passed++;

    // Count bubbles: default, custom override with empty fallback (theme-live), animation, live counts.
    // The bubbles' rules and script are the header's cached files (sections/theme-header links them).
    const headerCss=read('shopify/assets/header-section.css'),headerJs=read('shopify/assets/header-section.js');
    const bubbleCss=headerCss.slice(headerCss.indexOf('html body .h-count:not('));
    const bubbleJs=headerJs.slice(0,headerJs.indexOf('\n})();')+6);
    assert(!/\{[{%]/.test(bubbleCss+bubbleJs),'fixture copies plain CSS and script');
    const live=read('snippets/theme-live.storelib');
    const liveJs=live.slice(live.indexOf('<script>')+8,live.lastIndexOf('{% comment %}{% endcomment %}</script>'))
      .replace(/\[\{% for scheme[\s\S]*?\{% endfor %\}\]/,'[]')
      .replace(/\{\{[^}]*\|\s*json\s*\}\}/g,'null').replace(/\{\{[^}]*\}\}/g,'');
    const critical=read('shopify/assets/critical.css');
    const hcount=critical.slice(critical.indexOf('.h-count {'),critical.indexOf('.menu_label {'));
    await page.setContent(`<style>:root{--color-primary:#3456e6;--color-white:#fff;--count-bubble-size:18px;--count-bubble-font-size:10px;--count-bubble-font-weight:600;--count-bubble-radius:999px;--count-bubble-border-width:0px;--count-bubble-offset-x:0px;--count-bubble-offset-y:0px;--count-bubble-animation:mt-count-pop}${hcount}${bubbleCss}</style>
      <div class="header__minicart"><span id="cart" class="cart-count h-count">2</span></div><div class="header__wishlist"><span id="wish" class="wishlist-count h-count">0</span></div>
      <button-wishlist id="wb" style="display:inline-block;width:44px;height:44px">Save</button-wishlist>`);
    await page.addScriptTag({content:bubbleJs});
    await page.addScriptTag({content:liveJs});
    const bub=sel=>page.$eval(sel,el=>{const s=getComputedStyle(el);return [s.backgroundColor,s.color,s.height,s.borderTopLeftRadius].join(' ');});
    assert.equal(await bub('#cart'),'rgb(52, 86, 230) rgb(255, 255, 255) 18px 999px','follows the scheme by default');
    const change=settings=>page.evaluate(s=>new Promise(r=>{document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:s}}));requestAnimationFrame(()=>requestAnimationFrame(r));}),settings);
    await change({bubble_bg:'#111111',bubble_text:'#eeeeee',bubble_size:22,bubble_shape:'square'});
    assert.equal(await bub('#cart'),'rgb(17, 17, 17) rgb(238, 238, 238) 22px 0px');
    assert.equal(await bub('#wish'),'rgb(17, 17, 17) rgb(238, 238, 238) 22px 0px','both follow the default');
    await change({cart_bubble_custom:true,cart_bubble_bg:'#ff0000',cart_bubble_color:''});
    assert.equal(await bub('#cart'),'rgb(255, 0, 0) rgb(238, 238, 238) 22px 0px','custom colour, empty one falls back');
    assert.equal(await bub('#wish'),'rgb(17, 17, 17) rgb(238, 238, 238) 22px 0px','wishlist keeps the default');
    await change({cart_bubble_custom:false});
    assert.equal(await bub('#cart'),'rgb(17, 17, 17) rgb(238, 238, 238) 22px 0px');passed++;
    // A changed number pops; the wishlist count follows the saved list.
    await page.evaluate(()=>{document.querySelector('#cart').innerHTML='3';});
    await page.waitForTimeout(30);
    assert.equal(await page.$eval('#cart',el=>[el.classList.contains('is-count-bump'),getComputedStyle(el).animationName].join()),'true,mt-count-pop');
    await page.evaluate(()=>{document.querySelector('#wb').addEventListener('click',()=>localStorage.setItem('materia__wishlist-items',JSON.stringify(['1','2'])));});
    await page.click('#wb');
    await page.waitForTimeout(50);
    assert.equal(await page.$eval('#wish',el=>el.textContent),'2','wishlist count updates after a wishlist button');
    assert(await page.$eval('#wish',el=>el.classList.contains('is-count-bump')));
    await page.evaluate(()=>{localStorage.setItem('materia__wishlist-items','["1"]');window.dispatchEvent(new StorageEvent('storage',{key:'materia__wishlist-items'}));});
    assert.equal(await page.$eval('#wish',el=>el.textContent),'1','another tab');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('cart:refresh',{detail:{data:{item_count:7}}})));
    assert.equal(await page.$eval('#cart',el=>el.textContent),'7','cart event');passed++;
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{document.querySelector('#cart').innerHTML='8';});
    await page.waitForTimeout(30);
    assert.equal(await page.$eval('#cart',el=>getComputedStyle(el).animationName),'none');passed++;
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
  console.log(`${passed} consent and count bubble checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
