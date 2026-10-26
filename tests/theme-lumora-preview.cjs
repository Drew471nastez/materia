// LIQUIDJS=<installed liquidjs path> node tests/theme-lumora-preview.cjs
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const filename=path.join(__dirname,'theme-empty-block-previews.cjs'),helper=new Module(filename,module);helper.filename=filename;helper.paths=module.paths;
helper._compile(read('tests/theme-empty-block-previews.cjs').split('(async()=>{')[0]+'\nmodule.exports={engine,clean};',filename);
const {engine,clean}=helper.exports;
const theme=JSON.parse(read('config/settings.json')).shopify,home=JSON.parse(read('templates/home.json')),id=home.order[0],section=home.sections[id];
const schema=JSON.parse(read('sections/'+section.type+'.storelib').match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify;
const defaults=defs=>Object.fromEntries((defs||[]).filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const ctx={section:{id,settings:{...defaults(schema.settings),...section.settings},blocks:section.block_order.map(id=>{const b=section.blocks[id];return {...b,id,settings:{...defaults(schema.blocks.find(x=>x.type===b.type).settings),...b.settings}};})},settings:theme,request:{design_mode:false},shop:{name:'Store'},all_products:{}};
(async()=>{const html=await engine.parseAndRender(clean(read('sections/'+section.type+'.storelib')),ctx,{globals:ctx});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [375,768,1440]){
  const p=await browser.newPage({viewport:{width,height:1000}});await p.route('**/*',r=>r.abort());
  await p.setContent('<style>:root{--body-font:Arial;--body-font-size:15px;--body-weight:500;--heading-font:Arial;--heading-weight:600;--color-text:#1f1f1f;--color-heading:#111;--color-background:white;--color-border:#ddd;--btn-primary-bg-color:#f08787;--btn-primary-color:#1f1f1f}body{margin:0}</style><div id="shopify-section-'+id+'">'+html+'</div>');
  await p.addStyleTag({content:read('shopify/assets/critical.css')+read('shopify/assets/theme-button-contract.css')});
  assert.equal(await p.locator('a:has-text("Shop LUMORA")').getAttribute('href'),'/collections/all');
  assert(await p.locator('a:has-text("Shop LUMORA")').isVisible());
  assert.equal(await p.locator('img[src^="http"], img[src^="shopify:"]').count(),0,'only the current theme’s built-in empty-media placeholder is allowed');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'blank-media hero fits '+width);
  await p.close();
 }
 console.log('3 actual-Liquid Lumora hero previews passed at 375, 768 and 1440px without preset images');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
