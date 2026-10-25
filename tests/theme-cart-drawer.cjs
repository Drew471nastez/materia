/* Cart drawer: delete, recommendations, fast quantity, note/coupon fields,
   estimate picker, sheet drag, free-shipping bar and the variant sheet.
   Real theme JS/CSS on a page with a fake cart API (/cart/*.js, ?sections=). */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const slice=(src,from,to)=>{const a=src.indexOf(from),b=src.indexOf(to,a);if(a<0||b<0)throw new Error('marker missing: '+from);return src.slice(a,b+to.length);};
const snippetPart=(file,tag)=>{const s=read(file);const m=s.match(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)</'+tag+'>'));return m?m[1].replace(/\{%[\s\S]*?%\}/g,''):'';};
const ORIGIN='https://shop.test';

const theme=read('shopify/assets/theme.js');
const themeParts=[
  slice(theme,'class QuantityInput extends HTMLElement','customElements.define("quantity-input", QuantityInput);'),
  slice(theme,'class ProgressBar extends HTMLElement','customElements.define("free-ship-progress-bar", ProgressBar);'),
  slice(theme,'class MiniCartRemoveButton extends HTMLElement','customElements.define("mini-cart-remove-button", MiniCartRemoveButton);'),
].join('\n');
// The drawer snippets' static CSS and JS live in cached assets, one part per snippet.
const assetPart=(file,name)=>slice(read(file),`/* == ${name} == */`,`/* == end ${name} == */`);
const sheetsCss=assetPart('shopify/assets/cart-drawer.css','snippets/cart-drawer-sheets');
const sheetsJs=assetPart('shopify/assets/cart-drawer.js','snippets/cart-drawer-sheets');
const polishCss=assetPart('shopify/assets/cart-drawer.css','snippets/cart-drawer-polish');
const polishJs=assetPart('shopify/assets/cart-drawer.js','snippets/cart-drawer-polish');
const presentationCss=assetPart('shopify/assets/cart-drawer.css','snippets/cart-drawer-presentation');
const minicart=read('snippets/minicart.storelib');
const shippingIcon=slice(minicart,'<span class="cart_shipping__icon" aria-hidden="true">','</span>');

/* ---------- fake store ---------- */
const VARIANTS={
  v1:{title:'Pants Down',product:'p1',price:4000,options:['S','Black'],available:true},
  v1b:{title:'Pants Down',product:'p1',price:4000,options:['M','Black'],available:true},
  v1c:{title:'Pants Down',product:'p1',price:4000,options:['L','Black'],available:false},
  v1d:{title:'Pants Down',product:'p1',price:4000,options:['XL','Black'],available:true,serverSoldOut:true},
  v2:{title:'Black Sleeves',product:'p2',price:1500,options:['M'],available:true},
  v3:{title:'Linen Shirt',product:'p3',price:2500,options:['One'],available:true},
};
const productVariants=p=>Object.entries(VARIANTS).filter(([,v])=>v.product===p).map(([id,v])=>({id,option1:v.options[0],option2:v.options[1]||null,available:v.available}));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=c=>'€'+(c/100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
function makeStore(){
  const store={items:[{key:'v1',quantity:1},{key:'v2',quantity:2}],note:'',codes:[],log:[],inflight:0,maxInflight:0,delay:{change:120,add:120,update:80}};
  store.cart=()=>{
    const items=store.items.map(i=>{const v=VARIANTS[i.key];return {id:i.key,key:i.key,variant_id:i.key,product_id:v.product,quantity:i.quantity,title:v.title,price:v.price,final_price:v.price,final_line_price:v.price*i.quantity,options_with_values:[]};});
    const sub=items.reduce((s,i)=>s+i.final_line_price,0);
    const applicable=store.codes.filter(c=>c==='SAVE10');
    const total=applicable.length?Math.round(sub*.9):sub;
    return {token:'t',note:store.note,item_count:items.reduce((s,i)=>s+i.quantity,0),items,items_subtotal_price:sub,total_price:total,discount_codes:store.codes.map(code=>({code,applicable:code==='SAVE10'}))};
  };
  return store;
}
function renderRow(item){
  const v=VARIANTS[item.key],vars=productVariants(v.product),multi=vars.length>1;
  const choices=multi?`<cart-item-variant-switch id="cart-variants-${item.key}" class="cart-item__variant-picker" hidden data-line-key="${item.key}" data-current-variant="${item.key}" data-quantity="${item.quantity}" data-properties="{}" data-selling-plan=""><script class="cart-item__variants-json" type="application/json">${JSON.stringify(vars)}</script><div class="cart-item__variant-field" role="group" aria-label="Size"><span>Size</span><select hidden tabindex="-1" aria-hidden="true" name="option-1">${vars.map(x=>`<option value="${x.option1}"${x.option1===v.options[0]?' selected':''}>${x.option1}</option>`).join('')}</select><div class="cart-item__variant-choices">${vars.map(x=>`<button type="button" class="cart-item__variant-choice" data-option-index="0" data-option-value="${x.option1}" aria-pressed="${x.option1===v.options[0]}">${x.option1}</button>`).join('')}</div></div><div class="cart-item__variant-field" role="group" aria-label="Color"><span>Color</span><select hidden tabindex="-1" aria-hidden="true" name="option-2"><option value="Black" selected>Black</option></select><div class="cart-item__variant-choices"><button type="button" class="cart-item__variant-choice" data-option-index="1" data-option-value="Black" aria-pressed="true">Black</button></div></div><p class="cart-item__variant-error" role="alert" hidden></p></cart-item-variant-switch>`:'';
  return `<div id="minicart__product-${item.key}" product-handle="${v.product}" class="cart-item flex mb-20 pb-20 gap-15 border-bottom-dashed">
  <div class="minicart__product__image relative" style="width:90px"><a href="/products/${v.product}"><img id="img-${item.key}" alt="${esc(v.title)}" width="90" height="120" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></a></div>
  <div class="minicart__product-info flex-1 relative flex flex-column">
    <h3 class="minicart__product-name my-0 text-size"><a class="no-underline heading-color" href="/products/${v.product}">${esc(v.title)}</a></h3>
    <div class="minicart__item-variant cart-options flex flex-wrap"><div class="product-option">${v.options.join(' / ')}</div></div>
    <ul class="discounts list-unstyled" role="list"></ul>
    <div class="minicart__item-prices mt-3 flex flex-wrap grow-1"><span class="minicart__item-price">${money(v.price)}</span>
      <div class="cart-item__error inline-flex align-start" id="CartDrawer-LineItemError-${item.key}" role="alert"><span class="cart-item__error-text"></span></div></div>
    <div class="cart-item__controls">
      <div class="minicart__actions mt-6 flex grow-1 bottom-left w-full"><quantity-input class="quantity rounded-3 border inline-flex text-center grey-bg">
        <button class="quantity__button pointer border-0" name="minus" type="button" data-id="${item.key}" aria-label="Decrease">-</button>
        <input class="quantity-input bg-unset text-center" type="number" id="${item.key}" name="updates[]" data-id="${item.key}" value="${item.quantity}" data-value="${item.quantity}" min="0">
        <button class="quantity__button pointer border-0" name="plus" type="button" data-id="${item.key}" aria-label="Increase">+</button>
      </quantity-input></div>
      <div class="minicart__bottom minicart__bottom--top-right absolute flex flex-column gap-8 top-0 right-0">
        ${multi?`<button type="button" class="cart-item__variant-edit minicart__item-edit" aria-expanded="false" aria-controls="cart-variants-${item.key}" aria-label="Edit ${esc(v.title)}" title="Edit">✎</button>`:''}
        <mini-cart-remove-button data-product-handle="${v.product}" class="minicart__item-remove action-add-wishlist" data-index="${item.key}"><a href="/cart/change?id=${item.key}&quantity=0" class="cart-remove button--tertiary relative" aria-label="Remove"><svg width="16" height="16" class="remove-icon"></svg><div class="icon-rotator"></div></a></mini-cart-remove-button>
      </div>
    </div>
    ${choices}
  </div>
  <div class="flex-1 relative minicart__wishlist" style="display: none;"><p>Save to wishlist before removing?</p></div>
</div>`;
}
function renderForm(store){
  const cart=store.cart(),recFor=cart.items.find(i=>i.product_id!=='p3')?.product_id||'p1';
  const body=cart.items.length?`<div class="minicart-body flex-1 grow pt-30 px-30"><div class="items">${cart.items.map(renderRow).join('')}</div></div>`:`<div class="cart-body"><div class="cart-empty">Your cart is empty</div></div>`;
  const extras=cart.items.length?`<minicart-recommendations data-url="/recommendations/products?product_id=${recFor}&limit=6&section_id=cart-upsell" class="block cart-recommend pt-30 pb-30 px-30 border-top"><h4 class="minicart-heading">You may also like</h4><slide-section class="swiper swiper-cart-upsell"><div class="swiper-wrapper"></div></slide-section></minicart-recommendations>
    <div class="cart-addons flex justify-center border-top">
      <div class="mini_cart_note"><button type="button" data-open="note" aria-expanded="false" aria-controls="note" class="btn-reset mini_cart_addon_btn show-overlay note"><span class="cart-tool-label">Add Order Note</span></button></div>
      <div class="mini_cart_shipping"><button type="button" data-open="shipping" aria-expanded="false" aria-controls="shipping" class="btn-reset mini_cart_addon_btn show-overlay shipping"><span class="cart-shipping-label">Estimate</span></button></div>
      <div class="mini_cart_coupon"><button type="button" data-open="coupon" aria-expanded="false" aria-controls="coupon" class="btn-reset mini_cart_addon_btn show-overlay gift"><span class="cart-tool-label">Coupon code</span></button></div>
    </div>`:'';
  const sheets=`<div id="note" class="cart-footeraddon cart__addon-content grey-bg absolute transition w-full z-10 p-30 left-0 bottom-0" role="dialog"><div class="cart-sheet__grab" data-sheet-grab aria-hidden="true"></div><div class="addon-title flex align-center gap-10 mb-15"><span class="heading-style">Add Order Note</span></div><div class="cart-note-field"><label class="visually-hidden" for="cart-drawer-note">Note</label><textarea id="cart-drawer-note" class="w-full bg-white mb-20 cart-note form-control" name="note" rows="4">${esc(cart.note)}</textarea></div><div class="addon-actions"><button type="button" class="btn-save w-full btn-primary mb-10" data-action="note">Save</button><button type="button" class="btn-cancel w-full btn-outline">Cancel</button></div></div>
  <div id="shipping" class="cart-footeraddon cart__addon-content grey-bg absolute w-full z-10 p-30 left-0 bottom-0" role="dialog"><div class="cart-sheet__grab" data-sheet-grab aria-hidden="true"></div><div class="addon-title"><span>Estimate Shipping</span></div><div class="addon-content"><div data-address="root"><div class="form-group flex flex-column"><label for="address_country">Country/region</label><select id="address_country" class="form-control" name="address[country]" data-search-label="Search"></select></div><div class="form-group"><label for="AddressZip">ZIP</label><input type="text" class="form-control" id="AddressZip" name="address[zip]"></div></div></div><div class="addon-actions"><button type="button" class="btn-primary btn-save" data-action="shipping">Estimate</button><button type="button" class="btn-cancel btn-outline">Cancel</button></div><div class="addon-message"></div></div>
  <div id="coupon" class="cart-footeraddon cart__addon-content grey-bg absolute w-full z-10 p-30 left-0 bottom-0" role="dialog"><div class="cart-sheet__grab" data-sheet-grab aria-hidden="true"></div><div class="addon-title"><span>Coupon code</span></div><minicart-discount class="cart-discount"><form><div class="addon-content"><input type="text" name="discount" class="bls__discount_code discount_code w-full bg-white mb-20 cart-coupon" placeholder="Coupon code" aria-label="Coupon code"></div><div class="addon-actions"><button type="button" class="btn-cancel btn-outline">Cancel</button><button type="submit" class="coupon-apply w-full btn-primary relative">Apply</button></div></form><ul class="cart-discount__codes">${cart.discount_codes.filter(c=>c.applicable).map(c=>`<li class="cart-discount__item" data-code="${c.code}"><p class="cart-discount-code">${c.code}</p></li>`).join('')}</ul></minicart-discount></div>`;
  return `<div id="minicart-form" class="minicart-form flex-1 flex flex-column grow relative overflow-hidden"><div class="minicart-scroll flex-1 overflow-y-scroll" style="overflow-y:auto">
    <form id="minicart" class="minicart-form flex-1 flex flex-column relative">${body}</form>${sheets}${extras}</div>
    <div class="cart-footer"><div class="drawer-bottom cart__ctas px-30 pt-20 pb-30 grey-bg border-top"><div class="subtotal flex justify-between"><h5 class="my-0">Subtotal</h5><span class="subtotal-price h5 my-5" data-cart-subtotal-price>
      ${money(cart.total_price)}
    </span></div><button type="submit" class="btn-primary w-full btn-checkout" name="checkout" form="minicart">Check out</button></div></div></div>`;
}
const section=store=>`<div id="shopify-section-minicart-form" class="shopify-section">${renderForm(store)}</div>`;
const recHTML=pid=>{const v=pid==='p3'?'v2':'v3',p=VARIANTS[v];return `<div class="swiper-wrapper"><div class="swiper-slide"><div class="product-item"><a class="product-item__name" href="/products/${p.product}">${p.title}</a><span class="price">${money(p.price)}</span><product-form class="product-item__product-form"><form method="post" action="/cart/add" data-type="add-to-cart-form"><input type="hidden" name="id" value="${v}"><button type="submit" name="add" class="product-item__button-submit bls-add-cart-list btn-primary"><span class="pc-atc__label hidden-on-load">Add to Cart</span></button></form></product-form></div></div></div>`;};

async function serve(page,store){
  await page.route(ORIGIN+'/**',async route=>{
    const req=route.request(),url=new URL(req.url()),p=url.pathname;
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    let data={};try{data=JSON.parse(req.postData()||'{}')}catch{}
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const track=async(kind,fn)=>{store.inflight++;store.maxInflight=Math.max(store.maxInflight,store.inflight);const entry={kind,data,at:Date.now()};store.log.push(entry);await wait(store.delay[kind]||50);store.inflight--;entry.done=Date.now();return fn();};
    const withSections=body=>{if(data.sections)body.sections=Object.fromEntries([].concat(data.sections).map(id=>[id,section(store)]));return body;};
    if(p==='/')return route.fulfill({contentType:'text/html',body:store.page});
    if(p==='/cart.js'||p==='/cart.json')return json(store.cart());
    if(p==='/cart'&&url.searchParams.get('sections'))return json(Object.fromEntries(url.searchParams.get('sections').split(',').map(id=>[id,section(store)])));
    if(p==='/recommendations/products'){store.log.push({kind:'rec',at:Date.now()});await wait(150);return route.fulfill({contentType:'text/html',body:recHTML(url.searchParams.get('product_id'))});}
    if(p==='/cart/change.js')return track('change',()=>{const item=store.items.find(i=>i.key===data.id);if(!item)return json({status:400,message:'Cart Error',description:'No valid id'},400);item.quantity=Number(data.quantity);store.items=store.items.filter(i=>i.quantity>0);return json(withSections(store.cart()));});
    if(p==='/cart/add.js')return track('add',()=>{const v=VARIANTS[data.id];if(!v||!v.available||v.serverSoldOut)return json({status:422,message:'Cart Error',description:'This variant is sold out.'},422);const item=store.items.find(i=>i.key===data.id);if(item)item.quantity+=Number(data.quantity||1);else store.items.push({key:data.id,quantity:Number(data.quantity||1)});const line=store.cart().items.find(i=>i.key===data.id);return json(withSections({...line}));});
    if(p==='/cart/update.js')return track('update',()=>{if('note' in data)store.note=data.note;if('discount' in data)store.codes=String(data.discount).split(',').map(s=>s.trim()).filter(Boolean);return json(withSections(store.cart()));});
    if(p.endsWith('/shipping_rates.json'))return json({shipping_rates:[]});
    return route.fulfill({status:404,body:''});
  });
}
const pageHTML=store=>`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{--color-background:#ffffff;--color-text:#0f0f0f;--color-heading:#0f0f0f;--color-border:#e2e2e2;--color-primary:#0f0f0f;--input-color:#ffffff;--input-bg:rgba(255,255,255,.6);--btn-primary-bg-color:#111;--btn-primary-color:#fff;--btn-radius:6px;--grey-color:#f5f5f5}
body{margin:0;font:15px/1.4 sans-serif;background:#fff;color:#0f0f0f}.grey-bg{background:var(--grey-color)}.hidden{display:none}.visually-hidden{position:absolute;clip:rect(0 0 0 0);width:1px;height:1px;overflow:hidden}
.flex{display:flex}.flex-column{flex-direction:column}.flex-1{flex:1}.relative{position:relative}.absolute{position:absolute}
</style></head><body class="template-index" data-btn-hover="fade">
<header><a class="cart-icon">Cart <span class="cart-count h-count" id="header-count">${store.cart().item_count}</span></a></header>
<cart-notification id="minicart_wrapper" class="minicart open_drawer color-default open">
 <div class="minicart__wrapper flex flex-column color-default bls__drawer fixed open" style="position:fixed;top:0;right:0;bottom:0;width:100%;max-width:430px;background:#fff;display:flex;flex-direction:column;overflow:hidden">
  <button class="cart-drawer-sheet-scrim" aria-label="Close"></button>
  <div class="minicart__header flex justify-between"><div class="h5 minicart-heading">Your Cart <span class="cart-count cart-count-drawer">(${store.cart().item_count})</span></div><button class="btn-reset close-cart-button" aria-label="Close">×</button></div>
  <free-ship-progress-bar data-order="${store.cart().items_subtotal_price}" data-fe-amount="150" data-money-sample="€1,234.56" data-fe-unavaiable="Spend &lt;span class=&quot;price&quot;&gt;[[amount]]&lt;/span&gt; more for free shipping" data-fe-avaiable="You have free shipping" class="block cart_shipping cart_threshold cart_shipping--modern grey-bg px-30 pt-20 pb-20">
   <div class="cart_shipping__row">${shippingIcon}<div class="cart_shipping__message free-shipping-message" aria-live="polite"></div></div>
   <div class="cart_shipping__track" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span class="cart_shipping__fill percent_shipping_bar progress" style="width: 0%;"></span></div>
  </free-ship-progress-bar>
  ${renderForm(store)}
 </div>
</cart-notification></body></html>`;

async function open(browser,opts={}){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,...opts});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const store=makeStore();store.page=pageHTML(store);
  await serve(page,store);
  await page.goto(ORIGIN+'/');
  for(const css of [read('shopify/assets/theme-button-contract.css'),read('shopify/assets/minicart.css'),presentationCss,polishCss,sheetsCss,read('shopify/assets/materia-experience.css')])await page.addStyleTag({content:css});
  await page.addScriptTag({content:`window.routes={cart_url:'/cart',cart_change_url:'/cart/change.js',cart_add_url:'/cart/add.js',cart_update_url:'/cart/update.js'};
    window.fetchConfig=(type='json')=>({method:'POST',headers:{'Content-Type':'application/json',Accept:'application/'+type}});
    window.PopupBase=class extends HTMLElement{};window.subscribe=()=>()=>{};window.PUB_SUB_EVENTS={quantityUpdate:'q'};
    window.toasts=[];window.showToast=m=>toasts.push(String(m));window.BlsLazyloadImg={init(){}};
    window.cartStrings={error:'Something went wrong',discount_error:'This code is not valid',discount_applied:'Code applied',discount_removed:'Code removed',discount_already:'Already used'};
    window.root=document.documentElement;`});
  for(const js of [read('shopify/assets/cart-components.js'),themeParts,read('shopify/assets/cart-drawer-safety.js'),read('shopify/assets/cart-discount.js'),read('shopify/assets/cart-variant-edit.js'),read('shopify/assets/materia-experience.js'),polishJs,sheetsJs])await page.addScriptTag({content:js});
  await page.waitForTimeout(250);
  store.log.length=0;
  return {page,store,errors,context};
}
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
const ty=(page,sel)=>page.$eval(sel,el=>new DOMMatrix(getComputedStyle(el).transform).m42);
const contrast=(a,b)=>{const lum=c=>{const [r,g,bb]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*bb};const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
async function touchDrag(page,x,y,steps,{dy=12,gap=16,check}={}){
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=steps;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+i*dy}]});
    if(check)await check(i*dy);else if(gap)await page.waitForTimeout(gap);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  let passed=0;const ok=()=>passed++;
  try {
    /* 1. Delete: no wishlist step, the row collapses, totals update in place. */
    {
      const {page,store,errors,context}=await open(browser);
      await page.evaluate(()=>{window.keepRow=document.getElementById('minicart__product-v1');window.keepImg=document.getElementById('img-v1');window.form=document.getElementById('minicart-form');});
      await page.click('#minicart__product-v2 .cart-remove');
      await page.waitForTimeout(40);
      assert.equal(await page.$eval('#minicart__product-v2 .minicart__wishlist',el=>getComputedStyle(el).display),'none','no wishlist prompt');
      assert.equal(await page.$eval('#minicart__product-v2 .minicart__product-info',el=>getComputedStyle(el).display)!=='none',true);
      await page.waitForFunction(()=>document.querySelector('#minicart__product-v2.materia-row-exit'),null,{timeout:2000});
      await page.waitForTimeout(90);
      const mid=await page.$eval('#minicart__product-v2',el=>({h:el.getBoundingClientRect().height,o:Number(getComputedStyle(el).opacity)}));
      assert(mid.h>0&&mid.h<150&&mid.o<1&&mid.o>0,'row collapses smoothly: '+JSON.stringify(mid));
      await page.waitForTimeout(400);
      assert.equal(await page.locator('#minicart__product-v2').count(),0);
      assert.deepEqual(store.log.filter(l=>l.kind==='change').map(l=>[l.data.id,l.data.quantity]),[['v2',0]],'one request, no second step');
      assert(await page.evaluate(()=>document.getElementById('minicart__product-v1')===keepRow&&document.getElementById('img-v1')===keepImg&&document.getElementById('minicart-form')===form),'nothing else remounts');
      assert.equal((await page.textContent('[data-cart-subtotal-price]')).trim(),'€40.00');
      assert.equal(await page.textContent('#header-count'),'1');
      assert.equal(await page.textContent('.cart-count-drawer'),'(1)');
      assert(Math.abs(await page.$eval('.cart_shipping__fill',el=>parseFloat(el.style.getPropertyValue('--fs-progress')))-4000/15000)<.005,'the bar follows the new subtotal');
      assert.deepEqual(errors,[]);ok();
      await context.close();
    }

    /* 2. Add from "You may also like": the line opens in place. */
    {
      const {page,store,errors,context}=await open(browser);
      await page.waitForSelector('minicart-recommendations .swiper-slide button');
      await page.evaluate(()=>{
        window.keep={row:document.getElementById('minicart__product-v1'),form:document.getElementById('minicart-form'),rec:document.querySelector('minicart-recommendations'),items:document.querySelector('#minicart .items')};
        const sc=document.querySelector('.minicart-scroll');sc.scrollTop=40;window.scroll0=sc.scrollTop;
        window.recHidden=0;new MutationObserver(()=>{const r=document.querySelector('minicart-recommendations');if(!r||r.hidden||!r.querySelector('.swiper-slide'))recHidden++;}).observe(document.getElementById('minicart-form'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
        window.formWiped=0;new MutationObserver(rs=>{if(rs.some(r=>r.target.id==='minicart-form'&&r.type==='childList'))formWiped++;}).observe(document.getElementById('minicart-form'),{childList:true});
      });
      await page.click('minicart-recommendations .swiper-slide button[type="submit"]');
      await page.waitForSelector('#minicart__product-v3',{timeout:3000});
      assert(await page.$eval('#minicart__product-v3',el=>el.classList.contains('materia-row-enter')),'new row animates in');
      await page.waitForTimeout(500);
      assert.equal(store.log.filter(l=>l.kind==='add').length,1);
      assert.equal(await page.locator('minicart-recommendations .pc-atc__label').textContent(),'Added');
      await page.evaluate(()=>{const drawer=document.querySelector('cart-notification');drawer._recommendationAdded=new Set();drawer.paintRecommendationStates();});
      assert.equal(await page.locator('minicart-recommendations .pc-atc__label').textContent(),'Add to Cart');
      assert(await page.evaluate(()=>keep.row===document.getElementById('minicart__product-v1')&&keep.form===document.getElementById('minicart-form')&&keep.items===document.querySelector('#minicart .items')&&keep.rec===document.querySelector('minicart-recommendations')),'drawer, rows and recommendations stay mounted');
      assert.equal(await page.evaluate(()=>formWiped),0,'no full drawer re-render');
      assert(Math.abs(await page.$eval('.minicart-scroll',el=>el.scrollTop)-await page.evaluate(()=>scroll0))<=1,'no scroll jump');
      assert.equal(await page.evaluate(()=>recHidden),0,'recommendations never go blank');
      assert.equal((await page.textContent('[data-cart-subtotal-price]')).trim(),'€95.00');
      assert.equal(await page.textContent('#header-count'),'4');
      assert.deepEqual(errors,[]);ok();
      await context.close();
    }

    /* 3. Fast +/- and typing: instant numbers, one request at a time, the last number wins. */
    {
      const {page,store,errors,context}=await open(browser);
      store.delay.change=380;
      await page.evaluate(()=>{window.trace=[];window.disabledSeen=0;const input=document.querySelector('#minicart__product-v1 input[name="updates[]"]');const tick=()=>{trace.push(Number(input.value));if(document.querySelector('#minicart__product-v1 .quantity__button[disabled], #minicart__product-v1 input[disabled]'))disabledSeen++;window.traceFrame=requestAnimationFrame(tick)};tick();
        window.subTrace=[];new MutationObserver(()=>subTrace.push(document.querySelector('[data-cart-subtotal-price]').textContent.trim())).observe(document.querySelector('[data-cart-subtotal-price]'),{childList:true,characterData:true,subtree:true});});
      const plus='#minicart__product-v1 .quantity__button[name="plus"]';
      for(let i=2;i<=4;i++){await page.click(plus);assert.equal(await page.inputValue('#minicart__product-v1 input[name="updates[]"]'),String(i),'number changes at once');await page.waitForTimeout(90);}
      await page.waitForTimeout(330); // the first request is now in flight
      assert.equal(store.inflight,1);
      for(let i=5;i<=7;i++){await page.click(plus);assert.equal(await page.inputValue('#minicart__product-v1 input[name="updates[]"]'),String(i));await page.waitForTimeout(90);}
      assert.equal((await page.textContent('#header-count')),'9','header count is optimistic');
      await page.waitForTimeout(1400);
      const changes=store.log.filter(l=>l.kind==='change').map(l=>l.data.quantity);
      assert(changes.length<=3&&changes.at(-1)===7,'coalesced, final wins: '+changes);
      assert.equal(store.maxInflight,1,'serialized');
      assert.equal(store.items.find(i=>i.key==='v1').quantity,7);
      const trace=await page.evaluate(()=>{cancelAnimationFrame(traceFrame);return trace;});
      assert(trace.every((v,i)=>i===0||v>=trace[i-1]),'a stale response never pulls the number back: '+[...new Set(trace)]);
      assert.equal(await page.evaluate(()=>disabledSeen),0,'no disabled flicker');
      assert.equal((await page.textContent('[data-cart-subtotal-price]')).trim(),'€310.00');
      const sub=await page.evaluate(()=>subTrace);
      const confirmedTotals=new Set(['€70.00',...changes.map(q=>money(q*4000+3000))]);
      assert(sub.every(t=>confirmedTotals.has(t)),'only server-confirmed totals are displayed: '+[...new Set(sub)]);
      assert.equal(await page.$eval('.cart_shipping__fill',el=>el.style.getPropertyValue('--fs-progress')),'1');
      assert(await page.$eval('free-ship-progress-bar',el=>el.classList.contains('cart_shipping_free')));
      // Typing a number.
      store.delay.change=60;
      await page.fill('#minicart__product-v1 input[name="updates[]"]','3');
      await page.waitForTimeout(900);
      assert.equal(store.items.find(i=>i.key==='v1').quantity,3);
      assert.equal(await page.inputValue('#minicart__product-v1 input[name="updates[]"]'),'3');
      await page.waitForFunction(()=>document.querySelector('[data-cart-subtotal-price]').textContent.trim()==='€150.00');
      assert.deepEqual(errors,[]);ok();
      await context.close();
    }

    /* 4. Order note and coupon: typed text is visible; the note saves, a coupon applies. */
    {
      const {page,store,errors,context}=await open(browser);
      await page.click('[data-open="note"]');await page.waitForTimeout(550);
      await page.click('#cart-drawer-note');await page.keyboard.type('Leave at the door');
      const note=await page.$eval('#cart-drawer-note',el=>{const s=getComputedStyle(el);return {c:s.color,f:s.webkitTextFillColor,bg:s.backgroundColor,fs:parseFloat(s.fontSize),v:el.value}});
      assert.equal(note.v,'Leave at the door');
      assert(contrast(note.c,note.bg)>=4.5&&contrast(note.f,note.bg)>=4.5&&note.fs>=16,'note text readable: '+JSON.stringify(note));
      await page.click('#note [data-action="note"]');await page.waitForTimeout(400);
      assert.equal(store.note,'Leave at the door','the note saves');
      assert(!await page.$eval('#note',el=>el.classList.contains('is-open')));
      await page.click('[data-open="coupon"]');await page.waitForTimeout(550);
      await page.click('#coupon input[name="discount"]');await page.keyboard.type('NOPE');
      const coupon=await page.$eval('#coupon input[name="discount"]',el=>{const s=getComputedStyle(el);return {c:s.color,f:s.webkitTextFillColor,bg:s.backgroundColor}});
      assert(contrast(coupon.c,coupon.bg)>=4.5&&contrast(coupon.f,coupon.bg)>=4.5,'coupon text readable: '+JSON.stringify(coupon));
      await page.click('#coupon .coupon-apply');await page.waitForTimeout(400);
      assert.equal(await page.inputValue('#coupon input[name="discount"]'),'NOPE','an unknown code is kept to fix');
      assert(await page.evaluate(()=>toasts.some(t=>t.includes('not valid'))),'and reported, not shown as applied');
      await page.fill('#coupon input[name="discount"]','SAVE10');
      await page.click('#coupon .coupon-apply');await page.waitForTimeout(500);
      assert.deepEqual(store.codes,['SAVE10']);
      assert.equal(await page.inputValue('#coupon input[name="discount"]'),'');
      assert.equal((await page.textContent('[data-cart-subtotal-price]')).trim(),'€63.00');
      assert(await page.evaluate(()=>toasts.some(t=>t.includes('Code applied'))));
      assert.deepEqual(errors,[]);ok();
      // Cart page fields.
      const cartPage=await context.newPage();
      await cartPage.setContent(`<style>:root{--color-background:#fff;--color-text:#111;--input-color:#ffffff;--input-bg:transparent}</style><div class="main-cart"><cart-note><textarea name="note" class="text-area field__input w-full form-control"></textarea></cart-note><cart-discount><form><input type="text" name="discount" class="form-control"></form></cart-discount></div>`);
      for(const css of [read('shopify/assets/theme-button-contract.css'),read('shopify/assets/cart-page.css')])await cartPage.addStyleTag({content:css});
      for(const sel of ['textarea','input[name="discount"]']){const s=await cartPage.$eval(sel,el=>{const c=getComputedStyle(el);return {c:c.color,f:c.webkitTextFillColor,bg:c.backgroundColor}});assert(contrast(s.c,s.bg)>=4.5&&contrast(s.f,s.bg)>=4.5,'cart page '+sel+' readable: '+JSON.stringify(s));}
      ok();
      await context.close();
    }

    /* 5. Estimate shipping on a phone: one search field. */
    {
      const {page,errors,context}=await open(browser);
      await page.click('[data-open="shipping"]');await page.waitForTimeout(550);
      await page.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:section-load',{detail:{sectionId:'minicart-form'}})));
      await page.waitForTimeout(60);
      assert.equal(await page.locator('#shipping .mcp').count(),1,'one picker');
      await page.tap('#shipping .mcp-trigger');await page.waitForTimeout(550);
      const searches=await page.$$eval('input[type="search"], input[type="text"]',els=>els.filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&el.closest('.mcp-panel')).length);
      assert.equal(searches,1);
      const box=await page.$eval('.mcp-search input',el=>{const s=getComputedStyle(el),l=getComputedStyle(el.parentElement);return {bg:s.backgroundColor,b:s.borderTopWidth,pad:s.paddingLeft,c:s.color,label:l.backgroundColor,h:el.getBoundingClientRect().height,lh:el.parentElement.getBoundingClientRect().height}});
      assert.deepEqual({bg:box.bg,b:box.b,pad:box.pad},{bg:'rgba(0, 0, 0, 0)',b:'0px',pad:'0px'},'no second field box inside the search');
      assert(box.h<=box.lh&&contrast(box.c,'rgb(255,255,255)')>=4.5,'search text readable: '+JSON.stringify(box));
      await page.keyboard.type('germ');
      assert(await page.$$eval('.mcp-option:not([hidden])',els=>els.some(e=>e.dataset.value==='DE')));
      assert.deepEqual(errors,[]);ok();
      await context.close();
    }

    /* 6. Sheets follow the finger 1:1; a flick closes, a small pull springs back. */
    {
      const {page,errors,context}=await open(browser);
      await page.click('[data-open="note"]');await page.waitForTimeout(600);
      const grab=await page.$eval('#note .cart-sheet__grab',el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
      const samples=[];
      await touchDrag(page,grab.x,grab.y,5,{dy:14,check:async d=>{await frame(page);samples.push({d,t:await ty(page,'#note'),tr:await page.$eval('#note',el=>getComputedStyle(el).transitionDuration),scrim:Number(await page.$eval('.cart-drawer-sheet-scrim',el=>getComputedStyle(el).opacity))});}});
      // Chromium holds back moves inside its touch slop (~15px); from then on the sheet is 1:1.
      samples.shift();
      assert(samples.every(s=>Math.abs(s.t-s.d)<=1.5&&s.tr.split(',').every(x=>x.trim()==='0s')),'1:1, no transition while held: '+JSON.stringify(samples));
      assert(samples.at(-1).scrim<samples[0].scrim,'the backdrop fades with the pull');
      await page.waitForTimeout(700);
      assert(await page.$eval('#note',el=>el.classList.contains('is-open')),'a small slow pull springs back');
      assert(Math.abs(await ty(page,'#note'))<1);
      // A quick flick from the handle closes it.
      await touchDrag(page,grab.x,grab.y,4,{dy:30,gap:8});
      await page.waitForTimeout(500);
      assert(!await page.$eval('#note',el=>el.classList.contains('is-open')),'a flick closes');
      assert.equal(await page.$eval('#note',el=>el.style.transform),'','no inline transform left behind');
      // Coupon sheet: pulled down from the body (scrolled to top) past a third closes too.
      await page.click('[data-open="coupon"]');await page.waitForTimeout(600);
      const body=await page.$eval('#coupon .addon-title',el=>{const r=el.getBoundingClientRect();return {x:r.left+20,y:r.top+r.height/2}});
      const h=await page.$eval('#coupon',el=>el.getBoundingClientRect().height);
      await touchDrag(page,body.x,body.y,Math.ceil(h*.5/20),{dy:20,gap:30});
      await page.waitForTimeout(600);
      assert(!await page.$eval('#coupon',el=>el.classList.contains('is-open')),'a long pull closes');
      assert.deepEqual(errors,[]);ok();
      await context.close();
    }

    /* 7. Free-shipping bar: a line parcel icon and a transform fill. */
    {
      const {page,store,errors,context}=await open(browser);
      const icon=await page.$eval('.cart_shipping__icon',el=>({svgs:[...el.querySelectorAll('svg')].map(s=>({cls:s.getAttribute('class'),stroke:s.getAttribute('stroke'),w:s.getAttribute('stroke-width'),fill:s.getAttribute('fill')})),truck:/circle cx="7\.5" cy="17\.25"|circle cx="16\.5"/.test(el.innerHTML)}));
      assert.equal(icon.truck,false,'no truck');
      assert(icon.svgs.length===2&&icon.svgs.every(s=>s.stroke==='currentColor'&&s.w==='1.5'&&s.fill==='none'),JSON.stringify(icon));
      const fill=await page.$eval('.cart_shipping__fill',el=>({w:el.getBoundingClientRect().width,track:el.parentElement.getBoundingClientRect().width,t:getComputedStyle(el).transform,tr:getComputedStyle(el).transitionProperty}));
      assert(Math.abs(fill.w-fill.track)<1&&fill.t!=='none'&&/transform/.test(fill.tr),'fill moves with transform: '+JSON.stringify(fill));
      const visible=()=>page.$$eval('.cart_shipping__glyph',els=>els.map(e=>Number(getComputedStyle(e).opacity)));
      assert.deepEqual(await visible(),[1,0],'parcel before free shipping');
      await page.click('#minicart__product-v1 .quantity__button[name="plus"]');
      for(let i=0;i<2;i++){await page.click('#minicart__product-v1 .quantity__button[name="plus"]');}
      await page.waitForTimeout(900);
      assert.equal(store.items.find(i=>i.key==='v1').quantity,4);
      assert.deepEqual(await visible(),[0,1],'check once reached');
      const bar=await page.$eval('.cart_shipping__fill',el=>{const r=el.getBoundingClientRect(),t=el.parentElement.getBoundingClientRect();return Math.round(r.left-t.left)});
      assert.equal(Math.abs(bar),0,'full bar');
      assert.deepEqual(errors,[]);ok();
      await context.close();
    }

    /* 8. Edit (pencil): a sheet with the current options; saving patches the row in place; errors show inline. */
    {
      const {page,store,errors,context}=await open(browser);
      await page.evaluate(()=>{window.keep={row:document.getElementById('minicart__product-v2'),form:document.getElementById('minicart-form')};});
      await page.click('#minicart__product-v1 .cart-item__variant-edit');
      await page.waitForTimeout(120);
      const opening=await page.$eval('.cart-variant-sheet',el=>({open:el.classList.contains('is-open'),t:new DOMMatrix(getComputedStyle(el).transform).m42}));
      assert(opening.open&&opening.t>0,'slides up: '+JSON.stringify(opening));
      await page.waitForTimeout(500);
      const sheet=await page.evaluate(()=>{const s=document.querySelector('.cart-variant-sheet');return {t:new DOMMatrix(getComputedStyle(s).transform).m42,inside:!!s.querySelector('cart-item-variant-switch[data-line-key="v1"]'),pressed:[...s.querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.optionValue),disabled:[...s.querySelectorAll('[aria-disabled="true"]')].map(b=>b.dataset.optionValue),title:s.querySelector('#cart-variant-sheet-title').textContent,expanded:document.querySelector('#minicart__product-v1 .cart-item__variant-edit').getAttribute('aria-expanded'),scrim:getComputedStyle(document.querySelector('.cart-drawer-sheet-scrim')).visibility}});
      assert.deepEqual(sheet,{t:0,inside:true,pressed:['S','Black'],disabled:['L'],title:'Pants Down',expanded:'true',scrim:'visible'});
      // Out of stock in the variant data: inline, no request.
      await page.click('.cart-variant-sheet [data-option-value="L"]',{force:true});
      assert.equal(await page.$eval('.cart-variant-sheet .cart-item__variant-error',el=>!el.hidden&&el.textContent),'This variant is out of stock.');
      assert.equal(store.log.filter(l=>l.kind==='add').length,0);
      // The store refuses it: inline, the line stays.
      await page.click('.cart-variant-sheet [data-option-value="XL"]');await page.waitForTimeout(400);
      assert.equal(await page.$eval('.cart-variant-sheet .cart-item__variant-error',el=>!el.hidden&&el.textContent),'This variant is sold out.');
      assert.equal(await page.locator('#minicart__product-v1').count(),1);
      // A good option: saved, row replaced in place, sheet closes.
      await page.click('.cart-variant-sheet [data-option-value="M"]');
      await page.waitForTimeout(900);
      assert.deepEqual(store.items.map(i=>i.key),['v2','v1b']);
      assert.equal(await page.locator('#minicart__product-v1').count(),0);
      assert.equal(await page.locator('#minicart__product-v1b').count(),1);
      assert(await page.evaluate(()=>keep.row===document.getElementById('minicart__product-v2')&&keep.form===document.getElementById('minicart-form')),'drawer not remounted');
      assert(!await page.$eval('.cart-variant-sheet',el=>el.classList.contains('is-open')),'sheet closes after saving');
      assert.equal(await page.locator('.cart-variant-sheet cart-item-variant-switch').count(),0,'the old editor leaves the sheet');
      // The new line's editor opens with its own options; closing puts it back in its row.
      await page.click('#minicart__product-v1b .cart-item__variant-edit');await page.waitForTimeout(500);
      assert.deepEqual(await page.$$eval('.cart-variant-sheet [aria-pressed="true"]',els=>els.map(b=>b.dataset.optionValue)),['M','Black']);
      await page.keyboard.press('Escape');await page.waitForTimeout(500);
      assert.equal(await page.locator('#minicart__product-v1b cart-item-variant-switch[hidden]').count(),1);
      assert.deepEqual(errors,[]);ok();
      await context.close();
    }
    console.log(`${passed} cart drawer checks passed (delete, recommendations, fast quantity, fields, estimate, sheet drag, shipping bar, variant sheet)`);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
