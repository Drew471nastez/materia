const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {renderPage,FID}=require('./theme-featured-product-round5.cjs');
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const rendered=await renderPage({design:true});
 for(const width of [390,1366]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='fixture.test')return route.fulfill({status:204,body:''});if(u.pathname==='/')return route.fulfill({body:rendered.html,contentType:'text/html'});if(u.pathname.startsWith('/assets/')){const file=path.join(process.cwd(),'shopify/assets',u.pathname.slice(8));return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});}if(u.pathname.startsWith('/img/'))return route.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#345678"/></svg>',contentType:'image/svg+xml'});return route.fulfill({body:'',contentType:'text/html'});});
  await page.goto('https://fixture.test/');const section=page.locator('#shopify-section-'+FID);await section.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('media-gallery slide-with-thumbs')?.globalSlide?.initialized);
  await page.waitForTimeout(500);
  await page.evaluate(()=>{const g=document.querySelector('media-gallery'),holder=g.querySelector('slide-with-thumbs');window.originalGallery=g;window.originalSwiper=holder.globalSlide;window.originalThumbs=holder.thumbnailSlide;holder.globalSlide.slideTo(1,0);});
  for(let i=0;i<12;i++){
   await section.evaluate((el,payload)=>{el.innerHTML=payload.html;el.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:payload.id}}));document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{section:payload.id,live:true,settings:{padding_top:payload.i}}}));},{html:rendered.sectionHtml,id:FID,i});
   await page.waitForTimeout(25);
   assert(await page.evaluate(()=>document.querySelector('media-gallery')===originalGallery));assert(await page.evaluate(()=>document.querySelector('media-gallery slide-with-thumbs').globalSlide===originalSwiper));assert.equal(await page.evaluate(()=>originalSwiper.activeIndex),1);checks++;
  }
  assert(await page.evaluate(()=>document.querySelector('media-gallery slide-with-thumbs').thumbnailSlide===originalThumbs));checks++;
  await page.evaluate(()=>{const el=originalSwiper.el;el.className='swiper-wrapper-preview swiper';el.removeAttribute('style');originalSwiper.wrapperEl.removeAttribute('style');window.MateriaProductUi.healGallery(originalGallery,true);});
  assert(await page.evaluate(()=>originalSwiper===document.querySelector('slide-with-thumbs').globalSlide&&!originalSwiper.destroyed));assert.equal(await page.evaluate(()=>originalSwiper.activeIndex),1);checks++;
  // A genuine gallery configuration change must not retain stale controls.
  await section.evaluate((el,html)=>{const t=document.createElement('template');t.innerHTML=html;t.content.querySelector('media-gallery').dataset.mtGalleryConfig+='|changed';el.replaceChildren(t.content);el.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true}));},rendered.sectionHtml);
  await page.waitForFunction(()=>document.querySelector('media-gallery')!==originalGallery);assert(await page.evaluate(()=>originalSwiper.destroyed));checks++;
  await page.close();
 }
 console.log(checks+' actual rendered gallery identity, active slide, thumbnail and genuine-layout-change checks passed');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});
