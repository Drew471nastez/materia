const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),Module=require('module');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const file=path.join(__dirname,'theme-empty-block-previews.cjs'),helper=new Module(file,module),source=read('tests/theme-empty-block-previews.cjs');helper.filename=file;helper.paths=module.paths;
helper._compile(source.slice(0,source.indexOf('(async()=>{'))+'\nmodule.exports={engine,clean,schema};',file);
const {engine,clean,schema}=helper.exports;
(async()=>{let checks=0;
 for(const file of ['sections/main-product.storelib','sections/featured-product.storelib','blocks/review_and_sold.storelib']){
  const s=schema(file);for(const model of [s,s.shopify]){
   const block=file.startsWith('blocks/')?model:model.blocks.find(b=>b.type==='review_and_sold');assert.equal(block.name,'Sold counter');
   for(const id of ['review_label','review_style','review_source','manual_review_count','manual_review_rating','show_review','star_color'])assert.equal(block.settings.find(s=>s.id===id).visible_if,'{{ false }}');
  }checks++;
 }
 const settings={show_review:true,show_sold_products:true,review_source:'manual',manual_review_rating:4.8,manual_review_count:12,sold_source:'manual',sold:'17',sold_label:'sold'};
 const context={block:{id:'legacy',type:'review_and_sold',settings},product:{id:'p'},section:{id:'main'}};
 const render=(name,ctx)=>engine.parseAndRender(clean(read(name)),ctx,{globals:ctx});
 const legacy=await render('blocks/review_and_sold.storelib',context);assert(legacy.includes('17 sold'));assert(!legacy.includes('class="product-reviews rs__rating"')&&!legacy.includes('4.8 / 5')&&!legacy.includes('12 reviews'));checks++;
 const direct=await render('snippets/review-sold-block.storelib',context);assert(direct.includes('17 sold')&&!direct.includes('class="product-reviews rs__rating"'));checks++;
 const reviews=await render('blocks/product_reviews.storelib',{...context,block:{...context.block,type:'product_reviews'}});assert(reviews.includes('4.8 / 5')&&reviews.includes('12 reviews'));assert(!reviews.includes('17 sold'));checks++;
 assert.equal(schema('blocks/product_reviews.storelib').shopify.name,'Reviews');assert.equal(schema('blocks/sold_counter.storelib').shopify.name,'Sold counter');checks++;
 console.log(checks+' sold-only naming, hidden saved review controls and separate Reviews checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
