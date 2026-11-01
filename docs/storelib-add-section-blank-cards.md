# Add a section shows blank cards

Seen on 1 November 2026, after the round 5 push (c098384, 69 section files): the Add a section
window shows an empty grey box for every card, including sections that push did not change
(Quick Add to Cart, the announcement bars).

## What the theme side checked

`tests/theme-library-previews.cjs` draws every section's first preset the way a library thumbnail
may be drawn: scripts off, the theme's real CSS, at 1366 and 390 wide. All 145 sections with a
preset draw text, a picture or a line. Two are allowlisted: the order notification floats over the
page (overlay group), and the header has its own tests. So the cards are not blank because a section
hides its content until a script runs.

The divider's presets now give it 24px above and below, so its card shows the line instead of a
1px strip.

## Prompt for the Storelib coding agent

The Add a section library of website afef93fd-87bc-4e65-ba59-d46f7db612c2 (an imported theme) shows
an empty grey card for every section. Find out whether the cards are still being regenerated after
the GitHub push of commit c098384 (69 files) or whether generation failed, and fix it. Each card
should be the section drawn from its first preset with the theme's layout CSS, schema defaults and
preset blocks, cached per section and invalidated when the section file, the snippets and assets it
uses, the theme settings or its presets change. A failed render should fall back to naming the
section, never an empty box. Check desktop and phone cards and that a stale cache does not survive a
push. Do not publish the site or change saved creator content. Report what was wrong and what checks
you ran.
