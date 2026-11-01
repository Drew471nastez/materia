/* Round 5, Countdowns, under the real theme priority rules
   (snippets/theme-controls: Typography > Use in every section and Buttons >
   Use shared button size and shape, both on in config/settings.json).
   For every custom font, weight, line height and button shape switch in the
   five countdown sections and their blocks: switch it on live and through a
   redraw, at 375 and 1366, in the builder and on the storefront, and read the
   computed style on the element that draws the text and on a descendant (a
   <strong> in a heading, a <p> in rich text); switch it off (live and
   redraw) and the theme value is back, with the data-own-* opt-out attribute
   present only while it is on. Then theme inheritance once with both
   priorities off. Runner shared with tests/theme-media-image-video-priority.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-r5-countdown-priority.cjs */
const assert = require('assert');
const {run, FONT, MONO} = require('./theme-media-image-video-priority.cjs');
const {schemaOf} = require('./media-fixture.cjs');

const A = 'live-countdown.js';
const pad = n => String(n).padStart(2, '0');
const d = new Date(Date.now() + 3 * 86400000);
const DATE = {iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00:00`, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, mdy: `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`};
const preset = n => JSON.parse(JSON.stringify(schemaOf(n).schema.presets[0].blocks));
const STRONG = {'countdown-flip': ['heading', 'text'], 'countdown-timer1': ['heading', 'headline'], 'countdown-timer2': ['heading', 'heading'], 'countdown-timer3': ['heading', 'heading']};
/* a heading with a <strong>, a running date (the storefront hides a timer without one) */
function blocks(n, extra = {}) {
  return preset(n).map(b => {
    const s = {...(b.settings || {})};
    if (STRONG[n] && b.type === STRONG[n][0]) s[STRONG[n][1]] = 'Sale <strong>ends</strong>';
    if (n === 'countdown-timer3' && b.type === 'timer') Object.assign(s, {end_date: DATE.mdy, end_time: '11:30pm'});
    return {...b, settings: {...s, ...(extra[b.type] || {})}};
  });
}
const SET = {'countdown-flip': {end_iso: DATE.iso}, 'countdown-inline': {end_iso: DATE.iso}, 'countdown-timer2': {end_date: DATE.date, end_time: '12:00'}};
const m = (n, extra) => ({assets: [A], blocks: blocks(n, extra), settings: SET[n] || {}});

const cases = [], offs = [];
const add = (name, c) => cases.push({name, asset: A, mount: m(name), ...c});
/* Countdown Timer Flip */
{
  const n = 'countdown-flip', H = '.cdf__heading', HS = H + ' strong', SP = '.cdf__sub p', D = '[data-cd-unit="d"]', B = '.cdf__cta';
  add(n, {label: 'section custom fonts', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily'], ['sp', SP, 'fontFamily'], ['d', D, 'fontFamily']], on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/, sp: /Courier New/, d: /Verdana/}, attrs: [[H, 'data-own-font'], ['.cdf__sub', 'data-own-font']]});
  add(n, {block: 'heading', label: 'heading custom font', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [[H, 'data-own-font']]});
  add(n, {block: 'heading', label: 'heading weight', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']], on: {weight: '300'}, off: {weight: 'theme'}, want: {w: '300'}, attrs: [[H, 'data-own-weight']]});
  add(n, {block: 'heading', label: 'heading line height', probes: [['lh', H, 'lh'], ['fs', H, 'fontSize']], on: {custom_line_height: true, line_height: 1.7}, off: {custom_line_height: false}, want: {lh: '1.70'}, attrs: [[H, 'data-own-size']]});
  add(n, {block: 'subheading', label: 'subheading custom font', probes: [['sp', SP, 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {sp: /Courier New/}, attrs: [['.cdf__sub', 'data-own-font']]});
  add(n, {label: 'button own shape', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize'], ['bw', B, 'borderTopWidth']], on: {use_theme_button: false, cta_radius: 21, cta_pad_x: 40, cta_pad_y: 20, cta_size: 19, cta_border_width: 3}, off: {use_theme_button: true}, want: {pl: '40px', pt: '20px', r: '21px', fs: '19px', bw: '3px'}, attrs: [[B, 'data-own-shape']]});
  offs.push([n, A, [['h', H, 'fontFamily'], ['hw', H, 'fontWeight'], ['sp', SP, 'fontFamily'], ['bg', '[data-cd-root]', 'backgroundColor']], {h: /Georgia/, hw: '700', sp: /Arial/, bg: 'rgb(24, 32, 40)'}]);
}
/* Countdown Timer Inline */
{
  const n = 'countdown-inline', M = '.cin__message', E = '.cin__eyebrow', D = '[data-cd-unit="d"]', B = '.cin__cta';
  add(n, {label: 'section custom fonts', probes: [['m', M, 'fontFamily'], ['d', D, 'fontFamily']], on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {m: /Courier New/, d: /Verdana/}, attrs: [[M, 'data-own-font']]});
  add(n, {block: 'message', label: 'message custom font', probes: [['m', M, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {m: /Verdana/}, attrs: [[M, 'data-own-font']]});
  add(n, {block: 'eyebrow', label: 'eyebrow custom font', probes: [['e', E, 'fontFamily'], ['et', E + ' [data-cd-text]', 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {e: /Courier New/, et: /Courier New/}, attrs: [[E, 'data-own-font']]});
  add(n, {label: 'button own shape', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize']], on: {use_theme_button: false, cta_radius: 3, cta_pad_x: 33, cta_pad_y: 17, cta_size: 17}, off: {use_theme_button: true}, want: {pl: '33px', pt: '17px', r: '3px', fs: '17px'}, attrs: [[B, 'data-own-shape']]});
  offs.push([n, A, [['m', M, 'fontFamily'], ['bg', '[data-cd-root]', 'backgroundColor']], {m: /Arial/, bg: 'rgb(24, 32, 40)'}]);
}
/* Countdown Timer Pro 1 */
{
  const n = 'countdown-timer1', H = '.cd1__heading', HS = H + ' strong', P = '.cd1__sub', N = '[data-cd-unit="h"]', L = '[data-cd-label="h"]';
  add(n, {label: 'section custom fonts', probes: [['n', N, 'fontFamily'], ['l', L, 'fontFamily']], on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {n: /Verdana/, l: /Courier New/}});
  add(n, {block: 'heading', label: 'heading custom font', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily']], on: {enable_custom_fonts: true, headline_font: FONT}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [[H, 'data-own-font']]});
  add(n, {block: 'heading', label: 'heading weight', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']], on: {heading_text_weight: 'light'}, off: {heading_text_weight: 'theme'}, want: {w: '300'}, attrs: [[H, 'data-own-weight']]});
  add(n, {block: 'heading', label: 'heading line height', probes: [['lh', H, 'lh']], on: {headline_line_height: '1.7'}, off: {headline_line_height: 'inherit'}, want: {lh: '1.70'}, attrs: [[H, 'data-own-size']]});
  add(n, {block: 'subheading', label: 'text custom font', probes: [['p', P, 'fontFamily']], on: {enable_custom_fonts: true, text_font: MONO}, off: {enable_custom_fonts: false}, want: {p: /Courier New/}, attrs: [[P, 'data-own-font']]});
  add(n, {block: 'subheading', label: 'text line height', probes: [['lh', P, 'lh']], on: {text_line_height: '2.0'}, off: {text_line_height: 'inherit'}, want: {lh: '2.00'}});
  cases.push({name: n, asset: A, mount: m(n, {heading: {headline_font: FONT}, subheading: {text_font: MONO}}), label: 'legacy Custom fonts (block fonts)', probes: [['h', H, 'fontFamily'], ['p', P, 'fontFamily'], ['n', N, 'fontFamily']], on: {override_fonts: true}, off: {override_fonts: false}, want: {h: /Verdana/, p: /Courier New/, n: /Courier New/}, attrs: [[H, 'data-own-font'], [P, 'data-own-font']]});
  offs.push([n, A, [['h', H, 'fontFamily'], ['hw', H, 'fontWeight'], ['p', P, 'fontFamily'], ['bg', '.cd1', 'backgroundColor']], {h: /Georgia/, hw: '700', p: /Arial/, bg: 'rgb(24, 32, 40)'}]);
}
/* Countdown Timer Pro 2 */
{
  const n = 'countdown-timer2', H = '.ti-cd__heading', HS = H + ' strong', DP = '.ti-cd__description p', N = '[data-cd-unit="d"]', B = '.ti-cd__button';
  add(n, {label: 'section custom fonts', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily'], ['dp', DP, 'fontFamily'], ['n', N, 'fontFamily']], on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/, dp: /Courier New/, n: /Verdana/}, attrs: [[H, 'data-own-font'], ['.ti-cd__description', 'data-own-font']]});
  add(n, {block: 'heading', label: 'heading custom font', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [[H, 'data-own-font']]});
  add(n, {block: 'heading', label: 'heading weight', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']], on: {enable_custom_font_weight: true, font_weight: '300'}, off: {enable_custom_font_weight: false}, want: {w: '300'}, attrs: [[H, 'data-own-weight']]});
  add(n, {block: 'description', label: 'description custom font', probes: [['dp', DP, 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {dp: /Courier New/}, attrs: [['.ti-cd__description', 'data-own-font']]});
  add(n, {block: 'description', label: 'description weight', probes: [['w', DP, 'fontWeight']], on: {enable_custom_font_weight: true, font_weight: '700'}, off: {enable_custom_font_weight: false}, want: {w: '700'}, attrs: [['.ti-cd__description', 'data-own-weight']]});
  add(n, {block: 'button', label: 'button weight', probes: [['w', B, 'fontWeight']], on: {enable_custom_font_weight: true, font_weight: '300'}, off: {enable_custom_font_weight: false}, want: {w: '300'}, attrs: [[B, 'data-own-weight']]});
  add(n, {block: 'button', label: 'button own shape', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize'], ['bw', B, 'borderTopWidth']], on: {use_theme_button: false, button_border_radius: 21, button_padding_x: 40, button_padding_y: 20, button_font_size: 19, button_font_size_mobile: 13, button_border_width: 3}, off: {use_theme_button: true}, want: {pl: '40px', pt: '20px', r: '21px', fs: w => w >= 768 ? '19px' : '13px', bw: '3px'}, attrs: [[B, 'data-own-shape']]});
  offs.push([n, A, [['h', H, 'fontFamily'], ['hw', H, 'fontWeight'], ['dp', DP, 'fontFamily'], ['n', '.ti-cd__num', 'backgroundColor']], {h: /Georgia/, hw: '700', dp: /Arial/, n: 'rgb(255, 255, 255)'}]);
}
/* Countdown Timer Pro 3 */
{
  const n = 'countdown-timer3', H = '.cd3__heading', HS = H + ' strong', C = '.cd3__caption', DP = '.cd3__description p', N = '[data-cd-unit="d"]', B = '[data-cd-btn]';
  add(n, {label: 'section custom fonts', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily'], ['c', C, 'fontFamily'], ['dp', DP, 'fontFamily'], ['n', N, 'fontFamily']], on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/, c: /Courier New/, dp: /Courier New/, n: /Verdana/}, attrs: [[H, 'data-own-font'], [C, 'data-own-font'], ['.cd3__description', 'data-own-font']]});
  add(n, {block: 'heading', label: 'heading custom font', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [[H, 'data-own-font']]});
  add(n, {block: 'heading', label: 'heading weight', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']], on: {heading_style: 'regular'}, off: {heading_style: 'theme'}, want: {w: '400'}, attrs: [[H, 'data-own-weight']]});
  add(n, {block: 'caption', label: 'caption custom font', probes: [['c', C, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {c: /Verdana/}, attrs: [[C, 'data-own-font']]});
  add(n, {block: 'text', label: 'description custom font', probes: [['dp', DP, 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {dp: /Courier New/}, attrs: [['.cd3__description', 'data-own-font']]});
  add(n, {block: 'timer', label: 'number custom font', probes: [['n', N, 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {n: /Courier New/}, attrs: [['.cd3__timer', 'data-own-font']]});
  add(n, {block: 'button', label: 'button own corners', probes: [['r', B, 'borderTopLeftRadius'], ['pl', B, 'paddingLeft'], ['fs', B, 'fontSize']], on: {use_theme_button: false, primary_button_corner: 21}, off: {use_theme_button: true}, want: {r: '21px', pl: '20px', fs: '14px'}, attrs: [[B, 'data-own-shape']]});
  offs.push([n, A, [['h', H, 'fontFamily'], ['hw', H, 'fontWeight'], ['c', C, 'fontFamily'], ['bg', '[data-cd-root]', 'backgroundColor']], {h: /Georgia/, hw: '700', c: /Arial/, bg: 'rgb(24, 32, 40)'}]);
}

/* priorityOff mounts with no settings: give it the dated preset through the runner's mount options is not possible, so check the editor (which draws without a date). */
run(cases, offs, 'countdown').then(() => assert.ok(!process.exitCode));
