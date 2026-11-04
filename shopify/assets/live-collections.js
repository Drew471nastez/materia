/* Materia Themes. Live editor updates and runtimes for the Collections
   sections: Category Banners, Category Banners 2, Collection Banner,
   Collections Display, Collection Hero Pro, Collection Lookbook, Collection
   List and Scrolling Collection.

   Every root [data-cl-root] carries its settings, defaults and block
   defaults as JSON; every block [data-cl-block] carries its own. GEN (written
   by the same table that prints the section's first paint) maps settings to
   CSS variables and data attributes on the root and on each block; each type
   adds its text, links, pictures and visibility. On load the first derive is
   only recorded, never painted. After that an output is written only when its
   value changes, one frame per root, so a picture never reloads, a marquee or
   carousel never restarts and a slide never jumps for an unrelated edit.
   Settings that need the store's data (a collection picked, the number of
   rows, carousel or grid) wait for the builder's redraw. audit() compares the
   derived outputs with the markup (used by the tests).

   The runtimes live here too, because an inline script is not sure to run in
   the builder canvas: the Lookbook carousel (arrows, dots, keyboard, drag,
   autoplay), the Scrolling Collection marquee (seamless loop, drag, pause
   button, pause on hover and off screen) and the Collection List hover
   preview. Everything stops under reduced motion and when off screen. */
