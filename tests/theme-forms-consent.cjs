/* Run: node tests/theme-forms-consent.cjs
   Forms and fields, sheet search fields, sign-up and contact forms, cookies.
   - Readable fields: the layout's scheme and field block and snippets/field-colors
     are rendered by a small Liquid evaluator below (the subset those files use),
     then drawn with the real theme-button-contract.css. A white field Text
     colour on a white scheme must not reach the field.
   - One search field in every sheet: the real LocalizationForm (theme.js) and
     shipping country picker (materia-experience.js) with the real CSS.
   - Forms: materia-forms.js/.css with a copy of Storelib's own submit handler
     (the page posts to /contact, then draws the section again).
   - Cookies: cookie-consent.js/.css settings end to end, and never over an
     open cart drawer, search or menu.
   Fixtures copy what the Liquid draws; they do not replace Storelib's renderer. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const body=f=>read(f).replace(/^<template compat="shopify">\s*/,'').replace(/<\/template>[\s\S]*$/,'');

/* ---- A small Liquid evaluator: assign, if/elsif/else, unless, case/when,
   for (forloop.first, break, continue), comment, render, liquid tags, and the
   filters the field files use. ---- */
function liquid(src,ctx,partial){
  src=src.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g,'');
  const toks=[];const re=/\{%-?\s*liquid\b([\s\S]*?)-?%\}|\{%-?([\s\S]*?)-?%\}|\{\{-?([\s\S]*?)-?\}\}/g;let last=0,m;
  while((m=re.exec(src))){
    if(m.index>last)toks.push({t:'text',v:src.slice(last,m.index)});
    if(m[1]!==undefined){let skip=false;for(const line of m[1].split('\n').map(s=>s.trim()).filter(Boolean)){if(line==='comment'){skip=true;continue}if(line==='endcomment'){skip=false;continue}if(!skip)toks.push(tag(line));}}
    else if(m[2]!==undefined)toks.push(tag(m[2].trim()));
    else toks.push({t:'out',v:m[3].trim()});
    last=re.lastIndex;
  }
  if(last<src.length)toks.push({t:'text',v:src.slice(last)});
  function tag(s){const i=s.search(/\s|$/);return {t:'tag',name:s.slice(0,i),args:s.slice(i).trim()};}
  let pos=0;
  function block(ends){const out=[];while(pos<toks.length){const k=toks[pos];if(k.t==='tag'&&ends.includes(k.name))return out;pos++;
    if(k.t!=='tag'){out.push(k);continue}
    if(k.name==='if'||k.name==='unless'){const node={t:'if',neg:k.name==='unless',branches:[{cond:k.args,body:block(['elsif','else','endif','endunless'])}],else:null};
      while(true){const e=toks[pos++];if(e.name==='elsif')node.branches.push({cond:e.args,body:block(['elsif','else','endif'])});else if(e.name==='else')node.else=block(['endif','endunless']);else break;}out.push(node);}
    else if(k.name==='case'){const node={t:'case',subject:k.args,whens:[],else:null};block(['when','else','endcase']);
      while(true){const e=toks[pos++];if(e.name==='when')node.whens.push({vals:e.args.split(/\s*,\s*|\s+or\s+/),body:block(['when','else','endcase'])});else if(e.name==='else')node.else=block(['endcase']);else break;}out.push(node);}
    else if(k.name==='for'){const [,v,coll]=k.args.match(/^(\w+)\s+in\s+(.+)$/);const node={t:'for',v,coll,body:block(['endfor'])};pos++;out.push(node);}
    else out.push(k);}
    return out;}
  const tree=block([]);
  const BLANK=v=>v==null||v===''||v===false||(Array.isArray(v)&&!v.length);
  function lookup(p,scope){if(/^'.*'$|^".*"$/.test(p))return p.slice(1,-1);if(/^-?\d+(\.\d+)?$/.test(p))return Number(p);if(p==='true')return true;if(p==='false')return false;if(p==='nil'||p==='null')return null;
    let v=scope;for(const part of p.match(/[\w-]+|\[\d+\]/g)){if(v==null)return undefined;v=part[0]==='['?v[Number(part.slice(1,-1))]:v[part];}return v;}
  function splitTop(s,sep){const parts=[];let q=null,cur='';for(const ch of s){if(q){if(ch===q)q=null;cur+=ch;continue}if(ch==="'"||ch==='"'){q=ch;cur+=ch;continue}if(ch===sep){parts.push(cur);cur='';continue}cur+=ch;}parts.push(cur);return parts.map(x=>x.trim());}
  const F={times:(a,b)=>Number(a)*Number(b),plus:(a,b)=>Number(a)+Number(b),minus:(a,b)=>Number(a)-Number(b),divided_by:(a,b)=>Number(a)/Number(b),append:(a,b)=>String(a??'')+String(b??''),prepend:(a,b)=>String(b??'')+String(a??''),split:(a,b)=>String(a).split(b),round:a=>Math.round(Number(a)),default:(a,b)=>BLANK(a)?b:a,json:a=>JSON.stringify(a??null),first:a=>a?.[0]};
  function expr(s,scope){const [head,...fs]=splitTop(s,'|');let v=lookup(head,scope);for(const f of fs){const i=f.indexOf(':');const name=(i<0?f:f.slice(0,i)).trim();const args=i<0?[]:splitTop(f.slice(i+1),',').map(a=>lookup(a,scope));if(!F[name])throw new Error('filter '+name);v=F[name](v,...args);}return v;}
  function cond(s,scope){const ors=s.split(/\s+or\s+/);return ors.some(o=>o.split(/\s+and\s+/).every(a=>{const m=a.match(/^(.+?)\s*(==|!=|>=|<=|>|<|\scontains\s)\s*(.+)$/);if(!m)return !BLANK(expr(a,scope))&&expr(a,scope)!==0||expr(a,scope)===0;
    const l=expr(m[1],scope),op=m[2].trim(),rs=m[3].trim();if(rs==='blank'||rs==='empty')return op==='=='?BLANK(l):!BLANK(l);const r=expr(rs,scope);
    switch(op){case '==':return l==r;case '!=':return l!=r;case '>=':return Number(l)>=Number(r);case '<=':return Number(l)<=Number(r);case '>':return Number(l)>Number(r);case '<':return Number(l)<Number(r);case 'contains':return String(l).includes(r);}}));}
  const show=v=>v==null?'':typeof v==='object'&&v.hex?v.hex:String(v);
  class Brk{} class Cnt{}
  function run(nodes,scope){let out='';for(const n of nodes){
    if(n.t==='text')out+=n.v;else if(n.t==='out')out+=show(expr(n.v,scope));
    else if(n.t==='if'){let hit=false;for(const b of n.branches){const c=cond(b.cond,scope);if(n.neg?!c:c){out+=run(b.body,scope);hit=true;break}}if(!hit&&n.else)out+=run(n.else,scope);}
    else if(n.t==='case'){const s=expr(n.subject,scope);const w=n.whens.find(w=>w.vals.some(v=>lookup(v,scope)===s));if(w)out+=run(w.body,scope);else if(n.else)out+=run(n.else,scope);}
    else if(n.t==='for'){const list=expr(n.coll,scope)||[];let i=0;for(const item of list){scope[n.v]=item;scope.forloop={first:i===0,last:i===list.length-1,index:i+1,index0:i};i++;try{out+=run(n.body,scope)}catch(e){if(e instanceof Brk)break;if(e instanceof Cnt)continue;throw e}}}
    else if(n.name==='assign'){const i=n.args.indexOf('=');scope[n.args.slice(0,i).trim()]=expr(n.args.slice(i+1).trim(),scope);}
    else if(n.name==='break')throw new Brk();else if(n.name==='continue')throw new Cnt();
    else if(n.name==='render'){const name=n.args.match(/'([^']+)'/)[1];out+=liquid(partial(name),{settings:scope.settings},partial);}
    else if(n.name==='#'||n.name.startsWith('#')){}
    else throw new Error('tag '+n.name);}
  return out;}
  return run(tree,{...ctx});
}
const colour=hex=>{if(hex==null||hex==='')return '';if(hex==='transparent')return {red:0,green:0,blue:0,alpha:0,hex:'transparent'};const n=parseInt(hex.slice(1),16);return {red:n>>16&255,green:n>>8&255,blue:n&255,alpha:1,hex};};
const lum=c=>{const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);};
const rgb=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);return /^color\(srgb/.test(s)?n.map(v=>v*255):n;};
const contrast=(a,b)=>{const x=lum(rgb(a))+0.05,y=lum(rgb(b))+0.05;return x>y?x/y:y/x;};

