// LIQUIDJS=<installed liquidjs path> node tests/theme-empty-block-previews.cjs
const {Liquid}=require(process.env.LIQUIDJS || 'liquidjs');
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const clean=source=>source.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/,'').replace(/<\/template>\s*$/,'').replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm,'');
const engine=new Liquid({root:[path.join(root,'snippets')],extname:'.storelib',strictFilters:false,jsTruthy:false,fs:{
 readFileSync:file=>clean(fs.readFileSync(file,'utf8')),readFile:async file=>clean(fs.readFileSync(file,'utf8')),
 existsSync:fs.existsSync,exists:async file=>fs.existsSync(file),resolve:(dir,file,ext)=>path.join(dir,file+ext),contains:()=>true,dirname:path.dirname,sep:'/'
}});
engine.registerFilter('t',key=>String(key).split('.').pop());engine.registerFilter('asset_url',key=>key);engine.registerFilter('stylesheet_tag',()=> '');
const blocks=clean(read('snippets/product-info-blocks.storelib'));
const branch=type=>'{% case block.type %}'+blocks.slice(blocks.indexOf("{%- when '"+type+"' -%}"),blocks.indexOf('{%- when ',blocks.indexOf("{%- when '"+type+"' -%}")+10))+'{% endcase %}';
const schema=file=>JSON.parse(read(file).match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]);
const defaults=type=>Object.fromEntries(schema('sections/main-product.storelib').shopify.blocks.find(b=>b.type===type).settings.filter(s=>s.id&&'default'in s).map(s=>[s.id,s.default]));
(async()=>{
 let checks=0;
 for(const file of ['sections/main-product.storelib','sections/featured-product.storelib']){
  const data=schema(file),standard=data.shopify.blocks.find(b=>b.type==='text'),panel=data.blocks.find(b=>b.type==='text');
  for(const group of [standard,panel])assert(group.settings.find(s=>s.id==='heading').default&&group.settings.find(s=>s.id==='content').default);checks++;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  const base=type=>({block:{id:'empty-'+type,type,settings:defaults(type),shopify_attributes:'data-editor-block="'+type+'"'},request:{design_mode:true},product:{},current_product:{},collections:{all:{products:[]}},all_products:{},shop:{},section:{id:'preview'},settings:{}});
  const cases=[['text',branch('text')],['upsell_pro',clean(read('snippets/upsell-pro.storelib'))],['bundle',clean(read('snippets/product-offers.storelib'))],['quantity_offer',clean(read('snippets/product-offers.storelib'))],['pair_with_upsell',branch('pair_with_upsell')],['product_addon',branch('product_addon')]];
  for(const [type,source]of cases){
   const context=base(type);context.kind=type;
   if(type==='text')context.block.settings={heading:'',content:'<p><br></p>'};
   context.block_st=context.block.settings;
   for(const mode of ['library','canvas-fallback','live']){
    context.request.design_mode=mode==='library';
    const html=await engine.parseAndRender(source,context,{globals:{request:context.request}});
    await page.setViewportSize({width:375,height:800});
    await page.setContent('<html class="'+(mode==='canvas-fallback'?'shopify-design-mode':'')+'"><style>:root{--color-text:#333;--color-heading:#111;--color-background:#fff;--color-border:#ccc}body{margin:16px}</style>'+html);
    const preview=page.locator('.materia-block-preview');
    assert.equal(await preview.count(),1,type+' retains one selectable preview');
    assert.equal(await preview.isVisible(),mode!=='live',type+' '+mode);
    assert.equal(await preview.locator('button,input,a,[data-offer-add],[data-upsell-add]').count(),0,'preview has no commerce actions');
    if(mode!=='live'){
     assert((await preview.boundingBox()).height>=70);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'preview fits phone/library thumbnail');
    }checks++;
   }
  }
  const context=base('text');context.block_st=context.block.settings;
  const text=await engine.parseAndRender(branch('text'),context);
  assert(text.includes('Product details')&&text.includes('Add product details here.'));assert(!text.includes('materia-block-preview'));checks++;
  // Explicitly clearing saved content remains empty on the storefront.
  context.request.design_mode=false;context.block_st={heading:'',content:''};
  await page.setContent(await engine.parseAndRender(branch('text'),context));assert.equal(await page.locator('.materia-block-preview').isVisible(),false);checks++;
  const invalid=base('upsell_pro');invalid.block.settings.manual_product_1='deleted-product';
  let empty=await engine.parseAndRender(clean(read('snippets/upsell-pro.storelib')),invalid,{globals:{request:invalid.request}});
  assert(!empty.includes('<upsell-pro'));assert(empty.includes('No selected products can be shown'));checks++;
  const addon=base('product_addon');addon.block.settings.addon_product='accessory';
  const selected={id:'accessory',handle:'accessory',title:'Accessory',available:true,variants:[{id:'variant-a',available:true,price:100}],selected_or_first_available_variant:{id:'variant-a',available:true,price:100}};
  addon.all_products={accessory:selected};
  const filled=await engine.parseAndRender(branch('product_addon'),addon,{globals:{request:addon.request,all_products:{accessory:selected}}});
  assert(filled.includes('id="PA-empty-product_addon"'));assert(!filled.includes('materia-block-preview'));checks++;
  invalid.block.settings.manual_product_1={id:'current',handle:'current',title:'Current product'};invalid.current_product=invalid.block.settings.manual_product_1;invalid.block.settings.hide_current_product=true;
  empty=await engine.parseAndRender(clean(read('snippets/upsell-pro.storelib')),invalid,{globals:{request:invalid.request}});
  assert(!empty.includes('<upsell-pro'));assert(empty.includes('No selected products can be shown'));checks++;
  const detect=read('layout/theme.storelib').match(/try \{\s*const editor = new URL\(document.referrer\);[\s\S]*?\} catch \(_\) \{\}/)[0];
  for(const framed of [false,true]){
   let marked=false;const win={};win.top=framed?{}:win;
   new Function('document','window',detect)({referrer:'https://storelib.com/website-builder/editor/test',documentElement:{classList:{add:()=>{marked=true}}}},win);
   assert.equal(marked,framed,'a published site opened from the builder does not acquire editor placeholders');checks++;
  }
  console.log(`${checks} new-block defaults, isolated library, editor fallback, blank rich text and storefront checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
