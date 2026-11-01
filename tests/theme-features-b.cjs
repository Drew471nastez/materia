/* The features-b sections: Comparison Table, Comparison Table 2, Comparison
   Table 3, Comparison Table 4 (comparisons-table), Comparison Cards and Text
   Comparisons. Checks in tests/theme-features-b-lib.cjs; the saved Comparison
   Table on templates/home-new.json is compared with the section as committed
   before this change. Custom fonts, weights and sizes under the real theme
   priority rules: tests/theme-features-b-priority.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-features-b.cjs [section ...] */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const {run, IMG, presetBlocks, clone} = require('./theme-features-b-lib.cjs');
const {schemaOf, THEME_VARS, themeControls} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');

const CT = {
  name: 'comparison-table', bp: 768, heading: '.fbct__title', text: '.fbct__sub',
  blocks: () => [...presetBlocks('comparison-table'), {type: 'column', settings: {title: 'Third'}}],
  /* padding_top/bottom are 0.75x on a phone; the column sizes only matter where they apply */
  both: ['padding_top', 'padding_bottom', 'table_mt'],
  desk: ['padding_horizontal', 'table_icon_size', 'table_heading_size', 'table_row_heading_size', 'table_heading_padding_vertical', 'table_heading_padding_horizontal', 'table_row_padding_vertical', 'table_row_padding_horizontal', 'heading.size', 'subheading.size', 'subheading.padding_x'],
  mob: ['padding_horizontal_mobile', 'table_icon_size_mobile', 'table_heading_size_mobile', 'table_row_heading_size_mobile', 'table_heading_padding_vertical_mobile', 'table_heading_padding_horizontal_mobile', 'table_row_padding_vertical_mobile', 'table_row_padding_horizontal_mobile', 'heading.size_mobile', 'subheading.size_mobile', 'subheading.padding_x_mobile'],
  pre: {content_width: {content_width: 60}},
  values: {content_width: [40]},
  /* the fixture's theme heading weight is 700, so Theme and Bold draw alike */
  same: [['heading.weight', 'theme', 'bold'], ['column.weight', 'theme', 'bold']],
  /* a row's column icons draw in the cells, which belong to the row block */
  themeProbes: [['.fbct__ct', 'fontFamily', 'Georgia'], ['.fbct__rl', 'color', 'rgb(255, 255, 255)'], ['.fbct__col[data-col="1"]', 'backgroundImage', 'linear-gradient(315deg, rgb(18, 52, 86), rgb(18, 52, 86), rgb(18, 52, 86))']],
  customProbes: [['.fbct__col[data-col="1"]', 'backgroundImage', 'linear-gradient(315deg, rgb(161, 178, 195), rgb(161, 178, 195), rgb(161, 178, 195))'], ['.fbct__rl', 'color', 'rgb(161, 178, 195)'], ['.fbct__table td[data-col="2"]', 'borderTopColor', 'rgb(161, 178, 195)']],
  blockColourProbes: [['heading', '.fbct__title', 'color'], ['subheading', '.fbct__sub', 'color'], ['column', '.fbct__ct', 'color']],
  edit: {padding_top: 20, table_radius: 30, table_column_active: '2'},
  textEdit: ['item', 'row_heading', '.fbct__rl'],
  imgBlocks: b => b.map(x => x.type === 'column' ? {...x, settings: {...x.settings, image: IMG}} : x),
  imgSel: '.fbct__logo',
  unrelated: {table_radius: 4, padding_bottom: 10, table_column_active: '3'},
  scrollers: 1,
  added: [{type: 'item', settings: {row_heading: 'Added row'}}],
  addedCheck: [' .fbct__rl', 'row_heading', 'Added row'],
  table: {scroll: '.fbct__scroll', label: 'tbody .fbct__label', check: 'tbody tr:nth-child(1) td[data-col="2"] .fbct__mark', cross: 'tbody tr:nth-child(3) td[data-col="2"] .fbct__mark', highlight: ['tbody td[data-col="1"]', 'tbody td[data-col="2"]'],
    wide: () => [...presetBlocks('comparison-table'), {type: 'column', settings: {title: 'A much longer third column title'}}].map(b => b.type === 'item' ? {...b, settings: {...b.settings, row_heading: b.settings.row_heading + ' with a long label'}} : b)},
};

