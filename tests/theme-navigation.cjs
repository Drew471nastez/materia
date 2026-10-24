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
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fixture.test/**',route=>route.fulfill({contentType:'text/html',body:'<style>main a{display:block;height:30px}</style><main><a href="/products/a">A</a><a href="/products/a">Duplicate</a><a href="/products/b">B</a><a href="/products/c" data-no-prefetch>Excluded</a><a href="/products/d">D</a><a href="/products/e" style="display:none">Hidden</a><a href="/products/f?token=private">F</a><a href="/account/logout">Logout</a><a href="/cart">Cart</a></main>'}));
    // Browsers with speculation rules: the visible products become one bounded
    // prefetch list (the platform's own rules handle hover), and hover adds nothing.
    await page.goto('https://fixture.test/collections/rules');
    await page.addScriptTag({content:read('shopify/assets/theme-navigation.js')});
    await page.waitForTimeout(250);
    const rules=await page.evaluate(()=>[...document.querySelectorAll('script[type=speculationrules]')].map(s=>JSON.parse(s.textContent)));
    assert.equal(rules.length,1);
    assert.deepEqual(rules[0].prefetch[0].urls,['/products/a','/products/b','/products/d']);
    await page.hover('a[href="/products/b"]');await page.waitForTimeout(120);
    assert.equal(await page.locator('link[rel=prefetch]').count(),0,'no second fetch beside speculation rules');passed++;
    // Browsers without them: plain prefetch hints.
    await page.addInitScript(()=>{HTMLScriptElement.supports=()=>false;});
    await page.goto('https://fixture.test/collections/all');
    await page.addScriptTag({content:read('shopify/assets/theme-navigation.js')});
    await page.waitForTimeout(250);
    const paths=await page.locator('link[rel=prefetch]').evaluateAll(links=>links.map(l=>new URL(l.href).pathname));
    assert.deepEqual(paths,['/products/a','/products/b','/products/d']);passed++;
    // No click interception: the browser retains its normal link/history path.
    await page.evaluate(()=>{document.addEventListener('click',event=>{window.wasIntercepted=event.defaultPrevented;event.preventDefault();});document.querySelector('a').click();});
    assert.equal(await page.evaluate(()=>window.wasIntercepted),false);passed++;
    await page.hover('a[href="/account/logout"]');
    await page.hover('a[href="/cart"]');
    await page.hover('a[href="/products/f?token=private"]');await page.waitForTimeout(120);
    assert.equal(await page.locator('link[rel=prefetch]').count(),4,'hover warms one more page, never cart or logout');passed++;
    const report=await page.evaluate(()=>materiaNavigationTiming());
    assert.equal(report.type,'navigate');
    assert(report.domReadyMs>=0);assert(report.serverResponseMs>=0);
    assert(!JSON.stringify(report).includes('token='),'diagnostics must not expose URL queries');passed++;
    await page.goto('https://fixture.test/collections/saving');
    await page.evaluate(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));
    await page.addScriptTag({content:read('shopify/assets/theme-navigation.js')});
    await page.waitForTimeout(200);
    assert.equal(await page.locator('link[rel=prefetch]').count(),0,'respect data saving');
    assert.equal(await page.evaluate(()=>typeof materiaNavigationTiming),'function');passed++;
    const layout=read('layout/theme.storelib');
    assert(layout.indexOf("'critical.css'")<layout.indexOf('{{ content_for_header }}'));
    assert(layout.indexOf("'theme-button-contract.css'")<layout.indexOf('{{ content_for_header }}'));
    assert(layout.indexOf('{{ content_for_header }}')<layout.indexOf("'global.js'"));
    assert.equal((layout.match(/\{\{ content_for_header \}\}/g)||[]).length,1);passed++;
    assert.deepEqual(errors,[]);
    console.log(`${passed} navigation resource, privacy and native-link checks passed`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
