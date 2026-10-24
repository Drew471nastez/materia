/* Estimate Shipping country picker: a dropdown on desktop, a bottom sheet on
   phones, the native select kept in the form as the value the estimate reads. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const js=read('shopify/assets/materia-experience.js');
const css=read('shopify/assets/materia-experience.css');
const sheets=read('snippets/cart-drawer-sheets.storelib').match(/<style data-cart-drawer-sheets>([\s\S]*?)<\/style>/)[1];
const data=JSON.stringify({rates:'DE, AT = 4.90\n* = 9.90',delivery:'',freePage:'',freeDrawer:'',subtotal:5000,currency:'EUR',country:'',text:{choose:'Choisir un pays',rateTo:'Livraison vers {{ country }}',free:'Gratuit',freeOver:'Gratuit dès {{ amount }}',atCheckout:'Calculé au paiement pour {{ country }}'}});
const form=(extra='')=>`<cart-estimate id="shipping" class="addon"><div class="addon-content"><div data-address="root"><div class="form-group flex flex-column"><label for="address_country">Pays</label><select id="address_country" class="form-control" name="address[country]" data-default="United States" data-search-label="Rechercher"${extra}></select></div><div class="form-group"><label for="AddressZip">Code postal</label><input type="text" class="form-control" id="AddressZip" name="address[zip]"></div></div><div class="addon-actions"><button type="button" class="btn-primary btn-save w-full" data-action="shipping">Estimer</button></div><div class="addon-message"></div></div></cart-estimate>`;
const shell=body=>`<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--color-background:#fffaf2;--color-text:#333;--color-heading:#111;--color-border:#ccc;--input-height:52px;--input-border-radius:3px;--inputs-border-width:2px;--input-bg:#fff;--input-color:#222;--input-border-color:#999;--card-radius:10px}body{margin:0;font-family:sans-serif;background:var(--color-background)}main{padding:40px 16px;max-width:420px;box-sizing:border-box}</style></head><body><main>${body}</main><div style="height:1400px"></div><script id="materia-shipping-data" type="application/json">${data}</script></body></html>`;
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  let passed=0;
  try {
    /* Desktop: dropdown under the field. */
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/cart.js',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({total_price:5000,currency:'EUR'})}));
    await page.goto('about:blank');
    await page.setContent(shell(form()));
    assert(await page.$eval('#address_country',el=>el.getClientRects().length>0&&!el.classList.contains('mcp-native')),'without the script the plain select is shown');
    await page.addStyleTag({content:css});
    await page.addScriptTag({content:js});
    await page.waitForSelector('.mcp-trigger');
    const native=await page.$eval('#address_country',el=>({cls:el.classList.contains('mcp-native'),form:!!el.closest('[data-address="root"]'),tab:el.tabIndex,count:el.options.length,clip:getComputedStyle(el).clipPath}));
    assert(native.cls&&native.form&&native.tab===-1&&native.count>200,'the select stays in the form, filled, out of the tab order');
    assert.equal(native.clip,'inset(50%)');
    const look=await page.$eval('.mcp-trigger',el=>{const s=getComputedStyle(el);return {h:el.getBoundingClientRect().height,r:s.borderTopLeftRadius,b:s.borderTopWidth,bg:s.backgroundColor,c:s.color,bc:s.borderTopColor}});
    assert.deepEqual(look,{h:52,r:'3px',b:'2px',bg:'rgb(255, 255, 255)',c:'rgb(34, 34, 34)',bc:'rgb(153, 153, 153)'},'the field follows Theme settings > Fields');
    assert.equal(await page.$eval('.mcp-trigger',el=>el.getAttribute('aria-labelledby').split(' ').map(id=>document.getElementById(id).textContent.trim()).join(' ')),'Pays '+await page.$eval('#address_country',el=>el.value?el.options[el.selectedIndex].textContent:'Choisir un pays'));passed++;

    await page.evaluate(()=>{window.log=[];const s=document.getElementById('address_country');s.addEventListener('change',()=>log.push('change:'+s.value));s.addEventListener('input',()=>log.push('input:'+s.value));});
    await page.click('.mcp-trigger');
    await page.waitForTimeout(260);
    const open=await page.evaluate(()=>{const p=document.querySelector('.mcp-panel'),t=document.querySelector('.mcp-trigger').getBoundingClientRect(),r=p.getBoundingClientRect(),s=getComputedStyle(p);return {expanded:document.querySelector('.mcp-trigger').getAttribute('aria-expanded'),dropdown:p.classList.contains('is-dropdown'),below:r.top>=t.bottom&&r.top-t.bottom<12,width:Math.round(r.width)===Math.round(t.width),opacity:s.opacity,transform:s.transform,radius:s.borderTopLeftRadius,role:p.querySelector('.mcp-list').getAttribute('role'),options:p.querySelectorAll('[role="option"]').length,focus:document.activeElement===p.querySelector('input'),top:p.matches(':popover-open')}});
    assert.deepEqual(open,{expanded:'true',dropdown:true,below:true,width:true,opacity:'1',transform:'none',radius:'10px',role:'listbox',options:await page.$eval('#address_country',el=>el.options.length-1),focus:true,top:true});passed++;

    // Accent-insensitive search, and a no-matches state.
    await page.keyboard.type('etats');
    let shown=await page.$$eval('.mcp-option:not([hidden])',els=>els.map(e=>e.dataset.value));
    assert(shown.includes('US'),'"etats" finds États-Unis');
    assert(await page.$eval('.mcp-empty',el=>el.hidden));
    await page.fill('.mcp-search input','zzzq');
    assert.equal(await page.$$eval('.mcp-option:not([hidden])',els=>els.length),0);
    assert(await page.$eval('.mcp-empty',el=>!el.hidden&&el.getClientRects().length>0&&el.textContent==='No matches'));passed++;

    // Keyboard: filter, arrow, Enter selects; the select fires input and change.
    await page.fill('.mcp-search input','au');
    const firstTwo=await page.$$eval('.mcp-option:not([hidden])',els=>els.slice(0,2).map(e=>e.dataset.value));
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.$eval('.mcp-search input',el=>document.getElementById(el.getAttribute('aria-activedescendant')).dataset.value),firstTwo[1]);
    assert.equal(await page.$eval('.mcp-panel',el=>el.dataset.nav),'key');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    assert.equal(await page.$eval('#address_country',el=>el.value),firstTwo[1]);
    assert.deepEqual(await page.evaluate(()=>log),['input:'+firstTwo[1],'change:'+firstTwo[1]]);
    assert.equal(await page.$eval('.mcp-trigger',el=>el.getAttribute('aria-expanded')),'false');
    assert(await page.$eval('.mcp-panel',el=>el.hidden));
    assert(await page.evaluate(()=>document.activeElement===document.querySelector('.mcp-trigger')),'focus returns to the field');
    assert.equal(await page.$eval('.mcp-value',el=>el.textContent),await page.$eval('#address_country',el=>el.options[el.selectedIndex].textContent));passed++;

    // Type-ahead from the closed field, Escape closes, outside click closes.
    await page.keyboard.press('a');
    await page.waitForTimeout(30);
    assert.equal(await page.$eval('.mcp-search input',el=>el.value),'a');
    assert.equal(await page.$eval('.mcp-trigger',el=>el.getAttribute('aria-expanded')),'true');
    await page.keyboard.type('llem');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#address_country',el=>el.value),'DE');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.$eval('.mcp-trigger',el=>el.getAttribute('aria-expanded')),'true');
    assert.equal(await page.$eval('.mcp-option[aria-selected="true"]',el=>el.dataset.value),'DE');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('.mcp-trigger',el=>el.getAttribute('aria-expanded')),'false');
    await page.click('.mcp-trigger');
    await page.mouse.click(1100,700);
    assert.equal(await page.$eval('.mcp-trigger',el=>el.getAttribute('aria-expanded')),'false');passed++;

    // A mouse pick, then the estimate reads the select as before.
    await page.click('.mcp-trigger');await page.waitForTimeout(240);
    await page.fill('.mcp-search input','autri');
    await page.click('.mcp-option:not([hidden])');
    assert.equal(await page.$eval('#address_country',el=>el.value),'AT');
    await page.click('[data-action="shipping"]');
    await page.waitForFunction(()=>document.querySelector('.addon-message').textContent.includes('4,90'));
    assert.match(await page.$eval('.addon-message',el=>el.textContent),/Autriche/);passed++;

    // A label click reaches the picker, not the hidden select.
    await page.click('label[for="address_country"]');
    assert(await page.evaluate(()=>document.activeElement===document.querySelector('.mcp-trigger')));passed++;

    // Reduced motion: nothing animates.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.click('.mcp-trigger');
    assert.equal(await page.$eval('.mcp-panel',el=>getComputedStyle(el).transitionDuration),'0s');
    await page.keyboard.press('Escape');
    assert(await page.$eval('.mcp-panel',el=>el.hidden),'closes at once under reduced motion');
    await page.emulateMedia({reducedMotion:'no-preference'});passed++;
    assert.deepEqual(errors,[]);
    await page.close();

    /* Phone: bottom sheet with handle, search, backdrop and drag to close. */
    const phone=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const phoneErrors=[];phone.on('pageerror',e=>phoneErrors.push(e.message));
    await phone.setContent(shell(form()));
    await phone.addStyleTag({content:css});
    await phone.addScriptTag({content:js});
    await phone.waitForSelector('.mcp-trigger');
    await phone.evaluate(()=>{window.log=[];document.getElementById('address_country').addEventListener('change',e=>log.push(e.target.value));});
    await phone.tap('.mcp-trigger');
    await phone.waitForTimeout(500);
    const sheet=await phone.evaluate(()=>{const p=document.querySelector('.mcp-panel'),r=p.getBoundingClientRect(),b=document.querySelector('.mcp-backdrop');return {sheet:p.classList.contains('is-sheet'),bottom:Math.round(r.bottom),left:r.left,width:r.width,grab:getComputedStyle(p.querySelector('.mcp-grab')).display,backdrop:b.classList.contains('open')&&getComputedStyle(b).opacity==='1',overscroll:getComputedStyle(p.querySelector('.mcp-list')).overscrollBehaviorY,ownScroll:p.querySelector('.mcp-list').scrollHeight>p.querySelector('.mcp-list').clientHeight,minOption:Math.min(...[...p.querySelectorAll('.mcp-option')].slice(0,20).map(o=>o.getBoundingClientRect().height)),keyboardDown:document.activeElement!==p.querySelector('input'),scrollX:document.documentElement.scrollWidth<=innerWidth}});
    assert.deepEqual(sheet,{sheet:true,bottom:844,left:0,width:390,grab:'block',backdrop:true,overscroll:'contain',ownScroll:true,minOption:48,keyboardDown:true,scrollX:true});
    assert(await phone.$eval('.mcp-panel',el=>getComputedStyle(el).paddingBottom!==''&&/safe-area-inset-bottom/.test([...document.styleSheets].flatMap(s=>[...s.cssRules]).map(r=>r.cssText).join(''))),'the sheet keeps clear of the home indicator');passed++;
    await phone.tap('.mcp-search input');
    await phone.keyboard.type('Bresil');
    assert.deepEqual(await phone.$$eval('.mcp-option:not([hidden])',els=>els.map(e=>e.dataset.value)),['BR']);
    await phone.tap('.mcp-option[data-value="BR"]');
    await phone.waitForTimeout(500);
    assert.equal(await phone.$eval('#address_country',el=>el.value),'BR');
    assert.deepEqual(await phone.evaluate(()=>log),['BR']);
    assert(await phone.evaluate(()=>document.querySelector('.mcp-panel').hidden&&!document.querySelector('.mcp-backdrop').classList.contains('open')));passed++;
    // The backdrop closes it; dragging the handle down closes it.
    await phone.tap('.mcp-trigger');await phone.waitForTimeout(500);
    await phone.mouse.click(195,60);
    await phone.waitForTimeout(450);
    assert.equal(await phone.$eval('.mcp-trigger',el=>el.getAttribute('aria-expanded')),'false');
    await phone.tap('.mcp-trigger');await phone.waitForTimeout(500);
    const head=await phone.$eval('.mcp-head',el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+8}});
    await phone.mouse.move(head.x,head.y);await phone.mouse.down();
    for(let i=1;i<=10;i++){await phone.mouse.move(head.x,head.y+i*40);}
    await phone.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));
    assert(await phone.$eval('.mcp-panel',el=>el.classList.contains('is-dragging')&&new DOMMatrix(getComputedStyle(el).transform).m42>300&&getComputedStyle(el).transitionDuration==='0s'),'the sheet follows the pointer with no transition');
    await phone.mouse.up();
    await phone.waitForTimeout(450);
    assert.equal(await phone.$eval('.mcp-trigger',el=>el.getAttribute('aria-expanded')),'false');
    assert.equal(await phone.$eval('#address_country',el=>el.value),'BR','dragging away keeps the choice');passed++;
    assert.deepEqual(phoneErrors,[]);
    await phone.close();

    /* Cart drawer: the form is swapped by section fetches and the builder. */
    const drawer=await browser.newPage({viewport:{width:1280,height:800}});
    const drawerErrors=[];drawer.on('pageerror',e=>drawerErrors.push(e.message));
    const drawerForm=`<form id="minicart-form"><div class="cart-footeraddon cart__addon-content is-open" id="shipping"><div class="addon-content"><div data-address="root"><div class="form-group flex flex-column"><label for="address_country">Pays</label><select id="address_country" class="form-control" name="address[country]" data-search-label="Rechercher"></select></div><div class="form-group flex flex-column"><label for="AddressZip">Code postal</label><input type="text" class="form-control" id="AddressZip" name="address[zip]"></div></div></div><div class="addon-actions"><button type="button" class="btn-primary btn-save" data-action="shipping">Estimer</button></div><div class="addon-message"></div></div></form>`;
    await drawer.setContent(shell(`<div id="minicart_wrapper" class="open_drawer"><div class="minicart__wrapper" style="position:relative;transform:translateX(0);overflow:hidden;height:500px"><div id="drawer-section">${drawerForm}</div></div></div>`));
    await drawer.addStyleTag({content:css});await drawer.addStyleTag({content:sheets});
    await drawer.addScriptTag({content:js});
    await drawer.waitForSelector('.mcp-trigger');
    // The drawer's own field look (its scheme background) with Theme settings > Fields sizes.
    const dl=await drawer.$eval('#shipping .mcp-trigger',el=>{const s=getComputedStyle(el);return {h:el.getBoundingClientRect().height,full:Math.round(el.getBoundingClientRect().width)===Math.round(el.closest('.form-group').getBoundingClientRect().width),r:s.borderTopLeftRadius,b:s.borderTopWidth,bg:s.backgroundColor,pad:s.paddingLeft}});
    assert.deepEqual(dl,{h:52,full:true,r:'3px',b:'2px',bg:'rgb(255, 250, 242)',pad:'14px'});
    assert.equal(await drawer.$eval('#address_country',el=>el.getBoundingClientRect().width<=1||getComputedStyle(el).clipPath==='inset(50%)'),true);passed++;
    // The panel escapes the drawer's overflow (top layer) and stays in its scheme.
    await drawer.click('.mcp-trigger');await drawer.waitForTimeout(250);
    assert(await drawer.$eval('.mcp-panel',el=>el.matches(':popover-open')&&getComputedStyle(el).backgroundColor==='rgb(255, 250, 242)'));
    await drawer.keyboard.type('Allem');await drawer.keyboard.press('Enter');
    assert.equal(await drawer.$eval('#address_country',el=>el.value),'DE');passed++;
    // A section fetch swaps #minicart-form; the new form gets one fresh picker.
    await drawer.click('.mcp-trigger');
    await drawer.evaluate(html=>{document.getElementById('minicart-form').outerHTML=html;},drawerForm);
    await drawer.waitForTimeout(80);
    assert.equal(await drawer.locator('.mcp').count(),1);
    assert.equal(await drawer.locator('.mcp-trigger').getAttribute('aria-expanded'),'false');
    await drawer.click('.mcp-trigger');await drawer.waitForTimeout(250);
    assert(await drawer.$eval('.mcp-panel',el=>!el.hidden&&el.querySelectorAll('.mcp-option').length>200));
    await drawer.keyboard.press('Escape');passed++;
    // The builder copies an already drawn picker (no script attached) and fires section-load twice.
    await drawer.evaluate(()=>{
      const section=document.getElementById('drawer-section');
      section.innerHTML=section.innerHTML;
      section.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:'drawer'}}));
      section.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:'drawer'}}));
    });
    await drawer.waitForTimeout(80);
    assert.equal(await drawer.locator('.mcp').count(),1,'a copied picker is replaced, not doubled');
    await drawer.click('.mcp-trigger');await drawer.waitForTimeout(250);
    assert.equal(await drawer.locator('.mcp-trigger').getAttribute('aria-expanded'),'true','the replacement works');
    await drawer.keyboard.press('Escape');passed++;
    // On a phone the sheet leaves the drawer's transform and overflow behind.
    await drawer.setViewportSize({width:390,height:844});
    await drawer.click('.mcp-trigger');await drawer.waitForTimeout(500);
    assert.deepEqual(await drawer.$eval('.mcp-panel',el=>{const r=el.getBoundingClientRect();return {sheet:el.classList.contains('is-sheet'),bottom:Math.round(r.bottom),width:r.width}}),{sheet:true,bottom:844,width:390});
    await drawer.click('.mcp-backdrop',{position:{x:195,y:40}});await drawer.waitForTimeout(450);
    assert.equal(await drawer.locator('.mcp-trigger').getAttribute('aria-expanded'),'false');passed++;
    assert.deepEqual(drawerErrors,[]);
  } finally {await browser.close();}
  console.log(`${passed} shipping country picker checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