/* The saved Comparison Table (templates/home-new.json) against the section as last committed before this change. */
async function savedComparisonTable(browser, {ok, eq}) {
  const name = 'comparison-table', key = 'comparison-table-1eecb1d1bb';
  let oldRaw; try { oldRaw = execSync('git show e03ef3051f969105d301665d0243d326aa3a98dc:sections/' + name + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'}); } catch (_) { return; }
  const sec = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/home-new.json'), 'utf8')).sections[key];
  const fill = (raw, s, toggles) => {
    const schema = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify;
    const d = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
    const settings = {...d(schema.settings), ...s.settings, ...(toggles ? {enable_custom_style: true} : {})};
    const blocks = s.block_order.map(k => ({id: k, type: s.blocks[k].type, settings: {...d((schema.blocks.find(b => b.type === s.blocks[k].type) || {}).settings), ...s.blocks[k].settings, ...(toggles ? {enable_custom_style: true} : {})}}));
    return {id: 'S', settings, blocks};
  };
  const renderRaw = async (raw, section) => {
    const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v?.url || v || '');
    const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}};
    const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
    return (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '');
  };
  const newRaw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8');
  const controls = await themeControls();
  for (const width of [375, 1366]) {
    const look = async (html, shot) => {
      const page = await browser.newPage({viewport: {width, height: 900}});
      await page.route('**/*', r => r.fulfill({body: r.request().url() === 'http://theme.test/' ? '<!doctype html><html><head></head><body></body></html>' : '', contentType: 'text/html'}));
      await page.goto('http://theme.test/');
      await page.addStyleTag({content: controls}); await page.addStyleTag({content: THEME_VARS});
      for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css']) await page.addStyleTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8')});
      await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, html);
      await page.waitForTimeout(50);
      const r = await page.evaluate(() => {
        const W = document.getElementById('shopify-section-S'), all = s => [...W.querySelectorAll(s)];
        const h2 = W.querySelector('h2'), sub = W.querySelector('[class*="subheading"], .fbct__sub');
        const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
        /* row labels, column titles and the highlighted column's fill, in reading order */
        const labels = all('h3, .fbct__rl, .fbct__ct').map(e => [e.textContent.trim(), cs(e, 'color')]).filter(x => x[0]);
        const active = all('.active, .fbct__table [data-col="1"]').map(e => cs(e, 'backgroundColor'));
        return {h: [h2.textContent.trim(), cs(h2, 'color'), cs(h2, 'fontSize'), cs(h2, 'textAlign')], sub: [sub.textContent.trim(), cs(sub, 'color'), cs(sub, 'fontSize')], labels, fill: [...new Set(active)], h2y: Math.round(h2.getBoundingClientRect().top)};
      });
      if (shot) await page.screenshot({path: shot, fullPage: true}).catch(() => {});
      await page.close();
      return r;
    };
    const dir = process.env.FB_SHOTS;
    const was = await look(await renderRaw(oldRaw, fill(oldRaw, sec, false)), dir && path.join(dir, 'saved-ct-old-' + width + '.png'));
    const now = await look(await renderRaw(newRaw, fill(newRaw, sec, true)), dir && path.join(dir, 'saved-ct-new-' + width + '.png'));
    const plain = await look(await renderRaw(newRaw, fill(newRaw, sec, false)));
    eq(now.h[0], was.h[0], width + ' saved heading text');
    eq(now.sub, was.sub, width + ' saved subheading text, colour and size');
    eq([now.h[2], now.h[3]], [was.h[2], was.h[3]], width + ' saved heading size and alignment');
    /* the old section painted the section heading_color (#212121) over the block colour (#000); the block colour now wins */
    eq(now.h[1], 'rgb(0, 0, 0)', width + ' saved heading takes its block colour');
    eq(now.labels.map(x => x[0]).sort(), was.labels.map(x => x[0]).sort(), width + ' saved column titles and rows');
    eq(now.labels.filter(x => /results|Black|S, M|130|Secure|minute|andrewrullz/.test(x[0])).map(x => x[1]), was.labels.filter(x => /results|Black|S, M|130|Secure|minute|andrewrullz/.test(x[0])).map(x => x[1]), width + ' saved row label colours');
    /* the saved "enable_active_column_gradient": "" is the switch turned off; the old Liquid read the empty
       string as on and painted the default gradient over the chosen #162746, which now shows */
    ok(now.fill.includes('rgb(22, 39, 70)'), width + ' saved highlight colour #162746 (new ' + now.fill + ')');
    ok(plain.fill.join() !== now.fill.join(), width + ' without the custom styling toggle the highlight follows the theme (so the toggle is needed)');
  }
}

