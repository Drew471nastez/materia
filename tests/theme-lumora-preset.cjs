// Checks the imported preset data against the CURRENT Materia schemas/code.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const report=read('docs/lumora-preset-import.json');let checks=0;
const before=f=>JSON.parse(cp.execFileSync('git',['show',report.baseline+':'+f],{cwd:root,encoding:'utf8'}));
function settings(values,defs,where){const map=new Map((defs||[]).filter(x=>x.id).map(x=>[x.id,x]));for(const [id,v]of Object.entries(values||{})){
 const d=map.get(id);assert(d,where+' declares '+id);
 if(['select','radio'].includes(d.type)&&v!=='')assert(d.options.some(o=>String(o.value)===String(v)),where+'.'+id+' valid choice');
 if(d.type==='range'){assert(Number.isFinite(v)&&v>=d.min&&v<=d.max,where+'.'+id+' valid range');}
 if(d.type==='checkbox')assert.equal(typeof v,'boolean');
 if(['image_picker','video','video_url'].includes(d.type))assert(!v,where+'.'+id+' media intentionally empty');
}checks++;}
for(const f of report.files.filter(f=>f!=='config/settings.json')){
 const j=read(f);assert.equal(new Set(j.order).size,j.order.length);
 for(const id of j.order)assert(j.sections[id],f+' ordered section exists');
 for(const [id,s]of Object.entries(j.sections)){
  if(s.type.startsWith('storelib-'))continue;
  const file=path.join(root,'sections',s.type+'.storelib');assert(fs.existsSync(file),f+' section '+s.type+' exists');
  const m=JSON.parse(fs.readFileSync(file,'utf8').match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify;
  settings(s.settings,m.settings,f+':'+id);
  for(const bid of s.block_order||[])assert(s.blocks[bid],f+' block exists');
  for(const [bid,b]of Object.entries(s.blocks||{})){const def=m.blocks?.find(x=>x.type===b.type);assert(def,f+' block '+b.type+' exists');settings(b.settings,def.settings,f+':'+id+':'+bid);}
 }
 assert(!Object.values(j.sections).some(s=>s.type==='apps'||s.type==='size-chart-data'),'no foreign app or empty data section');checks++;
}
const changed=cp.execFileSync('git',['diff',report.baseline,'--name-only'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
assert(!changed.some(f=>/\.storelib$/.test(f)||f.startsWith('shopify/')||f.startsWith('layout/')||f.startsWith('blocks/')),'no current implementation or schema replaced');checks++;
const config=read('config/settings.json'),old=before('config/settings.json');
assert.deepEqual(config.compat,old.compat);assert.deepEqual(config.menus,old.menus);assert.equal(config.shopify.enable_demo_images,false);checks++;
for(const f of report.files)assert(!JSON.stringify(read(f)).includes('shopify://'),'no unresolved Shopify media or links in '+f);checks++;
const home=read('templates/home.json');assert.equal(home.sections[home.order[0]].type,'hero-product3');assert.equal(home.sections[home.order[1]].type,'waves-divider');
const featured=Object.values(home.sections).find(s=>s.type==='featured-product');assert.equal(featured.settings.product,'/products/pants-down','keep the existing featured product connection');checks++;
for(const entry of report.preservedIntegrations){const [f,id]=entry.split(':');assert.deepEqual(read(f).sections[id],before(f).sections[id]);}checks++;
for(const f of ['templates/privacy-policy.json','templates/refund-policy.json','templates/terms-of-service.json'])assert.deepEqual(read(f),before(f),'keep existing policy '+f);checks++;
assert.equal(report.unsupportedBlocks.length,0);assert.equal(report.clearedMedia.length,79);checks++;
console.log(checks+' Lumora preset schema, ordering, empty-media, catalog-binding and untouched-code checks passed');
