/* Theme settings > Typography reach sections through the shared layer
   (critical.css, theme-controls, theme-type) and change live in the builder
   (theme-live), with the real CSS and script. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const liquidless=t=>t.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g,'').replace(/\{%\s*if request\.design_mode\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g,'').replace(/\{\{\s*button_radius\s*\}\}/g,'8').replace(/\{\{\s*section\.id\s*\}\}/g,'x').replace(/\{\{[^}]*default:\s*'?([^}' ]+)'?\s*\}\}/g,'$1').replace(/\{%-?[\s\S]*?-?%\}/g,'');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try {
  const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const rootVars=':root{--body-font:Arial, sans-serif;--heading-font:Arial, sans-serif;--menu-font:var(--body-font);--btn-font:var(--heading-font);--body-font-size:14px;--body-line-height:1.7;--body-weight:400;--heading-font-scale:1;--heading-line-height:1.2;--heading-text-transform:capitalize;--heading-letter-spacing:unset;--heading-weight:600;--subheading-weight:500;--responsive-rate:0;--color-text:#222;--color-heading:#111;--color-background:#fff}';
  const type=liquidless(read('snippets/theme-type.storelib').replace(/^<template[^>]*>|<\/template>\s*$/g,''));
  const controls=liquidless(read('snippets/theme-controls.storelib').match(/<style>([\s\S]*?)<\/style>/)[1]);
  // A section that writes its own heading weight and spacing on a class.
  const own='<style>.x__title{font-weight:800;letter-spacing:-0.01em;text-transform:none}.x__text{line-height:1.3}</style>';
  await page.setContent(`<style>${rootVars}</style><body><div class="shopify-section" id="shopify-section-x">${type}${own}<h2 class="x__title">Spring linen edit</h2><h4>Care</h4><p class="x__copy">Washed linen, cut in Porto.</p><span class="block__subheading">New in</span><nav class="navigation"><a href="#">Shop</a></nav><a class="btn btn-primary" href="#">Buy the shirt</a></div><cookie-consent class="cookie-consent"><div class="cookie-consent__panel"><p class="cookie-consent__heading cookie-consent__heading">Cookies</p><div class="cookie-consent__message">We use cookies.</div></div></cookie-consent></body>`);
  for(const f of ['critical.css','cookie-consent.css'])await page.addStyleTag({content:read('shopify/assets/'+f)});
  await page.addStyleTag({content:controls});
  const live=read('snippets/theme-live.storelib').match(/<script>([\s\S]*?)<\/script>/)[1].replace(/"\{\{[\s\S]*?\}\}"/g,'""').replace(/\{\{[\s\S]*?\}\}/g,'null').replace(/\{%[\s\S]*?%\}/g,'');
  await page.addScriptTag({content:live});
  const apply=async s=>{await page.evaluate(s=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:s,live:false}})),s);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
  const css=(sel,key)=>page.$eval(sel,(el,key)=>getComputedStyle(el)[key],key);

  // Body text.
  await apply({body_font_size:17,body_font_weight:300,body_line_height:1.9,font_body_system:{family:'Georgia',fallback_families:'serif'}});
  assert.equal(await css('.x__copy','fontSize'),'17px');assert.equal(await css('.x__copy','fontWeight'),'300');
  assert.equal(await css('.x__copy','lineHeight'),`${17*1.9}px`);assert.match(await css('.x__copy','fontFamily'),/Georgia/);checks++;
  assert.match(await css('.cookie-consent__message','fontFamily'),/Georgia/);assert.equal(await css('.cookie-consent__message','fontSize'),'16.5px');checks++;

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

  // Theme settings carry every Typography id the live preview handles.
  const schema=JSON.parse(read('shopify/config/settings_schema.json'));
  const ids=new Set(schema.flatMap(g=>(g.settings||[]).map(s=>s.id)).filter(Boolean));
  for(const id of ['body_font_size','body_font_weight','body_line_height','heading_font_scale','heading_font_weight','heading_line_height','subheading_font_weight','heading_text_transform','heading_letter_spacing','menu_font','button_font','font_body_system','font_heading_system'])assert(ids.has(id),id);checks++;
  assert.deepEqual(errors,[]);
  console.log(`${checks} typography setting checks passed`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
