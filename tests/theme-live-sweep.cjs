/* Offline re-run of the live-site sweep (andrewrullz.storelib.com, 375/768/1366).
   Each check below is a bug the sweep found on the live pages and the fix that
   closed it, read from the files so it cannot come back unseen:

   1. Locale strings a template looks up with `| t` interpolate {{ name }}; a
      single-brace "{terms}" was printed as is ("{terms}: {count} results" on
      /search).
   2. Empty image settings fell back to pictures hot-linked from unrelated
      WordPress sites (2dbags.co, numedicousa.com, grabthetorch.org) on every
      page view; the shared placeholders are inline now.
   3. Footer social icons linked to "#" (the theme settings hold "#" for an
      unset network); an icon shows only for a real address, or in the builder.
   4. "Shop" buttons with no link went to "#" (image-with-text-steps,
      image-and-video-text); they fall back to the all products page.
   5. The blog hero with no article picked showed "Featured Blog Title" and a
      Read more link to the current page; it renders only with an article, or
      in the builder.
   6. Collection titles broke inside a word on a phone ("Activewea r").
   7. Ingredient cards squeezed four to a row at 768px broke words and clipped
      their text; the slideshow text ran over the picture at 768-991px.
   And for every file the sweep changed: the format line, balanced template
   tags, and no inline on* handlers.

   node tests/theme-live-sweep.cjs */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const list = d => fs.readdirSync(path.join(root, d)).map(f => path.join(d, f));
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('ok', name); };

const TOUCHED = [
  'snippets/social-icons.storelib', 'snippets/placeholder-render.storelib',
  'snippets/happy-customers.storelib', 'sections/before-and-after-reveal.storelib',
  'sections/featured-blog-header.storelib', 'sections/image-with-text-steps.storelib',
  'sections/image-and-video-text.storelib', 'sections/main-list-collections.storelib',
  'sections/content-tabs.storelib', 'sections/slideshow.storelib',
];
const THIRD_PARTY = /https?:\/\/(?:2dbags\.co|numedicousa\.com|www\.grabthetorch\.org)\//;

