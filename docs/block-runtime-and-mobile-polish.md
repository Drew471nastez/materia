# Shared product blocks and mobile fixes

## Theme changes

- Countdown timer and badge use a shared custom-element lifecycle, including
  builder replacements. One visible-page clock updates digits in place;
  detached/offscreen blocks do not redraw. Missing dates do not fabricate a
  sale deadline. Product countdown metadata overrides the timer's fallback date.
  Badge settings are grouped as Schedule, Content, Size and spacing, Custom
  styling. Recurrence uses an explicitly configured interval and fixed origin.
- Countdown, Info Rows, Testimonials and Product addons now have standalone
  block renderers using the same markup as Main and Featured Product. Library
  previews use those renderers. Empty commerce previews show an inert visual
  layout; no placeholder product can be purchased. A library cover still
  depends on StoreLib rendering/caching the component preview correctly.
- Quantity offer again renders configured tiers when native offers are absent.
  Unconfirmed free/percent settings never authorize a reduced charge. Native
  StoreLib offers remain the source of checkout-authorized savings.
- Custom Variant Selector Pro controls remain compact instead of distributing
  across the full column. Requested columns are an upper limit, constrained by
  actual option widths and available space.
- Testimonials follow the active scheme unless custom styling is enabled.
  Native touch scrolling replaces blocking touch handlers and an inline
  initializer that could contain an invalid JavaScript function name. New
  defaults do not invent customer names or reviews. Existing saved copy stays.
- Product addons support an optional question popover with normal contact
  fields, including product context. Sharing uses the native share dialog or a
  copy-link popover, with keyboard controls and copy feedback.
- The password signup trap is intrinsically hidden, even without stylesheets;
  it remains part of the spam-check contract. Coming Soon gains alignment,
  viewport height, block gap, stacked signup, input text, button hover and
  opt-in content-background/corner/padding controls.
- Known product sold count zero displays as zero; absent/invalid metadata is
  unknown and stays hidden. Product mode reads public `custom.sold_count`,
  refreshing at most once a minute while visible. It cannot query private orders.
- Back-to-top buttons clear the measured sticky cart/navigation obstruction.
  Cart thumbnails reserve a stable square and no longer enter the generic
  product-image loading/skeleton animation. Shipping actions reserve compact
  44px targets with a flexible primary action and compact Cancel.
- Filter closing retains its popover in the top layer until the transition
  completes, consumes the outside gesture, and keeps the page scroll locked.
  Localization lists avoid painting offscreen option rows.
- Old/new page snapshots no longer crossfade different routes together or
  interpolate page geometry. Legacy theme crossfade controls are hidden but
  saved values are retained. StoreLib still owns route loading and history.
- Short image taps navigate. Holding for 450ms previews the image effect;
  releasing that hold does not navigate. Moving the finger cancels the preview.

## Verification

`theme-block-runtime-polish.cjs` renders shared templates and checks countdown
states/redraws, dark scheme previews, compact responsive variants, question and
share controls, zero/unknown counts, filter dismissal, bottom obstruction and
shipping buttons. Existing quantity-offer, schema, StoreLib contract, cart,
localization, newsletter and empty-preview checks are also run separately.

These are local Chromium/rendered-fixture checks, not production checkout,
message-delivery, real-device frame-rate or authenticated platform tests.

## StoreLib platform agent prompt

Audit the Materia theme integration end to end. Keep unauthenticated order
tracking inside the storefront, with a secure guest-tracking flow rather than
external account redirects. Expose a verified paid-order sold count per product,
including explicit zero and defined refund/cancellation rules, through the
theme's public product data. Route product-question contact submissions to
customer messages, preserving product context, validation and delivery status.
Generate isolated block previews from actual renderer/defaults and invalidate
cached covers after code changes. Check page transitions, route replacement,
history, scroll restoration and script lifecycles for duplicate renders or
mixed-route snapshots. Validate offer discounts server-side across cart and
checkout. Test live storefront and editor on mobile and desktop; report backend
contracts and any remaining failures without inventing counts or successful
delivery.
