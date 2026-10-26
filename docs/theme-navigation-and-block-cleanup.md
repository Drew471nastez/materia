# Navigation and block cleanup

Same-page section links now resolve normal IDs, imported section wrappers and
StoreLib section data attributes. The handler runs in the storefront and canvas,
accounts for visible sticky announcement/header stacks, closes the mobile menu,
supports nested scrolling, keeps keyboard focus on the destination and respects
reduced motion. External links, modified clicks and downloads retain their
normal behavior. The canvas tap fallback does not fire for a block drag.

Benefits Circles keeps content, grid, geometry and spacing controls together.
Section custom colors/type and block overrides are opt-in. The default is the
section scheme and theme typography. Its headings are semantic h2s; the old tag
setting is retained but hidden for saved configurations. Circles cannot overflow
their mobile grid. Links keep keyboard focus styling.

Variant Selector Pro groups content, spacing, custom style, grid, thumbnails,
typography, states and option overrides separately. Custom columns and card
padding now affect the rendered controls. Thumbnail padding remains independent.
The single-choice label-position control and superseded color toggle are hidden.
Meaningful existing setting IDs and values remain intact.

The combined Reviews/Sold block has been removed from Main product and Featured
product schemas and its standalone repository file deleted. Existing exported
instances are migrated to sold_counter; current exported pages had none. The
render alias remains sold-only so older saved content does not lose its count.
StoreLib may retain previously imported component records; removal from the
theme's section palettes is explicit. The two supported blocks are Reviews and
Sold counter, each with top/bottom spacing controls.

Sold counter's product mode reads the product's public custom.sold_count. When
enabled, it refreshes from the ordinary product page while visible, at most once
per minute, and updates only when that real field changes. Manual Verified count
mode remains fixed. No lists, random increments, rotating counts or made-up
sales are generated. This is not a paid-order analytics service: StoreLib must
maintain that public product field for automatic order-derived totals. Reviews
continues to use the product's real rating/count or explicit manual values.

The password template's existing Coming Soon section is rebuilt with scoped
styles, theme-default colors/type/buttons/fields, controlled media, responsive
signup, accessible labels and instance-safe IDs. Existing headings, copy, block
IDs and settings are kept. The signup uses the existing customer/subscribe
contract and shared form feedback; this does not implement or bypass password
authentication. Expired countdowns hide rather than restart. Background video
pauses offscreen, in hidden tabs and under reduced motion.

Local tests cover DOM behavior and request/response contracts. Live signup,
backend count maintenance and StoreLib editor integration still require
platform verification. GitHub imports are drafts, never automatic publication.
