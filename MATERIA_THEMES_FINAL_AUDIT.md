# Materia Themes on Storelib: final audit

What was checked, what was fixed and what is still open, with the evidence for
each. Written from this repository and the live draft at
https://andrewrullz.storelib.com. Nothing here is a guess; where something could
not be checked it says so.

## A. How the system works (what this repository can see)

- This repository is one Storelib website: the Materia theme imported from
  Shopify. Storelib's own code (the builder app, the database, Vercel, Supabase,
  checkout) is not in this repository and was not changed or inspected.
- A section is `sections/<type>.storelib`: the theme's Liquid inside
  `<template compat="shopify">`, then `<schema>` whose `"shopify"` object is the
  theme's own schema. Storelib builds the builder's controls from that object on
  every push.
- Pages are `templates/<page>.json`; the header, footer and overlays are the
  section groups `sections/header-group.json`, `footer-group.json`,
  `overlay-group.json`; theme values are `config/settings.json`, their controls
  `shopify/config/settings_schema.json`.
- A push to `main` becomes a draft. Storelib's answer is a git note
  (`refs/notes/storelib`) per commit. Nothing is live until the creator presses
  Publish.
- Live editing: the builder fires `storelib:settings-change` and
  `storelib:section-load`. Each section group has a scoped controller in
  `shopify/assets/live-*.js` that repaints only what changed. The layout loads
  the builder-only controllers lazily (list `L`) and every section runtime that
  sections link themselves (list `S`), so a visitor downloads only the scripts
  of the sections on the page.

## B. Inventory

| What | Count |
|---|---|
| Sections | 246 (171 with a preset in Add a section) |
| Setting ids in section and block schemas | 18,441 |
| Theme setting groups | 24 |
| Blocks / snippets | 27 / 295 |
| Page templates | 19 |
| Theme scripts | 120 |
| Test files | 283 |

## C. This round's work

### New sections (26, two per category)

| Category | Sections | Test file | Checks |
|---|---|---|---|
| Hero and banners | Hero Split, Hero Collage | theme-r7-hero | 1890 |
| Products | Recently Viewed, Product Duo | theme-r7-products | 2315 |
| Collections | Collection Circles, Collection Mosaic | theme-r7-collections | 1835 |
| Testimonials | Testimonial Wall, Testimonial With Product | theme-r7-testimonials | 2102 |
| Features | Feature Timeline, Guarantee Banner | theme-r7-features | 2737 |
| Image and video | Lightbox Gallery, Video Playlist | theme-r7-media | 2812 |
| Text | Text Columns, Sticky Heading Text | theme-r7-text | 3717 |
| FAQ | FAQ Search, FAQ With Contact Card | theme-r7-faq | 4365 |
| Logos and trust | Logo Wall, Press Mentions | theme-r7-trust | 2239 |
| Contact / Social | Newsletter Split / Follow Us | theme-r7-connect | 3918 |
| Announcements / Countdowns | Announcement Code Bar / Product Drop Countdown | theme-r7-promo | 3034 |
| Blog / Slideshows | Blog Spotlight / Card Slideshow | theme-r7-stories | 1811 |
| Dividers / Promotional popup | Divider With Text / Bottom Sheet Popup | theme-r7-extras | 1480 |

Every one: theme colours, fonts and buttons by default with opt-in custom
styling that wins under the theme's priority rules; every setting changes the
section live and after a redraw at 375px and 1366px; two copies on one page stay
independent; first paint equals the hydrated page; works with scripts off in the
library preview; native scroll-snap rows on phones (no drag scripts), 44px tap
targets, reduced motion respected; no invented reviews, prices, stats or names
in defaults. Six first ideas already existed under another name and were
replaced by real gaps: Video Carousel (Video Playlist instead), Testimonial
Marquee (Testimonial With Product), Trust Badges (Press Mentions),
Announcement Rotator (Announcement Code Bar), Countdown Banner (Product Drop
Countdown), and a plain labelled divider (Divider With Text became an
editorial rule with a link).

### Fixes (all verified on the live draft)

| # | Area | Problem found | Fix |
|---|---|---|---|
| 1 | Navigation | A thin bar filled across the top on every page change (theme-navigation.js) | Removed; test now checks it never appears |
| 2 | Phone bottom bar | Labels sat on the iPhone home indicator; Safari's toolbar made the bar look like it changed height | Fixed room under the icons on iPhones, page keeps the same space |
| 3 | Fonts | Every page painted in the fallback font, then swapped | A font sheet seen before loads with `display=fallback`; fonts land in the first frame from the second page on |
| 4 | Pictures | Pictures popped in; a sharper size re-faded a visible picture; a hover image flashed | One fade per picture, only when it was hidden and meant to show |
| 5 | Pictures | The fade-in revealed a broken-image icon for a picture that failed to load | A failed picture stays hidden, as before |
| 6 | Cart | After add to cart the cart was read three times (each ~0.7s) | One shared read; quantities and counts unchanged |
| 7 | Load time | Popup and modal styles held the page's load event | Asked for after load, at the first tap, click or scroll, when a popup opens, or 4s after the page is readable; review star styles still load at once |
| 8 | Wishlist | An empty wishlist showed loading boxes, then shrank and the footer jumped | Empty message drawn at first paint |
| 9 | Touch | Footer phone/email links, social icons, product image dots, search button under 44px | 44px touch areas on touch screens, nothing moved on screen |
| 10 | Activation check | Loaded on every page | Removed at the creator's request |
| 11 | Tests | Three tests out of date (loading bar, count-up numbers, pagination width) | Updated to the current, intended behaviour |

