# Bundle, cart and product media follow-up

This change preserves saved content, existing style choices and section IDs.
It does not publish the theme or change StoreLib's backend pricing/payment code.

- Cart +/- coalesces taps over 100ms instead of 260ms; typed quantities settle
  after 350ms instead of 650ms. Requests remain serialized and server-confirmed.
  Confirmed removals collapse over 110ms instead of 140ms. Network latency remains.
- A linked bundle replaces the normal page-product purchase even when that
  product was unchecked. An empty selection reports an error. Upsells alone
  still accompany the page product. Shared button icons and labels have separate
  grid areas; native Both-mode confirmations use the same selection signature.
- Accent outline, Editorial and Contrast panels are available on Bundle,
  Quantity offer and Upsell Pro in Main product, Featured product and standalone
  blocks. Existing custom-style switches override their tokens. Unselected
  available bundle lines remain full opacity, with dashed borders.
- Benefits Pills uses theme typography and section scheme by default. Its new
  Enable custom styling switch activates existing saved typography/colors and
  per-pill overrides. Layout settings always apply. All six section schemas
  containing this block expose the switch.
- The mobile menu uses its top-layer backdrop rather than two competing dims.
  The backdrop covers announcement bars and fades through closing; scrolling
  unlocks after the drawer has finished leaving. Reduced motion is respected.
- Video expansion works independently of image zoom settings. The viewer reads
  lazy video URLs and includes gallery images even in hover-zoom mode.
- The theme remembers the selected slide across same-product editor redraws.
  Offer controls do not trigger the parent variant picker's media replacement.
- Hover zoom initializes in Main product as well as Featured product, destroys
  every Drift instance on removal, reconnects cleanly, and uses an absolute
  external pane so it cannot insert space in the product information column.
- Vendor display accepts a vendor name object or string and escapes the name.

Local browser tests cover these theme behaviors, mock-cart requests and the
actual bundled Swiper/Drift libraries. Authenticated live pricing, inventory,
discount eligibility, checkout and wallet availability require platform tests.
The product unit price is not replaced by a misleading combined bundle total:
the offer summary shows the offer; cart/checkout show authoritative charges.

## Prompt: StoreLib commerce integration

Audit imported-theme bundle/upsell integration end to end. Use one documented
contract for product/variant IDs, availability, selected quantities, offer/group
metadata, discounts, currency and personalization. Main-button bundles must add
only selected lines; upsells must not duplicate the primary product. Price and
validate offers server-side; return authoritative line discounts, totals and
shipping eligibility to the product offer summary, cart drawer, cart page and
checkout. Preserve atomicity, idempotency and clear recoverable errors. Keep
editor previews and live rendering consistent without rebuilding unaffected
media or losing scroll/selection. Test concurrent changes, sold-out variants,
partial selections, rapid taps, multiple offers and mobile accessibility.

## Prompt: accelerated checkout

Implement provider-backed dynamic checkout for imported themes wherever
show_dynamic_checkout is enabled, including Main product and Featured product.
Use StoreLib's supported checkout integration to display eligible Apple Pay or
Google Pay controls, with Buy now as fallback. Never inject merchant credentials
or payment scripts from theme code. Resolve the current variant, quantity,
personalization and explicitly linked bundle/upsell selections once; preserve
server-validated discounts, inventory, taxes, shipping and required consent.
Expose a documented theme hook and preview-safe editor representation. Prevent
duplicate submissions and test supported/unsupported devices, currencies,
wallet cancellation, errors and product changes. Do not simulate wallet buttons
or bypass required cart terms.
