# Countdown, overlays and password follow-up

## Theme changes

- Removed the actual `</script>>` typo in product-card-custom-actions. The
  extra character ended the HTML head prematurely and became visible body text.
- Countdown badge custom styling defaults on for newly added blocks. Saved
  off/on values are not overwritten. Countdown timer now has opt-in custom
  colors, typography, corners, padding, unit gaps and inline/highlight/tile layouts.
- Both blocks have grouped date/time controls: date, 24-hour hour, minute and
  UTC offset, with the existing ISO field retained under Advanced ISO. This
  block's date takes priority by default; Product field is an explicit choice.
  No date/deadline is invented. Invalid calendar dates are rejected, and a
  corrected date reactivates a previously hidden timer in an editor redraw.
- Question and share overlays use the scheme's colors/type/field tokens,
  explicit opening/closing states and a retained top-layer surface during
  closing. Escape, backdrop dismissal, reduced motion and focus return are
  handled. Share opens the theme's copy-link modal rather than a different
  system UI on each device.
- Product Testimonials keeps native finger scrolling and gains mouse dragging
  without cloning cards or replacing their contents. Existing Swiper-based
  testimonial sections already enable grab cursors in global.js.
- Pair with Upsell and Product add-on now have standalone library renderers.
  Empty commerce covers use the actual card/grid CSS, real selected/catalog
  products when available, and inert controls. No placeholder can be purchased.
- Coming Soon can fill the viewport instead of stopping at 84%/760px. Owner
  login is enabled for this password page and links to this site's real editor.
- The waitlist has explicit Preview only and Save subscribers editor modes.
  Preview only sends nothing and labels the result as a preview. Save subscribers
  uses the existing same-origin /contact contract and reports errors unless the
  server confirms success. The live storefront still submits real requests.
  Preview-only behavior is never represented as saved subscriber data.
- The early interaction bridge now also handles hamburger and product overlay
  controls before later editor selection handlers. Mobile toggle hit testing is
  protected, and basic navigation has a fallback if another theme module fails.
  Password and normal layouts also forward recognized form submissions to the
  early waitlist handler before later editor submit interception.

## Platform agent: countdown sidebar UI

Add timezone-aware date/time widgets for imported countdown schemas. Recognize
`end_date`, `end_hour`, `end_minute`, `utc_offset`, `end_iso` and legacy
`countdown_date`; preserve their IDs and stored values. Provide a calendar,
24-hour time picker, clear timezone/UTC-offset selection, daylight-saving
guidance, invalid-date errors and a live deadline summary. Apply valid changes
immediately without rebuilding unrelated product media. Keep legacy ISO editing
available and do not fabricate an end date. Test midnight, leap dates, negative
offsets, expired timers, editor redraws and published storefront output.

## Platform agent: actual editor section scrolling

Trace real pointer/click handling in StoreLib's editor, not only standalone
fixtures. For a section-picker anchor, preserve the authored URL and canonical
page identity, resolve the stable section-instance ID, and prevent subsequent
selection or route updates cancelling scrolling. If the canvas is cross-origin,
implement a parent-owned scroll bridge validating message origin, frame source
and target section ID. Account for canvas zoom, nested scrolling, sticky headers,
and reduced motion. Test this site's exported `/#section-footer` and
`/#section-benefits_bar_b3YbxP` links in edit mode, preview mode and production.

## Platform agent: real waitlist submissions in previews

When Save subscribers is explicitly enabled, support the existing authorized
subscribe/contact contract from this site's preview origin. Preserve tenant
identity, CSRF/rate-limit validation and subscription consent. Return confirmed
success only after persistence, and show actionable validation or permission
errors otherwise. Verify subscriber storage and duplicate-email behavior in
the real preview and live storefront. Preview only must remain non-persisting
and clearly labeled. Do not bypass origin checks or fabricate saved records.

All browser checks here are local fixtures with mocked submission responses.
Production persistence and parent-editor interception require platform access.
