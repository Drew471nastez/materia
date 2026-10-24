const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage();
  await page.setContent('<style>body{margin:0}mobile-navigation-bar{display:flex;position:fixed;bottom:0;left:0;right:0;height:80px;--mnb-fg:#123456}a{display:flex;align-items:center;justify-content:center;width:120px;height:80px}svg{width:24px;height:24px}</style><mobile-navigation-bar><a id="shop" href="/collections/all"><svg><path d="M0 0h24v24H0z"/></svg><span>Shop</span></a></mobile-navigation-bar>');
  for(const f of ['materia-experience.css'])await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'../shopify/assets/',f),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../shopify/assets/materia-experience.js'),'utf8')});
  await page.evaluate(()=>{window.clicks=0;document.getElementById('shop').addEventListener('click',e=>{e.preventDefault();clicks++;window.clickedTarget=e.target.id;});});
  const rect=await page.locator('#shop svg').boundingBox();const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  const touch=await context.newCDPSession(page);
  const down=()=>touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  const up=()=>touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await down();await page.waitForTimeout(30);
  assert(await page.locator('#shop').evaluate(el=>el.hasAttribute('data-nav-pressed')),'touch-down gives immediate feedback');
  assert.equal(await page.$eval('#shop',el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','no grey box behind a pressed tab');
  assert.notEqual(await page.$eval('#shop',el=>getComputedStyle(el).transform),'none','pressed tab answers with a slight scale');
  await up();await page.waitForTimeout(30);
  assert.equal(await page.evaluate(()=>clicks),1,'first tap activates once without a second tap');
  assert.equal(await page.evaluate(()=>clickedTarget),'shop','SVG touches reach the action, not its decorative children');
  await page.waitForTimeout(160);assert.equal(await page.locator('[data-nav-pressed]').count(),0);
  await down();await up();await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>clicks),2,'subsequent taps also activate only once');
  await page.waitForTimeout(160);await down();await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(30);
  assert.equal(await page.locator('[data-nav-pressed]').count(),0,'cancelled gestures do not leave pressed styling');
  await page.emulateMedia({reducedMotion:'reduce'});await down();await page.waitForTimeout(30);
  assert.equal(await page.$eval('#shop',el=>getComputedStyle(el).transform),'none');await up();
  console.log('5 real touch-input feedback and single-activation checks passed');
  await context.close();
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
