/* Round 5, Social and Dividers: Social Icons Pro (sections/social-icons-pro2.storelib),
   run by live-social-dividers.js. Shared sweep (tests/theme-r5-social-lib.cjs):
   every section, Headline, Text and Social icon block control live and after
   a redraw at 375 and 1366, platforms distinct, first paint = hydrated, two
   instances, added icon, reduced motion, priority off. Then: icon links
   (own URL, else Theme settings > Social media, else hidden for visitors),
   44px targets, custom colours and fonts on and off under the theme priority
   on the h2, a <strong> inside it and the <p>, the legacy five icons, and the
   saved about page instance against the section as it was with the toggle
   the lead sets.
   LIQUIDJS=<path to liquidjs> node tests/theme-r5-social-dividers-icons.cjs */
const {run, savedLook, FONT} = require('./theme-r5-social-lib.cjs');
const VERDANA = {family: 'Verdana', fallback_families: 'sans-serif', weight: 400};
const SOCIAL = {instagram: 'https://instagram.com/shop', facebook: 'https://facebook.com/shop', youtube: 'https://youtube.com/@shop', tiktok: 'https://tiktok.com/@shop', social_x: 'https://x.com/shop'};
const ICONS = ['instagram', 'facebook', 'youtube', 'tiktok', 'x'].map(platform => ({type: 'icon', settings: {platform}}));
run({
  name: 'social-icons-pro2', heading: '.loud-h', text: '.loud-p', schemeSel: '.loud-wrap',
  globals: {settings: {scroll_animation: 'none', ...SOCIAL}},
  blockTypes: ['headline', 'subheading', 'icon'],
  baseSettings: {section_margin_top_mobile: 20, section_margin_top_desktop: 24, section_margin_bottom_mobile: 8, section_margin_bottom_desktop: 12, container_border_size: 2},
  baseBlocks: [{type: 'headline', settings: {font: VERDANA}}, {type: 'subheading', settings: {font: VERDANA}}, ...ICONS],
  addType: 'icon',
  samePairs: ['section_width:fluid_container=full_width'],
  skipEveryControl: {reveal: true},
  addedEdit: {settings: {platform: 'tiktok', link: '/pages/added'}, check: async (t, id, {eq}) => { eq(await t.page.locator('[data-sd-block="' + id + '"]').getAttribute('href'), '/pages/added'); eq(await t.page.locator('[data-sd-block="' + id + '"] .loud-icon').getAttribute('aria-label'), 'tiktok'); return 0; }},
  async extra({browser, mount, eq, ok}) {
    const A = ['live-social-dividers.js'];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'social icons ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'social-icons-pro2', {width, editing, assets: A, globals: {settings: {scroll_animation: 'none', instagram: SOCIAL.instagram}}, blocks: [{type: 'headline', settings: {text: 'Follow <strong>us</strong>', font: VERDANA}}, {type: 'subheading', settings: {text: 'New posts every week', font: VERDANA}}, {type: 'icon', settings: {platform: 'instagram'}}, {type: 'icon', settings: {platform: 'facebook', link: '/pages/fb'}}, {type: 'icon', settings: {platform: 'youtube'}}]});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      const links = await t.page.locator('#shopify-section-test .loud-link').evaluateAll(els => els.map(e => [e.tagName, e.getAttribute('href')]));
      eq(links, editing ? [['A', SOCIAL.instagram], ['A', '/pages/fb'], ['SPAN', null]] : [['A', SOCIAL.instagram], ['A', '/pages/fb']], where + ' links: own, theme, none (hidden for visitors)');
      for (const a of await t.page.locator('#shopify-section-test a.loud-link').all()) ok(await a.evaluate(el => { const b = el.getBoundingClientRect(), x = b.x + b.width / 2, y = b.y + b.height / 2; return [[x - 21, y], [x + 21, y], [x, y - 21], [x, y + 21]].every(([px, py]) => el.contains(document.elementFromPoint(px, py))); }), where + ' icon target 44px');
      eq(await sty('.loud-icon', 'backgroundColor'), 'rgb(255, 255, 255)', where + ' icon follows the heading colour');
      if (editing) {
        const ids = [0, 1, 2].map(n => t.blockId('icon', n));
        await t.emit({link: '/pages/yt'}, ids[2]);
        eq(await t.page.locator('[data-sd-block="' + ids[2] + '"]').evaluate(el => [el.tagName, el.getAttribute('href'), el.getAttribute('target')]), ['A', '/pages/yt', '_blank'], where + ' a link turns the icon into a link live');
        await t.emit({link: ''}, ids[1]);
        eq(await t.page.locator('[data-sd-block="' + ids[1] + '"]').getAttribute('href'), null, where + ' no link and no theme link: not a link');
      }
      for (const mode of ['live', 'redraw']) {
        const hid = t.blockId('headline'), pid = t.blockId('subheading'), iid = t.blockId('icon');
        const apply = async (sec, h, p, i) => {
          if (mode === 'live') { await t.emit(sec); await t.emit(h, hid); await t.emit(p, pid); await t.emit(i, iid); return; }
          const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(b.id === hid ? h : b.id === pid ? p : b.id === iid ? i : {})}}));
          await t.redraw({settings: sec, blocks});
        };
        await apply({enable_custom_style: true, section_background_color: '#0000ff', container_background_color: '#00ff00'}, {enable_custom_style: true, color: '#ff0000', enable_custom_fonts: true, font: FONT, line_height: '1.6'}, {enable_custom_style: true, color: '#ffff00', enable_custom_fonts: true, font: FONT, line_height: '1.7'}, {enable_custom_style: true, color: '#ff00ff'});
        eq(await sty('.loud-wrap', 'backgroundColor'), 'rgb(0, 0, 255)', where + ' ' + mode + ' custom background');
        eq(await sty('.loud-container', 'backgroundColor'), 'rgb(0, 255, 0)', where + ' ' + mode + ' custom box');
        eq(await sty('.loud-h', 'color'), 'rgb(255, 0, 0)', where + ' ' + mode + ' custom headline colour');
        eq(await sty('.loud-p', 'color'), 'rgb(255, 255, 0)', where + ' ' + mode + ' custom text colour');
        eq(await sty('.loud-icon', 'backgroundColor'), 'rgb(255, 0, 255)', where + ' ' + mode + ' custom icon colour');
        for (const sel of ['.loud-h', '.loud-h strong', '.loud-p']) ok(/Courier New/.test(await sty(sel, 'fontFamily')), where + ' ' + mode + ' custom font on ' + sel);
        eq(await sty('.loud-h', 'fontWeight'), '300', where + ' ' + mode + ' headline weight from the font');
        eq(await sty('.loud-h strong', 'fontWeight'), '700', where + ' ' + mode + ' bold stays bold');
        { const fz = parseFloat(await sty('.loud-h', 'fontSize')), lh = parseFloat(await sty('.loud-h', 'lineHeight')); ok(Math.abs(lh - fz * 1.6) < 0.6, where + ' ' + mode + ' headline line height wins over the theme (' + lh + ' for ' + fz + ')'); }
        await apply({enable_custom_style: false}, {enable_custom_style: false, enable_custom_fonts: false, line_height: 'inherit'}, {enable_custom_style: false, enable_custom_fonts: false, line_height: 'inherit'}, {enable_custom_style: false});
        eq(await sty('.loud-wrap', 'backgroundColor'), 'rgb(24, 32, 40)', where + ' ' + mode + ' theme background back');
        eq(await sty('.loud-h', 'color'), 'rgb(255, 255, 255)', where + ' ' + mode + ' theme headline colour back');
        eq(await sty('.loud-p', 'color'), 'rgb(204, 204, 204)', where + ' ' + mode + ' theme text colour back');
        eq(await sty('.loud-icon', 'backgroundColor'), 'rgb(255, 255, 255)', where + ' ' + mode + ' theme icon colour back');
        ok(/Georgia/.test(await sty('.loud-h', 'fontFamily')) && /Georgia/.test(await sty('.loud-h strong', 'fontFamily')) && /Arial/.test(await sty('.loud-p', 'fontFamily')), where + ' ' + mode + ' theme fonts back');
        eq(await t.page.locator('#shopify-section-test [data-own-font], #shopify-section-test [data-own-size]').count(), 0, where + ' ' + mode + ' no priority opt-outs left');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    /* legacy: no icon blocks, the five section icons */
    {
      const t = await mount(browser, 'social-icons-pro2', {width: 1366, assets: A, settings: {show_visa: false, paypal_url: '', mastercard_color: '#ff0000'}, blocks: [{type: 'headline'}]});
      eq(await t.page.locator('#shopify-section-test .loud-link').evaluateAll(els => els.map(e => e.tagName + ':' + e.querySelector('.loud-icon').getAttribute('aria-label'))), ['A:instagram', 'SPAN:facebook', 'A:tiktok', 'A:twitter'], 'social icons legacy icons');
      eq(await t.css('[data-sip-legacy="mastercard"] .loud-icon', 'backgroundColor'), 'rgb(255, 255, 255)', 'social icons legacy colour waits for custom styling');
      await t.emit({enable_custom_style: true});
      eq(await t.css('[data-sip-legacy="mastercard"] .loud-icon', 'backgroundColor'), 'rgb(255, 0, 0)', 'social icons legacy colour live');
      await t.redraw({blocks: [{type: 'headline'}, {type: 'icon', settings: {platform: 'x', link: '/x'}}]});
      eq(await t.page.locator('#shopify-section-test .loud-link').count(), 1, 'social icons blocks replace the legacy icons');
      eq(t.errors, [], 'social icons legacy errors');
      await t.page.close();
    }
    for (const r of await savedLook(browser, {name: 'social-icons-pro2', template: 'templates/about.json', key: 'social_icons_pro2_Ga3iNT', toggles: {enable_custom_style: true}})) ok(r.same, 'social icons saved about @' + r.width + ' looks the same ' + JSON.stringify([r.old.box, r.now.box]));
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
