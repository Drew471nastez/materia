const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try {
  const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<style>:root{--body-font:Arial;--color-background:#fff;--color-text:#223344;--color-heading:#123456;--color-primary:#a00;--color-border:#888;--btn-primary-bg-color:#123456;--btn-primary-color:white;--btn-primary-border-color:white;--btn-primary-hover-bg-color:#aa0000;--btn-primary-hover-color:white;--btn-secondary-bg-color:#eee;--btn-secondary-color:#222;--btn-secondary-border-color:#222;--btn-secondary-hover-bg-color:#222;--btn-secondary-hover-color:white}#fields input{color:white!important;background:black!important;border:0!important;padding:1px!important}#fields svg{color:white!important;stroke:white!important}</style><body data-btn-style="solid" data-btn-secondary-style="solid" data-btn-hover="none" data-sl-btn-hover="none"><section class="slideshow"><a id="primary" data-theme-button="primary">Shop</a><button id="secondary" data-theme-button="secondary">More</button><div class="swiper-actions"><div class="swiper-arrow swiper-button-next"><svg></svg></div></div></section><form id="fields"><label for="field">Email</label><input id="field" type="email"><div class="mt-select-wrap mt-sticky-select"><select class="mt-select"><option>S / Black</option></select><svg class="mt-select-wrap__chev"><path d="M0 0"/></svg></div></form></body>');
  for(const file of ['product-page-ui.css','theme-button-contract.css'])await page.addStyleTag({content:read('shopify/assets/'+file)});
  await page.addScriptTag({content:read('shopify/assets/materia-experience.js')});
  const live=read('snippets/theme-live.storelib').match(/<script>([\s\S]*?)<\/script>/)[1].replace(/"\{\{[\s\S]*?\}\}"/g,'""').replace(/\{\{[\s\S]*?\}\}/g,'null').replace(/\{%[\s\S]*?%\}/g,'');
  await page.addScriptTag({content:live});
  const apply=async settings=>{await page.evaluate(s=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:s,live:false}})),settings);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
  const css=(id,key)=>page.$eval(id,(el,key)=>getComputedStyle(el)[key],key);
  await apply({btn_anim_duration:0});await page.mouse.move(1100,700);
  for(const role of ['primary','secondary'])for(const appearance of ['solid','outline','ghost','soft','underline']){
   await apply({[role==='primary'?'btn_style':'btn_secondary_style']:appearance});
   assert.equal(await page.locator('#'+role).getAttribute('data-button-appearance'),appearance);
   if(['ghost','outline','underline'].includes(appearance))assert.equal(await css('#'+role,'backgroundColor'),'rgba(0, 0, 0, 0)');
   if(appearance==='outline')assert.notEqual(await css('#'+role,'borderTopWidth'),'0px');
   if(appearance==='underline')assert.equal(await css('#'+role,'borderBottomWidth'),'1px');checks++;
  }
  await apply({btn_style:'solid',btn_secondary_style:'solid'});
  for(const weight of ['400','500','600','700']){await apply({btn_font_weight:weight});assert.equal(await css('#primary','fontWeight'),weight);assert.equal(await css('#secondary','fontWeight'),weight);checks++;}
  await apply({btn_padding_x:33,btn_padding_y:19,btn_font_size:21,btn_letter_spacing:2,btn_text_transform:'uppercase',btn_border_width:3});
  for(const id of ['#primary','#secondary']){assert.equal(await css(id,'paddingLeft'),'33px');assert.equal(await css(id,'paddingTop'),'19px');assert.equal(await css(id,'fontSize'),'21px');assert.equal(await css(id,'letterSpacing'),'2px');assert.equal(await css(id,'textTransform'),'uppercase');assert.equal(await css(id,'borderTopWidth'),'3px');}checks++;
  for(const [shape,radius]of [['rounded','9px'],['pill','999px'],['square','0px']]){await apply({btn_shape:shape,btn_radius:9});assert.equal(await css('#primary','borderRadius'),radius);checks++;}
  for(const easing of ['linear','ease','cubic-bezier(0.2, 0.7, 0.2, 1)','cubic-bezier(0.65, 0, 0.35, 1)','cubic-bezier(0.34, 1.56, 0.64, 1)']){await apply({btn_anim_ease:easing,btn_anim_duration:175});assert((await css('#primary','transitionTimingFunction')).includes(easing));assert((await css('#primary','transitionDuration')).includes('0.175s'));assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('sl-live-tweak')),false);checks++;}
  await apply({btn_anim_duration:0,btn_shadow_enabled:true});assert.notEqual(await css('#primary','boxShadow'),'none');await apply({btn_shadow_enabled:false});assert.equal(await css('#primary','boxShadow'),'none');checks++;
  for(const effect of ['none','fade','scale','lift','slide','glow','reverse']){
   await page.mouse.move(1100,700);await apply({btn_hover_effect:effect});await page.hover('#primary');
   if(effect==='slide')assert.equal(await page.$eval('#primary',el=>new DOMMatrix(getComputedStyle(el,'::before').transform).m11),1);
   if(effect==='scale')assert.equal(await page.$eval('#primary',el=>new DOMMatrix(getComputedStyle(el).transform).m11),1.035);
   if(effect==='lift')assert.equal(await page.$eval('#primary',el=>new DOMMatrix(getComputedStyle(el).transform).m42),-2);
   if(effect==='glow')assert.notEqual(await css('#primary','boxShadow'),'none');checks++;
  }
  await apply({btn_hover_effect:'scale'});
  for(const extra of ['theme','none','lift','darken','underline']){await apply({storelib_button_hover_effect:extra});await page.hover('#primary');if(extra==='lift')assert.equal(await css('#primary','translate'),'0px -2px');if(extra==='darken')assert.equal(await css('#primary','filter'),'brightness(0.9)');if(extra==='underline')assert((await css('#primary','textDecorationLine')).includes('underline'));assert.equal(await page.locator('#primary').getAttribute('data-button-hover'),'scale');checks++;}
  await page.mouse.move(1100,700);await apply({storelib_button_hover_effect:'none',field_background:'#eef1f5',field_text:'#223344',field_height:58,field_padding_x:23,body_font_size:18,body_font_weight:700,storelib_input_border:'#336699',storelib_input_focus:'#ff8800',storelib_input_radius:11});
  assert.equal(await css('#field','color'),'rgb(34, 51, 68)');assert.equal(await css('#field','backgroundColor'),'rgb(238, 241, 245)');assert.equal(await css('#field','height'),'58px');assert.equal(await css('#field','paddingLeft'),'23px');assert.equal(await css('#field','fontSize'),'18px');assert.equal(await css('#field','borderRadius'),'11px');assert.equal(await css('#field','borderTopColor'),'rgb(51, 102, 153)');assert.equal(await css('label','fontWeight'),'700');
  assert.equal(await css('.mt-select-wrap__chev','color'),await css('select','color'));assert.equal(await css('.mt-select-wrap__chev path','stroke'),await css('select','color'));assert.equal(await css('select','paddingRight'),'44px');await page.focus('#field');assert.equal(await css('#field','outlineColor'),'rgb(255, 136, 0)');checks++;
  await apply({icon_btn_size:64});assert.equal(await css('.swiper-arrow','width'),'64px');assert.equal(await css('.swiper-arrow','height'),'64px');checks++;
  await apply({field_font_size:13,field_label_weight:'400'});
  assert.equal(await css('#field','fontSize'),'18px');assert.equal(await css('label','fontWeight'),'700','legacy field controls cannot override Typography');checks++;
  await apply({color_schemes:{custom:{settings:{background:'#ffffff',text_color:'#223344',heading_color:'#123456',primary_color:'#aa0000',btn_primary_background:'#123456',btn_primary_border_color:'#135724',btn_primary_hover_border_color:'#246813',btn_secondary_hover_border_color:'#765432'}}}});
  await page.$eval('#primary',el=>el.classList.add('color-custom'));await page.$eval('#secondary',el=>el.classList.add('color-custom'));
  await apply({btn_style:'outline',btn_secondary_style:'outline',btn_hover_effect:'fade',storelib_button_hover_border:''});await page.mouse.move(1100,700);
  assert.equal(await css('#primary','borderTopColor'),'rgb(19, 87, 36)');
  await page.hover('#primary');assert.equal(await css('#primary','borderTopColor'),'rgb(36, 104, 19)');
  await page.hover('#secondary');assert.equal(await css('#secondary','borderTopColor'),'rgb(118, 84, 50)');checks++;
  assert.deepEqual(errors,[]);console.log(`${checks} live button and field setting combinations passed`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
