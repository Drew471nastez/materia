/* Same-page section links, shared by the storefront and editor canvas. */
(() => {
  if(window.MateriaSectionLinks)return;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const normalize=path=>path.replace(/\/$/,'')||'/';
  function resolve(link){
    if(!link || link.hasAttribute('download') || link.matches('[data-mt-sheet-open],[data-toggle],[aria-controls][aria-expanded]') || (link.target && link.target!=='_self' && !editor))return;
    let url,key,canonical;try{url=new URL(link.href||link.getAttribute('href'),document.baseURI);key=decodeURIComponent(url.hash.slice(1));canonical=new URL(document.querySelector('link[rel="canonical"]')?.href||location.href);}catch{return;}
    const samePage=url.origin===location.origin&&normalize(url.pathname)===normalize(location.pathname)&&(!url.search||url.search===location.search);
    const canvasPage=editor&&url.origin===canonical.origin&&normalize(url.pathname)===normalize(canonical.pathname)&&(!url.search||url.search===canonical.search);
    if(!key || (!samePage&&!canvasPage))return;
    const raw=key.replace(/^section[:/_-]/,''),ids=[key,'shopify-section-'+key,'section-'+key,'shopify-section-'+raw];
    if(key.startsWith('section-'))ids.push('shopify-section-'+key.slice(8));
    let target=ids.map(id=>document.getElementById(id)).find(Boolean);
    if(!target)target=[...document.querySelectorAll('[data-section-id],[data-storelib-section-id]')].find(el=>[key,raw].includes(el.dataset.sectionId)||[key,raw].includes(el.dataset.storelibSectionId));
    // Canvas wrappers can use display:contents, whose own rectangle is 0,0.
    // Scroll to their rendered content instead of jumping to the page top.
    if(target){const rect=target.getBoundingClientRect();if(getComputedStyle(target).display==='contents'||(!rect.width&&!rect.height))target=[...target.children].find(el=>!['absolute','fixed'].includes(getComputedStyle(el).position)&&el.getBoundingClientRect().height>0)||target;}
    if(target && !target.matches('dialog,[popover],[role="dialog"],.modal,.tingle-modal') && !target.closest('[hidden],dialog:not([open])') && getComputedStyle(target).display!=='none')return {target,url};
  }
  function scroller(target){
    for(let el=target.parentElement;el && el!==document.body;el=el.parentElement){
      if(/auto|scroll/.test(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+2)return el;
    }
    return window;
  }
  function offset(){
    let bottom=0;
    document.querySelectorAll('header.header,[data-sticky-announcement]').forEach(el=>{
      const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
      if(['sticky','fixed'].includes(style.position) && style.visibility!=='hidden' && rect.top<=Math.max(bottom,parseFloat(style.top)||0)+1 && rect.bottom>0 && rect.height<innerHeight/2)bottom=Math.max(bottom,rect.bottom);
    });
    return bottom+16;
  }
  function go(plan,history=true){
    window.MateriaMenu?.close?.(true);
    requestAnimationFrame(()=>{
      if(!plan.target.isConnected)return;
      const owner=scroller(plan.target),rect=plan.target.getBoundingClientRect();
      const top=owner===window?scrollY+rect.top-offset():owner.scrollTop+rect.top-owner.getBoundingClientRect().top-16;
      if(history && location.hash!==plan.url.hash)try{window.history.pushState(null,'',location.pathname+location.search+plan.url.hash);}catch{}
      owner.scrollTo({top:Math.max(0,top),behavior:reduced()?'instant':'smooth'});
      const hadTab=plan.target.hasAttribute('tabindex');
      if(!hadTab){plan.target.setAttribute('tabindex','-1');plan.target.addEventListener('blur',()=>plan.target.removeAttribute('tabindex'),{once:true});}
      plan.target.focus({preventScroll:true});
    });
  }
  let last=0,press,draggedLink,dragUntil=0;
  window.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(editor&&event.detail>0&&link===draggedLink&&performance.now()<dragUntil)return;
    const plan=resolve(link);if(!plan)return;
    event.preventDefault();event.stopImmediatePropagation();last=performance.now();go(plan);
  },true);
  // A builder may cancel clicks to select a block. A genuine tap still
  // follows its section link; dragging a block must never scroll the canvas.
  let editor=false;try{editor=self!==top||!!window.Shopify?.designMode;}catch{editor=true;}
  if(editor){
    window.addEventListener('pointerdown',event=>{if(event.button!==0)return;press={x:event.clientX,y:event.clientY,link:event.target.closest?.('a[href]')};},true);
    window.addEventListener('pointercancel',()=>press=null,true);
    window.addEventListener('pointerup',event=>{
      const p=press;press=null;if(!p||!p.link)return;
      if(Math.hypot(event.clientX-p.x,event.clientY-p.y)>8){draggedLink=p.link;dragUntil=performance.now()+400;return;}
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const plan=resolve(p.link);if(!plan)return;
      const before=last;requestAnimationFrame(()=>{if(last===before){last=performance.now();go(plan);}});
    },true);
  }
  window.MateriaSectionLinks={resolve,go};
})();
