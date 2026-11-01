/* LIQUIDJS=<path> node tests/theme-testimonials-r4-quote.cjs
   Testimonial Quote Block (sections/testimonial2) under the real theme
   priority rules (snippets/theme-controls, as every page prints them): the
   heading and description blocks' own font, weight, letter spacing and case,
   and the button's own corners, win at 375 and 1366 in the editor and on the
   storefront, after a redraw and after a live edit, on the element and on a
   descendant; switched off, the theme values come back. The section's own
   tests (theme-testimonial-quote*.cjs) cover the rest. */
const {launch, mount, schemaProblems} = require('./media-fixture.cjs');
const ASSETS = ['testimonial-quote.css', 'testimonial-quote.js'];
const blocks = [
  {type: 'heading', settings: {heading: 'What customers say'}},
  {type: 'description', settings: {description: '<p>Quotes from <strong>buyers</strong>.</p>'}},
  {type: 'testimonial', settings: {testimonial_text: 'First quote', author_name: 'First buyer', stars_rating: 4.5}},
  {type: 'testimonial', settings: {testimonial_text: 'Second quote', author_name: 'Second buyer', stars_rating: 5}},
];
const HEAD_ON = {enable_custom_style: true, font_source: 'body', heading_style: 'light', letter_spacing: 2, text_case: 'uppercase'};
const DESC_ON = {enable_custom_style: true, font_source: 'heading', letter_spacing: 3, text_case: 'uppercase'};
(async () => {
  let checks = 0;
  const fails = [];
  const ok = (c, m) => { if (c) checks++; else { fails.push(m); console.log('FAIL ' + m); } };
  ok(schemaProblems('testimonial2').length === 0, 'schema ' + schemaProblems('testimonial2'));
  const browser = await launch();
  try {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const tag = 'testimonial2@' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'testimonial2', {width, editing, blocks, assets: ASSETS, settings: {button_label: 'Read all reviews', button_link: '/pages/reviews'}});
      const st = (sel, p) => t.css(sel, p);
      const read = async () => ({hf: await st('.tq-heading', 'fontFamily'), hw: await st('.tq-heading', 'fontWeight'), hl: await st('.tq-heading', 'letterSpacing'), ht: await st('.tq-heading', 'textTransform'), df: await st('.tq-description p', 'fontFamily'), ds: await st('.tq-description strong', 'fontFamily'), dl: await st('.tq-description p', 'letterSpacing'), dt: await st('.tq-description p', 'textTransform')});
      const theme = await read();
      ok(/Georgia/.test(theme.hf) && /Arial/.test(theme.df), tag + ': theme fonts first ' + JSON.stringify(theme));
      const want = v => /Arial/.test(v.hf) && v.hw === '300' && v.hl === '2px' && v.ht === 'uppercase' && /Georgia/.test(v.df) && /Georgia/.test(v.ds) && v.dl === '3px' && v.dt === 'uppercase';
      /* live */
      await t.emit(HEAD_ON, t.blockId('heading')); await t.emit(DESC_ON, t.blockId('description'));
      await t.page.waitForTimeout(60);
      const live = await read();
      ok(want(live), tag + ' live: block typography wins over the theme ' + JSON.stringify(live));
      await t.emit({enable_custom_style: false}, t.blockId('heading')); await t.emit({enable_custom_style: false}, t.blockId('description'));
      await t.page.waitForTimeout(60);
      const back = await read();
      ok(JSON.stringify(back) === JSON.stringify(theme), tag + ' live: off brings the theme back ' + JSON.stringify(back));
      /* redraw */
      const r = t.rendered[0];
      const with_ = (h, d) => r.section.blocks.map(b => ({type: b.type, settings: b.type === 'heading' ? {...b.settings, ...h} : b.type === 'description' ? {...b.settings, ...d} : b.settings}));
      if (editing) {
        await t.redraw({blocks: with_(HEAD_ON, DESC_ON)});
        const red = await read();
        ok(want(red), tag + ' redraw: block typography wins over the theme ' + JSON.stringify(red));
        await t.redraw({blocks: with_({enable_custom_style: false}, {enable_custom_style: false})});
        ok(JSON.stringify(await read()) === JSON.stringify(theme), tag + ' redraw: off brings the theme back');
      }
      /* the button's own corners and the theme's */
      ok(await st('.tq-button', 'borderTopLeftRadius') === '5px' || await st('.tq-button', 'borderTopLeftRadius') === '12px', tag + ': theme button corners ' + await st('.tq-button', 'borderTopLeftRadius'));
      await t.emit({use_theme_button: false, button_corner: 24}); await t.page.waitForTimeout(60);
      ok(await st('.tq-button', 'borderTopLeftRadius') === '24px', tag + ' live: own button corners win ' + await st('.tq-button', 'borderTopLeftRadius'));
      await t.emit({use_theme_button: true}); await t.page.waitForTimeout(60);
      ok(await st('.tq-button', 'borderTopLeftRadius') !== '24px', tag + ' live: theme button corners back');
      ok(await t.noOverflow(), tag + ': no sideways scroll');
      ok(t.errors.length === 0, tag + ': no errors ' + t.errors.join(' | '));
      await t.page.close();
    }
    /* priority off: the theme values still come through */
    const t = await mount(browser, 'testimonial2', {width: 1366, blocks, assets: ASSETS, priority: 'off'});
    ok(/Georgia/.test(await t.css('.tq-heading', 'fontFamily')) && /Arial/.test(await t.css('.tq-description p', 'fontFamily')), 'priority off: theme fonts');
    await t.page.close();
  } finally { await browser.close(); }
  if (fails.length) { console.error(fails.length + ' failed'); process.exitCode = 1; return; }
  console.log(checks + ' Testimonial Quote Block theme priority checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