## D. Live checks (Chromium, iPhone 13 emulation and 1366px desktop)

- 11 pages at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920px: no sideways
  overflow anywhere.
- 11 pages phone and desktop: no script errors; layout shift 0 to 0.037 (good is
  under 0.1); the only failing request is the Black Sleeves product image
  (`AY1554s.webp`), which needs re-uploading in the product admin.
- Cart drawer: slide starts 75 to 180ms after the tap, settles in about 0.4s;
  page behind does not scroll; Escape, close button and overlay close it.
  The wait after Add to cart is Storelib's server answering (1.0 to 1.3s).
- Search popup: field focused, 16px or larger (no iPhone zoom), results, Escape.
- Every scroll listener on the storefront is passive and throttled.
- No request on any page stays open; every page reaches its load event.

## E. Test results

Full suite: 267 test files run on the finished tree (Chromium, liquidjs).
260 passed first time. The 7 that did not:

| Test | Cause | Outcome |
|---|---|---|
| theme-r5-header-saved, theme-r6-footer-saved | Required the old and new page to have identical script error lists; the new page has none (empty theme values now print safely), the old one had some | Check now requires no new errors; both pass (20, 42) |
| theme-r6-footer-saved | Footer contact links' touch area moved their text 4px on phones | Touch area is now an invisible layer; nothing moves |
| theme-scripts-per-page | The 13 new section scripts were not in its list | Listed; passes (9) |
| theme-r5-announcements-marquee | Expected a storefront edit to keep the running animation; the storefront has no live edits since d46d23b, so an edit is a redraw | Check kept for the builder; passes (399) |
| theme-r5-header | Its helper could not satisfy "Border width > 0" before testing Border color | Helper understands number conditions; passes (522) |
| theme-every-setting-sweep | One reading of Hero Product 1 marked "unstable" under load | Rerun alone: 310 of 310 settings change the section |
| theme-css-loading | Pixel comparisons catch the drawer's dimmed backdrop mid-fade at slightly different moments | Screenshots identical to the eye; still flaky, left as it is |

The run also caught three real bugs from this round, all fixed: three pairs of
new section scripts shared a root marker (two sections on one page would have
driven each other), a broken picture could show its broken-image icon, and the
review star styles waited for the page to finish loading.

Every-setting sweep: 229 sections, 17,281 settings, 17,153 change the section,
127 allowed with a reason. New sections: 34,255 checks across 13 test files.

## F. Open items and limits

- The Storelib builder canvas, the database, publishing and checkout are
  Storelib's systems, not in this repository: not inspected, not changed.
- No real phone or Safari was available; touch, scroll snap and the iPhone
  bottom bar were checked in Chromium only.
- The home page still downloads 52 scripts (about 1.9MB uncompressed, cached
  for a year after the first visit). Most are section runtimes that also hold
  builder live-edit code. Splitting them is the largest remaining speed win.
- `tests/theme-css-loading.cjs` compares full-page screenshots and fails
  intermittently on a busy machine, with or without this round's changes;
  rerun alone it is the judge.
- The footer shows +1 (555) 010-0123 and team@materia.com from Theme settings;
  the creator should check them before publishing.
- Nothing is live until the creator presses Publish in the builder.

## G. Release

- Pushed to main at e0de9dd; Storelib took 69 files as a draft.
- Storelib note: a Storelib site has no blog of its own yet, so Blog
  Spotlight's blog and post pickers are hidden in the builder and the section
  stays empty on the storefront until blogs exist.
- Smoke check after the push, 11 pages on phone and desktop: no script
  errors, no sideways scroll, layout shift 0 to 0.017 (the wishlist page went
  from 0.037 to 0.003). The only failing request is still the Black Sleeves
  image.
- Not live until the creator presses Publish in the builder.

## H. Follow-up pass (prices, settings, clean-up)

- Prices: every price on the home, collection, product, search, cart page and
  drawer was compared with Storelib's product and cart data (store currency
  BRL, R$). One mismatch, fixed: quantity-offer tiers were worked out in reais
  while Storelib prices them in the base currency and converts the total, so
  "Buy 2, save 20%" showed R$244.28 and the cart charged R$244.25. The theme
  now follows the same steps; Buy 2 and Buy 3 match the cart to the cent.
- Content to check (a setting, not changed): the announcement bar says
  "Free shipping on orders over $99" while the store is in reais and the
  drawer's free-shipping bar uses R$150.00.
- Theme settings: 67 labels showed raw translation keys (Product badges,
  Cart, Social media, Currency, Cookies); they now show plain words. Two em
  dashes removed. No duplicate ids among the 460 settings.
- Sections: no duplicate setting ids or block types in any section; no two
  sections share a name.
- Removed 52 files nothing used (33 snippets, 19 assets); Storelib keeps deleted files on the site and wrote them back, so they remain, unused:
  never loaded (about 1.3MB, mostly the unused map library and old font
  copies), including the activation check's snippet and script.
- 19 saved theme values belong to settings retired earlier; nothing reads
  them and they are left in place.
- Language switch: choosing a language on any page now opens the same page
  in that language (/products/x to /ro/products/x and back) instead of the
  language's home page. Romanian prices use the Romanian format and still
  match the cart.
- Counts checked against Storelib: collection product count, search result
  count and cart bubble all match the server.
- Full suite on the final tree: 267 test files, 263 passed first time; the
  4 that failed (new-section tests expecting no builder panel in the schema,
  which Storelib writes on sync) were updated and pass (1835, 3918, 1480,
  4365 checks).
