/* Product question/share overlays retain their top-layer surface while closing. */
(() => {
  if(window.MateriaProductDialogs)return;
  const timers=new WeakMap(),openers=new WeakMap();let swallowUntil=0,swallowX=0,swallowY=0;
  const reduce=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
  const current=()=>document.querySelector('.mt-product-dialog:popover-open');
  function close(panel,restore=true){
    if(!panel?.matches(':popover-open')||panel.classList.contains('is-closing'))return;
    panel.classList.remove('is-open');panel.classList.add('is-closing');
    clearTimeout(timers.get(panel));
    timers.set(panel,setTimeout(()=>{
      try{if(panel.matches(':popover-open'))panel.hidePopover();}catch{}panel.classList.remove('is-closing');
      const opener=openers.get(panel);opener?.setAttribute('aria-expanded','false');
      if(restore&&opener?.isConnected)opener.focus({preventScroll:true});
    },reduce()?0:300));
  }
  function open(panel,opener){
    if(!panel||!panel.showPopover)return;
    const previous=current();if(previous&&previous!==panel){previous.hidePopover();previous.classList.remove('is-open','is-closing');openers.get(previous)?.setAttribute('aria-expanded','false');}
    clearTimeout(timers.get(panel));openers.set(panel,opener);panel.dataset.managed='';panel.setAttribute('popover','manual');
    panel.classList.remove('is-closing');opener?.setAttribute('aria-expanded','true');
    if(!panel.matches(':popover-open'))panel.showPopover();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(panel.isConnected&&panel.matches(':popover-open')&&!panel.classList.contains('is-closing')){panel.classList.add('is-open');panel.tabIndex=-1;panel.focus({preventScroll:true});}}));
  }
  function handle(event){
    if(event.type==='pointerdown'){
      const panel=current();if(!panel)return false;
      const r=panel.getBoundingClientRect();
      if(event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom)return false;
      event.preventDefault();event.stopImmediatePropagation();swallowUntil=performance.now()+1000;swallowX=event.clientX;swallowY=event.clientY;close(panel);return true;
    }
    if(event.type!=='click')return false;
    if(performance.now()<swallowUntil&&event.detail>0&&Math.hypot(event.clientX-swallowX,event.clientY-swallowY)<8){swallowUntil=0;event.preventDefault();event.stopImmediatePropagation();return true;}
    swallowUntil=0;
    const share=event.target.closest?.('[data-product-share]'),button=event.target.closest?.('[popovertarget]');
    const panel=share?document.getElementById(share.dataset.sharePanel):button?document.getElementById(button.getAttribute('popovertarget')):null;
    if(!panel?.matches('.mt-product-dialog'))return false;
    event.preventDefault();event.stopImmediatePropagation();
    if(share){try{panel.querySelector('[data-share-value]').value=new URL(share.dataset.shareUrl,location.href).href;}catch{}}
    if(button?.getAttribute('popovertargetaction')==='hide')close(panel);
    else open(panel,share||button);
    return true;
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current()){event.preventDefault();event.stopImmediatePropagation();close(current());}},true);
  window.MateriaProductDialogs={handle,open,close};
  if(!window.__materiaSectionLinkCapture)for(const type of ['click','pointerdown'])window.addEventListener(type,handle,true);
})();
