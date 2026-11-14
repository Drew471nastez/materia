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
| 7 | Load time | Review, popup and modal styles held the page's load event | Asked for after load, or at the first tap/scroll, or when a popup opens |
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

Recorded at the end of the run; see section G.

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

Filled in after the final run and push.
