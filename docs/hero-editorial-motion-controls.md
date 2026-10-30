# Hero Pro 1 and editorial controls

The 2026-10-30 pass keeps existing section/block IDs and saved content. Changes
are draft-only; StoreLib's import receipt is checked after pushing.

- Hero Pro 1 tracks the pointer with a short, time-based interpolation and
  constant image overscan. Entering/leaving no longer changes image scale.
  Its own entrance handler owns the reveal, rather than also revealing the
  outer section wrapper. Delayed entrances use backwards fill to prevent a
  visible frame before a delayed entrance starts. Editor changes still do not
  replay entrances automatically.
- Slideshow pointer/scroll initialization is deferred until its markup exists,
  reinitializes after replacement, cleans up removed roots, and respects touch,
  reduced motion, visibility, and viewport intersection. Live typography,
  colour, button and content alignment edits do not rebuild Swiper. Structural
  slide/media controls continue to use the native template/builder redraw.
- Brand Info, Inline Image Heading and Quote Banner have scoped live control
  handlers, native font pickers, scheme defaults, opt-in custom colours/fonts,
  and grouped schemas. Existing control IDs are retained. Brand Info remains
  an editorial text link, not a newly styled button. Inline Image Heading's
  old HTML tag field is retained but hidden; it renders an h2.

Local regression commands (Playwright and LiquidJS required):

```sh
node tests/theme-hero-parallax.cjs
node tests/theme-hero-pro-editor-redraw.cjs
node tests/theme-marketing-sections.cjs
node tests/theme-editorial-controls.cjs
node tests/theme-slideshow-live.cjs
node tests/theme-slideshow-controls.cjs
node tests/theme-slideshow-effects.cjs
node tests/theme-hero-preview-stability.cjs
node tests/theme-marketing-previews.cjs
```

These use real repository templates/assets with fixture data in Chromium.
They do not establish performance on every physical device or verify the
private StoreLib builder. Recheck the imported draft in the canvas and in
preview before publishing: move across the hero image, leave it, drag settings,
exercise each slide effect, use touch/keyboard navigation, and try custom
colours/fonts with a dark scheme and mobile canvas width.
