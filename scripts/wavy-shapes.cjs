/* Shared authoring geometry for the section's SSR paths and live-preview data.
 * No runtime dependency: both copies are embedded in the native section.
 * Cubic Hermite curves keep adjacent segments tangent-continuous. */
const round=v=>Math.round(v*100)/100;
const styles={
 type1:{label:'Gentle swell',segments:8,curve:(t,p)=>24*Math.sin(2*Math.PI*t+p)},
 type2:{label:'Rolling waves',segments:16,curve:(t,p)=>66*Math.sin(4*Math.PI*t+p)},
 type3:{label:'Fine ripples',segments:40,curve:(t,p)=>42*Math.sin(10*Math.PI*t+p)},
 type4:{label:'Organic wave',segments:24,curve:(t,p)=>48*Math.sin(2*Math.PI*t+p)+27*Math.sin(6*Math.PI*t+.8+p*.5)},
 type5:{label:'Sweeping arc',segments:12,curve:(t,p)=>-72*Math.sin(Math.PI*t)*(1+.2*Math.sin(p))+8*Math.sin(p)*Math.sin(2*Math.PI*t)}
};
function edge(style,phase,layer){
 const f=t=>100+(layer%2?0:12)+style.curve(t,phase)*(layer%2?1:.8);
 const derivative=t=>(f(t+.00001)-f(t-.00001))/.00002;
 let d='M0,'+round(f(0));
 for(let i=0;i<style.segments;i++){
  const a=i/style.segments,b=(i+1)/style.segments,h=b-a;
  d+=' C'+[round((a+h/3)*1200),round(f(a)+derivative(a)*h/3),round((b-h/3)*1200),round(f(b)-derivative(b)*h/3),round(b*1200),round(f(b))].join(',');
 }
 return d+(layer<2?' L1200,0 L0,0 Z':' L1200,200 L0,200 Z');
}
const shapes=Object.fromEntries(Object.entries(styles).map(([id,style])=>[id,Array.from({length:4},(_,layer)=>{
 const start=layer%2?.3:1,frames=[start,start+.65,start];
 const paths=frames.map(p=>edge(style,p,layer));
 return {d:paths[0],values:paths.join(';'),duration:layer%2?'8s':'12s'};
})]));
module.exports={styles,shapes};
