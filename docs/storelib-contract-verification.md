# Native commerce integration verification

## Verified locally

The actual independent block renderers and theme assets run in Chromium at 390px and 1366px against the supplied API contract. `theme-storelib-contract.cjs` covers 31 assertions, including:

- Paid/free quantities in one line, per-block amount discounts and half-up unit rounding.
- $36 tiers displaying $72 for 2+1 and $108 for 3+2.
- EUR 32.99 displaying EUR 65.98 for 2+1, without converting a fixed store-currency discount in the browser.
- RON formatting and JPY hundredths through the existing Shopify money formatter.
- A shared native offers request, server metafield payloads and isolated blocks.
- Required uploads, multipart upload transport, private returned line-property values and thumbnails.
- Original/final server line totals, allocation amounts, unpublished/inapplicable code state and hidden reporting properties.
- Native review data fallback and assigned size-chart tables/measuring guide.

Additional passing suites: 15 legacy bundle/quantity compatibility checks (no local discount authorization); 17 upsell/offer checks; 9 cart-drawer checks; 9 quantity/navigation checks; 20 product-card groups; 16 product-data/media checks; 14 product-block checks; 25 shared browser interactions. Schema parsing and theme-setting wiring checks also pass.

Old quantity-break assumptions in the upsell suite were moved to the dedicated native-contract suite. The compatibility suite now explicitly checks that local percentages do not create discounts. Cart tests include `total_price` and require only confirmed server amounts rather than intermediate interpolated prices.

## Not verified against production

Requests to `andrewrullz.storelib.com` from this environment return HTTP 403. There is no authenticated Storelib builder/browser connector here. No live cart was changed, no checkout was completed and nothing was published.

The remaining production acceptance steps are the supplied 3/5/8-unit checkout examples; cross-line cheapest-free allocation; competing bundle/quantity offers; real stock/per-order 422 responses; upload content/dimension/rate limits; persistence to checkout/order; actual store/market currency rounding; and isolated previews/settings changes in the authenticated builder. Those require the real platform, not a mocked response.

The theme trusts those platform results and displays their allocations and `cart.total_price`. Local tests are not evidence that an order was charged correctly. All imported files must remain drafts until those checks are completed by the creator or an authenticated test session.
