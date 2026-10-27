/* Refresh public product data, never synthesize sales or rotate counts. */
(() => {
  if(window.MateriaProductCounters)return;
  const cache=new Map(),seen=new Set();
  async function update(root){
    if(document.hidden||!root.isConnected)return;
    const rect=root.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;
    let url;try{url=new URL(root.dataset.productCounterUrl,location.href);if(url.origin!==location.origin||!/(^|\/)products\//.test(url.pathname))return;}catch{return;}
    const id=root.dataset.productCounterId,key=url.href;let entry=cache.get(key);
    if(!entry||Date.now()-entry.time>60000){
      entry={time:Date.now(),promise:fetch(key,{credentials:'same-origin',headers:{Accept:'text/html'}}).then(r=>r.ok?r.text():null).then(text=>text?new DOMParser().parseFromString(text,'text/html'):null).catch(()=>null)};cache.set(key,entry);
      if(cache.size>30)cache.delete(cache.keys().next().value);
    }
    const doc=await entry.promise;if(!doc||!root.isConnected)return;
    const source=[...doc.querySelectorAll('[data-product-counter-source]')].find(el=>el.dataset.productCounterSource===id),raw=source?.dataset.sold;
    if(!source)return;
    if(raw==null||!/^\d+$/.test(raw.trim())){const row=root.querySelector('.rs__sold');if(row)row.hidden=true;return;}
    const count=Number(raw);if(!Number.isSafeInteger(count))return;
    const value=root.querySelector('[data-verified-sold-count]');if(value){const text=value.textContent.replace(/^\s*\d+/,String(count));if(text!==value.textContent)value.textContent=text;}
    // A published zero is real data. An absent count is unknown, not zero.
    const row=root.querySelector('.rs__sold');if(row)row.hidden=false;
  }
  const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)update(entry.target);})):null;
  function scan(){seen.forEach(root=>{if(!root.isConnected){observer?.unobserve(root);seen.delete(root);}});document.querySelectorAll('[data-live-sold-source="product"]').forEach(root=>{if(seen.has(root))return;seen.add(root);observer?.observe(root);update(root);});}
  document.addEventListener('storelib:section-load',scan);document.addEventListener('shopify:section:load',scan);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){scan();seen.forEach(update);}});
  setInterval(()=>{if(!document.hidden){scan();seen.forEach(update);}},60000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
  window.MateriaProductCounters={scan,update};
})();
