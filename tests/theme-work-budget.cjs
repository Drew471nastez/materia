/* Verify component updates do not repeatedly walk the whole storefront. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  let passed=0;
  try {
    const page=await browser.newPage();
    await page.setContent('<div id="changed" class="bls-image-js"><img id="one" class="bls-loading-image"></div><div class="bls-image-js"><img id="two" class="bls-loading-image"></div>');
    await page.evaluate(()=>{
      window.observed=[];
      window.IntersectionObserver=class {observe(el){observed.push(el.id)}unobserve(){}};
      document.querySelectorAll('img').forEach(img=>Object.defineProperty(img,'complete',{get:()=>false}));
    });
    const global=read('shopify/assets/global.js');
    await page.addScriptTag({content:global.slice(0,global.indexOf('/* THEME EDITOR FIX'))});
    assert.deepEqual(await page.evaluate(()=>observed),['one','two']);
    await page.evaluate(()=>{
      observed.length=0;window.documentScans=0;
      const query=document.querySelectorAll.bind(document);
      document.querySelectorAll=selector=>{documentScans++;return query(selector)};
      document.getElementById('one').setAttribute('src','changed');
      BlsLazyloadImg.init(document.getElementById('changed'));
    });
    assert.deepEqual(await page.evaluate(()=>observed),['one']);
    assert.equal(await page.evaluate(()=>documentScans),0);passed++;
    await page.evaluate(()=>{observed.length=0;const img=document.getElementById('one');img.setAttribute('src','changed-again');BlsLazyloadImg.init(img)});
    assert.deepEqual(await page.evaluate(()=>observed),['one'],'an image passed as the scope is included');passed++;
    await page.close();

    const buttons=await browser.newPage();
    await buttons.setContent('<body data-btn-style="solid"><section id="a" class="shopify-section"><button class="btn-primary">A</button></section><section id="b" class="shopify-section"><button class="btn-primary">B</button></section></body>');
    await buttons.addScriptTag({content:read('shopify/assets/materia-experience.js')});
    await buttons.evaluate(()=>{
      window.buttonScans=0;
      const query=document.querySelectorAll.bind(document);
      document.querySelectorAll=selector=>{if(selector.includes('data-theme-button')||selector.includes('product-detail__buy-buttons'))buttonScans++;return query(selector)};
      document.getElementById('a').dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true}));
    });
    assert.equal(await buttons.evaluate(()=>buttonScans),0,'section update stays inside its section');passed++;
    await buttons.evaluate(()=>document.dispatchEvent(new CustomEvent('materia:theme-applied',{detail:{settings:{color_schemes:{}}}})));
    assert.equal(await buttons.evaluate(()=>buttonScans),0,'CSS-only edits do not rebuild button attributes');passed++;
    await buttons.evaluate(()=>{document.body.dataset.btnStyle='outline';document.dispatchEvent(new CustomEvent('materia:theme-applied',{detail:{settings:{btn_style:'outline'}}}))});
    assert.equal(await buttons.locator('[data-button-appearance="outline"]').count(),2,'appearance controls still update globally');passed++;
    await buttons.close();

    const timers=await browser.newPage();await timers.setContent('<main>Fixture</main>');
    const layout=read('layout/theme.storelib');
    const queue=layout.slice(layout.indexOf('var lastScan = 0'),layout.indexOf("addEventListener('scroll', queueScan"));
    const budget=await timers.evaluate(source=>{
      const pending=new Map();let id=0,now=1000,runs=0;
      window.setTimeout=(fn,delay)=>{pending.set(++id,{fn,delay});return id};
      window.clearTimeout=id=>pending.delete(id);
      window.requestAnimationFrame=fn=>fn();Date.now=()=>now;
      const scan=()=>runs++;
      const getQueue=new Function('scan',source+';return queueScan;');
      const schedule=getQueue(scan);
      for(let i=0;i<10;i++){
        now+=500;schedule();
        for(const [key,timer] of [...pending])if(timer.delay<=500){pending.delete(key);timer.fn();}
      }
      return {pending:pending.size,runs};
    },queue);
    assert.deepEqual(budget,{pending:2,runs:10},'continuous scrolling retains only two settling timers');passed++;
    await timers.close();
    console.log(`${passed} scoped initialization and background-work checks passed`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
