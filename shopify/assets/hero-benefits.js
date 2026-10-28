/* Hero Benefits: scoped settings, saved font IDs and editor live controls. */
(() => {
  if (window.MateriaHeroBenefits) return;
  const defaults = {"section_width":"stretch_width","color_scheme":"default-color-scheme","reset_spacing":true,"max_width_desktop":960,"heading":"Best product in town.","accent_word":"town.","enable_custom_style":false,"heading_font_source":"heading","heading_transform":"theme","heading_letter_spacing":0,"heading_line_height":1.2,"heading_size_desktop":64,"heading_weight":"inherit","benefit_title_size":18,"benefit_title_weight":"600","benefit_desc_size":14,"benefit_title_line_height":1.3,"benefit_desc_line_height":1.6,"image_radius":18,"enable_custom_fonts":false,"heading_font":"assistant_n4","body_font":"assistant_n4","image_position":"right","image_fit":"cover","image_height_desktop":480,"text_column_width":55,"gap_columns":48,"heading_align_desktop":"left","benefits_columns_desktop":2,"benefits_gap":32,"benefit_icon_size":44,"text_gap":40,"benefit_content_gap":10,"padding_top_desktop":80,"padding_bottom_desktop":80,"section_margin_top":0,"section_margin_bottom":0,"enable_fade":false,"fade_size":25,"mobile_layout":"stacked","mobile_overlay_height":640,"mobile_overlay_fade_strength":70,"heading_align_mobile":"left","heading_size_mobile":36,"image_height_mobile":360,"benefits_columns_mobile":2,"text_gap_mobile":24,"padding_top_mobile":56,"padding_bottom_mobile":56};
  const headingDefaults = {"heading":"Best product in town.","accent_word":"town.","enable_custom_style":false,"heading_font_source":"heading","heading_transform":"theme","heading_letter_spacing":0,"heading_line_height":1.2,"heading_size_desktop":64,"heading_weight":"inherit","enable_custom_fonts":false,"heading_font":"assistant_n4","heading_align_desktop":"left","heading_align_mobile":"left","heading_size_mobile":36};
  const imageDefaults = {"enable_custom_style":false,"image_radius":18,"image_fit":"cover","image_height_desktop":480,"image_height_mobile":360};
  const benefitDefaults = {"title":"Benefit 1","description":"<p>Describe your benefit and how it helps your customers.</p>","icon_type":"library","icon_library":"sparkle","enable_custom_style":false,"icon_size":44,"title_font":"heading","title_weight":"theme","title_size":18,"text_case":"theme","letter_spacing":0,"description_size":14,"alignment":"left","content_gap":10};
  const states = new WeakMap();
  const parse = value => { try { return JSON.parse(value || '{}'); } catch (_) { return {}; } };
  const bool = value => value === true || value === 'true';
  const number = (value, fallback) => Number.isFinite(Number(value)) && value !== '' && value != null ? Number(value) : fallback;
  const px = value => number(value, 0) + 'px';
  const set = (el, key, value, important = false) => {
    if (!el) return;
    const priority = important ? 'important' : '';
    if (el.style.getPropertyValue(key) !== String(value) || el.style.getPropertyPriority(key) !== priority) el.style.setProperty(key, value, priority);
  };
  const color = (value, fallback) => typeof value === 'string' && CSS.supports('color', value) && !['transparent','rgba(0, 0, 0, 0)','#00000000'].includes(value) ? value : fallback;
  const fontWeights = {"Inter":"100;200;300;400;500;600;700;800;900","Manrope":"200;300;400;500;600;700;800","DM Sans":"100;200;300;400;500;600;700;800;900","Plus Jakarta Sans":"200;300;400;500;600;700;800","Outfit":"100;200;300;400;500;600;700;800;900","Urbanist":"100;200;300;400;500;600;700;800;900","Space Grotesk":"300;400;500;600;700","Sora":"100;200;300;400;500;600;700;800","Lexend":"100;200;300;400;500;600;700;800;900","Work Sans":"100;200;300;400;500;600;700;800;900","Figtree":"300;400;500;600;700;800;900","Onest":"100;200;300;400;500;600;700;800;900","Geist":"100;200;300;400;500;600;700;800;900","Montserrat":"100;200;300;400;500;600;700;800;900","Poppins":"100;200;300;400;500;600;700;800;900","Raleway":"100;200;300;400;500;600;700;800;900","Nunito Sans":"200;300;400;500;600;700;800;900","Rubik":"300;400;500;600;700;800;900","Karla":"200;300;400;500;600;700;800","Archivo":"100;200;300;400;500;600;700;800;900","Barlow":"100;200;300;400;500;600;700;800;900","Jost":"100;200;300;400;500;600;700;800;900","Albert Sans":"100;200;300;400;500;600;700;800;900","Hanken Grotesk":"100;200;300;400;500;600;700;800;900","Schibsted Grotesk":"400;500;600;700;800;900","Instrument Sans":"400;500;600;700","IBM Plex Sans":"100;200;300;400;500;600;700","Roboto":"100;200;300;400;500;600;700;800;900","Lato":"100;300;400;700;900","Open Sans":"300;400;500;600;700;800","Quicksand":"300;400;500;600;700","Mulish":"200;300;400;500;600;700;800;900","Bricolage Grotesque":"200;300;400;500;600;700;800","Syne":"400;500;600;700;800","Unbounded":"200;300;400;500;600;700;800;900","Bebas Neue":"400","Oswald":"200;300;400;500;600;700","Anton":"400","Archivo Black":"400","Playfair Display":"400;500;600;700;800;900","Cormorant Garamond":"300;400;500;600;700","DM Serif Display":"400","Fraunces":"100;200;300;400;500;600;700;800;900","Lora":"400;500;600;700","Libre Baskerville":"400;500;600;700","EB Garamond":"400;500;600;700;800","Instrument Serif":"400","Source Serif 4":"200;300;400;500;600;700;800;900","Bodoni Moda":"400;500;600;700;800;900","Libre Caslon Text":"400;700","Abril Fatface":"400","Merriweather":"300;400;500;600;700;800;900","Newsreader":"200;300;400;500;600;700;800","Young Serif":"400","JetBrains Mono":"100;200;300;400;500;600;700;800","Space Mono":"400;700","Geist Mono":"100;200;300;400;500;600;700;800;900","Assistant":"200;300;400;500;600;700;800"};
  const fontNames = {"inter":"Inter","manrope":"Manrope","dm_sans":"DM Sans","plus_jakarta_sans":"Plus Jakarta Sans","outfit":"Outfit","urbanist":"Urbanist","space_grotesk":"Space Grotesk","sora":"Sora","lexend":"Lexend","work_sans":"Work Sans","figtree":"Figtree","onest":"Onest","geist":"Geist","montserrat":"Montserrat","poppins":"Poppins","raleway":"Raleway","nunito_sans":"Nunito Sans","rubik":"Rubik","karla":"Karla","archivo":"Archivo","barlow":"Barlow","jost":"Jost","albert_sans":"Albert Sans","hanken_grotesk":"Hanken Grotesk","schibsted_grotesk":"Schibsted Grotesk","instrument_sans":"Instrument Sans","ibm_plex_sans":"IBM Plex Sans","roboto":"Roboto","lato":"Lato","open_sans":"Open Sans","quicksand":"Quicksand","mulish":"Mulish","bricolage_grotesque":"Bricolage Grotesque","syne":"Syne","unbounded":"Unbounded","bebas_neue":"Bebas Neue","oswald":"Oswald","anton":"Anton","archivo_black":"Archivo Black","playfair_display":"Playfair Display","cormorant_garamond":"Cormorant Garamond","dm_serif_display":"DM Serif Display","fraunces":"Fraunces","lora":"Lora","libre_baskerville":"Libre Baskerville","eb_garamond":"EB Garamond","instrument_serif":"Instrument Serif","source_serif_4":"Source Serif 4","bodoni_moda":"Bodoni Moda","libre_caslon_text":"Libre Caslon Text","abril_fatface":"Abril Fatface","merriweather":"Merriweather","newsreader":"Newsreader","young_serif":"Young Serif","jetbrains_mono":"JetBrains Mono","space_mono":"Space Mono","geist_mono":"Geist Mono","helvetica":"Helvetica","georgia":"Georgia","assistant":"Assistant","source_sans_pro":"Source Sans 3","source_sans_3":"Source Sans 3","source_serif_pro":"Source Serif 4"};
  const fontFallbacks = {"Inter":"sans-serif","Manrope":"sans-serif","DM Sans":"sans-serif","Plus Jakarta Sans":"sans-serif","Outfit":"sans-serif","Urbanist":"sans-serif","Space Grotesk":"sans-serif","Sora":"sans-serif","Lexend":"sans-serif","Work Sans":"sans-serif","Figtree":"sans-serif","Onest":"sans-serif","Geist":"sans-serif","Montserrat":"sans-serif","Poppins":"sans-serif","Raleway":"sans-serif","Nunito Sans":"sans-serif","Rubik":"sans-serif","Karla":"sans-serif","Archivo":"sans-serif","Barlow":"sans-serif","Jost":"sans-serif","Albert Sans":"sans-serif","Hanken Grotesk":"sans-serif","Schibsted Grotesk":"sans-serif","Instrument Sans":"sans-serif","IBM Plex Sans":"sans-serif","Roboto":"sans-serif","Lato":"sans-serif","Open Sans":"sans-serif","Quicksand":"sans-serif","Mulish":"sans-serif","Bricolage Grotesque":"sans-serif","Syne":"sans-serif","Unbounded":"sans-serif","Bebas Neue":"sans-serif","Oswald":"sans-serif","Anton":"sans-serif","Archivo Black":"sans-serif","Playfair Display":"Georgia, serif","Cormorant Garamond":"Georgia, serif","DM Serif Display":"Georgia, serif","Fraunces":"Georgia, serif","Lora":"Georgia, serif","Libre Baskerville":"Georgia, serif","EB Garamond":"Georgia, serif","Instrument Serif":"Georgia, serif","Source Serif 4":"Georgia, serif","Bodoni Moda":"Georgia, serif","Libre Caslon Text":"Georgia, serif","Abril Fatface":"Georgia, serif","Merriweather":"Georgia, serif","Newsreader":"Georgia, serif","Young Serif":"Georgia, serif","JetBrains Mono":"ui-monospace, monospace","Space Mono":"ui-monospace, monospace","Geist Mono":"ui-monospace, monospace","Helvetica":"sans-serif","Georgia":"Georgia, serif"};
  const system = /^(Arial|Arial Black|Helvetica|Helvetica Neue|Georgia|Times New Roman|Verdana|Tahoma|Trebuchet MS|Courier New|system-ui|sans-serif|serif|monospace)$/i;
  function font(value) {
    const raw = typeof value === 'object' ? value?.family || value?.name || value?.value : value;
    if (typeof raw !== 'string' || !raw.trim()) return '';
    if(raw==='theme_heading')return 'var(--heading-font)';
    if(raw==='theme_body')return 'var(--body-font)';
    const id = raw.trim().replace(/_[ni][1-9]$/, '');
    const family = (fontNames[id.toLowerCase().replaceAll(' ','_')] || (/_[ni][1-9]$/.test(raw) || raw.includes('_') ? id.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : id)).replace(/["'\\;<>\r\n{}]/g, '').trim();
    if (!family) return '';
    // Native font objects are drawn with font_face by the template. String
    // picker IDs need a real stylesheet; naming a family alone doesn't load it.
    const loaded = document.fonts && [...document.fonts].some(face => face.family.replace(/["']/g, '').toLowerCase() === family.toLowerCase());
    if (!system.test(family) && !loaded && ![...document.querySelectorAll('link[data-hb-font]')].some(link => link.dataset.hbFont === family)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.dataset.hbFont = family;
      const params = new URLSearchParams({family:family+(fontWeights[family]?':wght@'+fontWeights[family]:''), display:'swap'});
      link.href = 'https://fonts.googleapis.com/css2?' + params;
      document.head.append(link);
    }
    return JSON.stringify(family) + ', ' + (typeof value === 'object' && value?.fallback_families ? String(value.fallback_families).replace(/[;<>\r\n{}]/g, '') : fontFallbacks[family] || 'sans-serif');
  }
  function apply(root, state) {
    const s = state.settings, custom = bool(s.enable_custom_style);
    const headBlock=root.querySelector('[data-hb-heading-block]'),imageBlock=root.querySelector('[data-hb-image-block]');
    const hs=headBlock?{...headingDefaults,...state.blocks.get(headBlock.dataset.hbHeadingBlock)}:null;
    const h=hs?{...s,...headingDefaults,...hs}:s,hCustom=bool(h.enable_custom_style);
    const im=imageBlock?{...imageDefaults,...state.blocks.get(imageBlock.dataset.hbImageBlock)}:s;
    if(headBlock && hs){
      const text=String(hs.heading||''),accent=String(hs.accent_word||''),signature=JSON.stringify([text,accent]);
      if(state.headingContent!==signature){
        state.headingContent=signature;headBlock.hidden=!text.trim();
        let title=headBlock.querySelector('.hb__heading');
        if(!text.trim())title?.remove();
        else{
          if(!title){title=document.createElement('h2');title.className='hb__heading';headBlock.append(title);}
          title.replaceChildren();
          const parts=accent?text.split(accent):[text];parts.forEach((part,index)=>{if(index){const span=document.createElement('span');span.className='hb__accent';span.textContent=accent;title.append(span);}title.append(document.createTextNode(part));});
        }
      }
    }
    const hasMedia=!!root.querySelector('.hb__media');
    const scheme=typeof s.color_scheme==='object'?s.color_scheme?.id:s.color_scheme;
    if(typeof scheme==='string' && /^[a-zA-Z0-9_-]+$/.test(scheme)){for(const name of [...root.classList])if(name.startsWith('color-') && name!=='color-'+scheme)root.classList.remove(name);root.classList.add('color-'+scheme);}
    const parent = root.closest('[id^="shopify-section-"]') || root.parentElement;
    const desktop = parent.getBoundingClientRect().width >= 1024;
    const overlay = !desktop && s.mobile_layout === 'overlay' && hasMedia;
    const headingFont = bool(s.enable_custom_fonts) ? font(s.heading_font) || 'var(--heading-font)' : 'var(--heading-font)';
    const bodyFont = bool(s.enable_custom_fonts) ? font(s.body_font) || 'var(--body-font)' : 'var(--body-font)';
    set(root,'--hb-body-font',bodyFont); set(root,'--hb-title-font',headingFont);
    const ownHeadingFont=hs && bool(hs.enable_custom_fonts)?font(hs.heading_font)||headingFont:headingFont;
    set(root,'--hb-heading-font',hCustom && h.heading_font_source==='body'?bodyFont:ownHeadingFont);
    for (const [key,value,fallback] of [
      ['--hb-bg',s.section_bg,'var(--color-background)'],['--hb-heading',s.text_color,'var(--color-heading)'],
      ['--hb-text',s.text_color,'var(--color-text)'],['--hb-muted',s.muted_color,'var(--color-text)'],
      ['--hb-accent',s.accent_color,'var(--color-primary)'],['--hb-icon-color',s.benefit_icon_color,'var(--color-heading)']
    ]) set(root,key,custom ? color(value,fallback) : fallback);
    set(root,'--hb-radius',(imageBlock?bool(im.enable_custom_style):custom) ? px(im.image_radius) : 'var(--rounded-radius, 0px)');
    set(root,'--hb-bi-size',px(s.benefit_icon_size));
    set(root,'--hb-bt-size',custom ? px(s.benefit_title_size) : 'var(--h3-size, 20px)');
    set(root,'--hb-bt-weight',custom && s.benefit_title_weight !== 'theme' ? s.benefit_title_weight : 'var(--heading-weight, 600)');
    set(root,'--hb-bd-size',custom ? px(s.benefit_desc_size) : 'var(--body-font-size, 16px)');
    set(root,'--hb-benefits-gap',px(s.benefits_gap));
    set(root,'--hb-fade-color',color(s.fade_color,'var(--color-background)'));
    set(root,'--hb-fade-size',number(s.fade_size,25)+'%');
    root.toggleAttribute('data-hb-bottom-fade',bool(s.enable_fade));
    root.toggleAttribute('data-hb-reset-spacing',bool(s.reset_spacing));
    root.classList.toggle('hb--mobile-overlay',s.mobile_layout === 'overlay');
    root.classList.toggle('hb--mobile-stacked',s.mobile_layout !== 'overlay');
    set(root,'padding-top',overlay ? '0px' : px(desktop?s.padding_top_desktop:s.padding_top_mobile));
    set(root,'padding-bottom',overlay ? '0px' : px(desktop?s.padding_bottom_desktop:s.padding_bottom_mobile));
    set(root,'margin-top',px(s.section_margin_top));set(root,'margin-bottom',px(s.section_margin_bottom));
    const wrap=root.querySelector('.hb__wrap'),inner=root.querySelector('.hb__inner'),grid=root.querySelector('.hb__grid'),text=root.querySelector('.hb__text'),media=root.querySelector('.hb__media'),heading=root.querySelector('.hb__heading'),benefits=root.querySelector('.hb__benefits');
    const widths={container:'var(--container-width,var(--page-width,1200px))',fluid_container:'var(--fluid-container-width,1440px)',stretch_width:'var(--stretch-width,1600px)',full_width:'100%'};
    set(wrap,'max-width',overlay?'100%':widths[s.section_width]||'100%');
    set(wrap,'padding-inline',overlay?'0px':['fluid_container','stretch_width'].includes(s.section_width)?'24px':'16px');
    set(inner,'max-width',desktop?px(s.max_width_desktop):'none');set(inner,'min-height',overlay?px(s.mobile_overlay_height):'0px');
    set(grid,'flex-direction',desktop?(s.image_position==='left'?'row-reverse':'row'):'column');
    set(grid,'gap',desktop?px(s.gap_columns):overlay?'20px':'24px');
    set(grid,'min-height',overlay?px(s.mobile_overlay_height):'0px');
    set(grid,'padding',overlay?px(s.padding_top_mobile)+' 16px '+px(s.padding_bottom_mobile):'0px');
    set(text,'flex',!hasMedia?'1 1 100%':desktop?'0 0 '+number(s.text_column_width,55)+'%':'0 1 auto');
    set(text,'max-width',desktop && hasMedia?number(s.text_column_width,55)+'%':'none');
    set(text,'gap',px(desktop?s.text_gap:s.text_gap_mobile));
    set(media,'height',overlay?'100%':px(desktop?im.image_height_desktop:im.image_height_mobile));
    set(root,'--hb-mobile-overlay-fade',number(s.mobile_overlay_fade_strength,70)+'%');
    root.querySelectorAll('.hb__media img').forEach(img=>set(img,'object-fit',im.image_fit));
    set(heading,'font-family','var(--hb-heading-font)',true);
    set(heading,'font-size',hCustom?px(desktop?h.heading_size_desktop:h.heading_size_mobile):'var(--h2-size, 32px)',true);
    set(heading,'font-weight',hCustom && h.heading_weight!=='inherit'?h.heading_weight:'var(--heading-weight, 600)',true);
    set(heading,'line-height',hCustom?h.heading_line_height:'var(--heading-line-height, 1.2)',true);
    set(heading,'letter-spacing',hCustom?px(h.heading_letter_spacing):'var(--heading-letter-spacing, normal)',true);
    set(heading,'text-transform',hCustom && h.heading_transform!=='theme'?h.heading_transform:'var(--heading-text-transform, none)',true);
    set(heading,'text-align',desktop?h.heading_align_desktop:h.heading_align_mobile);
    set(heading,'color',hs && bool(hs.enable_custom_style)?color(hs.text_color,'var(--hb-heading)'):'var(--hb-heading)');
    if(headBlock)set(headBlock,'--hb-accent',hs && bool(hs.enable_custom_style)?color(hs.accent_color,'inherit'):'inherit');
    if(imageBlock){
      const src=value=>{const raw=typeof value==='object'?value?.src||value?.url||value?.preview_image?.src:value;if(typeof raw!=='string'||!raw)return '';try{const url=new URL(raw,location.href);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch(_){return '';}};
      const desktopSrc=src(im.image_desktop)||src(im.image_mobile),mobileSrc=src(im.image_mobile)||desktopSrc;
      for(const [name,url,picked] of [['desktop',desktopSrc,im.image_desktop||im.image_mobile],['mobile',mobileSrc,im.image_mobile||im.image_desktop]]){
        let img=imageBlock.querySelector('.hb__media-'+name);
        if(!url){img?.remove();continue;}
        if(!img){img=document.createElement('img');img.className='hb__media-'+name;img.width=1400;img.height=1000;img.decoding='async';imageBlock.append(img);}
        if(img.getAttribute('src')!==url){img.removeAttribute('srcset');img.src=url;}
        img.alt=im.alt||picked?.alt||'';set(img,'object-fit',im.image_fit);
      }
      let placeholder=imageBlock.querySelector('.hb__placeholder, img:not([class])');
      if(!desktopSrc && !placeholder){placeholder=document.createElement('div');placeholder.className='hb__placeholder';placeholder.setAttribute('aria-hidden','true');placeholder.innerHTML='<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="currentColor" opacity=".08"/><path d="M140 192l40-46 25 28 20-18 35 36z" fill="currentColor" opacity=".2"/></svg>';imageBlock.append(placeholder);}
      if(placeholder)set(placeholder,'display',desktopSrc?'none':'block');
    }
    set(benefits,'grid-template-columns','repeat('+number(desktop?s.benefits_columns_desktop:s.benefits_columns_mobile,2)+',minmax(0,1fr))');
    root.querySelectorAll('[data-benefit-id]').forEach(block=>{
      const b={...benefitDefaults,...state.blocks.get(block.dataset.benefitId)},own=bool(b.enable_custom_style);
      for(const [key,value] of Object.entries({'--hb-icon-color':own?color(b.icon_color,'inherit'):null,'--hb-bi-size':own?px(b.icon_size):null,'--hb-bt-size':own?px(b.title_size):null,'--hb-bd-size':own?px(b.description_size):null,'--hb-heading':own?color(b.title_color,'var(--color-heading)'):null,'--hb-muted':own?color(b.description_color,'var(--color-text)'):null,'--hb-title-font':own && b.title_font==='body'?bodyFont:headingFont,'--hb-bt-weight':own && b.title_weight!=='theme'?b.title_weight:null})) {
        // Blank per-block colours inherit the section, not a second palette.
        const blankColor=['--hb-icon-color','--hb-heading','--hb-muted'].includes(key) && !({ '--hb-icon-color':b.icon_color,'--hb-heading':b.title_color,'--hb-muted':b.description_color }[key]);
        set(block,key,value==null || blankColor?'inherit':value);
      }
      set(block,'gap',px(own?b.content_gap:s.benefit_content_gap));
      set(block,'text-align',own?b.alignment:'start');
      set(block,'align-items',own?({left:'flex-start',center:'center',right:'flex-end'}[b.alignment]||'flex-start'):'stretch');
      const title=block.querySelector('.hb__benefit-title');
      set(title,'letter-spacing',own?px(b.letter_spacing):'var(--heading-letter-spacing, normal)',true);
      set(title,'text-transform',own && b.text_case!=='theme'?b.text_case:'var(--heading-text-transform, none)',true);
      set(title,'line-height',custom?s.benefit_title_line_height:'var(--heading-line-height, 1.2)',true);
      block.querySelectorAll('.hb__benefit-desc, .hb__benefit-desc :is(p,li,a,strong,em)').forEach(desc=>set(desc,'line-height',custom?s.benefit_desc_line_height:'var(--body-line-height, 1.5)',true));
    });
  }
  const editableBlocks=root=>root.querySelectorAll('[data-benefit-id], [data-hb-heading-block], [data-hb-image-block]');
  const blockKey=el=>el.dataset.benefitId||el.dataset.hbHeadingBlock||el.dataset.hbImageBlock;
  const blockJSON=el=>el.dataset.benefitSettings||el.dataset.hbContentSettings;
  function init(root) {
    if(states.has(root))return states.get(root);
    const state={settings:{...defaults,...parse(root.dataset.heroSettings)},blocks:new Map(),frame:0,raw:root.dataset.heroSettings,blockRaw:new Map()};
    editableBlocks(root).forEach(block=>{state.blocks.set(blockKey(block),parse(blockJSON(block)));state.blockRaw.set(blockKey(block),blockJSON(block));});
    state.schedule=()=>{if(!state.frame)state.frame=requestAnimationFrame(()=>{state.frame=0;if(root.isConnected)apply(root,state);else {state.resize?.disconnect();state.attributes?.disconnect();}});};
    state.attributes=new MutationObserver(()=>{
      if(state.raw!==root.dataset.heroSettings){state.raw=root.dataset.heroSettings;state.settings={...defaults,...parse(state.raw)};}
      editableBlocks(root).forEach(block=>{const id=blockKey(block),raw=blockJSON(block);if(!state.blocks.has(id)||state.blockRaw.get(id)!==raw){state.blockRaw.set(id,raw);state.blocks.set(id,parse(raw));}});
      state.schedule();
    });
    state.attributes.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-hero-settings','data-benefit-settings','data-hb-content-settings']});
    state.resize=new ResizeObserver(entries=>{const width=entries[0]?.contentRect.width;if(width!==state.width){state.width=width;state.schedule();}});
    state.resize.observe(root);states.set(root,state);apply(root,state);return state;
  }
  const scan=()=>{document.querySelectorAll('[data-hero-benefits]').forEach(root=>init(root).schedule());};
  document.addEventListener('storelib:settings-change',event=>{
    const detail=event.detail||{},section=detail.section||detail.sectionId,blockId=detail.block||detail.blockId||detail.block_id;
    if(!section || !detail.settings)return; // global theme variables stay inherited
    document.querySelectorAll('[data-hero-benefits]').forEach(root=>{
      if(String(typeof section==='object'?section.id:section).replace(/^shopify-section-/,'')!==root.dataset.heroBenefits)return;
      const state=init(root);
      if(blockId){const id=typeof blockId==='object'?blockId.id:blockId;if(!state.blocks.has(String(id)))return;state.blocks.set(String(id),{...state.blocks.get(String(id)),...detail.settings});}
      else Object.assign(state.settings,detail.settings);
      state.schedule();
    });
  });
  ['DOMContentLoaded','storelib:section-load','shopify:section:load'].forEach(name=>document.addEventListener(name,scan));
  const added=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches('[data-hero-benefits]'))init(node);node.querySelectorAll('[data-hero-benefits]').forEach(init);}});
  added.observe(document.documentElement,{childList:true,subtree:true});
  window.MateriaHeroBenefits={scan};scan();
})();
