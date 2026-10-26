const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;try{
 for(const width of [390,1280]){
  const p=await browser.newPage({viewport:{width,height:850}});
  await p.setContent('<section id="page-faq" class="qx">Page questions stay here</section><test-recommendations class="cart-recommend"><div class="swiper-wrapper"></div><div class="cart-upsell-wrapper"></div></test-recommendations>');
  const src=read('shopify/assets/cart-components.js');
  const helpers=src.slice(0,src.indexOf('// theme.js loads this file'));
  const fetcher=src.slice(src.indexOf('class BaseFetcher'),src.indexOf('class CartUpsell extends'));
  await p.addScriptTag({content:helpers+fetcher+';customElements.define("test-recommendations",class extends BaseFetcher{});'});
  const card='<div class="product-item"><h3>Recommended product</h3><button>Add to cart</button><section class="qx"><h3>Questions</h3><details><summary>When will my order arrive?</summary></details></section></div>';
  const response='<div class="swiper-wrapper"><div class="swiper-slide">Unrelated page slider</div></div><div data-cart-upsell-results class="cart-upsell"><div class="swiper-wrapper"><div class="swiper-slide">'+card+'</div><section class="qx">More questions</section><div class="swiper-slide"><section class="qx">FAQ-only slide</section></div></div><div class="cart-upsell-wrapper"><div class="cart-upsell-item">'+card+'</div></div></div>';
  for(const selector of ['.swiper-wrapper','.cart-upsell-wrapper']){
   await p.locator('test-recommendations').evaluate((el,{html,selector})=>el.updateContent(html,selector,selector),{html:response,selector});
   const target=p.locator('test-recommendations '+selector);
   assert.equal(await target.locator('.product-item').count(),1);assert.equal(await target.locator('.qx,details').count(),0);
   assert(!(await target.textContent()).includes('Unrelated'));checks++;
  }
  assert.equal(await p.locator('#page-faq').textContent(),'Page questions stay here');checks++;
  await p.locator('test-recommendations').evaluate(el=>{el.innerHTML='<section class="qx">Late FAQ</section><div class="product-item">Product</div>';materiaPruneRecommendationExtras(el);});
  assert.equal(await p.locator('test-recommendations .qx').count(),0);assert.equal(await p.locator('#page-faq').count(),1);checks++;
  await p.close();
 }
 console.log(checks+' recommendation-source and FAQ isolation checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
