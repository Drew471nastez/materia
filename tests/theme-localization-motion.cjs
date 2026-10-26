const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const source=read('shopify/assets/theme.js');
const cls=source.slice(source.indexOf('class LocalizationForm'),source.indexOf('customElements.define("localization-form", LocalizationForm);')+'customElements.define("localization-form", LocalizationForm);'.length);
(async()=>{
 let checks=0;
 for(const file of fs.readdirSync(path.join(__dirname,'../templates')).filter(x=>x.endsWith('.json'))){const t=JSON.parse(read('templates/'+file));assert(!Object.values(t.sections||{}).some(s=>s.type==='size-chart-data'),'no editor data section in '+file);}checks++;
 assert(read('layout/theme.storelib').includes("render 'product-size-chart-data'"));
 assert(!read('shopify/assets/size-chart.js').includes("ask(url, 'size-chart-data')"));checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const picker=id=>`<localization-form id="${id}"><form><input type="hidden" name="country_code" value="C199"><button type="button" class="button-localization">${id}</button><div class="disclosure__list"><ul data-country-options></ul></div></form></localization-form>`;
  const rows=Array.from({length:240},(_,i)=>['C'+i,'Country '+i,'EUR','€','']);
  await p.setContent('<style>:root{--color-background:white;--color-text:#222;--color-heading:#111;--color-border:#ccc}body{margin:0}button{min-height:44px}</style>'+picker('country')+picker('language')+'<script type="application/json" id="materia-country-options">'+JSON.stringify(rows)+'</script>');
  await p.addStyleTag({content:read('shopify/assets/critical.css')+read('shopify/assets/theme.css')});await p.addScriptTag({content:cls});
  await p.locator('#country button').click();await p.waitForTimeout(380);
  assert.equal(await p.locator('body > .materia-localization-sheet.is-open').count(),1);assert.equal(await p.locator('body > .materia-localization-sheet li').count(),240);checks++;
  const height=await p.locator('body > .materia-localization-sheet').evaluate(el=>el.offsetHeight);
  await p.locator('body > .materia-localization-sheet input[type=search]').fill('Country 19');
  assert.equal(await p.locator('body > .materia-localization-sheet').evaluate(el=>el.offsetHeight),height);checks++;
  await p.evaluate(()=>{
   const form=document.querySelector('#country'),list=form.elements.list;
   window.heightReads=0;const get=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetHeight').get;
   Object.defineProperty(list,'offsetHeight',{get(){heightReads++;return get.call(this);},configurable:true});
   const head=list.querySelector('.loc-sheet-head');
   const touch=(type,y)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:[{clientY:y}]});head.dispatchEvent(e);};
   touch('touchstart',30);for(let i=0;i<25;i++)touch('touchmove',31+i);touch('touchend',55);
  });
  assert.equal(await p.evaluate(()=>heightReads),1,'drag caches height; no layout read per move');checks++;
  await p.evaluate(()=>document.querySelector('#country').hidePanel());await p.waitForTimeout(40);
  await p.evaluate(()=>document.querySelector('#country').openSelector());await p.waitForTimeout(420);
  assert.equal(await p.locator('body > .materia-localization-sheet.is-open').count(),1);checks++;
  await p.evaluate(()=>document.querySelector('#language').openSelector());await p.waitForTimeout(420);
  assert.equal(await p.locator('body > .materia-localization-sheet.is-open').count(),1);assert.equal(await p.locator('#country .disclosure__list').count(),1);checks++;
  await p.keyboard.press('Escape');await p.waitForTimeout(390);
  assert.equal(await p.locator('body > .materia-localization-sheet').count(),0);assert.equal(await p.locator('#language button').getAttribute('aria-expanded'),'false');checks++;
  await p.locator('#country button').click();await p.waitForTimeout(380);await p.locator('.loc-sheet-backdrop').click({position:{x:10,y:10}});await p.waitForTimeout(390);
  assert.equal(await p.locator('body > .materia-localization-sheet').count(),0);checks++;
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#country button').click();await p.waitForTimeout(60);
  assert.equal(await p.locator('body > .materia-localization-sheet').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  await p.evaluate(()=>document.querySelector('#country').hidePanel());await p.waitForTimeout(20);assert.equal(await p.locator('body > .materia-localization-sheet').count(),0);checks++;
  await p.emulateMedia({reducedMotion:'no-preference'});await p.locator('#country button').click();await p.waitForTimeout(80);await p.setViewportSize({width:1280,height:800});await p.waitForTimeout(400);assert.equal(await p.locator('body > .materia-localization-sheet').count(),0);checks++;
  // Builder moves keep resize cleanup; older engines work without popovers.
  await p.evaluate(()=>{const el=document.querySelector('#country');el.remove();document.body.prepend(el);HTMLElement.prototype.showPopover=undefined;});
  await p.setViewportSize({width:390,height:844});await p.locator('#country button').click();await p.waitForTimeout(380);
  assert.equal(await p.locator('body > .materia-localization-sheet.is-open').count(),1);
  await p.setViewportSize({width:1280,height:800});await p.waitForTimeout(400);assert.equal(await p.locator('body > .materia-localization-sheet').count(),0);checks++;
  assert.deepEqual(errors,[]);checks++;
  console.log(checks+' background-chart, large localization list, frame-batched drag and sheet lifecycle checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
