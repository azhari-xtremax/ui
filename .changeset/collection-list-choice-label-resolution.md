---
"@buildpad/ui-collections": patch
---

CollectionList: resolve select/radio/multi-select values to their configured choice label (S8.3).

`fieldTypeRenderCell` had no case for a choice-authoring field's `meta.options.choices` — a scalar select-dropdown/radio field showed its raw stored value (e.g. `"draft"` instead of the configured label `"Draft"`), and an array/csv-stored multi-select value fell through to the generic JSON-badge case, showing a content-less `"JSON"` badge instead of the selected labels. Now resolves scalar and array (including csv-stored comma-strings) values through the field's choices, falling back to the raw value only when no configured choice matches.