(async()=>{
  let passed=0;
  const ok=()=>passed++;
  const schema=JSON.parse(read('shopify/config/settings_schema.json'));
  const values=JSON.parse(read('config/settings.json')).shopify;
  const group=name=>schema.find(g=>g.name===name).settings;

  /* 1. Settings: one Field style, every old id kept, nothing conditional. */
  const fields=group('Forms and fields');
  const fieldIds=fields.map(s=>s.id).filter(Boolean);
  for(const id of ['field_height','field_padding_x','field_border_width','input_radius','search_input_radius','storelib_input_radius','field_background','field_text','storelib_input_border','storelib_input_focus','field_font_size','field_label_weight'])assert(fieldIds.includes(id),'kept '+id);
  const style=fields.find(s=>s.id==='field_style');
  assert.equal(fieldIds[0],'field_style','Field style comes first');
  assert.deepEqual(style.options.map(o=>o.value),['outline','filled','underline']);
  assert.equal(style.default,'outline');assert.equal(values.field_style,'outline');
  const cookie=group('Cookies & consent');
  for(const [id,def] of [['cookie_custom_text_sizes',false],['cookie_heading_size',16],['cookie_text_size',14],['cookie_button_text_size',14]]){
    assert.equal(cookie.find(s=>s.id===id).default,def,id);assert.equal(values[id],def,'value written for '+id);}
  for(const s of [...fields,...cookie])assert(!('visible_if' in s),'no visible_if in theme settings: '+(s.id||s.content));
  const ids=schema.flatMap(g=>(g.settings||[]).map(s=>s.id).filter(Boolean));
  assert.equal(new Set(ids).size,ids.length,'theme setting ids are unique');
  const layout=read('layout/theme.storelib');
  assert(!/--field-text-override:\s*\{\{\s*settings\.field_text/.test(layout),'field text is no longer written over every scheme');
  assert.match(layout,/\{%- render 'field-colors' -%\}/);
  const bottom=read('snippets/content-bottom.storelib');
  assert.match(bottom,/'materia-forms\.js' \| asset_url/);assert.match(bottom,/'materia-forms\.css' \| asset_url \| stylesheet_tag/);
  assert(!/\son[a-z]+=["']/.test(bottom.slice(bottom.indexOf('<cookie-consent'))),'no inline handlers');
  assert(read('shopify/assets/theme.js').includes('field.setAttribute("data-sheet-search", "")'),'the localization search pill is marked as a sheet search');
  ok();

  /* 2. Readable fields, rendered from the layout's own block. */
  const start=layout.indexOf('{% for scheme in settings.color_schemes -%}');
  const end=layout.indexOf('{%- comment -%} Buttons on hover');
  const block=layout.slice(start,end);
  const partial=name=>body('snippets/'+name+'.storelib');
  const scheme=(id,bg,text,heading,border)=>({id,settings:{background:colour(bg),text_color:colour(text),heading_color:colour(heading),primary_color:colour(heading),border_color:colour(border)}});
  const schemes=[scheme('scheme-light','#ffffff','#0f0f0f','#000000','#cecece'),scheme('scheme-dark','#0f132b','#ffffff','#ffffff','#555555'),scheme('scheme-cream','#fffbf1','#3a3530','#1c1a17','#e3dcce')];
  const render=st=>liquid(block,{settings:{color_schemes:schemes,storelib_input_radius:-1,...st}},partial);
  // Later in the layout the :root block sets these again; the field rules must still win.
  const laterRoot=':root{--input-color:var(--color-text);--input-placeholder-color:rgba(var(--color-heading-rgb),.6);--input-border-radius:3px;--inputs-border-width:1px;--input-padding:1rem 11px;--input-height:46px}';
  const contract=read('shopify/assets/theme-button-contract.css');
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:1000,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const fieldsPage=async st=>{
      await page.setContent(`<style>${render(st)}${laterRoot}.color-scheme-light,.color-scheme-dark,.color-scheme-cream{background:var(--color-background);padding:10px}</style>
        ${schemes.map(s=>`<section class="color-${s.id}"><form><label for="e-${s.id}">Email</label><input id="e-${s.id}" type="email" placeholder="you@example.com" value="ana@example.com"><input id="p-${s.id}" type="text" placeholder="Name"><textarea id="t-${s.id}" placeholder="Message">Hello</textarea><select id="s-${s.id}"><option>One</option></select></form></section>`).join('')}`);
      await page.addStyleTag({content:contract});
    };
    const measure=id=>page.$eval('#'+id,el=>{const cs=getComputedStyle(el);let bg=cs.backgroundColor,n=el;
      // The field background over what is behind it.
      const parse=s=>{const p=s.match(/[\d.]+/g).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
      let c=parse(bg);while(c.a<1&&(n=n.parentElement)){const u=parse(getComputedStyle(n).backgroundColor);if(u.a===0)continue;c={r:c.r*c.a+u.r*(1-c.a),g:c.g*c.a+u.g*(1-c.a),b:c.b*c.a+u.b*(1-c.a),a:1};}
      if(c.a<1)c={r:255,g:255,b:255,a:1};
      return {text:cs.color,fill:cs.webkitTextFillColor,ph:getComputedStyle(el,'::placeholder').color,bg:`rgb(${c.r}, ${c.g}, ${c.b})`,bw:[cs.borderTopWidth,cs.borderBottomWidth],radius:cs.borderTopLeftRadius,bc:cs.borderTopColor}});

    // Today's settings: a light Text colour, a transparent field. White on white before.
    for(const text of ['#ffffff','#e8e8e8']){
      await fieldsPage({field_text:colour(text),field_background:colour('transparent')});
      for(const s of schemes)for(const kind of ['e','p','t','s']){
        const m=await measure(kind+'-'+s.id);
        assert(contrast(m.text,m.bg)>=4.5,`${text} on ${s.id} ${kind}: ${m.text} on ${m.bg}`);
        if(kind!=='s')assert(contrast(m.ph,m.bg)>=4.5,`placeholder on ${s.id}: ${m.ph} on ${m.bg}`);
      }
      // Where it reads, the creator's colour is kept.
      assert.equal((await measure('e-scheme-dark')).text,text==='#ffffff'?'rgb(255, 255, 255)':'rgb(232, 232, 232)');
      assert.equal((await measure('e-scheme-light')).text,'rgb(15, 15, 15)','unreadable pick falls back to the scheme text');
    }
    // A dark pick: kept on light schemes, replaced on the dark one.
    await fieldsPage({field_text:colour('#1d4ed8')});
    assert.equal((await measure('e-scheme-light')).text,'rgb(29, 78, 216)');
    assert.equal((await measure('e-scheme-cream')).text,'rgb(29, 78, 216)');
    assert.equal((await measure('e-scheme-dark')).text,'rgb(255, 255, 255)');
    // A picked field background: the text is checked against it, not the scheme.
    await fieldsPage({field_text:colour('#ffffff'),field_background:colour('#111111')});
    for(const s of schemes){const m=await measure('e-'+s.id);assert.equal(m.text,'rgb(255, 255, 255)');assert(contrast(m.text,m.bg)>=4.5);}
    ok();
    // Field style: Outline, Filled, Underline.
    await fieldsPage({field_style:'outline'});
    let m=await measure('e-scheme-light');assert.deepEqual(m.bw,['1px','1px']);assert.equal(m.radius,'3px');
    await fieldsPage({field_style:'filled'});
    m=await measure('e-scheme-light');assert.equal(m.bg,'rgb(241, 241, 241)','filled is a light tint of the scheme');assert.equal(m.bc,'rgba(0, 0, 0, 0)');assert(contrast(m.text,m.bg)>=4.5);
    m=await measure('e-scheme-dark');assert.notEqual(m.bg,'rgb(15, 19, 43)');assert(contrast(m.text,m.bg)>=4.5);
    await fieldsPage({field_style:'underline'});
    m=await measure('e-scheme-light');assert.deepEqual(m.bw,['0px','1px']);assert.equal(m.radius,'0px');
    await fieldsPage({field_style:'underline',storelib_input_radius:6});
    assert.equal((await measure('e-scheme-light')).radius,'6px','the radius override still wins');
    ok();

    // Builder: the same rules redraw live while Forms and fields change.
    await fieldsPage({field_text:colour('#0f0f0f')});
    await page.evaluate(()=>document.documentElement.classList.add('shopify-design-mode'));
    await page.addScriptTag({content:read('shopify/assets/materia-forms.js')});
    const live=async settings=>{await page.evaluate(settings=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings,live:true}})),settings);await page.waitForTimeout(60);};
    await live({field_text:'#ffffff'});
    assert.equal((await measure('e-scheme-light')).text,'rgb(15, 15, 15)','white is not drawn on white in the preview');
    assert.equal((await measure('e-scheme-dark')).text,'rgb(255, 255, 255)');
    await live({field_style:'underline'});
    assert.deepEqual((await measure('e-scheme-light')).bw,['0px','1px']);
    await live({field_style:'filled',field_text:''});
    m=await measure('e-scheme-dark');assert(contrast(m.text,m.bg)>=4.5&&m.bg!=='rgb(15, 19, 43)');
    assert.deepEqual(errors,[]);ok();
    await page.close();

    /* 3. One search field in every sheet. */
    const themeCss=read('shopify/assets/theme.css'),critical=read('shopify/assets/critical.css'),expCss=read('shopify/assets/materia-experience.css');
    const theme=read('shopify/assets/theme.js');
    const loc=theme.slice(theme.indexOf('class LocalizationForm'),theme.indexOf('customElements.define("localization-form", LocalizationForm);')+'customElements.define("localization-form", LocalizationForm);'.length);
    const fieldVars=':root{--color-background:#ffffff;--color-text:#0f0f0f;--color-heading:#000;--color-border:#ccc;--input-bg:rgba(255,255,255,.6);--input-border-color:#bababa;--inputs-border-width:1px;--input-padding:1rem 11px;--input-height:46px;--input-border-radius:3px;--search-input-radius:999px;--field-text:#e8e8e8}';
    const items=JSON.stringify(['AD','BR','RO','US','GB','DE','FR','IT','ES'].map(c=>[c,'Country '+c,'EUR','€','']));
    const oneSearch=async(p,sheet)=>p.evaluate(sheet=>{
      const root=document.querySelector(sheet);
      const inputs=[...root.querySelectorAll('input:not([type=hidden])')].filter(i=>i.getClientRects().length&&getComputedStyle(i).visibility!=='hidden');
      const input=inputs[0],pill=input.parentElement,s=getComputedStyle(input),l=getComputedStyle(pill);
      const ir=input.getBoundingClientRect(),pr=pill.getBoundingClientRect();
      return {count:inputs.length,bg:s.backgroundColor,border:s.borderTopWidth,pad:s.paddingLeft,shadow:s.boxShadow,radius:parseFloat(l.borderTopLeftRadius),pillH:Math.round(pr.height),inside:ir.top>=pr.top-0.5&&ir.bottom<=pr.bottom+0.5,color:s.color,pillBg:l.backgroundColor};
    },sheet);
    for(const [w,h,mobile] of [[390,844,true],[1280,800,false]]){
      const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:mobile,hasTouch:mobile});
      const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
      await p.setContent(`<style>${fieldVars}</style><header class="color-default"><localization-form id="loc"><form><input type="hidden" name="country_code" value="BR"><div class="disclosure"><button type="button" class="button-localization">BR</button><div class="disclosure__list" data-search-label="Search"><ul data-country-options></ul></div></div></form></localization-form></header><script type="application/json" id="materia-country-options" data-current="BR">${items}</script>`);
      await p.addStyleTag({content:critical+themeCss+expCss+contract});
      await p.addScriptTag({content:loc});
      await p.waitForTimeout(30);
      await p.click('#loc .button-localization');await p.waitForTimeout(600);
      const sheet=mobile?'body > .disclosure__list':'#loc .disclosure__list';
      const r=await oneSearch(p,sheet);
      assert.equal(r.count,1,'one search field in the localization '+(mobile?'sheet':'dropdown'));
      assert.deepEqual([r.bg,r.border,r.pad,r.shadow],['rgba(0, 0, 0, 0)','0px','0px','none'],'no second box inside the pill: '+JSON.stringify(r));
      assert(r.inside&&r.pillH===44&&r.radius>=22,'one clean pill: '+JSON.stringify(r));
      assert(contrast(r.color,r.pillBg)>=4.5,'search text reads: '+JSON.stringify(r));
      assert.deepEqual(errs,[]);await ctx.close();
    }
    // Shipping estimate country picker: dropdown on desktop, sheet on phones.
    const expJs=read('shopify/assets/materia-experience.js');
    for(const [w,h,mobile] of [[1280,800,false],[390,844,true]]){
      const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:mobile,hasTouch:mobile});
      const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
      await p.route('**/cart.js',route=>route.fulfill({contentType:'application/json',body:'{"total_price":5000,"currency":"EUR"}'}));
      await p.goto('about:blank');
      await p.setContent(`<style>${fieldVars}</style><div id="shipping"><div data-address="root"><div class="form-group"><label for="address_country">Country</label><select id="address_country" class="form-control" name="address[country]" data-default="Germany" data-search-label="Search"></select></div></div></div>`);
      await p.addStyleTag({content:critical+expCss+contract});
      await p.addScriptTag({content:expJs});
      await p.waitForSelector('.mcp-trigger');
      await (mobile?p.tap('.mcp-trigger'):p.click('.mcp-trigger'));await p.waitForTimeout(600);
      const r=await oneSearch(p,'.mcp-panel');
      assert.equal(r.count,1,'one search field in the shipping picker');
      assert.deepEqual([r.bg,r.border,r.pad],['rgba(0, 0, 0, 0)','0px','0px']);
      assert(r.inside&&r.pillH===44&&r.radius>=22&&contrast(r.color,r.pillBg)>=4.5,JSON.stringify(r));
      assert.deepEqual(errs,[]);await ctx.close();
    }
    // Any other searchable list marked [data-sheet-search] gets the same pill, and a plain search page field stays a field.
    {
      const p=await browser.newPage();
      await p.setContent(`<style>${fieldVars}</style><div class="sheet"><label data-sheet-search><svg width="16" height="16"></svg><input type="search" placeholder="Search"></label></div><form><input id="plain" type="search" placeholder="Search"></form>`);
      await p.addStyleTag({content:critical+contract});
      await p.waitForTimeout(500);
      const r=await oneSearch(p,'.sheet');
      assert.deepEqual([r.count,r.bg,r.border],[1,'rgba(0, 0, 0, 0)','0px']);
      assert.equal(await p.$eval('#plain',el=>getComputedStyle(el).borderTopWidth),'1px');
      await p.close();
    }
    ok();

    /* 4. Sign-up and contact forms. */
    const formsJs=read('shopify/assets/materia-forms.js'),formsCss=read('shopify/assets/materia-forms.css');
    // Storelib's submit handler for imported themes, as the page ships it (shortened).
    const storelib=`document.addEventListener("submit",function(e){var f=e.target;if(!f||f.tagName!=="FORM"||e.defaultPrevented)return;var act=(f.getAttribute("action")||"").replace(location.origin,"");var ti=f.querySelector('input[name="form_type"]');var type=ti&&ti.value;if(!/^\\/contact(?:[\\/?#]|$)/.test(act)||(type!=="customer"&&type!=="contact"))return;e.preventDefault();if(f.getAttribute("data-storelib-sending"))return;f.setAttribute("data-storelib-sending","1");var btns=[].slice.call(f.querySelectorAll('button,input[type=submit]'));btns.forEach(function(b){b.disabled=true});f.setAttribute("aria-busy","true");var sec=f.closest(".shopify-section");var data=new FormData(f);var done=function(){f.removeAttribute("data-storelib-sending");f.removeAttribute("aria-busy");btns.forEach(function(b){b.disabled=false})};var note=function(x,where){var t=where||f;var old=t.parentNode&&t.parentNode.querySelector(":scope>.storelib-form-note");if(old)old.remove();var p=document.createElement("p");p.className="storelib-form-note";p.setAttribute("role",x.ok?"status":"alert");p.textContent=x.ok?(type==="customer"?"Thanks for subscribing.":"Thanks for writing. We'll get back to you soon."):(x.message||"It did not send. Try again.");t.insertAdjacentElement("afterend",p)};window.posted=(window.posted||[]).concat([Object.fromEntries(data)]);fetch("/contact",{method:"POST",body:data}).then(function(r){return r.json()}).then(function(x){if(x.ok)f.reset();if(!sec||!sec.id){done();note(x);return}var q=new URLSearchParams();if(x.ok)q.set(type+"_posted","true");else q.set("form_error",x.code||"failed");q.set("section_id",sec.id.replace(/^shopify-section-/,""));var forms=function(root){return[].slice.call(root.querySelectorAll('form')).filter(function(g){var t=g.querySelector('input[name="form_type"]');return t&&t.value===type})};var at=forms(sec).indexOf(f);var before=f.innerText;return fetch("/?"+q.toString()).then(function(r){return r.text()}).then(function(html){var t=document.createElement("template");t.innerHTML=html.trim();var n=t.content.firstElementChild;var nf=forms(n)[at];f.replaceWith(nf);if(nf.innerText===before)note(x,nf)})}).catch(function(){done();note({ok:false})})});`;
    const footer=state=>`<div id="shopify-section-footer" class="shopify-section color-scheme-dark"><form method="post" action="/contact#ContactFooter" id="ContactFooter" class="footer__newsletter newsletter-form" data-storelib-form="subscribe"><input type="hidden" name="form_type" value="customer"><input type="hidden" name="utf8" value="✓"><div class="field"><label class="visually-hidden" for="NewsletterForm">Email</label><input id="NewsletterForm" type="email" name="contact[email]" placeholder="Enter your email" required><button type="submit" class="btn-primary" data-theme-button="primary" id="Subscribe">Sign up</button></div>${state==='ok'?'<div class="newsletter-form__message--success success form__message" id="ContactFooter-success"><span>Thanks for subscribing to our news.</span></div>':''}${state==='error'?'<div class="newsletter-form__message error form__message" role="alert">Email is invalid</div>':''}</form></div>`;
    const plain=`<div class="color-scheme-light" id="plain-wrap"><form method="post" action="/contact" class="subscribe-form"><input type="hidden" name="form_type" value="customer"><input type="email" name="contact[email]" required aria-label="Email"><button type="submit" class="btn-primary">Join</button></form></div>`;
    let doc='',calls=[],reply={ok:true},delay=400;
    const fp=await browser.newPage({viewport:{width:390,height:800}});
    const ferrs=[];fp.on('pageerror',e=>ferrs.push(e.message));
    await fp.route('http://materia.test/**',async route=>{const u=new URL(route.request().url());
      if(route.request().method()==='POST'&&u.pathname==='/contact'){calls.push(route.request().postData());await new Promise(r=>setTimeout(r,delay));return route.fulfill({contentType:'application/json',body:JSON.stringify(reply)});}
      if(u.searchParams.get('section_id')==='footer')return route.fulfill({contentType:'text/html',body:footer(u.searchParams.get('customer_posted')?'ok':'error')});
      return route.fulfill({contentType:'text/html',body:doc});});
    const openForms=async(html,wait=true)=>{
      calls=[];
      doc=`<!doctype html><html><head><style>${render({field_text:colour('#e8e8e8')})}</style></head><body>${html}</body></html>`;
      await fp.goto('http://materia.test/');
      await fp.addStyleTag({content:contract+formsCss});
      await fp.addScriptTag({content:storelib});
      await fp.addScriptTag({content:expJs});
      await fp.addScriptTag({content:formsJs});
      if(wait)await fp.waitForFunction(ms=>performance.now()>ms+50,await fp.evaluate(()=>window.materiaForms.MIN_MS));
    };
    const toastState=()=>fp.evaluate(()=>{const t=document.querySelector('.mt-toast');if(!t)return null;const cs=getComputedStyle(t);return {shown:!t.hidden&&t.hasAttribute('data-show'),text:t.textContent.trim(),role:t.getAttribute('role'),h:t.getBoundingClientRect().height,op:cs.opacity,fg:cs.color,bg:cs.backgroundColor}});

    await openForms(footer(''));
    assert.equal(await fp.locator('#ContactFooter [data-mt-trap] input[name="company"]').count(),1,'trap field added');
    assert.equal(await fp.$eval('#ContactFooter [data-mt-trap]',el=>el.getAttribute('aria-hidden')+','+el.querySelector('input').tabIndex+','+(el.getBoundingClientRect().right<0)),'true,-1,true','trap is out of sight and reach');
    await fp.fill('#NewsletterForm','ana@example.com');
    await fp.click('#Subscribe');
    const busy=await fp.evaluate(()=>({pending:document.querySelector('#Subscribe').classList.contains('materia-form-pending'),busy:document.querySelector('#ContactFooter').getAttribute('aria-busy'),sending:document.querySelector('#ContactFooter').hasAttribute('data-mt-sending')}));
    assert.deepEqual(busy,{pending:true,busy:'true',sending:true},'button shows it is sending');
    await fp.evaluate(()=>{const f=document.querySelector('#ContactFooter');f.requestSubmit();f.requestSubmit();});
    await fp.waitForSelector('.mt-toast[data-show]');
    assert.equal(calls.length,1,'double submits are blocked');
    assert.match(calls[0],/company/,'the trap travels empty with the form');
    let t=await toastState();
    assert(t.shown&&t.text==='Thanks for subscribing to our news.'&&t.role==='status','toast with the theme success text: '+JSON.stringify(t));
    assert(t.h<=60,'a compact toast, not a banner');
    assert(contrast(t.fg,t.bg)>=4.5);
    assert(await fp.$eval('#ContactFooter-success',el=>getComputedStyle(el).display==='none'),'the banner line is folded into the toast');
    assert.equal(await fp.locator('#ContactFooter .materia-form-pending, #ContactFooter[aria-busy="true"], #ContactFooter[data-mt-sending]').count(),0,'pending cleared');
    assert.equal(await fp.locator('#ContactFooter [data-mt-trap]').count(),1,'the redrawn form is armed again');
    await fp.waitForTimeout(4200);
    assert((await toastState()).shown,'still shown at 4s');
    await fp.waitForTimeout(1300);
    t=await toastState();assert(!t.shown,'gone after about 5 seconds');
    await fp.waitForTimeout(400);
    assert(await fp.$eval('.mt-toast',el=>el.hidden));ok();

    // Server error: inline, no toast, pending cleared, typed address kept by Storelib.
    reply={ok:false,code:'invalid'};
    await openForms(footer(''));
    await fp.fill('#NewsletterForm','ana@example.com');await fp.click('#Subscribe');
    await fp.waitForSelector('#ContactFooter .form__message.error');await fp.waitForTimeout(50);
    assert.equal(await fp.locator('.mt-toast[data-show]').count(),0,'no toast on error');
    assert(await fp.$eval('#ContactFooter .form__message.error',el=>el.classList.contains('mt-form-error')&&getComputedStyle(el).display!=='none'));
    assert.equal(await fp.locator('#ContactFooter .materia-form-pending, #ContactFooter[data-mt-sending]').count(),0);
    // A field the browser rejects: the message sits under the field, not in a bubble.
    await fp.fill('#NewsletterForm','not-an-email');await fp.click('#Subscribe');
    assert.equal(calls.length,1,'invalid field is not sent');
    assert.match(await fp.$eval('.mt-field-error',el=>el.getAttribute('role')+' '+el.textContent),/^alert .+/);
    assert.equal(await fp.$eval('#NewsletterForm',el=>el.getAttribute('aria-invalid')),'true');
    await fp.fill('#NewsletterForm','ana@example.com');
    assert.equal(await fp.locator('.mt-field-error').count(),0,'cleared once it is valid');ok();

    // A form with no message of its own: Storelib's note becomes the toast.
    reply={ok:true};
    await openForms(plain);
    await fp.fill('#plain-wrap input[type=email]','bo@example.com');await fp.click('#plain-wrap button');
    await fp.waitForSelector('.mt-toast[data-show]');
    assert.equal((await toastState()).text,'Thanks for subscribing.');
    assert.equal(await fp.locator('.storelib-form-note').count(),0,'the note is not drawn twice');ok();

    // Bots: a filled trap, or a submit faster than a person can type, sends nothing.
    await openForms(footer(''));
    await fp.fill('#NewsletterForm','bot@example.com');
    await fp.evaluate(()=>{document.querySelector('[data-mt-trap] input').value='ACME';});
    await fp.click('#Subscribe');await fp.waitForTimeout(700);
    assert.equal(calls.length,0,'trap: nothing sent');
    assert((await toastState()).shown,'the script is told it worked');
    await openForms(footer(''),false);
    await fp.evaluate(()=>{const f=document.querySelector('#ContactFooter');f.querySelector('input[type=email]').value='fast@example.com';f.requestSubmit();});
    await fp.waitForTimeout(700);
    assert.equal(calls.length,0,'too fast: nothing sent');
    assert(await fp.$eval('#ContactFooter',f=>f.hasAttribute('data-mt-blocked')));
    assert.deepEqual(ferrs,[]);ok();
    await fp.close();

    /* 5. Cookies & consent. */
    const consentJs=read('shopify/assets/cookie-consent.js'),consentCss=read('shopify/assets/cookie-consent.css');
    const banner=(a={},style='')=>{
      const d={enabled:'true','page-ok':'true',page:'other',design:'false',preview:'false',position:'bottom_center',look:'bar-center',animation:'none',mobile:'sheet',backdrop:'true',require:'false','above-nav':'true',delay:'0',expiry:'180',frequency:'every_page','text-sizes':'theme',...a};
      const cls=a.scheme?` color-${a.scheme}`:'';
      return `<cookie-consent class="cookie-consent${cls}" hidden ${Object.entries(d).filter(([k])=>k!=='scheme').map(([k,v])=>`data-${k}="${v}"`).join(' ')} style="${style}">
        <div class="cookie-consent__backdrop" data-consent-backdrop></div>
        <div class="cookie-consent__panel" role="region" aria-labelledby="CookieConsentHeading" tabindex="-1" data-consent-panel>
          <div class="cookie-consent__copy"><h2 class="cookie-consent__heading" id="CookieConsentHeading" data-consent-heading>Cookies</h2>
            <div class="cookie-consent__message"><div data-consent-message><p>We use cookies for the cart.</p></div></div></div>
          <div class="cookie-consent__actions">
            <button type="button" class="cookie-consent__btn btn-outline" data-theme-button="secondary" data-sl-button data-consent="decline">Decline</button>
            <button type="button" class="cookie-consent__btn btn-primary" data-theme-button="primary" data-sl-button data-consent="accept">Accept</button>
          </div>
          <button type="button" class="cookie-consent__close" data-consent="close" aria-label="Close">x</button>
        </div></cookie-consent>`;
    };
    const cp=await browser.newPage({viewport:{width:1280,height:800}});
    const cerrs=[];cp.on('pageerror',e=>cerrs.push(e.message));
    let cdoc='';
    await cp.route('http://materia.test/**',route=>route.fulfill({contentType:'text/html',body:cdoc}));
    const loadBanner=async(html,{keep=false,before='',htmlClass=''}={})=>{
      cdoc=`<!doctype html><html class="${htmlClass}"><head><style>:root{--color-background:#fafafa;--color-text:#222;--color-heading:#111;--body-font-size:15px;--h6-size:17px;--h5-size:19px;--btn-font-size:15px;--btn-primary-bg-color:#123456;--btn-primary-color:#fff;--btn-secondary-color:#222;--btn-secondary-border-color:#222}.color-dark{--color-background:#101820;--color-text:#eeeeee;--color-heading:#ffffff}</style></head><body><div id="minicart_wrapper"><button id="drawer-btn">Checkout</button></div>${html}</body></html>`;
      await cp.goto('http://materia.test/');
      if(!keep)await cp.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
      await cp.addStyleTag({content:contract+consentCss});
      if(before)await cp.evaluate(before);
      await cp.addScriptTag({content:consentJs});
      await cp.waitForTimeout(80);
    };
    const shown=()=>cp.$eval('cookie-consent',el=>!el.hidden&&el.hasAttribute('data-open')&&getComputedStyle(el).visibility==='visible');
    const box=()=>cp.$eval('.cookie-consent__panel',el=>{const r=el.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(innerWidth-r.right),t:Math.round(r.top),b:Math.round(innerHeight-r.bottom),w:Math.round(r.width),bg:getComputedStyle(el).backgroundColor,role:el.getAttribute('role')}});

    // Builder with "Show in the builder" off: never shown, even when asked.
    await loadBanner(banner({design:'true',preview:'false'}));
    await cp.evaluate(()=>window.materiaConsent.open());await cp.waitForTimeout(60);
    assert.equal(await shown(),false,'off in the builder: never shown');
    await loadBanner(banner({design:'false'}),{before:'window.Shopify={designMode:true}'});
    await cp.evaluate(()=>window.materiaConsent.open());await cp.waitForTimeout(60);
    assert.equal(await shown(),false,'Shopify.designMode is the builder too');
    await loadBanner(banner({design:'false'}),{htmlClass:'shopify-design-mode'});
    assert.equal(await shown(),false,'the design-mode class is the builder too');
    // On: shown, and "Show on" is honoured in the preview.
    await loadBanner(banner({design:'true',preview:'true',page:'other'})+`<script type="application/json" data-consent-settings>{"enable_cookies":true,"cookie_show_in_builder":true,"cookie_pages":"home"}</script>`);
    assert.equal(await shown(),false,'Home only: not on another page');
    await cp.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{cookie_pages:'all'}}})));await cp.waitForTimeout(80);
    assert.equal(await shown(),true,'All pages: shown');
    await cp.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{cookie_show_in_builder:false}}})));await cp.waitForTimeout(400);
    assert.equal(await cp.$eval('cookie-consent',el=>el.hidden),true,'turning it off hides it');
    // Text sizes in the preview: only with the toggle on.
    await cp.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{cookie_show_in_builder:true,cookie_heading_size:22,cookie_text_size:13,cookie_button_text_size:17}}})));await cp.waitForTimeout(80);
    const sizes=()=>cp.evaluate(()=>[getComputedStyle(document.querySelector('.cookie-consent__heading')).fontSize,getComputedStyle(document.querySelector('.cookie-consent__message')).fontSize,getComputedStyle(document.querySelector('[data-consent="accept"]')).fontSize]);
    assert.deepEqual(await sizes(),['17px','15px','15px'],'off: theme typography and button size');
    await cp.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{cookie_custom_text_sizes:true}}})));await cp.waitForTimeout(80);
    assert.deepEqual(await sizes(),['22px','13px','17px'],'on: the custom sizes');
    await cp.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{cookie_custom_text_sizes:false}}})));await cp.waitForTimeout(80);
    assert.deepEqual(await sizes(),['17px','15px','15px']);ok();
    // Rendered with sizes on (as the Liquid writes them).
    await loadBanner(banner({'text-sizes':'custom'},'--cookie-heading-size:20px;--cookie-text-size:12px;--cookie-btn-size:16px;'));
    assert.deepEqual(await sizes(),['20px','12px','16px']);

    // Position, look, colour scheme, custom colours.
    await loadBanner(banner({position:'bottom_left'}));let b=await box();assert(b.l<=20&&b.w<=400&&b.b<=20,'bottom left card '+JSON.stringify(b));
    await loadBanner(banner({position:'bottom_right'}));b=await box();assert(b.r<=20&&b.w<=400,'bottom right card');
    await loadBanner(banner({position:'bottom_bar'}));b=await box();assert(b.l===0&&b.r===0&&b.b===0,'full-width bottom bar');
    await loadBanner(banner({position:"top_bar"}));b=await box();assert(b.t===0&&b.l===0,"top bar "+JSON.stringify(b));
    await loadBanner(banner({position:'modal'}));b=await box();assert(Math.abs(b.l-b.r)<=2&&Math.abs(b.t-b.b)<=2&&b.role==='dialog','centred modal');
    assert.equal(await cp.$eval('.cookie-consent__backdrop',el=>getComputedStyle(el).display),'block');
    await loadBanner(banner({look:'dark'}));assert.equal((await box()).bg,'rgb(20, 20, 20)','Dark look');
    await loadBanner(banner({look:'minimal'}));assert.equal(await cp.$eval('.cookie-consent__heading',el=>getComputedStyle(el).display),'none','Minimal look');
    await loadBanner(banner({look:'glass'}));assert.notEqual(await cp.$eval('.cookie-consent__panel',el=>getComputedStyle(el).backdropFilter),'none','Frosted glass look');
    await loadBanner(banner({scheme:'dark'}));assert.equal((await box()).bg,'rgb(16, 24, 32)','colour scheme');
    await loadBanner(banner({},'--cookie-bg:#ffeecc;'));assert.equal((await box()).bg,'rgb(255, 238, 204)','custom colours');
    ok();

    // Remember the choice for N days; After closing.
    await loadBanner(banner({expiry:'7'}));
    await cp.click('[data-consent="accept"]');
    const kept=await cp.evaluate(()=>JSON.parse(localStorage.getItem('materia:consent')));
    assert(kept.accepted===true&&Math.abs(kept.expires-kept.at-7*864e5)<1000,'remembered for 7 days');
    await loadBanner(banner({expiry:'7'}),{keep:true});assert.equal(await shown(),false,'not asked again');
    await loadBanner(banner({frequency:'session'}));await cp.click('[data-consent="close"]');await cp.waitForTimeout(60);
    await loadBanner(banner({frequency:'session'}),{keep:true});assert.equal(await shown(),false,'Hide for the visit');
    await loadBanner(banner({frequency:'every_page'}));await cp.click('[data-consent="close"]');await cp.waitForTimeout(60);
    await loadBanner(banner({frequency:'every_page'}),{keep:true});assert.equal(await shown(),true,'Show again');
    await loadBanner(banner({'page-ok':'false'}));assert.equal(await shown(),false,'Show on: other pages excluded');
    ok();

    // Never over the cart drawer, search or phone menu.
    for(const [label,open,close] of [
      ['cart drawer',()=>{document.documentElement.classList.add('open-drawer','open-minicart');document.getElementById('minicart_wrapper').classList.add('open_drawer');},()=>{document.documentElement.classList.remove('open-drawer','open-minicart');document.getElementById('minicart_wrapper').classList.remove('open_drawer');}],
      ['cart drawer element only',()=>document.getElementById('minicart_wrapper').classList.add('open_drawer'),()=>document.getElementById('minicart_wrapper').classList.remove('open_drawer')],
      ['search',()=>document.documentElement.classList.add('open-search'),()=>document.documentElement.classList.remove('open-search')],
      ['phone menu',()=>document.documentElement.classList.add('nav-open'),()=>document.documentElement.classList.remove('nav-open')]]){
      for(const position of ['bottom_bar','modal']){
        await loadBanner(banner({position}));
        assert.equal(await shown(),true);
        await cp.evaluate(open);await cp.waitForTimeout(320);
        const hidden=await cp.evaluate(()=>{const el=document.querySelector('cookie-consent'),p=el.querySelector('.cookie-consent__panel').getBoundingClientRect();const hit=document.elementFromPoint(p.left+p.width/2,p.top+p.height/2);return {vis:getComputedStyle(el).visibility,hit:Boolean(hit&&el.contains(hit))};});
        assert.deepEqual(hidden,{vis:'hidden',hit:false},`${label}: the banner steps behind (${position})`);
        if(position==='modal'){await cp.focus('#drawer-btn');await cp.keyboard.press('Tab');assert.equal(await cp.evaluate(()=>document.querySelector('cookie-consent').contains(document.activeElement)),false,'the modal does not take focus from the drawer');}
        await cp.evaluate(close);await cp.waitForTimeout(320);
        assert.equal(await shown(),true,`${label}: back after it closes`);
      }
    }
    assert.deepEqual(cerrs,[]);ok();
    await cp.close();
  } finally { await browser.close(); }
  console.log(`${passed} forms, fields and consent checks passed`);
})().catch(e=>{console.error(e);process.exit(1);});
