# Wavy, Title & Subtitle, Before & After Reveal

The five wavy silhouettes close at the SVG's full 1200-unit width. Both
edges and all animated keyframes use that same boundary. SVGs render as
blocks, avoiding the inline-image baseline gap at the panel join.

The saved type IDs now represent distinct shapes: Gentle swell, Rolling
waves, Fine ripples, Organic wave, and Sweeping arc. The authoring geometry
is in `scripts/wavy-shapes.cjs`; its static paths and animation frames are
embedded in the section for identical first paint and live updates.
Segment tangents match, and eased keyframes soften the animation reversal.
`tests/theme-wave-identities.cjs` compares sampled silhouettes pairwise in
static and animated states, rather than only comparing path strings.

Title and subtitle blocks use inline rich text; supporting text uses rich
text in a div, so paragraph formatting does not create nested paragraphs.
Section and block styling remain independent opt-ins. Reset theme spacing
does not cancel explicit section margin sliders.

Before & After Reveal uses a scoped, frame-batched controller. It handles
section/block settings events, attribute updates and replaced sections.
Unchanged images keep their source; arrow animation is not recreated for
unrelated setting edits. Blank image selections restore the placeholder.
Theme colour schemes, fonts and button hover effects are the defaults;
custom colours and native font pickers are opt-in. The legacy heading tag
ID is retained but hidden; headings render as h2.

Browser fixtures cover mobile/desktop and editor/storefront modes. They
cannot verify the private StoreLib canvas or live publishing. Check the
StoreLib import receipt after pushing; imports are drafts.

Tests:

- `tests/theme-wavy-title-controls.cjs`
- `tests/theme-before-after-controls.cjs`
- `tests/theme-text-sections.cjs`
- `tests/theme-text-sections-lifecycle.cjs`
