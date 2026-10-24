/* Theme settings > Typography reach sections through the shared layer
   (critical.css, theme-controls, theme-type) and change live in the builder
   (theme-live), with the real CSS and script. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const liquidless=t=>t.replace(/\{\{\s*fp\s*\}\}/g,":where(html:not([data-font-priority='off']))").replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g,'').replace(/\{%\s*if request\.design_mode\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g,'').replace(/\{\{\s*button_radius\s*\}\}/g,'8').replace(/\{\{\s*section\.id\s*\}\}/g,'x').replace(/\{\{[^}]*default:\s*'?([^}' ]+)'?\s*\}\}/g,'$1').replace(/\{%-?[\s\S]*?-?%\}/g,'');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try {
  const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Google Fonts requests are recorded and answered empty, so the test needs no network.
  const fontRequests=[];await page.route('https://fonts.googleapis.com/**',r=>{fontRequests.push(decodeURIComponent(r.request().url()));r.fulfill({status:200,contentType:'text/css',body:''});});
  const fontsSrc=read('snippets/font-variables.storelib');
  const fontRows=fontsSrc.match(/assign mt_fonts = '([^']*)'/)[1],fontPairs=fontsSrc.match(/assign mt_pairs = '([^']*)'/)[1];
  const rootVars=':root{--body-font:Arial, sans-serif;--heading-font:Arial, sans-serif;--menu-font:var(--body-font);--btn-font:var(--heading-font);--body-font-size:14px;--body-line-height:1.7;--body-weight:400;--heading-font-scale:1;--heading-line-height:1.2;--heading-text-transform:capitalize;--heading-letter-spacing:unset;--heading-weight:600;--subheading-weight:500;--responsive-rate:0;--color-text:#222;--color-heading:#111;--color-background:#fff}';
  const type=liquidless(read('snippets/theme-type.storelib').replace(/^<template[^>]*>|<\/template>\s*$/g,''));
  const controls=liquidless(read('snippets/theme-controls.storelib').match(/<style>([\s\S]*?)<\/style>/)[1]);
  // A section that writes its own heading weight and spacing on a class.
  const own='<style>.x__title{font-weight:800;letter-spacing:-0.01em;text-transform:none}.x__text{line-height:1.3}</style>';
  await page.setContent(`<style>${rootVars}</style><body><div class="shopify-section" id="shopify-section-x">${type}${own}<h2 class="x__title">Spring linen edit</h2><h4>Care</h4><p class="x__copy">Washed linen, cut in Porto.</p><span class="block__subheading">New in</span><nav class="navigation"><a href="#">Shop</a></nav><a class="btn btn-primary" href="#">Buy the shirt</a><p class="x__mono">Own font</p><div class="submenu submenu-horizontal"><a class="m-mega" href="#">Linen shirts</a></div><nav class="navigation mobile"><a class="menu_item-link m-drawer" href="#">Sale</a></nav><div class="vertical-menu"><ul><li class="level0"><menu-item><a class="m-vertical" href="#">Trousers</a></menu-item></li></ul></div><div class="footer-block collapsible-content"><ul><li><a class="no-underline reversed-links m-footer" href="#">Shipping</a></li></ul></div><a class="b-contract" data-theme-button="primary" href="#">Shop linen</a></div><div id="minicart_wrapper"><button class="btn-reset pointer mini_cart_addon_btn b-addon" type="button">Add order note</button><button class="btn-save w-full btn-primary b-sheet" type="button">Save</button><form><button class="b-submit" type="submit">Send</button></form></div><cookie-consent class="cookie-consent"><div class="cookie-consent__panel"><p class="cookie-consent__heading cookie-consent__heading">Cookies</p><div class="cookie-consent__message">We use cookies.</div></div></cookie-consent></body>`);
  for(const f of ['critical.css','cookie-consent.css','menu-vertical.css','navigation.css','theme-button-contract.css'])await page.addStyleTag({content:read('shopify/assets/'+f)});
  await page.addStyleTag({content:controls+'.x__mono{font-family:monospace}'});
  // The rows font-variables prints for the builder (design mode only).
  await page.evaluate(([rows,pairs])=>{const m=document.createElement('meta');m.name='materia-fonts';m.content=rows;m.setAttribute('data-pairs',pairs);document.head.appendChild(m);},[fontRows,fontPairs]);
  const live=read('snippets/theme-live.storelib').match(/<script>([\s\S]*?)<\/script>/)[1].replace(/"\{\{[\s\S]*?\}\}"/g,'""').replace(/\{\{[\s\S]*?\}\}/g,'null').replace(/\{%[\s\S]*?%\}/g,'');
  await page.addScriptTag({content:live});
  const apply=async s=>{await page.evaluate(s=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:s,live:false}})),s);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
  const css=(sel,key)=>page.$eval(sel,(el,key)=>getComputedStyle(el)[key],key);

  // Body text.
  await apply({body_font_size:17,body_font_weight:300,body_line_height:1.9,font_body_system:{family:'Georgia',fallback_families:'serif'}});
  assert.equal(await css('.x__copy','fontSize'),'17px');assert.equal(await css('.x__copy','fontWeight'),'300');
  assert.equal(await css('.x__copy','lineHeight'),`${17*1.9}px`);assert.match(await css('.x__copy','fontFamily'),/Georgia/);checks++;
  assert.match(await css('.cookie-consent__message','fontFamily'),/Georgia/);assert(['16.5px','17px'].includes(await css('.cookie-consent__message','fontSize')),'cookie text follows the body size');checks++;

  // Headings: font, weight, line spacing, letter spacing, capitalisation, also over a section's own class rule.
  await apply({font_heading_system:{family:'Courier New',fallback_families:'monospace'},heading_font_weight:700,heading_line_height:1.4,heading_text_transform:'uppercase',heading_letter_spacing:'0.05em'});
  for(const sel of ['.x__title','h4']){
   assert.match(await css(sel,'fontFamily'),/Courier New/);assert.equal(await css(sel,'fontWeight'),'700');assert.equal(await css(sel,'textTransform'),'uppercase');
   const size=parseFloat(await css(sel,'fontSize'));assert.equal(await css(sel,'lineHeight'),`${+(size*1.4).toFixed(2)}px`);
   assert(Math.abs(parseFloat(await css(sel,'letterSpacing'))-size*0.05)<0.05,sel+' letter spacing');checks++;
  }
  await apply({heading_letter_spacing:'negative'});assert(parseFloat(await css('h4','letterSpacing'))<0);checks++;
  // Cookie heading follows the heading settings too.
  assert.equal(await css('.cookie-consent__heading','fontWeight'),'700');assert.equal(await css('.cookie-consent__heading','textTransform'),'uppercase');checks++;

  // Heading size scale.
  const h4=parseFloat(await css('h4','fontSize'));await apply({heading_font_scale:125});
  assert(Math.abs(parseFloat(await css('h4','fontSize'))-h4*1.25)<0.5,'heading scale');checks++;

  // Subheading weight.
  await apply({subheading_font_weight:600});assert.equal(await css('.block__subheading','fontWeight'),'600');
  await apply({subheading_font_weight:300});assert.equal(await css('.block__subheading','fontWeight'),'300');checks++;

  // Menu and button font follow the body or heading choice.
  await apply({menu_font:'heading_font',button_font:'body_font'});
  assert.match(await css('.navigation a','fontFamily'),/Courier New/);assert.match(await css('.btn','fontFamily'),/Georgia/);
  await apply({menu_font:'body_font',button_font:'heading_font'});
  assert.match(await css('.navigation a','fontFamily'),/Georgia/);assert.match(await css('.btn','fontFamily'),/Courier New/);checks++;
  await apply({btn_font_size:16,btn_font_weight:'700',btn_letter_spacing:2,btn_text_transform:'uppercase'});
  assert.equal(await css('.btn','fontSize'),'16px');assert.equal(await css('.btn','fontWeight'),'700');assert.equal(await css('.btn','letterSpacing'),'2px');assert.equal(await css('.btn','textTransform'),'uppercase');checks++;

  // A font picker handle is not a family: the page keeps its font until the builder redraws.
  await apply({font_body_system:'lora_n4'});assert.match(await css('.x__copy','fontFamily'),/Georgia|serif/);assert.doesNotMatch(await css('.x__copy','fontFamily'),/lora_n4/);checks++;

  // Menu font reaches every menu: header, mega menu, mobile drawer, vertical menu, footer.
  const menus=['.navigation a','.m-mega','.m-drawer','.m-vertical','.m-footer'];
  for(const [menu,re] of [['heading_font',/Courier New/],['body_font',/Georgia/]]){
   await apply({menu_font:menu});
   for(const sel of menus)assert.match(await css(sel,'fontFamily'),re,`${sel} follows Menu font ${menu}`);
  }checks++;
  // Button font, size, weight, spacing and case reach every button: in a section, the
  // button contract, a cart drawer sheet, and (font only) plain drawer and form buttons.
  await apply({button_font:'body_font',btn_font_size:15,btn_font_weight:'600',btn_letter_spacing:1,btn_text_transform:'capitalize'});
  for(const sel of ['.btn','.b-contract','.b-sheet']){
   assert.match(await css(sel,'fontFamily'),/Georgia/,sel);assert.equal(await css(sel,'fontSize'),'15px',sel);assert.equal(await css(sel,'fontWeight'),'600',sel);
   assert.equal(await css(sel,'letterSpacing'),'1px',sel);assert.equal(await css(sel,'textTransform'),'capitalize',sel);
  }
  for(const sel of ['.b-addon','.b-submit'])assert.match(await css(sel,'fontFamily'),/Georgia/,sel);
  await apply({button_font:'heading_font'});
  for(const sel of ['.btn','.b-contract','.b-sheet','.b-addon','.b-submit'])assert.match(await css(sel,'fontFamily'),/Courier New/,sel);checks++;

  // More fonts: a Google family applies at once and is requested once, with display=swap
  // and only the weights in use, snapped to the family's own.
  const lastFonts=()=>page.$$eval('link[data-materia-fonts]',l=>l.map(x=>decodeURIComponent(x.href)).pop()||'');
  await apply({body_font_weight:400,heading_font_weight:600,subheading_font_weight:500,btn_font_weight:'500',menu_font:'body_font',button_font:'body_font',font_body_google_family:'Fraunces'});
  assert.match(await css('.x__copy','fontFamily'),/^"?Fraunces"?, Georgia/);
  let href=await lastFonts();assert.match(href,/^https:\/\/fonts\.googleapis\.com\/css2\?family=Fraunces:wght@400;500;700&display=swap$/,href);
  await page.waitForFunction(()=>true);assert(fontRequests.some(u=>u.includes('family=Fraunces')),'Fraunces stylesheet requested');checks++;
  await apply({font_heading_google_family:'Bebas Neue'});
  assert.match(await css('.x__title','fontFamily'),/Bebas Neue/);href=await lastFonts();
  assert(href.includes('family=Fraunces:wght@')&&href.includes('family=Bebas+Neue:wght@400&'),href);checks++;
  await apply({body_font_weight:300});assert.match(await lastFonts(),/Fraunces:wght@300;500;700/);checks++;
  // The same family for both is one family in the request.
  await apply({font_heading_google_family:'Fraunces'});href=await lastFonts();assert.equal(href.split('family=').length,2,href);assert.match(href,/Fraunces:wght@300;500;600;700/);checks++;
  // A pairing fills what More fonts leaves to the picker; system fonts load nothing.
  await apply({font_body_google_family:'none',font_heading_google_family:'none',typography_preset:'luxury'});
  assert.match(await css('.x__copy','fontFamily'),/Lato/);assert.match(await css('.x__title','fontFamily'),/Playfair Display/);
  href=await lastFonts();assert(href.includes('family=Lato:wght@')&&href.includes('family=Playfair+Display:wght@'),href);
  const before=fontRequests.length;await apply({typography_preset:'classic'});assert.match(await css('.x__copy','fontFamily'),/^Georgia/);assert.equal(fontRequests.length,before);checks++;
  // Back to the picker: its font returns.
  await apply({typography_preset:'none',font_body_system:{family:'Georgia',fallback_families:'serif'}});assert.match(await css('.x__copy','fontFamily'),/Georgia/);checks++;
  // A font typed in with Font source Google Fonts.
  await apply({font_body_google:'Roboto Slab',font_type_body:'google'});assert.match(await css('.x__copy','fontFamily'),/Roboto Slab/);
  assert((await lastFonts()).includes('family=Roboto+Slab&'));await apply({font_type_body:'default_font'});checks++;
  // A picker handle among the rows loads that family.
  await apply({font_heading_system:'playfair_display_n7'});assert.match(await css('.x__title','fontFamily'),/Playfair Display/);assert((await lastFonts()).includes('Playfair+Display'));checks++;

  // Use in every section turns on and off live.
  assert.notEqual(await css('.x__mono','fontFamily'),'monospace');
  await apply({theme_font_priority:false});assert.equal(await css('.x__mono','fontFamily'),'monospace');
  await apply({theme_font_priority:true});assert.notEqual(await css('.x__mono','fontFamily'),'monospace');checks++;

  // Every Typography slider and select changes the page live: two of its values draw differently.
  const snap=()=>page.evaluate(()=>[document.documentElement.getAttribute('style'),[...document.documentElement.attributes].map(a=>a.name+a.value).join(),[...document.body.attributes].map(a=>a.name+a.value).join(),getComputedStyle(document.querySelector('.x__copy')).fontFamily,getComputedStyle(document.querySelector('.x__title')).fontFamily].join('|'));
  const typo=JSON.parse(read('shopify/config/settings_schema.json')).find(g=>g.name==='Typography').settings.filter(s=>s.type==='range'||s.type==='select');
  await apply({font_body_google:'Roboto Slab',font_heading_google:'Roboto Slab'});
  for(const s of typo){
   const [a,b]=s.type==='range'?[s.min,s.max]:[s.options[0].value,s.options[s.options.length-1].value];
   await apply({[s.id]:a});const first=await snap();await apply({[s.id]:b});
   assert.notEqual(await snap(),first,`${s.id} changes the page live`);
  }checks++;

  // Every More fonts option and pairing family is a row font-variables can load, and
  // (when the network is there) Google Fonts serves every row as written.
  const rows=new Map(fontRows.split('|').map(r=>r.split(':')).map(([n,k,w])=>[n,{k,w}]));
  for(const id of ['font_body_google_family','font_heading_google_family']){const opts=typo.find(s=>s.id===id).options.map(o=>o.value).filter(v=>v!=='none');assert(opts.length>=45,id);for(const v of opts)assert(rows.has(v),`${id}: ${v}`);}
  const presets=typo.find(s=>s.id==='typography_preset').options.map(o=>o.value).filter(v=>v!=='none');
  const pairs=new Map(fontPairs.split('|').map(r=>r.split(':')).map(([p,b,h])=>[p,[b,h]]));
  for(const p of presets){assert(pairs.has(p),p);for(const f of pairs.get(p))assert(rows.has(f),`${p}: ${f}`);}checks++;
  // Every web font row has fallback metrics, so its swap does not move the page.
  const metrics=new Map(fontsSrc.match(/assign mt_metrics = '([^']*)'/)[1].split('|').map(r=>r.split(':')).map(([n,k,...m])=>[n,{k,m:m.map(Number)}]));
  for(const [n,v] of rows){if('xy'.includes(v.k))continue;const m=metrics.get(n);assert(m,`${n} has fallback metrics`);assert(m.m.length===4&&m.m[0]>60&&m.m[0]<140&&m.m.every(x=>x>=0&&x<160),`${n} metrics are sane`);}
  assert(fontsSrc.includes("assign fb_family = fb_name | append: ' Fallback'")&&fontsSrc.includes('replace_first: fb_token, fb_new'),'fallback family goes into the stack');checks++;
  const online=await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap',{signal:AbortSignal.timeout(5000)}).then(r=>r.ok).catch(()=>false);
  if(online){
   const bad=[];await Promise.all([...rows].filter(([,v])=>!'xy'.includes(v.k)).map(async([n,v])=>{const w=v.w.split('').map(d=>d+'00');const r=await fetch(`https://fonts.googleapis.com/css2?family=${n.replace(/ /g,'+')}:wght@${w.join(';')}&display=swap`).catch(()=>null);const t=r&&r.ok?await r.text():'';const got=new Set((t.match(/font-weight: (\d+)/g)||[]).map(x=>x.split(' ')[1]));if(!w.every(x=>got.has(x)))bad.push(n);}));
   assert.deepEqual(bad,[],'Google Fonts serves every weight listed');checks++;
  }

  // Theme settings carry every Typography id the live preview handles.
  const schema=JSON.parse(read('shopify/config/settings_schema.json'));
  const ids=new Set(schema.flatMap(g=>(g.settings||[]).map(s=>s.id)).filter(Boolean));
  for(const id of ['body_font_size','body_font_weight','body_line_height','heading_font_scale','heading_font_weight','heading_line_height','subheading_font_weight','heading_text_transform','heading_letter_spacing','menu_font','button_font','font_body_system','font_heading_system','font_body_google_family','font_heading_google_family','typography_preset','theme_font_priority'])assert(ids.has(id),id);checks++;
  // New settings carry their default in config/settings.json.
  const values=JSON.parse(read('config/settings.json')).shopify;
  for(const id of ['font_body_google_family','font_heading_google_family'])assert.equal(values[id],'none',id);checks++;
  assert.deepEqual(errors,[]);
  console.log(`${checks} typography setting checks passed`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
