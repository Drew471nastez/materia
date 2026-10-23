# Prompt for Storelib's platform code agent

Investigate and fix slow navigation on andrewrullz.storelib.com in the published storefront and builder preview. The creator reports 5–9 second page changes and wants a two-second target. The theme agent could not measure the live site because its environment's network proxy returns HTTP 403; do not assume the backend is the bottleneck without measuring it.

Record mobile and desktop cold/warm navigation traces for home → product, product → next product, collection → product, Back, and builder preview navigation. Separate server/edge TTFB, product/database queries, template compilation/rendering, asset transfer, JS main-thread work, font/image loading, and preview messaging. Report median and p95, response sizes, cache hits, and the actual critical path before and after changes.

Fix the measured platform bottlenecks: deduplicate product/recommendation queries, reuse compiled templates, remove serial waterfalls, and use compressed, fingerprinted assets with appropriate CDN caching. Cache public HTML only with correct tenant, publication version, locale, currency and personalization keys. Never share cart/account/checkout responses between visitors. Invalidate caches on publish, inventory/price changes and relevant settings changes. Keep unsaved builder changes isolated and avoid full-canvas reloads for ordinary live settings edits.

Inspect add-to-cart and recommendation endpoints separately. Return correct cart data promptly; do not claim success before the mutation completes. Return real recommendation products or an explicit empty result, with no blank carousel shell. Test failures and concurrent requests.

Preserve the current theme's animations, slideshow effects, global button/font/color controls, accessibility, scroll positions, native navigation and Back/Forward cache. Do not conceal latency with longer animations or disable existing effects. Add regression coverage, provide before/after traces, and identify any remaining network/server limit preventing the target. Keep changes as drafts for creator review; do not publish automatically.
