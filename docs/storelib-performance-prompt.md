# Prompt for Storelib's platform code agent

Investigate and fix slow navigation on andrewrullz.storelib.com in the published storefront and builder preview. The creator reports 5–9 second page changes and wants a two-second target. The theme agent could not measure the live site because its environment's network proxy returns HTTP 403; do not assume the backend is the bottleneck without measuring it.

Record mobile and desktop cold/warm navigation traces for home → product, product → next product, collection → product, Back, and builder preview navigation. Separate server/edge TTFB, product/database queries, template compilation/rendering, asset transfer, JS main-thread work, font/image loading, and preview messaging. Report median and p95, response sizes, cache hits, and the actual critical path before and after changes.

Fix the measured platform bottlenecks: deduplicate product/recommendation queries, reuse compiled templates, remove serial waterfalls, and use compressed, fingerprinted assets with appropriate CDN caching. Cache public HTML only with correct tenant, publication version, locale, currency and personalization keys. Never share cart/account/checkout responses between visitors. Invalidate caches on publish, inventory/price changes and relevant settings changes. Keep unsaved builder changes isolated and avoid full-canvas reloads for ordinary live settings edits.

Inspect add-to-cart and recommendation endpoints separately. Return correct cart data promptly; do not claim success before the mutation completes. Return real recommendation products or an explicit empty result, with no blank carousel shell. Test failures and concurrent requests.

Preserve the current theme's animations, slideshow effects, global button/font/color controls, accessibility, scroll positions, native navigation and Back/Forward cache. Do not conceal latency with longer animations or disable existing effects. Add regression coverage, provide before/after traces, and identify any remaining network/server limit preventing the target. Keep changes as drafts for creator review; do not publish automatically.

## Measured on andrewrullz.storelib.com, 2026-11-06 (theme side already fixed; these are platform side)

1. **Reloads after every publish.** The release check at the end of each page (`data-storelib-track`,
   `/api/public/site-release`) reloads a page whose `mine` marker differs from the current release.
   Pages are served from the platform's HTML cache (`server-timing: hold;desc=hit`, a page 10 minutes
   old was served), so for a while after each publish visitors get cached pages with the old marker and
   reload once per page and session. The creator, publishing often, sees "pages refresh several
   times". Purge (or re-key) the cached HTML on publish so a cached page never carries an old marker.
2. **Uncached HTML is slow.** `cache-control: private, no-cache` on every page and 1.5–2 s to first
   byte (`drawn-read` ~530–650 ms of an ~870 ms render). Prefetch on hover hides it after a hover, not
   on a direct click or on phones without hover.
3. **Prefetch only, never prerender.** The served speculation rules have only `prefetch` (moderate);
   the docs say desktop pages with no third-party script are prerendered, and these pages run none.
4. **Cart-count reload.** `cartNow` reloads on bfcache restore / prerender activation when the cart
   count differs from `CART_AT_DRAW`. The theme now keeps `Shopify.storelibCartAtDraw` current and
   redraws its cart in place; please document that hook so other themes can do the same.
5. **Pickup availability.** `/variants/<id>/?section_id=pickup-availability` answers 308 to the
   address without the slash; the section has nothing to show on Storelib. The theme now asks the
   final address and shows nothing.
