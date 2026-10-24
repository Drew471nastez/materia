/* Search overlay, both Search types, with the theme's own CSS and the search
   module from theme.js on a fixture page: an announcement bar, a sticky
   header, a fixed mobile navigation bar and a stray very high z-index layer.
   Popup: starts at the top of the screen, full width, and covers the
   announcement bar and the header (its bar is that tall); always opaque, it
   slides down while its content fades in. Drawer: nothing is drawn above it.
   Both: focus, Escape, outside click, scroll lock without a jump, one
   request per settled query with stale ones aborted, no doubled listeners
   after redraws, a "No result found" state with trending kept, a dimmed
   loading state with no collapse, and result cards rendered from the real
   sections/search-predictive-grid and snippets/product-item following
   Theme settings > Product cards (ratio, style, vendor, badges, price). */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

const theme=read('shopify/assets/theme.js');
const start=theme.indexOf('var BlsSearchShopify = (function () {');
const endMark='customElements.define("header-search", HeaderSearch);';
const searchJs=theme.slice(start,theme.indexOf(endMark)+endMark.length);
assert(start>0&&searchJs.length>1000,'search module found in theme.js');
const css=['shopify/assets/critical.css','shopify/assets/product-card.css','shopify/assets/theme.css','shopify/assets/search-type-default.css'].map(read).join('\n');

