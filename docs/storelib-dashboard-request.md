# Request for Storelib: dashboard, builder and email fixes

Copy this to Storelib (support or the Storelib AI) as written. None of it is in
the theme repository; it is Storelib's own app. The real-time push and idle
freeze requests are in `storelib-builder-sync-prompt.md` and still apply.

---

**1. Builder: pushes not live, and freezing after idle.** See
`storelib-builder-sync-prompt.md`. In short: send a "draft changed" event to
open builders, redraw only the changed sections, coalesce pushes while the tab
is hidden, keep the old canvas until the new one has painted (no black or
blank frame), one redraw at a time.

**2. One page editor: endless white refresh screen.** Sometimes it shows a
white loading screen that never ends. Add a timeout (8 to 10 s) after which the
editor retries once and then shows an error with a Reload button; never loop
on reload. Log the failing request.

**3. Emails, receipts, order tracking and order pages use the wrong
language.** The default language in Settings is English, but these use
Romanian. Use the store's default language for everything sent to a buyer,
unless the buyer chose another language on the site (then use that one). The
same rule for receipts, order confirmation, shipping and tracking emails, the
order status and tracking pages.

**4. Publish dialog: custom domain is a Pro feature.** Next to the website
address, show a small white bold lightning icon marking custom domains as Pro.
Add domain stays clickable for everyone; free plans see the upgrade step.

**5. Countdown blocks in the builder panel.** For imported countdown blocks,
draw native controls for the settings the theme already stores, without
changing their ids: `end_date` and `countdown_date` as a calendar picker,
`end_hour` and `end_minute` as a time picker, `utc_offset` as a time zone
picker that writes the offset in force on the chosen date (explain daylight
saving there), `end_iso` as date, time and zone together. Keep legacy text
values as they are, refuse impossible dates (2026-02-30), and show the
resolved deadline in the panel ("Ends Thu 31 Dec 2026, 23:59 Bucharest,
21:59 UTC"). Apply a change by redrawing only that section; do not rebuild
product media.

**6. Analytics page (mobile).**
- The filters (Last 7 days, All pages, All products, download) sit in one row
  that scrolls sideways, not two rows.
- All / Digital / Physical / Communities: the grey switcher cuts off
  Communities. Make it a row of separate pills that scrolls sideways with a
  soft fade at the edge, or a single dropdown.
- The cards Visitors, Total revenue, Total orders, Conversion rate: add a right
  pointing arrow, like the home chart, that smoothly scrolls to the next card,
  so it is clear there are more.
- The grey progress bars further down fill smoothly when they scroll into view
  (ease out, about 600 ms), not instantly.

**7. Emails page (mobile).**
- Subscribers / Messages / Automations / Customers: the last tab is cut
  mid-word. Same fix as Analytics: sideways scrolling pills with a subtle fade
  at the cut edge.
- Remove the purple Try Pro / Upgrade bar on phones, at least on Emails.
- Add pull to refresh, like Orders.

**8. Pull to refresh takes 6 to 7 seconds.** Refresh only the list on screen,
show cached data at once, and stop the spinner within about a second, or show
an error.

**9. Navigation is slow.** Moving between Home, Orders, Products and Analytics,
and choosing an item in the phone menu (Dashboard, Products, Community,
Analytics, Orders, Creator page, Website, One page, Emails, Integrations),
sometimes freezes for up to 4 seconds. The menu should close at once on tap
and the next page should show its layout immediately (cached data or
skeleton) while data loads. Prefetch the bottom nav pages; do not wait on all
requests before navigating.

**10. Products page.** Scrolling the list with a finger triggers hover states
on product rows. Use hover styles only under `@media (hover: hover)`. Fix the
glitch when the page opens, and match the cleaner list layout of Orders and
Emails.
