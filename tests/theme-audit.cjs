const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sections = fs.readdirSync(path.join(root, 'sections')).filter(f=>f.endsWith('.storelib')).sort();
const ledger = require('./theme-review-ledger.json');
const batch = ledger.current;
assert.equal(batch.length,22);
assert.equal(new Set([...ledger.previous,...batch,...ledger.remaining]).size,sections.length);
assert(batch.every(file=>!ledger.previous.includes(file)),'batch must contain 22 previously unaudited sections');
let schemas=0, blocks=0;
for (const folder of ['sections','blocks','snippets','layout']) {
  if (!fs.existsSync(path.join(root,folder))) continue;
  for (const file of fs.readdirSync(path.join(root,folder)).filter(f=>f.endsWith('.storelib'))) {
    const text=fs.readFileSync(path.join(root,folder,file),'utf8');
    assert(/^<template(?: compat="shopify")?>/.test(text),file+' template header');
    assert(text.includes('</template>'),file+' template close');
    const match=text.match(/<schema>\s*([\s\S]*?)\s*<\/schema>/);
    if(match) {const schema=JSON.parse(match[1]);schemas++;blocks+=(schema.shopify||schema).blocks?.length||0;}
  }
}
for(const file of batch) {
  const text=fs.readFileSync(path.join(root,'sections',file),'utf8');
  assert(!/<(?:div|section)\b[^>]*\bdata-theme-button=/.test(text),file+' button contract attached to a layout container');
  const schema=JSON.parse(text.match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]);
  const model=schema.shopify||schema;
  for(const settings of [model.settings,...(model.blocks||[]).map(b=>b.settings)].filter(Boolean)) {
    const ids=settings.map(s=>s.id).filter(Boolean);
    assert.equal(new Set(ids).size,ids.length,file+' duplicate setting IDs');
  }
  const markup=text.split('</template>')[0];
  assert(markup.includes('theme-type') || markup.includes('--theme-font') || markup.includes('--heading-font'),file+' shared typography inside template');
}
for(const file of ['main-product.storelib','featured-product.storelib']) {
  const text=fs.readFileSync(path.join(root,'sections',file),'utf8');
  const model=JSON.parse(text.match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]).shopify;
  const block=model.blocks.find(b=>b.type==='buy_buttons');
  for(const id of ['atc_appearance','buy_appearance'])assert(block.settings.some(s=>s.id===id),file+' '+id);
}
console.log(`${schemas} schemas parsed; ${blocks} block definitions parsed; ${batch.length} batch schemas checked for unique IDs and shared typography`);
console.log('Batch: '+batch.join(', '));
console.log(`Running audit count: ${ledger.previous.length+batch.length}/${sections.length}; ${ledger.remaining.length} remaining. Runtime tests cover shared interactions, not every setting in a live Storelib renderer.`);