const CT2 = {
  name: 'comparison-table-2', bp: 768, heading: '.fbt2__heading', text: '.fbt2__sub',
  /* eight rows, so every column value 1 to 8 has a row */
  blocks: () => { const b = presetBlocks('comparison-table-2'), i = b.findIndex(x => x.type === 'column'); b.splice(i, 0, ...[6, 7, 8].map(n => ({type: 'row', settings: {label: 'Row ' + n}}))); return b; },
  same: [['show_section_on', 'all', 'desktop'], ['show_section_on', 'all', 'mobile'], ['col_title_weight', 'theme', '700'], ['heading.weight', 'theme', '700']],
  themeProbes: [['.fbt2__ct', 'fontFamily', 'Georgia'], ['tbody .fbt2__label', 'color', 'rgb(255, 255, 255)'], ['tbody td[data-highlight="true"] .fbt2__ok', 'color', 'rgb(51, 102, 153)']],
  customProbes: [['tbody td[data-highlight="false"]', 'backgroundColor', 'rgb(161, 178, 195)'], ['tbody .fbt2__label', 'color', 'rgb(161, 178, 195)'], ['.fbt2__ct', 'color', 'rgb(161, 178, 195)']],
  blockColourProbes: [['heading', '.fbt2__heading', 'color'], ['subheading', '.fbt2__sub', 'color']],
  edit: {padding_top_mobile: 12, padding_top_desktop: 12, col_radius: 2},
  textEdit: ['row', 'label', 'tbody .fbt2__label'],
  imgBlocks: b => b.map(x => x.type === 'column' ? {...x, settings: {...x.settings, image: IMG}} : x),
  imgSel: '.fbt2__img',
  unrelated: {col_radius: 30, cell_size: 20, padding_bottom_mobile: 6},
  scrollers: 1,
  added: [{type: 'row', settings: {label: 'Added row'}}],
  addedCheck: ['', 'label', 'Added row'],
  table: {scroll: '.fbt2__scroll', label: 'tbody .fbt2__label', progress: '.fbt2__progress', check: 'tbody tr:nth-child(3) td:nth-of-type(1) .fbt2__v', cross: 'tbody tr:nth-child(3) td:nth-of-type(2) .fbt2__v', highlight: ['tbody tr:nth-child(1) td:nth-of-type(1)', 'tbody tr:nth-child(1) td:nth-of-type(2)']},
};

const CT3 = {
  name: 'comparison-table-3', bp: 768, heading: '.fbt3__heading', text: '.fbt3__sub',
  blocks: () => [...presetBlocks('comparison-table-3'), {type: 'rating', settings: {text: 'Rated 4 of 5'}}],
  same: [['show_section_on', 'all', 'desktop'], ['show_section_on', 'all', 'mobile'], ['col_title_weight', 'theme', '700'], ['heading.weight', 'theme', '700']],
  /* the floating picture's controls need a picture; svg code is drawn on the builder's redraw */
  pre: {'col_a.image_size_desktop': {image: IMG}, 'col_a.image_size_mobile': {image: IMG}, 'col_a.image_rotate_desktop': {image: IMG}, 'col_a.image_rotate_mobile': {image: IMG}, 'col_a.image_offset_desktop': {image: IMG}, 'col_a.image_offset_mobile': {image: IMG}},
  structural: ['row.svg_a', 'row.svg_b'],
  /* column A is narrow on a phone, so a smaller picture shows the change */
  values: {'col_a.image_size_mobile': [40]},
  desk: ['content_align', 'left_col_fr', 'right_col_fr'],
  both: ['section_max_width_desktop'],
  /* column A paints the whole column (the table carries its values) */
  /* row values on column B's side sit in cells that carry column B's colour */
  blockElsewhere: ['col_a.radius', 'col_a.bg', 'col_a.text_color', 'row.type_b', 'row.text_b', 'row.image_b', 'row.svg_b'],
  themeProbes: [['.fbt3__colhead--a', 'fontFamily', 'Georgia'], ['tbody .fbt3__label', 'color', 'rgb(255, 255, 255)'], ['tbody .fbt3__a', 'backgroundColor', 'rgb(18, 52, 86)'], ['tbody .fbt3__b', 'color', 'rgb(204, 204, 204)']],
  customProbes: [['tbody .fbt3__label', 'color', 'rgb(161, 178, 195)'], ['tbody .fbt3__b', 'color', 'rgb(161, 178, 195)'], ['.fbt3__i--check-circle', 'backgroundColor', 'rgb(161, 178, 195)']],
  blockColourProbes: [['heading', '.fbt3__heading', 'color'], ['subheading', '.fbt3__sub', 'color'], ['col_a', 'tbody .fbt3__a', 'backgroundColor'], ['col_b', 'tbody .fbt3__b', 'color'], ['rating', '.fbt3__rating', 'color']],
  edit: {padding_top_mobile: 12, padding_top_desktop: 12, cell_size: 18},
  textEdit: ['row', 'label', 'tbody .fbt3__label'],
  imgBlocks: b => b.map(x => x.type === 'col_a' ? {...x, settings: {...x.settings, image: IMG}} : x),
  imgSel: '.fbt3__pic',
  unrelated: {cell_size: 20, col_gap: 30, padding_bottom_mobile: 6},
  scrollers: 1,
  added: [{type: 'row', settings: {label: 'Added row'}}],
  addedCheck: [' .fbt3__label', 'label', 'Added row'],
  table: {fits: true, scroll: '.fbt3__scroll', label: 'tbody .fbt3__label', check: 'tbody tr:nth-child(1) .fbt3__a .fbt3__v', cross: 'tbody tr:nth-child(3) .fbt3__b .fbt3__v', highlight: ['tbody tr:nth-child(1) .fbt3__a', 'tbody tr:nth-child(1) .fbt3__b']},
};

