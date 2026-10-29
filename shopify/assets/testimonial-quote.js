/* Native scrolling only: no margin shifting, touch interception or clones. */
(() => {
  if(window.MateriaTestimonialQuote)return;
  const defaults={"track_label":"Testimonials","section_width":90,"color_scheme":"default-color-scheme","intro_width":30,"testimonial_per_row":"2","testimonials_space_between":20,"show_peek":true,"enable_custom_style":false,"testimonial_box_style":"color","testimonial_text_size":"16","testimonial_box_corner":14,"card_padding":24,"enable_reviewer_photo":true,"stars_shape":"stars","stars_size":"20","button_style":"solid","use_theme_button":true,"button_corner":6,"new_tab":false,"show_navigation":true,"truncate_quotes":true,"quote_lines":4,"read_more_label":"Read more","read_less_label":"Read less","previous_label":"Previous testimonials","next_label":"Next testimonials","top_padding_desktop":40,"bottom_padding_desktop":40,"vertical_margin":0,"top_padding_mobile":20,"bottom_padding_mobile":20,"vertical_margin_mobile":0};
  const blockDefaults={"heading":{"heading":"What Our Customers Say","enable_custom_style":false,"font_source":"heading","heading_style":"semibold","heading_size_desktop":38,"heading_size_mobile":34,"letter_spacing":0,"text_case":"theme"},"description":{"description":"<p>Discover why our customers love us and trust our products every day.</p>","enable_custom_style":false,"font_source":"body","description_size_desktop":16,"description_size_mobile":14,"letter_spacing":0,"text_case":"theme"},"testimonial":{"stars_rating":5,"testimonial_text":"Exceptional service and top-notch quality that exceeds expectations every time","author_name":"John Doe","author_additional_text":"21 September 2025","enable_custom_style":false,"quote_size":16}};
  const states=new WeakMap(),parse=s=>{try{return JSON.parse(s||'{}');}catch(_){return {};}};
  const bool=v=>{v=v&&typeof v==='object'?v.value:v;return v===true||v==='true'||v===1;},num=(v,d=0)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Number(v):d;
  const set=(el,key,value,important=false)=>{if(!el)return;const p=important?'important':'';if(el.style.getPropertyValue(key)!==String(value)||el.style.getPropertyPriority(key)!==p)el.style.setProperty(key,value,p);};
  const text=(el,value)=>{if(el&&el.textContent!==String(value||''))el.textContent=value||'';};
  const unwrap=v=>v&&typeof v==='object'?(v.hex??v.value??v.color??''):v;
  const color=(value,fallback)=>{if(value&&typeof value==='object'&&(value.alpha===0||value.a===0))return fallback;const v=unwrap(value);if(typeof v!=='string')return fallback;const c=v.trim();return c&&CSS.supports('color',c)&&c!=='transparent'&&!/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(c)&&!/^#[0-9a-f]{6}00$/i.test(c)?c:fallback;};
  const image=v=>{const src=typeof v==='object'?v?.src||v?.url:v;if(typeof src!=='string'||!src)return '';try{const u=new URL(src,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(_){return '';}};
  const path=shape=>shape==='heart_stars'?'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z':shape==='pointed_stars'?'M12 1l2.7 8.3h8.7l-7 5.1L19.1 23 12 17.9 4.9 23l2.7-8.6-7-5.1h8.7z':'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z';
  function richText(value){
    const template=document.createElement('template');template.innerHTML=String(value||'');
    template.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(el=>el.remove());
    template.content.querySelectorAll('*').forEach(el=>{
      if(!['P','BR','STRONG','EM','B','I','UL','OL','LI','A','SPAN'].includes(el.tagName)){el.replaceWith(...el.childNodes);return;}
      const href=el.tagName==='A'?el.getAttribute('href'):null;[...el.attributes].forEach(a=>el.removeAttribute(a.name));
      if(href){try{const u=new URL(href,location.href);if(['https:','http:','mailto:','tel:'].includes(u.protocol))el.setAttribute('href',href);}catch(_){}}
    });return template.content;
  }
  function navigation(root,s){
    const row=root.querySelector('.tq-track'),nav=root.querySelector('.tq-navigation');if(!row||!nav)return;
    nav.hidden=!bool(s.show_navigation)||row.scrollWidth<=row.clientWidth+2;
    const at=Math.abs(row.scrollLeft),max=row.scrollWidth-row.clientWidth;
    root.querySelector('.tq-prev').disabled=at<2;root.querySelector('.tq-next').disabled=at>=max-2;
    root.querySelector('.tq-prev').setAttribute('aria-label',s.previous_label);root.querySelector('.tq-next').setAttribute('aria-label',s.next_label);
  }
  function paint(root,state){
    const s=state.settings,custom=bool(s.enable_custom_style),desktop=root.clientWidth>=992;
    const scheme=typeof s.color_scheme==='object'?s.color_scheme.id:s.color_scheme;
    if(typeof scheme==='string'&&/^[\w-]+$/.test(scheme)){for(const c of [...root.classList])if(c.startsWith('color-')&&c!=='color-'+scheme)root.classList.remove(c);root.classList.add('color-'+scheme);}
    for(const [key,v]of Object.entries({'--tq-width':num(s.section_width,90)+'%','--tq-intro-width':num(s.intro_width,30)+'%','--tq-count':Math.max(1,num(s.testimonial_per_row,2)),'--tq-gap':num(s.testimonials_space_between,20)+'px','--tq-card-pad':num(s.card_padding,24)+'px','--tq-star':num(s.stars_size,20)+'px','--tq-lines':Math.max(2,num(s.quote_lines,4)),'--tq-mobile-card':bool(s.show_peek)?'86%':'100%'}))set(root,key,v);
    for(const [key,value,fallback]of [['--tq-bg',s.section_background,'var(--color-background)'],['--tq-text',s.text_color,'var(--color-text)'],['--tq-heading',s.text_color,'var(--color-heading)'],['--tq-quote',s.testimonial_color,'var(--tq-text)'],['--tq-author',s.author_color,'var(--tq-heading)'],['--tq-arrow',s.inactive_arrows_color,'var(--tq-heading)'],['--tq-stars',s.stars_color,'var(--tq-heading)'],['--tq-empty',s.empty_stars_color,'var(--color-border)']])set(root,key,custom?color(value,fallback):fallback);
    set(root,'--tq-card-bg',s.testimonial_box_style==='border'?'transparent':custom?color(s.testimonial_box_color,'color-mix(in srgb,var(--tq-text) 5%,var(--tq-bg))'):'color-mix(in srgb,var(--tq-text) 5%,var(--tq-bg))');
    set(root,'--tq-border',custom?color(s.testimonial_border_color,s.testimonial_box_style==='border'?'var(--color-border)':'transparent'):s.testimonial_box_style==='border'?'var(--color-border)':'transparent');
    set(root,'background','var(--tq-bg)',true);set(root,'color','var(--tq-text)',true);
    set(root,'--tq-radius',custom?num(s.testimonial_box_corner,14)+'px':'var(--rounded-radius,8px)');
    set(root,'padding-top',num(desktop?s.top_padding_desktop:s.top_padding_mobile)+'px');set(root,'padding-bottom',num(desktop?s.bottom_padding_desktop:s.bottom_padding_mobile)+'px');set(root,'margin-block',num(desktop?s.vertical_margin:s.vertical_margin_mobile)+'px');
    root.dataset.photos=String(bool(s.enable_reviewer_photo));root.dataset.peek=String(bool(s.show_peek)&&root.querySelectorAll('.tq-card').length>num(s.testimonial_per_row,2));root.dataset.collapse=String(bool(s.truncate_quotes));
    root.querySelectorAll('[data-quote-block]').forEach(el=>{
      const type=el.dataset.kind,b={...blockDefaults[type],...state.blocks.get(el.dataset.quoteBlock)},own=bool(b.enable_custom_style);
      if(type==='heading'||type==='description'){
        const heading=type==='heading';
        if(heading){text(el,b.heading);el.hidden=!b.heading;}
        else{if(state.descriptions.get(el)!==b.description){el.replaceChildren(richText(b.description));state.descriptions.set(el,b.description);}el.hidden=!el.textContent.trim();}
        const font=own?(b.font_source==='body'?'var(--body-font)':'var(--heading-font)'):(heading?'var(--heading-font)':'var(--body-font)');
        const size=own?num(heading?(desktop?b.heading_size_desktop:b.heading_size_mobile):(desktop?b.description_size_desktop:b.description_size_mobile))+'px':heading?'var(--h2-size,32px)':'var(--body-font-size,16px)';
        for(const child of [el,...el.querySelectorAll('p,li,strong,em,a')]){set(child,'color',own?color(b.color,heading?'var(--tq-heading)':'var(--tq-text)'):heading?'var(--tq-heading)':'var(--tq-text)');set(child,'font-family',font,true);set(child,'font-size',size,true);set(child,'letter-spacing',own?num(b.letter_spacing)+'px':heading?'var(--heading-letter-spacing,normal)':'normal',true);set(child,'text-transform',own&&b.text_case!=='theme'?b.text_case:heading?'var(--heading-text-transform,none)':'none',true);}
        set(el,'color',own?color(b.color,heading?'var(--tq-heading)':'var(--tq-text)'):heading?'var(--tq-heading)':'var(--tq-text)');
        set(el,'line-height',heading?'var(--heading-line-height,1.2)':'var(--body-line-height,1.5)',true);
        set(el,'font-weight',own&&heading?({thin:100,light:300,regular:400,semibold:600,bold:700}[b.heading_style]||600):heading?'var(--heading-weight,600)':'var(--body-weight,400)',true);
      }else{
        set(el,'background',own?color(b.card_color,'var(--tq-card-bg)'):'var(--tq-card-bg)',true);set(el,'border-color','var(--tq-border)',true);set(el,'border-radius','var(--tq-radius)',true);
        const quote=el.querySelector('.tq-quote-text');text(quote,b.testimonial_text);
        set(quote,'font-family','var(--body-font)',true);set(quote,'font-size',own?num(b.quote_size,16)+'px':custom?num(s.testimonial_text_size,16)+'px':'var(--body-font-size,16px)',true);set(quote,'font-weight','var(--body-weight,400)',true);set(quote,'line-height','var(--body-line-height,1.5)',true);set(quote,'color',own?color(b.quote_color,'var(--tq-quote)'):'var(--tq-quote)');
        text(el.querySelector('.tq-name'),b.author_name);text(el.querySelector('.tq-meta'),b.author_additional_text);
        const src=image(b.author_photo);let avatar=el.querySelector('.tq-avatar');if(src&&!avatar){avatar=document.createElement('img');avatar.className='tq-avatar';avatar.width=48;avatar.height=48;avatar.loading='lazy';el.querySelector('.tq-author')?.prepend(avatar);}if(avatar){if(src&&avatar.getAttribute('src')!==src)avatar.src=src;avatar.hidden=!src;avatar.alt=b.author_name||'';}
        const author=el.querySelector('.tq-author');if(author)author.hidden=!b.author_name&&!b.author_additional_text&&(!src||!bool(s.enable_reviewer_photo));
        const rating=el.querySelector('.tq-rating');if(rating){rating.hidden=num(b.stars_rating)===0;rating.setAttribute('aria-label',num(b.stars_rating)+' / 5');rating.querySelectorAll('.tq-star').forEach((star,index)=>{star.querySelectorAll('path').forEach(p=>p.setAttribute('d',path(s.stars_shape)));star.querySelector('span').style.width=Math.max(0,Math.min(100,(num(b.stars_rating)-index)*100))+'%';star.querySelector('span').querySelector('path').setAttribute('fill',s.stars_shape==='outline_stars'?'none':'currentColor');});}
        const button=el.querySelector('.tq-expand');if(button){const expanded=el.classList.contains('is-expanded');button.hidden=!bool(s.truncate_quotes)||(!expanded&&quote.scrollHeight<=quote.clientHeight+2);text(button,expanded?s.read_less_label:s.read_more_label);button.setAttribute('aria-expanded',String(expanded));}
      }
    });
    let button=root.querySelector('.tq-button');
    if(!button && s.button_label && s.button_link){let intro=root.querySelector('.tq-intro');if(!intro){intro=document.createElement('div');intro.className='tq-intro';root.querySelector('.tq-layout').prepend(intro);}button=document.createElement('a');button.className='tq-button';intro.append(button);}
    if(button){
      text(button,s.button_label);button.hidden=!s.button_label||!s.button_link;
      const href=typeof s.button_link==='object'?s.button_link.url:s.button_link;
      if(typeof href==='string'){try{const url=new URL(href,location.href);if(['https:','http:','mailto:','tel:'].includes(url.protocol)||href.startsWith('#'))button.href=href;else{button.removeAttribute('href');button.hidden=true;}}catch(_){button.hidden=true;}}
      if(bool(s.new_tab)){button.target='_blank';button.rel='noopener noreferrer';}else{button.removeAttribute('target');button.removeAttribute('rel');}
      button.classList.toggle('tq-button--link',s.button_style==='link');
      if(s.button_style!=='link'){button.dataset.themeButton='primary';button.dataset.slButton='';button.dataset.buttonAppearance=s.button_style==='outline'?'outline':'solid';}else{button.removeAttribute('data-theme-button');button.removeAttribute('data-sl-button');button.removeAttribute('data-button-appearance');}
      set(button,'border-radius',!bool(s.use_theme_button)?num(s.button_corner,6)+'px':'var(--theme-button-radius,var(--btn-radius,8px))',true);
      const own=!bool(s.use_theme_button);for(const [key,v]of Object.entries({'--mb-bg':own?color(s.button_background_color,'var(--btn-primary-bg-color)'):null,'--mb-text':own?color(s.button_text_color,'var(--btn-primary-color)'):null,'--mb-border':own?color(s.button_border_color,'var(--color-border)'):null,'--mb-radius':own?num(s.button_corner,6)+'px':null,'--mb-hover-border':own?'var(--mb-line)':null,'--tq-button-ink':own?color(s.button_text_color,'var(--color-heading)'):null})){if(v==null)button.style.removeProperty(key);else set(button,key,v);}
    }
    const intro=root.querySelector('.tq-intro');if(intro)intro.hidden=![...intro.children].some(el=>!el.hidden);
    const row=root.querySelector('.tq-track');if(!row)return;row.setAttribute('aria-label',s.track_label||'Testimonials');
    navigation(root,s);
  }
  function init(root){
    if(states.has(root))return states.get(root);
    const state={settings:{...defaults,...parse(root.dataset.settings)},blocks:new Map(),rawBlocks:new Map(),descriptions:new WeakMap(),rawSettings:root.dataset.settings,frame:0,row:null};
    state.scroll=()=>{if(!state.navFrame)state.navFrame=requestAnimationFrame(()=>{state.navFrame=0;navigation(root,state.settings);});};
    state.sync=()=>{
      if(state.rawSettings!==root.dataset.settings){state.settings={...defaults,...parse(root.dataset.settings)};state.rawSettings=root.dataset.settings;}
      root.querySelectorAll('[data-quote-block]').forEach(el=>{const id=el.dataset.quoteBlock,raw=el.dataset.blockSettings;if(state.rawBlocks.get(id)!==raw){state.blocks.set(id,parse(raw));state.rawBlocks.set(id,raw);}});
      const row=root.querySelector('.tq-track');if(row!==state.row){if(state.row){state.row.removeEventListener('scroll',state.scroll);state.resize?.unobserve(state.row);}state.row=row;if(row){row.addEventListener('scroll',state.scroll,{passive:true});state.resize?.observe(row);}}
    };
    state.schedule=()=>{if(!state.frame)state.frame=requestAnimationFrame(()=>{state.frame=0;if(root.isConnected){state.sync();paint(root,state);}else{state.resize.disconnect();state.observer.disconnect();state.row?.removeEventListener('scroll',state.scroll);states.delete(root);}});};
    root.addEventListener('click',event=>{
      const more=event.target.closest('.tq-expand');if(more){more.closest('.tq-card').classList.toggle('is-expanded');state.schedule();return;}
      const button=event.target.closest('.tq-prev,.tq-next');if(!button)return;
      const row=root.querySelector('.tq-track');if(!row)return;const card=row.firstElementChild,step=(card?.getBoundingClientRect().width||row.clientWidth)+(parseFloat(getComputedStyle(row).columnGap)||0),rtl=getComputedStyle(row).direction==='rtl';row.scrollBy({left:step*(button.matches('.tq-prev')?-1:1)*(rtl?-1:1),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    });
    state.resize=new ResizeObserver(state.schedule);state.resize.observe(root);
    state.observer=new MutationObserver(state.schedule);state.observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-settings','data-block-settings']});
    states.set(root,state);state.sync();paint(root,state);return state;
  }
  const scan=()=>document.querySelectorAll('[data-testimonial-quote]').forEach(root=>init(root).schedule());
  document.addEventListener('storelib:settings-change',event=>{const d=event.detail||{},id=d.section||d.sectionId;if(!id||!d.settings)return;document.querySelectorAll('[data-testimonial-quote]').forEach(root=>{if(root.dataset.testimonialQuote!==String(typeof id==='object'?id.id:id).replace(/^shopify-section-/,''))return;const state=init(root),block=d.block||d.blockId||d.block_id;if(block){const key=String(typeof block==='object'?block.id:block);if(!state.blocks.has(key))return;state.blocks.set(key,{...state.blocks.get(key),...d.settings});}else Object.assign(state.settings,d.settings);state.schedule();});});
  ['DOMContentLoaded','storelib:section-load','shopify:section:load'].forEach(name=>document.addEventListener(name,scan));
  new MutationObserver(records=>{for(const record of records){for(const node of record.removedNodes){if(node.nodeType!==1)continue;for(const root of [node,...node.querySelectorAll('[data-testimonial-quote]')])states.get(root)?.schedule();}for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches('[data-testimonial-quote]'))init(node);node.querySelectorAll('[data-testimonial-quote]').forEach(init);}}}).observe(document.documentElement,{subtree:true,childList:true});
  window.MateriaTestimonialQuote={scan};scan();
})();
