# Section links and header containment

The exported home page uses links such as
`/#section-benefits_bar_b3YbxP`. The old handler resolved `link.href`, which
already contained the preview frame's host, instead of the authored URL. In an
editor canvas with a different URL this could fail its same-page check.
Template-prefixed section IDs also were not matched.

The shared handler now resolves relative URLs against the canonical storefront
page in the editor, matches exact and imported template-prefixed IDs, and finds
rendered content inside nested `display:contents` wrappers. Editor navigation
does not update route/history. The early head capture bridge gives genuine
same-page section links priority before later canvas selection handlers; the
pointer fallback remains available for isolated previews. Modified clicks,
downloads, unrelated pages, external sites and dialog controls are not claimed.

Nested scrolling elements and full-height, same-origin editor frames scroll
their actual viewport. Canvas scale is accounted for. Cross-origin parents
that suppress events or scrolling still require a platform-owned bridge; the
theme cannot bypass browser origin isolation.

Header height now establishes a minimum rather than a fixed box. Wrapped rows
remain within the background and sticky header measurements. A cached natural
menu-width measurement promotes navigation to a full-width second row when it
cannot fit beside the logo. No links, dropdowns or event handlers are cloned or
removed. Resizing reuses the cached measurement; content, typography and font
changes invalidate it. Long individual labels remain contained. The existing
phone drawer is unchanged.

Verification includes rendered Romanian navigation at five desktop widths and
three text sizes, compact/stacked switching, in-place menu edits, RTL, mobile,
canonical URL mismatch, template IDs, blocked editor clicks, reduced motion,
nested scrollers and a scaled full-height editor iframe. These are local
rendered/browser tests, not a claim of authenticated production editor access.

## Platform follow-up prompt

Verify section-picker links in the actual StoreLib editor and published site.
Save a real anchor URL with a stable section-instance ID and provide the correct
canonical storefront page to previews. Let valid same-page section links reach
the theme's early event handler without routing, selecting, or scrolling the
clicked block afterward. For cross-origin canvases, implement a parent-owned
scroll bridge that validates origin, frame source and section ID, accounts for
canvas zoom and sticky bars, and respects reduced motion. Test duplicated
sections, renamed pages, nested scroll containers, preview mode, and live
navigation. Preserve unrelated links and editor drag behavior.
