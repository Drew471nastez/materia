# Offer selection and product blocks

## Theme changes

- Bundle and Upsell Pro checkboxes take their border from card text, not their white checkmark. Selected tiles retain their fill. Dark presets invert the check correctly.
- Offer selectors default to compact 44px controls while retaining Forms and fields settings. Mobile selectors use 16px text to avoid iOS focus zoom.
- Products precedes Style in both main and featured product settings. Existing setting IDs, merchant values and custom-style switches remain intact.
- New default CTAs name the action: “Add bundle to cart” and “Add chosen items”. Saved merchant labels are not overwritten.
- Upsell Pro snapshots submitted variants. Selected-mode Added labels persist for the submitted selection and reset when cart state changes. Pending requests disable repeat submission. The drawer-opening preference applies to both modes.
- Cart recommendations keep theme button styling and show Added in place; confirmed cart contents reset stale Added states.
- Size guide defaults to its existing dialog/mobile sheet; the new display selector can use a collapsible row instead. Both use the same assigned product chart. Size table remains the inline/collapsible chart block.
- Review counts/ratings accept numeric strings. Manual sources expose only their relevant controls. The sold status dot defaults to scheme heading color; explicit merchant colors remain supported. Missing data is explained in the editor, not fabricated on the storefront.
- Product tabs hide inactive action controls immediately and avoid replaying card entrance animations. Panel transitions never begin fully transparent. Deleted collection objects cannot retain live product actions.
- The optional View more button block overrides legacy section pagination controls. It retains the existing load-more action, supports primary/secondary theme buttons, and has opt-in color overrides.
- Pickup requests run for the selected variant even without an initial availability flag. Requests abort on variant changes/removal; stale results are ignored. Each product owns its drawer. Retry, keyboard close, focus return and scroll cleanup no longer depend on global element IDs or an 800ms delay.

## Verification and boundaries

Local Chromium fixtures use the actual theme assets with mocked cart/pickup responses. They test mobile contrast, variant changes during submission, persistent/reset Added states, schema order/parity, modal/collapsible charts, numeric review data, stale/error/empty pickup responses, keyboard close, tab layout stability, deleted collections and cart mutations. Schema parsing, setting wiring and JavaScript syntax checks also run.

These checks do not certify StoreLib's production renderer or endpoints. The platform must expose assigned size charts, actual review/sold data and pickup availability for each selected variant. The theme cannot create backend pickup inventory or grant discounts through offer metadata.

The existing product template references the platform's `storelib-review-widget` without a corresponding exported section file. Preserve the widget. StoreLib must recognize this built-in section during import or export its native implementation; replacing it with a fake reviews section is not a fix.

All imports remain drafts. Publishing is a separate merchant action.
