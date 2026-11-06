# Storefront scripts audit: builder live-preview controllers

`layout/theme.storelib` loaded every live-preview controller with `defer` on
every page, for every visitor, because some builder canvases do not set
`request.design_mode`. This audit covers each script the layout loads whose
job includes applying `storelib:settings-change` / `storelib:section-load`,
and asks one question: does it do anything on a visitor's page, with no
builder event?

## How each script was checked

1. **Code.** Its top-level setup: what `scan()` / `add()` runs on load
   (DOMContentLoaded, the immediate `scan()` at the end of the file, a
   MutationObserver), and whether that setup starts any behaviour of its own:
   `customElements.define`, `IntersectionObserver`, timers, `video.play()`,
   click / pointer / keyboard / scroll listeners, `showModal()`, storage.
2. **The page.** For the scripts the code reading left as builder-only
   candidates, and for the other section painters, every section the script
   drives was mounted as a visitor (`request.design_mode` false,
   `tests/media-fixture.cjs`, section defaults and first preset, its inline
   scripts run) at 375 px and 1366 px, once without the script and once with
   it, then scrolled and resized. Every element's attributes (not `style`),
   text and every computed style property were compared. "Same" below means
   the only difference was a `data-*-ready` marker that the script puts on its
   own root and that nothing but the script and its tests reads.

A script with any storefront work stays loaded for everyone. A split (a small
storefront file plus a lazy builder file) was not made for any of them: in
every mixed file the behaviour and the live paint share the same per-root
state (the state the paint writes is the state the runtime reads), so a
split would not be clean.

## Builder-only: now loaded only in the builder (9 files, 190,516 bytes)

| File | Bytes | Builder-only | Storefront work | Evidence |
| --- | ---: | --- | --- | --- |
| media-live-text-grid.js | 21,483 | yes | none: on load it paints the values the Liquid already printed | setup 251-262 (paint + a `min-width` media listener that only repaints), listener 264, `scan()` 280; page: same at 375/1366 for image-with-text-bento, -icons, -multirow, imagewithtextgrid |
| live-contact.js | 38,118 | yes | none: records the first derive, sets `data-ct-ready` (read by nothing but tests) | `add()` 484-495 (no type defines `init`), listener 501, `scan()` 534; forms keep their own submit ("this file never posts", header); page: same for contact-form-simple, contactformsimple2, google-map, newsletter |
| live-hero-gaps.js | 17,284 | yes | none: `setup()` only removes wrapper properties a live edit wrote (66), first derive only recorded | `add()` 197-204, listener 210, `scan()` 223; page: same for banner3 |
| live-main-product.js | 22,533 | yes | none: "Nothing runs on the storefront beyond reading the markup once" (header 424-426); `preventDefault()` only on builder `live` events (178, 236); `refetch` only from a block setting change (229) | `add()` 40-50, listeners 160, 217, 297; page: same for main-product |
| live-footer.js | 16,166 | yes | none: reads settings, writes only on a builder event; the phone accordion is footer-section.js | `add()`/`scan()` 200-210, listeners 229-231, `scan()` 232; page: same for theme-footer, mobile-navigation-bar |
| live-collection-pages.js | 32,918 | yes | none: `init()` only builds state, painters run from the change event | `init()` 435-443, listener 447, `scan()` 462; page: same for breadcrumb, featured-blog-header, main-article, main-blog, main-collection-heading, main-collection-product, main-list-collections, page-heading, subcollection-list |
| live-account-pages.js | 29,438 | yes | none: records the first derive, sets `data-ap-ready` | `add()` 395-404, listener 410, `scan()` 443; forms keep their real paths (header 91-94); page: same for all 17 account / password / utility sections |
| slideshow-pointer.js | 3,883 | yes | none: idle on this theme; it acts only on `[data-slideshow-pointer]`, which the slideshow's own markup script removes before it runs (sections/slideshow.storelib 1503-1504) | header 1-4, `scan()` 21; page: same for slideshow |
| slideshow-live.js | 8,693 | yes | none: on load it writes inline values equal to what the section's CSS already computes | `scan()` 19-21 (ResizeObserver repaint), listener 20; page: same for slideshow, including after resize |

## Kept for everyone: they also run the section on the storefront

