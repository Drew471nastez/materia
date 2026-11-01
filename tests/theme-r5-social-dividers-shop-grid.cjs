/* Round 5, Social and Dividers: Social Shop Grid (sections/social-shop-grid.storelib
   and snippets/social-shop-tile.storelib), run by live-social-dividers.js.
   Shared sweep (tests/theme-r5-social-lib.cjs): every section, Eyebrow,
   Heading, Text, Follow link and Tile control live and after a redraw at 375
   and 1366 (a tagged product, a video and grid <-> carousel wait for the
   builder's redraw: their markup comes from the store), selects distinct,
   first paint = hydrated, two instances, added tile, reduced motion,
   priority off. Then: tile links (product, else own link), the product chip
   from the product picker, handle pill and badge live, grid / masonry /
   bento live, the carousel's data for the theme slider and its arrows and
   pagination, tile videos only on screen and never under reduced motion,
   custom colours and fonts on and off under the theme priority, the legacy
   header settings, no invented handles in the library preview.
   LIQUIDJS=<path to liquidjs> node tests/theme-r5-social-dividers-shop-grid.cjs */
const {run, IMG, IMG2, FONT} = require('./theme-r5-social-lib.cjs');
const {PANTS, OTHER} = require('./media-fixture.cjs');
const VERDANA = {family: 'Verdana', fallback_families: 'sans-serif', weight: 400};
const VIDEO = {sources: [{format: 'mp4', url: 'data:video/mp4;base64,AAAA'}]};
const HEAD = [{type: 'eyebrow', settings: {}}, {type: 'heading', settings: {}}, {type: 'subheading', settings: {}}, {type: 'button', settings: {link: '/pages/follow'}}];
const TILES = [{type: 'tile', settings: {image: IMG, headline: 'Look one', username: '@ana', platform: 'instagram'}}, {type: 'tile', settings: {image: IMG2, product: PANTS}}, {type: 'tile', settings: {link: '/pages/three'}}, {type: 'tile', settings: {}}];
run({
  name: 'social-shop-grid', heading: '.section__header-heading', text: '.section__header-des p',
  blockTypes: ['eyebrow', 'heading', 'subheading', 'button', 'tile'],
  baseSettings: {section_margin_top_mobile: 20, section_margin_top_desktop: 24, section_margin_bottom_mobile: 8, section_margin_bottom_desktop: 12, heading_font: VERDANA, body_font: VERDANA, show_handle: true},
  baseBlocks: [...HEAD, ...TILES],
  addType: 'tile',
  values: {'tile.image': IMG2, 'tile.avatar': IMG2, 'tile.product': OTHER, 'tile.video': VIDEO},
  redrawOnly: {display_mode: true, 'tile.product': true, 'tile.video': true},
  hover: {hover_style: '.ssg-tile'},
  /* the dots are drawn by the theme's Swiper, which the fixture does not run: checked by their data and hidden state below */
  samePairs: ['section_width:fluid_container=full_width', 'carousel_pagination:disable=show_dots', 'pagination_position:left=center', 'pagination_position:left=right', 'pagination_position:center=right', 'pagination_style:dot=pill', 'pagination_style:dot=line', 'pagination_style:dot=square', 'pagination_style:dot=ring', 'pagination_style:dot=number', 'pagination_style:dot=progress', 'pagination_style:pill=line', 'pagination_style:pill=square', 'pagination_style:pill=ring', 'pagination_style:pill=number', 'pagination_style:pill=progress', 'pagination_style:line=square', 'pagination_style:line=ring', 'pagination_style:line=number', 'pagination_style:line=progress', 'pagination_style:square=ring', 'pagination_style:square=number', 'pagination_style:square=progress', 'pagination_style:ring=number', 'pagination_style:ring=progress', 'pagination_style:number=progress'],
  skipEveryControl: {reveal: true},
  addedEdit: {settings: {headline: 'Added tile', link: '/pages/added'}, check: async (t, id, {eq}) => { eq(await t.page.locator('[data-sd-block="' + id + '"] .ssg-headline').textContent(), 'Added tile'); eq(await t.page.locator('[data-sd-block="' + id + '"] .ssg-tile').getAttribute('href'), '/pages/added'); return 0; }},
  async extra({browser, mount, eq, ok}) {
    const A = ['live-social-dividers.js'];
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = 'shop grid ' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, 'social-shop-grid', {width, editing, assets: A, settings: {heading_font: VERDANA, body_font: VERDANA}, blocks: [{type: 'heading', settings: {text: 'Shop <strong>the feed</strong>'}}, {type: 'subheading', settings: {}}, {type: 'button', settings: {link: '/pages/follow'}}, ...TILES]});
      const sty = (sel, k) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], k);
      eq(await t.page.locator('#shopify-section-test .ssg-tile').evaluateAll(els => els.map(e => [e.tagName, e.getAttribute('href')])), [['DIV', null], ['A', PANTS.url], ['A', '/pages/three'], ['DIV', null]], where + ' tiles link to the product, else their own link, else nowhere');
      eq((await t.page.locator('#shopify-section-test .ssg-product').filter({visible: true}).allTextContents()).map(s => s.replace(/\s+/g, ' ').trim()), [PANTS.title + ' R$' + (PANTS.price / 100).toFixed(2)], where + ' product chip from the product picker');
      eq(await t.page.locator('#shopify-section-test .ssg-handle').filter({visible: true}).count(), 0, where + ' handle hidden while Show creator handle is off');
      eq(await t.page.locator('#shopify-section-test .ssg-platform-badge').count(), 1, where + ' platform badge');
      ok((await t.root('.ssg-follow').boundingBox()).height >= 44, where + ' follow link target 44px');
      if (editing) {
        const img = await t.page.locator('#shopify-section-test .ssg-tile img[data-sd-img]').first().elementHandle();
        await t.emit({show_handle: true, tile_radius: 20, column_gap: 20, overlay_strength: 60});
        eq((await t.page.locator('#shopify-section-test .ssg-handle').filter({visible: true}).allTextContents()).map(s => s.replace(/\s+/g, '')), ['A@ana'], where + ' handle pill live');
        const tid = t.blockId('tile', 3);
        await t.emit({username: '@bo', platform: 'tiktok', headline: 'Fresh', image: IMG}, tid);
        eq((await t.page.locator('[data-sd-block="' + tid + '"] .ssg-handle').textContent()).replace(/\s+/g, ''), 'B@bo', where + ' new handle live');
        eq(await t.page.locator('[data-sd-block="' + tid + '"] .ssg-platform-badge').getAttribute('aria-label'), 'TikTok', where + ' badge live');
        eq(await t.page.locator('[data-sd-block="' + tid + '"] .ssg-headline').textContent(), 'Fresh', where + ' headline live');
        eq(await t.page.locator('[data-sd-block="' + tid + '"] img[data-sd-img]').count(), 1, where + ' picture live');
        eq(await img.evaluate(el => el.isConnected), true, where + ' other pictures not reloaded');
        for (const [mode, sel] of [['masonry', '.ssg-tile-wrap:nth-child(1) .ssg-tile'], ['bento', '.ssg-tile-wrap:nth-child(1) .ssg-tile'], ['grid', '.ssg-tile-wrap:nth-child(1) .ssg-tile']]) {
          await t.emit({display_mode: mode});
          const r = await t.page.locator('#shopify-section-test ' + sel).boundingBox(), r2 = await t.page.locator('#shopify-section-test .ssg-tile-wrap:nth-child(2) .ssg-tile').boundingBox();
          if (mode === 'masonry') ok(r.height > r2.height * 1.2, where + ' masonry: first tile tall live');
          if (mode === 'bento') ok(width < 768 ? Math.abs(r.width - r2.width) < 2 : r.width > r2.width * 1.5, where + ' bento live');
          if (mode === 'grid') ok(Math.abs(r.height - r2.height) < 2, where + ' grid tiles even live');
        }
      }
      for (const m of ['live', 'redraw']) {
        const hid = t.blockId('heading'), pid = t.blockId('subheading'), bid = t.blockId('button');
        const apply = async (sec, h, p, b) => {
          if (m === 'live') { await t.emit(sec); await t.emit(h, hid); await t.emit(p, pid); await t.emit(b, bid); return; }
          const blocks = t.rendered[0].section.blocks.map(x => ({type: x.type, settings: {...x.settings, ...(x.id === hid ? h : x.id === pid ? p : x.id === bid ? b : {})}}));
          await t.redraw({settings: sec, blocks});
        };
        await apply({enable_custom_style: true, custom_section_bg: '#0000ff', custom_text_color: '#00ff00', accent_color: '#ff00ff', enable_custom_fonts: true, heading_font: FONT, body_font: FONT}, {enable_custom_style: true, color: '#ff0000'}, {enable_custom_style: true, color: '#ffff00'}, {});
        eq(await sty('.ssg-root', 'backgroundColor'), 'rgb(0, 0, 255)', where + ' ' + m + ' custom background');
        eq(await sty('.section__header-heading', 'color'), 'rgb(255, 0, 0)', where + ' ' + m + ' custom heading colour');
        eq(await sty('.section__header-des p', 'color'), 'rgb(255, 255, 0)', where + ' ' + m + ' custom text colour reaches the <p>');
        eq(await sty('.ssg-follow', 'color'), 'rgb(255, 0, 255)', where + ' ' + m + ' accent colour');
        eq(await sty('.ssg-headline', 'color'), 'rgb(0, 255, 0)', where + ' ' + m + ' tile headline colour');
        for (const sel of ['.section__header-heading', '.section__header-heading strong', '.section__header-des p', '.ssg-follow', '.ssg-headline']) ok(/Courier New/.test(await sty(sel, 'fontFamily')), where + ' ' + m + ' custom font on ' + sel);
        eq(await sty('.section__header-heading', 'fontWeight'), '300', where + ' ' + m + ' heading weight from the font');
        await apply({enable_custom_style: false, enable_custom_fonts: false}, {enable_custom_style: false}, {enable_custom_style: false}, {});
        eq(await sty('.ssg-root', 'backgroundColor'), 'rgb(24, 32, 40)', where + ' ' + m + ' theme background back');
        eq(await sty('.section__header-heading', 'color'), 'rgb(255, 255, 255)', where + ' ' + m + ' theme heading colour back');
        eq(await sty('.ssg-follow', 'color'), 'rgb(51, 102, 153)', where + ' ' + m + ' accent follows the primary colour');
        ok(/Georgia/.test(await sty('.section__header-heading', 'fontFamily')) && /Arial/.test(await sty('.section__header-des p', 'fontFamily')), where + ' ' + m + ' theme fonts back');
        eq(await t.page.locator('#shopify-section-test [data-own-font], #shopify-section-test [data-own-weight]').count(), 0, where + ' ' + m + ' no priority opt-outs left');
      }
      ok(await t.noOverflow(), where + ' no overflow');
      eq(t.errors, [], where + ' errors');
      await t.page.close();
    }
    /* carousel: the data the theme's slider reads, arrows and pagination */
    {
      const t = await mount(browser, 'social-shop-grid', {width: 1366, assets: A, settings: {display_mode: 'carousel'}, blocks: TILES});
      const sl = () => t.page.locator('#shopify-section-test slide-section').evaluate(el => [el.dataset.spacing, el.dataset.mobile, el.dataset.desktop, el.dataset.tablet, el.dataset.paginationStyle]);
      eq(await sl(), ['8', '2', '4', '3', 'pill'], 'shop grid carousel data');
      await t.emit({column_gap: 20, columns: 3, columns_mobile: 1, pagination_style: 'line', show_arrow: true, carousel_pagination: 'disable'});
      eq(await sl(), ['20', '1', '3', '3', 'line'], 'shop grid carousel data live');
      eq(await t.page.locator('#shopify-section-test [data-ssg-arrows]').isVisible(), true, 'shop grid arrows live');
      eq(await t.page.locator('#shopify-section-test [data-ssg-pagination]').isHidden(), true, 'shop grid pagination off live');
      await t.emit({carousel_pagination: 'show_dots', pagination_position: 'right'});
      eq(await t.page.locator('#shopify-section-test [data-ssg-pagination]').evaluate(el => [el.hidden, el.classList.contains('justify-content-right'), el.classList.contains('justify-content-center')]), [false, true, false], 'shop grid pagination on and right live');
      eq(t.errors, [], 'shop grid carousel errors');
      await t.page.close();
    }
    /* tile videos: on screen only, never under reduced motion */
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const t = await mount(browser, 'social-shop-grid', {width: 1366, editing: false, reducedMotion, assets: A, blocks: [{type: 'tile', settings: {video: VIDEO}}]});
      await t.page.evaluate(() => { for (const v of document.querySelectorAll('video')) { Object.defineProperty(v, 'paused', {get() { return !this.__on; }}); v.play = function () { this.__on = true; this.__played = (this.__played || 0) + 1; return Promise.resolve(); }; v.pause = function () { this.__on = false; this.__paused = (this.__paused || 0) + 1; }; } });
      await t.page.evaluate(() => { const st = [...window.MateriaSocialDividers.roots.values()][0]; st.videos(); });
      const v = () => t.page.locator('#shopify-section-test video').evaluate(el => [el.hasAttribute('autoplay'), el.__played || 0]);
      eq((await v())[0], false, 'shop grid video has no autoplay attribute (' + reducedMotion + ')');
      eq((await v())[1] > 0, reducedMotion !== 'reduce', 'shop grid video plays on screen only without reduced motion (' + reducedMotion + ')');
      if (reducedMotion !== 'reduce') {
        await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
        await t.page.waitForTimeout(250);
        eq(await t.page.locator('#shopify-section-test video').evaluate(el => el.paused), true, 'shop grid video pauses off screen');
        await t.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await t.page.waitForTimeout(250);
        eq(await t.page.locator('#shopify-section-test video').evaluate(el => el.paused), false, 'shop grid video plays again on screen');
      }
      eq(t.errors, [], 'shop grid video errors');
      await t.page.close();
    }
    /* legacy header settings, no header blocks */
    {
      const t = await mount(browser, 'social-shop-grid', {width: 1366, assets: A, settings: {heading: 'Old heading', subheading: 'Old eyebrow', handle_label: 'Old follow', handle_url: '/old'}, blocks: TILES});
      eq(await t.page.locator('[data-ssg-legacy="heading"]').textContent(), 'Old heading', 'shop grid legacy heading');
      eq(await t.page.locator('[data-ssg-legacy="follow"]').getAttribute('href'), '/old', 'shop grid legacy follow link');
      await t.redraw({blocks: [{type: 'heading', settings: {text: 'New'}}, ...TILES]});
      eq(await t.page.locator('[data-ssg-legacy="heading"]').count(), 0, 'shop grid heading block replaces the legacy heading');
      eq(await t.page.locator('[data-ssg-legacy="subheading"]').count(), 1, 'shop grid legacy eyebrow kept without an eyebrow block');
      eq(t.errors, [], 'shop grid legacy errors');
      await t.page.close();
    }
    for (const width of [375, 1366]) {
      const t = await mount(browser, 'social-shop-grid', {width, editing: true, assets: A});
      ok(!/@\w/.test(await t.page.locator('#shopify-section-test').innerText()), 'shop grid preview has no invented @handle');
      ok(await t.noOverflow(), 'shop grid preview no overflow ' + width);
      eq(t.errors, [], 'shop grid preview errors');
      await t.page.close();
    }
    return 0;
  },
}).catch(e => { console.error(e); process.exit(1); });
