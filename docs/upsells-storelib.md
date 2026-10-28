# Storelib offers: authoritative pricing contract

The platform prices the cart and checkout. Theme settings, discount labels and _sl_* properties never authorize a discount.

## Offer data

Product blocks read product.metafields.storelib.offers.value directly. Without it, one shared GET /api/offers?product=<id> supplies bundles, quantityBreaks and checkoutOffers. The page cache expires after 60 seconds. Empty arrays mean no active offer. No older per-kind endpoint is requested.

Storelib's returned bundle fullCents/priceCents describe its default variants in the store currency. Changing a bundle variant, excluding an item or using a market hides that quote; the confirmed cart is authoritative. A manual buy-together set without an active offer shows full prices, never its old discount_percent setting as an actual saving.

Native quantity tiers display backend labels and badges. For the selected variant, store-currency totals use integer hundredths: round the percent-adjusted unit, multiply by paid quantity, then subtract a fixed amount once per tier block. Free quantity is included in the single submitted line. Compare is the full price of paid plus free units, except a plain tier can use the variant's compare-at price. The platform handles repeated/largest-fitting tiers, cheapest free units, cross-line grouping and competing offers.

In a market, free-unit totals use the shown variant price. Amount/percent tiers show their label rather than subtracting a store-currency amount from a converted price. All money formatting goes through the theme's Shopify formatter / Liquid money filters, including JPY's Shopify hundredths.

## Product price and offer totals

The shared Main/Featured product price block shows only the selected product variant price. It does not append a second Product price label or a combined Selected total. Price-in-button labels and sticky bars also retain the selected variant price. A quantity tier shows its pack total and per-item price inside that tier; a bundle shows its total in the bundle block; upsells show their item prices and, in selected-items mode, their own selection total.

Purchase-button linking still combines the chosen lines and quantities into one cart request. Display separation does not disable offer metadata, backend-authorized discounts, uploaded personalization or checkout routing. Cart and checkout display server-confirmed line prices, allocations and totals, never a theme-side sum of potentially competing promotions. Legacy summary labels remain stored but hidden from the sidebar, and stale summary DOM is removed on editor initialization/redraw.

## Cart and checkout

Every mutation redraws from returned sections and/or /cart.js. Lines display final_line_price, strike original_line_price only when lower, and list actual line_level_discount_allocations. The total and shipping threshold use cart.total_price, after offers and codes. Quantity inputs/counts can respond immediately; monetary totals never extrapolate the previous unit price across a new tier.

Codes are posted through /cart/update.js discount. All retained discount_codes are shown, including applicable:false, and can be removed. Automatic offer savings come from allocations, not code chips.

_sl_offer_id identifies the offer for reporting. _sl_offer, _sl_group, _sl_paid_qty, _sl_free_qty and _sl_discount are optional reporting metadata, not pricing instructions. Cart lines remain keyed by the server's full line key; product-level quantities sum every matching product_id.

## Product data and previews

Bundle, quantity_offer, upsell_pro, review_and_sold and product_custom_field have independent blocks/*.storelib renderers, as do size_guide and size_table. Main and featured products share these snippets. Active quantity tiers also attach to cards and quick-add forms, and buy boxes without an explicit quantity block.

Personalization uses multipart product forms. Scripted offer additions first validate the associated form and upload selected files through /cart/upload, then pass the returned private upload value as a line property. Upload properties render as same-browser thumbnail links; underscore-prefixed properties remain hidden. Backend validation/messages remain authoritative. Images can be required independently of text.

Assigned charts support columns, rows, rows_cm/rows_in, tables.cm/tables.in, units and measuring_guide. Product review stars read reviews.rating and rating_count, with storelib.reviews average/count fallback. No second aggregateRating is emitted.

## Verification

Run tests/theme-storelib-contract.cjs with LIQUIDJS pointing to LiquidJS. It exercises the actual independent blocks and theme JavaScript at 390px and desktop, native tier calculations, one-line free-unit submission, upload transport, variant selectors, market guards and the single offers endpoint. Cart mutation and product-data suites cover the shared integration.

Live builder, real inventory/upload validation, checkout/order persistence, multi-currency rounding and offer competition must also be verified against the published platform. A mocked API is not proof of a production checkout. Imports stay drafts until the merchant publishes.