// The markup the snippets render.
const top=read('snippets/top-search.storelib');
assert.match(top,/id="search-form"\s+popover="manual"/,'the panel is a manual popover');
assert.match(top,/class="overlay_search" popover="manual"/,'the scrim is a manual popover');
assert.match(top,/data-search-mode="\{\{ overlay_mode \}\}"/);
assert(!/on[a-z]+=/.test(top.replace(/\{%-? comment[\s\S]*?endcomment -?%\}/g,'')),'no inline handlers');
assert(!read('shopify/assets/search-type-default.css').includes('--search-top'),'the popup no longer opens below the header');
assert(!/section-header\s*\{\s*z-index/.test(read('shopify/assets/search-type-default.css')),'the header is never raised over the search');
const grid=read('sections/search-predictive-grid.storelib');
assert(!/search_thumb/.test(grid+read('snippets/search-popup.storelib')),'results keep the card image ratio from Theme settings');
assert.match(grid,/data-search-empty/,'the results section draws a no-results state');
let passed=1;

/* ---- The results section, rendered from the repository through a small
   Liquid subset (the one tests/theme-product-cards.cjs uses), with the real
   snippets/product-item and product-badges and the English locale. ---- */
const locale=JSON.parse(read('shopify/locales/en.default.json'));
const tr=(key,vars={})=>{const v=key.split('.').reduce((o,k)=>o&&o[k],locale);return typeof v==='string'?v.replace(/\{\{\s*(\w+)\s*\}\}/g,(_,k)=>vars[k]??''):key;};
function tokenize(src){const out=[];const re=/\{%-?([\s\S]*?)-?%\}|\{\{-?([\s\S]*?)-?\}\}/g;let last=0,m;
  while((m=re.exec(src))){if(m.index>last)out.push({t:'text',v:src.slice(last,m.index)});const raw=m[0];const lt=raw.startsWith('{%-')||raw.startsWith('{{-'),rt=raw.endsWith('-%}')||raw.endsWith('-}}');
    if(m[1]!==undefined){const body=m[1].trim();if(/^liquid\b/.test(body))body.replace(/^liquid\b/,'').split('\n').map(l=>l.trim()).filter(Boolean).forEach(l=>out.push({t:'tag',v:l}));else out.push({t:'tag',v:body,lt,rt});}
    else out.push({t:'out',v:m[2].trim(),lt,rt});last=re.lastIndex;}
  if(last<src.length)out.push({t:'text',v:src.slice(last)});
  for(let i=0;i<out.length;i++){if(out[i].lt&&out[i-1]?.t==='text')out[i-1].v=out[i-1].v.replace(/\s+$/,'');if(out[i].rt&&out[i+1]?.t==='text')out[i+1].v=out[i+1].v.replace(/^\s+/,'');}
  return out;}
function parse(tokens){let i=0;const name=tok=>tok.v.split(/\s+/)[0];
  function block(ends){const nodes=[];while(i<tokens.length){const tok=tokens[i];if(tok.t==='tag'&&ends.includes(name(tok)))return nodes;i++;
    if(tok.t!=='tag'){nodes.push(tok);continue;}const n=name(tok),rest=tok.v.slice(n.length).trim();
    if(n==='comment'){while(i<tokens.length&&!(tokens[i].t==='tag'&&name(tokens[i])==='endcomment'))i++;i++;continue;}
    if(n==='if'||n==='unless'){const branches=[{cond:rest,neg:n==='unless',body:block(['elsif','else','endif','endunless'])}];
      while(i<tokens.length){const e=tokens[i++],en=name(e);if(en==='elsif')branches.push({cond:e.v.slice(5).trim(),body:block(['elsif','else','endif','endunless'])});else if(en==='else')branches.push({cond:null,body:block(['endif','endunless'])});else break;}
      nodes.push({t:'if',branches});}
    else if(n==='case'){const c={t:'case',expr:rest,whens:[],other:null};block(['when','else','endcase']);
      while(i<tokens.length){const e=tokens[i++],en=name(e);if(en==='when')c.whens.push({vals:e.v.slice(4).trim(),body:block(['when','else','endcase'])});else if(en==='else')c.other=block(['endcase']);else break;}nodes.push(c);}
    else if(n==='for'){const body=block(['endfor','else']);if(name(tokens[i])==='else'){i++;block(['endfor']);}i++;nodes.push({t:'for',expr:rest,body});}
    else if(n==='capture'){const body=block(['endcapture']);i++;nodes.push({t:'capture',v:rest,body});}
    else if(n==='form'){const body=block(['endform']);i++;nodes.push({t:'form',body});}
    else nodes.push({t:'stmt',n,v:rest});}
    return nodes;}
  return block([]);}
const isBlank=v=>v==null||v===''||v===false||(Array.isArray(v)&&!v.length)||(typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length);
const BLANK=Symbol('blank'),EMPTY=Symbol('empty');
function splitTop(s,sep){const out=[];let cur='',q=null;for(const ch of s){if(q){if(ch===q)q=null;cur+=ch;continue;}if(ch==="'"||ch==='"'){q=ch;cur+=ch;continue;}if(ch===sep){out.push(cur);cur='';continue;}cur+=ch;}out.push(cur);return out;}
function lookup(ctx,expr){expr=expr.trim();
  if(/^'[\s\S]*'$|^"[\s\S]*"$/.test(expr))return expr.slice(1,-1);if(/^-?\d+(\.\d+)?$/.test(expr))return Number(expr);
  if(expr==='true')return true;if(expr==='false')return false;if(expr==='nil'||expr==='null')return null;if(expr==='blank')return BLANK;if(expr==='empty')return EMPTY;
  const parts=expr.replace(/\[(\d+)\]/g,'.$1').replace(/\[['"]([^'"]+)['"]\]/g,'.$1').split('.');let v=ctx[parts[0]];
  for(const p of parts.slice(1)){if(v==null)return undefined;if(p==='size'&&(Array.isArray(v)||typeof v==='string'))v=v.length;else if(p==='first'&&Array.isArray(v))v=v[0];else v=v[p];}
  return v;}
const args=s=>splitTop(s,',').map(x=>x.trim()).filter(Boolean);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function filt(ctx,v,f){const i=f.indexOf(':');const n=(i<0?f:f.slice(0,i)).trim();const raw=i<0?[]:args(f.slice(i+1));
  if(n==='t')return tr(v,Object.fromEntries(raw.map(a=>{const k=a.indexOf(':');return [a.slice(0,k).trim(),lookup(ctx,a.slice(k+1))];})));
  const a=raw.map(x=>lookup(ctx,x));
  switch(n){case 'default':return isBlank(v)?a[0]:v;case 'escape':return esc(v);case 'replace':return String(v??'').split(a[0]).join(a[1]);
    case 'append':return String(v??'')+(a[0]??'');case 'remove':return String(v??'').split(a[0]).join('');case 'split':return String(v??'').split(a[0]);
    case 'plus':return Number(v||0)+Number(a[0]||0);case 'minus':return Number(v||0)-Number(a[0]||0);case 'times':return Number(v||0)*Number(a[0]||0);
    case 'divided_by':{const r=Number(v||0)/Number(a[0]);return Number.isInteger(a[0])&&Number.isInteger(Number(v))?Math.floor(r):r;}
    case 'round':return Math.round(Number(v||0));case 'size':return v==null?0:v.length??0;case 'strip':return String(v??'').trim();
    case 'date':return v==='now'?Math.floor(Date.now()/1000):Math.floor(new Date(v).getTime()/1000);case 'where':return (v||[]).filter(x=>x[a[0]]===a[1]);
    default:return v;}}
const value=(ctx,expr)=>{const [head,...fs]=splitTop(expr,'|');return fs.reduce((v,f)=>filt(ctx,v,f),lookup(ctx,head));};
function cmp(ctx,s){const m=s.match(/^(.+?)\s*(==|!=|>=|<=|>|<|\bcontains\b)\s*(.+)$/);if(!m){const v=lookup(ctx,s);return !(v==null||v===false);}
  const l=lookup(ctx,m[1]),r=lookup(ctx,m[3]);const eq=(x,y)=>y===BLANK||y===EMPTY?isBlank(x):x===BLANK||x===EMPTY?isBlank(y):x==y;
  switch(m[2]){case '==':return eq(l,r);case '!=':return !eq(l,r);case '>':return l>r;case '<':return l<r;case '>=':return l>=r;case '<=':return l<=r;case 'contains':return l!=null&&String(l).includes(r);}}
function cond(ctx,s){const parts=s.replace(/\s+/g,' ').trim().split(/ (and|or) /);let v=cmp(ctx,parts[parts.length-1]);
  for(let k=parts.length-2;k>0;k-=2)v=parts[k]==='and'?cmp(ctx,parts[k-1])&&v:cmp(ctx,parts[k-1])||v;return v;}
class Break{}
function run(nodes,ctx){let out='';for(const n of nodes){
  if(n.t==='text')out+=n.v;
  else if(n.t==='out'){const v=value(ctx,n.v);out+=v==null||v===BLANK?'':String(v);}
  else if(n.t==='if'){for(const b of n.branches){const ok=b.cond==null?true:(b.neg?!cond(ctx,b.cond):cond(ctx,b.cond));if(ok){out+=run(b.body,ctx);break;}}}
  else if(n.t==='case'){const v=value(ctx,n.expr);const w=n.whens.find(w=>args(w.vals.replace(/ or /g,',')).some(x=>lookup(ctx,x)==v));out+=run(w?w.body:n.other||[],ctx);}
  else if(n.t==='for'){const m=n.expr.match(/^(\w+) in (\S+)(?:\s+limit:\s*(\d+))?/);let list=lookup(ctx,m[2])||[];if(m[3])list=list.slice(0,Number(m[3]));
    try{list.forEach((item,k)=>{ctx[m[1]]=item;ctx.forloop={index:k+1,index0:k,first:k===0,last:k===list.length-1};out+=run(n.body,ctx);});}catch(e){if(!(e instanceof Break))throw e;}}
  else if(n.t==='capture')ctx[n.v]=run(n.body,ctx);
  else if(n.t==='form')out+='<form method="post" action="/cart/add">'+run(n.body,ctx)+'</form>';
  else if(n.t==='stmt'){if(n.n==='assign'){const i=n.v.indexOf('=');ctx[n.v.slice(0,i).trim()]=value(ctx,n.v.slice(i+1));}else if(n.n==='break')throw new Break();else if(n.n==='render')out+=renderSnippet(n.v,ctx);}
}return out;}
const stubs={
  'responsive-image':a=>`<img class="${a.class}" src="${a.image.src}" alt="" width="300" height="400">`,
  'placeholder-render':()=>'<svg class="placeholder-svg"></svg>',
  'price':a=>`<div class="card-product-price flex gap-5"><span class="price">$49.00</span>${a.product?.compare_at_price?'<s class="compare-price">$79.00</s>':''}</div>`,
  'color-swatches':()=>'','review':()=>'','theme-type':()=>'','scheme-color':a=>(isBlank(a.color)?a.fallback:a.color)??'','card-product':()=>'',
};
const templateOf=src=>src.slice(src.indexOf('\n')+1,src.lastIndexOf('</template>'));
const parsed=new Map();
const renderTemplate=(src,ctx)=>{if(!parsed.has(src))parsed.set(src,parse(tokenize(src)));return run(parsed.get(src),ctx);};
function renderSnippet(spec,ctx){const first=spec.match(/^'([^']+)'\s*[,|]?\s*([\s\S]*)$/);const nm=first[1];
  const local={settings:ctx.settings,section:ctx.section,request:ctx.request,routes:ctx.routes,pages:{}};
  args(first[2].replace(/\|/g,',')).forEach(a=>{const i=a.indexOf(':');local[a.slice(0,i).trim()]=value(ctx,a.slice(i+1));});
  if(stubs[nm])return stubs[nm](local);
  return renderTemplate(templateOf(read(`snippets/${nm}.storelib`)),local);}
