// Content-only import. Never copies executable files from the supplied ZIP.
// node scripts/apply-lumora-preset.cjs <zip> [--write]
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),zip=process.argv[2],write=process.argv.includes('--write');
if(!zip)throw Error('Pass the Lumora preset ZIP');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const saved=f=>JSON.parse(cp.execFileSync('git',['show','HEAD:'+f],{cwd:root,encoding:'utf8'}));
const archive=f=>JSON.parse(cp.execFileSync('unzip',['-p',zip,f],{encoding:'utf8'}).replace(/^\s*\/\*[\s\S]*?\*\//,''));
const config=saved('config/settings.json'),renamed=config.compat.renamed||{};
const report={baseline:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),source:path.basename(zip),mode:'content-only, no preset media',files:[],clearedMedia:[],clearedReferences:[],unsupportedSettings:[],unsupportedBlocks:[],skippedSections:[],normalizedValues:[],preservedIntegrations:[]};
const models=new Map();
function model(type){if(!models.has(type)){const f=path.join(root,'sections',type+'.storelib');models.set(type,fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8').match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify:null);}return models.get(type);}
const catalogTypes=new Set(['product','product_picker','product_list','collection','collection_picker','collection_list']);
const reference=v=>typeof v==='string'?v.replace(/^shopify:\/\/(products|collections)\//,'').replace(/^\/(products|collections)\//,''):v?.handle||v?.id||'';
const known={product:new Set(),collection:new Set()};
function remember(settings,defs=[]){for(const def of defs){if(!catalogTypes.has(def.type))continue;const group=def.type.startsWith('product')?'product':'collection';for(const v of [].concat(settings?.[def.id]||[]))if(reference(v)&&(typeof v==='object'||String(v).startsWith('/products/')||String(v).startsWith('/collections/')||/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(v))))known[group].add(String(reference(v)));}}
const pages=fs.readdirSync(path.join(root,'templates')).filter(f=>f.endsWith('.json')).map(f=>'templates/'+f);
for(const f of [...pages,'sections/header-group.json','sections/footer-group.json','sections/overlay-group.json']){if(!fs.existsSync(path.join(root,f)))continue;for(const s of Object.values(saved(f).sections||{})){const m=model(s.type);remember(s.settings,m?.settings);for(const b of Object.values(s.blocks||{}))remember(b.settings,m?.blocks?.find(x=>x.type===b.type)?.settings);}}
const themeSchema=read('shopify/config/settings_schema.json').flatMap(g=>g.settings||[]);
remember(config.shopify,themeSchema);
report.contrastAdjustments=[];
const luminance=hex=>{if(!/^#[0-9a-f]{6}$/i.test(hex||''))return null;const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
function readable(settings,text,bg,scope){const a=luminance(settings[text]),b=luminance(settings[bg]);if(a==null||b==null||(Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5)return;const dark='#1f1f1f',light='#ffffff';const d=luminance(dark);const next=(Math.max(d,b)+.05)/(Math.min(d,b)+.05)>=4.5?dark:light;report.contrastAdjustments.push({setting:scope+'.'+text,from:settings[text],to:next});settings[text]=next;}
function clean(settings,defs,prior={},scope){
 const result={},lookup=new Map(defs.filter(d=>d.id).map(d=>[d.id,d]));
 for(const [id,value]of Object.entries(settings||{})){
  const def=lookup.get(id);if(!def){report.unsupportedSettings.push(scope+'.'+id);continue;}
  let v=value;
  const media=['image_picker','video','video_url'].includes(def.type)||typeof v==='string'&&(/^shopify:\/\/(shop_images|videos)\//.test(v)||/image|avatar|photo|logo|favicon|poster|thumbnail|video|font_url/i.test(id)&&/^https?:/.test(v));
  if(media){if(v)report.clearedMedia.push(scope+'.'+id);v='';}
  if(catalogTypes.has(def.type)){
   const group=def.type.startsWith('product')?'product':'collection',list=def.type.endsWith('_list');
   const valid=x=>['@current','current'].includes(x)||known[group].has(String(reference(x)));
   const original=prior[id];
   if(original!=null && (list?Array.isArray(original)&&original.every(valid):valid(original)))v=original;
   else if(list)v=(Array.isArray(v)?v:[]).filter(valid);
   else if(v&&!valid(v))v='';
   if(JSON.stringify(v)!==JSON.stringify(value))report.clearedReferences.push({setting:scope+'.'+id,from:value,to:v});
  }
  if(def.type==='link_list'&&v&&!config.menus?.[v])v=config.menus?.[id.includes('footer')?'footer':'main-menu']?id.includes('footer')?'footer':'main-menu':'';
  if(typeof v==='string'&&v.startsWith('shopify://')){
   const m=v.match(/^shopify:\/\/(products|collections|pages)\/(.*)$/);
   v=m?'/'+m[1]+'/'+m[2]:'';
  }
  if(def.type==='url'&&typeof v==='string'){
   const m=v.match(/^\/(products|collections)\/([^/?#]+)/);
   if(m&&m[2]!=='all'&&!known[m[1]==='products'?'product':'collection'].has(m[2])){report.clearedReferences.push({setting:scope+'.'+id,from:v,to:'/collections/all'});v='/collections/all';}
  }
  if(['select','radio'].includes(def.type)&&v!==''&&!def.options?.some(o=>String(o.value)===String(v))){report.normalizedValues.push(scope+'.'+id);v=def.options?.some(o=>String(o.value)===String(prior[id]))?prior[id]:def.default??'';}
  if(def.type==='range'&&Number.isFinite(Number(v))){const n=Number(v),step=def.step||1;v=Math.min(def.max,Math.max(def.min,Math.round((n-def.min)/step)*step+def.min));v=Number(v.toFixed(4));if(n!==v)report.normalizedValues.push(scope+'.'+id);}
  if(def.type==='checkbox')v=v===true||v==='true';
  result[id]=v;
 }
 // No-image layouts must not rely on a missing photo for text contrast.
 for(const bg of ['section_bg','background_color','section_background','bg_color'])for(const text of ['text_color','heading_color'])readable(result,text,bg,scope);
 return result;
}
const files=new Map();
const mappings={'templates/index.json':'templates/home.json','templates/list-collections.json':'templates/collections.json','templates/page.about.json':'templates/about.json','templates/page.contact.json':'templates/contact.json','templates/page.faqs.json':'templates/faqs.json','templates/page.wishlist.json':'templates/wishlist.json'};
const names=cp.execFileSync('unzip',['-Z1',zip],{encoding:'utf8'}).split('\n').filter(f=>/^templates\/[^/]+\.json$/.test(f)||/^sections\/(header|footer|overlay)-group\.json$/.test(f));
for(const source of names){
 const target=mappings[source]||source;if(!fs.existsSync(path.join(root,target)))throw Error('No current page mapping for '+source);
 const incoming=archive(source),previous=saved(target),sections={},order=[];
 for(const id of incoming.order||Object.keys(incoming.sections||{})){
  const entry=incoming.sections[id];if(!entry)continue;
  const type=renamed[entry.type]||entry.type.toLowerCase(),m=model(type);
  if(!m){if(type==='apps'){report.skippedSections.push(source+':'+id+' (external Shopify app slot)');continue;}throw Error('Missing current section '+type);}
  const same=Object.values(previous.sections||{}).filter(x=>x.type===type),old=previous.sections?.[id]|| (same.length===1?same[0]:{});
  const result={type,settings:clean(entry.settings,m.settings||[],old?.settings,target+':'+id)};
  if(entry.disabled!==undefined)result.hidden=!!entry.disabled;
  const blocks={},blockOrder=[];
  for(const bid of entry.block_order||Object.keys(entry.blocks||{})){
   const b=entry.blocks[bid],def=m.blocks?.find(x=>x.type.toLowerCase()===b?.type?.toLowerCase());if(!b)continue;
   if(!def){report.unsupportedBlocks.push({page:target,section:id,id:bid,type:b.type});continue;}
   const matching=Object.values(old?.blocks||{}).filter(x=>x.type===b.type),prior=old?.blocks?.[bid]||(matching.length===1?matching[0]:{});
   blocks[bid]={type:def.type,settings:clean(b.settings,def.settings||[],prior?.settings,target+':'+id+':'+bid)};blockOrder.push(bid);
  }
  if(entry.blocks){result.blocks=blocks;result.block_order=blockOrder;}
  sections[id]=result;order.push(id);
 }
 // Platform-owned reviews/apps keep their real Storelib identity and data.
 for(const [id,s]of Object.entries(previous.sections||{}))if(s.type.startsWith('storelib-')||s.type==='@app'){
  sections[id]=s;order.push(id);report.preservedIntegrations.push(target+':'+id);
 }
 const next={...previous,...incoming,sections,order};delete next.disabled;
 files.set(target,next);
}
const current=archive('config/settings_data.json').current;
const overrides=clean(current,themeSchema,config.shopify,'theme');
// Preserve existing technical/functional options absent from Lumora, plus the
// Storelib menus, compat metadata and non-preset policy pages.
const nextConfig={...config,shopify:{...config.shopify,...overrides,enable_demo_images:false}};
for(const [key,value]of Object.entries(current))if(typeof value==='string'&&(value.startsWith('shopify://shop_images/')||value.startsWith('shopify://videos/')))nextConfig.shopify[key]='';
if(current.color_schemes)nextConfig.shopify.color_schemes={...config.shopify.color_schemes,...current.color_schemes};
for(const id of Object.keys(current.color_schemes||{})){
 const s=nextConfig.shopify.color_schemes[id].settings,scope='theme.color_schemes.'+id;
 for(const text of ['text_color','heading_color','button_link_color','button_link_hover_color','btn_outline_color'])readable(s,text,'background',scope);
 for(const role of ['primary','secondary'])for(const hover of ['', 'hover_'])readable(s,'btn_'+role+'_'+hover+'color','btn_'+role+'_'+hover+'background',scope);
}
files.set('config/settings.json',nextConfig);
report.files=[...files.keys()];
function save(file,value){const full=path.join(root,file),next=JSON.stringify(value,null,2)+'\n',old=fs.existsSync(full)?fs.readFileSync(full,'utf8'):null;if(old===next)return;
 const patch=old==null?'*** Begin Patch\n*** Add File: '+full+'\n'+next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n':'*** Begin Patch\n*** Update File: '+full+'\n@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';
 cp.execFileSync('/usr/local/bin/apply_patch',[],{input:patch});}
if(write){for(const [file,value]of files)save(file,value);save('docs/lumora-preset-import.json',report);}
console.log(JSON.stringify(report,null,2));
