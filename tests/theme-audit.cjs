const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sections = fs.readdirSync(path.join(root, 'sections')).filter(f=>f.endsWith('.storelib')).sort();
const batch = sections.filter(f=>f>'custom-html.storelib').slice(0,30);
assert.equal(batch.length,30);
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
  assert(text.includes('theme-type') || text.includes('--theme-font') || text.includes('--heading-font'),file+' shared typography');
}
for(const file of ['main-product.storelib','featured-product.storelib']) {
  const text=fs.readFileSync(path.join(root,'sections',file),'utf8');
  const model=JSON.parse(text.match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]).shopify;
  const block=model.blocks.find(b=>b.type==='buy_buttons');
  for(const id of ['atc_appearance','buy_appearance'])assert(block.settings.some(s=>s.id===id),file+' '+id);
}
console.log(`${schemas} schemas parsed; ${blocks} block definitions parsed; 30 batch schemas checked for unique IDs and shared typography`);
console.log('Batch: '+batch.join(', '));
console.log('Running audit count: 160/212; 52 remaining. Runtime tests cover shared interactions, not every setting in a live Storelib renderer.');
