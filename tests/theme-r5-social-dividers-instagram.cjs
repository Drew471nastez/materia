/* Round 5, Social and Dividers: Instagram Promo (sections/instagram-promo.storelib),
   run by live-social-dividers.js. Shared sweep (tests/theme-r5-social-lib.cjs):
   every section, Heading, Text, Instagram picture and Button block control
   live and after a redraw at 375 and 1366, selects distinct, first paint =
   hydrated, two instances (the section's CSS is scoped to its own id now),
   added picture, reduced motion, priority off. Then: tile and button links
   (own URL, else the theme's Instagram link, else no link), the theme
   button and its hover, custom colours, fonts and the button's own shape on
   and off under the theme priority, the legacy Instagram Button settings, a
   picture never reloaded by an unrelated edit, and the library preview.
   LIQUIDJS=<path to liquidjs> node tests/theme-r5-social-dividers-instagram.cjs */
const {run, IMG, IMG2, FONT} = require('./theme-r5-social-lib.cjs');
const VERDANA = {family: 'Verdana', fallback_families: 'sans-serif', weight: 400};
const IG = 'https://instagram.com/materia';
const pics = n => Array.from({length: n}, (_, i) => ({type: 'image', settings: {alt_text: 'Post ' + i, image: i % 2 ? IMG2 : IMG}}));
run({
  name: 'instagram-promo', heading: '.ig-heading', text: '.ig-sub', schemeSel: '.promo-container', button: true,
  globals: {settings: {scroll_animation: 'none', instagram: IG}},
  blockTypes: ['heading', 'subheading', 'image', 'button'],
  baseSettings: {section_margin_top_mobile: 20, section_margin_top_desktop: 24, section_margin_bottom_mobile: 8, section_margin_bottom_desktop: 12, heading_font: VERDANA, body_font: VERDANA, image_shadow: 'low'},
  baseBlocks: [{type: 'heading', settings: {text: 'Follow us'}}, {type: 'subheading', settings: {text: 'Tag us'}}, ...pics(3), {type: 'button', settings: {}}],
  addType: 'image',
  values: {'image.image': IMG2},
  hover: {image_hover_animation: '.image-container', 'button.bg_color_hover': '.instagram-button', 'button.text_color_hover': '.instagram-button'},
  samePairs: ['section_width:fluid_container=full_width', 'heading.font_weight:theme=700'],
  skipEveryControl: {reveal: true},
  addedEdit: {settings: {alt_text: 'Added post', link_url: '/pages/added'}, check: async (t, id, {eq}) => { eq(await t.page.locator('[data-sd-block="' + id + '"] .ig-tile').getAttribute('href'), '/pages/added'); eq(await t.page.locator('[data-sd-block="' + id + '"] .ig-tile').getAttribute('aria-label'), 'Added post'); return 0; }},
  async extra({browser, mount, eq, ok}) {
    const A = ['live-social-dividers.js'];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'instagram ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'instagram-promo', {width, editing, assets: A, globals: {settings: {scroll_animation: 'none', instagram: IG}}, settings: {heading_font: VERDANA, body_font: VERDANA}, blocks: [{type: 'heading', settings: {text: 'Follow <strong>us</strong>'}}, {type: 'subheading', settings: {text: 'Line one\nLine two'}}, {type: 'image', settings: {image: IMG, alt_text: 'One', link_url: '/pages/one'}}, {type: 'image', settings: {alt_text: 'Two'}}, {type: 'button', settings: {}}]});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      eq(await t.page.locator('#shopify-section-test .ig-tile').evaluateAll(els => els.map(e => [e.tagName, e.getAttribute('href')])), [['A', '/pages/one'], ['A', IG]], where + ' tiles link to their own URL, else the theme Instagram link');
      eq(await t.page.locator('#shopify-section-test .instagram-button').getAttribute('href'), IG, where + ' button links to the theme Instagram link');
      eq(await t.page.locator('#shopify-section-test .ig-sub br').count(), 1, where + ' text keeps its line break');
      ok((await t.root('.instagram-button').boundingBox()).height >= 44, where + ' button target 44px');
      const img = await t.page.locator('#shopify-section-test .ig-tile img').elementHandle();
      if (editing) {
        await t.emit({image_border_radius: 20, horizontal_gap_desktop: 40, vertical_gap_mobile: 40, image_shadow: 'high', padding_top_desktop: 10, padding_top_mobile: 10});
        await t.emit({alt_text: 'Renamed'}, t.blockId('image'));
        eq(await img.evaluate(el => el.isConnected && el.getAttribute('src').split('?')[0]), IMG.url, where + ' picture not reloaded by unrelated edits');
        eq(await img.getAttribute('alt'), 'Renamed', where + ' alt live');
        await t.emit({link: '/pages/follow'}, t.blockId('button'));
        eq(await t.page.locator('#shopify-section-test .instagram-button').getAttribute('href'), '/pages/follow', where + ' button link live');
        await t.emit({text: 'A\nB\nC'}, t.blockId('subheading'));
        eq(await t.page.locator('#shopify-section-test .ig-sub br').count(), 2, where + ' text lines live');
      }
      for (const mode of ['live', 'redraw']) {
        const hid = t.blockId('heading'), pid = t.blockId('subheading'), bid = t.blockId('button');
        const apply = async (sec, h, p, b) => {
          if (mode === 'live') { await t.emit(sec); await t.emit(h, hid); await t.emit(p, pid); await t.emit(b, bid); return; }
          const blocks = t.rendered[0].section.blocks.map(x => ({type: x.type, settings: {...x.settings, ...(x.id === hid ? h : x.id === pid ? p : x.id === bid ? b : {})}}));
          await t.redraw({settings: sec, blocks});
        };
        await apply({enable_custom_style: true, background_color: '#0000ff', enable_custom_fonts: true, heading_font: FONT, body_font: FONT}, {enable_custom_style: true, color: '#ff0000'}, {enable_custom_style: true, color: '#ffff00'}, {enable_custom_style: true, bg_color: '#00ff00', text_color: '#000000', bg_color_hover: '#ff00ff', use_theme_button: false, size_desktop: 22, size_mobile: 21, font_weight: '300'});
        eq(await sty('.promo-container', 'backgroundColor'), 'rgb(0, 0, 255)', where + ' ' + mode + ' custom background');
        eq(await sty('.ig-heading', 'color'), 'rgb(255, 0, 0)', where + ' ' + mode + ' custom heading colour');
        eq(await sty('.ig-sub', 'color'), 'rgb(255, 255, 0)', where + ' ' + mode + ' custom text colour');
        for (const sel of ['.ig-heading', '.ig-heading strong', '.ig-sub', '.instagram-button']) ok(/Courier New/.test(await sty(sel, 'fontFamily')), where + ' ' + mode + ' custom font on ' + sel);
        eq(await sty('.ig-heading', 'fontWeight'), '300', where + ' ' + mode + ' heading weight from the font');
        eq(await sty('.instagram-button', 'backgroundColor'), 'rgb(0, 255, 0)', where + ' ' + mode + ' custom button');
        eq(await sty('.instagram-button', 'fontSize'), width < 768 ? '21px' : '22px', where + ' ' + mode + ' button own size wins');
        eq(await sty('.instagram-button', 'fontWeight'), '300', where + ' ' + mode + ' button own weight wins');
        eq(await sty('.instagram-button', 'borderTopLeftRadius'), '5px', where + ' ' + mode + ' button own corners win');
        if (!editing) { await t.root('.instagram-button').hover(); await t.page.waitForTimeout(60); eq(await t.root('.instagram-button').evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(255, 0, 255)', where + ' ' + mode + ' custom hover'); await t.page.mouse.move(0, 0); }
        await apply({enable_custom_style: false, enable_custom_fonts: false}, {enable_custom_style: false}, {enable_custom_style: false}, {enable_custom_style: false, use_theme_button: true});
        eq(await sty('.promo-container', 'backgroundColor'), 'rgb(24, 32, 40)', where + ' ' + mode + ' theme background back');
        eq(await sty('.ig-heading', 'color'), 'rgb(255, 255, 255)', where + ' ' + mode + ' theme heading colour back');
        ok(/Georgia/.test(await sty('.ig-heading', 'fontFamily')) && /Arial/.test(await sty('.ig-sub', 'fontFamily')), where + ' ' + mode + ' theme fonts back');
        eq(await sty('.ig-heading', 'fontWeight'), '700', where + ' ' + mode + ' theme heading weight back');
        eq(await sty('.instagram-button', 'backgroundColor'), 'rgb(18, 52, 86)', where + ' ' + mode + ' theme button back');
        eq(await sty('.instagram-button', 'borderTopLeftRadius'), '12px', where + ' ' + mode + ' theme button corners back');
        eq(await t.page.locator('#shopify-section-test [data-own-font], #shopify-section-test [data-own-shape], #shopify-section-test [data-own-weight]').count(), 0, where + ' ' + mode + ' no priority opt-outs left');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    /* legacy Instagram Button settings, no button block; no theme link: a tile is not a link */
    {
      const t = await mount(browser, 'instagram-promo', {width: 1366, editing: false, assets: A, settings: {show_instagram_button: true, button_text: 'Old button', button_link_url: '/pages/old', button_bg_color: '#ff0000'}, blocks: [{type: 'image', settings: {}}]});
      eq(await t.page.locator('#shopify-section-test .instagram-button').textContent(), 'Old button', 'instagram legacy button');
      eq(await t.css('.instagram-button', 'backgroundColor'), 'rgb(18, 52, 86)', 'instagram legacy button colour waits for custom styling');
      eq(await t.page.locator('#shopify-section-test .ig-tile').evaluate(e => e.tagName), 'DIV', 'instagram tile with no link is not a link');
      await t.redraw({settings: {enable_custom_style: true}});
      eq(await t.css('.instagram-button', 'backgroundColor'), 'rgb(255, 0, 0)', 'instagram legacy button colour with custom styling');
      await t.redraw({blocks: [{type: 'button', settings: {label: 'New', link: '/x'}}]});
      eq(await t.page.locator('#shopify-section-test .instagram-button').textContent(), 'New', 'instagram button block wins');
      const e = await mount(browser, 'instagram-promo', {width: 375, editing: false, assets: A, blocks: [{type: 'button', settings: {}}]});
      eq(await e.page.locator('#shopify-section-test .instagram-button').count(), 0, 'instagram button with no link is hidden from visitors');
      eq(t.errors.concat(e.errors), [], 'instagram legacy errors');
      await t.page.close(); await e.page.close();
    }
    /* library preview: first preset, no pictures, no invented handles */
    for (const width of [375, 1366]) {
      const t = await mount(browser, 'instagram-promo', {width, editing: true, assets: A});
      ok(!/@\\w/.test(await t.page.locator('#shopify-section-test').innerText()), 'instagram preview has no invented @handle');
      eq(await t.page.locator('#shopify-section-test .ig-tile svg[data-sd-ph]').count(), 4, 'instagram preview placeholders');
      const h = (await t.root().boundingBox()).height; ok(h > 200 && h < 1400, 'instagram preview height ' + h);
      ok(await t.noOverflow(), 'instagram preview no overflow ' + width);
      eq(t.errors, [], 'instagram preview errors');
      await t.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