const schemaDefaults=Object.fromEntries(JSON.parse(read('shopify/config/settings_schema.json')).flatMap(g=>g.settings||[]).filter(x=>x.id&&('default' in x||x.type==='checkbox')).map(x=>[x.id,x.default??false]));
const config={...schemaDefaults,...JSON.parse(read('config/settings.json')).shopify};
const img=c=>({src:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="${c}"/></svg>`)}`,alt:'',aspect_ratio:1,media_type:'image'});
const product=(id,o={})=>({id,handle:'p'+id,url:'/products/p'+id,title:'Linen shirt '+id,vendor:'Materia',featured_media:img('#c9c3b5'),media:[img('#c9c3b5')],
  available:true,has_only_default_variant:true,price:4900,compare_at_price:o.sale?7900:null,variants:[{id:id*100,title:'Default',available:true,price:4900,compare_at_price:o.sale?7900:null}],
  selected_or_first_available_variant:{id:id*100,available:true},options_with_values:[{name:'Title',values:['Default']}],created_at:new Date(Date.now()-40*864e5).toISOString(),metafields:{custom:{}},selling_plan_groups:[],tags:[]});
// What /search/suggest answers for the results section, with these Theme settings.
const resultsSection=(terms,products,settings={})=>`<div id="shopify-section-search-predictive-grid">${renderTemplate(templateOf(grid),{
  settings:{...config,...settings},section:{id:'search-predictive-grid'},request:{locale:{iso_code:'en'}},routes:{search_url:'/search'},
  predictive_search:{performed:true,terms,resources:{products,queries:[],pages:[],articles:[],collections:[]}}})}</div>`;

