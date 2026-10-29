const fs=require('fs'),assert=require('node:assert/strict');
const removed=['category_tabs','dropship_hero','faq_pants_down','feature_bento_grid','foundation_benefits','foundation_bento','foundation_comparison','foundation_cta','grouped_questions','help_centre_faq','storefront_hero'];
for(const name of removed)assert(!fs.existsSync('sections/'+name+'.storelib'),name+' definition remains');
let pages=0;for(const dir of ['templates','sections'])for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){const page=JSON.parse(fs.readFileSync(dir+'/'+file));for(const section of Object.values(page.sections||{}))assert(!removed.includes(section.type),dir+'/'+file+' still references '+section.type);for(const id of page.order||[])assert(page.sections[id],'Invalid order '+id);pages++;}
console.log('11 Created section files removed; all '+pages+' page/group JSON files have no removed-type references and valid order');
