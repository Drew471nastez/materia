/* Brand info (Logos and trust, round 4): shared sweep plus the section's own
   custom typography under the real theme priority rules. */
const {run, FONT} = require('./theme-logos-r4-lib.cjs');
run({
  name: 'brand-info', bp: 769, heading: '.bi-heading', text: '.bi-paragraph p',
  blockTypes: ['eyebrow', 'heading', 'paragraph', 'link', 'divider', 'spacer'],
  addType: 'eyebrow',
  hover: {custom_link_hover_color: '.bi-link a', 'link.custom_color_hover': '.bi-link a'},
  addedEdit: {settings: {text: 'Added eyebrow', use_custom_color: true, custom_color: '#00ff00'}, check: async (t, id, {eq}) => { eq(await t.page.locator('[data-lg-block="' + id + '"]').textContent(), 'Added eyebrow'); eq(await t.page.locator('[data-lg-block="' + id + '"]').evaluate(el => getComputedStyle(el).color), 'rgb(0, 255, 0)'); return 0; }},
  async extra({browser, mount, eq, ok}) {
    let n = 0;
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await mount(browser, 'brand-info', {width, editing, assets: ['live-logos.js'], blocks: [{type: 'heading', settings: {column: 'left', text: 'Our <strong>story</strong>'}}, {type: 'paragraph', settings: {column: 'right', text: '<p>First <em>line</em></p>'}}, {type: 'link', settings: {column: 'right', text: 'About', url: '/pages/about'}}]});
      const where = 'brand-info ' + width + (editing ? ' editor' : ' storefront');
      const h = t.blockId('heading'), p = t.blockId('paragraph'), l = t.blockId('link');
      const fam = sel => t.page.locator(sel).first().evaluate(el => getComputedStyle(el).fontFamily);
      const sty = (sel, k) => t.page.locator(sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      for (const mode of ['live', 'redraw']) {
        const apply = async (sec, blk) => { if (mode === 'live') { if (sec) await t.emit(sec); for (const [id, v] of blk || []) await t.emit(v, id); await t.page.waitForTimeout(40); } else { const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...((blk || []).find(([id]) => id === b.id) || [, {}])[1]}})); await t.redraw({settings: sec || {}, blocks}); } };
        await apply({override_fonts: true, heading_font: FONT, body_font: FONT, heading_letter_spacing: 3}, [[h, {font_weight: '300', text_transform: 'uppercase'}]]);
        ok(/Courier New/.test(await fam('.bi-heading')), where + ' ' + mode + ' custom heading font wins');
        ok(/Courier New/.test(await fam('.bi-heading strong')), where + ' ' + mode + ' custom heading font reaches a <strong>');
        ok(/Courier New/.test(await fam('.bi-paragraph p')), where + ' ' + mode + ' custom body font reaches the <p>');
        eq(await sty('.bi-heading', 'fontWeight'), '300', where + ' ' + mode + ' custom heading weight wins');
        eq(await sty('.bi-heading', 'letterSpacing'), '3px', where + ' ' + mode + ' heading letter spacing wins');
        eq(await sty('.bi-heading', 'textTransform'), 'uppercase', where + ' ' + mode + ' heading letter case');
        await apply({override_fonts: false, heading_letter_spacing: 0}, [[h, {font_weight: 'theme', text_transform: 'none'}]]);
        ok(/Georgia/.test(await fam('.bi-heading')) && /Georgia/.test(await fam('.bi-heading strong')), where + ' ' + mode + ' theme heading font back');
        ok(/Arial/.test(await fam('.bi-paragraph p')), where + ' ' + mode + ' theme body font back');
        eq(await sty('.bi-heading', 'fontWeight'), '700', where + ' ' + mode + ' theme heading weight back');
        eq(await sty('.bi-heading', 'textTransform'), 'none', where + ' ' + mode + ' theme letter case back');
        n += 0;
      }
      /* custom colours on/off, link hover, column move */
      await t.emit({override_colors: true, custom_background_color: '#112233', custom_heading_color: '#ff0000', custom_text_color: '#00ff00', custom_link_color: '#0000ff', custom_rule_color: '#ffff00'});
      eq(await sty('[data-lg-root]', 'backgroundColor'), 'rgb(17, 34, 51)', where + ' custom background');
      eq(await sty('.bi-heading', 'color'), 'rgb(255, 0, 0)', where + ' custom heading colour');
      eq(await sty('.bi-paragraph p', 'color'), 'rgb(0, 255, 0)', where + ' custom text colour reaches the <p>');
      eq(await sty('.bi-link a', 'color'), 'rgb(0, 0, 255)', where + ' custom link colour');
      await t.emit({override_colors: false});
      eq(await sty('[data-lg-root]', 'backgroundColor'), 'rgb(24, 32, 40)', where + ' theme background back');
      eq(await sty('.bi-heading', 'color'), 'rgb(255, 255, 255)', where + ' theme heading back');
      await t.emit({use_custom_color: true, custom_color: '#ffff00', custom_color_hover: '#ff00ff'}, l);
      if (!editing && width === 1366) { await t.page.locator('.bi-link a').hover(); await t.page.waitForTimeout(260); eq(await sty('.bi-link a', 'color'), 'rgb(255, 0, 255)', where + ' link hover colour'); }
      eq(await t.page.locator('.bi-link a').getAttribute('href'), '/pages/about', where + ' link href');
      await t.emit({column: 'left'}, p);
      eq(await t.page.locator('[data-lg-col="left"] [data-lg-block="' + p + '"]').count(), 1, where + ' paragraph moves to the left column live');
      eq(await t.page.locator('[data-lg-col="left"] > *').evaluateAll(els => els.map(e => e.dataset.lgType)), ['heading', 'paragraph'], where + ' blocks keep their saved order in a column');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    return n;
  },
}).catch(e => { console.error(e); process.exit(1); });
