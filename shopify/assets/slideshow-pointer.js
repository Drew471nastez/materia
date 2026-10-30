/* Pointer/scroll effects initialize AFTER markup and survive builder redraws. */
(() => {
  if(window.MateriaSlideshowPointer)return;
  const states=new Map(),reduced=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
  function init(root){
    if(states.has(root))return;
    const state={frame:0,near:false,pointer:null},mode=()=>root.dataset.slideshowPointer;
    const paint=()=>{state.frame=0;if(!root.isConnected||!state.near||document.hidden||reduced.matches)return;const r=root.getBoundingClientRect();if(mode()==='parallax')root.style.setProperty('--scroll-y',Math.max(-100,Math.min(100,(r.top-innerHeight/2)/Math.max(1,innerHeight)*100))+'px');
      if(mode()==='mouse_track')root.querySelectorAll('.banner__media').forEach(el=>{const slide=el.closest('.swiper-slide'),active=!slide||slide.classList.contains('swiper-slide-active')||!root.querySelector('.swiper-initialized'),rect=el.getBoundingClientRect(),p=state.pointer;const x=p&&active&&fine.matches?Math.max(-.5,Math.min(.5,(p.x-rect.left)/Math.max(1,rect.width)-.5)):0,y=p&&active&&fine.matches?Math.max(-.5,Math.min(.5,(p.y-rect.top)/Math.max(1,rect.height)-.5)):0;el.style.setProperty('--mx',x);el.style.setProperty('--my',y);});};
    const queue=()=>{if(!state.frame)state.frame=requestAnimationFrame(paint);},move=e=>{if(e.pointerType!=='mouse'||mode()!=='mouse_track'||!fine.matches||reduced.matches)return;state.pointer={x:e.clientX,y:e.clientY};queue();},leave=()=>{state.pointer=null;queue();};
    const reset=()=>{state.pointer=null;root.style.setProperty('--scroll-y','0px');root.querySelectorAll('.banner__media').forEach(el=>{el.style.setProperty('--mx',0);el.style.setProperty('--my',0);});queue();};
    const intersection=new IntersectionObserver(entries=>{state.near=entries.at(-1).isIntersecting;queue();});intersection.observe(root);const resize=new ResizeObserver(queue);resize.observe(root);
    root.addEventListener('pointermove',move,{passive:true});root.addEventListener('pointerleave',leave);window.addEventListener('scroll',queue,{passive:true});reduced.addEventListener('change',reset);fine.addEventListener('change',reset);document.addEventListener('visibilitychange',reset);
    state.dispose=()=>{intersection.disconnect();resize.disconnect();cancelAnimationFrame(state.frame);root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',queue);reduced.removeEventListener('change',reset);fine.removeEventListener('change',reset);document.removeEventListener('visibilitychange',reset);states.delete(root);};states.set(root,state);
  }
  function scan(){for(const [root,state]of states)if(!root.isConnected)state.dispose();document.querySelectorAll('[data-slideshow-pointer]').forEach(init);}
  document.addEventListener('storelib:settings-change',e=>{const d=e.detail||{},id=d.section||d.sectionId;if(!id||!d.settings)return;for(const root of states.keys())if(root.dataset.id===String(id.id||id).replace(/^shopify-section-/,'')){if(d.settings.image_effect!=null)root.dataset.slideshowPointer=d.settings.image_effect;}});
  ['DOMContentLoaded','storelib:section-load'].forEach(e=>document.addEventListener(e,scan));new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches('[data-slideshow-pointer]')||n.querySelector('[data-slideshow-pointer]')))))scan();}).observe(document.documentElement,{subtree:true,childList:true});window.MateriaSlideshowPointer={scan};scan();
})();
