const assert=require('assert/strict');
const {schemaOf,launch,mount}=require('./media-fixture.cjs');
(async()=>{
 const name='before-and-after-slider',{schema}=schemaOf(name);
 assert(!schema.settings.some(s=>['headline','content'].includes(s.id)),'no duplicate section-level heading/text controls');
 for(const preset of schema.presets)for(const type of ['heading','subheading'])assert(preset.blocks.some(b=>b.type===type),'new sections include '+type);
 for(const type of ['heading','subheading'])assert(schema.blocks.find(b=>b.type===type).settings.some(s=>s.id==='text'&&/richtext/.test(s.type)),'rich-text editor remains in '+type+' block');
 let checks=5;const browser=await launch();
 try{for(const width of [375,1366])for(const editing of [true,false]){
  const t=await mount(browser,name,{width,editing,assets:['media-live-before-after.js'],settings:{headline:'Old heading',content:'<p>Old text</p>'}});
  assert.equal(await t.root('.bas__heading').count(),1);assert.equal(await t.root('.bas__content').count(),1);
  assert.equal(await t.root('[data-bam-text="headline"]').count(),0);assert.equal(await t.root('[data-bam-text="content"]').count(),0);checks+=4;
  await t.emit({text:'<strong>Edited heading</strong>'},t.blockId('heading'));await t.emit({text:'<p>Edited text</p>'},t.blockId('subheading'));
  assert.equal(await t.root('.bas__heading').textContent(),'Edited heading');assert.equal(await t.root('.bas__content').textContent(),'Edited text');checks+=2;
  await t.redraw({blocks:[{type:'heading',settings:{text:'Saved heading'}},{type:'subheading',settings:{text:'<p>Saved text</p>'}}]});
  assert.equal(await t.root('.bas__heading').textContent(),'Saved heading');assert.equal(await t.root('.bas__content').textContent(),'Saved text');assert(await t.noOverflow());assert.deepEqual(t.errors,[]);checks+=4;
  await t.page.close();
 }console.log(checks+' block-only content schema, default blocks, editing and redraw checks passed');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
