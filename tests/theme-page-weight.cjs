/* Page weight and theme-owned settings: repository fixtures, not a live measurement. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
  let passed=0;
  const layout=read('layout/theme.storelib');
  // Builder-only pieces stay out of a visitor's page.
  assert.match(layout,/\{%- if request\.design_mode -%\}\s*\{%- section 'cart-drawer-live' -%\}\s*\{%- endif -%\}/);
  assert.match(layout,/\{%- if request\.design_mode -%\}\{% render 'theme-live' %\}\{%- endif -%\}/);passed++;
  // Cart add-on styles: once per drawer, not once per slot.
  const addons=read('snippets/cart-drawer-addons.storelib');
  assert(addons.indexOf("{%- if current_slot == 'styles' -%}")<addons.indexOf('<style data-cda-styles>'));
  assert.equal((read('snippets/minicart-form-body.storelib').match(/slot: 'styles'/g)||[]).length,1);passed++;
  // Countries: written once by the layout, never by a selector.
  assert(!read('snippets/country-switcher.storelib').includes('available_countries %}'));
  assert.equal((layout.match(/render 'country-options'/g)||[]).length,1);passed++;
  // The theme's navigation does not repeat the platform's rules or page fade.
  const speed=read('snippets/speed-optimization.storelib');
  assert(!speed.includes('type="speculationrules"')&&!speed.includes('@view-transition'));passed++;

  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Storelib's own hover sheet is set aside; the theme's transition stays.
    const release=layout.slice(layout.indexOf("function release()")-30,layout.indexOf("})();",layout.indexOf("function release()"))+5);
    await page.setContent(`<style>.btn{transition:color 275ms}</style><style data-storelib-overrides>.btn{transition:none!important}</style><button class="btn">Buy</button><script>${release.replace(/^[^(]*/,'')}</script>`);
    assert.equal(await page.$eval('.btn',el=>getComputedStyle(el).transitionDuration),'0.275s');
    await page.evaluate(()=>{document.querySelector('[data-storelib-overrides]').removeAttribute('media');document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{}}}));});
    await page.waitForTimeout(200);
    assert.equal(await page.$eval('.btn',el=>getComputedStyle(el).transitionDuration),'0.275s','still released after a builder change');passed++;

    // A country selector fills from the shared list on first open and submits the pick.
    const theme=read('shopify/assets/theme.js');
    const cls=theme.slice(theme.indexOf('class LocalizationForm'),theme.indexOf('customElements.define("localization-form", LocalizationForm);')+'customElements.define("localization-form", LocalizationForm);'.length);
    const picker=id=>`<localization-form id="${id}"><form><input type="hidden" name="country_code" value="BR"><div class="disclosure"><button type="button" class="button-localization">BR</button><div class="disclosure__list"><ul data-country-options></ul></div></div></form></localization-form>`;
    const items=['AD','BR','RO','US','GB','DE','FR'].map(c=>`<li class="disclosure__item"><a href="#" data-value="${c}"${c==='BR'?' aria-current="true"':''}>${c}</a></li>`).join('');
    await page.setViewportSize({width:1280,height:800});
    await page.setContent(`${picker('a')}${picker('b')}<template id="materia-country-options">${items}</template>`);
    await page.addScriptTag({content:cls});
    await page.waitForTimeout(30);
    assert.equal(await page.locator('#a li, #b li').count(),0,'nothing is copied before a selector opens');
    await page.click('#a .button-localization');
    assert.equal(await page.locator('#a li').count(),7);
    assert.equal(await page.locator('#b li').count(),0);
    assert.equal(await page.locator('#a .loc-sheet-search input').count(),1,'search is built for the copied list');
    await page.evaluate(()=>{window.submitted=null;document.querySelector('#a form').submit=function(){window.submitted=this.country_code.value;};});
    await page.click('#a a[data-value="RO"]');
    assert.equal(await page.evaluate(()=>window.submitted),'RO');passed++;
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
  console.log(`${passed} page weight and theme-owned setting checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