const panelMarkup=mode=>mode==='drawer'?`
  <div class="search___drawer flex flex-column h-full">
    <div class="sticky top-0 pb-30"><div class="mini_search_header flex justify-between px-30 py-18"><h3 class="h5 m-0">Search our site</h3>
      <button class="btn-reset btn-search-close button-close pointer" aria-label="Close">x</button></div>
      <form action="/search" id="search_mini_form" method="get" role="search" class="search search-modal__form px-30 pt-30"><div class="field flex relative">
        <input class="search__input field__input flex-1" type="search" name="q" id="search-template" aria-label="Search"></div></form></div>
    <div class="search-modal__content flex-1 overflow-y-auto custom-scrollbar pb-30">
      <div id="quick-search" class="quick-search px-30 mb-30"><ul class="quick-search-list"><li><a class="quick-url" href="/search?q=dress">dress</a></li></ul></div>
      <div id="predictive-search" class="predictive-search--header px-30"><div class="predictive-search__results" data-predictive-search></div><span class="predictive-search-status visually-hidden" role="status" aria-hidden="true"></span></div>
      <div class="search__loading-state mt-15">loading</div>
      <div style="height:1600px">long content</div>
    </div>
  </div>`:`
  <div class="search__type-popup search__popup-anim--fade h-full overflow-auto px-15">
    <div class="fluid_container">
      <h3 class="search-title">Search</h3>
      <div class="search__type-popup-bar">
        <form action="/search" id="search_mini_form" method="get" role="search" class="search search-modal__form search__type-popup-form"><div class="search__type-popup-field">
          <input class="search__input search__type-popup-input field__input" type="search" name="q" id="search-template" aria-label="Search">
          <button type="submit" class="search__type-popup-submit" aria-label="Search">s</button></div></form>
        <button type="button" class="search__type-popup-close btn-search-close" aria-label="Close">x</button>
      </div>
      <div id="quick-search" class="quick-search"><ul class="quick-search-list"><li><a class="quick-url" href="/search?q=dress">dress</a></li></ul></div>
      <div id="predictive-search" class="predictive-search--header mt-25"><div class="predictive-search__results" data-predictive-search></div><span class="predictive-search-status visually-hidden" role="status" aria-hidden="true"></span></div>
      <div class="search__loading-state mt-15">loading</div>
    </div>
  </div>`;

// answers: what /search/suggest says for a query, by query; anything else
// gets two plain results.
const fixture=(mode,anim='fade',answers={})=>`<!doctype html><html class="js"><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--overlay-bg:rgba(0,0,0,.5)}html{scrollbar-gutter:stable}body{margin:0;padding-right:0!important}${css}
.announce{height:40px;background:#222;color:#fff;position:relative}
.section-header{position:sticky;top:0;z-index:11}
header.header{height:80px;background:#fff;display:flex;align-items:center;justify-content:flex-end;padding:0 20px;box-sizing:border-box}
.mnb{position:fixed;left:0;right:0;bottom:0;height:56px;background:#eee;z-index:12}
.stray{position:fixed;top:130px;right:0;width:60%;height:200px;z-index:2147483000;pointer-events:auto;background:rgba(255,0,0,.01)}
main{height:4000px}
</style></head><body>
<div class="announce">Free shipping</div>
<div class="section-header shopify-section"><header class="header"><div class="header_search"><div class="dropdown-toggle"><button class="btn-reset top-search-toggle w-44 h-44" aria-label="Search">S</button></div></div></header></div>
<main>page</main>
<div class="mnb">nav bar</div>
<div class="stray"></div>
<header-search class="header_search search_type_${mode}"><div class="block block-quick-search predictive_search_suggest search_${mode}">
<div id="search-form" popover="manual" role="dialog" aria-modal="true" aria-label="Search" data-search-mode="${mode}" class="search-overlay search-overlay--${mode} search__type-${mode} search__popup-anim--${anim} color-default" style="--color-background:#fff;background-color:#fff">${panelMarkup(mode)}</div>
</div></header-search>
<div class="overlay_search" popover="manual" aria-hidden="true"></div>
<script>var root=document.body;var routes={predictive_search_url:'/search/suggest'};window.requests=[];window.aborted=0;window.answers=${JSON.stringify(answers).replace(/</g,'\\u003c')};
const realFetch=window.fetch;window.fetch=(url,opts)=>{window.requests.push(String(url));const signal=opts&&opts.signal;const q=decodeURIComponent((String(url).match(/[?&]q=([^&]*)/)||[])[1]||'');
 return new Promise((res,rej)=>{const t=setTimeout(()=>res(new Response(answers[q]||'<div id="shopify-section-search-predictive-grid"><div class="search-list-item"><ul role="listbox"><li role="option" id="o1" aria-selected="false"><a href="/p/1">One</a></li><li role="option" id="o2" aria-selected="false"><a href="/p/2">Two</a></li></ul><div style="height:220px"></div></div></div>')),window.fetchDelay||40);
 if(signal)signal.addEventListener('abort',()=>{clearTimeout(t);window.aborted++;rej(new DOMException('Aborted','AbortError'));});});};
</script>
<script>${searchJs}</script></body></html>`;

