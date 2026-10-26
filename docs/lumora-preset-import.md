# Lumora preset on the current Materia implementation

This is a data-only preset transfer from `Materia Lumora 1.2.0 (3).zip`.
No ZIP CSS, JavaScript, Liquid, section definitions, block definitions,
locales, or theme-setting schemas were installed. The current Materia fixes
and StoreLib integrations remain the implementation.

## Transferred

- Lumora's 15 page templates and header, footer, and overlay arrangements.
- Its colors, typography, button appearance, layout values, content and blocks,
  adapted to the current schemas without removing existing setting definitions.
- Missing image/video fields cleared; demo-image fallback explicitly off.
  The current theme may draw its normal empty-media placeholders. Real
  product media continues to come from existing StoreLib products.

## Preserved and adapted

- Existing menus, StoreLib compatibility metadata, native review integration,
  account/checkout implementation, and policy pages retained.
- Existing featured-product connection retained. Unavailable demo selections
  cleared; demo shopping links route to `/collections/all` rather than a
  nonexistent product or collection. No products or collections were created.
- Empty external Shopify app slots omitted instead of replacing native apps.
- Preset text colors with insufficient contrast against their solid background
  adjusted for the no-image layout. Background palettes were not replaced.

The machine-readable report records the original Git commit, every affected
file, cleared selection/media field, schema adaptation, and color adjustment.
The original layouts remain recoverable from that commit. Imported copy and
unassigned optional product blocks should be reviewed in the builder before
publishing.

## Checks

`node tests/theme-lumora-preset.cjs` validates page/section/block references,
setting IDs and values, preserved integrations, and unchanged implementation.
`LIQUIDJS=<installed liquidjs> node tests/theme-lumora-preview.cjs` renders the
actual hero template in Chromium at 375, 768, and 1440 pixels, checking the
catalog link and no-image layout. These are local checks; StoreLib's import
note is the platform compile confirmation. Changes are drafts, never published
by this migration.
