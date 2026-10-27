/* Same-page section links, shared by the storefront and editor canvas. */
(() => {
  if(window.MateriaSectionLinks)return;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const normalize=path=>path.replace(/\/$/,'')||'/';
  const isEditor=()=>editor||document.documentElement.classList.contains('shopify-design-mode')||!!window.Shopify?.designMode;
  function rendered(node){
    if(!node||node.closest('[hidden]')||getComputedStyle(node).display==='none')return;
    const rect=node.getBoundingClientRect();
    if(getComputedStyle(node).display!=='contents'&&(rect.width||rect.height))return node;
    for(const child of node.children){if(['absolute','fixed'].includes(getComputedStyle(child).position))continue;const result=rendered(child);if(result)return result;}
  }
  function resolve(link){
    if(!link || link.hasAttribute('download') || link.matches('[data-mt-sheet-open],[data-toggle],[aria-controls][aria-expanded]') || (link.target && link.target!=='_self' && !isEditor()))return;
    const authored=link.getAttribute('href');if(!authored||!authored.includes('#'))return;
    let url,key,canonical;try{
      canonical=new URL(document.querySelector('link[rel="canonical"]')?.href||location.href);
      // link.href already contains the editor host. Resolve the authored
      // relative link against the actual storefront page instead.
      url=new URL(authored,isEditor()&&!authored.startsWith('#')?canonical.href:document.baseURI);
      key=decodeURIComponent(url.hash.slice(1));
    }catch{return;}
    const samePage=url.origin===location.origin&&normalize(url.pathname)===normalize(location.pathname)&&(!url.search||url.search===location.search);
    const canvasPage=isEditor()&&url.origin===canonical.origin&&normalize(url.pathname)===normalize(canonical.pathname)&&(!url.search||url.search===canonical.search);
    const localCanvas=isEditor()&&!document.querySelector('link[rel="canonical"][href]:not([href=""])')&&['','/'].includes(authored.split('#')[0])&&/^(?:shopify-section-|section[:/_-])/.test(key);
    if(!key || (!samePage&&!canvasPage&&!localCanvas))return;
    const raw=key.replace(/^(?:shopify-section-|section[:/_-])/,'');const ids=[key,raw,'shopify-section-'+key,'section-'+key,'shopify-section-'+raw,'section-'+raw];
    if(key.startsWith('section-'))ids.push('shopify-section-'+key.slice(8));
    let target=ids.map(id=>document.getElementById(id)).find(Boolean);
    if(!target)target=[...document.querySelectorAll('[data-section-id],[data-storelib-section-id],[data-shopify-editor-section],[id^="shopify-section-"]')].find(el=>{
      const values=[el.id,el.dataset.sectionId,el.dataset.storelibSectionId];
      try{values.push(JSON.parse(el.dataset.shopifyEditorSection||'{}').id);}catch{}
      return values.some(value=>value&&(ids.includes(value)||value.endsWith('__'+raw)));
    });
    // Canvas wrappers can use display:contents, whose own rectangle is 0,0.
    // Scroll to their rendered content instead of jumping to the page top.
    if(target)target=rendered(target);
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
    document.querySelectorAll('header.header,[data-storelib-sticky],[data-sticky-announcement]').forEach(el=>{
      const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
      if(['sticky','fixed'].includes(style.position) && style.visibility!=='hidden' && rect.top<=Math.max(bottom,parseFloat(style.top)||0)+1 && rect.bottom>0 && rect.height<innerHeight/2)bottom=Math.max(bottom,rect.bottom);
    });
    return bottom+16;
  }
  function move(target){
    const owner=scroller(target),rect=target.getBoundingClientRect(),behavior=reduced()?'instant':'smooth';
    if(owner!==window){const box=owner.getBoundingClientRect(),scale=box.height/owner.offsetHeight||1;owner.scrollTo({top:Math.max(0,owner.scrollTop+(rect.top-box.top)/scale-owner.clientTop-16),behavior});return;}
    // A full-height canvas iframe cannot scroll itself. Scroll its same-origin
    // parent viewport, accounting for the editor's canvas zoom, when possible.
    if(isEditor()&&document.scrollingElement.scrollHeight<=innerHeight+2){
      try{
        const frame=window.frameElement;
        if(frame){const box=frame.getBoundingClientRect(),scale=box.width/frame.offsetWidth||1,parentOwner=scroller(frame),top=box.top+rect.top*scale;
          if(parentOwner!==window){const bounds=parentOwner.getBoundingClientRect(),parentScale=bounds.height/parentOwner.offsetHeight||1;parentOwner.scrollTo({top:Math.max(0,parentOwner.scrollTop+(top-bounds.top)/parentScale-parentOwner.clientTop-16),behavior});}
          else{const parentWindow=frame.ownerDocument.defaultView;parentWindow.scrollTo({top:Math.max(0,parentWindow.scrollY+top-16),behavior});}return;
        }
      }catch{}
      // Browser scrolling can traverse an embedding viewport; a cross-origin
      // parent that suppresses this needs Storelib's own scroll bridge.
      target.scrollIntoView({block:'start',behavior});return;
    }
    window.scrollTo({top:Math.max(0,scrollY+rect.top-offset()),behavior});
  }
  function go(plan,history=true){
    window.MateriaMenu?.close?.(true);
    requestAnimationFrame(()=>{
      if(!plan.target.isConnected)return;
      // Never mutate the builder's route/history: its selection or route
      // redraw can otherwise cancel the intended canvas scroll.
      if(history && !isEditor() && location.hash!==plan.url.hash)try{window.history.pushState(null,'',location.pathname+location.search+plan.url.hash);}catch{}
      move(plan.target);
      const hadTab=plan.target.hasAttribute('tabindex');
      if(!hadTab){plan.target.setAttribute('tabindex','-1');plan.target.addEventListener('blur',()=>plan.target.removeAttribute('tabindex'),{once:true});}
      plan.target.focus({preventScroll:true});
    });
  }
  let last=0,press,draggedLink,dragUntil=0;
  const click=event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(isEditor()&&event.detail>0&&link===draggedLink&&performance.now()<dragUntil){event.preventDefault();event.stopImmediatePropagation();return;}
    const plan=resolve(link);if(!plan)return;
    event.preventDefault();event.stopImmediatePropagation();last=performance.now();go(plan);
  };
  // A builder may cancel clicks to select a block. A genuine tap still
  // follows its section link; dragging a block must never scroll the canvas.
  let editor=false;try{editor=self!==top||!!window.Shopify?.designMode;}catch{editor=true;}
    const pointerdown=event=>{if(!isEditor()||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const link=event.target.closest?.('a[href]');if(!resolve(link))return;press={x:event.clientX,y:event.clientY,link,id:event.pointerId};event.stopImmediatePropagation();};
    const pointercancel=()=>{press=null;};
    const pointerup=event=>{
      const p=press;press=null;if(!p||!p.link||p.id!==event.pointerId)return;
      if(Math.hypot(event.clientX-p.x,event.clientY-p.y)>8||!p.link.contains(event.target)){draggedLink=p.link;dragUntil=performance.now()+400;return;}
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const plan=resolve(p.link);if(!plan)return;
      event.stopImmediatePropagation();
      const before=last;requestAnimationFrame(()=>{if(last===before){last=performance.now();go(plan);}});
    };
  const followHash=()=>{if(isEditor()||!/^#(?:shopify-section-|section[:/_-])/.test(location.hash))return;const link=document.createElement('a');link.href=location.href;const plan=resolve(link);if(plan)go(plan,false);};
  window.addEventListener('hashchange',followHash);
  window.addEventListener('load',followHash,{once:true});
  window.MateriaSectionLinks={resolve,go,click,pointerdown,pointerup,pointercancel};
  // Isolated previews may not render the layout's early capture bridge.
  if(!window.__materiaSectionLinkCapture)for(const [name,handler]of Object.entries({click,pointerdown,pointerup,pointercancel}))window.addEventListener(name,handler,true);
})();
