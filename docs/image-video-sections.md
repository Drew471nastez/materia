# Image and video sections: theme-first pass

The 23 sections in the "Image and video" category plus the four before/after
sections (Images, Reveal, Slider, Slider 2) follow the Before And After Reveal
approach.

- Colour schemes, theme fonts and weights, Theme settings > Buttons (colours,
  radius, padding, hover effect) are the defaults. Custom colours sit behind
  `enable_custom_style` (section and block), custom fonts behind
  `enable_custom_fonts` with native font pickers. Turning either off restores
  the theme values.
- Schemas run General (colour scheme first), Content, Layout, Media,
  Appearance, Typography, Animation, Desktop spacing, Mobile. Dependent
  controls use `visible_if`. HTML tag selects and legacy ids are hidden, never
  removed; headings render h2 with h3 inside.
- Live editing: `shopify/assets/media-live-<group>.js`, loaded by the layout on
  every page. Each controller is scoped per section instance, batches paints per
  frame, only writes values that changed, keeps images, videos and running
  animations in place, and re-initialises once on `storelib:section-load`.
  Interactive behaviour (comparison sliders, carousels, marquee, video
  playback) lives there too, not in inline scripts.
- Saved instances: the four Image & Video with Text sections on home and about
  carry `enable_custom_style: true` on the section and blocks so they keep
  their own colours.

Tests (`LIQUIDJS=<path to liquidjs> node tests/<file>`), all using
`tests/media-fixture.cjs` in Chromium at 375 and 1366, editor and storefront:
`theme-media-before-after`, `theme-media-reveal`, `theme-media-galleries-a`,
`theme-media-galleries-b`, `theme-media-image-video-{image,video,video2}`,
`theme-media-benefits`, `theme-media-text-grid`,
`theme-media-stats-reels-{stats,steps,reels,video}`.

Not verified here: the private Storelib builder canvas and its exact live
payload shapes, real Shopify video and font_face output, YouTube/Vimeo
postMessage control, physical touch devices. Pushes are drafts until the
creator presses Publish.
