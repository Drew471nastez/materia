# Text section control pass

Sections updated in place: RichText Pro (`richtext1`), RichText Pro 2
(`richtext2`), Scrolling Text Reveal (`scroll-text-banner`), Text Heading,
Title & Subtitle, and Wavy Richtext Banner. Existing control IDs and content
are retained; the imported/generated sidebar schema is rebuilt from `shopify`.

Theme colour schemes, fonts and buttons are the defaults. Custom colours and
fonts are explicit overrides. Native font pickers replace long font lists;
legacy URL IDs remain hidden for compatibility. Schemas are grouped by content,
layout, typography, custom styling, motion, spacing and mobile. Button geometry
controls appear only when theme button geometry is disabled.

Live paint is scoped to each section/block. Text/image nodes are retained when
unrelated sliders move. Title & Subtitle renders every configured block, and
swapping the first pair does not overwrite additional blocks. Wave choices and
animation toggles update without replacing the text. Native theme button hover,
shape and type remain in control unless explicitly overridden.

Scrolling Text Reveal uses a shared controller rather than relying on custom
element upgrade timing for imported markup. It measures the actual sticky stage
for scroll progress, splits only text nodes, preserves bold highlights, cleans
up removed instances, and shows all text under reduced motion. The editor and
library get a compact, fully readable cover; the full scroll runway and stage
height settings apply on the storefront. Those controls explain that distinction.

Hero Pro 1 has no replay button or click handler. Its old label ID is hidden
solely to retain saved-setting compatibility. Entrances still run on storefront
landing and are not replayed by editor styling changes.

Verification: `tests/theme-text-sections.cjs` covers desktop/mobile live controls;
`tests/theme-text-sections-lifecycle.cjs` independently checks no-JS covers,
real visitor scroll progression, reduced-motion changes, word splitting,
multiple instances, additional title/subtitle blocks, wave controls and builder
attribute updates. Hero regression suites cover redraw stability, entrance and
parallax behavior. Tests use repository templates/assets with fixture data in
Chromium; the private StoreLib canvas and every physical device are not
accessible here. Pushes remain drafts and require creator review before Publish.
