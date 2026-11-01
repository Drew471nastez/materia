/* LIQUIDJS=<path> node tests/theme-testimonials-r4-saved.cjs
   The saved testimonials instances keep their look: templates/home.json
   testimonial_video_kkyBQe and testimonials_mmxQjq, templates/product.json
   testimonial_video_TLf6Jb and testimonials_WHJXwN are drawn from the
   section file at R4_BASE (default 4b0142b, before round 4) and from the working file, with
   their saved settings and blocks, at 375 and 1366, and compared pixel for
   pixel (with the real theme priority rules). Products in the saved blocks
   are drawn with the fixture's sample product. */
const fs = require('fs'), path = require('path'), {execFileSync} = require('node:child_process');
const BASE = process.env.R4_BASE || '4b0142b'; // the last commit before round 4 changed these sections
const realRead = fs.readFileSync;
fs.readFileSync = function (f, ...rest) {
  const m = String(f).match(/sections\/__base__(.+)\.storelib$/);
  if (m) return execFileSync('git', ['show', BASE + ':sections/' + m[1] + '.storelib'], {encoding: 'utf8', cwd: path.join(__dirname, '..'), maxBuffer: 1 << 26});
  return realRead.call(this, f, ...rest);
};
const {launch, mount, PANTS} = require('./media-fixture.cjs');
const read = f => realRead(path.join(__dirname, '..', f), 'utf8');
const SAVED = [['templates/home.json', 'testimonial_video_kkyBQe'], ['templates/product.json', 'testimonial_video_TLf6Jb'], ['templates/home.json', 'testimonials_mmxQjq'], ['templates/product.json', 'testimonials_WHJXwN']];
const ASSETS = {'testimonial-video': ['live-testimonials.js'], testimonials: ['testimonials.css', 'live-testimonials.js']};
(async () => {
  let checks = 0;
  const fails = [];
  const browser = await launch();
  try {
    for (const [file, key] of SAVED) {
      const sec = JSON.parse(read(file)).sections[key];
      const blocks = sec.block_order.map(id => ({type: sec.blocks[id].type, settings: {...sec.blocks[id].settings, ...(sec.blocks[id].settings.product ? {product: PANTS} : {})}}));
      for (const width of [375, 1366]) {
        const shots = [];
        for (const name of ['__base__' + sec.type, sec.type]) {
          const t = await mount(browser, name, {width, editing: false, settings: sec.settings, blocks, assets: ASSETS[sec.type], globals: {product: PANTS}});
          await t.page.evaluate(() => { for (const v of document.querySelectorAll('video')) v.remove(); document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }); });
          await t.page.waitForTimeout(300);
          await t.page.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0; } });
          shots.push(await t.page.screenshot({fullPage: true, animations: 'disabled', caret: 'hide'}));
          if (t.errors.length) fails.push(key + '@' + width + ' ' + name + ' errors: ' + t.errors.join(' | '));
          await t.page.close();
        }
        if (shots[0].equals(shots[1])) checks++;
        else { fails.push(key + '@' + width + ': looks different from ' + BASE); fs.writeFileSync(path.join(process.env.R4_SHOTS || require('os').tmpdir(), key + '-' + width + '-base.png'), shots[0]); fs.writeFileSync(path.join(process.env.R4_SHOTS || require('os').tmpdir(), key + '-' + width + '-now.png'), shots[1]); }
      }
    }
  } finally { await browser.close(); }
  for (const f of fails) console.log('FAIL ' + f);
  if (fails.length) { console.error(fails.length + ' saved instance checks failed'); process.exitCode = 1; return; }
  console.log(checks + ' saved testimonials instances look the same as ' + BASE + ' at 375 and 1366');
})().catch(e => { console.error(e); process.exitCode = 1; });
