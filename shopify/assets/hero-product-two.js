/* Hero Product 2: theme-first controls and stable image/video elements in the editor. */
(() => {
  if (window.MateriaHeroProductTwo) return;
  const states = new WeakMap(), active = new Set();
  const parse = value => { try { return JSON.parse(value || '{}'); } catch (_) { return {}; } };
  const bool = value => { value = value && typeof value === 'object' ? value.value : value; return value === true || value === 'true' || value === 1; };
  const num = (value, fallback = 0) => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : fallback;
  const set = (el, name, value) => { if (el.style.getPropertyValue(name) !== String(value) || el.style.getPropertyPriority(name) !== 'important') el.style.setProperty(name, value, 'important'); };
  const attr = (el, name, value) => { if (el.getAttribute(name) !== String(value)) el.setAttribute(name, value); };
  const text = (el, value) => { if (el.textContent !== String(value || '')) el.textContent = value || ''; };
  const url = value => window.MateriaHeroImageOne.url(value, true);
  function videoSource(value) { if (value && typeof value === 'object') { const sources = Array.isArray(value.sources) ? value.sources : [], source = sources.find(s => s.format === 'mp4' || s.mime_type === 'video/mp4') || sources[0]; return url(source?.url || source?.src || value.url || value.src || value.value); } return url(value); }
  function svgIcon(value) {
    const template = document.createElement('template'); template.innerHTML = String(value || '');
    const svg = template.content.querySelector('svg'); if (!svg) return document.createDocumentFragment();
    const tags = new Set(['svg','g','path','circle','ellipse','rect','line','polyline','polygon','title','desc']);
    const attrs = new Set(['viewbox','xmlns','d','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','width','height','points','fill','fill-rule','clip-rule','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','transform']);
    for (const el of [svg, ...svg.querySelectorAll('*')]) {
      if (!tags.has(el.tagName.toLowerCase())) { el.remove(); continue; }
      for (const a of [...el.attributes]) if (!attrs.has(a.name.toLowerCase()) || /url\s*\(/i.test(a.value)) el.removeAttribute(a.name);
      for (const prop of ['fill','stroke']) if (el.hasAttribute(prop) && el.getAttribute(prop) !== 'none') el.setAttribute(prop, 'currentColor');
    }
    svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false'); return svg;
  }
  function button(el, b, custom, fonts, root, desktop) {
    const href = window.MateriaHeroImageOne.url(b.button_link), tag = href ? 'A' : 'BUTTON';
    if (el.tagName !== tag) { const next = document.createElement(tag); for (const a of el.attributes) next.setAttribute(a.name, a.value); next.replaceChildren(...el.childNodes); el.replaceWith(next); el = next; }
    el.removeAttribute('aria-disabled'); if (href) { attr(el,'href',href); el.removeAttribute('type'); } else { el.removeAttribute('href'); el.type = 'button'; }
    text(el,b.button_text); const color = window.MateriaHeroImageOne.color, geometry = custom && !bool(b.use_theme_button);
    for (const [p,id] of [['--mb-bg','button_background_color'],['--mb-text','button_text_color'],['--mb-border','button_border_color'],['--mb-hover-bg','button_background_hover'],['--mb-hover-text','button_text_hover'],['--mb-hover-border','button_border_hover']]) { const value = custom ? color(b[id],'') : ''; if (value) set(el,p,value); else el.style.removeProperty(p); }
    const size = num(desktop ? b.button_font_size : b.button_font_size_mobile,16);
    for (const [p,value] of [['--mb-font-size',size+'px'],['--mb-padding-x',num(b.padding_horizontal,20)+'px'],['--mb-padding-y',num(b.padding_vertical,15)+'px'],['--mb-radius',num(b.button_roundness,6)+'px'],['--mb-weight',b.button_weight || '500'],['font-size',size+'px'],['font-weight',b.button_weight || '500'],['border-radius',num(b.button_roundness,6)+'px'],['border-width',num(b.button_border)+'px'],['padding-left',num(b.padding_horizontal,20)+'px'],['padding-right',num(b.padding_horizontal,20)+'px'],['padding-top',num(b.padding_vertical,15)+'px'],['padding-bottom',num(b.padding_vertical,15)+'px']]) { if (geometry) set(el,p,value); else el.style.removeProperty(p); }
    if (fonts) set(el,'--btn-font',root.dataset.hp2ButtonFont === 'heading_font' ? 'var(--hp2-heading-font)' : 'var(--hp2-body-font)'); else el.style.removeProperty('--btn-font');
    return el;
  }
  function init(root) {
    if (states.has(root)) return states.get(root);
    const state = { settings: {...parse(root.dataset.hp2Defaults),...parse(root.dataset.hp2Settings)}, raw:root.dataset.hp2Settings, blocks:new Map(), blockRaw:new Map(), defaults:parse(root.dataset.hp2BlockDefaults), rich:new WeakMap(), icons:new WeakMap(), frame:0, near:true, reduced:matchMedia('(prefers-reduced-motion:reduce)'), motion:root.dataset.hp2Motion, duration:root.dataset.hp2Duration, delay:root.dataset.hp2Delay };
    const schedule = () => { if (!state.frame) state.frame=requestAnimationFrame(()=>{state.frame=0;if(!root.isConnected){dispose();return;}paint();}); };
    function visibility() {
      const video = root.querySelector('video'); if (!video || !state.videoURL) return;
      if (!state.near || document.hidden) { state.wasPlaying = !video.paused || state.wasPlaying; video.pause(); }
      else if (state.wasPlaying && bool(state.settings.video_autoplay) && !state.reduced.matches) { state.wasPlaying=false; video.play()?.catch(()=>{}); }
    }
    function paint() {
      if (state.raw !== root.dataset.hp2Settings) { state.raw=root.dataset.hp2Settings;state.settings={...parse(root.dataset.hp2Defaults),...parse(state.raw)}; }
      const s=state.settings, desktop=root.clientWidth>=768, custom=bool(s.enable_custom_style), fonts=bool(s.enable_custom_fonts), api=window.MateriaHeroImageOne, color=api.color;
      const scheme=typeof s.color_scheme==='object'?s.color_scheme.id:s.color_scheme; if(typeof scheme==='string'&&/^[\w-]+$/.test(scheme)){for(const c of [...root.classList])if(c.startsWith('color-')&&c!=='color-'+scheme)root.classList.remove(c);root.classList.add('color-'+scheme);}
      const single=bool(s.check_box), headingFont=fonts?api.font(single?s.title_font:s.heading_font):'',bodyFont=fonts?api.font(single?s.title_font:s.body_font):'',fraction=Math.max(25,Math.min(70,num(s.media_width,45)))+'%';
      const vars={'--hp2-bg':custom?color(s.body_bg_color,'var(--color-background)'):'var(--color-background)','--hp2-media-bg':custom?color(s.media_bg_color,'var(--color-background)'):'var(--color-background)','--hp2-heading-font':headingFont||'var(--heading-font)','--hp2-body-font':bodyFont||'var(--body-font)','--hp2-radius-d':custom?num(s.media_radius,20)+'px':'var(--rounded-radius,0px)','--hp2-radius-m':custom?num(s.media_radius_mobile,10)+'px':'var(--rounded-radius,0px)','--hp2-order-d':s.image_position==='right'?2:0,'--hp2-order-m':s.image_position_mobile==='top'?0:2,'--hp2-cols':s.image_position==='right'?`minmax(0,1fr) minmax(0,${fraction})`:`minmax(0,${fraction}) minmax(0,1fr)`,'--hp2-max':({container:'calc(var(--page-width,1300px) + 3rem)',fluid_container:'calc(var(--fluid-container-width,1500px) + 3rem)',stretch_width:'calc(100% - 32px)'}[s.section_width]||'none'),'--hp2-fit':s.media_fit==='contain'?'contain':'cover','--hp2-x':num(s.media_position_x,50)+'%','--hp2-y':num(s.media_position_y,50)+'%'};
      for(const[p,id]of [['--hp2-pt-d','padding_top'],['--hp2-pb-d','padding_bottom'],['--hp2-px-d','section_padding_x'],['--hp2-pt-m','padding_top_mobile'],['--hp2-pb-m','padding_bottom_mobile'],['--hp2-px-m','section_padding_x_mobile'],['--hp2-gap-d','section_gap'],['--hp2-gap-m','section_gap_mobile'],['--hp2-height-d','media_height'],['--hp2-height-m','media_height_mobile'],['--hp2-content-gap','content_gap']])vars[p]=num(s[id])+'px';for(const[p,v]of Object.entries(vars))set(root,p,v);
      const wrapper=root.closest('.shopify-section');if(wrapper){wrapper.dataset.hi1Reset=String(bool(s.reset_spacing));for(const p of ['margin-top','margin-bottom','padding-top','padding-bottom']){if(bool(s.reset_spacing))set(wrapper,p,'0px');else wrapper.style.removeProperty(p);}}
      const picture=root.querySelector('.hp2__media picture'),image=picture.querySelector('img'),video=root.querySelector('video');
      const photo=url(desktop?s.body_bg_image:s.body_bg_image_mobile)||url(s.body_bg_image)||url(s.body_bg_image_mobile)||image.dataset.hp2Placeholder;
      if(image.getAttribute('src')!==photo)image.src=photo;attr(image,'alt',s.image_alt||(typeof s.body_bg_image==='object'?s.body_bg_image?.alt:'')||'');
      let source=picture.querySelector('source');if(!source){source=document.createElement('source');picture.prepend(source);}const mobile=url(s.body_bg_image_mobile);if(mobile)attr(source,'srcset',mobile);else source.removeAttribute('srcset');attr(source,'media',!desktop&&mobile?'all':'not all');
      const desktopVideo=videoSource(s.bg_video)||url(s.bg_video_url),mobileVideo=videoSource(s.bg_video_mobile)||url(s.bg_video_url_mobile),videoURL=s.bg_type==='video'?(desktop?desktopVideo||mobileVideo:mobileVideo||desktopVideo):'';
      if(videoURL!==state.videoURL){state.failedVideo='';state.videoURL=videoURL;state.wasPlaying=false;video.muted=true;if(videoURL){video.src=videoURL;video.load();}else{video.pause();video.removeAttribute('src');video.load();}}
      const failed=state.failedVideo===videoURL;video.hidden=!videoURL||failed;picture.hidden=!!videoURL&&!failed;video.controls=bool(s.video_controls)||state.reduced.matches;video.loop=bool(s.video_loop);const auto=bool(s.video_autoplay)&&!state.reduced.matches;video.autoplay=auto;
      if(photo!==image.dataset.hp2Placeholder){if(video.getAttribute('poster')!==photo)video.poster=photo;}else video.removeAttribute('poster');
      if(state.auto!==auto||state.playURL!==videoURL){if(videoURL&&!failed&&auto&&state.near&&!document.hidden){video.muted=true;video.play()?.catch(()=>{});}else video.pause();state.auto=auto;state.playURL=videoURL;}visibility();
      for(const block of root.querySelectorAll('[data-hp2-block]')){
        const id=block.dataset.hp2Block,type=block.dataset.hp2Kind;if(state.blockRaw.get(id)!==block.dataset.hp2BlockSettings){state.blockRaw.set(id,block.dataset.hp2BlockSettings);state.blocks.set(id,parse(block.dataset.hp2BlockSettings));}
        const b={...state.defaults[type],...state.blocks.get(id)},own=bool(b.enable_custom_style),heading=type==='section_heading',paragraph=type==='section_para';
        const size=heading?desktop?b.heading_font_size:b.heading_font_size_mobile:paragraph?desktop?b.p_font_size:b.p_font_size_mobile:desktop?b.font_size:b.font_size_mobile;
        const weight=heading?b.heading_weight:paragraph?b.p_weight:b.font_weight,ink=heading?b.heading_text_color:paragraph?b.p_text_color:b.text_color;
        for(const[p,v]of Object.entries({'--hp2-font':own?(b.font_source==='heading'?'var(--hp2-heading-font)':'var(--hp2-body-font)'):heading?'var(--hp2-heading-font)':'var(--hp2-body-font)','--hp2-size':own?num(size,16)+'px':heading?'var(--h1-size,48px)':'var(--body-font-size,16px)','--hp2-weight':own&&weight&&weight!=='theme'?weight:heading?'var(--heading-weight,600)':'var(--body-weight,400)','--hp2-ink':own?color(ink,heading?'var(--color-heading)':'var(--color-text)'):heading?'var(--color-heading)':'var(--color-text)','--hp2-case':own&&b.text_case&&b.text_case!=='theme'?b.text_case:heading?'var(--heading-text-transform,none)':'none','--hp2-letter':own?num(b.letter_spacing)+'px':heading?'var(--heading-letter-spacing,normal)':'normal','--hp2-line':own?num(b.line_height,1.5):heading?'var(--heading-line-height,1.2)':'var(--body-line-height,1.5)','--hp2-align':b.text_alignment||b.position||'left'}))set(block,p,v);
        set(block,'padding-top',num(b.padding_top)+'px');set(block,'padding-bottom',num(b.padding_bottom)+'px');
        if(heading||paragraph){const el=block.querySelector(heading?'h1':'.hp2__paragraph');api.rich(el,heading?b.heading_text:b.p_text,state);block.hidden=!el.textContent.trim();}
        if(type==='button'){button(block.querySelector('.hp2__button'),b,own,fonts,root,desktop);block.dataset.hp2Full=String(bool(b.full_width));block.hidden=!b.button_text;}
        if(type==='benefits'){
          set(block,'margin-top',num(b.top_space)+'px');set(block,'margin-bottom',num(b.bottom_space)+'px');set(block,'--hp2-benefits-gap',num(b.vertical_gap,8)+'px');set(block,'--hp2-benefits-align',({center:'center',right:'flex-end'}[b.position]||'flex-start'));set(block,'--hp2-svg-size',num(b.svg_size,20)+'px');set(block,'--hp2-image-size',num(b.img_size,20)+'px');set(block,'--hp2-icon',own?color(b.icon_color,'var(--color-heading)'):'var(--color-heading)');let count=0;
          for(const item of block.querySelectorAll('[data-hp2-benefit]')){const n=item.dataset.hp2Benefit,t=b['benefit_text_'+n],src=url(b['benefit_img_'+n]),svg=b['benefit_svg_'+n],slot=item.querySelector('.hp2__icon');item.hidden=!t;if(t)count++;text(item.querySelector('.hp2__benefit-text'),t);const key=JSON.stringify([src,svg]);if(state.icons.get(slot)!==key){slot.replaceChildren();if(src){const img=document.createElement('img');img.src=src;img.alt='';img.width=64;img.height=64;img.loading='lazy';slot.append(img);}else if(svg)slot.append(svgIcon(svg));state.icons.set(slot,key);}slot.dataset.image=String(!!src);slot.hidden=!slot.childElementCount;}
          block.hidden=!count;
        }
      }
      if(!state.animated){state.animated=true;const animation=s.animation==='theme'?state.motion:s.animation;if(animation&&animation!=='none'&&root.dataset.hp2Editor!=='true'&&!window.Shopify?.designMode&&!state.reduced.matches){const key=({slide_in:'translateY(24px)',subtle_rise:'translateY(12px)',fade_up:'translateY(12px)',zoom:'scale(.98)',zoom_in:'scale(.96)',cinematic:'scale(1.03)',slide_side:'translateX(-20px)'}[animation]||'none');root.querySelector('.hp2__row').animate([{opacity:0,transform:key,...(animation==='blur_up'?{filter:'blur(8px)'}:{})},{opacity:1,transform:'none',filter:'none'}],{duration:num(state.duration,700),delay:num(state.delay),easing:'ease-out'});}}
    }
    const resize=new ResizeObserver(schedule);resize.observe(root);const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.matches('[data-hp2-block]'))))schedule();});observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-hp2-settings','data-hp2-block-settings']});
    const intersection=new IntersectionObserver(entries=>{state.near=entries[0].isIntersecting;visibility();},{rootMargin:'150px'});intersection.observe(root);
    const error=event=>{if(event.target.matches('video')){state.failedVideo=state.videoURL;schedule();}};root.addEventListener('error',error,true);state.reduced.addEventListener('change',schedule);document.addEventListener('visibilitychange',visibility);
    function dispose(){resize.disconnect();observer.disconnect();intersection.disconnect();root.querySelector('video')?.pause();root.removeEventListener('error',error,true);state.reduced.removeEventListener('change',schedule);document.removeEventListener('visibilitychange',visibility);active.delete(root);states.delete(root);}
    Object.assign(state,{schedule,dispose});states.set(root,state);active.add(root);paint();return state;
  }
  const scan=()=>{if(!window.MateriaHeroImageOne?.font)return;for(const root of active)if(!root.isConnected)states.get(root)?.dispose();document.querySelectorAll('[data-hero-product-two]').forEach(root=>init(root).schedule());};
  document.addEventListener('storelib:settings-change',event=>{const d=event.detail||{},section=d.section||d.sectionId;if(!d.settings)return;for(const root of active){const state=states.get(root);if(!section){if(d.settings.scroll_animation!=null)state.motion=d.settings.scroll_animation;if(d.settings.animation_duration!=null)state.duration=d.settings.animation_duration;if(d.settings.animation_delay!=null)state.delay=d.settings.animation_delay;state.schedule();continue;}if(root.dataset.heroProductTwo!==String(typeof section==='object'?section.id:section).replace(/^shopify-section-/,''))continue;const block=d.block||d.blockId||d.block_id;if(block){const id=String(typeof block==='object'?block.id:block);state.blocks.set(id,{...state.blocks.get(id),...d.settings});}else Object.assign(state.settings,d.settings);state.schedule();}});
  ['DOMContentLoaded','storelib:section-load','shopify:section:load'].forEach(name=>document.addEventListener(name,scan));new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches('[data-hero-product-two]')||n.querySelector('[data-hero-product-two]')))))scan();}).observe(document.documentElement,{subtree:true,childList:true});window.MateriaHeroProductTwo={scan,svgIcon};scan();
})();
