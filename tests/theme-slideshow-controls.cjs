/* Slideshow and image-with-text-steps controls follow Theme settings > Buttons:
   appearance, hover effect, hover timing, shape and type, with the sections'
   own options as explicit overrides. Repository fixtures with the real CSS. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
  let passed=0;
  const slideshow=read('sections/slideshow.storelib');
  const steps=read('sections/image-with-text-steps.storelib');
  // Markup: buttons opt into the contract; an unlinked CTA still hovers;
  // arrows are real buttons with labels; old setting ids are kept.
  const markup=slideshow.slice(0,slideshow.indexOf('<schema>'));
  assert(!/role="link" aria-disabled="true"/.test(markup),'an unlinked slideshow button must not be aria-disabled (the contract skips its hover)');
  assert(markup.includes('data-button-unlinked'));
  assert.equal((markup.match(/<button type="button" class="swiper-arrow[^"]*" data-ss-arrow aria-label="(Previous|Next) slide"/g)||[]).length,2);
  assert(!markup.includes("render 'swiper-navigation'"));
  assert(!/\.sec__content \.btn[^{]*\{[^}]*transition/.test(markup),'no section transition competes with the theme timing');
  const schema=JSON.parse(slideshow.slice(slideshow.indexOf('<schema>')+8,slideshow.indexOf('</schema>'))).shopify;
  const ids=schema.settings.map(s=>s.id).filter(Boolean);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ['show_arrow','btn_custom_enable','btn_radius_override','btn_text_transform_override','btn_first_bg','btn_second_bg','arrow_visibility','arrow_show_mobile','arrow_shape','arrow_style','arrow_size','arrow_bg','arrow_icon_color','arrow_border_color','arrow_hover_bg','arrow_hover_icon_color'])assert(ids.includes(id),id);
  for(const id of ['arrow_visibility','arrow_style'])assert(schema.settings.find(s=>s.id===id).options.length<=3,'two-option selects draw as buttons');
  const stepsMarkup=steps.slice(0,steps.indexOf('<schema>'));
  assert.match(stepsMarkup,/<a class="iws__btn btn-primary[^"]*" data-sl-button data-theme-button="primary" data-button-role="primary"/);
  assert(!/\.iws__btn(:hover)? \{[^}]*(background-color|transition|transform)/.test(stepsMarkup),'steps button paint and motion come from the contract');
  passed++;

  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const vars=':root{--body-font:Arial;--btn-font:Arial;--color-background:#ffffff;--color-heading:#123456;--color-text:#223344;--btn-primary-bg-color:#3c3c3c;--btn-primary-color:#ffffff;--btn-primary-border-color:#3c3c3c;--btn-primary-hover-bg-color:#de5b5b;--btn-primary-hover-color:#fafafa;--btn-primary-hover-border-color:#de5b5b;--btn-secondary-bg-color:#eeeeee;--btn-secondary-color:#222222;--btn-secondary-border-color:#222222;--btn-secondary-hover-bg-color:#008800;--btn-secondary-hover-color:#ffffff;--btn-anim-duration:0ms;--btn-anim-ease:ease;--btn-radius:5px;--btn-padding-x:26px;--btn-padding-y:14px;--btn-font-size:16px;--btn-font-weight:600;--btn-letter-spacing:0px;--btn-text-transform:none;--btn-border-width:0px;--icon-btn-size:44px}';
    const slideButtons=(extra='')=>`<div class="sec__content"><motion-element class="sec__content-btn flex"><a data-button-unlinked aria-label="Shop now" class="inline-flex no-underline btn-primary" data-sl-button data-theme-button="primary" data-button-role="primary" data-button-outline="false" data-button-local-appearance="theme" data-button-appearance="solid" id="s1">Shop now</a><a href="/collections/all" class="inline-flex no-underline btn-secondary" data-sl-button data-theme-button="secondary" data-button-role="secondary" data-button-outline="false" data-button-local-appearance="theme" data-button-appearance="outline" id="s2">See all</a>${extra}</motion-element></div>`;
    const arrows=(cls='')=>`<div class="swiper-actions flex block-md content-center gap-10 mb-30 mb-md-0 original-style${cls}" data-arrow-style="theme"><button type="button" class="swiper-arrow swiper-arrow--prev original-style swiper-button-prev inline-flex content-center" data-ss-arrow aria-label="Previous slide"><svg width="12" height="12" viewBox="0 0 12 12"></svg></button><button type="button" class="swiper-arrow swiper-arrow--next original-style swiper-button-next inline-flex content-center" data-ss-arrow aria-label="Next slide"><svg width="12" height="12" viewBox="0 0 12 12"></svg></button></div>`;
    const fixture=async({body='data-btn-style="solid" data-btn-secondary-style="outline" data-btn-hover="slide" data-sl-btn-hover="none"',style='',actions=''}={})=>{
      await page.setContent(`<style>${vars}body{margin:0}.slideshow{position:relative;height:420px}${style}</style><body ${body}><div id="ss" class="slideshow"><slide-section id="swiper-ss" class="swiper slideshow"><div class="swiper-wrapper"><div class="swiper-slide swiper-slide-active" data-slide-id="b1">${slideButtons()}</div></div>${arrows(actions)}</slide-section></div><div id="shopify-section-steps"><div class="iws__content" style="display:flex;flex-direction:column"><a class="iws__btn btn-primary inline-flex no-underline" data-sl-button data-theme-button="primary" data-button-role="primary" data-button-appearance="solid" style="" href="#" id="st">Shop the range</a></div></div><p id="away" style="height:200px">away</p></body>`);
      for(const f of ['swiper-bundle.min.css','critical.css','theme.css','slideshow.css','theme-button-contract.css'])await page.addStyleTag({content:read('shopify/assets/'+f)});
      await page.addScriptTag({content:read('shopify/assets/materia-experience.js')});
      await page.mouse.move(5,890);
    };
    const css=(sel,key,pseudo)=>page.$eval(sel,(el,[key,pseudo])=>getComputedStyle(el,pseudo||null)[key],[key,pseudo]);
    const setBody=async attrs=>{await page.evaluate(a=>{for(const [k,v] of Object.entries(a))document.body.setAttribute(k,v);document.dispatchEvent(new CustomEvent('materia:theme-applied',{detail:{settings:{btn_style:1,btn_secondary_style:1,btn_hover_effect:1}}}));},attrs);};
    const away=()=>page.mouse.move(5,890);

    // 1. Primary and secondary appearance follow the body attributes, slideshow and steps alike.
    await fixture();
    for(const [primary,secondary] of [['solid','outline'],['outline','solid'],['ghost','soft'],['underline','ghost']]){
      await setBody({'data-btn-style':primary,'data-btn-secondary-style':secondary});
      for(const id of ['#s1','#st'])assert.equal(await page.locator(id).getAttribute('data-button-appearance'),primary,id);
      assert.equal(await page.locator('#s2').getAttribute('data-button-appearance'),secondary);
      if(primary==='solid'){assert.equal(await css('#s1','backgroundColor'),'rgb(60, 60, 60)');assert.equal(await css('#st','backgroundColor'),'rgb(60, 60, 60)');}
      if(['outline','ghost','underline'].includes(primary)){assert.equal(await css('#s1','backgroundColor'),'rgba(0, 0, 0, 0)');assert.equal(await css('#st','backgroundColor'),'rgba(0, 0, 0, 0)');}
      if(secondary==='solid')assert.equal(await css('#s2','backgroundColor'),'rgb(238, 238, 238)');
      if(secondary==='outline')assert.equal(await css('#s2','backgroundColor'),'rgba(0, 0, 0, 0)');
    }
    passed++;

    // 2. Shape and type come from the theme's variables.
    await setBody({'data-btn-style':'solid','data-btn-secondary-style':'outline'});
    await page.evaluate(()=>{const r=document.documentElement.style;r.setProperty('--btn-radius','11px');r.setProperty('--btn-padding-x','31px');r.setProperty('--btn-padding-y','17px');r.setProperty('--btn-font-size','19px');r.setProperty('--btn-font-weight','700');r.setProperty('--btn-letter-spacing','2px');r.setProperty('--btn-text-transform','uppercase');r.setProperty('--btn-border-width','3px');});
    for(const id of ['#s1','#s2','#st']){
      assert.equal(await css(id,'borderTopLeftRadius'),'11px',id);assert.equal(await css(id,'paddingLeft'),'31px',id);assert.equal(await css(id,'paddingTop'),'17px',id);
      assert.equal(await css(id,'fontSize'),'19px',id);assert.equal(await css(id,'fontWeight'),'700',id);assert.equal(await css(id,'letterSpacing'),'2px',id);
      assert.equal(await css(id,'textTransform'),'uppercase',id);assert.equal(await css(id,'borderTopWidth'),'3px',id);
    }
    passed++;

    // 3. Hover timing and feel follow --btn-anim-duration / --btn-anim-ease.
    for(const [ms,ease] of [['175ms','cubic-bezier(0.2, 0.7, 0.2, 1)'],['420ms','linear']]){
      await page.evaluate(([ms,ease])=>{document.documentElement.style.setProperty('--btn-anim-duration',ms);document.documentElement.style.setProperty('--btn-anim-ease',ease);},[ms,ease]);
      for(const id of ['#s1','#s2','#st']){
        assert((await css(id,'transitionDuration')).split(', ').every(d=>d===(parseInt(ms)/1000)+'s'),id+' duration');
        assert((await css(id,'transitionTimingFunction')).includes(ease),id+' ease');
        assert.equal(await css(id,'transitionDuration','::before'),(parseInt(ms)/1000)+'s',id+' sweep duration');
      }
    }
    await page.evaluate(()=>document.documentElement.style.setProperty('--btn-anim-duration','0ms'));
    passed++;

    // 4. Hover effect: slide (also on an unlinked slideshow CTA) and scale.
    await setBody({'data-btn-hover':'slide'});
    for(const id of ['#s1','#s2','#st']){
      assert.equal(await page.locator(id).getAttribute('data-button-hover'),'slide');
      await away();await page.hover(id);await page.waitForTimeout(40);
      assert.equal(await page.$eval(id,el=>new DOMMatrix(getComputedStyle(el,'::before').transform).m11),1,id+' slide sweep');
    }
    await away();await page.hover('#s1');await page.waitForTimeout(40);
    assert.equal(await css('#s1','color'),'rgb(250, 250, 250)','slide hover text colour');
    assert.equal(await css('#s1','backgroundColor','::before'),'rgb(222, 91, 91)');
    await setBody({'data-btn-hover':'scale'});
    for(const id of ['#s1','#st']){
      await away();await page.hover(id);await page.waitForTimeout(40);
      assert.equal(await page.$eval(id,el=>new DOMMatrix(getComputedStyle(el).transform).m11),1.035,id+' scale');
      assert.equal(await page.$eval(id,el=>new DOMMatrix(getComputedStyle(el,'::before').transform).m11),0,id+' no sweep under scale');
    }
    await away();passed++;

    // 5. Explicit section and slide options still override, on top of the theme's hover.
    await fixture({body:'data-btn-style="solid" data-btn-secondary-style="outline" data-btn-hover="slide" data-sl-btn-hover="none"',style:
      '#ss .sec__content [data-button-role]{--mb-radius:2px;--mb-padding-y:9px;--mb-padding-x:40px;--btn-text-transform:uppercase}'+ // btn_custom_enable
      '#ss [data-slide-id="b1"] [data-theme-button="primary"]{--mb-bg:#c0beca;--mb-hover-bg:#004400}'+ // enable_custom_colors
      '#ss .swiper-actions{--ss-arrow-radius:999px;--ss-arrow-size:60px;--ss-arrow-bg:#111111;--ss-arrow-icon:#eeeeee;--ss-arrow-border:#ff0000;--ss-arrow-hover-bg:#ffcc00;--ss-arrow-hover-icon:#000000}'});
    await page.evaluate(()=>{const st=document.getElementById('st');st.setAttribute('style','--mb-bg:#ff0000;--mb-radius:7px;--mb-padding-y:14px;--mb-padding-x:26px;--mb-font-size:15px;--mb-weight:600;--btn-border-width:0px;');});
    assert.equal(await css('#s1','backgroundColor'),'rgb(192, 190, 202)');
    assert.equal(await css('#s1','borderTopLeftRadius'),'2px');assert.equal(await css('#s2','paddingLeft'),'40px');assert.equal(await css('#s1','textTransform'),'uppercase');
    assert.equal(await css('#st','backgroundColor'),'rgb(255, 0, 0)');assert.equal(await css('#st','borderTopLeftRadius'),'7px');assert.equal(await css('#st','fontSize'),'15px');
    await page.hover('#s1');await page.waitForTimeout(40);
    assert.equal(await css('#s1','backgroundColor','::before'),'rgb(0, 68, 0)');
    assert.equal(await page.$eval('#s1',el=>new DOMMatrix(getComputedStyle(el,'::before').transform).m11),1,'custom colours keep the theme hover effect');
    await away();passed++;

    // 6. Custom arrows: colours, size, shape and hover from the section tokens.
    const arrow='.swiper-button-next';
    assert.equal(await css(arrow,'width'),'60px');assert.equal(await css(arrow,'borderTopLeftRadius'),'999px');
    assert.equal(await css(arrow,'backgroundColor'),'rgb(17, 17, 17)');assert.equal(await css(arrow,'color'),'rgb(238, 238, 238)');assert.equal(await css(arrow,'borderTopColor'),'rgb(255, 0, 0)');
    await page.hover('#swiper-ss');await page.hover(arrow);await page.waitForTimeout(40);
    assert.equal(await css(arrow,'color'),'rgb(0, 0, 0)');assert.equal(await css(arrow,'backgroundColor','::before'),'rgb(255, 204, 0)');
    assert.equal(await page.$eval(arrow,el=>new DOMMatrix(getComputedStyle(el,'::before').transform).m11),1,'arrow follows the slide effect');
    await away();passed++;

    // 7. Theme arrows: scheme colours, icon button size, button radius, theme hover and timing.
    await fixture({body:'data-btn-style="solid" data-btn-secondary-style="outline" data-btn-hover="none" data-sl-btn-hover="none"',style:'#ss{--color-background:#edf0f3;--color-heading:#334455}'});
    await page.evaluate(()=>{const r=document.documentElement.style;r.setProperty('--icon-btn-size','52px');r.setProperty('--btn-radius','6px');});
    assert.equal(await page.$eval(arrow,el=>el.tagName),'BUTTON');
    assert.equal(await css(arrow,'width'),'52px');assert.equal(await css(arrow,'height'),'52px');assert.equal(await css(arrow,'borderTopLeftRadius'),'6px');
    assert.equal(await css(arrow,'backgroundColor'),'rgb(237, 240, 243)');assert.equal(await css(arrow,'color'),'rgb(51, 68, 85)');
    assert.equal(await css(arrow,'opacity'),'0','hidden until the slideshow is hovered');
    const box=async()=>page.$eval(arrow,el=>{const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y)]});
    const rest=await box();
    await page.hover('#swiper-ss');await page.waitForTimeout(40);assert.equal(await css(arrow,'opacity'),'1');
    await page.hover(arrow);await page.waitForTimeout(40);
    assert.equal(await css(arrow,'backgroundColor'),'rgb(222, 91, 91)','arrow hover uses the primary hover colour');
    assert.equal(await css(arrow,'color'),'rgb(250, 250, 250)');
    assert.deepEqual(await box(),rest,'hover never moves the arrow');
    await away();
    await page.evaluate(()=>document.documentElement.style.setProperty('--btn-anim-duration','260ms'));
    assert((await css(arrow,'transitionDuration')).split(', ').every(d=>d==='0.26s'));
    assert((await css(arrow,'transitionProperty')).includes('opacity'));
    await page.evaluate(()=>document.documentElement.style.setProperty('--btn-anim-duration','0ms'));
    await setBody({'data-btn-hover':'scale'});
    await page.hover('#swiper-ss');await page.hover(arrow);await page.waitForTimeout(40);
    assert.equal(await css(arrow,'scale'),'1.06');
    assert.equal(await page.$eval(arrow,el=>new DOMMatrix(getComputedStyle(el).transform).m42),-26,'centring transform kept under scale');
    await away();passed++;

    // 8. Keyboard: the hidden arrows are in the tab order and show on focus.
    await page.focus('#st');await page.evaluate(()=>document.activeElement.blur());
    await page.evaluate(()=>{document.querySelector('.swiper-button-prev').focus({focusVisible:true});});
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Next slide');
    assert.equal(await css(arrow,'opacity'),'1');assert.equal(await css(arrow,'visibility'),'visible');
    await page.evaluate(()=>document.activeElement.blur());passed++;

    // 9. Shown always, mobile visibility and reduced motion.
    await fixture({actions:' show-arrow'});
    assert.equal(await css(arrow,'opacity'),'1','"Always" shows the arrows without hover');
    await page.setViewportSize({width:375,height:800});
    assert.equal(await page.$eval('.swiper-actions',el=>getComputedStyle(el).display),'none','hidden on phones by default');
    await fixture({actions:' show-on-mobile'});
    assert.notEqual(await page.$eval('.swiper-actions',el=>getComputedStyle(el).display),'none');
    const r=await page.$eval(arrow,el=>el.getBoundingClientRect().toJSON());
    assert(r.width>=44&&r.height>=44&&r.right<=375,'44px targets inside a 375px screen');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),375,'no sideways scroll');
    await page.setViewportSize({width:1200,height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>document.documentElement.style.setProperty('--btn-anim-duration','300ms'));
    assert.equal(await css(arrow,'transitionDuration'),'0s');assert.equal(await css('#s1','transitionDuration'),'0s');
    await setBody({'data-btn-hover':'scale'});await page.hover('#swiper-ss');await page.hover(arrow);
    assert.equal(await css(arrow,'scale'),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});passed++;

    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
  console.log(`${passed} slideshow and steps control checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
