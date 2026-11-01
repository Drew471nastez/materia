/* LIQUIDJS=<path> node tests/theme-testimonials-r4-feedback.cjs
   Community Feedback Slider (sections/comunitysldier) with the round 4 bar:
   theme first, every control live and after a redraw at 375 and 1366
   (editor and storefront), the Rating summary and Heading blocks with the
   hidden legacy score settings used only when there is no summary block,
   stars filled to the exact score, bars as meters, theme priority opt outs,
   two instances, first paint. */
const {run, wait2} = require('./theme-testimonials-r4-lib.cjs');
const RED = '#ff0000', R = 'rgb(255, 0, 0)';
const txt = el => el.textContent.trim();
const blocks = [
  {type: 'heading', settings: {text: 'What customers told <strong>us</strong>'}},
  {type: 'summary', settings: {score: '4,3', count: 'Based on your reviews', note: 'Average answers'}},
  {type: 'question', settings: {question: 'Is it good value?', value: 80}},
  {type: 'question', settings: {question: 'How is the quality?', value: 40, left_label: 'Poor', right_label: 'Great'}},
];
const B = (block, id, value, sel, prop, expect, more = {}) => ({block, id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
(async () => {
  const checks = await run({
    name: 'comunitysldier', root: '.cfs', blocks,
    inherit: [['.cfs', 'backgroundColor', 'rgb(24, 32, 40)'], ['.cfs', 'color', 'rgb(204, 204, 204)'], ['.cfs__heading', 'color', 'rgb(255, 255, 255)'], ['.cfs__heading', 'fontFamily', /Georgia/], ['.cfs__q', 'fontFamily', /Georgia/], ['.cfs__source', 'fontFamily', /Arial/], ['.cfs__score', 'color', 'rgb(255, 255, 255)'], ['.cfs__fill', 'backgroundColor', 'rgb(255, 255, 255)'], ['.cfs__bar', 'backgroundColor', 'rgb(68, 85, 102)'], ['.lt-star', 'backgroundColor::before', 'rgb(51, 102, 153)']],
    controls: [
      S('section_width', 'container', '.lt-frame', 'maxWidth', '1330px', {w: 1366}),
      S('max_width', 600, '.cfs__wrap', 'maxWidth', '600px'),
      S('card_radius', 3, '.cfs__card', 'borderTopLeftRadius', '3px'),
      S('bar_height', 9, '.cfs__bar', 'height', '9px'),
      S('marker_size', 24, '.cfs__marker', 'width', '24px'),
      S('padding_top', 12, '.cfs', 'paddingTop', '12px'),
      S('padding_bottom', 14, '.cfs', 'paddingBottom', '14px'),
      B('heading', 'text', 'New <em>heading</em>', '.cfs__heading', null, 'New heading', {get: txt}),
      B('heading', 'size', 44, '.cfs__heading', 'fontSize', '44px', {w: 1366}),
      B('heading', 'size_mobile', 20, '.cfs__heading', 'fontSize', '20px', {w: 375}),
      B('summary', 'score', '3,6', '.cfs__head', null, '3,6|60%|3.6 / 5', {get: el => el.querySelector('.cfs__score').textContent.trim() + '|' + el.querySelectorAll('.lt-star')[3].style.getPropertyValue('--lt-fill') + '|' + el.querySelector('.lt-stars').getAttribute('aria-label')}),
      B('summary', 'count', 'Changed count', '.cfs__count', null, 'Changed count', {get: txt}),
      B('summary', 'note', '', '.cfs__note', null, true, {get: el => el.hidden}),
      B('question', 'question', 'Changed question', '.cfs__row', null, 'Changed question|Changed question', {get: el => el.querySelector('.cfs__q').textContent.trim() + '|' + el.querySelector('.cfs__bar').getAttribute('aria-label')}),
      B('question', 'left_label', 'Bad', '.cfs__scale span', null, 'Bad', {get: txt}),
      B('question', 'right_label', 'Good', '.cfs__scale span:last-child', null, 'Good', {get: txt}),
      B('question', 'value', 30, '.cfs__row', null, '30|30', {get: el => el.querySelector('.cfs__bar').getAttribute('aria-valuenow') + '|' + Math.round((el.querySelector('.cfs__marker').getBoundingClientRect().x + el.querySelector('.cfs__marker').getBoundingClientRect().width / 2 - el.querySelector('.cfs__bar').getBoundingClientRect().x) / el.querySelector('.cfs__bar').getBoundingClientRect().width * 100)}),
    ],
    colours: [
      S('section_bg', RED, '.cfs', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('text_color', RED, '.cfs', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('card_bg', RED, '.cfs__card', 'backgroundColor', R, {theme: v => v !== R}),
      S('score_color', RED, '.cfs__score', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('question_color', RED, '.cfs__q', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('muted_color', RED, '.cfs__scale', 'color', R, {theme: v => v !== R}),
      S('star_color', RED, '.lt-star', 'backgroundColor::before', R, {theme: 'rgb(51, 102, 153)'}),
      S('star_empty_color', RED, '.lt-star svg', 'fill', R, {theme: 'rgb(68, 85, 102)'}),
      S('bar_track_color', RED, '.cfs__bar', 'backgroundColor', R, {theme: 'rgb(68, 85, 102)'}),
      S('bar_fill_color', RED, '.cfs__fill', 'backgroundColor', R, {theme: 'rgb(255, 255, 255)'}),
      S('marker_color', RED, '.cfs__marker', 'backgroundColor', R, {theme: 'rgb(255, 255, 255)'}),
      B('heading', 'color', RED, '.cfs__heading', 'color', R, {theme: 'rgb(255, 255, 255)'}),
    ],
    fonts: [{id: 'heading_font', sel: '.cfs__heading', desc: ['.cfs__heading strong', '.cfs__q', '.cfs__score']}, {id: 'body_font', sel: '.cfs__source', desc: ['.cfs__scale', '.cfs__note']}],
    own: [
      {on: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.cfs__q', attrSel: '.cfs', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/, desc: ['.cfs__heading']},
      {on: {enable_custom_fonts: true, body_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.cfs__source', attrSel: '.cfs', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.cfs__note']},
    ],
    variants: [
      {id: 'section_width', values: ['container', 'fluid_container', 'stretch_width', 'full_width'], sel: '.lt-frame', read: el => [getComputedStyle(el).maxWidth, getComputedStyle(el).paddingLeft], reset: 'full_width'},
    ],
    covered: [':enable_custom_style', ':enable_custom_fonts', ':reveal', 'heading:enable_custom_style'],
    independent: S('padding_top', 7, '.cfs', 'paddingTop', '7px'),
    addBlock: {type: 'question', settings: {question: 'Added question', value: 20}},
    addBlockLive: {settings: {question: 'Live question'}, sel: '.cfs__row:last-child .cfs__q', get: txt, expect: 'Live question'},
    async extra(t, {ok}) {
      const sec = '#shopify-section-' + t.section.id;
      const fills = await t.page.locator(sec + ' .cfs__head .lt-star').evaluateAll(els => els.map(e => e.style.getPropertyValue('--lt-fill')));
      ok(fills.join() === '100%,100%,100%,100%,30%', 'stars fill to a 4,3 score ' + fills);
      ok(await t.page.locator(sec + ' .cfs__bar').first().evaluate(el => el.getAttribute('role') === 'meter' && el.getAttribute('aria-valuenow') === '80'), 'bars are meters with the value');
    },
    async after(browser, {ok}) {
      /* legacy: no summary block, the hidden section settings draw the header and stay live */
      const {mount} = require('./media-fixture.cjs');
      const legacy = [{type: 'question', settings: {question: 'Old question', value: 70}}];
      const t = await mount(browser, 'comunitysldier', {blocks: legacy, settings: {overall_score: '4,8', overall_score_int: 4, review_count: 'Old count', source_note: 'Old note', show_header: true}, assets: ['live-testimonials.js']});
      ok(await t.page.locator('[data-lt-legacy] .cfs__score').textContent() === '4,8', 'legacy score shows with no summary block');
      ok(await t.page.locator('[data-lt-legacy] .cfs__count').textContent() === 'Old count', 'legacy count shows');
      await t.emit({review_count: 'New count', overall_score_int: 2}); await wait2(t.page);
      ok(await t.page.locator('[data-lt-legacy] .cfs__count').textContent() === 'New count', 'legacy count is live');
      ok(await t.page.locator('[data-lt-legacy] .lt-star').nth(2).evaluate(el => el.style.getPropertyValue('--lt-fill')) === '0%', 'legacy stars are live');
      await t.emit({show_header: false}); await wait2(t.page);
      ok(await t.page.locator('[data-lt-legacy]').isHidden(), 'legacy header hides');
      await t.page.close();
      const u = await mount(browser, 'comunitysldier', {blocks, settings: {overall_score: '1,0', review_count: 'Old count'}, assets: ['live-testimonials.js']});
      ok(await u.page.locator('[data-lt-legacy]').count() === 0 && (await u.page.locator('.cfs__count').textContent()) === 'Based on your reviews', 'with a summary block the legacy settings are not used');
      await u.page.close();
    },
  });
  console.log(checks + ' Community Feedback Slider round 4 checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
