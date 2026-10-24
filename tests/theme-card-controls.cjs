const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  await page.setContent(`<style>:root{--body-font-size:18px;--color-background:#e0f0e0;--color-heading:#123456;--btn-primary-bg-color:#123456;--btn-primary-color:#fff;--btn-border-width:2px}</style><script type="application/json" data-card-style-settings>${JSON.stringify({enable_custom_card_actions:false,card_atc_button:'outline',card_atc_bg:'#ff0000',card_atc_color:'#111111',card_wish_bg:'#eeaabb',card_wish_border:'#445566',product_size:14,price_size:15,product_name_text_transform:'uppercase'})}</script><body data-btn-style="ghost" data-btn-secondary-style="soft" data-btn-hover="slide"><div class="product-item morden"><a class="product-item__name">Product</a><button name="add" class="product-item__button-submit" data-theme-button="secondary" data-button-outline="true">Add</button><button-wishlist class="product-item__button-wishlist"><svg><path/></svg></button-wishlist></div></body>`);
  await page.addStyleTag({content:read('shopify/assets/theme-button-contract.css')});
  await page.addScriptTag({content:read('shopify/assets/materia-experience.js')});
  await page.addScriptTag({content:read('shopify/assets/product-card-settings.js')});
  const button=page.locator('button[name=add]');
  assert.equal(await button.getAttribute('data-theme-button'),'primary');
  assert.equal(await button.getAttribute('data-button-appearance'),'ghost');
  assert.equal(await button.evaluate(el=>getComputedStyle(el).getPropertyValue('--mb-bg').trim()),'');
  const update=async settings=>{
   await page.evaluate(settings=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings,live:true}})),settings);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  };
  await update({enable_custom_card_actions:true});
  assert.equal(await button.getAttribute('data-theme-button'),'secondary');
  assert.equal(await button.getAttribute('data-button-appearance'),'outline');
  assert.equal(await button.evaluate(el=>getComputedStyle(el).getPropertyValue('--mb-bg').trim()),'#ff0000');
  assert.equal(await page.$eval('button-wishlist',el=>getComputedStyle(el).borderTopColor),'rgb(68, 85, 102)');
  await update({card_atc_bg:'#aabbcc',card_atc_button:'secondary',product_size:17});
  assert.equal(await button.getAttribute('data-button-appearance'),'soft');
  assert.equal(await button.evaluate(el=>getComputedStyle(el).getPropertyValue('--mb-bg').trim()),'#aabbcc');
  assert.equal(await page.$eval('.product-item__name',el=>getComputedStyle(el).fontSize),'17px');
  await update({enable_custom_card_actions:false});
  assert.equal(await button.getAttribute('data-button-appearance'),'ghost');
  assert.equal(await button.getAttribute('data-theme-button'),'primary');
  assert.equal(await page.$eval('[data-card-style-live]',el=>el.textContent),'');
  await update({enable_custom_card_actions:true,card_atc_button:'auto'});
  assert.equal(await button.getAttribute('data-button-appearance'),'outline');
  await page.$eval('.product-item',el=>{el.classList.remove('morden');el.classList.add('style-as-morden');});
  await update({card_atc_button:'auto'});
  assert.equal(await button.getAttribute('data-button-appearance'),'outline','current Modern markup follows the style default');
  assert.equal(await button.evaluate(el=>getComputedStyle(el).getPropertyValue('--mb-bg').trim()),'#aabbcc','picker values survive disabling');
  for (const color of ['transparent','rgba(0,0,0,0)','#12345600']) {
   await update({card_atc_bg:color});
   assert.equal(await button.evaluate(el=>getComputedStyle(el).getPropertyValue('--mb-bg').trim()),'',color+' falls back to the scheme');
  }
  // The creator may switch it on; what matters is that it starts off.
  assert.equal(JSON.parse(read('shopify/config/settings_schema.json')).flatMap(g=>g.settings||[]).find(x=>x.id==='enable_custom_card_actions').default,false);
  console.log('Card override defaults, live toggle, retained colours, typography and primary/secondary roles passed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
