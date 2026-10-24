/* Search overlay, both Search types, with the theme's own CSS and the search
   module from theme.js on a fixture page: an announcement bar, a sticky
   header, a fixed mobile navigation bar and a stray very high z-index layer.
   Popup: covers the header bar exactly (top, left, width, height), opens
   without a flash or a jump. Drawer: nothing is drawn above it. Both: focus,
   Escape, outside click, scroll lock without a jump, one request per settled
   query with stale ones aborted, and no doubled listeners after redraws. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

const theme=read('shopify/assets/theme.js');
const start=theme.indexOf('var BlsSearchShopify = (function () {');
const endMark='customElements.define("header-search", HeaderSearch);';
const searchJs=theme.slice(start,theme.indexOf(endMark)+endMark.length);
assert(start>0&&searchJs.length>1000,'search module found in theme.js');
const css=['shopify/assets/critical.css','shopify/assets/theme.css','shopify/assets/search-type-default.css'].map(read).join('\n');

// The markup the snippets render.
const top=read('snippets/top-search.storelib');
assert.match(top,/id="search-form"\s+popover="manual"/,'the panel is a manual popover');
assert.match(top,/class="overlay_search" popover="manual"/,'the scrim is a manual popover');
assert.match(top,/data-search-mode="\{\{ overlay_mode \}\}"/);
assert(!/on[a-z]+=/.test(top.replace(/\{%-? comment[\s\S]*?endcomment -?%\}/g,'')),'no inline handlers');
assert(!read('shopify/assets/search-type-default.css').includes('--search-top'),'the popup no longer opens below the header');
assert(!/section-header\s*\{\s*z-index/.test(read('shopify/assets/search-type-default.css')),'the header is never raised over the search');
let passed=1;

const panelMarkup=mode=>mode==='drawer'?`
  <div class="search___drawer flex flex-column h-full">
    <div class="sticky top-0 pb-30"><div class="mini_search_header flex justify-between px-30 py-18"><h3 class="h5 m-0">Search our site</h3>
      <button class="btn-reset btn-search-close button-close pointer" aria-label="Close">x</button></div>
      <form action="/search" id="search_mini_form" method="get" role="search" class="search search-modal__form px-30 pt-30"><div class="field flex relative">
        <input class="search__input field__input flex-1" type="search" name="q" id="search-template" aria-label="Search"></div></form></div>
    <div class="search-modal__content flex-1 overflow-y-auto custom-scrollbar pb-30">
      <div id="quick-search" class="quick-search px-30 mb-30"><ul class="quick-search-list"><li><a class="quick-url" href="/search?q=dress">dress</a></li></ul></div>
      <div id="predictive-search" class="predictive-search--header px-30"><div class="predictive-search" data-predictive-search></div></div>
      <div class="search__loading-state mt-15">loading</div>
      <div style="height:1600px">long content</div>
    </div>
  </div>`:`
  <div class="search__type-popup search__popup-anim--fade h-full overflow-auto px-15">
    <div class="fluid_container">
      <h3 class="search-title">Search</h3>
      <div class="search__type-popup-bar">
        <form action="/search" id="search_mini_form" method="get" role="search" class="search search-modal__form search__type-popup-form"><div class="search__type-popup-field">
          <input class="search__input search__type-popup-input field__input" type="search" name="q" id="search-template" aria-label="Search">
          <button type="submit" class="search__type-popup-submit" aria-label="Search">s</button></div></form>
        <button type="button" class="search__type-popup-close btn-search-close" aria-label="Close">x</button>
      </div>
      <div id="quick-search" class="quick-search"><ul class="quick-search-list"><li><a class="quick-url" href="/search?q=dress">dress</a></li></ul></div>
      <div id="predictive-search" class="predictive-search--header mt-25"><div class="predictive-search" data-predictive-search></div></div>
      <div class="search__loading-state mt-15">loading</div>
    </div>
  </div>`;

const fixture=(mode,anim='fade')=>`<!doctype html><html class="js"><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--overlay-bg:rgba(0,0,0,.5)}html{scrollbar-gutter:stable}body{margin:0;padding-right:0!important}${css}
.announce{height:40px;background:#222;color:#fff;position:relative}
.section-header{position:sticky;top:0;z-index:11}
header.header{height:80px;background:#fff;display:flex;align-items:center;justify-content:flex-end;padding:0 20px;box-sizing:border-box}
.mnb{position:fixed;left:0;right:0;bottom:0;height:56px;background:#eee;z-index:12}
.stray{position:fixed;top:130px;right:0;width:60%;height:200px;z-index:2147483000;pointer-events:auto;background:rgba(255,0,0,.01)}
main{height:4000px}
</style></head><body>
<div class="announce">Free shipping</div>
<div class="section-header shopify-section"><header class="header"><div class="header_search"><div class="dropdown-toggle"><button class="btn-reset top-search-toggle w-44 h-44" aria-label="Search">S</button></div></div></header></div>
<main>page</main>
<div class="mnb">nav bar</div>
<div class="stray"></div>
<header-search class="header_search search_type_${mode}"><div class="block block-quick-search predictive_search_suggest search_${mode}">
<div id="search-form" popover="manual" role="dialog" aria-modal="true" aria-label="Search" data-search-mode="${mode}" class="search-overlay search-overlay--${mode} search__type-${mode} search__popup-anim--${anim} color-default" style="--color-background:#fff;background-color:#fff">${panelMarkup(mode)}</div>
</div></header-search>
<div class="overlay_search" popover="manual" aria-hidden="true"></div>
<script>var root=document.body;var routes={predictive_search_url:'/search/suggest'};window.requests=[];window.aborted=0;
const realFetch=window.fetch;window.fetch=(url,opts)=>{window.requests.push(String(url));const signal=opts&&opts.signal;
 return new Promise((res,rej)=>{const t=setTimeout(()=>res(new Response('<div id="shopify-section-search-predictive-grid"><div class="search-list-item"><ul role="listbox"><li role="option" id="o1" aria-selected="false"><a href="/p/1">One</a></li><li role="option" id="o2" aria-selected="false"><a href="/p/2">Two</a></li></ul><div style="height:220px"></div></div></div>')),window.fetchDelay||40);
 if(signal)signal.addEventListener('abort',()=>{clearTimeout(t);window.aborted++;rej(new DOMException('Aborted','AbortError'));});});};
</script>
<script>${searchJs}</script></body></html>`;

const state=page=>page.evaluate(()=>{
  const f=document.getElementById('search-form');const cs=getComputedStyle(f);
  return {open:f.matches(':popover-open'),scrimOpen:document.querySelector('.overlay_search').matches(':popover-open'),vis:cs.visibility,op:+cs.opacity,html:document.documentElement.className,overflow:getComputedStyle(document.documentElement).overflowY,focus:document.activeElement&&document.activeElement.id};
});
// Samples the panel every frame while it opens: opacity, transform, box.
const timeline=(page,click)=>page.evaluate(async click=>{
  const f=document.getElementById('search-form');const out=[];
  let done=false;const tick=()=>{const cs=getComputedStyle(f);const r=f.getBoundingClientRect();out.push({op:+cs.opacity,vis:cs.visibility,tf:cs.transform,top:r.top,left:r.left,h:r.height,t:performance.now()});if(!done)requestAnimationFrame(tick);};
  if(click)document.querySelector('.top-search-toggle').click();
  tick();await new Promise(r=>setTimeout(r,420));done=true;return out;
},click);
const hits=(page,sel)=>page.evaluate(sel=>{
  const f=document.querySelector(sel);const r=f.getBoundingClientRect();
  const pts=[[r.left+2,r.top+2],[r.right-3,r.top+2],[r.left+2,r.bottom-3],[r.right-3,r.bottom-3],[r.left+r.width/2,r.top+r.height/2]];
  return pts.map(([x,y])=>{const e=document.elementFromPoint(x,y);return e&&f.contains(e)?'in':(e?e.className||e.tagName:'none');});
},sel);

(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    for(const vp of [{width:1280,height:800},{width:375,height:740}]){
      // ---------- Popup ----------
      for(const scroll of [0,900]){
        const page=await browser.newPage({viewport:vp});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.setContent(fixture('popup'));
        await page.evaluate(y=>scrollTo(0,y),scroll);
        await page.waitForTimeout(50);
        const closed=await state(page);
        assert.equal(closed.vis,'hidden','closed popup is hidden');assert.equal(closed.open,false);
        const before=await page.evaluate(()=>({y:scrollY,header:document.querySelector('header.header').getBoundingClientRect().toJSON(),cw:document.documentElement.clientWidth}));
        const tl=await timeline(page,true);
        const s=await state(page);
        assert(s.open&&s.scrimOpen,'panel and scrim in the top layer');
        assert.equal(s.focus,'search-template','focus is in the field');
        assert.match(s.html,/open-search/);assert.equal(s.overflow,'hidden','page scroll is locked');
        // No flash: starts transparent, only ever gets more opaque, ends opaque,
        // and the box never moves while it fades in.
        assert(tl[0].op<0.35,`first frame is not already opaque (${tl[0].op})`);
        for(let i=1;i<tl.length;i++)assert(tl[i].op>=tl[i-1].op-0.001,`opacity never drops while opening (${tl[i-1].op} -> ${tl[i].op})`);
        assert.equal(tl[tl.length-1].op,1);
        const opaqueAt=tl.find(x=>x.op===1).t-tl[0].t;
        assert(opaqueAt>120&&opaqueAt<380,`fades in over about 250ms (${Math.round(opaqueAt)}ms)`);
        assert(tl.every(x=>x.top===tl[0].top&&x.left===tl[0].left),'the panel never jumps');
        // In the header's place, exactly.
        const box=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().toJSON());
        const after=await page.evaluate(()=>({y:scrollY,header:document.querySelector('header.header').getBoundingClientRect().toJSON(),cw:document.documentElement.clientWidth}));
        assert.equal(after.y,before.y,'no scroll jump on open');assert.equal(after.cw,before.cw,'no width shift on open');
        assert.deepEqual(after.header,before.header,'the header does not move');
        for(const k of ['top','left','width'])assert(Math.abs(box[k]-before.header[k])<=1,`popup ${k} ${box[k]} matches the header ${before.header[k]} (scroll ${scroll}, ${vp.width}px)`);
        const bar=await page.evaluate(()=>document.querySelector('#search-form .search__type-popup-bar').getBoundingClientRect().toJSON());
        assert(Math.abs(bar.top-before.header.top)<=1&&Math.abs(bar.height-before.header.height)<=1,`the field's bar is the header bar (${bar.top}/${bar.height})`);
        assert(box.height>=before.header.height,'trending opens below the bar');
        assert.equal(scroll?box.top:40,box.top,'below the announcement bar at the top of the page, at 0 when the header is stuck');
        assert.deepEqual(await hits(page,'#search-form'),['in','in','in','in','in'],'nothing is drawn over the popup');
        assert(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight-20).classList.contains('overlay_search')),'the scrim covers the page and the nav bar');
        // The field sits in the bar, centred in the header's height.
        const field=await page.evaluate(()=>{const i=document.getElementById('search-template').getBoundingClientRect();const c=document.querySelector('#search-form .btn-search-close').getBoundingClientRect();return {top:i.top,bottom:i.bottom,cw:c.width,ch:c.height};});
        assert(field.top>=box.top&&field.bottom<=box.top+box.height,'the field is inside the header bar');
        assert(field.cw>=44&&field.ch>=44,'close is a 44px target');
        // Results open below the bar; the bar keeps the header's height.
        await page.fill('#search-template','dre');
        await page.waitForTimeout(400);
        const res=await page.evaluate(()=>{const f=document.getElementById('search-form').getBoundingClientRect();const p=document.querySelector('#search-form #predictive-search').getBoundingClientRect();const b=document.querySelector('#search-form .search__type-popup-bar').getBoundingClientRect();return {f:f.toJSON(),p:p.toJSON(),b:b.toJSON()};});
        assert(Math.abs(res.b.height-before.header.height)<=1,'the bar keeps the header height');
        assert(res.p.top>=res.b.bottom-1&&res.p.height>0,'results open below the field');
        assert(res.f.top===box.top&&res.f.height>box.height,'the panel grows downwards only');
        assert(res.f.bottom<=vp.height+1,'the panel stays on screen');
        // Escape closes; the page is unlocked once the panel has gone.
        await page.keyboard.press('Escape');
        const mid=await state(page);
        assert(!/open-search/.test(mid.html),'Escape closes');
        await page.waitForTimeout(380);
        const end=await state(page);
        assert.equal(end.vis,'hidden');assert(!end.open&&!end.scrimOpen,'layers leave the top layer');
        assert(!/open-drawer/.test(end.html),'page unlocked');
        assert.equal(await page.evaluate(()=>scrollY),before.y,'no scroll jump on close');
        assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('top-search-toggle')),true,'focus returns to the toggle');
        // Outside click closes.
        await page.click('.top-search-toggle');await page.waitForTimeout(300);
        await page.mouse.click(vp.width/2,vp.height-120);
        await page.waitForTimeout(380);
        assert.equal((await state(page)).open,false,'a click outside closes');
        assert.deepEqual(errors,[]);
        await page.close();passed++;
      }

      // ---------- Drawer ----------
      for(const scroll of [0,900]){
        const page=await browser.newPage({viewport:vp});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.setContent(fixture('drawer'));
        await page.evaluate(y=>scrollTo(0,y),scroll);
        await page.waitForTimeout(50);
        const y0=await page.evaluate(()=>scrollY);
        const tl=await timeline(page,true);
        const xs=tl.map(x=>x.left);
        for(let i=1;i<xs.length;i++)assert(xs[i]<=xs[i-1]+0.5,'the drawer slides in one direction');
        assert(xs[0]>xs[xs.length-1],'the drawer slides in');
        assert(tl.every(x=>x.op===1||x.vis==='hidden'),'the drawer is never half transparent');
        await page.waitForTimeout(50);
        const s=await state(page);
        assert(s.open&&s.scrimOpen&&s.vis==='visible');
        assert.equal(s.focus,'search-template');
        const box=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().toJSON());
        const vw=await page.evaluate(()=>document.querySelector('main').getBoundingClientRect().right);
        assert.equal(box.top,0);assert.equal(box.height,vp.height,'full height');
        assert(Math.abs(box.right-vw)<=1,`flush with the right edge (${box.right} vs ${vw})`);
        assert.deepEqual(await hits(page,'#search-form'),['in','in','in','in','in'],`nothing over the drawer (scroll ${scroll}, ${vp.width}px)`);
        // Where the header and the stray layer are, the drawer wins.
        const overHeader=await page.evaluate(()=>{const f=document.getElementById('search-form');const h=document.querySelector('header.header').getBoundingClientRect();const r=f.getBoundingClientRect();const y=Math.max(2,h.top+h.height/2);const e=document.elementFromPoint(r.left+10,y);const e2=document.elementFromPoint(r.right-10,y);return f.contains(e)&&f.contains(e2);});
        assert(overHeader,'the header is under the drawer');
        // Its content scrolls on its own; the page does not.
        const sc=await page.evaluate(()=>{const c=document.querySelector('#search-form .search-modal__content');c.scrollTop=400;return {inner:c.scrollTop,page:scrollY};});
        assert(sc.inner>0,'drawer content scrolls');assert.equal(sc.page,y0,'page does not scroll');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(420);
        const end=await state(page);
        assert(!end.open&&end.vis==='hidden'&&!/open-(search|drawer)/.test(end.html),'Escape closes the drawer');
        await page.click('.top-search-toggle');await page.waitForTimeout(400);
        // Where the drawer leaves room the scrim closes it; full width on a
        // phone, its close button does.
        if(box.left>20)await page.mouse.click(10,vp.height/2);
        else await page.click('#search-form .btn-search-close');
        await page.waitForTimeout(420);
        assert.equal((await state(page)).open,false,'the scrim or close button closes the drawer');
        assert.deepEqual(errors,[]);
        await page.close();passed++;
      }
    }

    // ---------- No lag: debounced, aborted, no doubled listeners ----------
    {
      const page=await browser.newPage({viewport:{width:1280,height:800}});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.setContent(fixture('popup'));
      // The header redrawn three times in the builder.
      await page.evaluate(()=>{for(let i=0;i<3;i++){const sec=document.querySelector('.section-header');sec.innerHTML=sec.innerHTML;sec.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:'header'}}));BlsSearchShopify.init();}});
      await page.click('.top-search-toggle');await page.waitForTimeout(300);
      assert.equal((await state(page)).open,true,'one click opens once after redraws (no doubled toggles)');
      await page.keyboard.type('dress',{delay:30});
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(()=>requests.length),1,'typing a word sends one request');
      // A slow answer is cancelled by the next query.
      await page.evaluate(()=>{window.fetchDelay=600;});
      await page.fill('#search-template','shirt');await page.waitForTimeout(320);
      await page.fill('#search-template','shoes');await page.waitForTimeout(320);
      assert.equal(await page.evaluate(()=>aborted),1,'the stale request is aborted');
      await page.waitForTimeout(700);
      assert.equal(await page.evaluate(()=>requests.length),3);
      // A repeated query is answered from memory.
      await page.fill('#search-template','dress');await page.waitForTimeout(320);
      assert.equal(await page.evaluate(()=>requests.length),3,'a repeated query is not fetched again');
      // Arrow keys move through the results without errors.
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.evaluate(()=>document.getElementById('search-template').getAttribute('aria-activedescendant')),'o1');
      // The document has no search keyup handler that blocks other keys.
      await page.keyboard.press('Escape');await page.waitForTimeout(390);
      assert.equal((await state(page)).open,false);
      assert.deepEqual(errors,[]);
      await page.close();passed++;
    }

    // ---------- Other animations stay transform/opacity/filter only ----------
    for(const anim of ['slide-down','zoom','blur']){
      const page=await browser.newPage({viewport:{width:1280,height:800}});
      await page.setContent(fixture('popup',anim));
      await page.evaluate(()=>document.querySelector('#quick-search').remove());
      const tl=await timeline(page,true);
      assert(tl[0].op<0.35&&tl[tl.length-1].op===1,`${anim}: fades in`);
      assert(tl.every(x=>x.top>=tl[0].top-13&&x.h>0),`${anim}: stays at the header`);
      const box=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().top);
      assert.equal(box,40,`${anim}: ends in the header's place`);
      assert.equal(await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().height),80,`${anim}: with nothing below the field, exactly the header's height`);
      await page.close();
    }
    passed++;

    // ---------- Reduced motion: opens at once ----------
    {
      const ctx=await browser.newContext({viewport:{width:375,height:740},reducedMotion:'reduce'});
      const page=await ctx.newPage();
      await page.setContent(fixture('drawer'));
      await page.click('.top-search-toggle');await page.waitForTimeout(60);
      const b=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().left);
      assert(b<=1,'no slide under reduced motion');
      await ctx.close();passed++;
    }
  } finally {await browser.close();}
  console.log(`${passed} search overlay checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
