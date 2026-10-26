(() => {
  if(window.MateriaPasswordLaunch)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const paint=()=>{
   document.querySelectorAll('[data-password-launch] video').forEach(video=>{
    let visible=false;if(!document.hidden&&!reduced.matches){const rect=video.getBoundingClientRect();visible=rect.bottom>0&&rect.top<innerHeight;}
    if(video._pwVisible===visible)return;video._pwVisible=visible;
    if(visible){const playing=video.play();playing?.catch(()=>{});}else video.pause();
   });
   document.querySelectorAll('[data-launch-date]').forEach(el=>{
    if(document.hidden||!el.isConnected)return;
    const rect=el.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;
    const end=Date.parse(el.dataset.launchDate),left=Math.max(0,Math.floor((end-Date.now())/1000));
    el.hidden=!Number.isFinite(end)||left===0;const block=el.closest('.pw-launch__block');if(block)block.hidden=el.hidden;if(el.hidden)return;
    const values={days:Math.floor(left/86400),hours:Math.floor(left/3600)%24,minutes:Math.floor(left/60)%60,seconds:left%60};
    for(const [unit,value]of Object.entries(values)){const node=el.querySelector('[data-launch-unit="'+unit+'"]'),text=String(value).padStart(2,'0');if(node&&node.textContent!==text)node.textContent=text;}
   });
  };
  reduced.addEventListener?.('change',paint);
  document.addEventListener('storelib:section-load',paint);document.addEventListener('visibilitychange',paint);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
  setInterval(paint,1000);window.MateriaPasswordLaunch={paint};
})();
