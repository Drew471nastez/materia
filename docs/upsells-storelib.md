# Upsells, bundles and offers on Storelib

What the theme's upsell and offer blocks do, what Storelib does with what they
send, and what is still missing on the platform side. Storelib does not read
`docs/`, so this file stays in the repository only.

Sources: Storelib's developer docs (storelib.com/developers, /selling,
/physical-commerce, /imported-shopify-themes, llms-full.txt, read 24 October
2026) and the theme's code. Nothing here was checked against a live store.

## The short answer

| Block | Shown price | What checkout charges today |
| --- | --- | --- |
| Bundle | Real variant prices; saving from the store's own Storelib bundle when one has exactly these products, else the block's "Saving shown" | **Saving applied** when the store has that bundle under Products › Upsells and bundles (checkout takes it off each complete set by itself). Otherwise full price, unless the block's discount code is accepted |
| Quantity offer (quantity breaks, Buy X get Y free) | Real variant price × paid quantity, free items at 0, compare and "You save" worked out from the variant | **Full price for every unit**, free ones included, unless the tier's discount code is accepted. Storelib has no quantity break or BOGO offer type |
| Upsell Pro | Real prices of each product and chosen option | Full price. A Storelib **checkout offer** for one of those products is applied at checkout by its own rules |
| Pair with | Real option prices, store currency | Full price |
| Product add-on | Real price | Full price |

Storelib's checkout works every price out again on the server, from its
database, when the buyer opens checkout and when they pay. It reads only
product, variant and quantity from the cart. Nothing a theme sends about a
price, and no line item property, changes a charge.

## How each block reads its data

- **Bundle** (`snippets/product-offers.storelib`, `<product-bundle>`): this
  product plus up to three picked with `product` settings. Each line's
  options carry `data-price`, `data-compare` (compare at) and
  `data-available` from the variants. On load the script asks
  `GET /api/offers/bundles?product=<product id>` (documented by Storelib) and
  looks for a bundle whose items are exactly the block's products. When it
  finds one, that bundle's `discountType`/`discountValue` (percent, or the
  set's `fullCents - priceCents` for an amount) replaces the block's own
  "Saving shown", the block shows its checkout note, and its `offerId` goes on
  every line. The saving is shown only when every line is ticked, as Storelib
  takes it off complete sets only.
- **Quantity offer** (`<quantity-offer>`): the product's variants as JSON in
  the block, following the product form's selected variant. Each tier has a
  quantity paid for, free items, a percent "Saving shown", label, badge and
  optional code. Total = price × (100 − percent)% × paid; compare = price ×
  (paid + free), or compare at price × quantity for a plain tier; "You save"
  = compare − total. It also asks `GET /api/offers/quantity-breaks?product=`
  (not a Storelib endpoint yet, see the prompt below); a 404 leaves the
  block's own numbers.