const state=page=>page.evaluate(()=>{
  const f=document.getElementById('search-form');const cs=getComputedStyle(f);
  return {open:f.matches(':popover-open'),scrimOpen:document.querySelector('.overlay_search').matches(':popover-open'),vis:cs.visibility,op:+cs.opacity,html:document.documentElement.className,overflow:getComputedStyle(document.documentElement).overflowY,focus:document.activeElement&&document.activeElement.id};
});
// Samples the panel every frame while it opens: opacity (the panel's and
// its content's), transform, box, and what is drawn at the announcement bar.
const timeline=(page,click)=>page.evaluate(async click=>{
  const f=document.getElementById('search-form');const out=[];
  let done=false;const tick=()=>{const cs=getComputedStyle(f);const r=f.getBoundingClientRect();const c=f.firstElementChild;const at=document.elementFromPoint(innerWidth/2,20);
    out.push({op:+cs.opacity,cop:c?+getComputedStyle(c).opacity:1,vis:cs.visibility,tf:cs.transform,top:r.top,left:r.left,h:r.height,bottom:r.bottom,at:at&&(f.contains(at)?'popup':at.className),t:performance.now()});if(!done)requestAnimationFrame(tick);};
  if(click)document.querySelector('.top-search-toggle').click();
  tick();await new Promise(r=>setTimeout(r,420));done=true;return out;
},click);
const hits=(page,sel)=>page.evaluate(sel=>{
  const f=document.querySelector(sel);const r=f.getBoundingClientRect();
  const pts=[[r.left+2,r.top+2],[r.right-3,r.top+2],[r.left+2,r.bottom-3],[r.right-3,r.bottom-3],[r.left+r.width/2,r.top+r.height/2]];
  return pts.map(([x,y])=>{const e=document.elementFromPoint(x,y);return e&&f.contains(e)?'in':(e?e.className||e.tagName:'none');});
},sel);

