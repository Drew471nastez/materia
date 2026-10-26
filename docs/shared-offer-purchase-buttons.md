# Bundle and upsell purchase buttons

In Main product or Featured product, open Bundle, Quantity offer, Upsell Pro,
or Pair With Upsell. Under its button settings, **Purchase buttons** offers:

- **Block button** (default): preserve the existing independent action.
- **Main buttons**: hide the independent action and include the selection
  when the product's Add to cart or Buy now is pressed.
- **Both**: keep the independent action and enable the shared main action.

**Show block Add to cart button** can hide the independent control. Choose
Main buttons to connect the selection to the main purchase flow; hiding a
button alone does not silently opt extras into a normal purchase. Main mode
always hides independent controls. Upsell Pro uses checkbox selection in
shared modes; Pair With adds explicit Include checkboxes. Existing saved
settings are not switched into shared mode automatically.

## Behavior

The selected main variant, quantity, bundle set and checked accessories go
in one `/cart/add.js` items request. Identical variants use the largest
selected quantity rather than being added twice by overlapping controls.
Main quantity counts bundle sets; a selected quantity tier supplies its full
paid-plus-free unit count. Multiple native bundle offers get an explicit
choice. Product forms on different Main/Featured sections do not mix.

Associated required fields are validated and private image uploads use the
existing StoreLib upload transport. Personalization stays on the main line.
StoreLib remains authoritative for availability, prices, discounts and offer
competition. The theme never grants a discount itself.

The loading ring and stable button footprint share the theme button contract.
Duplicate presses are blocked. Errors stay visible without advancing checkout.
The existing Featured Product compatibility script leaves managed offer
controls alone, so it cannot race their loading/confirmation lifecycle.

## Buy now

Default single-product Buy now is unchanged unless an offer opts into shared
buttons. Shared Buy now first adds the combined selection, then activates the
existing cart checkout control. **Previously added cart items are included.**
Required cart terms are never accepted automatically: the drawer opens for
review when they need confirmation. Without an available drawer checkout
control, the normal cart page is the fallback. No new payment API is assumed.

## Verification

`node tests/theme-main-offer-buttons.cjs` exercises actual theme JavaScript
with native/manual offers, both button modes, Main/Featured isolation,
deduplication, quantity tiers, asynchronous offer data, personalization,
required fields, cart terms, checkout routing, and server errors.
Existing offer, block, upload/market and action-state suites cover regressions.
These use local API fixtures. Live StoreLib checkout, actual stock/discount
allocation, and order persistence still require authenticated platform testing.
All imports stay drafts until the creator publishes.
