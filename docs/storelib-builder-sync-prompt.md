# Request for Storelib: real-time pushes in the website builder

Copy this to Storelib (support or the Storelib AI) as written.

---

**Problem 1: pushes from GitHub or coding agents don't reach an open builder.**
When a commit is pushed to the site's connected GitHub repo (or written by an external coding agent), Storelib takes the files as a draft, but a website builder tab that is already open often keeps showing the old version until the whole builder is reloaded.

Please make every accepted push update open builder tabs within a few seconds, without a manual reload:
- Push a "draft changed" event to open editors (WebSocket or server-sent events).
- Redraw only the sections, snippets, settings and assets that changed.
- Keep the creator's selection, scroll position and open panels.
- If a file the creator is editing changed underneath them, show a small notice ("Updated from GitHub") instead of silently overwriting or ignoring it.

**Problem 2: after the tab has been idle, the builder freezes and the canvas goes black.**
After the builder sits in a background tab for a while and the creator comes back while pushes are arriving, the editor is very laggy, scrolling glitches, and the canvas turns black or blank before the page reappears.

Please:
- Coalesce queued updates while the tab is hidden (`document.visibilityState`). On return, apply only the latest draft once, not every intermediate push in sequence.
- Keep the previous canvas visible until the new one has painted. Swap when the new frame fires `load`, or use a double-buffered iframe, instead of blanking it.
- Throttle canvas redraws to one at a time, cancel a redraw that a newer push makes obsolete, and avoid re-running the whole page for a change limited to one section.
- After a full canvas reload, dispatch `storelib:section-load` only for sections that actually changed.

**Context from the theme side:** the Materia theme already tears down and re-creates its scripts on `storelib:section-load`, pauses timers in hidden tabs, and keeps the canvas calm on reload (no entrance animations or fades in design mode). The remaining delay and blanking happen before the theme receives the new page.

---

**Problem 3 (builder panel): headers inside colour schemes.**
When `shopify/config/settings_schema.json` defines `{"type":"header","content":"Primary button"}` inside a `color_scheme_group` definition, please draw it as a divider in each scheme's list, the way Theme settings draw headers between settings.