(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    for(const vp of [{width:1280,height:800},{width:375,height:740}]){
      // ---------- Popup ----------
      for(const scroll of [0,900]){
        const page=await browser.newPage({viewport:vp});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.setContent(fixture('popup'));
        await page.evaluate(y=>scrollTo(0,y),scroll);
        await page.waitForTimeout(50);
        const closed=await state(page);
        assert.equal(closed.vis,'hidden','closed popup is hidden');assert.equal(closed.open,false);
        const before=await page.evaluate(()=>({y:scrollY,header:document.querySelector('header.header').getBoundingClientRect().toJSON(),cw:document.documentElement.clientWidth}));
        const tl=await timeline(page,true);
        const s=await state(page);
        assert(s.open&&s.scrimOpen,'panel and scrim in the top layer');
        assert.equal(s.focus,'search-template','focus is in the field');
        assert.match(s.html,/open-search/);assert.equal(s.overflow,'hidden','page scroll is locked');
        // The panel is opaque on every frame, so nothing shows through it: it
        // slides down from the top of the screen and its content fades in.
        assert(tl.every(x=>x.op===1),'the panel itself is never see-through');
        assert(tl[0].cop<0.35,`first frame of the content is not already opaque (${tl[0].cop})`);
        for(let i=1;i<tl.length;i++){
          assert(tl[i].cop>=tl[i-1].cop-0.001,`content opacity never drops while opening (${tl[i-1].cop} -> ${tl[i].cop})`);
          assert(tl[i].top>=tl[i-1].top-0.5,'the panel only moves down while it opens');
        }
        assert.equal(tl[tl.length-1].cop,1);assert.equal(tl[tl.length-1].top,0);
        const opaqueAt=tl.find(x=>x.cop===1).t-tl[0].t;
        assert(opaqueAt>120&&opaqueAt<380,`fades in over about 250ms (${Math.round(opaqueAt)}ms)`);
        assert(tl.every(x=>x.left===0),'full width on every frame');
        // The announcement bar is either not covered yet or covered by the
        // panel: the scrim never dims it on its own while the panel is over it.
        if(!scroll)assert(tl.filter(x=>x.bottom>20).every(x=>x.at==='popup'),'once the panel reaches the announcement bar it is what is drawn there');
        // From the top of the screen, full width, over the bars and the header.
        const box=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().toJSON());
        const after=await page.evaluate(()=>({y:scrollY,header:document.querySelector('header.header').getBoundingClientRect().toJSON(),cw:document.documentElement.clientWidth}));
        assert.equal(after.y,before.y,'no scroll jump on open');assert.equal(after.cw,before.cw,'no width shift on open');
        assert.deepEqual(after.header,before.header,'the header does not move');
        assert.equal(box.top,0,`popup top is 0 (scroll ${scroll}, ${vp.width}px)`);
        assert.equal(box.left,0);assert(Math.abs(box.width-before.header.width)<=1,`popup is full width, as wide as the page (${box.width} vs ${before.header.width})`);
        const headerBottom=scroll?before.header.height:before.header.bottom;
        assert.equal(headerBottom,scroll?80:120);
        const bar=await page.evaluate(()=>document.querySelector('#search-form .search__type-popup-bar').getBoundingClientRect().toJSON());
        assert(Math.abs(bar.top)<=1&&Math.abs(bar.height-headerBottom)<=1,`the field's bar covers the announcement and the header (${bar.top}/${bar.height}, header bottom ${headerBottom})`);
        assert(box.height>=headerBottom,'trending opens below the bar');
        if(!scroll){
          const ann=await page.evaluate(()=>{const a=document.querySelector('.announce').getBoundingClientRect();const f=document.getElementById('search-form');
            return [[a.left+5,a.top+5],[a.left+a.width/2,a.top+a.height/2],[a.right-5,a.bottom-5]].map(([x,y])=>f.contains(document.elementFromPoint(x,y)));});
          assert.deepEqual(ann,[true,true,true],'the popup covers the announcement bar');
        }
        assert.deepEqual(await hits(page,'#search-form'),['in','in','in','in','in'],'nothing is drawn over the popup');
        assert(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight-20).classList.contains('overlay_search')),'the scrim covers the page and the nav bar');
        // The field sits in the bar, centred in it.
        const field=await page.evaluate(()=>{const i=document.getElementById('search-template').getBoundingClientRect();const c=document.querySelector('#search-form .btn-search-close').getBoundingClientRect();return {top:i.top,bottom:i.bottom,cw:c.width,ch:c.height};});
        assert(field.top>=0&&field.bottom<=headerBottom,'the field is inside the bar');
        assert(Math.abs((field.top+field.bottom)/2-headerBottom/2)<=2,'the field is centred in the bar');
        assert(field.cw>=44&&field.ch>=44,'close is a 44px target');
        // Results open below the bar; the bar keeps its height.
        await page.fill('#search-template','dre');
        await page.waitForTimeout(400);
        const res=await page.evaluate(()=>{const f=document.getElementById('search-form').getBoundingClientRect();const p=document.querySelector('#search-form #predictive-search').getBoundingClientRect();const b=document.querySelector('#search-form .search__type-popup-bar').getBoundingClientRect();return {f:f.toJSON(),p:p.toJSON(),b:b.toJSON()};});
        assert(Math.abs(res.b.height-headerBottom)<=1,'the bar keeps its height');
        assert(res.p.top>=res.b.bottom-1&&res.p.height>0,`results open below the field ${JSON.stringify(res)}`);
        assert(res.f.top===0&&res.f.height>box.height,'the panel grows downwards only');
        assert(res.f.bottom<=vp.height+1,'the panel stays on screen');
        // Escape closes; the page is unlocked once the panel has gone.
        await page.keyboard.press('Escape');
        const mid=await state(page);
        assert(!/open-search/.test(mid.html),'Escape closes');
        await page.waitForTimeout(380);
        const end=await state(page);
        assert.equal(end.vis,'hidden');assert(!end.open&&!end.scrimOpen,'layers leave the top layer');
        assert(!/open-drawer/.test(end.html),'page unlocked');
        assert.equal(await page.evaluate(()=>scrollY),before.y,'no scroll jump on close');
        assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('top-search-toggle')),true,'focus returns to the toggle');
        // Outside click closes.
        await page.click('.top-search-toggle');await page.waitForTimeout(300);
        await page.mouse.click(vp.width/2,vp.height-120);
        await page.waitForTimeout(380);
        assert.equal((await state(page)).open,false,'a click outside closes');
        assert.deepEqual(errors,[]);
        await page.close();passed++;
      }

      // ---------- Drawer ----------
      for(const scroll of [0,900]){
        const page=await browser.newPage({viewport:vp});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.setContent(fixture('drawer'));
        await page.evaluate(y=>scrollTo(0,y),scroll);
        await page.waitForTimeout(50);
        const y0=await page.evaluate(()=>scrollY);
        const tl=await timeline(page,true);
        const xs=tl.map(x=>x.left);
        for(let i=1;i<xs.length;i++)assert(xs[i]<=xs[i-1]+0.5,'the drawer slides in one direction');
        assert(xs[0]>xs[xs.length-1],'the drawer slides in');
        assert(tl.every(x=>x.op===1||x.vis==='hidden'),'the drawer is never half transparent');
        await page.waitForTimeout(50);
        const s=await state(page);
        assert(s.open&&s.scrimOpen&&s.vis==='visible');
        assert.equal(s.focus,'search-template');
        const box=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().toJSON());
        const vw=await page.evaluate(()=>document.querySelector('main').getBoundingClientRect().right);
        assert.equal(box.top,0);assert.equal(box.height,vp.height,'full height');
        assert(Math.abs(box.right-vw)<=1,`flush with the right edge (${box.right} vs ${vw})`);
        assert.deepEqual(await hits(page,'#search-form'),['in','in','in','in','in'],`nothing over the drawer (scroll ${scroll}, ${vp.width}px)`);
        // Where the header and the stray layer are, the drawer wins.
        const overHeader=await page.evaluate(()=>{const f=document.getElementById('search-form');const h=document.querySelector('header.header').getBoundingClientRect();const r=f.getBoundingClientRect();const y=Math.max(2,h.top+h.height/2);const e=document.elementFromPoint(r.left+10,y);const e2=document.elementFromPoint(r.right-10,y);return f.contains(e)&&f.contains(e2);});
        assert(overHeader,'the header is under the drawer');
        // Its content scrolls on its own; the page does not.
        const sc=await page.evaluate(()=>{const c=document.querySelector('#search-form .search-modal__content');c.scrollTop=400;return {inner:c.scrollTop,page:scrollY};});
        assert(sc.inner>0,'drawer content scrolls');assert.equal(sc.page,y0,'page does not scroll');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(420);
        const end=await state(page);
        assert(!end.open&&end.vis==='hidden'&&!/open-(search|drawer)/.test(end.html),'Escape closes the drawer');
        await page.click('.top-search-toggle');await page.waitForTimeout(400);
        // Where the drawer leaves room the scrim closes it; full width on a
        // phone, its close button does.
        if(box.left>20)await page.mouse.click(10,vp.height/2);
        else await page.click('#search-form .btn-search-close');
        await page.waitForTimeout(420);
        assert.equal((await state(page)).open,false,'the scrim or close button closes the drawer');
        assert.deepEqual(errors,[]);
        await page.close();passed++;
      }
    }

    // ---------- No lag: debounced, aborted, no doubled listeners ----------
    {
      const page=await browser.newPage({viewport:{width:1280,height:800}});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.setContent(fixture('popup'));
      // The header redrawn three times in the builder.
      await page.evaluate(()=>{for(let i=0;i<3;i++){const sec=document.querySelector('.section-header');sec.innerHTML=sec.innerHTML;sec.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:'header'}}));BlsSearchShopify.init();}});
      await page.click('.top-search-toggle');await page.waitForTimeout(300);
      assert.equal((await state(page)).open,true,'one click opens once after redraws (no doubled toggles)');
      await page.keyboard.type('dress',{delay:30});
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(()=>requests.length),1,'typing a word sends one request');
      // A slow answer is cancelled by the next query.
      await page.evaluate(()=>{window.fetchDelay=600;});
      await page.fill('#search-template','shirt');await page.waitForTimeout(320);
      await page.fill('#search-template','shoes');await page.waitForTimeout(320);
      assert.equal(await page.evaluate(()=>aborted),1,'the stale request is aborted');
      await page.waitForTimeout(700);
      assert.equal(await page.evaluate(()=>requests.length),3);
      // A repeated query is answered from memory.
      await page.fill('#search-template','dress');await page.waitForTimeout(320);
      assert.equal(await page.evaluate(()=>requests.length),3,'a repeated query is not fetched again');
      // Arrow keys move through the results without errors.
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.evaluate(()=>document.getElementById('search-template').getAttribute('aria-activedescendant')),'o1');
      // The document has no search keyup handler that blocks other keys.
      await page.keyboard.press('Escape');await page.waitForTimeout(390);
      assert.equal((await state(page)).open,false);
      assert.deepEqual(errors,[]);
      await page.close();passed++;
    }

    // ---------- No results, and a subtle loading state, in both types ----------
    for(const mode of ['popup','drawer'])for(const vp of [{width:1280,height:800},{width:375,height:740}]){
      const where=`${mode} ${vp.width}px`;
      const page=await browser.newPage({viewport:vp});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const st={search_type:mode};
      await page.setContent(fixture(mode,'fade',{shirt:resultsSection('shirt',[product(1,{sale:true}),product(2),product(3)],st),'zz"<q':resultsSection('zz"<q',[],st)}));
      await page.click('.top-search-toggle');await page.waitForTimeout(350);
      await page.fill('#search-template','shirt');await page.waitForTimeout(400);
      const measure=()=>page.evaluate(()=>{const f=document.getElementById('search-form');const p=f.querySelector('#predictive-search');const list=p.querySelector('.search-list-item');
        return {panel:f.getBoundingClientRect().height,results:list?list.getBoundingClientRect().height:0,dim:list?+getComputedStyle(p.querySelector('[data-predictive-search]')).opacity:1,
          loading:p.classList.contains('loading'),skeleton:[...f.querySelectorAll('.search__loading-state')].some(e=>e.getClientRects().length>0),cards:p.querySelectorAll('.product-item').length};});
      const withResults=await measure();
      assert.equal(withResults.cards,3,`${where}: three result cards`);
      // A slow answer: what is on screen stays, dimmed, and nothing collapses.
      await page.evaluate(()=>{window.fetchDelay=700;});
      await page.fill('#search-template','zz"<q');await page.waitForTimeout(450);
      const loading=await measure();
      assert(loading.loading,`${where}: loading`);
      assert(!loading.skeleton,`${where}: no skeleton swapped in`);
      assert(loading.dim<1&&loading.dim>0.3,`${where}: the previous results are dimmed (${loading.dim})`);
      assert(Math.abs(loading.results-withResults.results)<=1&&loading.panel>=withResults.panel-1,`${where}: nothing collapses while loading`);
      await page.waitForTimeout(700);
      const empty=await page.evaluate(()=>{const f=document.getElementById('search-form');const m=f.querySelector('.search-empty');const q=f.querySelector('#quick-search');const r=e=>e&&e.getBoundingClientRect().toJSON();
        const field=f.querySelector('#search_mini_form');
        return {text:m&&m.textContent.trim(),msg:r(m),visible:m&&m.getClientRects().length>0&&+getComputedStyle(m).opacity>0,quick:r(q),quickShown:q&&q.getClientRects().length>0,field:r(field),
          status:f.querySelector('.predictive-search-status').textContent.trim(),cards:f.querySelectorAll('#predictive-search .product-item').length,loading:f.querySelector('#predictive-search').classList.contains('loading'),
          overflow:(f.querySelector('.fluid_container,.search-modal__content')||f).scrollWidth-(f.querySelector('.fluid_container,.search-modal__content')||f).clientWidth};});
      assert.equal(empty.text,'No result found for “zz"<q”',`${where}: the no-results line names the query, escaped`);
      assert(empty.visible&&!empty.loading&&empty.cards===0,`${where}: no-results state shown`);
      assert.equal(empty.status,empty.text,`${where}: announced in the status region`);
      assert(empty.quickShown,`${where}: trending searches are kept`);
      assert(empty.msg.top>=empty.field.bottom-1&&empty.quick.top>=empty.msg.bottom-1,`${where}: the message sits under the field, above trending`);
      assert(empty.overflow<=0,`${where}: no sideways scroll`);
      // Clearing the field brings back the panel as it opened.
      await page.fill('#search-template','');await page.waitForTimeout(350);
      assert(await page.evaluate(()=>!document.querySelector('#search-form .search-empty')&&!document.querySelector('#search-form #predictive-search.is-empty')&&document.querySelector('#search-form #quick-search').getClientRects().length>0),`${where}: cleared`);
      assert.deepEqual(errors,[]);
      await page.close();
    }
    passed++;

    // ---------- Result cards follow Theme settings > Product cards ----------
    for(const [label,cs] of [['portrait, vendor, standard',{product_image_ratio:'portrait',show_vendor:true,product_style:'standard',show_sale:true}],['square, no vendor, modern',{product_image_ratio:'square',show_vendor:false,product_style:'morden',show_sale:false}]]){
      const markup=resultsSection('shirt',[product(1,{sale:true}),product(2),product(3)],{...cs,search_type:'popup'});
      const ratio=cs.product_image_ratio==='portrait'?3/4:1;
      assert.equal((markup.match(/class="product-item product__item-js/g)||[]).length,3,`${label}: the shared product card`);
      assert.equal((markup.match(new RegExp(`style-as-${cs.product_style}`,'g'))||[]).length,3,`${label}: card style from the setting`);
      assert.equal(/product-item__vendor/.test(markup),cs.show_vendor,`${label}: vendor follows the setting`);
      assert(/class="product__badges/.test(markup.split('class="product-item product__item-js')[1]),`${label}: the sale card draws its badges`);
      assert.match(markup,new RegExp(`data-show-sale="${cs.show_sale}"`),`${label}: badge settings carried`);
      for(const vp of [{width:1280,height:800},{width:375,height:740}]){
        const where=`${label} ${vp.width}px`;
        const page=await browser.newPage({viewport:vp});
        await page.setContent(fixture('popup','fade',{shirt:markup}));
        await page.click('.top-search-toggle');await page.waitForTimeout(350);
        await page.fill('#search-template','shirt');await page.waitForTimeout(450);
        const cards=await page.evaluate(()=>[...document.querySelectorAll('#search-form .product-item')].map(c=>{const m=c.querySelector('.product-item__media--ratio').getBoundingClientRect();const i=c.querySelector('.product-item__information').getBoundingClientRect();const r=c.getBoundingClientRect();
          return {m:m.toJSON(),i:i.toJSON(),r:r.toJSON(),price:!!c.querySelector('.product-item__price'),dir:getComputedStyle(c.querySelector('.product-item__wrapper')).flexDirection,disp:getComputedStyle(c.querySelector('.product-item__wrapper')).display};}));
        assert.equal(cards.length,3);
        for(const c of cards){
          assert(Math.abs(c.m.width/c.m.height-ratio)<0.03,`${where}: image ratio ${cs.product_image_ratio} (${(c.m.width/c.m.height).toFixed(2)})`);
          assert(c.price,`${where}: price shown (Show prices in results)`);
        }
        if(vp.width<768){
          // A clean list: one card a row, the picture at the start, details beside it.
          for(const c of cards){assert(c.disp==='flex'&&c.dir==='row'&&c.m.width<=90&&c.i.left>=c.m.right,`${where}: list row ${JSON.stringify(c)}`);}
          for(let k=1;k<cards.length;k++)assert(cards[k].r.top>=cards[k-1].r.bottom,`${where}: one card a row`);
        } else {
          assert(cards.every(c=>Math.abs(c.r.top-cards[0].r.top)<=1),`${where}: cards side by side`);
        }
        assert(await page.evaluate(()=>{const c=document.querySelector('#search-form .fluid_container');return c.scrollWidth<=c.clientWidth;}),`${where}: no sideways scroll`);
        await page.close();
      }
    }
    passed++;

    // ---------- Other animations stay transform/opacity/filter only ----------
    for(const anim of ['slide-down','zoom','blur']){
      const page=await browser.newPage({viewport:{width:1280,height:800}});
      await page.setContent(fixture('popup',anim));
      await page.evaluate(()=>document.querySelector('#quick-search').remove());
      const tl=await timeline(page,true);
      assert(tl.every(x=>x.op===1),`${anim}: the panel is never see-through`);
      assert(tl[0].cop<0.35&&tl[tl.length-1].cop===1,`${anim}: its content fades in`);
      assert(tl.every(x=>x.h>0&&x.left===0),`${anim}: full width`);
      const box=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().top);
      assert.equal(box,0,`${anim}: ends at the top of the screen`);
      assert.equal(await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().height),120,`${anim}: with nothing below the field, exactly the announcement bar and the header`);
      await page.close();
    }
    passed++;

    // ---------- Reduced motion: opens at once ----------
    {
      const ctx=await browser.newContext({viewport:{width:375,height:740},reducedMotion:'reduce'});
      const page=await ctx.newPage();
      await page.setContent(fixture('drawer'));
      await page.click('.top-search-toggle');await page.waitForTimeout(60);
      const b=await page.evaluate(()=>document.getElementById('search-form').getBoundingClientRect().left);
      assert(b<=1,'no slide under reduced motion');
      await ctx.close();passed++;
    }
  } finally {await browser.close();}
  console.log(`${passed} search overlay checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