// 1. Locale keys used by templates never carry a single-brace placeholder.
check('locale strings read by templates interpolate {{ }}', () => {
  const code = ['sections', 'snippets', 'layout', 'blocks']
    .filter(d => fs.existsSync(path.join(root, d)))
    .flatMap(list).filter(f => f.endsWith('.storelib')).map(read).join('\n');
  const used = new Set([...code.matchAll(/['"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)['"]\s*\|\s*t\b/g)].map(m => m[1]));
  const bad = [];
  for (const file of list('shopify/locales')) {
    if (!file.endsWith('.json') || file.endsWith('.schema.json')) continue;
    const walk = (o, key) => {
      if (typeof o === 'string') {
        const base = key.replace(/\.(zero|one|two|few|many|other)$/, '');
        if (used.has(base) && /(^|[^{])\{[a-z_]+\}(?!\})/.test(o)) bad.push(`${file} ${key}: ${o}`);
      } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, key ? `${key}.${k}` : k);
    };
    walk(JSON.parse(read(file)), '');
  }
  assert.deepEqual(bad, [], 'single-brace placeholders print as text:\n' + bad.join('\n'));
  assert.ok(used.has('templates.search.results_with_count'), 'the search toolbar string is still looked up');
});

// 2. Shared placeholders are inline, never hot-linked.
check('placeholders ask nothing of a third-party server', () => {
  for (const f of ['snippets/placeholder-render.storelib', 'snippets/happy-customers.storelib',
    'sections/before-and-after-reveal.storelib', 'sections/featured-blog-header.storelib']) {
    const src = read(f);
    assert.ok(!THIRD_PARTY.test(src), `${f} hot-links a placeholder`);
    assert.ok(src.includes('data:image/svg+xml,'), `${f} has its inline placeholder`);
  }
  const svg = read('snippets/placeholder-render.storelib').match(/src="(data:image\/svg\+xml,[^"]+)"/)[1];
  assert.ok(!/["'<>#]/.test(svg.slice('data:image/svg+xml,'.length)), 'data URI is fully escaped for attributes, CSS and Liquid strings');
});

// 3. Social icons: one guard per network, each refusing "#".
check('social icons skip unset ("#") networks outside the builder', () => {
  const src = read('snippets/social-icons.storelib');
  const guards = [...src.matchAll(/\{%-\s*if ((?:settings|s)\.[a-z_]+) != blank([^%]*)-%\}\s*\n\s*<li/g)];
  assert.ok(guards.length >= 17, `found ${guards.length} network guards`);
  for (const [, v, rest] of guards) {
    assert.ok(rest.includes(`and ${v} != '#'`) && rest.includes('or request.design_mode'), `${v} guard: ${rest.trim()}`);
  }
});

// 4. Shop buttons never fall back to "#".
check('shop buttons fall back to the all products page', () => {
  for (const [f, key] of [['sections/image-with-text-steps.storelib', 'bs.url'], ['sections/image-and-video-text.storelib', 'bs.link']]) {
    const src = read(f);
    assert.ok(src.includes(`href="{{ ${key} | default: routes.all_products_collection_url }}"`), f);
    assert.ok(!src.includes(`{{ ${key} | default: '#' }}`), `${f} still defaults ${key} to #`);
  }
});

// 5. Blog hero renders only with an article (or in the builder).
check('blog hero hides without an article', () => {
  const src = read('sections/featured-blog-header.storelib');
  const open = src.indexOf('{%- if fbh_has_article or request.design_mode -%}');
  const end = src.indexOf('<!-- ti-theme:end -->');
  assert.ok(open > 0 && end > open, 'guard opens before the markup');
  assert.ok(src.slice(open, end).includes('class="featured_link3"'), 'Read more sits inside the guard');
  assert.ok(/\{%- endif -%\}\s*<!-- ti-theme:end -->/.test(src), 'guard closes after the markup');
  assert.ok(/if block\.settings\.article\.url != blank\s+assign fbh_has_article = true/.test(src));
});

// 6 and 7. Layout rules.
check('collection titles wrap between words', () => {
  const src = read('sections/main-list-collections.storelib');
  assert.ok(/\.collection-item__name-inner \{\s*word-break: normal !important;\s*overflow-wrap: normal !important;\s*hyphens: auto;/.test(src));
  assert.ok(/@media \(max-width: 767px\) \{\s*#shopify-section-\{\{ section\.id \}\} \.collection-item__name \{ --mb-padding-x: 12px; \}/.test(src));
});
check('tablet steps for ingredient cards and slideshow text', () => {
  assert.ok(/@media \(min-width: 768px\) and \(max-width: 1023px\) \{\s*#shopify-section-\{\{ sid \}\} \.ctabs__track \{\s*--ctabs-per: min\(\{\{ st\.cards_desktop \| default: '3\.5' \}\}, 2\.5\);/.test(read('sections/content-tabs.storelib')));
  assert.ok(/@media \(min-width: 768px\) and \(max-width: 991px\) \{\s*#shopify-section-\{\{ section\.id \}\} \.sec__content-inner\.max-w-custom \{\s*max-width: max\(var\(--max-width, 100%\), 60%\);/.test(read('sections/slideshow.storelib')));
});

// Format, balanced tags and no inline handlers in every file the sweep changed.
const PAIRS = { if: 'endif', unless: 'endunless', for: 'endfor', case: 'endcase', capture: 'endcapture', comment: 'endcomment', style: 'endstyle', javascript: 'endjavascript', schema: 'endschema', raw: 'endraw', form: 'endform', paginate: 'endpaginate' };
const CLOSERS = new Set(Object.values(PAIRS));
function tags(src) {
  const out = [];
  for (const m of src.matchAll(/\{%-?\s*([\s\S]*?)\s*-?%\}/g)) {
    const body = m[1];
    const word = body.split(/\s+/)[0];
    if (word === 'liquid') {
      let inComment = false;
      for (const line of body.split('\n').slice(1)) {
        const w = line.trim().split(/\s+/)[0];
        if (w === 'comment') inComment = true;
        else if (w === 'endcomment') inComment = false;
        else if (w && !inComment && !w.startsWith('#')) out.push(w);
      }
      // The first line may carry a tag too: {%- liquid assign ... -%}
      const first = body.split('\n')[0].trim().split(/\s+/)[1];
      if (first) out.push(first);
    } else out.push(word);
  }
  return out;
}
check('changed files keep the format and balanced tags', () => {
  for (const f of TOUCHED) {
    const src = read(f);
    assert.equal(src.split('\n')[0], '<template compat="shopify">', `${f} line 1`);
    assert.ok(/\n<\/template>\s*(\n<schema>[\s\S]*<\/schema>\s*)?$/.test(src), `${f} ends with </template> (and its schema)`);
    const markup = src.slice(0, src.lastIndexOf('</template>')).replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
    const stack = [];
    for (const t of tags(markup)) {
      if (PAIRS[t]) stack.push(t);
      else if (CLOSERS.has(t)) {
        const open = stack.pop();
        assert.equal(PAIRS[open], t, `${f}: ${t} closes ${open}`);
      }
    }
    assert.deepEqual(stack, [], `${f}: unclosed ${stack.join(', ')}`);
    const schema = src.match(/<schema>([\s\S]*)<\/schema>/);
    if (schema) JSON.parse(schema[1]);
  }
});
check('no inline on* handlers added', () => {
  for (const f of TOUCHED) {
    const n = (read(f).match(/<[a-z][^>]*\son[a-z]+\s*=/gi) || []).length;
    // slideshow carries one from the theme already (a stylesheet <link onload>); none new.
    const allowed = { 'sections/slideshow.storelib': 1 }[f] || 0;
    assert.ok(n <= allowed, `${f} has ${n} inline handler(s)`);
  }
});

// Informational: what still hot-links a placeholder (not failing; each loads
// only when that section's image is empty).
const left = ['sections', 'snippets'].flatMap(list).filter(f => THIRD_PARTY.test(read(f)));
console.log(`note: ${left.length} other files still hot-link a placeholder when their image is empty`);
console.log(`theme-live-sweep: ${passed} checks passed`);