| File | Bytes | Builder-only | Storefront work | Evidence (shopify/assets/&lt;file&gt; line) |
| --- | ---: | --- | --- | --- |
| media-live-before-after.js | 28,976 | no | the comparison slider: drag, click, arrow keys | `pointerdown` 157, `keydown` 171, `setPointerCapture` 161 |
| media-live-galleries-a.js | 22,955 | no | autoplay videos play on screen, pause off screen | `videos()` 72-77, `IntersectionObserver` 254 |
| media-live-galleries-b.js | 24,136 | no | gallerysimple2 carousel buttons, images-carousel marquee and its off-screen pause | `click` 195, `IntersectionObserver` 255 |
| media-live-image-video.js | 25,765 | no | video playback: autoplay on screen only, never under reduced motion | `.play()` 74, `IntersectionObserver` 152 |
| media-live-benefits.js | 30,905 | no | autoplay videos; the benefits image carousel (drag, keys, progress bar) | `videos()` 322-329, `carousel()` 331-350, `IntersectionObserver` 377 |
| media-live-stats-reels.js | 40,854 | no | reels wall and shoppable video: playback, drag, autoplay timer | `.play()` 51, `IntersectionObserver` 53, `pointerdown` 85, `setInterval` 101 |
| live-products-a.js | 18,602 | no | Product Info Box rows and the information tabs | `click` 193, `keydown` 226 |
| live-products-b.js | 40,881 | no | Product Showcase slider: arrows, keys, swipe, autoplay | `IntersectionObserver` 225, `setInterval` 231, `pointerdown` 353 |
| live-products-c.js | 31,050 | no | hotspot dots and cards | `pointerdown` 317, `keydown` 318 |
| live-products-d.js | 25,162 | no | Quick Add / Shop The Look carousels | `click` 186, `scroll` 192, `pointerdown` 195, `IntersectionObserver` 203 |
| live-features-a.js | 47,458 | no | tabs, carousels, autoplay | `IntersectionObserver` 216, `setInterval` 319, `click` 471, `.play()` 540 |
| live-features-b.js | 14,800 | no | comparison table scroller: drag, progress bar | `scroll` 141, `pointerdown` 142 |
| live-features-c.js | 49,064 | no | carousels, count up, videos | `pointerdown` 93, `setInterval` 287, `IntersectionObserver` 411, `.play()` 505 |
| live-features-d.js | 39,761 | no | rings and counters fill once in view | `IntersectionObserver` 86 |
| live-collections.js | 72,288 | no | Lookbook carousel, Scrolling Collection marquee, hover preview | `IntersectionObserver` 353, `pointerdown` 381, `setInterval` 524, `.play()` 611 |
| live-testimonials.js | 64,766 | no | slider rows, autoplay, videos, read more | `click` 131, `setInterval` 140, `IntersectionObserver` 141, `.play()` 168 |
| live-faq.js | 33,179 | no | questions open and close, reveal | `IntersectionObserver` 119, `click` 390 |
| live-logos.js | 43,911 | no | logo carousels, marquee, testimonial tabs | `click` 208, `keydown` 213, `setInterval` 220, `IntersectionObserver` 520 |
| live-countdown.js | 43,771 | no | the countdown timers tick (one per section) | `localStorage` 383, `IntersectionObserver` 489 |
| live-announcements.js | 43,462 | no | marquees, Pro 2 rotator, Pro 2 countdowns, close remembered | `localStorage` 209-212, `click` 219, `setInterval` 405, `IntersectionObserver` 503 |
| live-social-dividers.js | 40,932 | no | Social Shop Grid tile videos play on screen; slider rebuilds | `.play()` 451, `IntersectionObserver` 453 |
| live-popups-code.js | 37,933 | no | popups open (`showModal`), order notification timers | `showModal` 286, `setTimeout` 346-349, `click` 376 |
| live-page-popups.js | 68,043 | no | page popups open in a modal `<dialog>` through the popup manager | `showModal` 65 |
| live-product-extras.js | 13,916 | no | defines `<shopable-video-sticky>` (it runs before the section's own deferred shopable-video-sticky.js, so its definition is the one in use) | `customElements.define` 151, `scroll` 124, `.play()` 148 |
| live-header.js | 38,756 | no | defines `<announcement-rotator-v2>`, the top bar's message rotator | `customElements.define` 23, `IntersectionObserver` 109 |
| live-blog-slideshow.js | 32,963 | no | blog carousel autoplay held to on-screen, hidden-tab and reduced-motion rules | `bpInit()` 359-372, `IntersectionObserver` 365 |
| live-cart-search.js | 30,728 | no | defines `<cart-faq>` when the cart section's inline script has not (a cart section redrawn from a fetch does not run its inline script) | `customElements.define` 381-385; page: same on first load because the inline script ran first |
| live-text.js | 20,704 | no | Scrolling Text marquee runs only once `data-lt-offscreen` is managed: without the file the track does not move | `IntersectionObserver` 207, `data-lt-offscreen` 187; sections/scrolling-text.storelib 162; page: `.stm__track` transform 0 without it, moving with it |

## Other section runtimes that also listen for live events (kept)

They are the theme's first-paint painters or behaviour, not builder-only.

| File | Bytes | Builder-only | Storefront work | Evidence |
| --- | ---: | --- | --- | --- |
| hero-image-one.js | 34,066 | no | the shared painter API (`MateriaHeroImageOne`: colour, font, url, width cache) every other painter reads | tests/theme-home-load-perf.cjs |
| hero-product-one.js | 7,531 | no | paints Hero Product 1 through the shared painter | header |
| hero-product-two.js | 17,794 | no | first paint differs without it (page compare) | page: hero-product2 differs |
| hero-product-three.js | 41,345 | no | product media, meters | `setInterval` 58, `IntersectionObserver` 123 |
| hero-pro-scrolling.js | 12,042 | no | the image reel (clones, compositor loop) | page: hero-pro-scrolling differs |
| marketing-sections.js | 44,141 | no | video play, pointer effects | `.play()` 40, `IntersectionObserver`/`pointermove` 114 |
| before-after-controls.js | 11,578 | no | first paint: scheme class, avatar background, images | page: before-and-after-reveal differs |
| hero-benefits.js | 25,560 | no | first paint (benefit alignment) | page: hero-benefits differs |
| text-section-controls.js | 91,722 | no | first paint of the six text layouts, wave shapes | page: richtext1/2, scroll-text-banner, text-heading, titleandsubtitle, wavyrichtextbanner differ |
| scroll-text-reveal.js | 4,090 | no | the scroll reveal itself | `IntersectionObserver`, ResizeObserver in its constructor |
| testimonial-quote.js | 17,091 | no | first paint (section padding) and scrolling | page: testimonial2 differs |
| announcement-pro-4.js | 18,419 | no | countdown and close | timers, `IntersectionObserver` |
| announcement-three-colors.js | 4,170 | no | first paint of the top bar's colours | page: top-bar differs |

## Globals

None of the nine builder-only files defines anything the storefront reads.
`window.MateriaTextGrid`, `MateriaContact`, `MateriaHeroGaps`,
`MateriaMainProduct`, `MateriaLiveFooter`, `MateriaCollectionPages`,
`MateriaAccountPages`, `MateriaSlideshowPointer` and `MateriaSlideshowLive`
appear in no other file in `shopify/assets`, `sections`, `snippets`, `blocks`
or `layout` (only in each file itself and in tests that mount it directly).
They define no custom element.

## How the builder gets them

One inline script in the `<head>` of `layout/theme.storelib`, where the last
of the old tags was:

- **Builder signal at load** (`request.design_mode`, `window.Shopify.designMode`,
  or the builder referrer in a frame: the same three signals the layout
  already uses): the nine are written with `document.write` as
  `<script defer>` tags while the page is parsing, in the old order, so they
  run before DOMContentLoaded exactly as the old tags did. If the page is no
  longer parsing, they are added with `async = false` instead.
- **No signal** (a canvas that sets none of them): a capture listener on
  `window` waits for the first `storelib:settings-change` or
  `storelib:section-load`. That event, and every live event after it until
  the nine have run, is stopped before any listener sees it and held (type,
  target, detail, bubbles). The nine are added in order (`async = false`);
  once the last has run, the held events are dispatched again on the same
  target with the same detail, in arrival order. A listener that was already
  on the page therefore sees each event once, and the new controllers see
  the events they missed. If a file never answers, the held events are given
  after 8 seconds anyway.

### preventDefault

Only live-main-product.js calls `preventDefault()` on a live event (178, 236:
"no redraw needed for this slider step"); nothing in the theme reads
`defaultPrevented` on these events. A held event returns to the canvas not
prevented, which means "redraw": the canvas draws the section from the
server, which is always correct. So in a canvas with no design-mode signal
the first drag steps cost a redraw each until the controllers are in; in a
canvas with a signal (the normal case) nothing changes, because they load
with the page.

### Visitors

A storefront page has no builder signal and gets no live events, so the nine
are never requested: 190,516 bytes (about 186 KB) of script fewer to
download, parse and run on every page view.

`tests/theme-builder-scripts-lazy.cjs` checks all of the above on the real
layout.

## Settings JSON on the page

The live-preview controllers merge a builder change into the section's
current settings, which the Liquid printed as JSON in `data-*` attributes
(`data-lt-settings`, `data-pg-settings`, `data-*-defaults`, ...). A visitor's
browser parsed all of it for nothing: on the saved home page 207 KB of
the 1.27 MB of HTML. Each family was classified by its readers in
`shopify/assets` and the sections' inline scripts, then checked in Chromium
as a visitor: the section drawn as it is, with the attribute removed, and with
every value in it changed (numbers +3, booleans flipped, colours and words
replaced), at load, after scrolling, after clicking every button, after a
resize across the breakpoints, with the clock frozen. A family whose removal
and change both left every element's attributes, text, computed styles,
storage and the screenshot alone is printed in the builder only.

**Printed in the builder only** (`{% if request.design_mode %}`):

| Family | Read by | Sections |
| --- | --- | --- |
| tg-settings, tg-defaults, tg-block-defaults | media-live-text-grid.js (builder-only file) | image-with-text-bento, -icons, -multirow, imagewithtextgrid |
| hg-settings | live-hero-gaps.js (builder-only) | banner3 |
| lcp-settings, lcp-block-settings | live-collection-pages.js (builder-only) | breadcrumb, featured-blog-header, main-article, main-blog, main-collection-heading, main-collection-product, main-list-collections, page-heading, subcollection-list |
| ap-settings | live-account-pages.js (builder-only) | the account, password and utility pages |
| ct-settings | live-contact.js (builder-only) | contact-form-simple, contactformsimple2, google-map, newsletter |
| pib-own | live-main-product.js (builder-only) | snippets/product-info-blocks (Main product, Featured product) |
| ft-settings, mnb-settings | live-footer.js (builder-only) | theme-footer, mobile-navigation-bar (already so) |
| sd-settings, sd-socials | live-social-dividers.js | divider, divider3, waves-divider, social-icons-pro2, instagram-promo, social-shop-grid |
| mlb-settings, -defaults, -block-defaults | media-live-benefits.js | dual-image-with-text, image-and-video-text, image-text-benefits, image-with-text-benefits |
| fb-settings, fb-bs, fb-spec, fb-bspec | live-features-b.js | the six comparison sections |
| tm-settings, lt-settings | live-testimonials.js | testimonials, testimonial-video, comunitysldier, reviews2, testimon4, testimonials3 |
| pg-settings | live-page-popups.js | the eight page popups (Back To Top Pro prints no settings and is still painted live) |
| rp-settings | live-product-extras.js | related-products |
| lcs-settings | live-cart-search.js | main-cart-items, main-search |
| pa-settings | live-products-a.js | featured-product, product-info-box, product-information-tab |
| an-settings, -defaults, -block-defaults | live-announcements.js | marquee-bar, annoucment-bar-scrolling, announcement-bar, announcement-bar-basic |
| fa-settings | live-features-a.js | the seven benefits sections |
| lg-settings, -defaults, -block-defaults | live-logos.js | brand-logo, logo_scroll_strip, logos-list, payment-icons1, testimonial-logos |
| pc-settings | live-popups-code.js | custom-html, custom-liquid, promotion-popup, size-chart-popup |

On the storefront these controllers only record the first derive (no write)
and set up behaviour that reads the markup (`data-autoplay`, `data-interval`,
`data-mode`, `open`, ...). Announcement Bar's close button was the one storefront
read (its "stay closed for" days): that section now prints
`data-an-close-days` for a visitor instead of its settings.

**Printed for everyone**, because storefront code reads them: the first-paint
painters (slideshow and blog posts through live-blog-slideshow.js and
hero-image-one.js, text-section-controls.js, hero-benefits.js,
before-after-controls.js, testimonial-quote.js, announcement-three-colors.js,
announcement-pro-4.js, hero-product-one/two/three.js, marketing-sections.js,
hero-pro-scrolling.js, live-text.js, live-features-c.js, live-features-d.js,
media-live-galleries-a/b.js, media-live-image-video.js,
media-live-stats-reels.js, media-live-before-after.js, live-products-c.js,
live-products-d.js), and the controllers whose behaviour reads a setting:
Testimonial Spotlight's autoplay (testimonials4), the FAQ sections (one or
several questions open), Product Showcase and the other live-products-b.js
sections (autoplay), the countdowns, Collection Lookbook and Scrolling
Collection (live-collections.js), Brand info (its first paint), Order
notification (names and places). The product and popup data the storefront
needs (`data-options`, `data-offers`, `data-variants`, `data-mt-gallery-*`,
`data-popup-config`, `data-chart-json`, `data-hp3-product`) is not settings
and stays.

**In a canvas without `request.design_mode`** the attributes are missing.
Each controller above then paints nothing for that section, at load or on a
live change, and does not call `preventDefault()`, so the builder draws the
section again from the server and the change shows from the redraw (Main
product's block styles ask for the block's markup again, as for any setting
it does not paint). With `request.design_mode`, the normal case, nothing
changed: the attributes are printed and the controllers paint live as before.

`tests/theme-storefront-payload.cjs` checks all of this and holds the JSON
`data-*` attributes a visitor still gets under a budget per page.
