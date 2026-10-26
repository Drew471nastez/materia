# Sheets, recommendations and offer controls

All changes import as drafts. No backend payment or discount service is
modified by this theme repository.

- Recommendation cleanup now runs after late platform/editor DOM insertions,
  not only after the initial fetch. It handles unclassified question containers
  and explicitly shares the cleaner across the cart-module/safety-script
  boundary. Page FAQs are left alone; product cards are retained.
- The header stays pinned through mobile-menu close. Unrelated root-class
  updates no longer restart the top-layer popover close timer. Back/forward
  restoration clears the closing state.
- Size-guide sheets reject stale opening/closing callbacks, allow immediate
  reopening, batch drag transforms once per frame, cache gesture height, and
  return safely when a drag is cancelled. The unit control has border-box
  geometry, inherited typography/colors and selected depth. Scrollbars use
  theme text colors. Localization sheets use the same non-overshooting shared
  drag settling curve; their existing frame batching is preserved.
- Hover zoom supplies Drift's required data-zoom image address, ships its
  dependencies once from the layout for editor toggles, refreshes on option or
  gallery-content changes, and distinguishes circle/square inline lenses.
- The actual product slider reads its saved same-product index before its
  initial paint, rather than exposing the first image before a later repair.
- Bundle, Quantity offer and Upsell Pro gain six custom picker controls: height,
  radius, maximum width, background, text and border. They apply only with
  Custom style enabled, in native offers and manual blocks. Defaults are compact;
  coarse-pointer devices keep a minimum 44px target. Upsell custom button colors
  also reach the selected-items footer. Native upsells honor current/unavailable
  product exclusion, subtitle visibility and image shape/size. Hidden pickers
  stay hidden despite legacy display rules.

## Buy X Get Y

Use the existing **Quantity offer** block in Main product or Featured product,
or its standalone block. Set a tier's paid quantity and free items:

- Buy 1 get 2 free: paid quantity 1, free items 2; adds 3 units.
- Buy 2 get 3 free: paid quantity 2, free items 3; adds 5 units.

A matching active Storelib offer or valid discount code must authorize the
saving. Setting a free quantity in theme controls alone does not make units free
at checkout. The sidebar now explains this distinction. Cart and checkout
amounts remain server-authoritative.

Local tests exercise real bundled Swiper/Drift, module-scoped recommendation
cleanup, dark sheets, unit geometry, gesture cancellation, rapid reopen, native
picker tokens and regression flows. Production inventory, discounts and checkout
still require authenticated platform testing. No fixed FPS is promised across
devices; motion is transform/opacity based with reduced-motion support.