- **Upsell Pro** (`snippets/upsell-pro.storelib`, `<upsell-pro>`): manual
  products, then recommended ones (the shop's recommendations, the
  product's collection, all products). Each option carries its price, compare
  at and stock. Add mode **Each card** puts one Add on each card; **Tick and
  add** shows ticks, a live total and one Add selected to cart.
- **Pair with** (`<pair-with>` in `snippets/product-info-blocks.storelib`):
  up to five products, option prices from the options. The old Display
  currency and Conversion rate settings are kept but no longer used: Storelib
  charges in the store's currency, and a typed rate showed prices nobody pays.
- **Product add-on**: one product ticked to add it, unticked to take it out.

All of them use `shopify/assets/product-offers.js` (the add-on keeps its own
small script), so variant ids stay strings (Storelib ids are not numbers).

## What they send to the cart

One `POST /cart/add.js` per press, JSON:

```json
{
  "items": [
    {
      "id": "<variant id, a string>",
      "quantity": 3,
      "properties": {
        "_sl_offer": "quantity_break",
        "_sl_offer_id": "",
        "_sl_group": "qty-lzq1ab2",
        "_sl_block": "<block id>",
        "_sl_source": "<product id of the page>",
        "_sl_tier": "2",
        "_sl_paid_qty": "2",
        "_sl_free_qty": "1",
        "_sl_discount": "free"
      }
    }
  ],
  "sections": ["<cart drawer section ids>"],
  "sections_url": "/products/<handle>"
}
```

| Property | Sent by | Value |
| --- | --- | --- |
| `_sl_offer` | all | `bundle` (complete set), `bundle_partial` (some lines unticked, no saving), `quantity_break`, `upsell`, `pair`, `addon` |
| `_sl_offer_id` | bundle, quantity break | The Storelib offer id when the platform listed a matching offer, else empty (and then left out) |
| `_sl_group` | all | One id per press, the same on every line of that add, so a set can be told apart from the same items added on their own |
| `_sl_block` | all | The theme block's id |
| `_sl_source` | all | The product whose page it was added from |
| `_sl_tier` | quantity break | 1 to 4 |
| `_sl_paid_qty`, `_sl_free_qty` | quantity break | Units charged and units free; `quantity` is their sum |
| `_sl_discount` | bundle, quantity break | What the page showed: `percent:15`, `amount:500` (cents), `free`, or empty |

Empty properties are left out, and a plain tier (one item, no saving) sends
no properties, so it merges with a normal Add to cart line. Properties
starting with `_` are hidden in the theme's cart. When Quantity offer sets
the product form's quantity, it also writes the same properties into the form
as hidden `properties[...]` inputs, so the main Add to cart and Buy now carry
them. A tier or bundle discount code, when set, is then sent with
`POST /cart/update.js` `{"discount": "<codes>"}`, the way the theme's cart
discount box sends it.

After the add, the drawer is redrawn from the `sections` in the answer,
counts refresh from `/cart.json`, and the drawer opens (Bundle, Quantity
offer, Upsell Pro Tick and add always; Upsell Pro Each card and Pair with when
"Open cart drawer after add" is on).

## What Storelib does at checkout today

From the docs: checkout reads each line's product, variant and quantity
(`items` is `[productId, variantId, quantity]` and "nothing else in it is
read"), checks stock, then applies

1. the store's **bundles** (a percent off each item of every complete set, or
   an amount off each set) and **checkout offers** (a percent or amount off
   one item while the cart holds something else), each unit at most once;
2. a **discount code**, if one was entered, on what each line costs after 1;
3. shipping and tax.

## What does not apply automatically

- **Quantity breaks and Buy X get Y free.** No such offer type exists in
  Storelib. Free units are charged. The only way today is a discount code per
  tier, made in Storelib to match what the tier shows, and the shopper must
  end up with that code at checkout.
- **A bundle the store has not made in Storelib.** The block's "Saving
  shown" is display only; make the same bundle under Products › Upsells and
  bundles (same products) and the block shows Storelib's own saving instead.
- **Discount codes sent from the cart.** The docs list `/cart/update.js` as
  setting quantities and the note; they do not say it takes `discount` or
  that a code in the cart reaches checkout. Until that is confirmed, the code
  may have to be typed at checkout.
- **Line item properties at checkout.** The cart keeps them, checkout drops
  them, so orders do not record which offer a line came from.
- **Upsell Pro, Pair with and the add-on** never discount anything unless a
  Storelib checkout offer or bundle covers those products.

## Prompt for the Storelib platform

Paste this into a Claude session working on the Storelib platform codebase:

````text
Goal: imported themes on Storelib websites sell with quantity breaks, Buy X
get Y free and bundles, and Storelib checkout must charge exactly what the
theme showed, every time, without trusting the browser.

Today (per the developer docs): store_offers has two kinds, bundle and
checkout offer. Checkout reads cart lines as [productId, variantId, quantity]
and applies bundles to complete sets, checkout offers to one item, then a
discount code. Cart lines accept `properties` on /cart/add(.js) but checkout
drops them. GET /api/offers/bundles?product=<id> lists a product's bundles.

The Materia theme already sends, on every line an offer adds, these line item
properties (strings; keys starting "_" are hidden in carts):
  _sl_offer      bundle | bundle_partial | quantity_break | upsell | pair | addon
  _sl_offer_id   the store_offers id when the theme got one from the API
  _sl_group      one id per add, shared by every line of that add
  _sl_block      theme block id
  _sl_source     product id of the page it was added from
  _sl_tier       quantity break tier, 1-4
  _sl_paid_qty   units charged
  _sl_free_qty   units free (quantity = paid + free)
  _sl_discount   what the page showed: "percent:15", "amount:500" (cents), "free"
It reads GET /api/offers/bundles?product=<id> and, when it exists,
GET /api/offers/quantity-breaks?product=<id>, and shows the platform's numbers
when an offer matches. It also posts {"discount": "CODE,CODE2"} to
/cart/update.js after an add when the creator set a code.

Build, with tests:

1. Offer kinds. Add to store_offers (and the admin under Products > Upsells
   and bundles) a "quantity_break" kind: one product (or a collection), up to
   6 tiers, each { quantity (paid), freeQuantity, discountType: percent |
   amount | none, discountValue, label, badge }. Buy X get Y free is a tier
   with freeQuantity > 0. Validate: quantity >= 1, freeQuantity 0-10,
   percent 0-90, amount in cents >= 0, tiers strictly increasing.

2. Read endpoint, public, cached like /api/offers/bundles:
   GET /api/offers/quantity-breaks?product=<product id>
   -> { "offers": [ { "offerId": "...", "productId": "...", "title": "...",
        "tiers": [ { "quantity": 2, "freeQuantity": 1, "discountType": "none",
        "discountValue": 0, "label": "Buy 2 get 1 free", "badge": "Most popular",
        "unitPriceCents": 3600, "totalCents": 7200, "compareCents": 10800 } ] } ] }
   Prices from the product's default variant; the theme recomputes per variant
   with the same formula (below). Only active offers on published products.
   Also add GET /api/offers?product=<id> returning { bundles, quantityBreaks,
   checkoutOffers } in one call.

3. Checkout pricing (server, the one source of truth; never read prices or
   discounts from properties). After loading lines and before discount codes:
   - quantity breaks: for each product with an active quantity_break offer,
     sum its units across the cart (all variants of that product, all lines,
     whatever their properties), pick the highest tier whose (quantity +
     freeQuantity) <= units, and apply per full tier block: freeQuantity units
     at 0 (cheapest units free first), discountType percent/amount on the paid
     units. Leftover units beyond whole tier blocks are charged full price, or
     re-enter the tier search (document which; "repeat the best tier, then the
     next one down for the rest" is what shoppers expect).
   - keep the existing bundle and checkout-offer steps, and the rule that a
     unit gets at most one offer: choose the larger saving per unit.
   - then discount codes as today.
   Show each saving as its own line in the checkout summary, named by the
   offer label.

4. Cart and checkout carry properties. Keep line `properties` from
   /cart/add(.js) in the cart cookie (they already exist on the cart), keep a
   line with different properties as a separate line, return them in /cart.js
   as `properties`, and extend the checkout `items` encoding to
   [productId, variantId, quantity, properties?] so the order stores them on
   its line items (order page, order emails, admin, exports). Properties stay
   informational: _sl_offer_id and _sl_group let the admin report which offer
   sold what; they never decide a price.

5. Discount codes from the cart. Make POST /cart/update(.js) accept
   "discount" (comma separated codes), keep the codes on the cart, return them
   in /cart.js as discount_codes [{ code, applicable }], and carry them into
   /checkout so the buyer does not retype them. Reject unknown codes with
   applicable: false rather than an error.

6. Imported theme parity. In the Liquid engine, expose for the product page:
   product.metafields.storelib.offers.value = the same JSON as
   GET /api/offers?product=, and cart.items[].properties, so a theme can draw
   offers server side.

7. Tests: a cart with 3 units of a product whose offer is "2 + 1 free" at
   $36.00 charges $72.00; 5 units with tiers 2+1 and 3+2 charges $108.00;
   a bundle and a quantity break on the same unit apply once (the larger);
   tampered properties (_sl_discount "percent:90") change nothing; a cart line
   with properties reaches the order line; /cart/update.js with discount
   reaches checkout.

The theme computes what it shows as: paid = quantity, free = freeQuantity,
total = round(price * (100 - percent) / 100) * paid - amountCents,
compare = price * (paid + free) (or compare_at_price * qty for a plain tier),
saving = compare - total. Keep checkout on the same formula so the numbers
match to the cent.
````

## When the platform is ready

Nothing in the theme needs to change for steps 1 to 5: Quantity offer reads
`/api/offers/quantity-breaks` already and shows the store's numbers for a tier
with the same paid and free quantity, and every line already carries the
properties. Set the block's tiers to the same quantities as the store's
offer, and leave the tier discount codes empty.
