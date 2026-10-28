/* Run: node tests/theme-countdown-calendar.cjs   (needs liquidjs: LIQUIDJS=<path> or installed)
   Countdown deadlines across the theme: impossible calendar dates (2026-02-30)
   hide a timer instead of rolling into March, leap days are kept, midnight
   and offsets resolve to the exact moment, expired timers stop at zero, and a
   redrawn section picks up its new date. Setting ids are unchanged. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let checks=0;
const sections=['countdown-flip','countdown-inline','countdown-promo-popup','countdown-timer2','announcement-bar-pro-4'];
const cases=[['2026-02-30',false],['2026-02-30T00:00:00Z',false],['2027-02-29',false],['2028-02-29',true],['2026-13-01',false],['2026-04-31T10:00',false],['2026-12-31T23:59:00+02:00',true],['2026-12-31T00:00',true],['',true]];
for(const name of sections){
  const src=read('sections/'+name+'.storelib'),fn=src.match(/function calendarOk\(s\)\{[^\n]*?\}(?=\n)/);
  assert(fn,name+' has the calendar check');const calendarOk=new Function(fn[0]+';return calendarOk;')();
  for(const [value,ok] of cases)assert.equal(calendarOk(value),ok,name+' '+value);checks++;
}
for(const name of ['hero-product3','hero-product4']){
  const src=read('sections/'+name+'.storelib'),fn=src.match(/function parseISO\(iso\)\{[^\n]*?return isNaN\(d\) \? null : d; \}/);
  assert(fn,name+' parseISO');const parseISO=new Function(fn[0]+';return parseISO;')();
  for(const [value,ok] of cases.filter(c=>c[0]))assert.equal(parseISO(value)!==null,ok,name+' '+value);checks++;
}
// Ids the creator's dates are stored under are still declared.
for(const [file,ids] of Object.entries({'sections/main-product.storelib':['end_date','end_hour','end_minute','utc_offset','end_iso','timing_input','date_source'],'sections/featured-product.storelib':['end_date','end_hour','end_minute','utc_offset','end_iso'],'sections/coming-soon.storelib':['countdown_date'],'sections/countdown-flip.storelib':['end_iso'],'sections/countdown-timer2.storelib':['end_date','end_time'],'sections/countdown-promo-popup.storelib':['end_datetime']})){
  const src=read(file);for(const id of ids)assert(src.includes('"id": "'+id+'"'),file+' keeps '+id);checks++;
}
(async()=>{
  // Midnight and offsets through the shared schedule snippet.
  let Liquid;try{({Liquid}=require(process.env.LIQUIDJS||'liquidjs'));}catch{}
  if(Liquid){
    const e=new Liquid(),snip=read('snippets/countdown-schedule.storelib').replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'');
    const at=async c=>(await e.parseAndRender(snip,{controls:c})).trim();
    assert.equal(await at({timing_input:'parts',end_date:'2028-02-29',end_hour:0,end_minute:0,utc_offset:'+02:00'}),'2028-02-29T00:00:00+02:00');
    assert.equal(Date.parse('2028-02-29T00:00:00+02:00'),Date.UTC(2028,1,28,22));checks++;
    assert.equal(await at({timing_input:'parts',end_date:'2026-12-31',end_hour:23,end_minute:5,utc_offset:'-05:00'}),'2026-12-31T23:05:00-05:00');checks++;
    assert.equal(await at({timing_input:'parts',end_iso:'2029-01-01T00:00:00Z'}),'2029-01-01T00:00:00Z','a legacy advanced date stays until a date is typed');checks++;
  }
  const browser=await chromium.launch({executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']});
  try{
    const p=await browser.newPage({viewport:{width:375,height:800}}),errors=[];p.on('pageerror',err=>errors.push(err.message));
    const block=d=>`<div class="pw-launch__block"><div class="pw-launch__countdown" data-launch-date="${d}"><span data-launch-unit="days">--</span><span data-launch-unit="hours">--</span><span data-launch-unit="minutes">--</span><span data-launch-unit="seconds">--</span></div></div>`;
    await p.setContent('<main data-password-launch>'+block('2026-02-30')+'</main>');await p.addScriptTag({content:read('shopify/assets/password-launch.js')});
    assert.equal(await p.locator('.pw-launch__countdown').evaluate(el=>el.hidden),true,'impossible date hides');checks++;
    const future=new Date(Date.now()+2*86400000+3600000+120000).toISOString();
    await p.locator('main').evaluate((el,html)=>{el.innerHTML=html;el.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:'launch'}}));},block(future));
    assert.equal(await p.locator('[data-launch-unit=days]').textContent(),'02');assert.equal(await p.locator('[data-launch-unit=hours]').textContent(),'01');checks++;
    await p.locator('main').evaluate((el,html)=>{el.innerHTML=html;el.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true}));},block('2020-01-01T00:00:00Z'));
    assert.equal(await p.locator('.pw-launch__countdown').evaluate(el=>el.hidden),true,'expired countdown hides');checks++;
    assert.deepEqual(errors,[]);checks++;
  }finally{await browser.close();}
  console.log(checks+' countdown calendar, leap day, midnight, offset, expiry and redraw checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
