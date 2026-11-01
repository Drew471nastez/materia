/* Add a section cards: every section's first preset, drawn with scripts OFF the way a library thumbnail may be, must show something (text, a picture or a line) at 1366 and 390. Run: LIQUIDJS=<path> node tests/theme-library-previews.cjs */
const fs=require('fs'),path=require('path');const R='/home/user/materia';process.chdir(R);
const {chromium}=require('playwright');const {engine}=require(R+'/tests/theme-featured-product-round5.cjs');const {THEME_VARS,themeControls}=require(R+'/tests/media-fixture.cjs');
const read=f=>fs.readFileSync(path.join(R,f),'utf8');const def=a=>Object.fromEntries((a||[]).filter(x=>x.id&&x.default!==undefined).map(x=>[x.id,x.default]));
const OUT=process.env.OUT||require('os').tmpdir();
const only=process.argv.slice(2);
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium'});const tc=await themeControls();const res=[];
const files=fs.readdirSync('sections').filter(f=>f.endsWith('.storelib')).map(f=>f.slice(0,-9)).filter(n=>!only.length||only.includes(n));
for(const name of files){const raw=read('sections/'+name+'.storelib');let s;try{s=JSON.parse(raw.split('\n<schema>')[1].split('</schema>')[0]).shopify}catch(e){continue}
if(!s||!(s.presets||[]).length)continue;const preset=s.presets[0];
let bl=preset.blocks||[];if(!Array.isArray(bl))bl=(preset.block_order||Object.keys(bl)).map(k=>bl[k]);
const bdef=t=>def((s.blocks||[]).find(x=>x.type===t)?.settings);
const section={id:'pv',settings:{...def(s.settings),...(preset.settings||{})},blocks:bl.map((x,i)=>({id:'pv-b'+i,type:x.type,shopify_attributes:'',settings:{...bdef(x.type),...(x.settings||{})}}))};
section.blocks_by_id=Object.fromEntries(section.blocks.map(x=>[x.id,x]));
const e=engine();const ctx={section,settings:{scroll_animation:'none',...(JSON.parse(read('config/settings.json')).shopify||{})},request:{design_mode:true,page_type:'index'},template:{name:'index'},shop:{name:'Materia Themes',currency:'EUR',money_format:'€{{amount}}'},routes:{root_url:'/',cart_url:'/cart',all_products_collection_url:'/collections/all'}};
let html='';try{html=await e.parseAndRender(raw.split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,''),ctx,{globals:ctx})}catch(err){res.push({name,err:String(err.message).slice(0,140)});continue}
for(const w of [1366,390]){const c=await b.newContext({javaScriptEnabled:false,viewport:{width:w,height:900}});const p=await c.newPage();
await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>'+THEME_VARS+tc+THEME_VARS.replace(/body\{[^}]*\}/,'')+'body{background:#fff}</style>'+['critical.css','theme.css','theme-button-contract.css','animation.css'].map(f=>`<link rel="stylesheet" href="/assets/${f}">`).join('')+'</head><body><div id="shopify-section-pv" class="shopify-section">'+html+'</div></body></html>'});
if(u.pathname.startsWith('/assets/')){const f=path.join(R,'shopify/assets',u.pathname.slice(8));if(fs.existsSync(f))return r.fulfill({path:f,contentType:f.endsWith('.css')?'text/css':'text/plain'})}
if(/\.(png|jpe?g|webp|gif|svg)/.test(u.pathname))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#9ab"/></svg>'});return r.fulfill({status:204,body:''})});
await p.goto('http://pv.test/');await p.waitForTimeout(150);
const m=await p.evaluate(()=>{const root=document.getElementById('shopify-section-pv');const rb=root.getBoundingClientRect();
const vis=el=>{let n=el;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.05)return false;n=n.parentElement}const r=el.getBoundingClientRect();return r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight*2&&r.right>0&&r.left<innerWidth};
let text=0,media=0;const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let t;while(t=tw.nextNode()){if(t.textContent.trim()&&t.parentElement&&vis(t.parentElement))text+=t.textContent.trim().length}
for(const el of root.querySelectorAll('img,svg,video,picture,[style*="background"]'))if(vis(el))media++;
return {h:Math.round(rb.height),text,media,ovf:document.documentElement.scrollWidth>innerWidth+1}});
if(w===1366)await p.screenshot({path:OUT+'/'+name+'.png',clip:{x:0,y:0,width:1366,height:Math.min(Math.max(m.h,40),900)}}).catch(()=>{});
res.push({name,w,...m});await c.close()}}
await b.close();fs.writeFileSync(OUT+'/_res.json',JSON.stringify(res,null,1));
/* fake-order floats over the page (overlay group); theme-header needs the layout's header context and has its own tests. */
const ALLOW={'fake-order':'floats over the page','theme-header':'drawn by its own header tests'};
const blank=res.filter(r=>!ALLOW[r.name]&&(r.err||r.h<12||(r.text===0&&r.media===0&&r.h<24)));
for(const r of blank)console.error('blank card: '+JSON.stringify(r));
if(blank.length){process.exitCode=1;return}
console.log(new Set(res.map(r=>r.name)).size+' Add a section previews draw content with scripts off at 1366 and 390 ('+Object.keys(ALLOW).length+' allowlisted)')})().catch(e=>{console.error(e);process.exitCode=1});