(() => {
  if (window.MateriaCollections) return;
  /* @@GEN-START@@ */
  const GEN = {"category-banners-2":{"root":[["gap","num",{"unit":"px"}],["padding_top","num",{"unit":"px"}],["padding_bottom","num",{"unit":"px"}],["side_padding_desktop","num",{"unit":"px"}],["side_padding_mobile","num",{"unit":"px"}],["aspect_ratio_desktop","raw",{}],["aspect_ratio_mobile","raw",{}],["border_radius","num",{"unit":"px"}],["heading_letter_spacing","num",{"unit":"em"}],["heading_shadow","raw",{}],["section_bg","color",{"gate":"s.enable_custom_styling","fb":"var(--color-background)","off":"var(--color-background)"}],["heading_color","color",{"gate":"s.enable_custom_styling","fb":"#ffffff","off":"#ffffff"}],["sub_color","color",{"gate":"s.enable_custom_styling","fb":"rgba(255, 255, 255, 0.92)","off":"rgba(255, 255, 255, 0.92)"}],["underline_color","color",{"gate":"s.enable_custom_styling","fb":"currentColor","off":"currentColor"}],["overlay_color","color",{"gate":"s.enable_custom_styling","fb":"#000000","off":"#000000"}],["image_bg","color",{"gate":"s.enable_custom_styling","fb":"#1f2937","off":"#1f2937"}],["heading_size_desktop","num",{"unit":"px","gate":"s.enable_custom_styling"}],["heading_size_mobile","num",{"unit":"px","gate":"s.enable_custom_styling"}],["heading_weight","num",{"gate":"s.enable_custom_styling"}],["sub_size","num",{"unit":"px","gate":"s.enable_custom_styling"}],["overlay_opacity","div100",{}],["overlay_opacity_hover","div100",{}],["image_base_scale","div100",{}],["image_hover_scale","div100",{}],["hover_duration","num",{"unit":"ms"}],["underline_thickness","num",{"unit":"px"}],["underline_offset","num",{"unit":"px"}],["underline_duration","num",{"unit":"ms"}],["layout","raw",{"name":"@data-layout"}],["mobile_layout","raw",{"name":"@data-mobile-layout"}],["header_alignment","raw",{"name":"@data-header-align"}],["text_position","raw",{"name":"@data-text-position"}],["sub_visibility","raw",{"name":"@data-sub-visibility"}],["corner_style","raw",{"name":"@data-corner"}],["underline_origin","raw",{"name":"@data-underline-origin"}],["heading_uppercase","bool",{"name":"@data-uppercase"}],["title_style","raw",{"name":"@data-title-style","gate":"!s.enable_custom_styling","off":"custom"}],["sub_style","raw",{"name":"@data-sub-style","gate":"!s.enable_custom_styling","off":"custom"}]],"heading":[["heading_color","color",{"gate":"b.custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["heading_font_weight","num",{"gate":"b.custom_style"}],["heading_font_size_desktop","num",{"unit":"px","gate":"b.custom_style"}],["heading_font_size_mobile","num",{"unit":"px","gate":"b.custom_style"}],["space_below_desktop","num",{"unit":"px"}],["space_below_mobile","num",{"unit":"px"}],["size_style","raw",{"name":"@data-size","gate":"!b.custom_style","off":"custom"}],["custom_style","const",{"name":"@data-own-weight","v":"","gate":"b.custom_style"}]],"subheading":[["subheading_color","color",{"gate":"b.custom_style","fb":"var(--color-text)","off":"var(--color-text)"}],["subheading_font_weight","num",{"gate":"b.custom_style"}],["subheading_font_size_desktop","num",{"unit":"px","gate":"b.custom_style"}],["subheading_font_size_mobile","num",{"unit":"px","gate":"b.custom_style"}],["space_below_desktop","num",{"unit":"px"}],["space_below_mobile","num",{"unit":"px"}],["text_size","raw",{"name":"@data-size","gate":"!b.custom_style","off":"custom"}],["custom_style","const",{"name":"@data-own-weight","v":"","gate":"b.custom_style"}]],"banner":[["heading_color","color",{"gate":"b.custom_style","fb":"var(--cl-heading_color)"}],["sub_color","color",{"gate":"b.custom_style","fb":"var(--cl-sub_color)"}],["overlay_color","color",{"gate":"b.custom_style","fb":"var(--cl-overlay_color)"}],["overlay_opacity","div100",{"gate":"b.custom_style"}]]},"category-banners":{"root":[["gap","num",{"unit":"px"}],["padding_top","num",{"unit":"px"}],["padding_bottom","num",{"unit":"px"}],["side_padding_desktop","num",{"unit":"px"}],["side_padding_mobile","num",{"unit":"px"}],["aspect_ratio_desktop","raw",{}],["aspect_ratio_mobile","raw",{}],["border_radius","num",{"unit":"px"}],["heading_letter_spacing","num",{"unit":"em"}],["heading_shadow","raw",{}],["section_bg","color",{"gate":"s.enable_custom_style","fb":"var(--color-background)","off":"var(--color-background)"}],["heading_color","color",{"gate":"s.enable_custom_style","fb":"#ffffff","off":"#ffffff"}],["sub_color","color",{"gate":"s.enable_custom_style","fb":"rgba(255, 255, 255, 0.92)","off":"rgba(255, 255, 255, 0.92)"}],["underline_color","color",{"gate":"s.enable_custom_style","fb":"currentColor","off":"currentColor"}],["overlay_color","color",{"gate":"s.enable_custom_style","fb":"#000000","off":"#000000"}],["image_bg","color",{"gate":"s.enable_custom_style","fb":"#1f2937","off":"#1f2937"}],["heading_size_desktop","num",{"unit":"px","gate":"s.enable_custom_style"}],["heading_size_mobile","num",{"unit":"px","gate":"s.enable_custom_style"}],["heading_weight","num",{"gate":"s.enable_custom_style"}],["sub_size","num",{"unit":"px","gate":"s.enable_custom_style"}],["overlay_opacity","div100",{}],["overlay_opacity_hover","div100",{}],["image_base_scale","div100",{}],["image_hover_scale","div100",{}],["hover_duration","num",{"unit":"ms"}],["underline_thickness","num",{"unit":"px"}],["underline_offset","num",{"unit":"px"}],["underline_duration","num",{"unit":"ms"}],["layout","raw",{"name":"@data-layout"}],["text_position","raw",{"name":"@data-text-position"}],["sub_visibility","raw",{"name":"@data-sub-visibility"}],["underline_origin","raw",{"name":"@data-underline-origin"}],["heading_uppercase","bool",{"name":"@data-uppercase"}]],"banner":[["heading_color","color",{"gate":"b.enable_custom_style","fb":"var(--cl-heading_color)"}],["sub_color","color",{"gate":"b.enable_custom_style","fb":"var(--cl-sub_color)"}],["overlay_color","color",{"gate":"b.enable_custom_style","fb":"var(--cl-overlay_color)"}],["overlay_opacity","div100",{"gate":"b.enable_custom_style"}]]},"scrolling-collection":{"root":[["padding_top_desktop","num",{"unit":"px"}],["padding_bottom_desktop","num",{"unit":"px"}],["padding_top_mobile","num",{"unit":"px"}],["padding_bottom_mobile","num",{"unit":"px"}],["gap_heading_sub","num",{"unit":"px"}],["gap_header","num",{"unit":"px"}],["gap_controls","num",{"unit":"px"}],["row_gap","num",{"unit":"px"}],["chip_gap","num",{"unit":"px"}],["chip_width","num",{"unit":"px"}],["chip_width_mobile","num",{"unit":"px"}],["chip_height","num",{"unit":"px"}],["chip_pad_x","num",{"unit":"px"}],["chip_pad_y","num",{"unit":"px"}],["chip_border_width","num",{"unit":"px"}],["chip_radius","num",{"unit":"px"}],["edge_fade_width","num",{"unit":"px"}],["chip_text_size","num",{"unit":"px"}],["chip_subtext_size","num",{"unit":"px"}],["chip_weight","raw",{}],["heading_size_desktop","num",{"unit":"px"}],["heading_size_mobile","num",{"unit":"px"}],["sub_size","num",{"unit":"px"}],["heading_weight","weight",{"fb":"var(--heading-weight, 700)"}],["scroll_duration","num",{"unit":"s"}],["section_bg","color",{"gate":"s.enable_custom_style","fb":"var(--color-background)","off":"var(--color-background)"}],["heading_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["sub_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-text)","off":"var(--color-text)"}],["chip_bg","color",{"gate":"s.enable_custom_style","fb":"color-mix(in srgb, var(--color-text) 5%, var(--color-background))","off":"color-mix(in srgb, var(--color-text) 5%, var(--color-background))"}],["chip_bg_hover","color",{"gate":"s.enable_custom_style","fb":"color-mix(in srgb, var(--color-text) 9%, var(--color-background))","off":"color-mix(in srgb, var(--color-text) 9%, var(--color-background))"}],["chip_text_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["chip_subtext_color","color",{"gate":"s.enable_custom_style","fb":"color-mix(in srgb, var(--color-text) 80%, transparent)","off":"color-mix(in srgb, var(--color-text) 80%, transparent)"}],["chip_border_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-border)","off":"var(--color-border)"}],["chip_img_bg","color",{"gate":"s.enable_custom_style","fb":"color-mix(in srgb, var(--color-text) 8%, var(--color-background))","off":"color-mix(in srgb, var(--color-text) 8%, var(--color-background))"}],["controls_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["toggle_active_bg","color",{"gate":"s.enable_custom_style","fb":"var(--btn-primary-bg-color)","off":"var(--btn-primary-bg-color)"}],["toggle_active_color","color",{"gate":"s.enable_custom_style","fb":"var(--btn-primary-color)","off":"var(--btn-primary-color)"}],["header_align","raw",{"name":"@data-align"}],["edge_fade","bool",{"name":"@data-fade"}],["pause_on_hover","bool",{"name":"@data-hover-pause"}]],"heading":[["color","color",{"gate":"b.enable_custom_style","fb":"var(--cl-heading_color)"}],["weight","raw",{"gate":"b.weight_enable"}],["weight_enable","const",{"name":"@data-own-weight","v":"","gate":"b.weight_enable"}],["size_desktop","num",{"unit":"px","gate":"b.size_enable"}],["size_mobile","num",{"unit":"px","gate":"b.size_enable"}]],"subheading":[["color","color",{"gate":"b.enable_custom_style","fb":"var(--cl-sub_color)"}],["size","num",{"unit":"px","gate":"b.size_enable"}]]},"collection-lookbook":{"root":[["padding_top_desktop","num",{"unit":"px"}],["padding_bottom_desktop","num",{"unit":"px"}],["padding_top_mobile","num",{"unit":"px"}],["padding_bottom_mobile","num",{"unit":"px"}],["gap_header","num",{"unit":"px"}],["gap_heading_sub","num",{"unit":"px"}],["gap_controls","num",{"unit":"px"}],["card_gap","num",{"unit":"px"}],["per_view_desktop","num",{}],["per_view_tablet","num",{}],["per_view_mobile","num",{}],["card_aspect","raw",{}],["card_radius","num",{"unit":"px"}],["hover_breath","num",{"unit":"px"}],["image_position","raw",{}],["overlay_opacity_top","num",{}],["overlay_opacity_bottom","num",{}],["content_vertical","raw",{}],["card_pad","num",{"unit":"px"}],["card_gap_inner","num",{"unit":"px"}],["kicker_size","num",{"unit":"px"}],["kicker_weight","raw",{}],["kicker_tracking","num",{"unit":"px"}],["kicker_transform","raw",{}],["title_size_desktop","num",{"unit":"px"}],["title_size_mobile","num",{"unit":"px"}],["title_weight","weight",{"fb":"var(--heading-weight, 600)"}],["title_tracking","num",{"unit":"px"}],["title_transform","raw",{}],["heading_size_desktop","num",{"unit":"px"}],["heading_size_mobile","num",{"unit":"px"}],["sub_size","num",{"unit":"px"}],["heading_weight","weight",{"fb":"var(--heading-weight, 700)"}],["dot_size","num",{"unit":"px"}],["dot_size_active","num",{"unit":"px"}],["btn_offset","num",{"unit":"px"}],["btn_radius","num",{"unit":"px","gate":"!s.use_theme_button","off":"var(--btn-radius, 4px)"}],["btn_size","num",{"unit":"px","gate":"!s.use_theme_button","off":"var(--btn-font-size, 14px)"}],["btn_weight","raw",{"gate":"!s.use_theme_button","off":"var(--btn-font-weight, 600)"}],["btn_tracking","num",{"unit":"px","gate":"!s.use_theme_button","off":"var(--btn-letter-spacing, 0px)"}],["btn_transform","raw",{"gate":"!s.use_theme_button","off":"var(--btn-text-transform, none)"}],["btn_pad_x","num",{"unit":"px","gate":"!s.use_theme_button","off":"var(--btn-padding-x, 22px)"}],["btn_pad_y","num",{"unit":"px","gate":"!s.use_theme_button","off":"var(--btn-padding-y, 10px)"}],["section_bg","color",{"gate":"s.enable_custom_style","fb":"var(--color-background)","off":"var(--color-background)"}],["heading_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["sub_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-text)","off":"var(--color-text)"}],["card_bg","color",{"gate":"s.enable_custom_style","fb":"#1f2937","off":"#1f2937"}],["card_text_color","color",{"gate":"s.enable_custom_style","fb":"#ffffff","off":"#ffffff"}],["kicker_color","color",{"gate":"s.enable_custom_style","fb":"var(--cl-card_text_color)","off":"var(--cl-card_text_color)"}],["title_color","color",{"gate":"s.enable_custom_style","fb":"var(--cl-card_text_color)","off":"var(--cl-card_text_color)"}],["btn_bg","color",{"gate":"s.enable_custom_style","fb":"var(--btn-primary-bg-color)","off":"var(--btn-primary-bg-color)"}],["btn_color","color",{"gate":"s.enable_custom_style","fb":"var(--btn-primary-color)","off":"var(--btn-primary-color)"}],["btn_bg_hover","color",{"gate":"s.enable_custom_style","fb":"var(--btn-primary-hover-bg-color)","off":"var(--btn-primary-hover-bg-color)"}],["btn_color_hover","color",{"gate":"s.enable_custom_style","fb":"var(--btn-primary-hover-color)","off":"var(--btn-primary-hover-color)"}],["controls_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["dot_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-border)","off":"var(--color-border)"}],["dot_active_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["header_align","raw",{"name":"@data-align"}],["show_section_on","raw",{"name":"@data-show-on"}],["hover_zoom","bool",{"name":"@data-zoom"}]],"heading":[["color","color",{"gate":"b.enable_custom_style","fb":"var(--cl-heading_color)"}],["weight","weight",{"fb":"var(--heading-weight, 700)"}],["size_desktop","num",{"unit":"px","gate":"b.size_enable"}],["size_mobile","num",{"unit":"px","gate":"b.size_enable"}],["line_height","num",{"gate":"b.size_enable"}],["tracking","num",{"unit":"px","gate":"b.size_enable"}],["size_enable","const",{"name":"@data-own-size","v":"","gate":"b.size_enable"}],["transform","raw",{}],["gap_top","num",{"unit":"px"}],["gap_bottom","num",{"unit":"px"}]],"subheading":[["color","color",{"gate":"b.enable_custom_style","fb":"var(--cl-sub_color)"}],["size","num",{"unit":"px","gate":"b.size_enable"}],["line_height","num",{"gate":"b.size_enable"}],["max_width","num",{"unit":"px"}],["gap_top","num",{"unit":"px"}]]},"collectionnlist":{"root":[["inner_width_px","num",{"unit":"px"}],["image_border_radius","num",{"unit":"px"}],["desktop_text_size","num",{"unit":"px"}],["mobile_text_size","num",{"unit":"px"}],["font_weight","weight",{"fb":"var(--heading-weight, 700)"}],["underline_thickness","num",{"unit":"px"}],["desktop_container_gap","num",{"unit":"px"}],["mobile_container_gap","num",{"unit":"px"}],["desktop_menu_offset","num",{"unit":"%"}],["desktop_top_padding","num",{"unit":"px"}],["desktop_bottom_padding","num",{"unit":"px"}],["mobile_top_padding","num",{"unit":"px"}],["mobile_bottom_padding","num",{"unit":"px"}],["desktop_image_position","raw",{}],["mobile_image_position","raw",{}],["object_fit","raw",{}],["desktop_ratio","map",{"map":{"coverfit":"auto","auto":"auto","landscape":"16 / 9","portrait":"3 / 4","square":"1 / 1","square_portrait":"4 / 5","rectangle":"3 / 2","*":"auto"}}],["mobile_ratio","map",{"map":{"coverfit":"1 / 1","auto":"auto","landscape":"16 / 9","portrait":"3 / 4","square":"1 / 1","square_portrait":"4 / 5","rectangle":"3 / 2","*":"1 / 1"}}],["background_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-background)","off":"var(--color-background)"}],["background_gradient","ornone",{"gate":"s.enable_custom_style","off":"none"}],["title_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["hover_color","color",{"gate":"s.enable_custom_style","fb":"var(--color-primary)","off":"var(--color-primary)"}],["underline_color","color",{"gate":"s.enable_custom_style","fb":"currentColor","off":"currentColor"}],["enable_underline","bool",{"name":"@data-underline"}],["desktop_ratio","raw",{"name":"@data-ratio-d"}],["mobile_ratio","raw",{"name":"@data-ratio-m"}]]},"collection-list2":{"root":[["left_col_fr","num",{"unit":"fr"}],["center_col_fr","num",{"unit":"fr"}],["right_col_fr","num",{"unit":"fr"}],["col_gap_desktop","num",{"unit":"px"}],["col_gap_mobile","num",{"unit":"px"}],["align_columns","raw",{}],["content_align","raw",{}],["content_text_align","raw",{}],["content_radius","num",{"unit":"px"}],["content_padding_desktop","num",{"unit":"px"}],["content_padding_x_desktop","num",{"unit":"px"}],["content_padding_mobile","num",{"unit":"px"}],["content_padding_x_mobile","num",{"unit":"px"}],["content_gap_desktop","num",{"unit":"px"}],["content_gap_mobile","num",{"unit":"px"}],["media_max_mobile","num",{"unit":"px"}],["padding_top_desktop","num",{"unit":"px"}],["padding_bottom_desktop","num",{"unit":"px"}],["padding_top_mobile","num",{"unit":"px"}],["padding_bottom_mobile","num",{"unit":"px"}],["section_bg","color",{"gate":"s.enable_custom_style","fb":"var(--color-background)","off":"var(--color-background)"}],["content_bg","color",{"gate":"s.enable_custom_style","fb":"color-mix(in srgb, var(--color-text) 6%, var(--color-background))","off":"color-mix(in srgb, var(--color-text) 6%, var(--color-background))"}],["media_bg","color",{"gate":"s.enable_custom_style","fb":"color-mix(in srgb, var(--color-text) 6%, var(--color-background))","off":"color-mix(in srgb, var(--color-text) 6%, var(--color-background))"}],["show_section_on","raw",{"name":"@data-show-on"}]],"media_left":[["aspect_desktop","raw",{}],["aspect_mobile","raw",{}],["radius","num",{"unit":"px"}]],"media_right":[["aspect_desktop","raw",{}],["aspect_mobile","raw",{}],["radius","num",{"unit":"px"}]],"badge":[["bg","color",{"gate":"b.enable_custom_style","fb":"var(--color-background)","off":"var(--color-background)"}],["color","color",{"gate":"b.enable_custom_style","fb":"var(--color-primary)","off":"var(--color-primary)"}],["border_color","color",{"gate":"b.enable_custom_style","fb":"var(--color-border)","off":"var(--color-border)"}],["border_width","num",{"unit":"px"}],["size","num",{"unit":"px"}],["weight","raw",{}],["tracking","num",{"unit":"px"}],["pad_x","num",{"unit":"px"}],["pad_y","num",{"unit":"px"}],["radius","num",{"unit":"px"}],["transform","raw",{}],["gap_top","num",{"unit":"px"}],["gap_bottom","num",{"unit":"px"}]],"heading":[["color","color",{"gate":"b.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["weight","weight",{"fb":"var(--heading-weight, 700)"}],["size_desktop","num",{"unit":"px","gate":"b.size_enable"}],["size_mobile","num",{"unit":"px","gate":"b.size_enable"}],["line_height","num",{"gate":"b.size_enable"}],["tracking","num",{"unit":"px","gate":"b.size_enable"}],["size_enable","const",{"name":"@data-own-size","v":"","gate":"b.size_enable"}],["transform","raw",{}],["gap_top","num",{"unit":"px"}],["gap_bottom","num",{"unit":"px"}]],"description":[["color","color",{"gate":"b.enable_custom_style","fb":"var(--color-text)","off":"var(--color-text)"}],["size_desktop","num",{"unit":"px","gate":"b.size_enable"}],["size_mobile","num",{"unit":"px","gate":"b.size_enable"}],["line_height","num",{"gate":"b.size_enable"}],["max_width","num",{"unit":"px"}],["gap_top","num",{"unit":"px"}],["gap_bottom","num",{"unit":"px"}]],"button":[["min_width","num",{"unit":"px"}],["gap_top","num",{"unit":"px"}],["gap_top_desktop","num",{"unit":"px"}]]},"collection-banner":{"root":[["items_gap","num",{"unit":"px"}],["padding_top_desktop","num",{"unit":"px"}],["padding_bottom_desktop","num",{"unit":"px"}],["padding_top_mobile","num",{"unit":"px"}],["padding_bottom_mobile","num",{"unit":"px"}],["horizontal_padding_desktop","num",{"unit":"px"}],["horizontal_padding_mobile","num",{"unit":"px"}],["inner_width","num",{"unit":"%"}],["inner_width_mobile","num",{"unit":"%"}],["card_border_radius","num",{"unit":"px"}],["section_max_width","map",{"map":{"":"none","*":"{{ X }}px"}}],["section_bg","color",{"gate":"s.enable_custom_style","fb":"var(--color-background)","off":"var(--color-background)"}],["desktop_content_position","raw",{"name":"@data-pos"}],["mobile_content_position","raw",{"name":"@data-pos-m"}]],"collection":[["card_height","num",{}],["vertical_text_gap","num",{"unit":"px"}],["heading_size","num",{"unit":"px"}],["subheading_size","num",{"unit":"px"}],["description_size","num",{"unit":"px"}],["heading_font_weight","weight",{"fb":"var(--heading-weight, 600)"}],["subheading_font_weight","raw",{}],["description_font_weight","weight",{"fb":"var(--body-weight, 400)"}],["overlay_opacity","div100",{}],["text_color","color",{"gate":"b.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}],["overlay_color","color",{"gate":"b.enable_custom_style","fb":"transparent","off":"transparent"}],["primary_text_color","color",{"gate":"b.enable_custom_style","fb":"var(--color-heading)","off":"var(--color-heading)"}]]},"collection-list":{"root":[["padding_top","num",{"name":"--section-pt"}],["padding_bottom","num",{"name":"--section-pb"}],["header_spacing","num",{"unit":"px"}],["image_overlay_opacity","div100",{}],["custom_section_bg","color",{"gate":"s.enable_custom_bg","fb":"var(--color-background)"}],["header_alignment","raw",{"name":"@data-align"}],["card_hover_effect","raw",{"name":"@data-hover"}],["heading_underline","bool",{"name":"@data-underline"}]]}};
  /* @@GEN-END@@ */
  const SEL = '[data-cl-root]', BSEL = '[data-cl-block]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && v !== false && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => localColor(v, f);
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { if (!image && typeof v === 'string' && /^\/(?!\/)/.test(v)) return v; const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  const fontCss = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : null;
    const fam = api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? null : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const scrub = html => String(html || '').replace(/<[^>]*>/g, '');
  const blank = v => !String(v ?? '').trim();

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = scrub(value);
  }
  /* An element becomes a link with an address and a plain element without one, keeping its attributes and children. */
  function link(el, href, st, plain) {
    const tag = href ? 'A' : plain;
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); if (el.tagName !== 'BUTTON') el.removeAttribute('type'); } else { el.removeAttribute('href'); if (tag === 'BUTTON') el.setAttribute('type', 'button'); }
    return el;
  }
  function write(el, key, v, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key.startsWith('href:')) return link(el, v, st, key.slice(5));
    else if (key === 'card') return clCard(el, v);
    else if (key === 'picture') {
      /* An image setting: the same <img> gets the new address (no reload when unchanged); a placeholder becomes an <img>. */
      const d = parse(v); if (!d.src) return el;
      let img = el.tagName === 'IMG' ? el : el.querySelector('img:not([data-cl-ph])');
      if (!img) {
        img = document.createElement('img'); img.decoding = 'async'; img.loading = 'lazy';
        if (d.cls) img.className = d.cls;
        let put = img;
        if (d.wrap) { put = document.createElement('picture'); put.append(img); }
        const ph = el.querySelector('[data-cl-ph]'); if (ph) ph.replaceWith(put); else el.prepend(put);
      }
      if (img.getAttribute('src') !== d.src) { img.removeAttribute('srcset'); img.src = d.src; }
      img.alt = d.alt || '';
      if (d.w && d.h) { img.width = d.w; img.height = d.h; }
      if ('mobile' in d) {
        /* A phone picture: a <source> for small screens in the same <picture>. */
        let pic = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null;
        if (!pic && d.mobile) { pic = document.createElement('picture'); img.replaceWith(pic); pic.append(img); }
        let src = pic && pic.querySelector('source');
        if (d.mobile) { if (!src) { src = document.createElement('source'); src.media = '(max-width: ' + (d.bp || 767) + 'px)'; pic.prepend(src); } if (src.getAttribute('srcset') !== d.mobile) src.srcset = d.mobile; }
        else if (src) src.remove();
      }
      return el;
    }
    return el;
  }

  /* ---------- generated outputs (GEN) ---------- */
  function gate(g, s, b) {
    const neg = g[0] === '!'; const m = g.replace(/^!/, '').match(/^([sb])\.(\w+)(?:(==|!=)'([^']*)')?$/);
    const v = (m[1] === 's' ? s : b)[m[2]];
    let on = m[3] ? (m[3] === '==' ? String(v ?? '') === m[4] : String(v ?? '') !== m[4]) : !!v && v !== 'false';
    return neg ? !on : on;
  }
  function genValue(kind, v, o) {
    switch (kind) {
      case 'const': return o.v;
      case 'ornone': return blank(v) ? 'none' : String(v);
      case 'num': return String(num(v)) + (o.unit || '');
      case 'div100': return String(num(v) / 100);
      case 'raw': return v == null ? '' : String(v);
      case 'map': { const k = v == null ? '' : String(v); return k in o.map && k !== '*' ? o.map[k] : '*' in o.map ? o.map['*'].replace(/\{\{[^}]*\}\}/, k) : k; }
      case 'color': return color(v, o.fb);
      case 'weight': return blank(v) || v === 'theme' ? o.fb : String(v);
      case 'bool': return bool(v) ? (o.on ?? 'true') : (o.off ?? 'false');
    }
    return null;
  }
  function genApply(c, el, list, own, prefix) {
    if (!el || !list) return;
    for (const [id, kind, o] of list) {
      const name = o.name || prefix + id;
      const src = o.src ? (o.src[0] === 's' ? c.s : own)[o.src.slice(2)] : own[id];
      let v = o.gate && !gate(o.gate, c.s, own) ? (o.off ?? null) : genValue(kind, src, o);
      c.put(el, name, v);
    }
  }

  /* ---------- shared pieces ---------- */
  const custom = s => bool(s.enable_custom_style);
  function rootCommon(c) {
    const {root, s, put, wrap, desktop} = c;
    const scheme = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof scheme === 'string' && /^[\w-]+$/.test(scheme)) put(root, 'scheme', scheme);
    if ('enable_custom_fonts' in s) {
      const fonts = bool(s.enable_custom_fonts);
      const h = fonts ? fontCss(s.heading_font) : null, b = fonts ? fontCss(s.body_font) : null;
      put(root, '--heading-font', h); put(root, '--body-font', b);
      put(root, '@data-own-font', fonts && (h || b) ? true : null);
    }
    if (wrap && c.type.margins !== false) {
      const reset = bool(s.reset_spacing);
      for (const side of ['top', 'bottom']) {
        const id = 'section_margin_' + side + '_' + (desktop ? 'desktop' : 'mobile');
        put(wrap, '!margin-' + side, reset ? '0px' : id in s ? px(s[id]) : null);
      }
    }
  }
  /* A theme button: its colours when custom styling is on, its own shape (data-own-shape) when the theme style is off. */
  function themeButton(c, el, on, cols, shape, shapeVals) {
    const {put} = c, cv = v => on ? color(v, '') : '';
    const bg = cv(cols.bg), hb = cv(cols.hover_bg);
    put(el, '--mb-bg', bg || null); put(el, '--mb-text', cv(cols.text) || null); put(el, '--mb-border', cv(cols.border) || bg || null);
    put(el, '--mb-hover-bg', hb || null); put(el, '--mb-hover-text', cv(cols.hover_text) || null); put(el, '--mb-hover-border', cv(cols.hover_border) || hb || null);
    for (const [k, v] of Object.entries(shapeVals || {})) put(el, k, shape ? v : null);
    put(el, '@data-own-shape', shape || null);
    if (shapeVals && '--mb-weight' in shapeVals) put(el, '@data-own-weight', shape || null);
  }

  const TYPES = {};
  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.clRoot]; if (!type) return [];
    const out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      out.push([el, key, v]);
      if (record === 'audit') return el;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      m.set(key, v);
      return write(el, key, v, st) || el;
    };
    const blocks = [...root.querySelectorAll(BSEL)].filter(el => el.closest(SEL) === root && !el.closest('[aria-hidden="true"][data-cl-copy]')).map(el => {
      const id = el.dataset.clBlock, t = el.dataset.clType;
      if (st.rawBlocks.get(id) !== el.dataset.clSettings) { st.rawBlocks.set(id, el.dataset.clSettings); st.blocks.set(id, {...parse(el.dataset.clSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: t, b: {...(st.blockDefaults[t] || {}), ...st.blocks.get(id)}};
    });
    const c = {root, st, type, s: st.s, put, blocks, wrap: root.closest('.shopify-section'), desktop: st.mq.matches, q: sel => root.querySelector(sel), qa: sel => [...root.querySelectorAll(sel)], record};
    const gen = GEN[root.dataset.clRoot] || {};
    rootCommon(c);
    genApply(c, root, gen.root, st.s, '--cl-');
    for (const x of blocks) genApply(c, x.el, gen[x.type], x.b, '--clb-');
    type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.clSettings) { st.raw = root.dataset.clSettings; st.s = {...st.defaults, ...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    const type = TYPES[root.dataset.clRoot];
    if (type.update) type.update(root, st);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule); st.reduced.removeEventListener('change', st.onMotion);
    if (st.io) st.io.disconnect();
    if (st.ro) st.ro.disconnect();
    cancelAnimationFrame(st.frame); st.abort.abort();
    const type = TYPES[root.dataset.clRoot]; if (type && type.stop) type.stop(root, st);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.clRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const defaults = parse(root.dataset.clDefaults);
    const st = {root, defaults, live: {}, liveBlocks: new Map(), s: {...defaults, ...parse(root.dataset.clSettings)}, raw: root.dataset.clSettings, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.clBlockDefaults), last: new Map(), visible: true,
      mq: matchMedia('(min-width: ' + (type.bp || 768) + 'px)'), reduced: matchMedia('(prefers-reduced-motion: reduce)'), abort: new AbortController()};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.onMotion = () => { if (type.motion) type.motion(root, st); st.schedule(); };
    st.mq.addEventListener('change', st.schedule); st.reduced.addEventListener('change', st.onMotion);
    roots.set(root, st);
    derive(root, st, true);
    if (type.init) type.init(root, st);
    st.schedule();
    root.dataset.clReady = '';
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll(SEL)) { const st = roots.get(root); if (st) st.schedule(); else add(root); }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    for (const [root, st] of roots) {
      if (root.dataset.clSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      const type = TYPES[root.dataset.clRoot];
      if (type.live) type.live(root, st, d.settings, bid);
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) { const type = TYPES[root.dataset.clRoot]; if (type.motion) type.motion(root, st); } });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',' + BSEL) || n.querySelector(SEL + ',' + BSEL));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',' + BSEL) : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-cl-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false) { have = have !== null; } else want = v == null ? null : String(v); }
      else if (key[0] === '.') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'text') { have = el.textContent; want = v == null ? '' : String(v); }
      else continue;
      if (have !== want) bad.push((el.dataset.clBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }


  /* ---------- Category Banners and Category Banners 2 ---------- */
  function banner(c, x, P) {
    const {put, s, root} = c, b = x.b, li = x.el;
    const collTitle = li.dataset.clCollTitle || '', collUrl = li.dataset.clCollUrl || '';
    const title = blank(b.heading) ? collTitle : String(b.heading);
    const href = url(b.link) || collUrl;
    const item = put(li.querySelector('.' + P + '__item'), 'href:DIV', href);
    if (!item) return;
    put(item, '@aria-label', !title && href ? root.dataset.clBannerLabel || null : null);
    const h = item.querySelector('.' + P + '__heading');
    put(h, 'text', title); put(h, 'hidden', !title);
    put(h, '@data-own-weight', bool(s.enable_custom_styling ?? s.enable_custom_style) || null);
    put(h, '@data-own-size', num(s.heading_letter_spacing) !== 0 || null);
    const sub = item.querySelector('.' + P + '__sub');
    if (sub) { put(sub, sub.classList.contains(P + '__rt') ? 'rich' : 'text', b.subheading || ''); put(sub, 'hidden', blank(b.subheading)); }
    const media = item.querySelector('.' + P + '__media');
    const own = url(b.image, true), mob = url(b.image_mobile, true);
    const src = own || (li.dataset.clOwnImage === 'true' ? '' : mob || url(s.placeholder_url, true));
    if (src) put(media, 'picture', JSON.stringify({src, alt: title, cls: P + '__img', wrap: P === 'cb2', ...('image_mobile' in b ? {mobile: own ? mob : ''} : {})}));
    if (own) put(li, '@data-cl-own-image', 'true');
  }
  const bannersType = P => ({
    derive(c) {
      const {root, s, put, blocks} = c;
      put(root, '@data-width', s.section_width || 'full_width');
      let head = 0;
      for (const x of blocks) {
        const b = x.b, el = x.el;
        if (x.type === 'heading') { put(el, 'rich', b.heading || ''); put(el, 'hidden', blank(b.heading)); if (!blank(b.heading)) head++; }
        else if (x.type === 'subheading') { put(el, 'rich', b.subheading || ''); put(el, 'hidden', blank(b.subheading)); if (!blank(b.subheading)) head++; }
        else if (x.type === 'banner') banner(c, x, P);
      }
      put(c.q('.' + P + '__head'), 'hidden', !head);
    },
  });
  TYPES['category-banners-2'] = bannersType('cb2');
  TYPES['category-banners'] = bannersType('cb1');


  /* ---------- Shared header blocks (heading, subheading) and legacy section text ---------- */
  function header(c, sel, legacy) {
    const {put, s, blocks, q} = c;
    let n = 0;
    for (const x of blocks) {
      if (x.type !== 'heading' && x.type !== 'subheading') continue;
      const t = x.b.text;
      put(x.el, 'rich', t || ''); put(x.el, 'hidden', blank(t)); if (!blank(t)) n++;
      if (x.type === 'heading' && 'weight_enable' in x.b) put(x.el, '@data-own-weight', bool(x.b.weight_enable) || null);
    }
    for (const [type, id, kind] of legacy || []) {
      const el = q('[data-cl-legacy="' + type + '"]');
      if (el) { put(el, kind || 'text', s[id] || ''); put(el, 'hidden', blank(s[id])); if (!blank(s[id])) n++; }
    }
    put(q(sel), 'hidden', !n);
    return n;
  }

  /* ---------- Scrolling Collection ---------- */
  TYPES['scrolling-collection'] = {
    derive(c) {
      const {root, s, put, blocks, q, qa} = c;
      put(root, '@data-width', s.section_width || 'stretch_width');
      header(c, '.scol__header', [['heading', 'heading'], ['subheading', 'subheading']]);
      const lh = q('[data-cl-legacy="heading"]');
      if (lh) put(lh, '@data-own-weight', !blank(s.heading_weight) && s.heading_weight !== 'theme' || null);
      qa('[data-scol-row]').forEach((row, i) => put(row, '@data-direction', i === 1 && bool(s.alternate_direction) ? 'right' : 'left'));
      put(q('.scol__controls'), 'hidden', !bool(s.show_controls));
      const fallback = root.dataset.clFallbackLabel || '';
      for (const x of blocks) {
        if (x.type !== 'collection') continue;
        const b = x.b, d = x.el.dataset;
        const collTitle = d.clCollTitle || '', count = d.clCollCount;
        let first = b.label_first, second = b.label_second;
        if (blank(first) && blank(second) && collTitle) first = collTitle;
        if (blank(second) && count !== '' && count != null && bool(s.show_product_count)) second = +count === 1 ? '1 product' : count + ' products';
        const el = put(x.el, 'href:DIV', url(b.link) || d.clCollUrl || '');
        if (el.tagName === 'A') el.draggable = false;
        put(el.querySelector('.scol__chip-label'), 'text', blank(first) ? fallback : String(first));
        const sub = el.querySelector('.scol__chip-sub');
        put(sub, 'text', second || ''); put(sub, 'hidden', blank(second));
        const src = url(b.image, true);
        if (src) put(el.querySelector('.scol__chip-media'), 'picture', JSON.stringify({src, alt: '', cls: 'scol__chip-img', w: b.image && b.image.width || 0, h: b.image && b.image.height || 0}));
      }
    },
    init(root, st) {
      const T = TYPES['scrolling-collection'], sig = {signal: st.abort.signal};
      st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; T.motion(root, st); });
      st.io.observe(root);
      st.ro = new ResizeObserver(() => { cancelAnimationFrame(st.fillFrame); st.fillFrame = requestAnimationFrame(() => T.fill(root, st)); });
      st.ro.observe(root);
      const btn = root.querySelector('[data-scol-toggle]');
      if (btn) btn.addEventListener('click', () => { st.paused = !st.paused; btn.setAttribute('aria-pressed', String(st.paused)); T.motion(root, st); }, sig);
      for (const row of root.querySelectorAll('[data-scol-row]')) T.drag(root, st, row, sig);
      T.fill(root, st);
      T.motion(root, st);
    },
    /* Enough copies of the chips for a seamless loop on any screen: the track moves by one set (its period). */
    fill(root, st) {
      if (!root.isConnected || st.reduced.matches) return;
      for (const track of root.querySelectorAll('[data-scol-track]')) {
        const sets = track.querySelectorAll(':scope > .scol__set'); if (!sets.length) continue;
        const period = track.scrollWidth / sets.length, row = track.parentElement;
        if (!period) continue;
        const need = Math.max(2, Math.ceil(row.clientWidth / period) + 1);
        for (let i = sets.length; i < need; i++) { const copy = sets[sets.length - 1].cloneNode(true); copy.setAttribute('data-cl-copy', ''); copy.setAttribute('aria-hidden', 'true'); track.append(copy); }
        const n = Math.max(need, sets.length);
        track.style.setProperty('--scol-shift', n > 2 ? -(track.scrollWidth / n) + 'px' : '-50%');
      }
    },
    drag(root, st, row, sig) {
      const track = row.querySelector('[data-scol-track]'); if (!track) return;
      let down = null;
      const period = () => { const n = track.querySelectorAll(':scope > .scol__set').length || 2; return track.scrollWidth / n; };
      const x0 = () => { const m = new DOMMatrixReadOnly(getComputedStyle(track).transform); return m.m41; };
      row.addEventListener('pointerdown', e => {
        if (st.reduced.matches || (e.pointerType === 'mouse' && e.button !== 0)) return;
        down = {x: e.clientX, id: e.pointerId, start: x0(), moved: false, p: period()};
      }, sig);
      row.addEventListener('pointermove', e => {
        if (!down || e.pointerId !== down.id) return;
        const dx = e.clientX - down.x;
        if (!down.moved) { if (Math.abs(dx) < 8) return; down.moved = true; row.classList.add('is-grabbing'); try { row.setPointerCapture(e.pointerId); } catch (_) {} track.style.animation = 'none'; }
        let v = down.start + dx; while (v <= -down.p) v += down.p; while (v > 0) v -= down.p;
        down.v = v; track.style.transform = 'translateX(' + v + 'px)';
      }, sig);
      const end = () => {
        if (!down) return; const d = down; down = null;
        row.classList.remove('is-grabbing');
        if (!d.moved) return;
        const guard = ev => { ev.preventDefault(); ev.stopPropagation(); };
        row.addEventListener('click', guard, {capture: true, once: true});
        setTimeout(() => row.removeEventListener('click', guard, {capture: true}), 0);
        /* Carry on from where the chips were left. */
        const dur = Math.max(1, num(st.s.scroll_duration, 40));
        let progress = Math.min(0.999, Math.max(0, -(d.v ?? d.start) / d.p));
        if (row.dataset.direction === 'right') progress = 1 - progress;
        track.style.transform = ''; track.style.animation = '';
        track.style.animationDelay = -(progress * dur) + 's';
      };
      row.addEventListener('pointerup', end, sig); row.addEventListener('pointercancel', end, sig);
      row.addEventListener('dragstart', e => e.preventDefault(), sig);
    },
    motion(root, st) {
      root.classList.toggle('is-offscreen', !st.visible || document.hidden);
      for (const row of root.querySelectorAll('[data-scol-row]')) row.classList.toggle('is-paused', !!st.paused);
      if (!st.reduced.matches) TYPES['scrolling-collection'].fill(root, st);
    },
    stop(root, st) { cancelAnimationFrame(st.fillFrame); },
  };


  /* ---------- Collection Lookbook ---------- */
  TYPES['collection-lookbook'] = {
    derive(c) {
      const {root, s, put, blocks, q, qa} = c;
      put(root, '@data-width', s.section_width || 'stretch_width');
      const cards = blocks.filter(x => x.type === 'card').length;
      put(root, '@data-fit-d', String(cards <= num(s.per_view_desktop, 5)));
      put(root, '@data-fit-t', String(cards <= num(s.per_view_tablet, 3)));
      put(root, '@data-fit-m', String(cards <= num(s.per_view_mobile, 1.3)));
      put(root, '@data-title-case', !blank(s.title_transform) && s.title_transform !== 'none' || null);
      header(c, '.lcb__header', [['heading', 'heading'], ['subheading', 'subheading']]);
      const lh = q('[data-cl-legacy="heading"]');
      if (lh) put(lh, '@data-own-weight', !blank(s.heading_weight) && s.heading_weight !== 'theme' || null);
      for (const x of blocks) if (x.type === 'heading') {
        put(x.el, '@data-own-weight', !blank(x.b.weight) && x.b.weight !== 'theme' || null);
        put(x.el, '@data-case', !blank(x.b.transform) && x.b.transform !== 'none' || null);
      }
      for (const el of qa('[data-lcb-prev],[data-lcb-next]')) put(el, 'hidden', !bool(s.show_arrows));
      put(q('[data-lcb-dots]'), 'hidden', !bool(s.show_dots));
      const ownWeight = !blank(s.title_weight) && s.title_weight !== 'theme', ownSize = num(s.title_tracking) !== 0;
      for (const x of blocks) {
        if (x.type !== 'card') continue;
        const b = x.b, d = x.el.dataset;
        const title = blank(b.title) ? d.clCollTitle || '' : String(b.title);
        const card = put(x.el.querySelector('.lcb__card'), 'href:DIV', url(b.link) || d.clCollUrl || '');
        if (card.tagName === 'A') card.draggable = false;
        const k = card.querySelector('.lcb__kicker'); put(k, 'text', b.kicker || ''); put(k, 'hidden', blank(b.kicker));
        const h = card.querySelector('.lcb__title'); put(h, 'text', title); put(h, 'hidden', !title);
        put(h, '@data-own-weight', ownWeight || null); put(h, '@data-own-size', ownSize || null);
        const bt = card.querySelector('.lcb__btn'); put(bt, 'text', b.button_text || ''); put(bt, 'hidden', blank(b.button_text));
        const src = url(b.image, true);
        if (src) put(card, 'picture', JSON.stringify({src, alt: title, cls: 'lcb__bg', w: b.image && b.image.width || 0, h: b.image && b.image.height || 0}));
      }
    },
    init(root, st) {
      const T = TYPES['collection-lookbook'], sig = {signal: st.abort.signal};
      const track = root.querySelector('[data-lcb-track]'); if (!track) return;
      const slides = () => [...track.querySelectorAll('.lcb__slide')];
      const step = () => { const l = slides(); if (l.length > 1) return l[1].offsetLeft - l[0].offsetLeft; return l[0] ? l[0].offsetWidth : track.clientWidth; };
      const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
      const behavior = () => st.reduced.matches ? 'auto' : 'smooth';
      st.go = (i, user) => {
        const n = slides().length; if (!n) return;
        const atEnd = track.scrollLeft >= max() - 2;
        if (i > n - 1 || (i > st.index && atEnd)) i = 0;
        if (i < 0) i = n - 1;
        track.scrollTo({left: Math.min(max(), Math.max(0, i * step())), behavior: behavior()});
        if (user) T.motion(root, st, true);
      };
      st.index = 0;
      const sync = () => {
        const s = step() || 1, end = track.scrollLeft >= max() - 2, dots = [...root.querySelectorAll('[data-lcb-dot]')];
        st.index = end && max() > 0 ? dots.length - 1 : Math.round(track.scrollLeft / s);
        dots.forEach((d, i) => { if (i === st.index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
        const prev = root.querySelector('[data-lcb-prev]'), next = root.querySelector('[data-lcb-next]');
        if (prev) prev.setAttribute('aria-disabled', String(track.scrollLeft <= 2));
        if (next) next.setAttribute('aria-disabled', String(end));
      };
      track.addEventListener('scroll', () => { cancelAnimationFrame(st.syncFrame); st.syncFrame = requestAnimationFrame(sync); }, {passive: true, signal: st.abort.signal});
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-lcb-prev],[data-lcb-next],[data-lcb-dot]'); if (!b || !root.contains(b)) return;
        if (b.hasAttribute('data-lcb-dot')) { track.scrollTo({left: Math.min(max(), +b.dataset.lcbDot * step()), behavior: behavior()}); T.motion(root, st, true); return; }
        if (b.getAttribute('aria-disabled') === 'true') return;
        const dir = b.hasAttribute('data-lcb-next') ? 1 : -1;
        track.scrollTo({left: Math.min(max(), Math.max(0, track.scrollLeft + dir * step())), behavior: behavior()});
        T.motion(root, st, true);
      }, sig);
      track.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        track.scrollTo({left: Math.min(max(), Math.max(0, track.scrollLeft + (e.key === 'ArrowRight' ? 1 : -1) * step())), behavior: behavior()});
      }, sig);
      /* Mouse drag (touch and pen scroll natively). */
      let down = null;
      track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = {x: e.clientX, left: track.scrollLeft, moved: false, id: e.pointerId}; }, sig);
      track.addEventListener('pointermove', e => {
        if (!down || e.pointerId !== down.id) return;
        const dx = e.clientX - down.x;
        if (!down.moved) { if (Math.abs(dx) < 6) return; down.moved = true; track.classList.add('is-dragging'); try { track.setPointerCapture(e.pointerId); } catch (_) {} }
        track.scrollLeft = down.left - dx;
      }, sig);
      const end = () => {
        if (!down) return; const d = down; down = null;
        if (!d.moved) return;
        track.classList.remove('is-dragging');
        const guard = ev => { ev.preventDefault(); ev.stopPropagation(); };
        track.addEventListener('click', guard, {capture: true, once: true});
        setTimeout(() => track.removeEventListener('click', guard, {capture: true}), 0);
        const s = step() || 1; track.scrollTo({left: Math.min(max(), Math.round(track.scrollLeft / s) * s), behavior: behavior()});
      };
      track.addEventListener('pointerup', end, sig); track.addEventListener('pointercancel', end, sig);
      track.addEventListener('dragstart', e => e.preventDefault(), sig);
      root.addEventListener('pointerenter', () => { st.hover = true; T.motion(root, st); }, sig);
      root.addEventListener('pointerleave', () => { st.hover = false; T.motion(root, st); }, sig);
      root.addEventListener('focusin', () => { st.focus = true; T.motion(root, st); }, sig);
      root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) { st.focus = false; T.motion(root, st); } }, sig);
      st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; T.motion(root, st); });
      st.io.observe(root);
      T.motion(root, st);
    },
    /* Autoplay: on screen, tab shown, motion welcome, not hovered (when asked) or focused. */
    motion(root, st, restart) {
      const s = st.s;
      const run = bool(s.autoplay) && st.visible && !document.hidden && !(st.hover && bool(s.pause_on_hover)) && !st.focus && !st.reduced.matches && root.querySelectorAll('.lcb__slide').length > 1;
      const ms = Math.max(2, num(s.autoplay_speed, 4)) * 1000;
      if (st.timer && (!run || restart || st.timerMs !== ms)) { clearInterval(st.timer); st.timer = 0; }
      if (run && !st.timer) { st.timerMs = ms; st.timer = setInterval(() => { if (!root.isConnected) { clearInterval(st.timer); st.timer = 0; return; } st.go(st.index + 1); }, ms); }
      root.dataset.clRunning = st.timer ? 'true' : 'false';
    },
    update(root, st) { TYPES['collection-lookbook'].motion(root, st); },
    stop(root, st) { clearInterval(st.timer); st.timer = 0; cancelAnimationFrame(st.syncFrame); },
  };


  /* ---------- Collection List (titles with a picture that follows the pointer) ---------- */
  TYPES['collectionnlist'] = {
    derive(c) {
      const {root, s, put, blocks, q} = c;
      put(root, '@data-width', s.section_width || 'full_width');
      put(root, '@data-image-left', s.desktop_image_position === 'row-reverse' || null);
      const fallback = root.dataset.clFallbackHref || '/collections/all';
      for (const x of blocks) {
        const b = x.b, d = x.el.dataset, a = x.el.querySelector('.cnl__link');
        put(a, '@target', s.button_link_target || '_self');
        put(a, '@rel', s.button_link_target === '_blank' ? 'noopener' : null);
        put(a, '@href', d.clCollUrl || fallback);
        put(a.querySelector('.cnl__label'), 'text', blank(b.title) ? d.clCollTitle || '' : String(b.title));
        put(a.querySelector('.cnl__count'), 'hidden', !(d.clCollCount !== '' && d.clCollCount != null && blank(b.title) && bool(s.show_product_count)));
        const src = url(b.image, true);
        if (src) {
          let el = q('.cnl__media [data-cnl-img="' + CSS.escape(x.id) + '"]');
          if (el && el.tagName !== 'IMG') { const img = document.createElement('img'); img.className = 'cnl__img' + (el.classList.contains('is-active') ? ' is-active' : ''); img.dataset.cnlImg = x.id; img.dataset.clOf = x.id; img.decoding = 'async'; el.replaceWith(img); el = img; }
          if (el) put(el, 'picture', JSON.stringify({src, alt: blank(b.title) ? d.clCollTitle || '' : String(b.title), w: b.image && b.image.width || 0, h: b.image && b.image.height || 0}));
        }
      }
    },
    init(root, st) {
      const sig = {signal: st.abort.signal};
      const activate = id => {
        for (const m of root.querySelectorAll('.cnl__media [data-cnl-img]')) m.classList.toggle('is-active', m.dataset.cnlImg === id);
        for (const l of root.querySelectorAll('.cnl__link')) { if (l.dataset.cnlFor === id) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); }
      };
      const on = e => { const l = e.target.closest && e.target.closest('.cnl__link'); if (l && root.contains(l)) activate(l.dataset.cnlFor); };
      root.addEventListener('pointerover', on, sig);
      root.addEventListener('focusin', on, sig);
    },
  };


  /* ---------- Collection Hero Pro ---------- */
  TYPES['collection-list2'] = {
    derive(c) {
      const {root, s, put, blocks} = c;
      put(root, '@data-width', s.section_width || 'container');
      put(root, '@data-text-align', s.content_text_align || 'center');
      for (const x of blocks) {
        const b = x.b, el = x.el;
        if (x.type === 'badge') { put(el, 'text', b.text || ''); put(el, 'hidden', blank(b.text)); }
        else if (x.type === 'heading') {
          put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text));
          put(el, '@data-own-weight', !blank(b.weight) && b.weight !== 'theme' || null);
          put(el, '@data-case', !blank(b.transform) && b.transform !== 'none' || null);
        }
        else if (x.type === 'description') { put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text)); }
        else if (x.type === 'button') {
          put(el, 'hidden', blank(b.text));
          const a = put(el.querySelector('.chp__btn'), 'href:BUTTON', url(b.link));
          put(a, 'text', b.text || '');
          put(a, '@data-button-hover', {'fade-in': 'fade', 'light-slide': 'slide', lift: 'lift'}[b.hover_anim] || null);
          const shape = b.use_theme_button === false || b.use_theme_button === 'false';
          themeButton(c, a, bool(b.enable_custom_style), {bg: b.bg, text: b.color, border: b.border_color, hover_bg: b.bg_hover, hover_text: b.color_hover}, shape,
            {'--mb-radius': px(b.radius), '--mb-padding-y': px(b.pad_y), '--mb-padding-x': px(b.pad_x), '--mb-font-size': num(b.size, 16) + 'px', '--mb-weight': String(b.weight || 500), '--btn-border-width': px(b.border_width)});
        }
        else if (x.type === 'media_left' || x.type === 'media_right') {
          const alt = blank(b.alt_text) ? (b.image && b.image.alt) || el.dataset.clAlt || '' : String(b.alt_text);
          const img = el.querySelector('img'); if (img) put(img, '@alt', alt);
          const src = url(b.image, true);
          if (src && !el.querySelector('video')) put(el, 'picture', JSON.stringify({src, alt, cls: 'chp__img', w: b.image && b.image.width || 0, h: b.image && b.image.height || 0}));
        }
      }
    },
    init(root, st) {
      const T = TYPES['collection-list2'];
      st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; T.motion(root, st); });
      st.io.observe(root);
      T.motion(root, st);
    },
    /* Background videos play only on screen, in a shown tab, with motion welcome. */
    motion(root, st) {
      const stop = st.reduced.matches || document.hidden || !st.visible;
      for (const v of root.querySelectorAll('video')) {
        if (st.reduced.matches) { v.autoplay = false; v.removeAttribute('autoplay'); v.controls = true; }
        if (stop && !v.paused) { v.pause(); v.dataset.clPaused = ''; }
        else if (!stop && 'clPaused' in v.dataset) { delete v.dataset.clPaused; const p = v.play && v.play(); if (p && p.catch) p.catch(() => {}); }
      }
    },
  };


  /* ---------- Collection Banner ---------- */
  const words = (t, n) => { const w = scrub(t).trim().split(/\s+/).filter(Boolean); return w.length > n ? w.slice(0, n).join(' ') + '...' : w.join(' '); };
  TYPES['collection-banner'] = {
    derive(c) {
      const {root, s, put, blocks} = c;
      put(root, '@data-width', s.section_width || 'full_width');
      const theme = !(s.use_theme_button === false || s.use_theme_button === 'false');
      for (const x of blocks) {
        const b = x.b, el = x.el, d = el.dataset;
        const heading = blank(b.heading) ? d.clCollTitle || '' : String(b.heading);
        const href = url(b.primary_button_link) || d.clCollUrl || '';
        const info = el.querySelector('.cbn__info');
        put(info, '@data-p', s.desktop_content_position || 'bottom-center'); put(info, '@data-pm', s.mobile_content_position || 'center-center');
        const k = info.querySelector('.cbn__kicker'); put(k, 'text', b.subheading || ''); put(k, 'hidden', blank(b.subheading));
        const h = info.querySelector('.cbn__title'); put(h, 'hidden', !heading);
        put(h, '@data-own-weight', !blank(b.heading_font_weight) && b.heading_font_weight !== 'theme' || null);
        const ha = put(h.firstElementChild, 'href:SPAN', href); put(ha, 'text', heading);
        const desc = info.querySelector('.cbn__desc'); put(desc, 'text', words(b.description, 12)); put(desc, 'hidden', blank(b.description));
        const style = ['solid', 'outline', 'link'].includes(b.primary_button_style) ? b.primary_button_style : 'link';
        const btn = put(info.querySelector('.cbn__btn'), 'href:BUTTON', href);
        put(btn, 'text', b.primary_button_label || ''); put(btn, 'hidden', blank(b.primary_button_label));
        put(btn, '@data-style', style);
        put(btn, '@data-theme-button', style !== 'link' ? 'primary' : null); put(btn, '@data-sl-button', style !== 'link' || null);
        put(btn, '@data-button-appearance', style === 'link' ? null : style === 'outline' ? 'outline' : 'solid');
        const shape = !theme && style !== 'link';
        themeButton(c, btn, bool(b.enable_custom_style) && style !== 'link', {bg: b.primary_background_color, text: b.primary_text_color, border: b.primary_border_color}, shape,
          {'--mb-radius': px(s.buttons_corner), '--mb-padding-y': '16px', '--mb-padding-x': '20px', '--mb-font-size': '14px', '--mb-weight': String(b.button_font_weight || 500)});
        put(btn, '--cl-link-weight', style === 'link' && !theme ? String(b.button_font_weight || 500) : null);
        const src = url(b.image_desktop, true);
        if (src) put(el.querySelector('.cbn__media'), 'picture', JSON.stringify({src, alt: heading, cls: 'cbn__img', wrap: true, w: b.image_desktop && b.image_desktop.width || 0, h: b.image_desktop && b.image_desktop.height || 0, mobile: url(b.image_mobile, true)}));
      }
    },
  };


  /* ---------- Collections Display (theme collection cards in a grid or the theme carousel) ---------- */
  /* A card is drawn again from its card settings the way snippets/collection-item prints it: the picture
     keeps its element (only the frame's classes and shape change), the name area is printed again from the
     store data the section left on the card (data-cl-card). A picked collection or picture waits for the redraw. */
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);
  const CL_ARROW = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>';
  const CL_RATIO = {square: '1/1', landscape: '4/3', portrait: '3/4'};
  function clCard(el, v) {
    const k = parse(v), d = parse(el.dataset.clCard);
    const media = el.querySelector('.collection-item__media'), frame = media && media.querySelector('.collection-item__media--ratio'), info = el.querySelector('.collection-item__information');
    if (!media || !frame || !info) return el;
    const below = k.pos === 'below_image', over = k.pos === 'overlay_image', mod = k.des === 'morden', def = k.des === 'default', al = k.al, either = below || over;
    let mc = 'collection-item__media relative' + (over ? ' ' + k.des + ' ' : '') + ' rounded overflow-hidden';
    if (below && k.icw) mc += ' w-custom max-w-100' + (al === 'left' ? ' me-auto' : al === 'right' ? ' ms-auto' : ' mx-auto');
    if (below && k.round) mc += ' rounded-50 overflow-hidden';
    if (media.className !== mc) media.className = mc;
    if (below && k.icw) media.setAttribute('style', '--custom-width: ' + k.iw + 'px'); else media.removeAttribute('style');
    const ratio = k.ratio === 'adapt' ? d.ar ?? '' : CL_RATIO[k.ratio] ?? (k.cr == null ? '' : k.cr === '' ? '3/4' : String(k.cr).split(':').join('/'));
    frame.setAttribute('style', '--aspect-ratio: ' + ratio + ';');
    for (const img of frame.querySelectorAll('img:not(.placeholder-image)')) img.alt = d.ia || (!blank(k.title) ? k.title : '') || d.t || 'Collection Title';
    const title = !blank(k.title) ? k.title : d.e ? d.ot : d.t;
    const nameCls = 'collection-item__name no-underline word-break heading-color ' + (k.fw ?? '') + (num(k.fs) > 14 ? ' fs-medium-list' : ' fs-custom') + (below ? ' mb-10' : ' inline-flex gap-5 align-center justify-content-' + al) + (over && def ? ' btn btn-white' : '');
    const nameStyle = '--font-size: ' + (k.fs ?? '') + ';--space-bottom: ';
    const countDiv = k.cnt && ((over && mod && !k.desc) || (below && def) || (below && mod && !k.desc));
    let h = '<div class="collection-item__information' + (below ? ' mt-custom' : ' absolute inset-x-15 bottom-15 inset-x-md-30 bottom-md-30 z-3 flex justify-content-' + al) + ' text-' + al + (over && mod ? ' flex-column align-item-' + al + ' gap-5' : '') + '"' + (below ? ' style="--space-top: ' + k.isp + 'px;"' : '') + '>';
    const icon = over && k.icon && mod;
    if (icon) h += '<div class="flex align-center justify-between"><div>';
    if (d.e) {
      h += '<a class="' + nameCls + '" style="' + nameStyle + '" role="link" aria-disabled="true"><span class="collection-item__name-inner lh-normal inline-block' + (over && mod ? ' heading_weight' : '') + '">' + esc(title) + '</span>';
      if (over && def && k.cnt) h += '<span class="collection-item__count">(0)</span>';
      else if (either && mod && k.cnt && k.desc) h += '<span class="collection-item__count">0</span>';
      h += '</a>';
      if (countDiv) h += '<div class="collection-item__count">' + esc(d.oc) + '</div>';
      if (either && k.desc && mod) h += '<div class="collection-information-description lh-small">' + esc(d.od) + '</div>';
      if (icon) h += '</div><a class="icon_collection btn-primary no-underline flex align-center justify-center w-45 h-45 rounded-50 transition" role="link" aria-disabled="true" aria-label="' + esc(d.ot) + '">' + CL_ARROW + '</a></div>';
    } else {
      h += '<a aria-label="' + esc(d.t) + '" class="' + nameCls + '" style="' + nameStyle + '" href="' + esc(d.u) + '"><span class="collection-item__name-inner lh-normal inline-block' + (over && mod ? ' heading_weight' : '') + ' overflow-visible-important relative">' + esc(title);
      if (either && mod && k.cnt && k.desc) h += '<span class="collection-item__count whitespace-nowrap fs-12 heading_weight absolute">' + esc(d.c1) + '</span>';
      h += '</span>';
      if (over && def && k.cnt) h += '<span class="collection-item__count whitespace-nowrap">' + esc(d.c2) + '</span>';
      h += '</a>';
      if (countDiv) h += '<div class="collection-item__count">' + esc(d.c3) + '</div>';
      /* The collection's own description, as the store prints it. */
      if (either && k.desc && !blank(d.d) && mod) h += '<div class="collection-information-description lh-small">' + d.d + '</div>';
      if (icon) h += '</div><a class="icon_collection btn-primary no-underline flex align-center justify-center w-45 h-45 rounded-50 transition" href="' + esc(d.u) + '" aria-label="' + esc(d.t) + '">' + CL_ARROW + '</a></div>';
    }
    const tpl = document.createElement('template'); tpl.innerHTML = h + '</div>';
    info.replaceWith(tpl.content.firstElementChild);
    return el;
  }
  const CL_WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];
  TYPES['collection-list'] = {
    derive(c) {
      const {root, s, put, blocks, q, qa} = c;
      put(root, '.pt-min', num(s.padding_top) < 30); put(root, '.pb-min', num(s.padding_bottom) < 30);
      put(root, '.remove_spacing', bool(s.reset_spacing));
      put(root, '@data-custom-bg', bool(s.enable_custom_bg) && !!color(s.custom_section_bg, '') || null);
      put(root, '@data-width', s.section_width ?? '');
      const inner = root.firstElementChild;
      if (inner && CL_WIDTHS.includes(s.section_width)) for (const w of CL_WIDTHS) put(inner, '.' + w, s.section_width === w);
      /* Every card, drawn again only when one of its own settings changes. */
      for (const x of blocks) {
        if (x.type !== 'collection') continue;
        put(x.el, 'card', JSON.stringify({pos: s.collection_information_position, des: s.design, al: s.text_alignment, fw: s.font_weight, fs: s.font_size, cnt: bool(s.show_product_count), icon: bool(s.show_icon), desc: bool(s.show_description),
          ratio: s.image_ratio, cr: s.custom_ratio, round: bool(s.rounded_image), icw: bool(s.image_custom_width), iw: s.image_width, isp: s.information_spacing, title: x.b.collection_title ?? ''}));
      }
      const heads = header(c, '.cdl__head-inner', [['heading', 'heading', 'rich'], ['description', 'description', 'rich']]);
      for (const h of qa('.cdl__heading')) { put(h, '.h3', s.header_size === 'small'); put(h, '.h1-size', s.header_size === 'large'); }
      /* The View all button: its block, or the legacy settings. */
      const bx = blocks.find(x => x.type === 'button');
      const legacy = q('[data-cl-legacy="view"]');
      let found = !!bx, label = '', href = '', pos = 'header';
      if (bx) { label = bx.b.text || ''; href = url(bx.b.link); pos = bx.b.position || 'header'; }
      else if (legacy) { found = bool(s.show_view_all_button); label = blank(s.view_all_label) ? root.dataset.clViewLabel || '' : String(s.view_all_label); href = url(s.view_all_url); pos = s.view_all_position || 'header'; }
      href = href || root.dataset.clViewHref || '/collections';
      if (s.header_alignment === 'center') pos = 'bottom';
      for (const a of qa('[data-cl-view]')) {
        put(a, '@href', href); put(a.querySelector('span'), 'text', label);
        if (a.dataset.clView === 'header') put(a, 'hidden', !found || pos !== 'header' || blank(label));
      }
      put(q('.cdl__bottom'), 'hidden', !found || pos !== 'bottom' || blank(label));
      put(q('.cdl__head'), 'hidden', !heads && (!found || pos === 'bottom' || !q('[data-cl-view="header"]')));
    },
    init(root, st) {
      const T = TYPES['collection-list'];
      st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; T.motion(root, st); });
      st.io.observe(root);
      /* The theme builds the carousel when it comes near the screen; wait for it, then stop looking. */
      st.motionTimer = setInterval(() => { const el = root.querySelector('[data-cl-slider]'); if (!el || el.globalSlide) { clearInterval(st.motionTimer); T.motion(root, st); } }, 250);
      T.motion(root, st);
    },
    /* The carousel's autoplay runs only on screen, in a shown tab, with motion welcome. */
    motion(root, st) {
      const el = root.querySelector('[data-cl-slider]'), sw = el && el.globalSlide;
      const stop = st.reduced.matches || document.hidden || !st.visible;
      if (sw && !sw.destroyed) {
        if (st.reduced.matches) sw.params.speed = 0;
        if (sw.autoplay) {
          if (stop && sw.autoplay.running) sw.autoplay.stop();
          else if (!stop && el.dataset.autoplay === 'true' && !sw.autoplay.running) sw.autoplay.start();
        }
      }
    },
    stop(root, st) { clearInterval(st.motionTimer); },
  };

  /* @@TYPES@@ */

  window.MateriaCollections = {scan, audit, roots, TYPES, GEN};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();