const CMP = {
  name: 'comparisons-table', bp: 760, heading: '.cmp__heading', text: '.cmp__sub',
  blocks: () => presetBlocks('comparisons-table'),
  desk: ['text_position', 'text_align', 'column_valign', 'text_col_width', 'subheading.size'],
  pre: {'heading.swoosh_width': {highlight_text: ''}},
  /* the capsule is never wider than its column: on a phone a narrower one shows the change */
  values: {'column_header.cap_width_mobile': [60], 'column_header.cap_width': [80]},
  structural: ['heading.swoosh_image', 'column_header.is_brand'],
  themeProbes: [['.cmp__capsule', 'backgroundColor', 'rgb(18, 52, 86)'], ['tbody .cmp__feature', 'color', 'rgb(255, 255, 255)'], ['tbody td[data-brand] .cmp__yes', 'color', 'rgb(18, 52, 86)']],
  customProbes: [['tbody .cmp__feature', 'color', 'rgb(161, 178, 195)'], ['.cmp__table', 'backgroundColor', 'rgb(161, 178, 195)']],
  blockColourProbes: [['eyebrow', '.cmp__eyebrow', 'color'], ['heading', '.cmp__heading', 'color'], ['subheading', '.cmp__sub', 'color'], ['column_header', '.cmp__capsule', 'backgroundColor']],
  edit: {padding_top_mobile: 12, padding_top_desktop: 12, table_radius: 2},
  textEdit: ['row', 'feature', 'tbody .cmp__feature'],
  imgBlocks: b => b.map(x => x.type === 'column_header' && x.settings.is_brand ? {...x, settings: {...x.settings, logo_image: IMG}} : x),
  imgSel: '.cmp__logo img',
  unrelated: {table_radius: 30, cell_pad_y: 10, padding_bottom_mobile: 6},
  scrollers: 1,
  added: [{type: 'row', settings: {feature: 'Added row', values: 'yes,no,no'}}],
  addedCheck: [' .cmp__feature', 'feature', 'Added row'],
  table: {fits: true, scroll: '.cmp__scroll', label: 'tbody .cmp__feature', check: 'tbody tr:nth-child(2) td:nth-of-type(2) .cmp__m', cross: 'tbody tr:nth-child(1) td:nth-of-type(2) .cmp__m', highlight: ['tbody tr:nth-child(1) td:nth-of-type(1) .cmp__yes', 'tbody tr:nth-child(2) td:nth-of-type(2) .cmp__yes']},
};

