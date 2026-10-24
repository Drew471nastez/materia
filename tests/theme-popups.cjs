/* Run: node tests/theme-popups.cjs
   The overlay popups (sections in sections/overlay-group.json) and the shared
   manager shopify/assets/materia-popups.js: triggers, frequency, close,
   focus, one popup at a time, the builder, and each section's own parts
   (coupon copy, signup, countdown, spin wheel, back to top, order
   notifications, custom colours). Chromium fixtures copy the attributes the
   sections' Liquid draws; each section's own inline script is taken from its
   file and run as it is. They do not replace Storelib's renderer. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const POPUPS=['promobanner','promotional-popup','promotionalpopup2','promonewsletterpopup-2','coupon-promotion-newsletter-popup','countdown-promo-popup','spin-wheel-popup','promotional-image-popup'];
const OTHERS=['back-to-top-pro','fake-order','custom-colors'];
const schemaOf=text=>JSON.parse(text.match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]).shopify;
const idsOf=model=>{
  const out=[];
  (model.settings||[]).forEach(s=>s.id&&out.push('section:'+s.id));
  (model.blocks||[]).forEach(b=>(b.settings||[]).forEach(s=>s.id&&out.push(b.type+':'+s.id)));
  return out;
};
// The section's own inline script, after the materia-popups.js include, with
// the only Liquid it may hold (its id and translated words) filled in.
function sectionScript(file,id){
  const text=read('sections/'+file+'.storelib');
  const start=text.indexOf("<script src=\"{{ 'materia-popups.js' | asset_url }}\" defer=\"defer\"></script>");
  assert(start>-1,file+' loads materia-popups.js');
  const open=text.indexOf('<script>',start)+8;
  const close=text.indexOf('</script>',open);
  let js=text.slice(open,close).replace('{% comment %}{% endcomment %}','');
  js=js.replace(/\{\{\s*(?:sid|section\.id)\s*\|\s*json\s*\}\}/g,JSON.stringify(id));
  js=js.replace(/\{\{\s*'[^']+'\s*\|\s*t\s*\|\s*json\s*\}\}/g,'"Copied!"');
  assert(!/\{\{|\{%/.test(js),file+': the script reads its settings from data-popup-config, not from Liquid');
  return js;
}

// Fixtures in the shape each section's Liquid draws (classes, data-*), with
// the open/closed rule its CSS uses, so visibility can be checked.
const cfgAttr=c=>`data-popup-config='${JSON.stringify(c).replace(/'/g,'&#39;')}'`;
const FX={
  cd:(c,end)=>`<style>.cdp-card-cd,.cdp-overlay-cd{position:fixed;visibility:hidden}.cdp-overlay-cd{inset:0}.cdp-card-cd{top:20%;left:20%;width:400px;background:#fff}.cdp-cd.cdp-open .cdp-card-cd,.cdp-cd.cdp-open .cdp-overlay-cd{visibility:visible}.cdp-cd[data-cd-ended] .cdp-countdown-cd{display:none}</style>
    <section class="cdp-cd" data-cdp-section="cd" data-popup-root="cd" ${cfgAttr(c)} aria-hidden="true"><div class="cdp-overlay-cd"></div>
    <div class="cdp-card-cd" role="dialog" aria-modal="true" tabindex="-1"><button type="button" class="cdp-close-cd" data-popup-close aria-label="Close">x</button>
      <button type="button" class="cdp-coupon-cd" data-cdp-code="DISC100"><span data-cdp-code-text>DISC100</span></button>
      <div class="cdp-countdown-cd" data-cdp-countdown data-cdp-end="${end}">${[0,1,2,3].map(i=>`<div data-cdp-num="${i}">00</div>`).join('')}</div>
      <p class="cdp-cd-status-cd" data-cdp-status hidden>Completed</p><a class="btn-primary" data-theme-button="primary" href="#shop">Shop now</a></div></section>`,
  cpnb:c=>`<style>.cpnb-card-cp{position:fixed;visibility:hidden;top:10%;left:10%;background:#fff}.cpnb-cp.cpnb-open .cpnb-card-cp{visibility:visible}.cpnb-postpane-cp{display:none}.cpnb-cp.cpnb-subscribed .cpnb-postpane-cp{display:block}.cpnb-cp.cpnb-subscribed .cpnb-prepane-cp{display:none}</style>
    <section class="cpnb-cp" data-popup-root="cp" ${cfgAttr(c)} aria-hidden="true"><div class="cpnb-overlay-cp"></div>
    <div class="cpnb-card-cp" role="dialog" aria-modal="true" tabindex="-1"><button type="button" class="cpnb-close-cp" data-popup-close aria-label="Close">x</button>
      <div class="cpnb-prepane-cp"><form id="cpnb-form-cp" class="cpnb-formel-cp" data-storelib-form="subscribe"><input id="e" type="email" name="email" required data-popup-autofocus aria-label="Email"><button type="submit" class="btn-primary" data-theme-button="primary">Subscribe</button></form>
      <button type="button" class="cpnb-dismiss-cp" data-popup-close>No thanks</button></div>
      <div class="cpnb-postpane-cp"><p>Thanks! Here is your code:</p><button type="button" class="cpnb-code-cp" data-code="WELCOME15">WELCOME15</button></div></div></section>`,
  sw:(c,prizes)=>`<style>.sw-card-sw{position:fixed;visibility:hidden;top:5%;left:5%;background:#fff;width:700px}.sw-sw.sw-open .sw-card-sw{visibility:visible}.sw-post-sw{display:none}.sw-sw.sw-spun .sw-post-sw{display:block}.sw-sw.sw-spun .sw-pre-sw{display:none}.sw-respin-btn-sw{display:none}.sw-sw.sw-can-respin .sw-respin-btn-sw{display:inline-flex}.sw-wheel-svg-sw{width:300px;height:300px;border-radius:50%;transition:transform .4s cubic-bezier(.12,.6,.12,1)}</style>
    <section class="sw-sw" data-popup-root="sw" ${cfgAttr(c)} aria-hidden="true"><div class="sw-overlay-sw"></div>
    <div class="sw-card-sw" role="dialog" aria-modal="true" tabindex="-1"><button type="button" class="sw-close-sw" data-popup-close aria-label="Close">x</button>
      <div class="sw-pre-sw"><form class="sw-formel-sw" data-storelib-form="subscribe"><input type="email" name="email" required aria-label="Email" data-popup-autofocus><button type="submit" class="sw-spin-btn-sw btn-primary" data-theme-button="primary">Spin to win</button></form></div>
      <div class="sw-post-sw"><p data-sw-win-label-text>YOU WON!</p><h3 data-sw-win-title></h3><button type="button" class="sw-win-code-sw" data-sw-win-code></button><button type="button" class="sw-respin-btn-sw btn-primary" data-theme-button="primary" data-sw-respin>Spin again</button></div>
      <div class="sw-wheel-svg-sw"><svg viewBox="0 0 200 200">${prizes.map((p,i)=>`<text data-sw-segment="${i}" data-sw-code="${p[1]}" data-sw-label="${p[0]}" data-sw-weight="${p[2]??1}" x="100" y="32" font-size="10">${p[0]}</text>`).join('')}</svg></div></div></section>`,
  ppd:c=>`<style>.ppd-backdrop{position:fixed;inset:0;display:flex;visibility:hidden;background:#0008}.ppd-backdrop[data-open="true"]{visibility:visible}.ppd{margin:auto;width:400px;background:#fff;padding:20px}</style>
    <div id="ppd-pp" class="ppd-backdrop" data-open="false" data-popup-root="pp" ${cfgAttr(c)} aria-hidden="true"><div class="ppd" role="dialog" aria-modal="true" tabindex="-1">
      <button type="button" class="ppd__close" data-popup-close aria-label="Close">x</button><form class="ppd__form" data-storelib-form="subscribe"><input type="email" class="ppd__field" name="email" required aria-label="Email" data-popup-autofocus><button type="submit" class="ppd__btn btn-primary" data-theme-button="primary">Get my coupon</button></form>
      <button type="button" class="ppd__dismiss" data-popup-close>No, thanks</button></div></div>`,
  loudz:(n,id,c)=>`<style>.loudz__popup{position:fixed;inset:0;display:flex;visibility:hidden}.loudz__popup.active{visibility:visible}.loudz__popup:after{content:"";position:fixed;inset:0;background:#0008;z-index:-1}.loudz__${n==='4'?'content-box':'container'}{margin:auto;width:360px;background:#fff;padding:20px}</style>
    <div id="loudz-${id}" class="loudz-newsletter-${n} loudz-${id}" data-popup-root="${id}" ${cfgAttr(c)} aria-hidden="true"><div class="loudz__popup">
      <div class="loudz__${n==='4'?'content-box':'container'}" role="dialog" aria-modal="true" tabindex="-1"><button type="button" class="loudz__close" data-popup-close aria-label="Close">x</button>
      <form data-storelib-form="subscribe"><input type="email" name="email" required aria-label="Email" data-popup-autofocus><button type="submit" class="btn-primary" data-theme-button="primary">Subscribe</button></form>
      <button type="button" class="loudz__popup-link" data-popup-close>No thanks</button></div></div></div>`,
  pbp:c=>`<style>.pbp-card,.pbp-overlay{position:fixed;visibility:hidden}.pbp-overlay{inset:0}.pbp-card{top:10%;left:10%;background:#fff}.pbp-open .pbp-card,.pbp-open .pbp-overlay{visibility:visible}</style>
    <section class="promo-banner-pro promo-banner-pro--as-popup" data-section-id="pb" data-popup-root="pb" ${cfgAttr(c)} aria-hidden="true"><div class="pbp-overlay"></div>
    <div class="pbp-card" role="dialog" aria-modal="true" tabindex="-1"><button type="button" class="pbp-close" data-popup-close aria-label="Close">x</button>
      <button class="pbp-code" data-code="SAVE20" type="button">SAVE20</button><button class="pbp-copy" type="button" aria-label="Copy">c</button><a class="pbp-btn btn-primary" data-theme-button="primary" href="/discount/SAVE20">View products</a></div></section>`,
  ib:c=>`<style>.promobanner-popup-ib{position:fixed;inset:0;visibility:hidden;display:flex}.promobanner-popup-ib.active{visibility:visible}.promobanner-popup-inner-ib{margin:auto;width:300px;height:200px;background:#fff}</style>
    <div class="promobanner-popup-ib" data-popup-root="ib" ${cfgAttr(c)} aria-hidden="true"><div class="promobanner-popup-inner-ib" role="dialog" aria-modal="true" tabindex="-1"><img alt="Offer" width="300" height="200"><button type="button" class="promobanner-popup-close-ib" data-popup-close aria-label="Close">x</button></div></div>`,
};
const T=(mode,more={})=>({mode,delay:0,...more});
async function sectionTests({open,load,isOpen,sectionScript,passed}){
  const page=await open();
  const clip=()=>page.evaluate(()=>navigator.clipboard.readText().catch(()=>''));

  // Countdown: counts down, copies the code, hides the cells and says so at zero;
  // an offer already over is never shown.
  const end=new Date(Date.now()+((1*24+2)*3600+3*60+30)*1000);
  const local=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,19);
  await load(page,FX.cd({trigger:T('immediate'),frequency:{mode:'after_days',days:6},hideEnded:true},local(end)),{scripts:[sectionScript('countdown-promo-popup','cd')]});
  await page.waitForTimeout(120);
  assert.equal(await isOpen(page,'cd'),true,'countdown popup opens');
  const nums=()=>page.$$eval('[data-cdp-num]',n=>n.map(x=>x.textContent));
  const first=await nums();
  assert.deepEqual(first.slice(0,3),['01','02','03'],'days, hours, minutes '+first);
  await page.waitForTimeout(1100);
  assert.notEqual((await nums())[3],first[3],'seconds tick');
  await page.click('[data-cdp-code]');
  await page.waitForTimeout(80);
  assert.equal(await clip(),'DISC100','coupon copied');
  assert.equal(await page.$eval('[data-cdp-code-text]',e=>e.textContent),'Copied!');
  await page.keyboard.press('Escape');
  assert.equal(await isOpen(page,'cd'),false);
  await load(page,FX.cd({trigger:T('immediate'),frequency:{mode:'always'},hideEnded:true},local(new Date(Date.now()+1500))),{scripts:[sectionScript('countdown-promo-popup','cd')]});
  await page.waitForTimeout(2200);
  assert.equal(await page.$eval('.cdp-cd',e=>e.hasAttribute('data-cd-ended')),true,'ended');
  assert.equal(await page.$eval('p[data-cdp-status]',e=>e.hidden),false,'completed text shown');
  assert.equal(await page.$eval('.cdp-countdown-cd',e=>getComputedStyle(e).display),'none','cells hidden at zero');
  await load(page,FX.cd({trigger:T('immediate'),frequency:{mode:'always'},hideEnded:true},'2020-01-01T00:00:00'),{scripts:[sectionScript('countdown-promo-popup','cd')]});
  await page.waitForTimeout(150);
  assert.equal(await isOpen(page,'cd'),false,'an ended offer is not shown');passed++;

  // Coupon popup: signup through Storelib (data-state="done") reveals the code
  // and is not offered again; the code copies.
  const storelibStub=`document.addEventListener('submit',function(e){var f=e.target;if(f.getAttribute('data-storelib-form')!=='subscribe')return;e.preventDefault();window.__sent=(window.__sent||0)+1;f.setAttribute('data-state','sending');setTimeout(function(){f.setAttribute('data-state','done')},30);});`;
  await load(page,FX.cpnb({trigger:T('immediate'),frequency:{mode:'after_days',days:1},gate:true}),{scripts:[storelibStub,sectionScript('coupon-promotion-newsletter-popup','cp')]});
  await page.waitForTimeout(120);
  assert.equal(await isOpen(page,'cp'),true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'e','email field focused');
  assert.equal(await page.$eval('.cpnb-code-cp',e=>e.getClientRects().length),0,'code hidden before signup');
  await page.fill('#e','ada@example.com');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__sent),1,'form submitted to Storelib once');
  assert(await page.$eval('.cpnb-cp',e=>e.classList.contains('cpnb-subscribed')),'code revealed');
  await page.click('.cpnb-code-cp');await page.waitForTimeout(80);
  assert.equal(await clip(),'WELCOME15');
  assert.equal(await page.evaluate(()=>localStorage.getItem('materia:popup:cp')),'done');
  await load(page,FX.cpnb({trigger:T('immediate'),frequency:{mode:'always'},gate:true}),{scripts:[storelibStub,sectionScript('coupon-promotion-newsletter-popup','cp')],keep:true});
  await page.waitForTimeout(150);
  assert.equal(await isOpen(page,'cp'),false,'not offered again after signing up');passed++;

  // Two real popups at once: one opens, the other waits.
  await load(page,FX.cd({trigger:T('immediate'),frequency:{mode:'always'}},local(end))+FX.cpnb({trigger:T('immediate'),frequency:{mode:'always'},gate:true}),{scripts:[sectionScript('countdown-promo-popup','cd'),sectionScript('coupon-promotion-newsletter-popup','cp')]});
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-popup-state="open"]').length),1,'one popup at a time');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-popup-state="open"]').length),1,'the next one follows');
  assert.equal(await isOpen(page,'cp'),true);passed++;

  // Builder: a real section stays shut until selected.
  await load(page,FX.cd({design:true,preview:false,trigger:T('immediate'),frequency:{mode:'always'}},local(end)),{scripts:[sectionScript('countdown-promo-popup','cd')]});
  await page.waitForTimeout(150);
  assert.equal(await isOpen(page,'cd'),false);
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('shopify:block:select',{detail:{sectionId:'cd',blockId:'coupon'}})));
  assert.equal(await isOpen(page,'cd'),true,'block select opens its popup');
  // Redrawn after a change: still open, no duplicate listeners.
  await page.evaluate(html=>{const old=document.querySelector('.cdp-cd');const t=document.createElement('div');t.innerHTML=html;old.replaceWith(t.firstElementChild.nextElementSibling);document.dispatchEvent(new CustomEvent('storelib:section-load',{detail:{sectionId:'cd'}}));},FX.cd({design:true,trigger:T('immediate'),frequency:{mode:'always'}},local(end)).replace(/^<style>[\s\S]*?<\/style>\s*/,'<i></i>'));
  await page.waitForTimeout(100);
  assert.equal(await isOpen(page,'cd'),true,'stays open after the builder redraws it');passed++;

  // Spin wheel: lands inside the slice it reports, shows that slice's code,
  // offers a spin again on a no-prize slice, and is not offered again after a win.
  await page.emulateMedia({reducedMotion:'reduce'});
  const prizes=[['5%','SPIN5'],['10%','SPIN10'],['TRY',''],['15%','SPIN15'],['FREE','FREESHIP'],['TRY','']];
  for(const idx of [0,1,3,4,5,2]){
    await load(page,FX.sw({trigger:T('immediate'),frequency:{mode:'always'},spin:{seconds:0.3,turns:5,respins:1,noWin:'Better luck next time',copied:'Copied!',spinning:'Spinning'}},prizes),{scripts:[storelibStub,sectionScript('spin-wheel-popup','sw')],before:`(function(){var w=[1,1,1,1,1,1],t=6,target=${idx};var calls=0;Math.random=function(){calls++;return calls===1?(target+0.5)/t:0.5;};})();`});
    await page.waitForTimeout(100);
    await page.fill('.sw-formel-sw input','ada@example.com');
    await page.click('.sw-spin-btn-sw');
    await page.waitForTimeout(300);
    const r=await page.evaluate(()=>{const m=document.querySelector('.sw-wheel-svg-sw').style.transform.match(/rotate\(([-\d.]+)deg\)/);return {rot:+m[1],code:document.querySelector('[data-sw-win-code]').dataset.code,title:document.querySelector('[data-sw-win-title]').textContent,result:document.querySelector('.sw-sw').dataset.swResult,respin:getComputedStyle(document.querySelector('[data-sw-respin]')).display};});
    const under=((360-r.rot%360)%360+360)%360;
    assert(under>idx*60&&under<(idx+1)*60,`pointer inside slice ${idx} (${under.toFixed(1)}deg)`);
    assert(r.rot>=5*360,'several full turns');
    assert.equal(r.code,prizes[idx][1],'code of the slice under the pointer');
    if(prizes[idx][1]){assert.equal(r.result,'win');assert.equal(r.title,prizes[idx][0]);}
    else {assert.equal(r.result,'none');assert.equal(r.title,'Better luck next time');assert.equal(r.respin,'inline-flex','spin again offered');}
  }
  // The last one was a no-prize slice: spin again lands on a prize, the code copies, and the wheel is done.
  await page.evaluate(()=>{let c=0;Math.random=()=>(++c===1?(1+0.5)/6:0.5);});
  await page.click('[data-sw-respin]');
  await page.waitForTimeout(300);
  assert.equal(await page.$eval('[data-sw-win-code]',e=>e.dataset.code),'SPIN10');
  assert.equal(await page.$eval('[data-sw-respin]',e=>getComputedStyle(e).display),'none','no spins left after the second');
  await page.click('[data-sw-win-code]');await page.waitForTimeout(80);
  assert.equal(await clip(),'SPIN10');
  assert.equal(await page.evaluate(()=>localStorage.getItem('materia:popup:sw')),'done','not offered again after a win');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Smooth: the turn is a transform transition, not a jump.
  await load(page,FX.sw({trigger:T('immediate'),frequency:{mode:'always'},spin:{seconds:0.4,turns:5,respins:0}},prizes),{scripts:[storelibStub,sectionScript('spin-wheel-popup','sw')]});
  await page.waitForTimeout(100);
  await page.fill('.sw-formel-sw input','ada@example.com');
  await page.click('.sw-spin-btn-sw');
  await page.waitForTimeout(150);
  const mid=await page.$eval('.sw-wheel-svg-sw',e=>getComputedStyle(e).transform);
  assert.notEqual(mid,'none','wheel is mid-turn');
  assert.equal(await page.$eval('.sw-spin-btn-sw',e=>e.disabled),true,'spin button waits for the wheel');
  await page.waitForTimeout(500);
  assert.equal(await page.$eval('.sw-spin-btn-sw',e=>e.disabled),false);passed++;

  // Promotion popup discount (promobanner): once per session on top of the days; copy.
  await load(page,FX.pbp({trigger:T('immediate'),frequency:{mode:'always',session:true}}),{scripts:[sectionScript('promobanner','pb')]});
  await page.waitForTimeout(120);
  assert.equal(await isOpen(page,'pb'),true);
  await page.click('.pbp-copy');await page.waitForTimeout(80);
  assert.equal(await clip(),'SAVE20');
  await page.click('.pbp-close');
  await load(page,FX.pbp({trigger:T('immediate'),frequency:{mode:'always',session:true}}),{scripts:[sectionScript('promobanner','pb')],keep:true});
  await page.waitForTimeout(120);
  assert.equal(await isOpen(page,'pb'),false,'once per session');passed++;

  // Signup discount popup (promotional-popup): backdrop closes; signup means done.
  await load(page,FX.ppd({trigger:T('delay',{delay:0.1}),frequency:{mode:'session'}}),{scripts:[storelibStub,sectionScript('promotional-popup','pp')]});
  await page.waitForTimeout(300);
  assert.equal(await page.$eval('#ppd-pp',e=>e.dataset.open),'true');
  await page.mouse.click(10,10);
  assert.equal(await page.$eval('#ppd-pp',e=>e.dataset.open),'false','backdrop closes');
  await page.evaluate(()=>MateriaPopups.open('pp'));
  await page.fill('.ppd__field','ada@example.com');await page.click('.ppd__btn');await page.waitForTimeout(120);
  assert(+await page.evaluate(()=>localStorage.getItem('materia:popup:pp'))>Date.now()+300*864e5,'not offered for a year after signing up');passed++;

  // Promotional popup 2 and Promotional newsletter 2: the popup really opens now
  // (its CSS and script named a class the markup did not have).
  for(const [file,n,id] of [['promotionalpopup2','4','p2'],['promonewsletterpopup-2','3','n2']]){
    await load(page,FX.loudz(n,id,{trigger:T('delay',{delay:0.1}),frequency:{mode:'after_days',days:1}}),{scripts:[storelibStub,sectionScript(file,id)]});
    await page.waitForTimeout(300);
    assert.equal(await isOpen(page,id),true,file+' opens');
    assert(await page.$eval(`#loudz-${id} .loudz__popup`,e=>e.classList.contains('active')));
    await page.click(`#loudz-${id} .loudz__popup-link`);
    assert.equal(await isOpen(page,id),false,file+' no-thanks closes');
    await page.evaluate(i=>MateriaPopups.open(i),id);
    await page.mouse.click(5,5);
    assert.equal(await isOpen(page,id),false,file+' backdrop closes');
    await page.evaluate(i=>MateriaPopups.open(i),id);
    await page.fill(`#loudz-${id} input`,'ada@example.com');await page.click(`#loudz-${id} button[type="submit"]`);await page.waitForTimeout(120);
    assert(+await page.evaluate(i=>localStorage.getItem('materia:popup:'+i),id)>Date.now()+19*864e5,file+' remembers the signup');
  }
  passed++;

  // Image banner popup: scroll trigger; "Hide on phones".
  await load(page,FX.ib({trigger:T('scroll',{scroll:40}),frequency:{mode:'always'}}),{scripts:[sectionScript('promotional-image-popup','ib')]});
  await page.evaluate(()=>window.scrollTo(0,1200));await page.waitForTimeout(120);
  assert.equal(await isOpen(page,'ib'),true,'image popup opens on scroll');
  await page.click('.promobanner-popup-close-ib');
  assert.equal(await isOpen(page,'ib'),false);
  const phone=await open({viewport:{width:375,height:740},isMobile:true,hasTouch:true});
  await load(phone,FX.ib({phoneOff:true,trigger:T('immediate'),frequency:{mode:'always'}}),{scripts:[sectionScript('promotional-image-popup','ib')]});
  await phone.waitForTimeout(150);
  assert.equal(await isOpen(phone,'ib'),false,'hidden on phones when asked');
  passed++;

  // Back to top: shows after scrolling, scrolls smoothly (instantly under
  // reduced motion), is a real button, and sits above the mobile nav bar.
  const btt=read('sections/back-to-top-pro.storelib');
  const bttCss=`.top-bt{position:fixed;right:18px;bottom:max(90px, calc(var(--materia-bottom-inset, 0px) + 12px));width:46px;height:46px;opacity:0;visibility:hidden}.top-bt.is-visible{opacity:1;visibility:visible}`;
  const bttHtml=`<style>${bttCss}</style><div class="buttontoppro"><button type="button" class="top-bt" data-back-to-top="bt" data-show-after="300" aria-label="Back to top"><svg viewBox="-1 -1 102 102"><path class="progress-path-bt" d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" pathLength="100"></path></svg></button></div><main id="MainContent">Main</main>`;
  await load(page,bttHtml,{scripts:[sectionScript('back-to-top-pro','bt')]});
  await page.waitForTimeout(100);
  assert.equal(await page.$eval('.top-bt',e=>e.classList.contains('is-visible')),false,'hidden at the top');
  await page.evaluate(()=>window.scrollTo(0,800));await page.waitForTimeout(120);
  assert.equal(await page.$eval('.top-bt',e=>e.classList.contains('is-visible')),true,'shown after scrolling');
  assert(+await page.$eval('.progress-path-bt',e=>parseFloat(e.style.strokeDashoffset))<100,'progress ring follows');
  await page.focus('.top-bt');await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  assert(await page.evaluate(()=>window.scrollY)>0,'smooth, not a jump');
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(()=>window.scrollY),0,'back at the top');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.scrollTo(0,800));await page.waitForTimeout(120);
  await page.click('.top-bt');await page.waitForTimeout(30);
  assert.equal(await page.evaluate(()=>window.scrollY),0,'instant under reduced motion');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert(/<button type="button" class="top-\{\{ section\.id \}\}"/.test(btt),'back to top is a button');
  await load(phone,bttHtml.replace('<main','<nav class="mobile-navigation-bar" style="position:fixed;left:0;right:0;bottom:0;height:62px;background:#eee"></nav><main'),{scripts:[sectionScript('back-to-top-pro','bt')]});
  await phone.waitForTimeout(1300);
  assert.equal(await phone.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--materia-bottom-inset').trim()),'62px','mobile nav bar measured');
  await phone.evaluate(()=>{const c=document.createElement('cookie-consent');c.innerHTML='<div data-consent-panel style="position:fixed;left:0;right:0;bottom:62px;height:160px;background:#ddd"></div>';document.body.appendChild(c);c.setAttribute('data-open','');});
  await phone.waitForTimeout(150);
  assert.equal(await phone.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--materia-bottom-inset').trim()),'222px','open cookie banner measured');
  await phone.evaluate(()=>window.scrollTo(0,800));await phone.waitForTimeout(150);
  const rects=await phone.evaluate(()=>({b:document.querySelector('.top-bt').getBoundingClientRect().bottom,c:document.querySelector('[data-consent-panel]').getBoundingClientRect().top}));
  assert(rects.b<=rects.c,'back to top sits above the cookie banner');
  await phone.context().close();passed++;

  // Order notifications and custom colours (markup).
  const fo=read('sections/fake-order.storelib');
  assert.equal((fo.match(/var\(--materia-bottom-inset/g)||[]).length,3,'notification bottoms clear the nav bar and cookie banner');
  assert(/<button type="button" class="fake-order-close"/.test(fo),'close is a button');
  assert(/prefers-reduced-motion/.test(fo));
  const cc=read('sections/custom-colors.storelib');
  assert(/if has_color or block_st\.color_image != blank/.test(cc),'empty colours print nothing');
  assert(!/background-image: initial !important/.test(cc),'no longer wipes the swatch picture');
  const swf=read('sections/spin-wheel-popup.storelib');
  assert(/conic-gradient\(from 0deg/.test(swf)&&/assign mid_deg = idx \| plus: 0\.5 \| times: 360\.0/.test(swf),'wheel colours, labels and pointer share one angle');
  passed++;
  return passed;
}

(async()=>{
  let passed=0;
  // ---- static checks ----------------------------------------------------
  const previous=f=>{try{return execSync(`git -C ${JSON.stringify(root)} show c291e12:sections/${f}.storelib`,{encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch(e){return null;}};
  for(const file of [...POPUPS,...OTHERS]){
    const text=read('sections/'+file+'.storelib');
    assert(text.startsWith('<template compat="shopify">'),file+' first line');
    const model=schemaOf(text);
    assert((model.settings||[]).length<=120,file+' at most 120 settings');
    for(const list of [model.settings||[],...(model.blocks||[]).map(b=>b.settings||[])]){
      const ids=list.map(s=>s.id).filter(Boolean);
      assert.equal(new Set(ids).size,ids.length,file+' unique ids');
      for(const s of list){
        if(s.type==='header'){assert(s.content&&s.content.length<=24,file+' short header '+s.content);continue;}
        assert(!/shopify|liquid/i.test((s.label||'')+' '+(s.info||'')),file+' '+s.id+' label names no Shopify or Liquid');
        if(s.visible_if){
          const m=s.visible_if.match(/^\{\{ (section|block)\.settings\.(\w+)( (==|!=) ('[\w-]+'|true|false))? \}\}$/);
          assert(m,file+' simple visible_if '+s.visible_if);
          assert(list.some(o=>o.id===m[2]),file+' visible_if reads a declared setting '+m[2]);
          assert(m[3],file+' visible_if compares ('+s.visible_if+')');
        }
      }
    }
    const before=previous(file);
    if(before){
      const now=new Set(idsOf(model));
      for(const id of idsOf(schemaOf(before))) assert(now.has(id),file+' keeps setting id '+id);
    }
    const markup=text.split('<schema>')[0];
    assert(!/\son[a-z]+\s*=\s*["']/i.test(markup),file+' no inline event handlers');
    assert(!/\{%-?\s*form 'customer'/.test(markup),file+' signup is a Storelib subscribe form');
    for(const form of markup.matchAll(/<form\s[^>]*>/g)) assert(/data-storelib-form="subscribe"/.test(form[0]),file+' form posts to Subscribers');
    for(const tag of markup.matchAll(/<(?:a|button)\b[^>]*class="[^"]*\bbtn-(?:primary|outline)\b[^"]*"[^>]*>/g)) assert(/data-theme-button="(primary|secondary)"/.test(tag[0]),file+' theme button contract');
    if(POPUPS.includes(file)){
      // Closed popups are out of the tab order (visibility), never taller than
      // the screen, still under reduced motion, with a 44px close button.
      assert(/visibility: hidden/.test(markup)&&/visibility 0s linear/.test(markup),file+' closed state leaves the tab order');
      assert(/prefers-reduced-motion: reduce/.test(markup),file+' reduced motion');
      assert(/--sl-vh|overflow-y: auto/.test(markup),file+' fits the screen height (or scrolls inside)');
      assert(/data-popup-close/.test(markup)&&/(width|min-width): 44px|min-width: 44px/.test(markup),file+' 44px close button');
      assert(!/2dbags\.co|ctfassets/.test(markup),file+' no third-party placeholder images');
    }
  }
  const names=POPUPS.map(f=>schemaOf(read('sections/'+f+'.storelib')).name);
  assert.equal(new Set(names).size,names.length,'popup section names are unique');
  const group=JSON.parse(read('sections/overlay-group.json'));
  for(const s of Object.values(group.sections)) assert(fs.existsSync(path.join(root,'sections',s.type+'.storelib')),'overlay type exists '+s.type);
  passed++;

  // ---- browser ----------------------------------------------------------
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const manager=read('shopify/assets/materia-popups.js');
  let doc='';
  const open=async(ctxOpts={})=>{
    const ctx=await browser.newContext({viewport:{width:1280,height:800},...ctxOpts});
    await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://materia.test'}).catch(()=>{});
    const page=await ctx.newPage();
    page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
    await page.route('https://materia.test/**',route=>route.fulfill({contentType:'text/html',body:doc}));
    return page;
  };
  // A generic popup in the shape every section draws: root[data-popup-root]
  // with data-popup-config, a backdrop, a dialog with a close button.
  const generic=(id,cfg,inner='')=>`<div class="pp" data-popup-root="${id}" data-popup-config='${JSON.stringify(cfg)}' aria-hidden="true">
      <div class="pp__bg" data-bg></div>
      <div class="pp__card" role="dialog" aria-modal="true" aria-label="${id}" tabindex="-1">
        <button type="button" class="pp__x" data-popup-close aria-label="Close">x</button>
        <input type="email" aria-label="Email" data-popup-autofocus><a href="#a">Link</a>${inner}
      </div></div>`;
  const genericScript=`window.MateriaPopupsQueue=window.MateriaPopupsQueue||[];document.querySelectorAll('[data-popup-root]').forEach(function(r){MateriaPopupsQueue.push(function(P){var c=JSON.parse(r.dataset.popupConfig);
      window['api_'+r.dataset.popupRoot]=P.register(Object.assign({id:r.dataset.popupRoot,root:r,dialog:r.querySelector('.pp__card'),backdrop:r.querySelector('[data-bg]'),open:function(){r.classList.add('is-open')},close:function(){r.classList.remove('is-open')}},c));});});`;
  const css=`.pp__bg,.pp__card{position:fixed;visibility:hidden;opacity:0}.pp__bg{inset:0;background:#0008}.pp__card{top:30%;left:30%;width:300px;background:#fff;padding:20px}.is-open .pp__bg,.is-open .pp__card{visibility:visible;opacity:1}`;
  const load=async(page,body,{before='',keep=false,scripts=[]}={})=>{
    doc=`<!doctype html><html><head><style>${css}</style></head><body><button id="outside">Outside</button><div style="height:3000px">Page</div>${body}</body></html>`;
    await page.goto('https://materia.test/');
    if(!keep) await page.evaluate(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){}});
    if(before) await page.evaluate(before);
    for(const s of scripts) await page.addScriptTag({content:s});
    await page.addScriptTag({content:manager});
  };
  const isOpen=(page,id)=>page.$eval(`[data-popup-root="${id}"]`,el=>el.getAttribute('data-popup-state')==='open');

  try {
    const page=await open();
    // Delay trigger: not before, then open; focus moves in; Escape closes and gives focus back.
    await load(page,generic('a',{trigger:{mode:'delay',delay:0.4},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.focus('#outside');
    await page.waitForTimeout(150);
    assert.equal(await isOpen(page,'a'),false,'waits for the delay');
    await page.waitForTimeout(450);
    assert.equal(await isOpen(page,'a'),true,'opens after the delay');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Email','focus moved into the popup');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'hidden','page scroll locked');
    // Tab stays inside.
    for(let i=0;i<4;i++) await page.keyboard.press('Tab');
    assert(await page.evaluate(()=>document.querySelector('.pp__card').contains(document.activeElement)),'Tab stays in the dialog');
    await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(()=>document.querySelector('.pp__card').contains(document.activeElement)),'Shift+Tab stays in the dialog');
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page,'a'),false,'Escape closes');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'outside','focus given back');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'','scroll unlocked');passed++;

    // Close button and backdrop.
    await load(page,generic('a',{trigger:{mode:'immediate'},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.waitForTimeout(80);
    await page.click('[data-popup-close]');
    assert.equal(await isOpen(page,'a'),false,'close button closes');
    await page.evaluate(()=>api_a.show());
    assert.equal(await isOpen(page,'a'),true);
    await page.mouse.click(20,700);
    assert.equal(await isOpen(page,'a'),false,'backdrop click closes');passed++;

    // Scroll trigger.
    await load(page,generic('a',{trigger:{mode:'scroll',scroll:50},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.waitForTimeout(80);
    assert.equal(await isOpen(page,'a'),false);
    await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(80);
    assert.equal(await isOpen(page,'a'),false,'not at 600 / 2200');
    await page.evaluate(()=>window.scrollTo(0,1300));await page.waitForTimeout(80);
    assert.equal(await isOpen(page,'a'),true,'opens past 50%');passed++;

    // Exit intent on a desktop pointer.
    await load(page,generic('a',{trigger:{mode:'exit',delay:0.3},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.waitForTimeout(500);
    assert.equal(await isOpen(page,'a'),false,'desktop exit intent does not use the delay');
    await page.mouse.move(400,300);await page.mouse.move(400,0);
    await page.evaluate(()=>document.dispatchEvent(new MouseEvent('mouseout',{clientX:400,clientY:0,relatedTarget:null,bubbles:true})));
    assert.equal(await isOpen(page,'a'),true,'opens when the pointer leaves at the top');passed++;

    // Page views: the second page.
    await load(page,generic('a',{trigger:{mode:'pageviews',views:2,delay:0},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.waitForTimeout(80);
    assert.equal(await isOpen(page,'a'),false,'first page view');
    await load(page,generic('a',{trigger:{mode:'pageviews',views:2,delay:0},frequency:{mode:'always'}}),{scripts:[genericScript],keep:true});
    await page.waitForTimeout(80);
    assert.equal(await isOpen(page,'a'),true,'second page view');passed++;

    // Inactivity.
    await load(page,generic('a',{trigger:{mode:'inactivity',idle:1},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.waitForTimeout(600);await page.mouse.move(10,10);await page.waitForTimeout(600);
    assert.equal(await isOpen(page,'a'),false,'activity resets the idle timer');
    await page.waitForTimeout(600);
    assert.equal(await isOpen(page,'a'),true,'opens when idle');passed++;

    // Frequency: after days, session, never, every visit; storage that throws.
    const freq=async(mode,days,keep)=>{await load(page,generic('a',{trigger:{mode:'immediate'},frequency:{mode,days}}),{scripts:[genericScript],keep});await page.waitForTimeout(80);return isOpen(page,'a');};
    assert.equal(await freq('after_days',3,false),true);
    await page.click('[data-popup-close]');
    assert.equal(await freq('after_days',3,true),false,'hidden for the days chosen');
    const until=await page.evaluate(()=>+localStorage.getItem('materia:popup:a'));
    assert(Math.abs(until-Date.now()-3*864e5)<5000,'remembered for 3 days');
    await page.evaluate(()=>localStorage.setItem('materia:popup:a',String(Date.now()-1)));
    assert.equal(await freq('after_days',3,true),true,'shown again once the days pass');
    assert.equal(await freq('session',0,false),true);
    assert.equal(await freq('session',0,true),false,'once per session');
    assert.equal(await freq('never',0,false),true);
    await page.evaluate(()=>sessionStorage.clear());
    assert.equal(await freq('never',0,true),false,'once ever');
    assert.equal(await freq('always',0,false),true);
    assert.equal(await freq('always',0,true),true,'every visit');
    await load(page,generic('a',{trigger:{mode:'immediate'},frequency:{mode:'after_days',days:2}}),{scripts:[genericScript],before:`Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}});Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked')}});`});
    await page.waitForTimeout(80);
    assert.equal(await isOpen(page,'a'),true,'blocked storage still shows');
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page,'a'),false);
    assert.deepEqual(page.errors,[]);passed++;

    // One popup at a time: the second waits for the first to close.
    await load(page,generic('a',{trigger:{mode:'immediate'},frequency:{mode:'always'}})+generic('b',{trigger:{mode:'delay',delay:0.2},frequency:{mode:'always'},gap:100}),{scripts:[genericScript]});
    await page.waitForTimeout(400);
    assert.equal(await isOpen(page,'a'),true);
    assert.equal(await isOpen(page,'b'),false,'second popup waits');
    assert.deepEqual(await page.evaluate(()=>MateriaPopups.queued()),['b']);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    assert.equal(await isOpen(page,'b'),true,'queued popup opens after');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-popup-state="open"]').length),1);
    // A manual opener replaces the open one instead of stacking.
    await page.evaluate(()=>api_a.show());
    assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-popup-state="open"]').length),1,'never two at once');passed++;

    // The cookie banner asks first.
    await load(page,'<cookie-consent data-open></cookie-consent>'+generic('a',{trigger:{mode:'immediate'},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.waitForTimeout(200);
    assert.equal(await isOpen(page,'a'),false,'waits for the cookie banner');
    await page.evaluate(()=>{document.querySelector('cookie-consent').removeAttribute('data-open');document.dispatchEvent(new CustomEvent('materia:consent',{detail:{accepted:true}}));});
    await page.waitForTimeout(700);
    assert.equal(await isOpen(page,'a'),true,'opens after the cookie answer');passed++;

    // Manual link.
    await load(page,'<a href="#" id="opener" data-popup-open="a">Open</a>'+generic('a',{trigger:{mode:'manual'},frequency:{mode:'after_days',days:5}}),{scripts:[genericScript]});
    await page.waitForTimeout(150);
    assert.equal(await isOpen(page,'a'),false);
    await page.click('#opener');
    assert.equal(await isOpen(page,'a'),true,'opens from its link');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'opener');passed++;

    // The builder: no trigger runs; opens on select, closes on deselect; preview stays open.
    await load(page,generic('a',{design:true,trigger:{mode:'immediate'},frequency:{mode:'always'}})+generic('b',{design:true,preview:true,trigger:{mode:'immediate'},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await page.waitForTimeout(150);
    assert.equal(await isOpen(page,'a'),false,'no trigger in the builder');
    assert.equal(await isOpen(page,'b'),true,'Show in the builder');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('shopify:section:select',{detail:{sectionId:'a'}})));
    assert.equal(await isOpen(page,'a'),true,'opens when selected');
    assert.equal(await isOpen(page,'b'),false,'one at a time in the builder too');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'','builder page keeps scrolling');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('shopify:section:deselect',{detail:{sectionId:'a'}})));
    assert.equal(await isOpen(page,'a'),false,'closes on deselect');
    assert.equal(await page.evaluate(()=>localStorage.length),1,'only the page view count is stored in the builder');passed++;

    // Touch screens: exit intent falls back to the delay.
    const phone=await open({viewport:{width:375,height:740},isMobile:true,hasTouch:true});
    await load(phone,generic('a',{trigger:{mode:'exit',delay:0.3},frequency:{mode:'always'}}),{scripts:[genericScript]});
    await phone.waitForTimeout(600);
    assert.equal(await isOpen(phone,'a'),true,'exit intent on a phone opens after the delay');
    await phone.context().close();passed++;

    // ---- sections -------------------------------------------------------
    passed=await sectionTests({open,load,isOpen,sectionScript,passed});
  } finally { await browser.close(); }
  console.log(`${passed} popup trigger, frequency, close, focus, queue and section checks passed`);
})().catch(e=>{console.error(e);process.exit(1);});
