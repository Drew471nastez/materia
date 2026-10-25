# Selector, counter and newsletter changes

Previous native-offer fixes remain in main: `901c2df` and `26dcb13`. This work preserves that server-pricing integration.

## Controls for creators

- **Theme settings → Forms and fields → Quantity controls:** defaults follow the current scheme, body font and field borders. Enable custom quantity style to override background, text, border and corners. Switching it off restores each section's own scheme, including dark schemes, immediately.
- **Variant picker → Color swatch fill:** Theme, Colors or Images. An explicit block choice overrides the global fill choice. Images can be enabled even when the general color-swatch switch is off.
- **Variant Selector Pro → Enable custom style:** off by default. Geometry, typography, color and motion overrides are exposed under this switch. The old color-only flag is retained as a hidden compatibility setting; the single new switch governs custom styling. Functional content and fill choices remain separate.
- **Main product → Sticky Add to Cart → Show reviews in sticky cart bar:** off by default. Uses actual product review data. The mobile layout gets a compact rating row only when data exists; desktop uses the product summary.
- **Reviews** and **Sold counter** are independent, compact blocks on main and featured products. Each has its own source and optional style settings. Existing combined blocks remain available as “Reviews & sold (legacy)” so saved content is not lost.
- **Newsletter → Subscribed button label:** the confirmed success state replaces the label in place. The button reserves both label widths from the first render.

## Runtime fixes

Variant pickers exclude cm/in radios and chart JSON when reading product options/data. Peer pickers do not change chart units. Standard option availability supports both `option1…3` and `options[]`. String IDs retain their full precision. Scoped IDs prevent shared picker controls from targeting each other.

Quantity controls share lifecycle-safe listeners, integer min/max/step handling, disabled/focus states, tabular numbers and 44px actions. The legacy bundle control uses the same base behavior, and its preview total is scoped to its section.

The sticky-media observer stops retaining the largest historical header height and respects an explicit zero offset. It remeasures on header-offset changes in one queued animation frame rather than adding scroll work. cm/in tables share a grid area and preserve the larger table's dimensions; inactive tables remain inert and hidden from assistive technology.

Newsletter sections POST through Storelib's existing `/contact` JSON contract without navigation or section replacement. Confirmed success shows Subscribed; errors stay inline and preserve the address. Duplicate pending submissions are blocked. Other contact/footer/popup form behavior is unchanged.

## Preview covers and limits

Independent renderers were added for both variant pickers, the two new counter blocks and all nine current header block types. Header covers use selected product/collection/banner content, or a clearly schematic configuration preview when empty. They never redraw the whole product page.

Storelib controls whether its library invokes those files, passes a product/design-mode context and caches/renders a cover. Theme files cannot repair a missing platform thumbnail pipeline for every other block. Live builder/production checks remain separate from the local Chromium fixtures.

## Local verification

`theme-selectors-newsletter.cjs` covers 24 checks, including actual source renderers, quantity rules/reconnection/live custom styles, nested chart controls and JSON, string variant IDs, Quick View inside a dialog, Pro theme-vs-explicit image fills, separate counter data, all header covers, fixed chart geometry, header-offset removal and newsletter success/error without navigation or form replacement. Existing product-block, setting-wiring, cart quantity/drawer, forms/consent, size-guide and shared interaction suites also pass. No production subscription was created. Live requests from this environment still return HTTP 403.