const CCD = {
  name: 'comparison-cards', bp: 768, heading: '.ccd__heading', text: '.ccd__sub',
  blocks: () => presetBlocks('comparison-cards'),
  /* the tablet width only applies from 768 to 1023px: checked at 900 below */
  never: ['section_max_width_tablet'],
  same: [['show_section_on', 'all', 'desktop'], ['show_section_on', 'all', 'mobile'], ['card_title_weight', 'theme', '700'], ['heading.weight', 'theme', '700']],
  themeProbes: [['.ccd__card--us', 'backgroundColor', 'rgb(255, 255, 255)'], ['.ccd__card--them', 'backgroundColor', 'rgb(24, 32, 40)'], ['.ccd__title', 'fontFamily', 'Georgia']],
  customProbes: [['.ccd__card--us', 'backgroundColor', 'rgb(161, 178, 195)'], ['.ccd__card--them', 'borderTopColor', 'rgb(161, 178, 195)'], ['.ccd__card--us .ccd__i--check', 'color', 'rgb(161, 178, 195)']],
  blockColourProbes: [['heading', '.ccd__heading', 'color'], ['subheading', '.ccd__sub', 'color'], ['card_us', '.ccd__card--us .ccd__title', 'color'], ['row', '.ccd__card--us .ccd__row', 'color']],
  edit: {padding_top_mobile: 12, padding_top_desktop: 12, card_radius: 2},
  textEdit: ['row', 'label_us', '[data-fb-bt$=":label_us"]'],
  imgBlocks: b => b.map(x => x.type === 'card_us' ? {...x, settings: {...x.settings, image: IMG}} : x),
  imgSel: '.ccd__card--us .ccd__img',
  unrelated: {card_radius: 30, row_gap: 10, padding_bottom_mobile: 6},
  scrollers: 0,
  added: [{type: 'row', settings: {label_us: 'Added row'}}],
  addedCheck: [' [data-fb-bt$=":label_us"]', 'label_us', 'Added row'],
};

async function tabletWidth(browser, {ok, eq, mount, frames}) {
  const t = await mount(browser, 'comparison-cards', {width: 900, editing: true, assets: ['live-features-b.js']});
  eq(await t.css('.ccd__inner', 'maxWidth'), '900px', 'cards tablet width at 900');
  await t.emit({section_max_width_tablet: 600}); await frames(t.page);
  eq(await t.css('.ccd__inner', 'maxWidth'), '600px', 'cards tablet width live at 900');
  await t.redraw({settings: {section_max_width_tablet: 700}});
  eq(await t.css('.ccd__inner', 'maxWidth'), '700px', 'cards tablet width redraw at 900');
  eq(t.errors, [], 'cards tablet errors');
  await t.page.close();
}

const CTX = {
  name: 'comparison-text', bp: 768, heading: '.ctx__heading', text: '.ctx__sub',
  blocks: () => presetBlocks('comparison-text'),
  never: ['section_max_width_tablet'],
  structural: ['negative.icon_svg', 'positive.icon_svg'],
  same: [['show_section_on', 'all', 'desktop'], ['show_section_on', 'all', 'mobile'], ['heading.weight', 'theme', '700']],
  themeProbes: [['.ctx__row--pos', 'color', 'rgb(255, 255, 255)'], ['.ctx__row--neg', 'color', 'rgb(204, 204, 204)'], ['.ctx__row--pos .ctx__i--check', 'color', 'rgb(51, 102, 153)']],
  customProbes: [['.ctx__row--pos', 'color', 'rgb(161, 178, 195)'], ['.ctx__divider', 'borderTopColor', 'rgb(161, 178, 195)']],
  blockColourProbes: [['heading', '.ctx__heading', 'color'], ['subheading', '.ctx__sub', 'color']],
  edit: {padding_top_mobile: 12, padding_top_desktop: 12, row_gap_mobile: 2, row_gap_desktop: 2},
  textEdit: ['negative', 'text', '.ctx__row--neg .ctx__text'],
  imgBlocks: b => b.map(x => x.type === 'positive' ? {...x, settings: {...x.settings, icon_type: 'image', icon_image: IMG}} : x),
  imgSel: '.ctx__row--pos .ctx__i--image img',
  unrelated: {icon_size: 30, row_gap_desktop: 10, padding_bottom_mobile: 6},
  scrollers: 0,
  added: [{type: 'positive', settings: {text: 'Added row'}}],
  addedCheck: [' .ctx__text', 'text', 'Added row'],
};

async function textTablet(browser, {eq, mount, frames}) {
  const t = await mount(browser, 'comparison-text', {width: 900, editing: true, assets: ['live-features-b.js']});
  eq(await t.css('.ctx__inner', 'maxWidth'), '720px', 'text tablet width at 900');
  await t.emit({section_max_width_tablet: 600}); await frames(t.page);
  eq(await t.css('.ctx__inner', 'maxWidth'), '600px', 'text tablet width live at 900');
  eq(t.errors, [], 'text tablet errors');
  await t.page.close();
}

const SECTIONS = [CT, CT2, CT3, CMP, CCD, CTX];
module.exports = {SECTIONS};
if (require.main === module) run(SECTIONS, {'comparison-table': savedComparisonTable, 'comparison-cards': tabletWidth, 'comparison-text': textTablet}).catch(e => { console.error(e); process.exit(1); });
