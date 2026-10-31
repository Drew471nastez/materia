const fs=require('fs'),assert=require('node:assert/strict');
const removed=['category_tabs','dropship_hero','faq_pants_down','feature_bento_grid','foundation_benefits','foundation_bento','foundation_comparison','foundation_cta','grouped_questions','help_centre_faq','storefront_hero'];
// Deleting a file does not delete a section from the site (AGENTS.md), so the
// Storelib sync of 29 October (659f669) wrote them all back. They stay
// retired: no presets, so the builder cannot add one, and no page uses them.
const reexported=removed;
for(const name of removed){const file='sections/'+name+'.storelib';if(!fs.existsSync(file))continue;assert(reexported.includes(name),name+' definition remains');const schema=JSON.parse(fs.readFileSync(file,'utf8').split('<schema>')[1].split('</schema>')[0]);assert.deepEqual((schema.shopify||schema).presets||[],[],name+' was written back with presets: it can be added again');}
let pages=0;for(const dir of ['templates','sections'])for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){const page=JSON.parse(fs.readFileSync(dir+'/'+file));for(const section of Object.values(page.sections||{}))assert(!removed.includes(section.type),dir+'/'+file+' still references '+section.type);for(const id of page.order||[])assert(page.sections[id],'Invalid order '+id);pages++;}
console.log('11 Created sections retired (files gone, or written back by Storelib with no presets); all '+pages+' page/group JSON files have no removed-type references and valid order');
