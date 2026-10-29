# StoreLib app-side follow-up

The theme no longer offers Page Sale Banner or the original Promo Banner 1. Their definitions were emptied and their presets removed before deleting the files from Git. StoreLib deliberately retains Git-deleted definitions, so permanent removal needs the builder's section-definition deletion mechanism.

Promo Banner 2 now displays as **Promo Banner 1**. Its internal type remains `promo-banner-2` to preserve saved references. Do not delete or rename that type.

The Hero Product 2/3/4 templates provide editor-only empty-state covers and real presets. The theme cannot directly invalidate StoreLib's generated thumbnail cache.

## Prompt for the StoreLib coding agent

Permanently delete the retired section definitions `page-sale-banner` and `promo-banner-1`, including cached library entries, after verifying no page/group instances reference them. Keep `promo-banner-2`: it is the new section labeled “Promo Banner 1.” Regenerate Hero Product 2, 3 and 4 library preview cards from their current canonical presets, theme settings and actual templates. Supply schema defaults and preset blocks during rendering, support their imported assets, and invalidate stale cached covers when templates, snippets, styles, settings or presets change. Check mobile/desktop covers and the editor canvas. Do not publish the site or remove saved creator content. Report the exact definitions removed and preview-generation checks performed.
