// LIQUIDJS=<installed liquidjs path> node tests/theme-testimonials-grid.cjs
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const filename=path.join(__dirname,'theme-empty-block-previews.cjs'),helper=new Module(filename,module);
helper.filename=filename;helper.paths=module.paths;
helper._compile(read('tests/theme-empty-block-previews.cjs').split('(async()=>{')[0]+'\nmodule.exports={engine,clean,schema};',filename);
const {engine,clean,schema}=helper.exports;
engine.registerTag('style',{
 parse(tok,remain){this.tpls=[];const stream=this.liquid.parser.parseStream(remain);stream.on('tag:endstyle',()=>stream.stop()).on('template',t=>this.tpls.push(t));stream.start();},
 *render(ctx,em){em.write('<style>');yield this.liquid.renderer.renderTemplates(this.tpls,ctx,em);em.write('</style>');}
});
const model=schema('sections/testimonials.storelib').shopify;
const defaults=list=>Object.fromEntries(list.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const block=(type,id,settings)=>({type,id,settings:{...defaults(model.blocks.find(b=>b.type===type).settings),...settings}});
const base={settings:{scroll_animation:'none'},request:{design_mode:false},section:{id:'grid',settings:{...defaults(model.settings),display_mode:'grid'},blocks:[block('heading','heading',{text:'Customer stories'}),block('testimonial','one',{quote:'<p>Customer supplied review.</p>',name:'Reviewer',role:'',avatar:'',rating:4}),block('testimonial','two',{quote:'<p>Another supplied review.</p>',name:'Second reviewer',role:'',avatar:'',rating:0})]}};
const render=ctx=>engine.parseAndRender(clean(read('sections/testimonials.storelib')),ctx,{globals:ctx});
(async()=>{
 let checks=0;
 for(const list of [model.settings,...model.blocks.map(b=>b.settings)]){const ids=list.map(x=>x.id).filter(Boolean);assert.equal(new Set(ids).size,ids.length);}checks++;
 const old=JSON.parse(require('node:child_process').execFileSync('git',['show','HEAD:sections/testimonials.storelib'],{encoding:'utf8'}).match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify;
 for(const [a,b]of [[old.settings,model.settings],...old.blocks.map(x=>[x.settings,model.blocks.find(y=>y.type===x.type).settings])])for(const s of a.filter(x=>x.id))assert(b.some(x=>x.id===s.id),'preserve '+s.id);checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:375,height:850}});
  const styles='<style>:root{--body-font:Arial;--body-font-size:18px;--body-line-height:1.6;--heading-font:Arial;--heading-weight:600;--heading-font-scale:1;--responsive-rate:0;--color-text:rgb(30,40,50);--color-heading:rgb(10,20,30);--color-background:white;--color-border:#ccc}body{margin:0}.container,.fluid_container{padding:16px;box-sizing:border-box}.text-center{text-align:center}h2{font-size:32px}.swiper-wrapper{display:flex}.swiper-slide{flex:0 0 70%}</style>';
  const set=async ctx=>page.setContent(styles+'<style>'+read('shopify/assets/testimonials.css')+'</style><div id="shopify-section-grid">'+await render(ctx)+'</div>'); // the section links its cached testimonials.css
  base.section.settings.card_bg='#ff0000';base.section.settings.quote_size=28;base.section.blocks[0].settings.font_size_mobile=50;
  await set(base);
  assert.equal(await page.locator('.tm-head--heading').evaluate(el=>getComputedStyle(el).fontSize),'32px');
  assert.equal(await page.locator('.tm-card__quote').first().evaluate(el=>getComputedStyle(el).fontSize),'18px');
  assert.equal(await page.locator('.tm-card').first().evaluate(el=>getComputedStyle(el).color),'rgb(30, 40, 50)');
  assert(!await page.locator('.tm-card').first().evaluate(el=>getComputedStyle(el).backgroundColor==='rgb(255, 0, 0)'));checks++;
  await page.evaluate(()=>document.documentElement.style.setProperty('--body-font-size','21px'));
  assert.equal(await page.locator('.tm-card__quote').first().evaluate(el=>getComputedStyle(el).fontSize),'21px');checks++;
  base.section.settings.enable_custom_colors=true;base.section.settings.enable_custom_typography=true;base.section.blocks[0].settings.enable_custom_typography=true;
  await set(base);
  assert.equal(await page.locator('.tm-head--heading').evaluate(el=>getComputedStyle(el).fontSize),'50px');
  assert.equal(await page.locator('.tm-card__quote').first().evaluate(el=>getComputedStyle(el).fontSize),'28px');
  assert.equal(await page.locator('.tm-card').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 0, 0)');checks++;
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});await set(base);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}checks++;
  base.section.settings.card_style='outline';await set(base);assert.equal(await page.locator('.tm-card').first().evaluate(el=>getComputedStyle(el).borderTopWidth),'1px');checks++;
  base.section.settings.card_style='clean';await set(base);assert.equal(await page.locator('.tm-card').first().evaluate(el=>getComputedStyle(el).paddingTop),'0px');checks++;
  base.section.settings.reveal=false;base.settings.scroll_animation='slide_in';await set(base);assert.equal(await page.locator('motion-element.scroll-trigger').count(),0);checks++;
  base.section.settings.display_mode='carousel';base.section.settings.show_arrow=true;base.section.settings.pagination_style='progress';base.section.settings.pagination_position='right';await set(base);
  assert.equal(await page.locator('button.swiper-arrow').count(),2);assert.equal(await page.locator('slide-section').getAttribute('data-pagination-progressbar'),'true');
  await page.locator('.tm-pagination').evaluate(el=>el.classList.add('swiper-pagination-progressbar'));
  assert.equal(await page.locator('.tm-pagination').evaluate(el=>getComputedStyle(el).marginRight),'0px');checks++;
  base.section.settings.carousel_pagination='disable';await set(base);assert.equal(await page.locator('.tm-pagination').count(),0);checks++;
  assert.equal(await page.locator('.tm-card__rating').count(),1);checks++;
  // Exercise the actual shared slider and bundled Swiper, not a slider mock.
  await page.setViewportSize({width:375,height:850});
  await page.addScriptTag({content:read('shopify/assets/swiper-bundle.min.js')});
  const global=read('shopify/assets/global.js');
  await page.addScriptTag({content:global.slice(global.indexOf('class SlideSection extends'),global.indexOf('customElements.define("slide-section"'))+'\nSlideSection.prototype.init=function(){};customElements.define("slide-section",SlideSection);'});
  await page.evaluate(()=>{window.Motion={inView:(el,fn)=>{fn();return ()=>{};}};});
  for(const style of ['dot','pill','line','square','ring','number','progress']){
   base.section.settings.carousel_pagination='show';base.section.settings.pagination_style=style;
   await set(base);await page.addStyleTag({content:read('shopify/assets/swiper-bundle.min.css')});
   await page.locator('slide-section').evaluate(el=>el.initSlide());
   assert.equal(await page.locator('slide-section').evaluate(el=>el.globalSlide.params.pagination.type),style==='progress'?'progressbar':'bullets');
   await page.locator('button.swiper-button-next').click();
   assert.equal(await page.locator('slide-section').evaluate(el=>el.globalSlide.activeIndex),1);checks++;
  }
  await page.emulateMedia({reducedMotion:'reduce'});base.section.settings.autoplay=true;
  await set(base);await page.addStyleTag({content:read('shopify/assets/swiper-bundle.min.css')});await page.locator('slide-section').evaluate(el=>el.initSlide());
  assert.equal(await page.locator('slide-section').evaluate(el=>el.globalSlide.params.speed),0);
  assert.equal(await page.locator('slide-section').evaluate(el=>el.globalSlide.autoplay.running),false);checks++;
  console.log(checks+' testimonials grid schema, inheritance, overrides, layouts and mobile checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
